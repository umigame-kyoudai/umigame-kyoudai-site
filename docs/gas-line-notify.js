/**
 * GAS（Google Apps Script）完全版
 *
 * カラム構成
 * A: 受付日時　B: 予約番号　C: 参加日　D: 時間　E: 名前
 * F: プラン　G: 合計金額　H: 電話　I: ステータス
 * J: 人数内訳　K: 参加者詳細　L: lineUserId
 * M: 予約ステータス（プルダウン：確定／満席）
 * N: 開催場所（プルダウン）
 * O: LINE名
 * P: スタッフ指名
 * Q: クーポンコード
 * R: クーポン割引額
 * S: LINE送信（ここにメッセージを入力すると送信される）
 */

// ============================================================
// 設定
// ============================================================
var NOTIFY_API_URL = 'https://www.umigamekyoudaimiyakojima.com/api/line/notify';
var NOTIFY_SECRET  = '';

var SHEET_NAME  = '予約一覧';
var CALENDAR_ID = 'genkidama2439@gmail.com';
var ADMIN_EMAIL = 'genkidama2439@gmail.com';

var COMBO_PLAN_NAME = 'ウミガメシュノーケル＆ヤシガニ探検 昼夜セット';
var PRIVATE_COMBO_PLAN_NAME = '【貸切】ウミガメシュノーケル＆ヤシガニ探検 昼夜セット';
var LEGACY_COMBO_PLAN_NAME = 'ウミガメ＆ジャングルナイト まるごと1日プラン';

var COLUMNS = {
  TIMESTAMP:       1,  // A
  BOOKING_NUM:     2,  // B
  DATE:            3,  // C
  TIME:            4,  // D
  NAME:            5,  // E
  PLAN:            6,  // F
  TOTAL_PRICE:     7,  // G
  PHONE:           8,  // H
  STATUS:          9,  // I
  HEADCOUNT:      10,  // J
  PARTICIPANTS:   11,  // K
  LINE_USER_ID:   12,  // L
  BOOKING_STATUS: 13,  // M
  LOCATION:       14,  // N
  LINE_NAME:      15,  // O
  STAFF:          16,  // P
  COUPON_CODE:    17,  // Q
  COUPON_DISCOUNT:18,  // R
  LINE_SEND:      19   // S
};

var HEADERS = [
  '受付日時', '予約番号', '参加日', '時間', '名前', 'プラン', '合計金額',
  '電話', 'ステータス', '人数内訳', '参加者詳細',
  'lineUserId', '予約ステータス', '開催場所', 'LINE名',
  'スタッフ指名', 'クーポンコード', 'クーポン割引額', 'LINE送信'
];

var LOCATION_OPTIONS = [
  '新城海岸',
  '東平安名ビーチ',
  'ワイワイビーチ',
  'シギラビーチ',
  'ナイトツアー（遺跡）',
  'ナイトツアー（インディアンマリンガーデン）'
];

// ============================================================
// ユーティリティ
// ============================================================

function formatDate(value) {
  if (value === null || typeof value === 'undefined' || value === '') return '';

  if (value instanceof Date) {
    var y  = value.getFullYear();
    var mo = value.getMonth() + 1;
    var d  = value.getDate();
    return y + '-' + ('0' + mo).slice(-2) + '-' + ('0' + d).slice(-2);
  }

  return String(value);
}

function formatTime(value) {
  if (value === null || typeof value === 'undefined' || value === '') return '';

  if (value instanceof Date) {
    var h = value.getHours();
    var m = value.getMinutes();
    return ('0' + h).slice(-2) + ':' + ('0' + m).slice(-2);
  }

  return String(value);
}

function isBlank(value) {
  return value === null || typeof value === 'undefined' || String(value).trim() === '';
}

function valueOrNone(value) {
  return isBlank(value) ? 'なし' : String(value).trim();
}

function formatYen(value) {
  if (isBlank(value)) return '¥0';
  if (typeof value === 'string' && value.indexOf('¥') !== -1) return value;

  var normalized = String(value).replace(/[¥,円\s]/g, '');
  var n = Number(normalized);

  if (isNaN(n)) return String(value);

  return '¥' + n.toLocaleString('ja-JP');
}

function formatCouponInfo(couponCode, couponDiscount) {
  var code = String(couponCode || '').trim();
  var normalized = String(couponDiscount || '').replace(/[¥,円\s]/g, '');
  var discount = Number(normalized);

  if (isNaN(discount)) discount = 0;

  if (code && discount) return code + '（-' + formatYen(discount) + '）';
  if (code) return code;
  if (discount) return '割引のみ（-' + formatYen(discount) + '）';

  return 'なし';
}

function isComboPlanName(planName) {
  var plan = String(planName || '');
  return plan.indexOf(COMBO_PLAN_NAME) !== -1 ||
         plan.indexOf(PRIVATE_COMBO_PLAN_NAME) !== -1 ||
         plan.indexOf(LEGACY_COMBO_PLAN_NAME) !== -1 ||
         plan.indexOf('ウミガメ＆ジャングルナイト') !== -1 ||
         plan.indexOf('まるごと1日プラン') !== -1 ||
         (
           plan.indexOf('ウミガメ') !== -1 &&
           plan.indexOf('ヤシガニ') !== -1 &&
           plan.indexOf('昼夜') !== -1
         );
}

// まるごと1日セット（C5/C6：朝シュノーケル + 昼ドローンSUP + 夜ナイトツアー）かどうか。
// プラン名「まるごと1日セット」、または [COMBO booking] にドローンSUPと夜(ヤシガニ/ナイト)の両方を含む。
// 3アクティビティのため、昼夜セット・海空セットより優先して振り分ける。
function isTripleComboBooking(data) {
  var plan = String(data && data.planName || '');
  var sr = String(data && data.specialRequests || '');
  if (plan.indexOf('まるごと1日セット') !== -1) return true;
  return sr.indexOf('[COMBO booking]') !== -1 &&
         sr.indexOf('ドローンSUP') !== -1 &&
         (sr.indexOf('ヤシガニ') !== -1 || sr.indexOf('ナイト') !== -1);
}

// 昼夜セット（C1/C2）かどうか。トリプル・海空セットは別処理のため除外。
// 主判定は specialRequests の [COMBO booking] マーカー。補助的に新旧プラン名も見る。
function isComboBooking(data) {
  if (isTripleComboBooking(data) || isSeaSkyComboBooking(data)) return false;
  return String(data && data.specialRequests || '').indexOf('[COMBO booking]') !== -1 ||
         isComboPlanName(data && data.planName);
}

// 海空セット（C3/C4：昼ウミガメ + 昼ドローンSUP、夜なし）かどうか。トリプルは除外。
function isSeaSkyComboBooking(data) {
  if (isTripleComboBooking(data)) return false;
  var plan = String(data && data.planName || '');
  var sr = String(data && data.specialRequests || '');
  return plan.indexOf('海空セット') !== -1 ||
         (sr.indexOf('[COMBO booking]') !== -1 && sr.indexOf('ドローンSUP') !== -1);
}

function extractComboNightTime(data) {
  var m = String(data && data.specialRequests || '').match(/(?:ナイト|ヤシガニ探検|夜)希望時間：\s*(\d{1,2}:\d{2})/);
  return m ? m[1] : '';
}

function getBookingDisplayTime(data) {
  var time = String(data && data.selectedTime || '');

  // トリプル(C5/C6)・昼夜セット(C1/C2)は「海亀 / 夜」併記。海空セット(C3/C4)は海亀のみ。
  if (isTripleComboBooking(data) || isComboBooking(data)) {
    var nightTime = extractComboNightTime(data);
    return nightTime ? time + ' / ' + nightTime : time;
  }

  return time;
}

function nightTimeFromCell(timeCellValue) {
  var s = String(timeCellValue || '');
  if (s.indexOf('/') !== -1) return s.split('/')[1].trim();
  return s.trim();
}

// 参加者区分の表示ラベル（フォームは adult/child/under3 の英語キーで送ってくる）
function categoryLabel(category) {
  var map = { adult: '大人', child: '子供', under3: '3歳未満' };
  var key = String(category || '');
  return map[key] || key;
}

// 参加者詳細を1人1行で整形（doPost・カレンダー登録で共通利用）
function buildParticipantsDetail(participants) {
  if (!participants || !Array.isArray(participants)) return '';

  return participants.map(function (p, i) {
    var parts = [(i + 1) + '.'];

    if (p.name) parts.push(p.name);
    if (p.age || p.age === 0) parts.push(p.age + '歳');
    if (p.height) parts.push(p.height + 'cm');
    if (p.weight) parts.push(p.weight + 'kg');
    if (p.footSize) parts.push('足' + p.footSize + 'cm');

    parts.push('(' + categoryLabel(p.category) + ')');

    return parts.join(' ');
  }).join('\n');
}

// ============================================================
// 確定メッセージ
// ============================================================

function getConfirmMessage(planName, customerName, bookingNumber, selectedDate, selectedTime, details) {
  details = details || {};

  var plan = String(planName || '');
  // まるごと1日セット（C5/C6）判定：プラン名で判定。昼夜・海空より先に振り分ける。
  var isTriple = plan.indexOf('まるごと1日セット') !== -1 ||
    (plan.indexOf('ドローンSUP') !== -1 && plan.indexOf('ナイトツアー') !== -1);
  // 昼夜セット判定：D列の時間が「海亀 / 夜」併記（"/"を含む）か、新旧プラン名に一致
  var isCombo = !isTriple && (isComboPlanName(plan) || String(selectedTime || '').indexOf('/') !== -1);
  // 海空セット（C3）判定：プラン名で判定（getConfirmMessage は specialRequests を受け取らない）
  var isSeaSky = !isTriple &&
    (plan.indexOf('海空セット') !== -1 ||
     (plan.indexOf('ドローンSUP') !== -1 && plan.indexOf('ウミガメ') !== -1));

  var opening =
    '以下の内容でご予約を確定いたしました。\n' +
    '内容にお間違いがないかご確認ください。\n\n';

  var detailBlock =
    '【ご予約内容】\n' +
    '予約番号：' + bookingNumber + '\n' +
    'プラン：' + planName + '\n' +
    '日時：' + selectedDate + ' ' + selectedTime + '\n' +
    '人数：' + valueOrNone(details.headcount) + '\n' +
    '合計金額：' + formatYen(details.totalPrice) + '\n\n' +
    '【お客様情報】\n' +
    '電話番号：' + valueOrNone(details.phone) + '\n' +
    'LINE名：' + valueOrNone(details.lineName) + '\n' +
    'スタッフ指名：' + valueOrNone(details.staffName || '指名なし') + '\n' +
    'クーポン：' + formatCouponInfo(details.couponCode, details.couponDiscount) + '\n\n' +
    '【参加者詳細】\n' +
    valueOrNone(details.participantsDetail);

  var snorkelMessage =
    '🐢 ご予約が確定しました！\n\n' +
    customerName + ' 様\n\n' +
    opening +
    detailBlock + '\n\n' +
    '【当日の持ち物】\n' +
    '・水着（着替えは現地でできます）\n' +
    '・タオル\n' +
    '・酔い止め（必要な方）\n\n' +
    '【集合場所について】\n' +
    '開催場所は新城海岸・シギラビーチ・\n' +
    '東平安名ビーチ・ワイワイビーチの\n' +
    'いずれかになります。\n' +
    '海況や風向きを考慮した上で、\n' +
    '前日にLINEにてご連絡いたします。\n\n' +
    '【キャンセルポリシー】\n' +
    '前日まで：無料\n' +
    '当日：100%\n\n' +
    'ご不明な点はお気軽にご連絡ください。\n' +
    '海亀兄弟';

  var nightMessage =
    '🦀 ご予約が確定しました！\n\n' +
    customerName + ' 様\n\n' +
    opening +
    detailBlock + '\n\n' +
    '【当日持ってくると便利なもの】\n' +
    '・虫よけスプレー\n' +
    '・靴（サンダル不可・推奨）\n' +
    '・長ズボン（虫刺されが気になる方）\n\n' +
    '【集合場所について】\n' +
    '当日にLINEにてご連絡いたします。\n\n' +
    '【ご注意】\n' +
    '足腰が悪い方・体が不自由な方は\n' +
    '事前に一度ご相談ください。\n\n' +
    '【キャンセルポリシー】\n' +
    '前日まで：無料\n' +
    '当日：100%\n\n' +
    'ご不明な点はお気軽にご連絡ください。\n' +
    '海亀兄弟';

  var supMessage =
    '🌅 ご予約が確定しました！\n\n' +
    customerName + ' 様\n\n' +
    opening +
    detailBlock + '\n\n' +
    '【当日の持ち物】\n' +
    '・水着（水着を着て集合していただけると助かります）\n' +
    '・タオル\n' +
    '・酔い止め（必要な方）\n\n' +
    '【集合場所について】\n' +
    '前日にLINEにてご連絡いたします。\n\n' +
    '【キャンセルポリシー】\n' +
    '前日まで：無料\n' +
    '当日：100%\n\n' +
    'ご不明な点はお気軽にご連絡ください。\n' +
    '海亀兄弟';

  var comboMessage = (function () {
    var turtleTime = String(selectedTime || '').split('/')[0].trim();
    var nightTime  = nightTimeFromCell(selectedTime);

    return '🐢🦀 ご予約が確定しました！\n\n' +
      customerName + ' 様\n\n' +
      opening +
      detailBlock + '\n\n' +
      '【プラン内容】\n' +
      'ウミガメシュノーケル＋ヤシガニ探検の昼夜セットです。\n\n' +
      '🐢 ウミガメシュノーケル：' + valueOrNone(turtleTime) + '\n' +
      '🦀 ヤシガニ探検：' + valueOrNone(nightTime) + '\n\n' +
      '【集合場所のご案内】\n' +
      '・ウミガメシュノーケル：前日にLINEでご連絡します\n' +
      '・ヤシガニ探検：当日にLINEでご連絡します\n\n' +
      '【当日の持ち物】\n' +
      '〔昼・ウミガメ〕水着・タオル・酔い止め（必要な方）\n' +
      '〔夜・ヤシガニ探検〕虫よけスプレー・歩きやすい靴（サンダル不可）・飲み物\n\n' +
      '【キャンセルポリシー】\n' +
      '前日まで：無料\n' +
      '当日：100%\n\n' +
      'ご不明な点はお気軽にご連絡ください。\n' +
      '海亀兄弟';
  })();

  var seaSkyComboMessage = (function () {
    var turtleTime = String(selectedTime || '').split('/')[0].trim();

    return '🐢🛸 ご予約が確定しました！\n\n' +
      customerName + ' 様\n\n' +
      opening +
      detailBlock + '\n\n' +
      '【プラン内容】\n' +
      'ウミガメシュノーケル＋ドローンSUPの海空セットです。\n\n' +
      '🐢 ウミガメシュノーケル：' + valueOrNone(turtleTime) + '\n' +
      '🛸 ドローンSUP：当日の海況・水位により調整し、予約確定時にLINEでご案内します\n\n' +
      '【集合場所のご案内】\n' +
      '・ウミガメシュノーケル：前日にLINEでご連絡します\n' +
      '・ドローンSUP：予約確定時にLINEでご連絡します\n\n' +
      '【当日の持ち物】\n' +
      '水着（着替えは現地でできます）・タオル・酔い止め（必要な方）\n\n' +
      '【キャンセルポリシー】\n' +
      '前日まで：無料\n' +
      '当日：100%\n\n' +
      'ご不明な点はお気軽にご連絡ください。\n' +
      '海亀兄弟';
  })();

  var tripleComboMessage = (function () {
    var turtleTime = String(selectedTime || '').split('/')[0].trim();
    var nightT = nightTimeFromCell(selectedTime);

    return '🐢🛸🦀 ご予約が確定しました！\n\n' +
      customerName + ' 様\n\n' +
      opening +
      detailBlock + '\n\n' +
      '【プラン内容】\n' +
      'ウミガメシュノーケル＋ドローンSUP＋ナイトツアーのまるごと1日セットです。\n\n' +
      '🐢 ウミガメシュノーケル：' + valueOrNone(turtleTime) + '\n' +
      '🛸 ドローンSUP：当日の海況・水位により調整し、予約確定時にLINEでご案内します\n' +
      '🦀 ナイトツアー：' + valueOrNone(nightT) + '\n\n' +
      '【集合場所のご案内】\n' +
      '・ウミガメシュノーケル／ドローンSUP：前日にLINEでご連絡します\n' +
      '・ナイトツアー：当日にLINEでご連絡します\n\n' +
      '【当日の持ち物】\n' +
      '〔昼〕水着・タオル・酔い止め（必要な方）\n' +
      '〔夜〕虫よけスプレー・歩きやすい靴（サンダル不可）・飲み物\n\n' +
      '【キャンセルポリシー】\n' +
      '前日まで：無料\n' +
      '当日：100%\n\n' +
      'ご不明な点はお気軽にご連絡ください。\n' +
      '海亀兄弟';
  })();

  if (isTriple) return tripleComboMessage;
  if (isCombo) return comboMessage;
  // 海空セット(C3)は名前に「SUP」を含むため、汎用SUP判定より前に分岐する
  if (isSeaSky) return seaSkyComboMessage;
  if (plan.indexOf('ナイトツアー') !== -1 || plan.indexOf('ヤシガニ探検') !== -1) return nightMessage;
  if (plan.indexOf('SUP') !== -1) return supMessage;

  return snorkelMessage;
}

function getFullMessage(customerName, bookingNumber, planName, selectedDate, selectedTime) {
  return (
    'この度はご予約いただき、\n' +
    '誠にありがとうございます。\n\n' +
    customerName + ' 様\n\n' +
    '予約番号：' + bookingNumber + '\n' +
    'プラン：' + planName + '\n' +
    '日時：' + selectedDate + ' ' + selectedTime + '\n\n' +
    '大変申し訳ございませんが、\n' +
    'ご希望の日程はすでに満席となっており、\n' +
    'ご予約をお受けすることができない状況です。\n\n' +
    'またの機会にぜひご利用いただけますと\n' +
    '幸いです。\n\n' +
    '海亀兄弟'
  );
}

// ============================================================
// 開催場所ごとの案内メッセージ
// ============================================================

function getLocationMessage(location, selectedTime) {
  var nightTimeStr = nightTimeFromCell(selectedTime);

  var snorkelFooter =
    '\n\n【到着推奨時間・駐車場について】\n' +
    '5〜10月：開始30〜40分前\n' +
    '11〜4月：開始15分前\n\n' +
    '宮古島のシュノーケルポイントは大変人気のため、駐車場が混雑する場合がございます。\n' +
    'お早めにお越しいただき、駐車場の確保をお願いいたします。\n\n' +
    '開始15分前〜開始時間の間に現地スタッフよりお電話いたします。\n' +
    '現地にてお待ちください。\n\n' +
    '恐れ入りますが、本メッセージをご確認いただけましたら、ご返信いただけますと幸いです。\n' +
    '事務担当　中村 凪';

  var nightFooter =
    '\n\n恐れ入りますが、本メッセージをご確認いただけましたら、ご返信いただけますと幸いです。\n' +
    '事務担当　中村 凪';

  var nightCommon =
    '【持ち物・服装】\n' +
    '特に持ち物はありませんが、2時間ほど歩きますので水分の持参をおすすめします。\n' +
    '動きやすい格好・長袖長ズボン・靴（完全舗装ではないためサンダル不可）でお越しください。\n' +
    '🚻 トイレがありませんので、事前に済ませてからお越しください。\n\n';

  var higashihennaMessage =
    '明日のツアー開催場所のご案内です。\n' +
    '明日は東平安名ビーチにて開催いたします。\n\n' +
    'ウミガメ遭遇率：80%\n' +
    'サンゴ・熱帯魚：観察できます\n' +
    '🅿️ 駐車場：無料\n' +
    '🚻 トイレ：なし／🚿 シャワー：なし\n' +
    '※トイレ・シャワーがありませんので事前にお済ませください。\n\n' +
    '📍 https://maps.google.com/?cid=13840352828513930953\n\n' +
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
      '📍 https://maps.google.com/?cid=4444603144121769337' +
      snorkelFooter,

    '東平安名ビーチ':
      higashihennaMessage,

    'ボラビーチ':
      higashihennaMessage,

    'ワイワイビーチ':
      '明日のツアー開催場所のご案内です。\n' +
      '明日はワイワイビーチにて開催いたします。\n\n' +
      'ウミガメ遭遇率：80%\n' +
      'サンゴ・熱帯魚：観察できます\n' +
      '🅿️ 駐車場：無料\n' +
      '🚻 トイレ：なし／🚿 シャワー：なし\n' +
      '※トイレ・シャワーがありませんので事前にお済ませください。\n' +
      '📍 https://maps.app.goo.gl/omdcJdCtih5aS9Vc9' +
      snorkelFooter,

    'シギラビーチ':
      '明日のツアー開催場所のご案内です。\n' +
      '明日はシギラビーチにて開催いたします。\n\n' +
      'ウミガメ遭遇率：80%\n' +
      'サンゴ・熱帯魚：観察できます\n' +
      '🅿️ 駐車場：1,000円\n' +
      '🚻 トイレ：あり／🚿 シャワー：なし\n' +
      'なお、シギラビーチは複数の業者が集中するビーチのため、大変残念ではございますがウミガメとの写真撮影はお約束できない状況となっております。あらかじめご了承いただけますと幸いです。\n' +
      '📍 https://maps.app.goo.gl/RTwT8jv1U9GJrwLJ7?g_st=ic' +
      snorkelFooter,

    'ナイトツアー（遺跡）':
      '本日のナイトツアー集合場所のご案内です。\n' +
      '本日の集合場所はこちらになります。\n\n' +
      nightCommon +
      '📍 集合場所：https://maps.app.goo.gl/ugnwv2zcUReYTsuR6\n' +
      '上比屋山遺跡と記された石碑がありますので、その道路沿いにお車をお停めください。\n\n' +
      '本日 ' + (nightTimeStr || '集合時間') + ' にお待ちしております。' +
      nightFooter,

    'ナイトツアー（インディアンマリンガーデン）':
      '本日のナイトツアー集合場所のご案内です。\n' +
      '本日の集合場所はこちらになります。\n\n' +
      nightCommon +
      '📍 集合場所（第一駐車場）：https://maps.app.goo.gl/jyKBqL2WtUkP8MSJA?g_st=ic\n' +
      '第一駐車場にてお待ちください。\n\n' +
      '集合時間になりましたら現地スタッフよりお電話いたします。\n' +
      'そのままお待ちいただけますと幸いです。' +
      nightFooter
  };

  return messages[location] || null;
}

// ============================================================
// シート取得・作成
// ============================================================

function getOrCreateSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }

  return sheet;
}

// ============================================================
// シート初期化
// 注意：予約一覧の中身を消します
// ============================================================

function setupSheet() {
  var ui = SpreadsheetApp.getUi();
  var result = ui.alert(
    '確認',
    '予約一覧シートの内容・書式・プルダウンを初期化します。\n本当に実行しますか？',
    ui.ButtonSet.YES_NO
  );

  if (result !== ui.Button.YES) {
    SpreadsheetApp.getActiveSpreadsheet().toast('初期化をキャンセルしました', 'キャンセル', 3);
    return;
  }

  var sheet = getOrCreateSheet();
  var maxRows = sheet.getMaxRows();
  var maxCols = sheet.getMaxColumns();

  var allRange = sheet.getRange(1, 1, maxRows, maxCols);
  allRange.clearContent();
  allRange.clearFormat();
  allRange.clearDataValidations();

  sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);

  var headerRange = sheet.getRange(1, 1, 1, HEADERS.length);
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#d9ead3');
  headerRange.setHorizontalAlignment('center');

  sheet.setFrozenRows(1);

  sheet.setColumnWidth(COLUMNS.TIMESTAMP,       150);
  sheet.setColumnWidth(COLUMNS.BOOKING_NUM,     130);
  sheet.setColumnWidth(COLUMNS.DATE,            110);
  sheet.setColumnWidth(COLUMNS.TIME,            120);
  sheet.setColumnWidth(COLUMNS.NAME,            120);
  sheet.setColumnWidth(COLUMNS.PLAN,            220);
  sheet.setColumnWidth(COLUMNS.TOTAL_PRICE,     100);
  sheet.setColumnWidth(COLUMNS.PHONE,           120);
  sheet.setColumnWidth(COLUMNS.STATUS,          90);
  sheet.setColumnWidth(COLUMNS.HEADCOUNT,       130);
  sheet.setColumnWidth(COLUMNS.PARTICIPANTS,    300);
  sheet.setColumnWidth(COLUMNS.LINE_USER_ID,    220);
  sheet.setColumnWidth(COLUMNS.BOOKING_STATUS,  140);
  sheet.setColumnWidth(COLUMNS.LOCATION,        260);
  sheet.setColumnWidth(COLUMNS.LINE_NAME,       150);
  sheet.setColumnWidth(COLUMNS.STAFF,           120);
  sheet.setColumnWidth(COLUMNS.COUPON_CODE,     140);
  sheet.setColumnWidth(COLUMNS.COUPON_DISCOUNT, 120);
  sheet.setColumnWidth(COLUMNS.LINE_SEND,       300);

  sheet.getRange(1, COLUMNS.LINE_SEND).setBackground('#fff2cc');

  var statusRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['確定', '満席'], true)
    .setAllowInvalid(false)
    .build();

  sheet.getRange(2, COLUMNS.BOOKING_STATUS, 1000, 1).setDataValidation(statusRule);

  var locationRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(LOCATION_OPTIONS, true)
    .setAllowInvalid(false)
    .build();

  sheet.getRange(2, COLUMNS.LOCATION, 1000, 1).setDataValidation(locationRule);

  SpreadsheetApp.getActiveSpreadsheet().toast('シートの準備が完了しました', '完了', 3);
}

// ============================================================
// 管理者宛メール送信
// ============================================================

function sendBookingEmail(data, headcount, participantsDetail) {
  try {
    var displayTime = getBookingDisplayTime(data);
    var subject =
      '【仮予約通知】' + (data.customerName || '') +
      ' 様 / ' + (data.selectedDate || '') +
      ' ' + displayTime;

    var couponInfo = formatCouponInfo(data.couponCode, data.couponDiscount);
    var staffInfo = data.staffName || '指名なし';

    var body =
      '新しい仮予約が入りました。\n\n' +
      '━━━━━━━━━━━━━━━━━━━━\n' +
      '予約番号：' + (data.bookingNumber || '') + '\n' +
      '受付日時：' + new Date().toLocaleString('ja-JP') + '\n' +
      '━━━━━━━━━━━━━━━━━━━━\n\n' +
      '【お客様情報】\n' +
      '名前　　：' + (data.customerName || '') + '\n' +
      '電話　　：' + (data.customerPhone || '') + '\n' +
      'LINE名　：' + (data.lineDisplayName || '') + '\n\n' +
      '【予約内容】\n' +
      'プラン　　：' + (data.planName || '') + '\n' +
      '参加日　　：' + (data.selectedDate || '') + '\n' +
      '時間　　　：' + displayTime + '\n' +
      '人数　　　：' + headcount + '\n' +
      '合計金額　：' + formatYen(data.totalPrice) + '\n' +
      'クーポン　：' + couponInfo + '\n' +
      'スタッフ指名：' + staffInfo + '\n\n' +
      '【参加者詳細】\n' +
      participantsDetail + '\n\n' +
      '【特別なご要望・アレルギー等】\n' +
      (data.specialRequests || 'なし') + '\n\n' +
      '━━━━━━━━━━━━━━━━━━━━\n' +
      'スプレッドシートのM列を「確定」または「満席」にするとお客様にLINE通知が送信されます。\n' +
      '━━━━━━━━━━━━━━━━━━━━';

    GmailApp.sendEmail(ADMIN_EMAIL, subject, body);
    Logger.log('仮予約メール送信完了: ' + subject);

  } catch (mailError) {
    Logger.log('仮予約メール送信エラー: ' + mailError.message);
  }
}

// ============================================================
// 予約データ受信 Next.js → GAS
// ============================================================

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var sheet = getOrCreateSheet();

    var headcount =
      '大人' + (data.adultCount || 0) + '名 / ' +
      '子供' + (data.childCount || 0) + '名 / ' +
      '3歳未満' + (data.under3Count || 0) + '名';

    var participantsDetail = buildParticipantsDetail(data.participants);

    var timeCell = getBookingDisplayTime(data);

    var newRow = [
      new Date(),
      data.bookingNumber || '',
      data.selectedDate || '',
      timeCell,
      data.customerName || '',
      data.planName || '',
      data.totalPrice || 0,
      data.customerPhone || '',
      '受信済み',
      headcount,
      participantsDetail,
      data.lineUserId || '',
      '',
      '',
      data.lineDisplayName || '',
      data.staffName || '指名なし',
      data.couponCode || '',
      data.couponDiscount || '',
      ''
    ];

    sheet.appendRow(newRow);

    try {
      addToCalendar(data, headcount);
    } catch (calError) {
      Logger.log('カレンダー登録エラー: ' + calError.message);
    }

    sendBookingEmail(data, headcount, participantsDetail);

    return ContentService.createTextOutput(
      JSON.stringify({
        success: true,
        bookingNumber: data.bookingNumber
      })
    ).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    Logger.log('doPost エラー: ' + error.message);

    return ContentService.createTextOutput(
      JSON.stringify({
        success: false,
        error: error.message
      })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

// ============================================================
// Googleカレンダー登録
// ============================================================

function addToCalendar(data, headcount) {
  var calendar = CalendarApp.getCalendarById(CALENDAR_ID);

  if (!calendar) {
    Logger.log('カレンダーが見つかりません: ' + CALENDAR_ID);
    return;
  }

  var dateStr = data.selectedDate || '';
  var dateParts = dateStr.split('-');

  if (dateParts.length !== 3) return;

  var year  = parseInt(dateParts[0], 10);
  var month = parseInt(dateParts[1], 10) - 1;
  var day   = parseInt(dateParts[2], 10);

  var timeStr = data.selectedTime || '';
  var timeParts = timeStr.match(/^(\d{1,2}):(\d{2})/);

  var planName = data.planName || '';

  var participantsDetail = buildParticipantsDetail(data.participants);

  var couponInfo = formatCouponInfo(data.couponCode, data.couponDiscount);
  var staffInfo = data.staffName || '指名なし';

  var combo = isComboBooking(data);
  var seaSky = isSeaSkyComboBooking(data);
  var triple = isTripleComboBooking(data);
  var comboNightTime = (combo || triple) ? extractComboNightTime(data) : '';
  var displayTime = getBookingDisplayTime(data);

  var emoji  = '🐢';
  var prefix = 'WEB';
  var color  = '2';

  if (combo) {
    emoji  = '🐢🦀';
    prefix = 'WEB';
    color  = '2';
  } else if (planName.indexOf('ナイトツアー') !== -1 || planName.indexOf('ヤシガニ探検') !== -1) {
    emoji  = '🦀';
    prefix = 'WEB';
    color  = '8';
  } else if (planName.indexOf('SUP') !== -1) {
    emoji  = '🏄';
    prefix = 'WEB';
    color  = '6';
  } else if (planName.indexOf('VIP') !== -1 || planName.indexOf('貸切') !== -1) {
    emoji  = '🐢';
    prefix = 'WEB VIP';
    color  = '2';
  }

  var title =
    prefix + ' ' + emoji + ' ' +
    planName + ' / ' +
    (data.customerName || '名前なし') + ' / ' +
    headcount;

  var description =
    '予約番号: ' + (data.bookingNumber || '') +
    '\n受付日時: ' + new Date().toLocaleString('ja-JP') +
    '\n\n【お客様情報】' +
    '\n名前: ' + (data.customerName || '') +
    '\nLINE名: ' + (data.lineDisplayName || '') +
    '\n電話: ' + (data.customerPhone || '') +
    '\n\n【予約内容】' +
    '\nプラン: ' + planName +
    '\n参加日: ' + (data.selectedDate || '') +
    '\n時間: ' + displayTime +
    '\n人数: ' + (headcount || '') +
    '\n合計: ' + formatYen(data.totalPrice) +
    '\nクーポン: ' + couponInfo +
    '\nスタッフ指名: ' + staffInfo +
    '\n\n【参加者詳細】\n' +
    (participantsDetail || 'なし') +
    '\n\n【特別なご要望・アレルギー等】\n' +
    (data.specialRequests || 'なし');

  if (!timeParts) {
    var allDayEvent = calendar.createAllDayEvent(title, new Date(year, month, day), {
      description: description,
      location: '宮古島'
    });

    allDayEvent.setColor(color);
    Logger.log('カレンダー登録完了: ' + title);
    return;
  }

  var startHour = parseInt(timeParts[1], 10);
  var startMin  = parseInt(timeParts[2], 10);

  // まるごと1日セット(C5/C6)：朝ウミガメ(時刻) + 昼ドローンSUP(時刻未定・終日) + 夜ナイト(時刻)。
  // カレンダーは3件（ウミガメ・ドローンSUP・ナイト）に分けて登録する。
  if (triple) {
    var tpName = data.customerName || '名前なし';
    var tpLabel = String(data.planName || '').indexOf('貸切') !== -1
      ? '貸切まるごと1日セット'
      : 'まるごと1日セット';

    var tpTurtleTitle =
      'WEB 🐢 ' + tpLabel + '（ウミガメ）/ ' + tpName + ' / ' + headcount;
    var tpTStart = new Date(year, month, day, startHour, startMin);
    var tpTEnd   = new Date(year, month, day, startHour + 1, startMin + 30);
    var tpTurtleEvent = calendar.createEvent(tpTurtleTitle, tpTStart, tpTEnd, {
      description: description,
      location: '宮古島'
    });
    tpTurtleEvent.setColor('2');
    Logger.log('カレンダー登録完了（海亀）: ' + tpTurtleTitle);

    var tpSupTitle =
      'WEB 🛸 ' + tpLabel + '（ドローンSUP・時間調整中）/ ' + tpName + ' / ' + headcount;
    var tpSupEvent = calendar.createAllDayEvent(tpSupTitle, new Date(year, month, day), {
      description: description,
      location: '宮古島'
    });
    tpSupEvent.setColor('6');
    Logger.log('カレンダー登録完了（ドローンSUP・終日）: ' + tpSupTitle);

    var tpNightParts = String(comboNightTime || '').match(/^(\d{1,2}):(\d{2})/);
    if (tpNightParts) {
      var tpNH = parseInt(tpNightParts[1], 10);
      var tpNM = parseInt(tpNightParts[2], 10);
      var tpNightTitle =
        'WEB 🦀 ' + tpLabel + '（ナイトツアー）/ ' + tpName + ' / ' + headcount;
      var tpNStart = new Date(year, month, day, tpNH, tpNM);
      var tpNEnd   = new Date(year, month, day, tpNH + 1, tpNM + 30);
      var tpNightEvent = calendar.createEvent(tpNightTitle, tpNStart, tpNEnd, {
        description: description,
        location: '宮古島'
      });
      tpNightEvent.setColor('8');
      Logger.log('カレンダー登録完了（ナイト）: ' + tpNightTitle);
    } else {
      Logger.log('まるごと1日セットですが、ナイト時間を取得できませんでした。');
    }

    return;
  }

  // 海空セット(C3=通常 / C4=貸切)：昼ウミガメ(時刻あり) + 昼ドローンSUP(時刻未定)。
  // ウミガメは時間指定イベント、ドローンSUPは時間調整中の終日イベントで登録する。
  if (seaSky) {
    var ssName = data.customerName || '名前なし';
    var ssLabel = String(data.planName || '').indexOf('貸切') !== -1
      ? '貸切海空セット'
      : '海空セット';

    var ssTurtleTitle =
      'WEB 🐢 ' + ssLabel + '（ウミガメ）/ ' + ssName + ' / ' + headcount;
    var ssStart = new Date(year, month, day, startHour, startMin);
    var ssEnd   = new Date(year, month, day, startHour + 1, startMin + 30);

    var ssTurtleEvent = calendar.createEvent(ssTurtleTitle, ssStart, ssEnd, {
      description: description,
      location: '宮古島'
    });
    ssTurtleEvent.setColor('2');
    Logger.log('カレンダー登録完了（海亀）: ' + ssTurtleTitle);

    var ssSupTitle =
      'WEB 🛸 ' + ssLabel + '（ドローンSUP・時間調整中）/ ' + ssName + ' / ' + headcount;
    var ssSupEvent = calendar.createAllDayEvent(ssSupTitle, new Date(year, month, day), {
      description: description,
      location: '宮古島'
    });
    ssSupEvent.setColor('6');
    Logger.log('カレンダー登録完了（ドローンSUP・終日）: ' + ssSupTitle);

    return;
  }

  if (combo) {
    var baseName = data.customerName || '名前なし';
    var comboCalendarLabel = String(data.planName || '').indexOf('貸切') !== -1
      ? '貸切昼夜セット'
      : '昼夜セット';

    var turtleTitle =
      'WEB 🐢 ' + comboCalendarLabel + '（ウミガメ）/ ' +
      baseName + ' / ' + headcount;

    var tStart = new Date(year, month, day, startHour, startMin);
    var tEnd   = new Date(year, month, day, startHour + 2, startMin);

    var turtleEvent = calendar.createEvent(turtleTitle, tStart, tEnd, {
      description: description,
      location: '宮古島'
    });

    turtleEvent.setColor('2');
    Logger.log('カレンダー登録完了（海亀）: ' + turtleTitle);

    var nightParts = String(comboNightTime || '').match(/^(\d{1,2}):(\d{2})/);

    if (nightParts) {
      var nH = parseInt(nightParts[1], 10);
      var nM = parseInt(nightParts[2], 10);

      var nightTitle =
        'WEB 🦀 ' + comboCalendarLabel + '（ヤシガニ）/ ' +
        baseName + ' / ' + headcount;

      var nStart = new Date(year, month, day, nH, nM);
      var nEnd   = new Date(year, month, day, nH + 1, nM + 30);

      var nightEvent = calendar.createEvent(nightTitle, nStart, nEnd, {
        description: description,
        location: '宮古島'
      });

      nightEvent.setColor('8');
      Logger.log('カレンダー登録完了（ナイト）: ' + nightTitle);
    } else {
      Logger.log('昼夜セットですが、ナイト時間を取得できませんでした。');
    }

    return;
  }

  var startTime = new Date(year, month, day, startHour, startMin);
  var endTime   = new Date(year, month, day, startHour + 2, startMin);

  var event = calendar.createEvent(title, startTime, endTime, {
    description: description,
    location: '宮古島'
  });

  event.setColor(color);
  Logger.log('カレンダー登録完了: ' + title);
}

// ============================================================
// 編集トリガー
// M列：確定／満席　N列：開催場所　S列：自由LINE送信
// ============================================================

function onSheetEdit(e) {
  if (!e || !e.range) {
    Logger.log('onSheetEdit はシート編集トリガーから実行してください');
    return;
  }

  var lock = LockService.getScriptLock();

  try {
    if (!lock.tryLock(3000)) {
      Logger.log('二重実行をスキップしました');
      return;
    }
  } catch (lockError) {
    Logger.log('ロック取得失敗: ' + lockError.message);
    return;
  }

  try {
    var range = e.range;
    var sheet = range.getSheet();

    if (sheet.getName() !== SHEET_NAME) return;

    var col = range.getColumn();
    var row = range.getRow();

    if (row <= 1) return;

    if (col === COLUMNS.BOOKING_STATUS) {
      handleBookingStatusEdit_(sheet, range, row);
      return;
    }

    if (col === COLUMNS.LOCATION) {
      handleLocationEdit_(sheet, range, row);
      return;
    }

    if (col === COLUMNS.LINE_SEND) {
      handleFreeLineMessageEdit_(sheet, range, row);
      return;
    }

  } finally {
    lock.releaseLock();
  }
}

function handleBookingStatusEdit_(sheet, range, row) {
  var status = range.getValue();

  if (status !== '確定' && status !== '満席') return;

  var lineUserId = sheet.getRange(row, COLUMNS.LINE_USER_ID).getValue();

  if (!lineUserId) {
    SpreadsheetApp.getActiveSpreadsheet().toast(
      'LINE User ID が未登録のため通知をスキップしました',
      '注意',
      3
    );
    return;
  }

  var customerName  = String(sheet.getRange(row, COLUMNS.NAME).getValue());
  var bookingNumber = String(sheet.getRange(row, COLUMNS.BOOKING_NUM).getValue());
  var planName      = String(sheet.getRange(row, COLUMNS.PLAN).getValue());
  var selectedDate  = formatDate(sheet.getRange(row, COLUMNS.DATE).getValue());
  var selectedTime  = formatTime(sheet.getRange(row, COLUMNS.TIME).getValue());

  var confirmDetails = {
    totalPrice: sheet.getRange(row, COLUMNS.TOTAL_PRICE).getValue() || 0,
    phone: String(sheet.getRange(row, COLUMNS.PHONE).getValue()),
    headcount: String(sheet.getRange(row, COLUMNS.HEADCOUNT).getValue()),
    participantsDetail: String(sheet.getRange(row, COLUMNS.PARTICIPANTS).getValue() || 'なし'),
    lineName: String(sheet.getRange(row, COLUMNS.LINE_NAME).getValue()),
    staffName: String(sheet.getRange(row, COLUMNS.STAFF).getValue() || '指名なし'),
    couponCode: String(sheet.getRange(row, COLUMNS.COUPON_CODE).getValue()),
    couponDiscount: sheet.getRange(row, COLUMNS.COUPON_DISCOUNT).getValue() || 0
  };

  var message = '';

  if (status === '確定') {
    message = getConfirmMessage(
      planName,
      customerName,
      bookingNumber,
      selectedDate,
      selectedTime,
      confirmDetails
    );
  } else {
    message = getFullMessage(
      customerName,
      bookingNumber,
      planName,
      selectedDate,
      selectedTime
    );
  }

  sendLineNotify({
    lineUserId: String(lineUserId),
    customMessage: message
  }, row);
}

function handleLocationEdit_(sheet, range, row) {
  var location = range.getValue();

  if (!location) return;

  var lineUserId = sheet.getRange(row, COLUMNS.LINE_USER_ID).getValue();

  if (!lineUserId) {
    SpreadsheetApp.getActiveSpreadsheet().toast(
      'LINE User ID が未登録のため通知をスキップしました',
      '注意',
      3
    );
    return;
  }

  var selectedTime = formatTime(sheet.getRange(row, COLUMNS.TIME).getValue());
  var locationMessage = getLocationMessage(location, selectedTime);

  if (!locationMessage) {
    SpreadsheetApp.getActiveSpreadsheet().toast(
      '場所のメッセージが見つかりません: ' + location,
      'エラー',
      5
    );
    return;
  }

  sendLineNotify({
    lineUserId: String(lineUserId),
    customMessage: locationMessage
  }, row);
}

function handleFreeLineMessageEdit_(sheet, range, row) {
  var messageText = range.getValue();

  if (!messageText) return;
  if (String(messageText).indexOf('✅ 送信済') === 0) return;

  var lineUserId = sheet.getRange(row, COLUMNS.LINE_USER_ID).getValue();

  if (!lineUserId) {
    SpreadsheetApp.getActiveSpreadsheet().toast(
      'LINE User ID が未登録のため送信できません',
      '注意',
      3
    );
    return;
  }

  var customerName = String(sheet.getRange(row, COLUMNS.NAME).getValue());

  var ok = sendLineNotify({
    lineUserId: String(lineUserId),
    customMessage: String(messageText)
  }, row);

  if (!ok) return;

  var now = new Date().toLocaleString('ja-JP');

  range.setValue('✅ 送信済 ' + now + '\n' + messageText);
  range.setBackground('#d9ead3');

  SpreadsheetApp.getActiveSpreadsheet().toast(
    customerName + ' 様にLINEを送信しました',
    '完了',
    3
  );
}

// ============================================================
// LINE通知送信
// ============================================================

function sendLineNotify(payload, row) {
  try {
    if (!NOTIFY_SECRET) {
      throw new Error('NOTIFY_SECRET が未設定です。');
    }

    var options = {
      method: 'post',
      contentType: 'application/json',
      headers: {
        Authorization: 'Bearer ' + NOTIFY_SECRET
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    var response = UrlFetchApp.fetch(NOTIFY_API_URL, options);
    var code = response.getResponseCode();
    var body = response.getContentText();

    Logger.log('LINE通知 row ' + row + ': status=' + code + ' body=' + body);

    if (code !== 200) {
      SpreadsheetApp.getActiveSpreadsheet().toast(
        'LINE通知送信失敗: ' + body,
        'エラー',
        5
      );
      return false;
    }

    SpreadsheetApp.getActiveSpreadsheet().toast(
      'LINE通知を送信しました',
      '完了',
      3
    );

    return true;

  } catch (error) {
    Logger.log('LINE通知エラー: ' + error.message);

    SpreadsheetApp.getActiveSpreadsheet().toast(
      'LINE通知エラー: ' + error.message,
      'エラー',
      5
    );

    return false;
  }
}

// ============================================================
// メニュー
// ============================================================

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('🐢 海亀兄弟')
    .addItem('シートを初期化する', 'setupSheet')
    .addToUi();
}
