/**
 * 海亀兄弟 予約管理Webアプリ
 *
 * 既存の予約受付GASとは別の、管理画面専用GASプロジェクトへ配置します。
 * 同じ「海亀兄弟予約管理」スプレッドシートを読み書きしますが、
 * 予約受信の doPost や既存の編集トリガーには依存しません。
 */

var ADMIN_APP_VERSION = '2026.07.18-3';
var ADMIN_DEFAULT_SPREADSHEET_ID =
  '1bPYur4Dfg3LxTCIiYzZvyZRT8bgLoYizG1B6LIkETKk';
var ADMIN_DEFAULT_CALENDAR_ID = 'genkidama2439@gmail.com';
var ADMIN_BOOKING_SHEET_NAME = '予約一覧';
var ADMIN_LINE_LOG_SHEET_NAME = 'LINE送信履歴';
var ADMIN_AUDIT_SHEET_NAME = '管理アプリ操作履歴';
var ADMIN_DELETED_SHEET_NAME = '削除済み予約';
var ADMIN_NOTIFY_API_URL =
  'https://www.umigamekyoudaimiyakojima.com/api/line/notify';
var ADMIN_PENDING_PREFIX = 'ADMIN_LINE_PENDING_';
var ADMIN_STATUS_SENT_PREFIX = 'ADMIN_STATUS_SENT_';
var ADMIN_PENDING_TTL_MINUTES = 30;

var ADMIN_COLUMNS = {
  TIMESTAMP: 1,
  BOOKING_NUM: 2,
  DATE: 3,
  TIME: 4,
  NAME: 5,
  PLAN: 6,
  TOTAL_PRICE: 7,
  PHONE: 8,
  STATUS: 9,
  HEADCOUNT: 10,
  PARTICIPANTS: 11,
  LINE_USER_ID: 12,
  BOOKING_STATUS: 13,
  LOCATION: 14,
  LINE_NAME: 15,
  STAFF: 16,
  COUPON_CODE: 17,
  COUPON_DISCOUNT: 18,
  LINE_SEND: 19,
  LINE_CONFIRM: 20,
  LINE_RESULT: 21
};

var ADMIN_LOCATION_OPTIONS = [
  '新城海岸',
  '東平安名ビーチ',
  'ボラビーチ',
  'ワイワイビーチ',
  'シギラビーチ',
  'ナイトツアー（遺跡）',
  'ナイトツアー（インディアンマリンガーデン）'
];

var ADMIN_STATUS_OPTIONS = ['', '確定', '満席'];

function doGet() {
  adminAssertAuthorized_();

  return HtmlService
    .createTemplateFromFile('Index')
    .evaluate()
    .setTitle('海亀兄弟 予約管理')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.DEFAULT);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * 初回設定時に、GASが認識しているログインアドレスを実行ログで確認します。
 * シートの読み書きやLINE送信は行いません。
 */
function adminWhoAmI() {
  var email = String(Session.getActiveUser().getEmail() || '取得できません');
  Logger.log('現在のGoogleアカウント: ' + email);
  return email;
}

/**
 * 初回設定用：現在ログイン中のGoogleアカウントを管理者として保存します。
 * 予約シートの更新やLINE送信は行いません。
 */
function adminSetMyEmailAsAdmin() {
  var email = String(Session.getActiveUser().getEmail() || '')
    .trim()
    .toLowerCase();

  if (!email) {
    throw new Error('Googleアカウントのメールアドレスを取得できませんでした。');
  }

  PropertiesService
    .getScriptProperties()
    .setProperty('ADMIN_ALLOWED_EMAILS', email);

  Logger.log('管理者メールアドレスを保存しました: ' + email);
  return email;
}

/**
 * 日時変更機能の初回認可用。
 * カレンダー名の読み取りだけを行い、予定は変更しません。
 */
function adminAuthorizeCalendarAccess() {
  adminAssertAuthorized_();

  var calendar = adminGetCalendar_();
  var name = calendar.getName();

  Logger.log('カレンダー認可完了: ' + name);

  return {
    success: true,
    calendarName: name,
    calendarId: calendar.getId()
  };
}

/**
 * 画面起動時に必要な情報をまとめて返します。
 */
function adminGetAppData() {
  var actor = adminAssertAuthorized_();
  adminCleanupExpiredPending_();
  var sheet = adminGetBookingSheet_();
  var bookings = adminReadBookings_(sheet);
  var publicBookings = bookings.map(adminToPublicBooking_);

  return {
    appVersion: ADMIN_APP_VERSION,
    actor: actor,
    generatedAt: new Date().toISOString(),
    dashboard: adminBuildDashboard_(bookings),
    reservations: publicBookings,
    options: {
      statuses: ADMIN_STATUS_OPTIONS,
      locations: adminGetLocationOptions_(sheet),
      staff: adminUniqueSorted_(publicBookings.map(function(booking) {
        return booking.staff;
      }).concat(
        publicBookings.reduce(function(all, booking) {
          return all.concat(booking.components.map(function(component) {
            return component.staff;
          }));
        }, [])
      )),
      plans: adminUniqueSorted_(publicBookings.map(function(booking) {
        return booking.displayPlan;
      }))
    }
  };
}

/**
 * ステータス・開催場所・担当スタッフを安全に更新します。
 * ステータスと開催場所は、更新後にLINE全文プレビューを返します。
 * この関数だけではLINEは送信しません。
 */
function adminUpdateBooking(request) {
  var actor = adminAssertAuthorized_();
  request = request || {};

  if (!request.bookingKey) {
    throw new Error('予約を特定できませんでした。画面を更新してやり直してください。');
  }

  var updates = request.updates || {};
  var updateKeys = Object.keys(updates).filter(function(key) {
    return ['status', 'location', 'staff'].indexOf(key) !== -1;
  });

  if (!updateKeys.length) {
    throw new Error('更新する内容がありません。');
  }

  var lineRelatedCount = updateKeys.filter(function(key) {
    return key === 'status' || key === 'location';
  }).length;

  if (lineRelatedCount > 1) {
    throw new Error('予約ステータスと開催場所は1項目ずつ更新してください。');
  }

  var lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    var sheet = adminGetBookingSheet_();
    var beforeBooking = adminFindBooking_(sheet, request.bookingKey);

    if (!beforeBooking) {
      throw new Error('予約が見つかりません。画面を更新してください。');
    }

    if (
      request.expectedVersion &&
      request.expectedVersion !== beforeBooking.version
    ) {
      throw new Error(
        'この予約は別の画面で更新されています。再読み込みして内容を確認してください。'
      );
    }

    var targetRows = adminResolveTargetRows_(beforeBooking, request);
    var auditChanges = [];
    var lineAction = null;

    updateKeys.forEach(function(key) {
      var value = String(updates[key] == null ? '' : updates[key]).trim();

      if (key === 'status') {
        adminValidateStatus_(value);
        targetRows = beforeBooking.rowNumbers.slice();
        adminWriteColumn_(sheet, targetRows, ADMIN_COLUMNS.BOOKING_STATUS, value);
        auditChanges.push('予約ステータス=' + (value || '空欄'));
        if (value) lineAction = { type: 'STATUS', value: value };

      } else if (key === 'location') {
        adminValidateLocation_(sheet, value);
        adminWriteColumn_(sheet, targetRows, ADMIN_COLUMNS.LOCATION, value);
        auditChanges.push('開催場所=' + (value || '空欄'));
        if (value) lineAction = { type: 'LOCATION', value: value };

      } else if (key === 'staff') {
        if (value.length > 60) {
          throw new Error('スタッフ名は60文字以内で入力してください。');
        }
        adminWriteColumn_(sheet, targetRows, ADMIN_COLUMNS.STAFF, value);
        auditChanges.push('スタッフ=' + (value || '空欄'));
      }
    });

    SpreadsheetApp.flush();

    var updatedBooking = adminFindBooking_(sheet, request.bookingKey);
    var pending = null;
    var warning = '';

    if (lineAction) {
      var lineRow = adminSelectLineRow_(updatedBooking, targetRows[0]);
      var messageRow = adminFindComponentByRow_(updatedBooking, targetRows[0]) || lineRow;

      if (!lineRow || !lineRow.lineUserId) {
        warning = 'LINE User IDが未登録のため、シートだけ更新しました。';
      } else {
        pending = adminCreatePendingLine_(
          sheet,
          updatedBooking,
          lineRow,
          messageRow,
          lineAction,
          actor
        );
      }
    }

    adminAppendAudit_(
      actor,
      updatedBooking,
      '更新',
      auditChanges.join(' / '),
      targetRows
    );

    return {
      success: true,
      booking: adminToPublicBooking_(updatedBooking),
      pendingLine: pending,
      warning: warning
    };

  } finally {
    lock.releaseLock();
  }
}

/**
 * 確定前の予約日時を、予約一覧とGoogleカレンダーで同時更新します。
 * この処理でLINEは送信しません。
 */
function adminUpdateSchedule(request) {
  var actor = adminAssertAuthorized_();
  request = request || {};

  if (!request.bookingKey) {
    throw new Error('予約を特定できませんでした。');
  }

  var lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    var sheet = adminGetBookingSheet_();
    var beforeBooking = adminFindBooking_(sheet, request.bookingKey);

    if (!beforeBooking) {
      throw new Error('予約が見つかりません。画面を更新してください。');
    }

    if (
      request.expectedVersion &&
      request.expectedVersion !== beforeBooking.version
    ) {
      throw new Error(
        'この予約は別の画面で更新されています。' +
        '再読み込みして内容を確認してください。'
      );
    }

    if (beforeBooking.bookingStatus !== '未対応') {
      throw new Error(
        '日時変更は「未対応」の予約だけ行えます。' +
        '確定後の変更はお客様へ個別にご案内ください。'
      );
    }

    if (!beforeBooking.bookingNumber) {
      throw new Error(
        '予約番号がない行はカレンダー予定を特定できないため、' +
        '管理画面から日時変更できません。'
      );
    }

    var changes = adminResolveScheduleChanges_(beforeBooking, request);
    var calendar = adminGetCalendar_();
    var assignments = adminFindCalendarAssignments_(
      calendar,
      beforeBooking
    );
    var operations = adminBuildCalendarScheduleOperations_(
      beforeBooking,
      changes,
      assignments
    );
    var originalSheetValues = adminReadOriginalScheduleValues_(
      sheet,
      beforeBooking.rowNumbers
    );
    var appliedCalendarOperations = [];

    try {
      operations.forEach(function(operation) {
        appliedCalendarOperations.push(operation);
        operation.event.setTime(operation.newStart, operation.newEnd);
        operation.event.setDescription(operation.newDescription);
      });

      changes.forEach(function(change) {
        sheet
          .getRange(change.rowNumber, ADMIN_COLUMNS.DATE, 1, 2)
          .setValues([[change.date, change.time]]);
      });

      SpreadsheetApp.flush();

    } catch (updateError) {
      var updateRollbackErrors = adminRollbackCalendarSchedule_(
        appliedCalendarOperations
      ).concat(
        adminRollbackSheetSchedule_(sheet, originalSheetValues)
      );

      if (updateRollbackErrors.length) {
        throw new Error(
          '日時変更中にエラーが発生し、自動復旧にも失敗しました。' +
          '予約一覧とGoogleカレンダーを確認してください。' +
          ' 変更エラー: ' + updateError.message +
          ' / 復旧エラー: ' + updateRollbackErrors.join(' / ')
        );
      }

      throw new Error(
        '日時変更を完了できなかったため、元の日時に戻しました。' +
        updateError.message
      );
    }

    var warning = '';

    try {
      adminClearPendingForBooking_(sheet, beforeBooking);
    } catch (pendingError) {
      warning = '日時は変更されましたが、古いLINE送信待ちを自動取消しできませんでした: ' +
        pendingError.message;
    }

    var updatedBooking = null;

    try {
      updatedBooking = adminFindBooking_(sheet, request.bookingKey);
    } catch (readError) {
      var readRollbackErrors = adminRollbackCalendarSchedule_(
        operations
      ).concat(
        adminRollbackSheetSchedule_(sheet, originalSheetValues)
      );

      if (readRollbackErrors.length) {
        throw new Error(
          '更新後の確認と自動復旧に失敗しました。' +
          '予約一覧とGoogleカレンダーを確認してください。' +
          ' 確認エラー: ' + readError.message +
          ' / 復旧エラー: ' + readRollbackErrors.join(' / ')
        );
      }

      throw new Error(
        '更新後の予約を確認できなかったため元に戻しました。' +
        readError.message
      );
    }

    if (!updatedBooking) {
      var missingRollbackErrors = adminRollbackCalendarSchedule_(
        operations
      ).concat(
        adminRollbackSheetSchedule_(sheet, originalSheetValues)
      );

      if (missingRollbackErrors.length) {
        throw new Error(
          '更新後の予約を確認できず、自動復旧にも失敗しました。' +
          '予約一覧とGoogleカレンダーを確認してください。' +
          ' 復旧エラー: ' + missingRollbackErrors.join(' / ')
        );
      }

      throw new Error('更新後の予約を確認できなかったため元に戻しました。');
    }

    try {
      adminAppendAudit_(
        actor,
        updatedBooking,
        '予約日時変更',
        adminBuildScheduleText_(beforeBooking) +
          ' → ' + adminBuildScheduleText_(updatedBooking),
        updatedBooking.rowNumbers
      );
    } catch (auditError) {
      warning = adminJoinWarnings_(
        warning,
        '日時は変更されましたが、操作履歴を記録できませんでした: ' +
          auditError.message
      );
    }

    return {
      success: true,
      booking: adminToPublicBooking_(updatedBooking),
      warning: warning
    };

  } finally {
    lock.releaseLock();
  }
}

/**
 * 重複予約を削除します。
 * 元データは「削除済み予約」シートへ退避し、
 * 対応するGoogleカレンダー予定も削除します。
 * LINEは送信しません。
 */
function adminDeleteBooking(request) {
  var actor = adminAssertAuthorized_();
  request = request || {};

  if (!request.bookingKey) {
    throw new Error('削除する予約を特定できません。');
  }

  var lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    var sheet = adminGetBookingSheet_();
    var booking = adminFindBooking_(sheet, request.bookingKey);

    if (!booking) {
      throw new Error('予約が見つかりません。画面を更新してください。');
    }

    if (
      request.expectedVersion &&
      request.expectedVersion !== booking.version
    ) {
      throw new Error(
        'この予約は別の画面で更新されています。' +
        '再読み込みして内容を確認してください。'
      );
    }

    if (!booking.bookingNumber) {
      throw new Error('予約番号がない行は管理画面から削除できません。');
    }

    if (
      String(request.confirmBookingNumber || '').trim() !==
      String(booking.bookingNumber)
    ) {
      throw new Error('予約番号が一致しないため削除を中止しました。');
    }

    var originalRows = adminReadFullBookingRows_(sheet, booking.rowNumbers);
    var archive = adminArchiveDeletedBooking_(
      sheet,
      booking,
      originalRows,
      actor
    );
    var calendar = adminGetCalendar_();
    var calendarResult = adminFindCalendarEventsForDeletion_(
      calendar,
      booking
    );
    var deletedCalendarSnapshots = [];

    try {
      calendarResult.events.forEach(function(event) {
        var snapshot = adminSnapshotCalendarEvent_(event);
        event.deleteEvent();
        deletedCalendarSnapshots.push(snapshot);
      });

    } catch (calendarError) {
      var calendarRestoreErrors = adminRestoreCalendarEvents_(
        calendar,
        deletedCalendarSnapshots
      );

      throw new Error(
        'Googleカレンダー予定を削除できなかったため、' +
        '予約一覧は削除していません。' +
        calendarError.message +
        (
          calendarRestoreErrors.length
            ? ' / カレンダー復旧エラー: ' + calendarRestoreErrors.join(' / ')
            : ''
        )
      );
    }

    try {
      booking.rowNumbers.forEach(function(rowNumber) {
        sheet
          .getRange(rowNumber, 1, 1, ADMIN_COLUMNS.LINE_RESULT)
          .clearContent();
      });

      SpreadsheetApp.flush();
      adminDeletePendingPropertiesForBooking_(booking);

    } catch (sheetError) {
      var sheetRestoreErrors = adminRestoreFullBookingRows_(sheet, originalRows);
      var eventRestoreErrors = adminRestoreCalendarEvents_(
        calendar,
        deletedCalendarSnapshots
      );
      var restoreErrors = sheetRestoreErrors.concat(eventRestoreErrors);

      throw new Error(
        '予約一覧から削除できなかったため自動復旧しました。' +
        sheetError.message +
        (
          restoreErrors.length
            ? ' / 復旧エラー: ' + restoreErrors.join(' / ')
            : ''
        )
      );
    }

    var warning = calendarResult.warning || '';

    try {
      adminMarkDeletedArchiveComplete_(archive);
    } catch (archiveStatusError) {
      warning = adminJoinWarnings_(
        warning,
        '予約は削除されましたが、削除済み予約の完了表示を更新できませんでした: ' +
          archiveStatusError.message
      );
    }

    try {
      adminAppendAudit_(
        actor,
        booking,
        '予約削除',
        '削除済み予約へ退避 / カレンダー' +
          calendarResult.events.length + '件削除',
        booking.rowNumbers
      );
    } catch (auditError) {
      warning = adminJoinWarnings_(
        warning,
        '予約は削除されましたが、操作履歴を記録できませんでした: ' +
          auditError.message
      );
    }

    return {
      success: true,
      deletedBookingKey: booking.key,
      bookingNumber: booking.bookingNumber,
      deletedRowCount: booking.rowNumbers.length,
      deletedCalendarCount: calendarResult.events.length,
      warning: warning
    };

  } finally {
    lock.releaseLock();
  }
}

/**
 * 自由メッセージの全文確認を準備します。まだ送信しません。
 */
function adminPrepareCustomLine(request) {
  var actor = adminAssertAuthorized_();
  request = request || {};

  var message = String(request.message || '').trim();

  if (!request.bookingKey) {
    throw new Error('予約を特定できませんでした。');
  }
  if (!message) {
    throw new Error('LINEメッセージを入力してください。');
  }
  if (message.length > 4500) {
    throw new Error('LINEメッセージが長すぎます。4500文字以内にしてください。');
  }

  var sheet = adminGetBookingSheet_();
  var booking = adminFindBooking_(sheet, request.bookingKey);

  if (!booking) throw new Error('予約が見つかりません。');

  if (
    request.expectedVersion &&
    request.expectedVersion !== booking.version
  ) {
    throw new Error('予約内容が更新されています。画面を更新してください。');
  }

  var lineRow = adminSelectLineRow_(booking, request.rowNumber);

  if (!lineRow || !lineRow.lineUserId) {
    throw new Error('この予約にはLINE User IDが登録されていません。');
  }

  return adminSavePendingLine_({
    bookingKey: booking.key,
    bookingNumber: booking.bookingNumber,
    rowNumbers: [lineRow.rowNumber],
    sourceRowNumber: lineRow.rowNumber,
    type: 'FREE',
    expectedValue: message,
    summary: '自由メッセージ',
    message: message,
    lineUserId: lineRow.lineUserId,
    actor: actor,
    createdAt: new Date().toISOString()
  });
}

/**
 * プレビュー済みのLINEを送信します。
 * 保存時の値と現在のシート値が違う場合は中止します。
 */
function adminConfirmLine(request) {
  var actor = adminAssertAuthorized_();
  request = request || {};
  var token = String(request.token || '');

  if (!token) throw new Error('送信確認情報がありません。');

  var lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    var pending = adminReadPendingLine_(token);

    if (!pending) {
      throw new Error('送信確認の有効期限が切れました。もう一度プレビューしてください。');
    }

    var createdAt = new Date(pending.createdAt).getTime();
    var expiresAt = createdAt + ADMIN_PENDING_TTL_MINUTES * 60 * 1000;

    if (!createdAt || Date.now() > expiresAt) {
      adminDeletePendingLine_(token);
      throw new Error('送信確認の有効期限が切れました。もう一度プレビューしてください。');
    }

    var sheet = adminGetBookingSheet_();
    var booking = adminFindBooking_(sheet, pending.bookingKey);

    if (!booking) throw new Error('予約が見つからないため送信を中止しました。');

    var sourceRow = adminSelectLineRow_(booking, pending.sourceRowNumber);

    if (!sourceRow || sourceRow.lineUserId !== pending.lineUserId) {
      throw new Error('LINE送信先が変更されたため送信を中止しました。');
    }

    adminAssertPendingStillValid_(booking, pending);

    if (
      pending.type === 'STATUS' &&
      adminWasSuccessfulStatusSent_(pending.bookingNumber, pending.summary)
    ) {
      throw new Error(
        '同じ予約の同じステータスLINEは送信済みです。再送する場合は自由メッセージを使ってください。'
      );
    }

    var result = adminSendLine_(
      pending.lineUserId,
      pending.message,
      pending,
      sourceRow,
      actor
    );

    // LINE送信成功後は、履歴やU列の記録に失敗しても同じ確認トークンで
    // 再送されないよう、先に送信済み状態を確定する。
    if (result.success) {
      adminDeletePendingLine_(token);

      if (pending.type === 'STATUS') {
        try {
          adminMarkSuccessfulStatusSent_(
            pending.bookingNumber,
            pending.summary
          );
        } catch (sentMarkerError) {
          result.warning = adminJoinWarnings_(
            result.warning,
            'ステータスLINEの送信済み情報を保存できませんでした: ' +
              sentMarkerError.message
          );
        }
      }
    }

    var resultText = result.success
      ? '✅ ' + adminFormatDateTime_(new Date()) + ' WEB管理画面から送信済：' + pending.summary
      : '⚠️ WEB管理画面から送信失敗：' + result.error;

    try {
      sheet
        .getRange(sourceRow.rowNumber, ADMIN_COLUMNS.LINE_CONFIRM)
        .setValue(false);
      sheet
        .getRange(sourceRow.rowNumber, ADMIN_COLUMNS.LINE_RESULT)
        .setValue(resultText)
        .setBackground(result.success ? '#d9ead3' : '#f4cccc');
    } catch (sheetError) {
      result.warning = adminJoinWarnings_(
        result.warning,
        'LINE送信結果を予約一覧へ記録できませんでした: ' + sheetError.message
      );
    }

    return {
      success: result.success,
      error: result.error || '',
      warning: result.warning || '',
      sentAt: new Date().toISOString(),
      resultText: resultText
    };

  } finally {
    lock.releaseLock();
  }
}

function adminCancelLine(request) {
  var actor = adminAssertAuthorized_();
  var token = String(request && request.token || '');

  if (token) {
    var pending = adminReadPendingLine_(token);

    if (pending) {
      var sheet = adminGetBookingSheet_();
      var booking = adminFindBooking_(sheet, pending.bookingKey);

      if (booking) {
        var sourceRow = adminSelectLineRow_(booking, pending.sourceRowNumber);

        if (sourceRow && pending.type !== 'FREE') {
          sheet
            .getRange(sourceRow.rowNumber, ADMIN_COLUMNS.LINE_CONFIRM)
            .setValue(false)
            .setBackground(null);
          sheet
            .getRange(sourceRow.rowNumber, ADMIN_COLUMNS.LINE_RESULT)
            .setValue('WEB送信キャンセル：' + pending.summary)
            .setBackground(null);
        }

        adminAppendAudit_(
          actor,
          booking,
          'LINE送信キャンセル',
          pending.summary,
          pending.rowNumbers || []
        );
      }
    }

    adminDeletePendingLine_(token);
  }

  return { success: true };
}

function adminGetHistory(request) {
  adminAssertAuthorized_();
  var bookingNumber = String(request && request.bookingNumber || '');
  var ss = adminGetSpreadsheet_();
  var sheet = ss.getSheetByName(ADMIN_LINE_LOG_SHEET_NAME);

  if (!sheet || sheet.getLastRow() < 2) return [];

  var startRow = Math.max(2, sheet.getLastRow() - 299);
  var values = sheet
    .getRange(startRow, 1, sheet.getLastRow() - startRow + 1, 11)
    .getDisplayValues();

  return values
    .filter(function(row) {
      return !bookingNumber || String(row[1]) === bookingNumber;
    })
    .slice(-50)
    .reverse()
    .map(function(row) {
      return {
        sentAt: row[0],
        bookingNumber: row[1],
        name: row[2],
        date: row[3],
        time: row[4],
        plan: row[5],
        type: row[6],
        message: row[8],
        result: row[9],
        rowNumber: row[10]
      };
    });
}

// ============================================================
// 認証・設定
// ============================================================

function adminAssertAuthorized_() {
  var email = String(Session.getActiveUser().getEmail() || '').toLowerCase();
  var allowedText = String(
    PropertiesService.getScriptProperties().getProperty('ADMIN_ALLOWED_EMAILS') || ''
  );
  var allowed = allowedText
    .split(',')
    .map(function(value) { return value.trim().toLowerCase(); })
    .filter(String);

  if (!allowed.length) {
    throw new Error(
      'ADMIN_ALLOWED_EMAILSが未設定です。管理者メールアドレスをスクリプトプロパティへ登録してください。'
    );
  }

  if (!email || allowed.indexOf(email) === -1) {
    throw new Error('この管理画面を利用する権限がありません。');
  }

  return email;
}

function adminGetSpreadsheet_() {
  var id = String(
    PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID') ||
    ADMIN_DEFAULT_SPREADSHEET_ID
  ).trim();

  if (!id) throw new Error('SPREADSHEET_IDが設定されていません。');

  return SpreadsheetApp.openById(id);
}

function adminGetBookingSheet_() {
  var sheet = adminGetSpreadsheet_().getSheetByName(ADMIN_BOOKING_SHEET_NAME);

  if (!sheet) throw new Error('予約一覧シートが見つかりません。');

  return sheet;
}

function adminGetCalendar_() {
  var calendarId = String(
    PropertiesService.getScriptProperties().getProperty('CALENDAR_ID') ||
    ADMIN_DEFAULT_CALENDAR_ID
  ).trim();

  if (!calendarId) {
    throw new Error('CALENDAR_IDが設定されていません。');
  }

  var calendar = CalendarApp.getCalendarById(calendarId);

  if (!calendar) {
    throw new Error(
      'Googleカレンダーが見つかりません。' +
      '管理アカウントにカレンダーの編集権限があるか確認してください。'
    );
  }

  return calendar;
}

// ============================================================
// 予約データ取得・集約
// ============================================================

function adminReadBookings_(sheet) {
  var lastRow = sheet.getLastRow();

  if (lastRow < 2) return [];

  var values = sheet
    .getRange(2, 1, lastRow - 1, ADMIN_COLUMNS.LINE_RESULT)
    .getDisplayValues();
  var groups = {};

  values.forEach(function(valuesRow, index) {
    if (adminIsEmptyBookingRow_(valuesRow)) return;

    var row = adminMapRow_(valuesRow, index + 2);
    var key = row.bookingNumber
      ? 'BOOKING:' + row.bookingNumber
      : 'ROW:' + row.rowNumber;

    if (!groups[key]) groups[key] = [];
    groups[key].push(row);
  });

  return Object.keys(groups)
    .map(function(key) {
      return adminBuildBooking_(key, groups[key]);
    })
    .sort(adminCompareBookings_);
}

function adminFindBooking_(sheet, bookingKey) {
  var bookings = adminReadBookings_(sheet);

  for (var i = 0; i < bookings.length; i++) {
    if (bookings[i].key === bookingKey) return bookings[i];
  }

  return null;
}

function adminIsEmptyBookingRow_(row) {
  return !String(row[ADMIN_COLUMNS.BOOKING_NUM - 1] || '').trim() &&
    !String(row[ADMIN_COLUMNS.DATE - 1] || '').trim() &&
    !String(row[ADMIN_COLUMNS.NAME - 1] || '').trim() &&
    !String(row[ADMIN_COLUMNS.PLAN - 1] || '').trim();
}

function adminMapRow_(values, rowNumber) {
  return {
    rowNumber: rowNumber,
    timestamp: String(values[ADMIN_COLUMNS.TIMESTAMP - 1] || ''),
    bookingNumber: String(values[ADMIN_COLUMNS.BOOKING_NUM - 1] || '').trim(),
    date: adminNormalizeDate_(values[ADMIN_COLUMNS.DATE - 1]),
    time: adminNormalizeTime_(values[ADMIN_COLUMNS.TIME - 1]),
    name: String(values[ADMIN_COLUMNS.NAME - 1] || '').trim(),
    plan: String(values[ADMIN_COLUMNS.PLAN - 1] || '').trim(),
    totalPrice: adminToNumber_(values[ADMIN_COLUMNS.TOTAL_PRICE - 1]),
    phone: String(values[ADMIN_COLUMNS.PHONE - 1] || '').trim(),
    sourceStatus: String(values[ADMIN_COLUMNS.STATUS - 1] || '').trim(),
    headcount: String(values[ADMIN_COLUMNS.HEADCOUNT - 1] || '').trim(),
    participants: String(values[ADMIN_COLUMNS.PARTICIPANTS - 1] || '').trim(),
    lineUserId: String(values[ADMIN_COLUMNS.LINE_USER_ID - 1] || '').trim(),
    bookingStatus: String(values[ADMIN_COLUMNS.BOOKING_STATUS - 1] || '').trim(),
    location: String(values[ADMIN_COLUMNS.LOCATION - 1] || '').trim(),
    lineName: String(values[ADMIN_COLUMNS.LINE_NAME - 1] || '').trim(),
    staff: String(values[ADMIN_COLUMNS.STAFF - 1] || '').trim(),
    couponCode: String(values[ADMIN_COLUMNS.COUPON_CODE - 1] || '').trim(),
    couponDiscount: adminToNumber_(values[ADMIN_COLUMNS.COUPON_DISCOUNT - 1]),
    freeMessage: String(values[ADMIN_COLUMNS.LINE_SEND - 1] || ''),
    lineConfirm: String(values[ADMIN_COLUMNS.LINE_CONFIRM - 1] || ''),
    lineResult: String(values[ADMIN_COLUMNS.LINE_RESULT - 1] || '')
  };
}

function adminBuildBooking_(key, rows) {
  rows.sort(function(a, b) { return a.rowNumber - b.rowNumber; });

  var first = rows[0];
  var statuses = adminUnique_(rows.map(function(row) {
    return row.bookingStatus;
  }).filter(String));
  var locations = adminUnique_(rows.map(function(row) {
    return row.location;
  }).filter(String));
  var staff = adminUnique_(rows.map(function(row) {
    return row.staff;
  }).filter(String));
  var times = adminUnique_(rows.map(function(row) {
    return row.time;
  }).filter(String));
  var lineResults = rows.map(function(row) {
    return row.lineResult;
  }).filter(String);

  var booking = {
    key: key,
    bookingNumber: first.bookingNumber,
    date: first.date,
    time: times.join(' / '),
    name: first.name,
    displayPlan: adminGetDisplayPlan_(rows),
    totalPrice: rows.reduce(function(sum, row) { return sum + row.totalPrice; }, 0),
    couponDiscount: rows.reduce(function(sum, row) {
      return sum + row.couponDiscount;
    }, 0),
    phone: first.phone,
    sourceStatus: first.sourceStatus,
    headcount: first.headcount,
    participants: first.participants,
    lineName: first.lineName,
    couponCode: first.couponCode,
    bookingStatus: statuses.length === 0
      ? '未対応'
      : (statuses.length === 1 ? statuses[0] : '混在'),
    location: locations.length === 0
      ? '未設定'
      : (locations.length === 1 ? locations[0] : '複数'),
    staff: staff.length === 0
      ? '未設定'
      : (staff.length === 1 ? staff[0] : '複数'),
    hasLine: rows.some(function(row) { return !!row.lineUserId; }),
    lastLineResult: lineResults.length ? lineResults[lineResults.length - 1] : '',
    componentCount: rows.length,
    rowNumbers: rows.map(function(row) { return row.rowNumber; }),
    components: rows
  };

  var locationGuidance = adminGetLocationGuidanceState_(booking);

  booking.locationGuidanceDue = locationGuidance.due;
  booking.dayLocationDue = locationGuidance.dayDue;
  booking.nightLocationDue = locationGuidance.nightDue;

  booking.version = adminHash_(rows.map(function(row) {
    return [
      row.rowNumber,
      row.date,
      row.time,
      row.bookingStatus,
      row.location,
      row.staff,
      row.lineUserId,
      row.freeMessage,
      row.lineResult
    ].join('|');
  }).join('||'));

  return booking;
}

/**
 * 開催場所の案内が実際に必要な日だけ要確認にします。
 * 昼ツアー：参加日の前日
 * ナイトツアー：参加日の当日
 * セット予約の昼予定は、いずれか1件に場所が入れば案内済みとみなします。
 */
function adminGetLocationGuidanceState_(booking) {
  var state = {
    due: false,
    dayDue: false,
    nightDue: false
  };

  if (!booking || booking.bookingStatus !== '確定') return state;

  var today = adminToday_();
  var tomorrow = adminAddDays_(today, 1);
  var components = booking.components || [];
  var dayComponents = [];
  var nightComponents = [];

  components.forEach(function(component) {
    if (adminIsNightPlan_(component.plan)) {
      nightComponents.push(component);
    } else {
      dayComponents.push(component);
    }
  });

  var dayIsTomorrow = dayComponents.some(function(component) {
    return component.date === tomorrow;
  });
  var dayHasLocation = dayComponents.some(function(component) {
    return !!String(component.location || '').trim();
  });

  var nightIsToday = nightComponents.some(function(component) {
    return component.date === today;
  });
  var nightHasLocation = nightComponents.some(function(component) {
    return !!String(component.location || '').trim();
  });

  state.dayDue = dayIsTomorrow && !dayHasLocation;
  state.nightDue = nightIsToday && !nightHasLocation;
  state.due = state.dayDue || state.nightDue;

  return state;
}

/**
 * ブラウザへ不要なLINE User IDやS列の本文を返さない公開用データです。
 */
function adminToPublicBooking_(booking) {
  var result = {};

  Object.keys(booking).forEach(function(key) {
    if (key !== 'components') result[key] = booking[key];
  });

  result.components = booking.components.map(function(component) {
    return {
      rowNumber: component.rowNumber,
      timestamp: component.timestamp,
      bookingNumber: component.bookingNumber,
      date: component.date,
      time: component.time,
      name: component.name,
      plan: component.plan,
      totalPrice: component.totalPrice,
      phone: component.phone,
      sourceStatus: component.sourceStatus,
      headcount: component.headcount,
      participants: component.participants,
      hasLine: !!component.lineUserId,
      bookingStatus: component.bookingStatus,
      location: component.location,
      lineName: component.lineName,
      staff: component.staff,
      couponCode: component.couponCode,
      couponDiscount: component.couponDiscount,
      lineResult: component.lineResult
    };
  });

  return result;
}

function adminGetDisplayPlan_(rows) {
  var plans = rows.map(function(row) { return row.plan; });
  var joined = plans.join(' ');

  if (joined.indexOf('まるごと1日セット') !== -1) {
    return joined.indexOf('貸切') !== -1
      ? '【貸切】ウミガメシュノーケル＆ドローンSUP＆ナイトツアー まるごと1日セット'
      : 'ウミガメシュノーケル＆ドローンSUP＆ナイトツアー まるごと1日セット';
  }
  if (joined.indexOf('海空セット') !== -1) {
    return 'ウミガメシュノーケル＆ドローンSUP 海空セット';
  }
  if (joined.indexOf('昼夜セット') !== -1) {
    return 'ウミガメシュノーケル＆ヤシガニ探検 昼夜セット';
  }

  return adminUnique_(plans.filter(String)).join(' / ');
}

function adminBuildDashboard_(bookings) {
  var today = adminToday_();
  var tomorrow = adminAddDays_(today, 1);
  var future = bookings.filter(function(booking) {
    return adminBookingHasDateOnOrAfter_(booking, today);
  });
  var confirmed = bookings.filter(function(booking) {
    return booking.bookingStatus === '確定';
  });

  return {
    totalBookings: bookings.length,
    today: bookings.filter(function(booking) {
      return adminBookingHasDate_(booking, today);
    }).length,
    tomorrow: bookings.filter(function(booking) {
      return adminBookingHasDate_(booking, tomorrow);
    }).length,
    futurePending: future.filter(function(booking) {
      return booking.bookingStatus === '未対応' || booking.bookingStatus === '混在';
    }).length,
    futureConfirmed: future.filter(function(booking) {
      return booking.bookingStatus === '確定';
    }).length,
    futureFull: future.filter(function(booking) {
      return booking.bookingStatus === '満席';
    }).length,
    locationMissing: bookings.filter(function(booking) {
      return booking.locationGuidanceDue;
    }).length,
    dayLocationDue: bookings.filter(function(booking) {
      return booking.dayLocationDue;
    }).length,
    nightLocationDue: bookings.filter(function(booking) {
      return booking.nightLocationDue;
    }).length,
    confirmedSales: confirmed.reduce(function(sum, booking) {
      return sum + booking.totalPrice;
    }, 0),
    confirmedCoupons: confirmed.reduce(function(sum, booking) {
      return sum + booking.couponDiscount;
    }, 0)
  };
}

function adminGetBookingDates_(booking) {
  return adminUnique_((booking && booking.components || []).map(function(component) {
    return String(component.date || '');
  }).filter(String));
}

function adminBookingHasDate_(booking, date) {
  return adminGetBookingDates_(booking).indexOf(String(date || '')) !== -1;
}

function adminBookingHasDateOnOrAfter_(booking, date) {
  return adminGetBookingDates_(booking).some(function(componentDate) {
    return componentDate >= date;
  });
}

function adminCompareBookings_(a, b) {
  var today = adminToday_();
  var aFuture = a.date >= today ? 0 : 1;
  var bFuture = b.date >= today ? 0 : 1;

  if (aFuture !== bFuture) return aFuture - bFuture;
  if (a.date !== b.date) {
    return aFuture === 0
      ? String(a.date).localeCompare(String(b.date))
      : String(b.date).localeCompare(String(a.date));
  }

  return String(a.time).localeCompare(String(b.time));
}

// ============================================================
// 更新・LINE送信
// ============================================================

function adminResolveTargetRows_(booking, request) {
  var requestedRow = Number(request.rowNumber || 0);

  if (request.scope === 'all' || !requestedRow) {
    return booking.rowNumbers.slice();
  }

  if (booking.rowNumbers.indexOf(requestedRow) === -1) {
    throw new Error('更新対象の行が予約内容と一致しません。');
  }

  return [requestedRow];
}

function adminWriteColumn_(sheet, rowNumbers, column, value) {
  rowNumbers.forEach(function(rowNumber) {
    sheet.getRange(rowNumber, column).setValue(value);
  });
}

function adminResolveScheduleChanges_(booking, request) {
  var requestedComponents = Array.isArray(request.components)
    ? request.components
    : [];

  if (!requestedComponents.length) {
    throw new Error('変更後の日付・開始時間を入力してください。');
  }

  var bookingRows = {};
  var requestedDates = {};
  var requestedTimes = {};

  booking.components.forEach(function(component) {
    bookingRows[String(component.rowNumber)] = component;
  });

  requestedComponents.forEach(function(componentRequest) {
    var rowNumber = Number(componentRequest && componentRequest.rowNumber || 0);
    var rowKey = String(rowNumber);

    if (!bookingRows[rowKey]) {
      throw new Error('日時変更対象の行が予約内容と一致しません。');
    }

    var componentDate = String(
      componentRequest && componentRequest.date || request.date || ''
    ).trim();

    adminValidateScheduleDate_(componentDate);
    requestedDates[rowKey] = componentDate;
    requestedTimes[rowKey] = adminNormalizeScheduleTime_(
      componentRequest.time
    );
  });

  var autoSup = adminIsAutoSupSchedule_(booking);
  var turtleComponent = null;
  var supComponent = null;

  if (autoSup) {
    turtleComponent = adminFindTurtleScheduleComponent_(booking);
    supComponent = adminFindScheduleComponent_(booking, 'ドローンSUP');

    if (!turtleComponent || !supComponent) {
      throw new Error(
        'セット予約の海亀またはドローンSUP予定を特定できません。'
      );
    }

    var turtleTime = requestedTimes[String(turtleComponent.rowNumber)];
    var turtleDate = requestedDates[String(turtleComponent.rowNumber)];

    if (!turtleDate || !turtleTime) {
      throw new Error('ウミガメシュノーケルの日付・開始時間を入力してください。');
    }

    requestedDates[String(supComponent.rowNumber)] = turtleDate;
    requestedTimes[String(supComponent.rowNumber)] =
      adminAddMinutesToScheduleTime_(turtleTime, 90);
  }

  var changes = booking.components.map(function(component) {
    var date = requestedDates[String(component.rowNumber)];
    var time = requestedTimes[String(component.rowNumber)];

    if (!date || !time) {
      throw new Error(
        '「' + (component.plan || '予定') + '」の日付・開始時間を入力してください。'
      );
    }

    return {
      rowNumber: component.rowNumber,
      plan: component.plan,
      oldDate: component.date,
      oldTime: component.time,
      date: date,
      time: time
    };
  });

  var changed = changes.some(function(change) {
    return change.oldDate !== change.date || change.oldTime !== change.time;
  });

  if (!changed) {
    throw new Error('日付・時間に変更はありません。');
  }

  return changes;
}

function adminValidateScheduleDate_(value) {
  var date = String(value || '').trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error('変更後の参加日を正しく入力してください。');
  }

  var parsed = adminDateFromText_(date);
  var roundTrip = Utilities.formatDate(parsed, 'Asia/Tokyo', 'yyyy-MM-dd');

  if (roundTrip !== date) {
    throw new Error('変更後の参加日が不正です。');
  }

  if (date < adminToday_()) {
    throw new Error('過去の日付へは変更できません。');
  }
}

function adminNormalizeScheduleTime_(value) {
  var match = String(value || '').trim().match(
    /^(\d{1,2})\s*(?::|：|時)\s*(\d{1,2})$/
  );

  if (!match) return '';

  var hour = Number(match[1]);
  var minute = Number(match[2]);

  if (hour > 23 || minute > 59) return '';

  return ('0' + hour).slice(-2) + ':' + ('0' + minute).slice(-2);
}

function adminAddMinutesToScheduleTime_(value, minutes) {
  var time = adminNormalizeScheduleTime_(value);

  if (!time) return '';

  var parts = time.split(':');
  var date = new Date(2000, 0, 1, Number(parts[0]), Number(parts[1]));

  date.setMinutes(date.getMinutes() + Number(minutes || 0));

  return Utilities.formatDate(date, 'Asia/Tokyo', 'HH:mm');
}

function adminIsAutoSupSchedule_(booking) {
  var plan = String(booking && booking.displayPlan || '');

  return plan.indexOf('海空セット') !== -1 ||
    plan.indexOf('まるごと1日セット') !== -1;
}

function adminFindScheduleComponent_(booking, keyword) {
  var components = booking && booking.components || [];

  for (var i = 0; i < components.length; i++) {
    if (String(components[i].plan || '').indexOf(keyword) !== -1) {
      return components[i];
    }
  }

  return null;
}

function adminFindTurtleScheduleComponent_(booking) {
  var components = booking && booking.components || [];

  for (var i = 0; i < components.length; i++) {
    var plan = String(components[i].plan || '');

    if (
      plan.indexOf('海亀') !== -1 ||
      plan.indexOf('ウミガメ') !== -1
    ) {
      return components[i];
    }
  }

  return null;
}

function adminFindCalendarAssignments_(calendar, booking) {
  var dates = adminUnique_(booking.components.map(function(component) {
    return component.date;
  }).filter(String));
  var events = [];

  dates.forEach(function(dateText) {
    events = events.concat(
      calendar.getEventsForDay(adminDateFromText_(dateText))
    );
  });

  var bookingNumber = String(booking.bookingNumber || '');
  var candidates = events.filter(function(event) {
    var description = String(event.getDescription() || '');

    return description.indexOf('予約番号: ' + bookingNumber) !== -1 ||
      description.indexOf('予約番号：' + bookingNumber) !== -1;
  });

  if (!candidates.length) {
    throw new Error(
      'Googleカレンダーに予約番号「' + bookingNumber +
      '」の予定が見つかりません。日時はまだ変更していません。'
    );
  }

  var usedEventIds = {};

  return booking.components.map(function(component) {
    var exactMatches = candidates.filter(function(event) {
      var eventId = String(event.getId());
      if (usedEventIds[eventId]) return false;

      var description = String(event.getDescription() || '');
      var title = String(event.getTitle() || '');

      return description.indexOf('プラン: ' + component.plan) !== -1 ||
        description.indexOf('プラン：' + component.plan) !== -1 ||
        title.indexOf(component.plan) !== -1;
    });

    if (!exactMatches.length && booking.components.length === 1 && candidates.length === 1) {
      exactMatches = [candidates[0]];
    }

    if (exactMatches.length !== 1) {
      throw new Error(
        'Googleカレンダーの「' + component.plan +
        '」予定を1件に特定できません。' +
        '重複や手動変更がないか確認してください。'
      );
    }

    var event = exactMatches[0];
    usedEventIds[String(event.getId())] = true;

    return {
      component: component,
      event: event
    };
  });
}

function adminBuildCalendarScheduleOperations_(booking, changes, assignments) {
  var changeByRow = {};

  changes.forEach(function(change) {
    changeByRow[String(change.rowNumber)] = change;
  });

  var operations = assignments.map(function(assignment) {
    var component = assignment.component;
    var event = assignment.event;
    var change = changeByRow[String(component.rowNumber)];
    var oldStart = event.getStartTime();
    var oldEnd = event.getEndTime();
    var durationMs = oldEnd.getTime() - oldStart.getTime();

    if (
      !durationMs ||
      durationMs < 15 * 60 * 1000 ||
      durationMs > 8 * 60 * 60 * 1000 ||
      (event.isAllDayEvent && event.isAllDayEvent())
    ) {
      durationMs = adminGetDefaultDurationMinutes_(component.plan) * 60 * 1000;
    }

    var newStart = adminDateTimeFromTexts_(change.date, change.time);
    var newEnd = new Date(newStart.getTime() + durationMs);

    return {
      component: component,
      change: change,
      event: event,
      oldStart: oldStart,
      oldEnd: oldEnd,
      oldDescription: String(event.getDescription() || ''),
      newStart: newStart,
      newEnd: newEnd,
      newDescription: ''
    };
  });

  var dateReplacements = {};
  var timeReplacements = {};

  operations.forEach(function(operation) {
    adminRegisterTextReplacement_(
      dateReplacements,
      operation.component.date,
      operation.change.date
    );
    adminRegisterTextReplacement_(
      timeReplacements,
      adminFormatCalendarTime_(operation.oldStart),
      adminFormatCalendarTime_(operation.newStart)
    );
    adminRegisterTextReplacement_(
      timeReplacements,
      adminFormatCalendarTime_(operation.oldEnd),
      adminFormatCalendarTime_(operation.newEnd)
    );
  });

  operations.forEach(function(operation) {
    var description = adminApplyTextReplacements_(
      operation.oldDescription,
      dateReplacements,
      'DATE'
    );

    description = adminApplyTextReplacements_(
      description,
      timeReplacements,
      'TIME'
    );

    description = description.replace(
      /(^|\n)参加日\s*[:：]\s*[^\n]*/,
      '$1参加日: ' + operation.change.date
    );
    description = description.replace(
      /(^|\n)時間\s*[:：]\s*[^\n]*/,
      '$1時間: ' + operation.change.time
    );

    operation.newDescription = description;
  });

  return operations;
}

function adminRegisterTextReplacement_(map, oldValue, newValue) {
  var oldText = String(oldValue || '');
  var newText = String(newValue || '');

  if (!oldText || oldText === newText) return;

  if (
    Object.prototype.hasOwnProperty.call(map, oldText) &&
    map[oldText] !== newText
  ) {
    map[oldText] = null;
    return;
  }

  if (!Object.prototype.hasOwnProperty.call(map, oldText)) {
    map[oldText] = newText;
  }
}

function adminApplyTextReplacements_(text, replacements, prefix) {
  var result = String(text || '');
  var tokens = [];

  Object.keys(replacements).forEach(function(oldValue, index) {
    var newValue = replacements[oldValue];

    if (newValue === null || oldValue === newValue) return;

    var token = '__ADMIN_' + prefix + '_' + index + '__';
    result = result.split(oldValue).join(token);
    tokens.push({ token: token, value: newValue });
  });

  tokens.forEach(function(item) {
    result = result.split(item.token).join(item.value);
  });

  return result;
}

function adminGetDefaultDurationMinutes_(planName) {
  var plan = String(planName || '');

  if (plan.indexOf('海空セット') !== -1) return 90;
  if (plan.indexOf('まるごと1日セット') !== -1) return 90;
  if (plan.indexOf('昼夜セットヤシガニ') !== -1) return 90;

  return 120;
}

function adminDateFromText_(dateText) {
  var parts = String(dateText || '').split('-');

  return new Date(
    Number(parts[0]),
    Number(parts[1]) - 1,
    Number(parts[2])
  );
}

function adminDateTimeFromTexts_(dateText, timeText) {
  var dateParts = String(dateText || '').split('-');
  var timeParts = String(timeText || '').split(':');

  return new Date(
    Number(dateParts[0]),
    Number(dateParts[1]) - 1,
    Number(dateParts[2]),
    Number(timeParts[0]),
    Number(timeParts[1])
  );
}

function adminFormatCalendarTime_(date) {
  return Utilities.formatDate(date, 'Asia/Tokyo', 'HH:mm');
}

function adminReadOriginalScheduleValues_(sheet, rowNumbers) {
  return rowNumbers.map(function(rowNumber) {
    return {
      rowNumber: rowNumber,
      values: sheet
        .getRange(rowNumber, ADMIN_COLUMNS.DATE, 1, 2)
        .getValues()[0]
    };
  });
}

function adminReadFullBookingRows_(sheet, rowNumbers) {
  return rowNumbers.map(function(rowNumber) {
    return {
      rowNumber: rowNumber,
      values: sheet
        .getRange(rowNumber, 1, 1, ADMIN_COLUMNS.LINE_RESULT)
        .getValues()[0]
    };
  });
}

function adminArchiveDeletedBooking_(sourceSheet, booking, originalRows, actor) {
  var ss = adminGetSpreadsheet_();
  var sheet = ss.getSheetByName(ADMIN_DELETED_SHEET_NAME);
  var metadataHeaders = [
    '削除日時',
    '操作者',
    '削除状態',
    '予約キー',
    '元予約一覧行',
    'アプリ版'
  ];
  var sourceHeaders = sourceSheet
    .getRange(1, 1, 1, ADMIN_COLUMNS.LINE_RESULT)
    .getValues()[0];
  var headers = metadataHeaders.concat(sourceHeaders);

  if (!sheet) {
    sheet = ss.insertSheet(ADMIN_DELETED_SHEET_NAME);
  }

  if (String(sheet.getRange(1, 1).getValue()) !== headers[0]) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
    sheet
      .getRange(1, 1, 1, headers.length)
      .setFontWeight('bold')
      .setBackground('#f4cccc');
  }

  var deletedAt = new Date();
  var archiveValues = originalRows.map(function(item) {
    return [
      deletedAt,
      actor,
      '削除前退避',
      booking.key,
      item.rowNumber,
      ADMIN_APP_VERSION
    ].concat(item.values);
  });
  var startRow = Math.max(sheet.getLastRow() + 1, 2);

  sheet
    .getRange(startRow, 1, archiveValues.length, headers.length)
    .setValues(archiveValues);

  SpreadsheetApp.flush();

  return {
    sheet: sheet,
    startRow: startRow,
    rowCount: archiveValues.length
  };
}

function adminMarkDeletedArchiveComplete_(archive) {
  if (!archive || !archive.sheet || !archive.rowCount) return;

  archive.sheet
    .getRange(archive.startRow, 3, archive.rowCount, 1)
    .setValues(Array.apply(null, Array(archive.rowCount)).map(function() {
      return ['削除完了'];
    }));

  SpreadsheetApp.flush();
}

function adminFindCalendarEventsForDeletion_(calendar, booking) {
  var dates = adminUnique_(booking.components.map(function(component) {
    return component.date;
  }).filter(String));
  var matched = [];
  var seen = {};
  var bookingNumber = String(booking.bookingNumber || '');

  dates.forEach(function(dateText) {
    calendar
      .getEventsForDay(adminDateFromText_(dateText))
      .forEach(function(event) {
        var eventId = String(event.getId());

        if (
          !seen[eventId] &&
          adminCalendarEventHasBookingNumber_(event, bookingNumber)
        ) {
          seen[eventId] = true;
          matched.push(event);
        }
      });
  });

  var warning = '';

  if (!matched.length) {
    warning =
      '予約一覧は削除しましたが、Googleカレンダーに同じ予約番号の予定が見つかりませんでした。';
  } else if (matched.length !== booking.components.length) {
    warning =
      'Googleカレンダーは' + matched.length + '件削除しました。' +
      '予約の予定数（' + booking.components.length + '件）と一致しないため、' +
      'カレンダーを念のため確認してください。';
  }

  return {
    events: matched,
    warning: warning
  };
}

function adminCalendarEventHasBookingNumber_(event, bookingNumber) {
  var description = String(event.getDescription() || '');

  return description.split(/\r?\n/).some(function(line) {
    var match = String(line).match(/^\s*予約番号\s*[:：]\s*(.*?)\s*$/);

    return !!match && String(match[1]) === String(bookingNumber);
  });
}

function adminSnapshotCalendarEvent_(event) {
  var snapshot = {
    title: String(event.getTitle() || ''),
    start: event.getStartTime(),
    end: event.getEndTime(),
    description: String(event.getDescription() || ''),
    location: String(event.getLocation() || ''),
    color: '',
    allDay: !!(
      event.isAllDayEvent &&
      event.isAllDayEvent()
    )
  };

  try {
    snapshot.color = String(event.getColor() || '');
  } catch (error) {
    snapshot.color = '';
  }

  if (snapshot.allDay) {
    try {
      snapshot.start = event.getAllDayStartDate();
      snapshot.end = event.getAllDayEndDate();
    } catch (error) {
      // getStartTime/getEndTimeで復旧します。
    }
  }

  return snapshot;
}

function adminRestoreCalendarEvents_(calendar, snapshots) {
  var errors = [];

  snapshots.forEach(function(snapshot) {
    try {
      var options = {
        description: snapshot.description,
        location: snapshot.location
      };
      var restored = snapshot.allDay
        ? calendar.createAllDayEvent(
          snapshot.title,
          snapshot.start,
          snapshot.end,
          options
        )
        : calendar.createEvent(
          snapshot.title,
          snapshot.start,
          snapshot.end,
          options
        );

      if (snapshot.color) restored.setColor(snapshot.color);

    } catch (error) {
      Logger.log('削除したカレンダー予定の復旧失敗: ' + error.message);
      errors.push('カレンダー: ' + error.message);
    }
  });

  return errors;
}

function adminRestoreFullBookingRows_(sheet, originalRows) {
  var errors = [];

  originalRows.forEach(function(item) {
    try {
      sheet
        .getRange(item.rowNumber, 1, 1, ADMIN_COLUMNS.LINE_RESULT)
        .setValues([item.values]);
    } catch (error) {
      Logger.log('削除した予約一覧行の復旧失敗: ' + error.message);
      errors.push('予約一覧行' + item.rowNumber + ': ' + error.message);
    }
  });

  try {
    SpreadsheetApp.flush();
  } catch (error) {
    Logger.log('削除した予約一覧行の復旧反映失敗: ' + error.message);
    errors.push('予約一覧の反映: ' + error.message);
  }

  return errors;
}

function adminRollbackCalendarSchedule_(operations) {
  var errors = [];

  for (var i = operations.length - 1; i >= 0; i--) {
    try {
      operations[i].event.setTime(
        operations[i].oldStart,
        operations[i].oldEnd
      );
      operations[i].event.setDescription(
        operations[i].oldDescription
      );
    } catch (error) {
      Logger.log('カレンダー日時のロールバック失敗: ' + error.message);
      errors.push('カレンダー: ' + error.message);
    }
  }

  return errors;
}

function adminRollbackSheetSchedule_(sheet, originalValues) {
  var errors = [];

  originalValues.forEach(function(item) {
    try {
      sheet
        .getRange(item.rowNumber, ADMIN_COLUMNS.DATE, 1, 2)
        .setValues([item.values]);
    } catch (error) {
      Logger.log('予約一覧の日時ロールバック失敗: ' + error.message);
      errors.push('予約一覧行' + item.rowNumber + ': ' + error.message);
    }
  });

  try {
    SpreadsheetApp.flush();
  } catch (error) {
    Logger.log('予約一覧のロールバック確定失敗: ' + error.message);
    errors.push('予約一覧の反映: ' + error.message);
  }

  return errors;
}

function adminClearPendingForBooking_(sheet, booking) {
  adminDeletePendingPropertiesForBooking_(booking);

  booking.rowNumbers.forEach(function(rowNumber) {
    var resultRange = sheet.getRange(rowNumber, ADMIN_COLUMNS.LINE_RESULT);
    var currentResult = String(resultRange.getValue() || '');

    sheet
      .getRange(rowNumber, ADMIN_COLUMNS.LINE_CONFIRM)
      .setValue(false)
      .setBackground(null);

    if (currentResult.indexOf('WEB送信待ち：') === 0) {
      resultRange
        .setValue('日時変更のためWEB送信待ちを取り消しました')
        .setBackground(null);
    }
  });
}

function adminDeletePendingPropertiesForBooking_(booking) {
  var properties = PropertiesService.getScriptProperties();
  var values = properties.getProperties();

  Object.keys(values).forEach(function(key) {
    if (key.indexOf(ADMIN_PENDING_PREFIX) !== 0) return;

    try {
      var pending = JSON.parse(values[key]);

      if (pending.bookingKey === booking.key) {
        properties.deleteProperty(key);
      }
    } catch (error) {
      properties.deleteProperty(key);
    }
  });
}

function adminValidateStatus_(value) {
  if (ADMIN_STATUS_OPTIONS.indexOf(value) === -1) {
    throw new Error('予約ステータスが不正です。');
  }
}

function adminValidateLocation_(sheet, value) {
  if (value && adminGetLocationOptions_(sheet).indexOf(value) === -1) {
    throw new Error('開催場所が選択肢にありません。');
  }
}

function adminGetLocationOptions_(sheet) {
  var options = [];
  var lastRow = Math.max(sheet.getLastRow(), 2);
  var validations = sheet
    .getRange(2, ADMIN_COLUMNS.LOCATION, Math.min(lastRow - 1, 50), 1)
    .getDataValidations();

  for (var i = 0; i < validations.length; i++) {
    var validation = validations[i][0];
    if (!validation) continue;

    var criteria = validation.getCriteriaType();
    var values = validation.getCriteriaValues();

    if (
      criteria === SpreadsheetApp.DataValidationCriteria.VALUE_IN_LIST &&
      values && Array.isArray(values[0])
    ) {
      options = values[0].map(String);
      break;
    }
  }

  return options.length
    ? adminUnique_(options)
    : ADMIN_LOCATION_OPTIONS.slice();
}

function adminSelectLineRow_(booking, preferredRowNumber) {
  var preferred = Number(preferredRowNumber || 0);
  var matching = booking.components.filter(function(component) {
    return component.rowNumber === preferred && component.lineUserId;
  });

  if (matching.length) return matching[0];

  for (var i = 0; i < booking.components.length; i++) {
    if (booking.components[i].lineUserId) return booking.components[i];
  }

  return null;
}

function adminFindComponentByRow_(booking, rowNumber) {
  var target = Number(rowNumber || 0);

  for (var i = 0; i < booking.components.length; i++) {
    if (booking.components[i].rowNumber === target) return booking.components[i];
  }

  return null;
}

function adminCreatePendingLine_(sheet, booking, lineRow, messageRow, action, actor) {
  var message = action.type === 'STATUS'
    ? adminBuildStatusMessage_(booking, action.value)
    : adminBuildLocationMessage_(
      messageRow.location,
      messageRow.time,
      messageRow.plan
    );
  var summary = action.type === 'STATUS'
    ? '予約ステータス「' + action.value + '」'
    : '開催場所「' + action.value + '」';

  if (!message) {
    throw new Error('送信メッセージを作成できませんでした。');
  }

  var pending = adminSavePendingLine_({
    bookingKey: booking.key,
    bookingNumber: booking.bookingNumber,
    rowNumbers: action.type === 'STATUS'
      ? booking.rowNumbers.slice()
      : [messageRow.rowNumber],
    sourceRowNumber: lineRow.rowNumber,
    type: action.type,
    expectedValue: action.value,
    summary: summary,
    message: message,
    lineUserId: lineRow.lineUserId,
    actor: actor,
    createdAt: new Date().toISOString()
  });

  sheet
    .getRange(lineRow.rowNumber, ADMIN_COLUMNS.LINE_CONFIRM)
    .setValue(false)
    .setBackground('#fff2cc');
  sheet
    .getRange(lineRow.rowNumber, ADMIN_COLUMNS.LINE_RESULT)
    .setValue('WEB送信待ち：' + summary)
    .setBackground('#fff2cc');

  return pending;
}

function adminSavePendingLine_(pending) {
  var token = Utilities.getUuid();
  pending.token = token;

  PropertiesService
    .getScriptProperties()
    .setProperty(ADMIN_PENDING_PREFIX + token, JSON.stringify(pending));

  return {
    token: token,
    type: pending.type,
    summary: pending.summary,
    message: pending.message,
    expiresInMinutes: ADMIN_PENDING_TTL_MINUTES
  };
}

function adminReadPendingLine_(token) {
  var json = PropertiesService
    .getScriptProperties()
    .getProperty(ADMIN_PENDING_PREFIX + token);

  if (!json) return null;

  try {
    return JSON.parse(json);
  } catch (error) {
    return null;
  }
}

function adminDeletePendingLine_(token) {
  PropertiesService
    .getScriptProperties()
    .deleteProperty(ADMIN_PENDING_PREFIX + token);
}

function adminCleanupExpiredPending_() {
  var properties = PropertiesService.getScriptProperties();
  var values = properties.getProperties();
  var cutoff = Date.now() - ADMIN_PENDING_TTL_MINUTES * 60 * 1000;

  Object.keys(values).forEach(function(key) {
    if (key.indexOf(ADMIN_PENDING_PREFIX) !== 0) return;

    try {
      var pending = JSON.parse(values[key]);
      if (new Date(pending.createdAt).getTime() < cutoff) {
        properties.deleteProperty(key);
      }
    } catch (error) {
      properties.deleteProperty(key);
    }
  });
}

function adminAssertPendingStillValid_(booking, pending) {
  var targetRows = booking.components.filter(function(component) {
    return pending.rowNumbers.indexOf(component.rowNumber) !== -1;
  });

  if (targetRows.length !== pending.rowNumbers.length) {
    throw new Error('予約行が変更されたため送信を中止しました。');
  }

  if (pending.type === 'STATUS') {
    if (targetRows.some(function(row) {
      return row.bookingStatus !== pending.expectedValue;
    })) {
      throw new Error('予約ステータスが変更されたため送信を中止しました。');
    }
  }

  if (pending.type === 'LOCATION') {
    if (targetRows.some(function(row) {
      return row.location !== pending.expectedValue;
    })) {
      throw new Error('開催場所が変更されたため送信を中止しました。');
    }
  }
}

function adminSendLine_(lineUserId, message, pending, sourceRow, actor) {
  var secret = String(
    PropertiesService.getScriptProperties().getProperty('NOTIFY_SECRET') || ''
  );

  if (!secret) {
    throw new Error('管理Webアプリ側のNOTIFY_SECRETが未設定です。');
  }

  var response;
  var code = 0;
  var body = '';
  var success = false;
  var errorText = '';

  try {
    response = UrlFetchApp.fetch(ADMIN_NOTIFY_API_URL, {
      method: 'post',
      contentType: 'application/json',
      headers: {
        Authorization: 'Bearer ' + secret
      },
      payload: JSON.stringify({
        lineUserId: lineUserId,
        customMessage: message,
        retryKey: pending.token || ''
      }),
      muteHttpExceptions: true
    });

    code = response.getResponseCode();
    body = response.getContentText();
    success = code === 200;
    if (!success) errorText = 'HTTP ' + code + ': ' + body;

  } catch (error) {
    errorText = error.message;
  }

  var warningText = '';

  try {
    adminAppendLineLog_(pending, sourceRow, success, actor);
  } catch (lineLogError) {
    warningText = adminJoinWarnings_(
      warningText,
      'LINE送信履歴を記録できませんでした: ' + lineLogError.message
    );
  }

  try {
    adminAppendAudit_(
      actor,
      {
        bookingNumber: pending.bookingNumber,
        name: sourceRow.name,
        date: sourceRow.date,
        key: pending.bookingKey
      },
      success ? 'LINE送信成功' : 'LINE送信失敗',
      pending.summary + (errorText ? ' / ' + errorText : ''),
      [sourceRow.rowNumber]
    );
  } catch (auditError) {
    warningText = adminJoinWarnings_(
      warningText,
      '管理操作履歴を記録できませんでした: ' + auditError.message
    );
  }

  return {
    success: success,
    error: errorText,
    warning: warningText
  };
}

function adminJoinWarnings_(current, next) {
  return [String(current || ''), String(next || '')]
    .filter(String)
    .join(' / ');
}

function adminAppendLineLog_(pending, row, success, actor) {
  var sheet = adminGetOrCreateLineLogSheet_();

  sheet.appendRow([
    new Date(),
    pending.bookingNumber || row.bookingNumber || '',
    row.name || '',
    row.date || '',
    row.time || '',
    row.plan || '',
    pending.summary + '（WEB管理画面）',
    pending.lineUserId || '',
    pending.message || '',
    success ? '成功' : '失敗',
    row.rowNumber || ''
  ]);
}

function adminGetOrCreateLineLogSheet_() {
  var ss = adminGetSpreadsheet_();
  var sheet = ss.getSheetByName(ADMIN_LINE_LOG_SHEET_NAME);
  var headers = [
    '送信日時', '予約番号', '名前', '参加日', '時間', 'プラン',
    '送信種別', 'LINE User ID', 'メッセージ', '結果', '予約一覧行'
  ];

  if (!sheet) sheet = ss.insertSheet(ADMIN_LINE_LOG_SHEET_NAME);

  if (String(sheet.getRange(1, 1).getValue()) !== headers[0]) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
  }

  return sheet;
}

function adminWasSuccessfulStatusSent_(bookingNumber, summary) {
  if (!bookingNumber) return false;

  if (
    PropertiesService
      .getScriptProperties()
      .getProperty(adminStatusSentKey_(bookingNumber, summary))
  ) {
    return true;
  }

  var ss = adminGetSpreadsheet_();
  var sheet = ss.getSheetByName(ADMIN_LINE_LOG_SHEET_NAME);

  if (!sheet || sheet.getLastRow() < 2) return false;

  var startRow = Math.max(2, sheet.getLastRow() - 499);
  var values = sheet
    .getRange(startRow, 1, sheet.getLastRow() - startRow + 1, 10)
    .getDisplayValues();

  return values.some(function(row) {
    return String(row[1]) === String(bookingNumber) &&
      String(row[6]).indexOf(summary) !== -1 &&
      String(row[9]) === '成功';
  });
}

function adminStatusSentKey_(bookingNumber, summary) {
  return (
    ADMIN_STATUS_SENT_PREFIX +
    adminHash_(String(bookingNumber || '') + '|' + String(summary || ''))
  );
}

function adminMarkSuccessfulStatusSent_(bookingNumber, summary) {
  if (!bookingNumber) return;

  PropertiesService
    .getScriptProperties()
    .setProperty(
      adminStatusSentKey_(bookingNumber, summary),
      new Date().toISOString()
    );
}

// ============================================================
// LINE文面
// ============================================================

function adminBuildStatusMessage_(booking, status) {
  if (status === '満席') {
    return adminBuildFullMessage_(booking);
  }

  if (status !== '確定') return '';

  var plan = booking.displayPlan;

  if (adminIsTriple_(booking)) return adminBuildTripleConfirm_(booking);
  if (adminIsSeaSky_(booking)) return adminBuildSeaSkyConfirm_(booking);
  if (adminIsDayNight_(booking)) return adminBuildDayNightConfirm_(booking);
  if (adminIsDroneSupSingle_(plan)) return adminBuildDroneSupConfirm_(booking);
  if (adminIsNightPlan_(plan)) return adminBuildNightConfirm_(booking);
  if (plan.indexOf('SUP') !== -1) return adminBuildSupConfirm_(booking);

  return adminBuildSnorkelConfirm_(booking);
}

function adminGetComponentScheduleLabel_(component) {
  var plan = String(component && component.plan || '');

  if (plan.indexOf('海亀') !== -1 || plan.indexOf('ウミガメ') !== -1) {
    return '🐢 ウミガメシュノーケル';
  }
  if (plan.indexOf('ドローンSUP') !== -1) {
    return '🛸 ドローンSUP';
  }
  if (adminIsNightPlan_(plan)) {
    return '🦀 ナイトツアー';
  }

  return plan || '予定';
}

function adminFormatComponentSchedule_(component) {
  if (!component) return 'なし';

  return adminValueOrNone_(component.date) + ' ' +
    adminValueOrNone_(component.time);
}

function adminBuildScheduleText_(booking) {
  var components = booking && booking.components || [];

  if (!components.length) {
    return adminValueOrNone_(booking && booking.date) + ' ' +
      adminValueOrNone_(booking && booking.time);
  }

  if (components.length === 1) {
    return adminFormatComponentSchedule_(components[0]);
  }

  return components.map(function(component) {
    return adminGetComponentScheduleLabel_(component) + '：' +
      adminFormatComponentSchedule_(component);
  }).join('\n');
}

function adminBuildDetailBlock_(booking) {
  var scheduleText = adminBuildScheduleText_(booking);
  var schedulePrefix = booking.components && booking.components.length > 1
    ? '開催日時：\n'
    : '日時：';

  return (
    '【ご予約内容】\n' +
    '予約番号：' + booking.bookingNumber + '\n' +
    'プラン：' + booking.displayPlan + '\n' +
    schedulePrefix + scheduleText + '\n' +
    '人数：' + adminValueOrNone_(booking.headcount) + '\n' +
    '合計金額：' + adminFormatYen_(booking.totalPrice) + '\n' +
    'クーポン：' + adminFormatCoupon_(booking.couponCode, booking.couponDiscount) + '\n\n' +
    '【お客様情報】\n' +
    '電話番号：' + adminValueOrNone_(booking.phone) + '\n' +
    'LINE名：' + adminValueOrNone_(booking.lineName) + '\n' +
    'スタッフ指名：' + adminValueOrNone_(booking.staff === '未設定' ? '指名なし' : booking.staff) + '\n\n' +
    '【参加者詳細】\n' +
    adminValueOrNone_(booking.participants)
  );
}

function adminConfirmOpening_(booking, emoji) {
  return (
    emoji + ' ご予約が確定しました！\n\n' +
    booking.name + ' 様\n\n' +
    '以下の内容でご予約を確定いたしました。\n' +
    '内容にお間違いがないかご確認ください。\n\n' +
    adminBuildDetailBlock_(booking)
  );
}

function adminBuildSnorkelConfirm_(booking) {
  return adminConfirmOpening_(booking, '🐢') +
    '\n\n【当日の持ち物】\n' +
    '・水着（着替えは現地でできます）\n' +
    '・タオル\n' +
    '・酔い止め（必要な方）\n\n' +
    '【集合場所について】\n' +
    '海況や風向きを考慮した上で、前日にLINEにてご連絡いたします。\n\n' +
    adminCancelPolicy_();
}

function adminBuildNightConfirm_(booking) {
  return adminConfirmOpening_(booking, '🦀') +
    '\n\n【当日持ってくると便利なもの】\n' +
    '・虫よけスプレー\n' +
    '・靴（サンダル不可・推奨）\n' +
    '・長ズボン（虫刺されが気になる方）\n\n' +
    '【集合場所について】\n' +
    '当日にLINEにてご連絡いたします。\n\n' +
    '【ご注意】\n' +
    '足腰が悪い方・体が不自由な方は事前に一度ご相談ください。\n\n' +
    adminCancelPolicy_();
}

function adminBuildSupConfirm_(booking) {
  return adminConfirmOpening_(booking, '🌅') +
    '\n\n【当日の持ち物】\n' +
    '・水着（水着を着て集合していただけると助かります）\n' +
    '・タオル\n' +
    '・酔い止め（必要な方）\n\n' +
    '【集合場所について】\n' +
    '前日にLINEにてご連絡いたします。\n\n' +
    adminCancelPolicy_();
}

function adminBuildDroneSupConfirm_(booking) {
  return adminConfirmOpening_(booking, '🛸') +
    '\n\n【開始時間について】\n' +
    'ご予約時に選択いただいた開始時間での開催です。\n' +
    '当日の海況・水位により前後する場合は、事前にLINEでご連絡いたします。\n\n' +
    '【集合場所について】\n' +
    '海況・水位を見て、安全に綺麗な写真が残せるビーチを選び、\n' +
    '前日にLINEにてご連絡いたします。\n\n' +
    '【当日の持ち物】\n' +
    '・水着（着用してお越しいただけると助かります）\n' +
    '・着替え・タオル\n' +
    '・日焼け止め・飲み物\n' +
    '・サンダル\n\n' +
    '【ドローン撮影について】\n' +
    '強風・雨・飛行制限・安全判断により、ドローン撮影ができない場合があります。\n' +
    'その場合も通常の写真・動画撮影で思い出をお残しします。\n\n' +
    adminCancelPolicy_();
}

function adminBuildDayNightConfirm_(booking) {
  var turtle = adminFindTurtleScheduleComponent_(booking);
  var night = adminFindComponent_(booking, 'ヤシガニ');

  return adminConfirmOpening_(booking, '🐢🦀') +
    '\n\n【プラン内容】\n' +
    'ウミガメシュノーケル＋ヤシガニ探検の昼夜セットです。\n\n' +
    '🐢 ウミガメシュノーケル：' + adminFormatComponentSchedule_(turtle) + '\n' +
    '🦀 ヤシガニ探検：' + adminFormatComponentSchedule_(night) + '\n\n' +
    '【集合場所のご案内】\n' +
    '・ウミガメシュノーケル：前日にLINEでご連絡します\n' +
    '・ヤシガニ探検：当日にLINEでご連絡します\n\n' +
    '【当日の持ち物】\n' +
    '〔昼・ウミガメ〕水着・タオル・酔い止め（必要な方）\n' +
    '〔夜・ヤシガニ探検〕虫よけスプレー・歩きやすい靴（サンダル不可）・飲み物\n\n' +
    adminCancelPolicy_();
}

function adminBuildSeaSkyConfirm_(booking) {
  var turtle = adminFindTurtleScheduleComponent_(booking);
  var sup = adminFindComponent_(booking, 'ドローンSUP');

  return adminConfirmOpening_(booking, '🐢🛸') +
    '\n\n【プラン内容】\n' +
    'ウミガメシュノーケル＋ドローンSUPの海空セットです。\n' +
    '所要時間の目安は約3.5〜4時間です。\n\n' +
    '🐢 ウミガメシュノーケル：' + adminFormatComponentSchedule_(turtle) + '〜 約1.5時間\n' +
    '🛸 ドローンSUP：' + adminFormatComponentSchedule_(sup) + '〜 約1.5時間\n' +
    '※ ウミガメシュノーケル終了後、そのまま続けてドローンSUPを行います。\n\n' +
    '【開催場所について】\n' +
    '基本的に同じビーチで、続けて開催します。\n' +
    '海況・水位によっては、ドローンSUPを別のビーチで開催する場合があります。\n' +
    '集合場所は前日にLINEでご連絡いたします。\n\n' +
    '【当日の持ち物】\n' +
    '・水着（着替えは現地でできます）\n' +
    '・タオル\n' +
    '・酔い止め（必要な方）\n\n' +
    adminCancelPolicy_();
}

function adminBuildTripleConfirm_(booking) {
  var turtle = adminFindTurtleScheduleComponent_(booking);
  var sup = adminFindComponent_(booking, 'ドローンSUP');
  var night = adminFindComponent_(booking, 'ヤシガニ');

  return adminConfirmOpening_(booking, '🐢🛸🦀') +
    '\n\n【開催時間】\n' +
    '🐢 ウミガメシュノーケル：' + adminFormatComponentSchedule_(turtle) + '〜 約1.5時間\n' +
    '🛸 ドローンSUP：' + adminFormatComponentSchedule_(sup) + '〜 約1.5時間\n' +
    '🦀 ナイトツアー：' + adminFormatComponentSchedule_(night) + '〜 約1.5時間\n\n' +
    '【開催場所について】\n' +
    '・ウミガメシュノーケル：前日にLINEでご連絡します\n' +
    '・ドローンSUP：ウミガメ終了後、そのまま続けて開催します\n' +
    '・ナイトツアー：当日にLINEでご連絡します\n\n' +
    '【当日の持ち物】\n' +
    '〔昼・海亀／SUP〕水着・タオル・酔い止め（必要な方）\n' +
    '〔夜・ナイトツアー〕虫よけスプレー・歩きやすい靴（サンダル不可）・飲み物\n\n' +
    adminCancelPolicy_();
}

function adminBuildFullMessage_(booking) {
  return (
    'この度はご予約いただき、\n' +
    '誠にありがとうございます。\n\n' +
    booking.name + ' 様\n\n' +
    '予約番号：' + booking.bookingNumber + '\n' +
    'プラン：' + booking.displayPlan + '\n' +
    '開催日時：\n' + adminBuildScheduleText_(booking) + '\n\n' +
    '大変申し訳ございませんが、\n' +
    'ご希望の日程はすでに満席となっており、\n' +
    'ご予約をお受けすることができない状況です。\n\n' +
    'またの機会にぜひご利用いただけますと\n' +
    '幸いです。\n\n' +
    '海亀兄弟'
  );
}

function adminBuildLocationMessage_(location, selectedTime, planName) {
  var nightFooter =
    '\n\n恐れ入りますが、本メッセージをご確認いただけましたら、ご返信いただけますと幸いです。\n' +
    '事務担当　中村 凪';
  var snorkelFooter =
    '\n\n【到着推奨時間・駐車場について】\n' +
    '5〜10月：開始30〜40分前\n' +
    '11〜4月：開始15分前\n\n' +
    '宮古島のシュノーケルポイントは大変人気のため、駐車場が混雑する場合がございます。\n' +
    'お早めにお越しいただき、駐車場の確保をお願いいたします。\n\n' +
    '開始15分前〜開始時間の間に現地スタッフよりお電話いたします。\n' +
    '現地にてお待ちください。' + nightFooter;
  var nightCommon =
    '【持ち物・服装】\n' +
    '特に持ち物はありませんが、2時間ほど歩きますので水分の持参をおすすめします。\n' +
    '動きやすい格好・長袖長ズボン・靴（完全舗装ではないためサンダル不可）でお越しください。\n' +
    '🚻 トイレがありませんので、事前に済ませてからお越しください。\n\n';
  var higashihenna =
    '明日のツアー開催場所のご案内です。\n' +
    '明日は東平安名ビーチにて開催いたします。\n\n' +
    'ウミガメ遭遇率：80%\n' +
    'サンゴ・熱帯魚：観察できます\n' +
    '🅿️ 駐車場：無料\n' +
    '🚻 トイレ：なし／🚿 シャワー：なし\n' +
    '※トイレ・シャワーがありませんので事前にお済ませください。\n\n' +
    '📍 https://maps.app.goo.gl/7HQCCFH2WWGUQUfK7\n\n' +
    'Googleマップ上では韓国語表示される駐車場が表示される場合があります。\n' +
    '当日はナンバー「7127」のシルバーの車を目印にお越しください。\n' +
    '現地は電波が不安定な場合がございますので、事前に地図をご確認ください。' +
    snorkelFooter;
  var messages = {
    '新城海岸':
      '明日のツアー開催場所のご案内です。\n' +
      '明日は新城海岸にて開催いたします。\n\n' +
      'ウミガメ遭遇率：95%\n' +
      'サンゴ・熱帯魚：観察できます\n' +
      '🅿️ 駐車場：2,000円\n' +
      '🚻 トイレ：あり／🚿 シャワー：あり\n' +
      '📍 https://maps.google.com/?cid=4444603144121769337' + snorkelFooter,
    '東平安名ビーチ': higashihenna,
    'ボラビーチ': higashihenna,
    'ワイワイビーチ':
      '明日のツアー開催場所のご案内です。\n' +
      '明日はワイワイビーチにて開催いたします。\n\n' +
      'ウミガメ遭遇率：80%\n' +
      'サンゴ・熱帯魚：観察できます\n' +
      '🅿️ 駐車場：無料\n' +
      '🚻 トイレ：なし／🚿 シャワー：なし\n' +
      '※トイレ・シャワーがありませんので事前にお済ませください。\n' +
      '📍 https://maps.app.goo.gl/omdcJdCtih5aS9Vc9' + snorkelFooter,
    'シギラビーチ':
      '明日のツアー開催場所のご案内です。\n' +
      '明日はシギラビーチにて開催いたします。\n\n' +
      'ウミガメ遭遇率：80%\n' +
      'サンゴ・熱帯魚：観察できます\n' +
      '🅿️ 駐車場：1,000円\n' +
      '🚻 トイレ：あり／🚿 シャワー：なし\n' +
      'なお、シギラビーチは複数の業者が集中するビーチのため、ウミガメとの写真撮影はお約束できません。\n' +
      '📍 https://maps.app.goo.gl/RTwT8jv1U9GJrwLJ7?g_st=ic' + snorkelFooter,
    'ナイトツアー（遺跡）':
      '本日のナイトツアー集合場所のご案内です。\n' +
      '本日の集合場所はこちらになります。\n\n' + nightCommon +
      '📍 集合場所：https://maps.app.goo.gl/ugnwv2zcUReYTsuR6\n' +
      '上比屋山遺跡と記された石碑がありますので、その道路沿いにお車をお停めください。\n\n' +
      '本日 ' + (selectedTime || '集合時間') + ' にお待ちしております。' + nightFooter,
    'ナイトツアー（インディアンマリンガーデン）':
      '本日のナイトツアー集合場所のご案内です。\n' +
      '本日の集合場所はこちらになります。\n\n' + nightCommon +
      '📍 集合場所（第一駐車場）：https://maps.app.goo.gl/jyKBqL2WtUkP8MSJA?g_st=ic\n' +
      '第一駐車場にてお待ちください。\n\n' +
      '集合時間になりましたら現地スタッフよりお電話いたします。\n' +
      'そのままお待ちいただけますと幸いです。' + nightFooter
  };

  var message = messages[location] || '';

  if (message && adminIsDroneSupSingle_(planName)) {
    message = message
      .replace('明日のツアー開催場所のご案内です。', '明日のドローンSUP開催場所のご案内です。')
      .replace(/ウミガメ遭遇率：[^\n]*\n?/, '')
      .replace(/サンゴ・熱帯魚：[^\n]*\n?/, '')
      .replace(/なお、シギラビーチは[^\n]*\n?/, '')
      .replace(/シュノーケルポイント/g, 'ビーチ');
  }

  return message;
}

function adminCancelPolicy_() {
  return (
    '【キャンセルポリシー】\n' +
    '前日まで：無料\n' +
    '当日：100%\n\n' +
    'ご不明な点はお気軽にご連絡ください。\n' +
    '海亀兄弟'
  );
}

function adminIsTriple_(booking) {
  return booking.components.length >= 3 &&
    booking.components.some(function(row) {
      return row.plan.indexOf('まるごと1日セット') !== -1;
    });
}

function adminIsSeaSky_(booking) {
  return booking.components.some(function(row) {
    return row.plan.indexOf('海空セット') !== -1;
  });
}

function adminIsDayNight_(booking) {
  return booking.components.some(function(row) {
    return row.plan.indexOf('昼夜セット') !== -1;
  });
}

function adminIsDroneSupSingle_(planName) {
  var plan = String(planName || '');
  return plan.indexOf('ドローンSUP') !== -1 &&
    plan.indexOf('セット') === -1 &&
    plan.indexOf('ウミガメ') === -1;
}

function adminIsNightPlan_(planName) {
  var plan = String(planName || '');
  return plan.indexOf('ナイトツアー') !== -1 ||
    plan.indexOf('ヤシガニ') !== -1;
}

function adminFindComponent_(booking, keyword) {
  for (var i = 0; i < booking.components.length; i++) {
    if (booking.components[i].plan.indexOf(keyword) !== -1) {
      return booking.components[i];
    }
  }
  return null;
}

// ============================================================
// 操作履歴・共通処理
// ============================================================

function adminAppendAudit_(actor, booking, action, detail, rowNumbers) {
  var ss = adminGetSpreadsheet_();
  var sheet = ss.getSheetByName(ADMIN_AUDIT_SHEET_NAME);
  var headers = [
    '操作日時', '操作者', '予約番号', '名前', '参加日',
    '操作', '内容', '予約一覧行', 'アプリ版'
  ];

  if (!sheet) sheet = ss.insertSheet(ADMIN_AUDIT_SHEET_NAME);

  if (String(sheet.getRange(1, 1).getValue()) !== headers[0]) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, headers.length)
      .setFontWeight('bold')
      .setBackground('#d9ead3');
  }

  sheet.appendRow([
    new Date(),
    actor,
    booking.bookingNumber || '',
    booking.name || '',
    booking.date || '',
    action,
    detail,
    (rowNumbers || []).join(','),
    ADMIN_APP_VERSION
  ]);
}

function adminNormalizeDate_(value) {
  var text = String(value || '').trim();
  var match = text.match(/(\d{4})[\/\-.年](\d{1,2})[\/\-.月](\d{1,2})/);

  if (!match) return text;

  return match[1] + '-' + ('0' + match[2]).slice(-2) + '-' + ('0' + match[3]).slice(-2);
}

function adminNormalizeTime_(value) {
  var text = String(value || '').trim();
  var match = text.match(/(\d{1,2})\s*(?::|：|時)\s*(\d{1,2})/);

  if (!match) return text;

  return ('0' + match[1]).slice(-2) + ':' + ('0' + match[2]).slice(-2);
}

function adminToNumber_(value) {
  var normalized = String(value == null ? '' : value)
    .replace(/[¥,円\s]/g, '');
  var number = Number(normalized);

  return isNaN(number) ? 0 : number;
}

function adminFormatYen_(value) {
  return '¥' + adminToNumber_(value).toLocaleString('ja-JP');
}

function adminFormatCoupon_(code, discount) {
  var cleanCode = String(code || '').trim();
  var amount = adminToNumber_(discount);

  if (cleanCode && amount) return cleanCode + '（-' + adminFormatYen_(amount) + '）';
  if (cleanCode) return cleanCode;
  if (amount) return '割引のみ（-' + adminFormatYen_(amount) + '）';
  return 'なし';
}

function adminValueOrNone_(value) {
  var text = String(value == null ? '' : value).trim();
  return text || 'なし';
}

function adminUnique_(values) {
  var seen = {};
  return values.filter(function(value) {
    var key = String(value || '');
    if (!key || seen[key]) return false;
    seen[key] = true;
    return true;
  });
}

function adminUniqueSorted_(values) {
  return adminUnique_(values.filter(function(value) {
    return value && value !== '未設定' && value !== '複数';
  })).sort(function(a, b) {
    return String(a).localeCompare(String(b), 'ja');
  });
}

function adminHash_(text) {
  var bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    String(text || ''),
    Utilities.Charset.UTF_8
  );

  return Utilities.base64EncodeWebSafe(bytes).replace(/=+$/, '').slice(0, 24);
}

function adminToday_() {
  return Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy-MM-dd');
}

function adminAddDays_(dateText, days) {
  var parts = String(dateText).split('-');
  var date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  date.setDate(date.getDate() + Number(days || 0));
  return Utilities.formatDate(date, 'Asia/Tokyo', 'yyyy-MM-dd');
}

function adminFormatDateTime_(date) {
  return Utilities.formatDate(date, 'Asia/Tokyo', 'yyyy/MM/dd HH:mm:ss');
}
