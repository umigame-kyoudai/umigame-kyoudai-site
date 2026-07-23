const ANALYTICS_CONFIG = Object.freeze({
  timezone: 'Asia/Tokyo',
  spreadsheetProperty: 'ANALYTICS_SPREADSHEET_ID',
  secretProperty: 'ANALYTICS_SHARED_SECRET',
  spreadsheetName: '海亀兄弟 匿名分析レポート',
  dashboardSheet: 'ダッシュボード',
  dailySheet: '日別分析',
  eventsSheet: 'イベントデータ',
  definitionsSheet: '設定・定義',
});

const ANALYTICS_EVENTS = Object.freeze([
  'page_view',
  'page_engagement',
  'scroll_depth',
  'external_link_click',
  'language_change',
  'web_vital',
  'booking_started',
  'book_cta_click',
  'line_click',
  'line_add_friend_click',
  'phone_click',
  'booking_form_view',
  'line_login_click',
  'booking_submitted',
  'booking_failed',
]);

const EVENT_HEADERS = Object.freeze([
  '日時',
  'イベント',
  'ページ',
  '言語',
  'デバイス',
  '画面幅',
  '画面高',
  '参照元ホスト',
  '初回ページ',
  'UTM Source',
  'UTM Medium',
  'UTM Campaign',
  'UTM Content',
  'UTM Term',
  'ブラウザ',
  'OS',
  'スクリーン幅',
  'スクリーン高',
  '接続',
  'ロケーション',
  'プランID',
  'プラン名',
  '人数合計',
  '大人',
  '子ども',
  '3歳未満',
  '金額',
  '通貨',
  'LINEログイン',
  '結果',
  'エラー分類',
  '流入元',
  'リンク先ホスト',
  'リンク種別',
  'Web Vital',
  '値',
  '評価',
  '滞在秒',
  '最大スクロール率',
]);

const EVENT_DEFINITIONS = Object.freeze([
  ['page_view', 'ページ表示', 'ページ・言語・端末・匿名の流入情報'],
  ['page_engagement', 'ページ離脱時の利用状況', '滞在秒・最大スクロール率'],
  ['scroll_depth', 'スクロール到達', '最大スクロール率'],
  ['external_link_click', '外部リンククリック', 'リンク先ホスト・リンク種別'],
  ['language_change', '表示言語の変更', 'ページ・言語'],
  ['web_vital', '実ユーザー性能', '指標名・値・評価'],
  ['booking_form_view', '予約フォーム表示', 'ページ・言語'],
  ['booking_started', '予約入力開始', 'ページ・言語'],
  ['book_cta_click', '予約ボタンクリック', 'ロケーション'],
  ['line_login_click', 'LINEログイン操作', 'ロケーション'],
  ['line_click', 'LINE操作', 'ロケーション'],
  ['line_add_friend_click', 'LINE友だち追加', 'ロケーション'],
  ['phone_click', '電話リンク操作', 'ロケーション'],
  ['booking_submitted', '予約送信成功', 'プラン・人数内訳・金額・通貨・流入元'],
  ['booking_failed', '予約送信失敗', 'プラン・人数内訳・金額・失敗分類'],
]);

/**
 * 初回だけ手動実行します。匿名分析用スプレッドシートと集計画面を作成します。
 * @return {{spreadsheetId: string, spreadsheetUrl: string}}
 */
function setupAnalyticsWorkbook() {
  const properties = PropertiesService.getScriptProperties();
  let spreadsheet = openConfiguredSpreadsheet_(properties);

  if (!spreadsheet) {
    spreadsheet = SpreadsheetApp.create(ANALYTICS_CONFIG.spreadsheetName);
    properties.setProperty(
      ANALYTICS_CONFIG.spreadsheetProperty,
      spreadsheet.getId()
    );
  }

  spreadsheet.setSpreadsheetTimeZone(ANALYTICS_CONFIG.timezone);

  const dashboard = ensureSheet_(spreadsheet, ANALYTICS_CONFIG.dashboardSheet);
  const daily = ensureSheet_(spreadsheet, ANALYTICS_CONFIG.dailySheet);
  const events = ensureSheet_(spreadsheet, ANALYTICS_CONFIG.eventsSheet);
  const definitions = ensureSheet_(
    spreadsheet,
    ANALYTICS_CONFIG.definitionsSheet
  );

  configureEventsSheet_(events);
  configureDailySheet_(daily);
  configureDashboardSheet_(dashboard, daily);
  configureDefinitionsSheet_(definitions);
  removeUnusedDefaultSheets_(spreadsheet);

  spreadsheet.setActiveSheet(dashboard);
  SpreadsheetApp.flush();

  return {
    spreadsheetId: spreadsheet.getId(),
    spreadsheetUrl: spreadsheet.getUrl(),
  };
}

/**
 * VercelとApps Scriptで共有する秘密文字列を生成します。
 * 戻り値はVercelの ANALYTICS_SHEETS_SHARED_SECRET に登録してください。
 * @return {string}
 */
function generateAnalyticsSharedSecret() {
  const secret = [
    Utilities.getUuid().replace(/-/g, ''),
    Utilities.getUuid().replace(/-/g, ''),
  ].join('');
  PropertiesService.getScriptProperties().setProperty(
    ANALYTICS_CONFIG.secretProperty,
    secret
  );
  return secret;
}

/** @param {GoogleAppsScript.Events.DoPost} request */
function doPost(request) {
  try {
    const body = parseRequestBody_(request);
    const expectedSecret = PropertiesService.getScriptProperties().getProperty(
      ANALYTICS_CONFIG.secretProperty
    );

    if (!expectedSecret || body.secret !== expectedSecret) {
      return jsonResponse_({ ok: false, error: 'unauthorized' });
    }

    const event = normalizeEvent_(body.event);
    const spreadsheet = openRequiredSpreadsheet_();
    const sheet = ensureSheet_(spreadsheet, ANALYTICS_CONFIG.eventsSheet);
    if (sheet.getLastRow() === 0) {
      configureEventsSheet_(sheet);
    }

    const lock = LockService.getScriptLock();
    if (!lock.tryLock(10000)) {
      return jsonResponse_({ ok: false, error: 'busy' });
    }

    try {
      sheet.appendRow(eventToRow_(event));
    } finally {
      lock.releaseLock();
    }

    return jsonResponse_({ ok: true });
  } catch (error) {
    console.error(error);
    return jsonResponse_({ ok: false, error: 'invalid_request' });
  }
}

function doGet() {
  const configured = Boolean(
    PropertiesService.getScriptProperties().getProperty(
      ANALYTICS_CONFIG.spreadsheetProperty
    )
  );
  return jsonResponse_({ ok: true, configured: configured });
}

function openConfiguredSpreadsheet_(properties) {
  const spreadsheetId = properties.getProperty(
    ANALYTICS_CONFIG.spreadsheetProperty
  );
  if (!spreadsheetId) return null;

  try {
    return SpreadsheetApp.openById(spreadsheetId);
  } catch (error) {
    console.warn('Configured spreadsheet could not be opened.', error);
    return null;
  }
}

function openRequiredSpreadsheet_() {
  const spreadsheet = openConfiguredSpreadsheet_(
    PropertiesService.getScriptProperties()
  );
  if (!spreadsheet) {
    throw new Error('Analytics spreadsheet is not configured.');
  }
  return spreadsheet;
}

function ensureSheet_(spreadsheet, name) {
  return spreadsheet.getSheetByName(name) || spreadsheet.insertSheet(name);
}

function removeUnusedDefaultSheets_(spreadsheet) {
  spreadsheet.getSheets().forEach(function (sheet) {
    const isRequired = [
      ANALYTICS_CONFIG.dashboardSheet,
      ANALYTICS_CONFIG.dailySheet,
      ANALYTICS_CONFIG.eventsSheet,
      ANALYTICS_CONFIG.definitionsSheet,
    ].indexOf(sheet.getName()) !== -1;

    if (!isRequired && spreadsheet.getSheets().length > 4) {
      spreadsheet.deleteSheet(sheet);
    }
  });
}

function configureEventsSheet_(sheet) {
  const headerRange = sheet.getRange(1, 1, 1, EVENT_HEADERS.length);
  const currentHeaders = headerRange.getDisplayValues()[0];
  const headersMatch = EVENT_HEADERS.every(function (header, index) {
    return currentHeaders[index] === header;
  });

  if (!headersMatch) {
    headerRange.setValues([EVENT_HEADERS]);
  }

  headerRange
    .setBackground('#0f766e')
    .setFontColor('#ffffff')
    .setFontWeight('bold')
    .setHorizontalAlignment('center');
  sheet.setFrozenRows(1);

  if (!sheet.getFilter()) {
    sheet.getRange(1, 1, Math.max(sheet.getMaxRows(), 2), EVENT_HEADERS.length)
      .createFilter();
  }

  sheet.getRange('A:A').setNumberFormat('yyyy/mm/dd hh:mm:ss');
  sheet.getRange('F:G').setNumberFormat('0');
  sheet.getRange('Q:R').setNumberFormat('0');
  sheet.getRange('W:AA').setNumberFormat('#,##0');
  sheet.getRange('AJ:AM').setNumberFormat('0.00');
  sheet.setColumnWidth(1, 150);
  sheet.setColumnWidth(2, 165);
  sheet.setColumnWidth(3, 220);
  sheet.setColumnWidths(4, EVENT_HEADERS.length - 3, 115);
}

function configureDailySheet_(sheet) {
  sheet.clear();
  sheet.getRange('A1:G1').setValues([[
    '日付',
    'ページ表示',
    '予約開始',
    '予約完了',
    '予約失敗',
    '参加人数',
    '売上',
  ]]);
  sheet.getRange('A2').setFormula(
    '=QUERY({' +
      'ARRAYFORMULA(IF(\'イベントデータ\'!A2:A="","",TO_DATE(INT(\'イベントデータ\'!A2:A)))),' +
      'ARRAYFORMULA(N(\'イベントデータ\'!B2:B="page_view")),' +
      'ARRAYFORMULA(N(\'イベントデータ\'!B2:B="booking_started")),' +
      'ARRAYFORMULA(N(\'イベントデータ\'!B2:B="booking_submitted")),' +
      'ARRAYFORMULA(N(\'イベントデータ\'!B2:B="booking_failed")),' +
      'ARRAYFORMULA(IF(\'イベントデータ\'!B2:B="booking_submitted",\'イベントデータ\'!W2:W,0)),' +
      'ARRAYFORMULA(IF(\'イベントデータ\'!B2:B="booking_submitted",\'イベントデータ\'!AA2:AA,0))' +
    '},"select Col1,sum(Col2),sum(Col3),sum(Col4),sum(Col5),sum(Col6),sum(Col7) ' +
      'where Col1 is not null group by Col1 order by Col1 ' +
      'label Col1 \'日付\',sum(Col2) \'ページ表示\',sum(Col3) \'予約開始\',' +
      'sum(Col4) \'予約完了\',sum(Col5) \'予約失敗\',sum(Col6) \'参加人数\',' +
      'sum(Col7) \'売上\'",0)'
  );
  sheet.getRange('A1:G1')
    .setBackground('#0f766e')
    .setFontColor('#ffffff')
    .setFontWeight('bold');
  sheet.setFrozenRows(1);
  sheet.getRange('A:A').setNumberFormat('yyyy/mm/dd');
  sheet.getRange('B:F').setNumberFormat('#,##0');
  sheet.getRange('G:G').setNumberFormat('¥#,##0');
  sheet.setColumnWidth(1, 120);
  sheet.setColumnWidths(2, 6, 120);
}

function configureDashboardSheet_(sheet, dailySheet) {
  sheet.clear();
  sheet.getCharts().forEach(function (chart) {
    sheet.removeChart(chart);
  });
  sheet.setHiddenGridlines(true);
  sheet.setFrozenRows(2);
  sheet.setColumnWidths(1, 8, 120);
  sheet.getRange('A1:H1').merge()
    .setValue('海亀兄弟 匿名分析ダッシュボード')
    .setBackground('#064e3b')
    .setFontColor('#ffffff')
    .setFontSize(18)
    .setFontWeight('bold')
    .setHorizontalAlignment('left');
  sheet.getRange('A2:H2').merge()
    .setValue('直近30日｜氏名・メール・電話番号・住所・IP・Cookie・恒久IDは保存しません')
    .setBackground('#d1fae5')
    .setFontColor('#065f46');

  const metricLabels = [
    ['A3', 'ページ表示'],
    ['C3', '予約開始'],
    ['E3', '予約完了'],
    ['G3', '予約完了率'],
    ['A6', '売上'],
    ['C6', '参加人数'],
    ['E6', '予約失敗'],
    ['G6', '平均予約単価'],
  ];
  metricLabels.forEach(function (entry) {
    sheet.getRange(entry[0]).setValue(entry[1]);
  });

  sheet.getRange('A4').setFormula(
    '=COUNTIFS(\'イベントデータ\'!$A:$A,">="&TODAY()-29,\'イベントデータ\'!$B:$B,"page_view")'
  );
  sheet.getRange('C4').setFormula(
    '=COUNTIFS(\'イベントデータ\'!$A:$A,">="&TODAY()-29,\'イベントデータ\'!$B:$B,"booking_started")'
  );
  sheet.getRange('E4').setFormula(
    '=COUNTIFS(\'イベントデータ\'!$A:$A,">="&TODAY()-29,\'イベントデータ\'!$B:$B,"booking_submitted")'
  );
  sheet.getRange('G4').setFormula('=IFERROR(E4/C4,0)');
  sheet.getRange('A7').setFormula(
    '=SUMIFS(\'イベントデータ\'!$AA:$AA,\'イベントデータ\'!$A:$A,">="&TODAY()-29,\'イベントデータ\'!$B:$B,"booking_submitted")'
  );
  sheet.getRange('C7').setFormula(
    '=SUMIFS(\'イベントデータ\'!$W:$W,\'イベントデータ\'!$A:$A,">="&TODAY()-29,\'イベントデータ\'!$B:$B,"booking_submitted")'
  );
  sheet.getRange('E7').setFormula(
    '=COUNTIFS(\'イベントデータ\'!$A:$A,">="&TODAY()-29,\'イベントデータ\'!$B:$B,"booking_failed")'
  );
  sheet.getRange('G7').setFormula('=IFERROR(A7/E4,0)');

  ['A3:B4', 'C3:D4', 'E3:F4', 'G3:H4', 'A6:B7', 'C6:D7', 'E6:F7', 'G6:H7']
    .forEach(function (a1) {
      sheet.getRange(a1).setBackground('#f0fdfa').setBorder(
        true, true, true, true, false, false, '#99f6e4', SpreadsheetApp.BorderStyle.SOLID
      );
    });
  sheet.getRangeList(['A3', 'C3', 'E3', 'G3', 'A6', 'C6', 'E6', 'G6'])
    .setFontColor('#0f766e')
    .setFontWeight('bold');
  sheet.getRangeList(['A4', 'C4', 'E4', 'G4', 'A7', 'C7', 'E7', 'G7'])
    .setFontSize(18)
    .setFontWeight('bold');
  sheet.getRange('G4').setNumberFormat('0.0%');
  sheet.getRangeList(['A7', 'G7']).setNumberFormat('¥#,##0');
  sheet.getRangeList(['A4', 'C4', 'E4', 'C7', 'E7']).setNumberFormat('#,##0');

  sheet.getRange('A10:D10').setValues([['プラン', '予約件数', '参加人数', '売上']]);
  sheet.getRange('A11').setFormula(
    '=QUERY(\'イベントデータ\'!A:AM,"select V,count(B),sum(W),sum(AA) ' +
      'where A >= date \'"&TEXT(TODAY()-29,"yyyy-mm-dd")&"\' and B = \'booking_submitted\' ' +
      'and V is not null group by V order by sum(AA) desc ' +
      'label V \'プラン\',count(B) \'予約件数\',sum(W) \'参加人数\',sum(AA) \'売上\'",1)'
  );
  sheet.getRange('F10:H10').setValues([['流入元', '予約件数', '売上']]);
  sheet.getRange('F11').setFormula(
    '=QUERY(\'イベントデータ\'!A:AM,"select AF,count(B),sum(AA) ' +
      'where A >= date \'"&TEXT(TODAY()-29,"yyyy-mm-dd")&"\' and B = \'booking_submitted\' ' +
      'and AF is not null group by AF order by count(B) desc ' +
      'label AF \'流入元\',count(B) \'予約件数\',sum(AA) \'売上\'",1)'
  );
  sheet.getRangeList(['A10:D10', 'F10:H10'])
    .setBackground('#0f766e')
    .setFontColor('#ffffff')
    .setFontWeight('bold');
  sheet.getRange('D:D').setNumberFormat('¥#,##0');
  sheet.getRange('H:H').setNumberFormat('¥#,##0');

  const trendChart = sheet.newChart()
    .asLineChart()
    .addRange(dailySheet.getRange('A1:E1000'))
    .setPosition(20, 1, 0, 0)
    .setOption('title', '日別 予約ファネル')
    .setOption('legend', { position: 'bottom' })
    .setOption('colors', ['#0f766e', '#2563eb', '#16a34a', '#dc2626'])
    .setOption('height', 320)
    .setOption('width', 720)
    .build();
  sheet.insertChart(trendChart);
}

function configureDefinitionsSheet_(sheet) {
  sheet.clear();
  sheet.setHiddenGridlines(true);
  sheet.getRange('A1:C1').merge()
    .setValue('匿名分析の設定・定義')
    .setBackground('#064e3b')
    .setFontColor('#ffffff')
    .setFontSize(16)
    .setFontWeight('bold');
  sheet.getRange('A3:B7').setValues([
    ['保存しない情報', '氏名、メール、電話番号、住所、自由記述、IP、Cookie、ユーザーエージェント全文、恒久ID'],
    ['集計単位', '個人ではなく、ページ・日・プラン・流入元・端末などの匿名集計'],
    ['予約成功', 'booking_submitted（人数内訳、プラン、金額、通貨を含む）'],
    ['予約失敗', 'booking_failed（個人情報を含まない失敗分類を含む）'],
    ['重複防止', '送信中ロック、開始イベントの1回制御、ページ離脱イベントの1回制御'],
  ]);
  sheet.getRange('A3:A7').setBackground('#d1fae5').setFontWeight('bold');
  sheet.getRange('A10:C10').setValues([['イベント名', '意味', '主な匿名項目']]);
  sheet.getRange(11, 1, EVENT_DEFINITIONS.length, 3).setValues(EVENT_DEFINITIONS);
  sheet.getRange('A10:C10')
    .setBackground('#0f766e')
    .setFontColor('#ffffff')
    .setFontWeight('bold');
  sheet.setFrozenRows(1);
  sheet.setColumnWidth(1, 190);
  sheet.setColumnWidth(2, 240);
  sheet.setColumnWidth(3, 440);
  sheet.getRange('A:C').setWrap(true).setVerticalAlignment('top');
}

function parseRequestBody_(request) {
  if (!request || !request.postData || !request.postData.contents) {
    throw new Error('Missing request body.');
  }
  const body = JSON.parse(request.postData.contents);
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new Error('Invalid request body.');
  }
  return body;
}

function normalizeEvent_(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('Invalid event.');
  }

  const eventName = safeText_(input.event_name, 64);
  if (ANALYTICS_EVENTS.indexOf(eventName) === -1) {
    throw new Error('Unsupported event.');
  }

  return {
    occurred_at: parseOccurredAt_(input.occurred_at),
    event_name: eventName,
    page_path: safeText_(input.page_path, 300),
    locale: safeText_(input.locale, 20),
    device_type: safeText_(input.device_type, 30),
    viewport_width: safeNumber_(input.viewport_width),
    viewport_height: safeNumber_(input.viewport_height),
    referrer_host: safeText_(input.referrer_host, 180),
    landing_path: safeText_(input.landing_page, 300),
    utm_source: safeText_(input.utm_source, 120),
    utm_medium: safeText_(input.utm_medium, 120),
    utm_campaign: safeText_(input.utm_campaign, 180),
    utm_content: safeText_(input.utm_content, 180),
    utm_term: safeText_(input.utm_term, 180),
    browser: safeText_(input.browser, 50),
    os: safeText_(input.os, 50),
    screen_width: safeNumber_(input.screen_width),
    screen_height: safeNumber_(input.screen_height),
    connection: safeText_(input.connection_type, 30),
    properties: normalizeProperties_(input.properties),
  };
}

function normalizeProperties_(input) {
  const properties = input && typeof input === 'object' && !Array.isArray(input)
    ? input
    : {};
  return {
    location: safeText_(properties.location, 120),
    plan: safeText_(properties.plan, 120),
    planName: safeText_(properties.planName, 180),
    headcount: safeNumber_(properties.headcount),
    adultCount: safeNumber_(properties.adultCount),
    childCount: safeNumber_(properties.childCount),
    under3Count: safeNumber_(properties.under3Count),
    total: safeNumber_(properties.total),
    currency: safeText_(properties.currency, 12),
    line_logged_in: safeBoolean_(properties.line_logged_in),
    outcome: safeText_(properties.outcome, 30),
    errorCategory: safeText_(properties.errorCategory, 60),
    source: safeText_(properties.source, 100),
    linkHost: safeText_(properties.linkHost, 180),
    linkType: safeText_(properties.linkType, 60),
    vitalName: safeText_(properties.vitalName, 40),
    vitalValue: safeNumber_(properties.vitalValue),
    vitalRating: safeText_(properties.vitalRating, 30),
    engagedSeconds: safeNumber_(properties.engagedSeconds),
    maxScrollPercent: safeNumber_(properties.maxScrollPercent),
  };
}

function eventToRow_(event) {
  const properties = event.properties;
  return [
    event.occurred_at,
    event.event_name,
    event.page_path,
    event.locale,
    event.device_type,
    event.viewport_width,
    event.viewport_height,
    event.referrer_host,
    event.landing_path,
    event.utm_source,
    event.utm_medium,
    event.utm_campaign,
    event.utm_content,
    event.utm_term,
    event.browser,
    event.os,
    event.screen_width,
    event.screen_height,
    event.connection,
    properties.location,
    properties.plan,
    properties.planName,
    properties.headcount,
    properties.adultCount,
    properties.childCount,
    properties.under3Count,
    properties.total,
    properties.currency,
    properties.line_logged_in,
    properties.outcome,
    properties.errorCategory,
    properties.source,
    properties.linkHost,
    properties.linkType,
    properties.vitalName,
    properties.vitalValue,
    properties.vitalRating,
    properties.engagedSeconds,
    properties.maxScrollPercent,
  ];
}

function parseOccurredAt_(input) {
  const date = new Date(input);
  if (String(date) === 'Invalid Date') {
    return new Date();
  }
  return date;
}

function safeText_(input, maxLength) {
  if (typeof input !== 'string') return '';
  const value = input.replace(/[\u0000-\u001F\u007F]/g, '').trim().slice(0, maxLength);
  return /^[=+\-@]/.test(value) ? "'" + value : value;
}

function safeNumber_(input) {
  if (typeof input !== 'number' || !Number.isFinite(input)) return '';
  return input;
}

function safeBoolean_(input) {
  return typeof input === 'boolean' ? input : '';
}

function jsonResponse_(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
