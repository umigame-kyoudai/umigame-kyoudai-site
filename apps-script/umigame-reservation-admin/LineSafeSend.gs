// ============================================================
// LINE安全送信・送信履歴 拡張（管理版）
// ------------------------------------------------------------
// 管理元: apps-script/umigame-reservation-admin/LineSafeSend.gs
// 既存Code.gsの一番下に、このファイル全体を追加してください。
// 既存の予約受信・カレンダー・セット予約処理は変更しません。
//
// 変更後の操作:
// 1. M列（確定/満席）、N列（開催場所）、S列（自由文）を編集
// 2. まだLINEは送信されず、U列に「送信待ち」が表示される
// 3. 内容を確認し、同じ行のT列チェックボックスをオンにすると送信
// 4. 成否と本文は「LINE送信履歴」シートへ記録される
// ============================================================

var LINE_SAFE_CONFIRM_COLUMN = 20; // T: LINE送信確認
var LINE_SAFE_RESULT_COLUMN = 21;  // U: 送信予定・結果
var LINE_SAFE_LOG_SHEET_NAME = 'LINE送信履歴';
var LINE_SAFE_PENDING_PREFIX = 'LINE_SAFE_PENDING_';

var LINE_SAFE_LAST_SEND_OK = false;
var LINE_SAFE_SEND_CONTEXT = '';

function lineSafeGetProperties_() {
  try {
    var documentProperties = PropertiesService.getDocumentProperties();

    return documentProperties || PropertiesService.getScriptProperties();
  } catch (error) {
    return PropertiesService.getScriptProperties();
  }
}

function lineSafePendingKey_(sheet, row) {
  return (
    LINE_SAFE_PENDING_PREFIX +
    String(sheet.getSheetId()) +
    '_' +
    String(row)
  );
}

function lineSafeGetLogSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var logSheet = ss.getSheetByName(LINE_SAFE_LOG_SHEET_NAME);

  if (!logSheet) {
    logSheet = ss.insertSheet(LINE_SAFE_LOG_SHEET_NAME);
  }

  var headers = [
    '送信日時',
    '予約番号',
    '名前',
    '参加日',
    '時間',
    'プラン',
    '送信種別',
    'LINE User ID',
    'メッセージ',
    '結果',
    '予約一覧行'
  ];

  if (String(logSheet.getRange(1, 1).getValue()) !== headers[0]) {
    logSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }

  return logSheet;
}

function lineSafeSetup() {
  var sheet = getOrCreateSheet();

  sheet.getRange(1, LINE_SAFE_CONFIRM_COLUMN).setValue('LINE送信確認');
  sheet.getRange(1, LINE_SAFE_RESULT_COLUMN).setValue('送信予定・結果');

  sheet
    .getRange(1, LINE_SAFE_CONFIRM_COLUMN, 1, 2)
    .setFontWeight('bold')
    .setHorizontalAlignment('center')
    .setBackground('#fff2cc');

  var checkboxRule = SpreadsheetApp.newDataValidation()
    .requireCheckbox()
    .setAllowInvalid(false)
    .build();

  sheet
    .getRange(
      2,
      LINE_SAFE_CONFIRM_COLUMN,
      Math.max(sheet.getMaxRows() - 1, 1),
      1
    )
    .setDataValidation(checkboxRule)
    // チェックボックス設定時に空行へFALSEが入る環境でも、
    // getLastRow()による予約追加位置を変えないよう値だけ空に戻す。
    .clearContent();

  sheet.setColumnWidth(LINE_SAFE_CONFIRM_COLUMN, 130);
  sheet.setColumnWidth(LINE_SAFE_RESULT_COLUMN, 360);

  var logSheet = lineSafeGetLogSheet_();

  logSheet.setFrozenRows(1);
  logSheet
    .getRange(1, 1, 1, 11)
    .setFontWeight('bold')
    .setHorizontalAlignment('center')
    .setBackground('#d9ead3');

  logSheet.getRange('A:A').setNumberFormat('yyyy/mm/dd hh:mm:ss');
  logSheet.setColumnWidth(1, 150);
  logSheet.setColumnWidth(2, 150);
  logSheet.setColumnWidth(3, 120);
  logSheet.setColumnWidth(4, 100);
  logSheet.setColumnWidth(5, 80);
  logSheet.setColumnWidth(6, 260);
  logSheet.setColumnWidth(7, 150);
  logSheet.setColumnWidth(8, 240);
  logSheet.setColumnWidth(9, 500);
  logSheet.setColumnWidth(10, 80);
  logSheet.setColumnWidth(11, 90);
  logSheet.getRange('I:I').setWrap(true);

  SpreadsheetApp.getActiveSpreadsheet().toast(
    'LINE安全送信の準備が完了しました',
    '完了',
    4
  );
}

function lineSafeClearPending_(sheet, row) {
  lineSafeGetProperties_().deleteProperty(
    lineSafePendingKey_(sheet, row)
  );

  sheet
    .getRange(row, LINE_SAFE_CONFIRM_COLUMN)
    .setValue(false)
    .setBackground(null);

  sheet
    .getRange(row, LINE_SAFE_RESULT_COLUMN)
    .clearContent()
    .setBackground(null);
}

function lineSafeStage_(sheet, row, type, expectedValue, summary) {
  var lineUserId = sheet
    .getRange(row, COLUMNS.LINE_USER_ID)
    .getValue();

  if (!lineUserId) {
    lineSafeClearPending_(sheet, row);

    SpreadsheetApp.getActiveSpreadsheet().toast(
      'LINE User ID が未登録のため送信予約できません',
      '注意',
      4
    );
    return;
  }

  var pending = {
    type: String(type),
    expectedValue: String(expectedValue || ''),
    summary: String(summary || ''),
    createdAt: new Date().toISOString()
  };

  lineSafeGetProperties_().setProperty(
    lineSafePendingKey_(sheet, row),
    JSON.stringify(pending)
  );

  sheet
    .getRange(row, LINE_SAFE_CONFIRM_COLUMN)
    .setValue(false)
    .setBackground('#fff2cc');

  sheet
    .getRange(row, LINE_SAFE_RESULT_COLUMN)
    .setValue('送信待ち：' + pending.summary)
    .setBackground('#fff2cc');

  SpreadsheetApp.getActiveSpreadsheet().toast(
    'まだLINEは送信していません。内容を確認してT列をチェックしてください。',
    '送信待ち',
    5
  );
}

function lineSafeReadPending_(sheet, row) {
  var json = lineSafeGetProperties_().getProperty(
    lineSafePendingKey_(sheet, row)
  );

  if (!json) return null;

  try {
    return JSON.parse(json);
  } catch (error) {
    return null;
  }
}

function lineSafeAppendLog_(payload, row, ok) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sourceSheet = ss.getSheetByName(SHEET_NAME);
  var values = [];

  if (sourceSheet && row && row > 1) {
    values = sourceSheet
      .getRange(row, 1, 1, COLUMNS.LINE_SEND)
      .getDisplayValues()[0];
  }

  var logLock = LockService.getDocumentLock();
  var locked = false;

  try {
    locked = logLock.tryLock(5000);

    if (!locked) {
      throw new Error('送信履歴用のロックを取得できませんでした');
    }

    lineSafeGetLogSheet_().appendRow([
      new Date(),
      values[COLUMNS.BOOKING_NUM - 1] || '',
      values[COLUMNS.NAME - 1] || '',
      values[COLUMNS.DATE - 1] || '',
      values[COLUMNS.TIME - 1] || '',
      values[COLUMNS.PLAN - 1] || '',
      LINE_SAFE_SEND_CONTEXT || '自由メッセージ',
      String(payload && payload.lineUserId || ''),
      String(payload && payload.customMessage || ''),
      ok ? '成功' : '失敗',
      row || ''
    ]);

  } finally {
    if (locked) logLock.releaseLock();
  }
}

function lineSafeHandleConfirmEdit_(sheet, range, row) {
  var checked = range.getValue();

  if (checked !== true && String(checked).toUpperCase() !== 'TRUE') {
    return;
  }

  var pending = lineSafeReadPending_(sheet, row);

  if (!pending) {
    range.setValue(false);

    SpreadsheetApp.getActiveSpreadsheet().toast(
      'この行には送信待ちのLINEがありません',
      '確認',
      4
    );
    return;
  }

  var sourceColumn = 0;

  if (pending.type === 'STATUS') {
    sourceColumn = COLUMNS.BOOKING_STATUS;
  } else if (pending.type === 'LOCATION') {
    sourceColumn = COLUMNS.LOCATION;
  } else if (pending.type === 'FREE') {
    sourceColumn = COLUMNS.LINE_SEND;
  }

  if (!sourceColumn) {
    lineSafeClearPending_(sheet, row);
    return;
  }

  var currentValue = String(
    sheet.getRange(row, sourceColumn).getValue() || ''
  );

  if (currentValue !== String(pending.expectedValue || '')) {
    lineSafeClearPending_(sheet, row);

    SpreadsheetApp.getActiveSpreadsheet().toast(
      '送信待ちにした後で内容が変更されたため、送信を中止しました',
      '中止',
      5
    );
    return;
  }

  LINE_SAFE_LAST_SEND_OK = false;
  LINE_SAFE_SEND_CONTEXT = pending.summary;

  try {
    if (pending.type === 'STATUS') {
      LINE_SAFE_ORIGINAL_HANDLE_BOOKING_STATUS(
        sheet,
        sheet.getRange(row, COLUMNS.BOOKING_STATUS),
        row
      );

    } else if (pending.type === 'LOCATION') {
      LINE_SAFE_ORIGINAL_HANDLE_LOCATION_EDIT(
        sheet,
        sheet.getRange(row, COLUMNS.LOCATION),
        row
      );

    } else {
      LINE_SAFE_ORIGINAL_HANDLE_FREE_MESSAGE(
        sheet,
        sheet.getRange(row, COLUMNS.LINE_SEND),
        row
      );
    }

  } finally {
    LINE_SAFE_SEND_CONTEXT = '';
    range.setValue(false);
  }

  if (LINE_SAFE_LAST_SEND_OK) {
    lineSafeGetProperties_().deleteProperty(
      lineSafePendingKey_(sheet, row)
    );

    sheet
      .getRange(row, LINE_SAFE_CONFIRM_COLUMN)
      .setBackground('#d9ead3');

    sheet
      .getRange(row, LINE_SAFE_RESULT_COLUMN)
      .setValue(
        '✅ ' +
        new Date().toLocaleString('ja-JP') +
        ' 送信済：' +
        pending.summary
      )
      .setBackground('#d9ead3');

  } else {
    sheet
      .getRange(row, LINE_SAFE_CONFIRM_COLUMN)
      .setBackground('#f4cccc');

    sheet
      .getRange(row, LINE_SAFE_RESULT_COLUMN)
      .setValue(
        '⚠️ 送信されませんでした。送信済み判定またはエラー内容を確認してください：' +
        pending.summary
      )
      .setBackground('#f4cccc');
  }
}

// 現在有効な既存処理を保存してから、安全確認処理で包む。
// ファイル末尾に置くことで、C5/C6・ドローンSUP・二重送信ガードも保持する。
var LINE_SAFE_ORIGINAL_HANDLE_BOOKING_STATUS = handleBookingStatusEdit_;
var LINE_SAFE_ORIGINAL_HANDLE_LOCATION_EDIT = handleLocationEdit_;
var LINE_SAFE_ORIGINAL_HANDLE_FREE_MESSAGE = handleFreeLineMessageEdit_;
var LINE_SAFE_ORIGINAL_SEND_LINE_NOTIFY = sendLineNotify;
var LINE_SAFE_ORIGINAL_ON_SHEET_EDIT = onSheetEdit;
var LINE_SAFE_ORIGINAL_ON_OPEN = onOpen;

handleBookingStatusEdit_ = function(sheet, range, row) {
  var status = String(range.getValue() || '');

  if (status !== '確定' && status !== '満席') {
    lineSafeClearPending_(sheet, row);
    return;
  }

  lineSafeStage_(
    sheet,
    row,
    'STATUS',
    status,
    '予約ステータス「' + status + '」'
  );
};

handleLocationEdit_ = function(sheet, range, row) {
  var location = String(range.getValue() || '');

  if (!location) {
    lineSafeClearPending_(sheet, row);
    return;
  }

  lineSafeStage_(
    sheet,
    row,
    'LOCATION',
    location,
    '開催場所「' + location + '」'
  );
};

handleFreeLineMessageEdit_ = function(sheet, range, row) {
  var message = String(range.getValue() || '');

  if (!message || message.indexOf('✅ 送信済') === 0) return;

  lineSafeStage_(
    sheet,
    row,
    'FREE',
    message,
    '自由メッセージ「' +
      (message.length > 40 ? message.slice(0, 40) + '…' : message) +
      '」'
  );
};

sendLineNotify = function(payload, row) {
  var ok = LINE_SAFE_ORIGINAL_SEND_LINE_NOTIFY(payload, row);

  LINE_SAFE_LAST_SEND_OK = !!ok;

  try {
    lineSafeAppendLog_(payload, row, ok);
  } catch (logError) {
    Logger.log('LINE送信履歴の記録エラー: ' + logError.message);

    SpreadsheetApp.getActiveSpreadsheet().toast(
      (ok ? 'LINEは送信されましたが、' : 'LINE送信失敗に加えて、') +
        '履歴の記録にも失敗しました: ' + logError.message,
      '履歴エラー',
      5
    );
  }

  return ok;
};

onSheetEdit = function(e) {
  if (!e || !e.range) {
    Logger.log('onSheetEdit はシート編集トリガーから実行してください');
    return;
  }

  var range = e.range;
  var sheet = range.getSheet();

  if (
    sheet.getName() !== SHEET_NAME ||
    range.getColumn() !== LINE_SAFE_CONFIRM_COLUMN
  ) {
    return LINE_SAFE_ORIGINAL_ON_SHEET_EDIT(e);
  }

  if (range.getRow() <= 1) return;

  if (range.getNumRows() !== 1 || range.getNumColumns() !== 1) {
    SpreadsheetApp.getActiveSpreadsheet().toast(
      'LINE送信確認は1行ずつ操作してください',
      '注意',
      4
    );
    return;
  }

  var lock = LockService.getScriptLock();

  try {
    if (!lock.tryLock(3000)) {
      SpreadsheetApp.getActiveSpreadsheet().toast(
        '別の送信処理中です。少し待ってからもう一度お試しください。',
        '処理中',
        4
      );
      return;
    }

    lineSafeHandleConfirmEdit_(
      sheet,
      range,
      range.getRow()
    );

  } finally {
    lock.releaseLock();
  }
};

onOpen = function() {
  // 元のonOpenは「予約一覧を全消去する setupSheet」をメニューへ
  // 表示するため、通常運用では呼び出さない。
  // setupSheet関数そのものは復旧用として既存コード内に残す。
  SpreadsheetApp.getUi()
    .createMenu('🐢 海亀兄弟')
    .addItem('安全送信列と履歴を再設定', 'lineSafeSetup')
    .addToUi();
};
