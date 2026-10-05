import assert from 'node:assert/strict'
import test from 'node:test'
import vm from 'node:vm'
import { createGas } from './test-helpers/gas-runtime.mjs'

// 解析GASの「かんたんレポート」（月ごとの要約シート）の集計・分類・書き込みを確かめる。
const JST = 9 * 60 * 60 * 1000
const monthOf = (date) => new Date(date.getTime() + JST).toISOString().slice(0, 7)
const dayOf = (date) => Number(new Date(date.getTime() + JST).toISOString().slice(8, 10))
const jst = (text) => new Date(text.replace(' ', 'T') + '+09:00')

function setup() {
  const { g } = createGas('umigame-analytics')
  g.console = { error() {}, warn() {}, log() {} }
  g.SpreadsheetApp.BorderStyle = { SOLID: 'SOLID' }
  g.Utilities.formatDate = (date, _tz, format) => {
    const iso = new Date(date.getTime() + JST).toISOString()
    const parts = { yyyy: iso.slice(0, 4), MM: iso.slice(5, 7), dd: iso.slice(8, 10), HH: iso.slice(11, 13), mm: iso.slice(14, 16), ss: iso.slice(17, 19) }
    return format.replace(/yyyy|MM|dd|HH|mm|ss|d/g, (token) => token === 'd' ? String(Number(parts.dd)) : parts[token])
  }
  g.Utilities.parseDate = (text) => jst(text)
  const headers = Array.from(vm.runInContext('EVENT_HEADERS', g))
  const row = (fields) => {
    const values = new Array(headers.length).fill('')
    for (const [header, value] of Object.entries(fields)) {
      const index = headers.indexOf(header)
      assert.ok(index >= 0, header)
      values[index] = value
    }
    return values
  }
  return { g, row, headers }
}

const options = (overrides = {}) => ({
  months: ['2026-08', '2026-09', '2026-10'],
  end: jst('2026-10-05 00:00:00'),
  lastDay: 4,
  lastMonthComplete: false,
  monthOf,
  dayOf,
  ...overrides,
})

test('traffic sources are grouped into nine plain-language kinds with a clear breakdown', () => {
  const { g } = setup()
  const cases = [
    [['', '', 'www.google.com'], ['検索', 'Google検索']],
    [['', '', 'www.google.co.jp'], ['検索', 'Google検索']],
    [['', '', 'search.yahoo.co.jp'], ['検索', 'Yahoo!検索']],
    [['', '', 'websearch.rakuten.co.jp'], ['検索', 'その他の検索']],
    [['gbp', 'profile', ''], ['Googleマップ', 'Googleマップ（お店の情報）']],
    [['instagram', 'story', ''], ['SNS', 'Instagram（ストーリー）']],
    [['instagram', 'profile', ''], ['SNS', 'Instagram（プロフィール）']],
    [['', '', 'l.instagram.com'], ['SNS', 'Instagram']],
    [['', '', 'www.tiktok.com'], ['SNS', 'TikTok']],
    [['line', 'richmenu', ''], ['LINE', 'LINE（リッチメニュー）']],
    [['', '', 'jp.naver.line.android'], ['LINE', 'LINE（トーク・その他）']],
    [['chatgpt.com', '', ''], ['AI（ChatGPTなど）', 'ChatGPT']],
    [['', '', 'chatgpt.com'], ['AI（ChatGPTなど）', 'ChatGPT']],
    [['blog', 'article_cta', ''], ['ブログ記事', 'ブログ記事']],
    [['flyer', 'qr', ''], ['チラシ・紹介', 'チラシのQRコード']],
    [['', '', 'teams.public.onecdn.static.microsoft'], ['その他のサイト', 'teams.public.onecdn.static.microsoft']],
    [['', '', ''], ['直接・不明', '直接・不明']],
    // LINEログインからの戻り・自分のサイト内の移動は「来た場所」ではない
    [['', '', 'access.line.me'], ['直接・不明', '直接・不明']],
    [['', '', 'umigamekyoudaimiyakojima.com'], ['直接・不明', '直接・不明']],
  ]
  for (const [args, expected] of cases) {
    assert.deepEqual(Array.from(g.classifySource_(...args)), expected, args.join(' / '))
  }
})

test('monthly numbers count each visitor once, exclude test traffic and today, and compare with the same days last month', () => {
  const { g, row } = setup()
  const v = (n) => `00000000-0000-4000-8000-00000000000${n}`
  const rows = [
    // 9月：同じ人が2回見ても1人
    row({ '日時': jst('2026-09-02 10:00:00'), 'イベント': 'page_view', 'ページ': '/', '参照元ホスト': 'www.google.com', 'Visitor ID': v(1) }),
    row({ '日時': jst('2026-09-02 10:05:00'), 'イベント': 'page_view', 'ページ': '/plans', '参照元ホスト': 'www.google.com', 'Visitor ID': v(1) }),
    row({ '日時': jst('2026-09-20 10:00:00'), 'イベント': 'page_view', 'ページ': '/', 'UTM Source': 'instagram', 'UTM Medium': 'story', 'Visitor ID': v(2) }),
    row({ '日時': jst('2026-09-20 10:10:00'), 'イベント': 'booking_started', 'Visitor ID': v(2), '予約ファネルID': 'f2' }),
    row({ '日時': jst('2026-09-20 10:20:00'), 'イベント': 'booking_submitted', 'UTM Source': 'instagram', 'UTM Medium': 'story', 'プランID': 'S3', 'プラン名': '本格ナイトツアー', '人数合計': 2, '金額': 8000, 'Visitor ID': v(2), '予約ファネルID': 'f2' }),
    // 10月（4日まで）
    row({ '日時': jst('2026-10-03 09:00:00'), 'イベント': 'page_view', 'ページ': '/', 'Visitor ID': v(3) }),
    // 集計しないもの：動作確認・確認用ページ・今日の分
    row({ '日時': jst('2026-10-03 09:00:00'), 'イベント': 'page_view', 'ページ': '/', 'UTM Source': 'deployment-check', 'Visitor ID': v(4) }),
    row({ '日時': jst('2026-10-03 09:00:00'), 'イベント': 'page_view', 'ページ': '/__analytics_check', 'Visitor ID': v(5) }),
    row({ '日時': jst('2026-10-05 08:00:00'), 'イベント': 'page_view', 'ページ': '/', 'Visitor ID': v(6) }),
  ]
  const report = g.buildSimpleReport_(rows, options())
  const metric = (label) => Array.from(report.metrics.find((m) => m.label === label).values)

  // データのない8月は表に出さない
  assert.deepEqual(Array.from(report.months), ['2026-09', '2026-10'])
  assert.deepEqual(metric('サイトに来た人'), [2, 1])
  assert.deepEqual(metric('ページが見られた回数'), [3, 1])
  assert.deepEqual(metric('予約の入力を始めた人'), [1, 0])
  assert.deepEqual(metric('予約が入った'), [1, 0])
  assert.deepEqual(metric('参加人数'), [2, 0])
  assert.deepEqual(metric('売上（予約時の金額）'), [8000, 0])
  assert.deepEqual(Array.from(report.conversion), [1, null])
  // 9月の「4日まで」と比べる：9/2のGoogle検索の1人だけ
  assert.equal(report.samePeriod.visitors, 1)
  assert.equal(report.samePeriod.bookings, 0)

  const sns = report.sources.find((s) => s.label === 'SNS')
  assert.deepEqual(Array.from(sns.visitors), [1, 0])
  assert.deepEqual(Array.from(sns.bookings), [1, 0])
  assert.equal(sns.details[0].label, 'Instagram（ストーリー）')
  assert.equal(report.sources.at(-1).label, '直接・不明', '「直接・不明」はいちばん下')
  assert.deepEqual(Array.from(report.plans[0].bookings), [1, 0])
  assert.equal(report.plans[0].name, '本格ナイトツアー')
  assert.ok(report.insights[0].startsWith('10月は4日までで、来た人1人・予約0件です（9月の同じ時期は1人・0件）'))
})

test('the booking form steps count people once and mark where most people stop in the last full month', () => {
  const { g, row } = setup()
  const rows = []
  const reach = (person, steps) => steps.forEach((event, i) => rows.push(row({
    '日時': jst(`2026-09-1${i} 12:00:00`), 'イベント': event, '予約ファネルID': person, 'Visitor ID': '00000000-0000-4000-8000-000000000001',
  })))
  const all = ['booking_form_view', 'booking_date_selected', 'booking_price_confirmed', 'booking_representative_completed', 'booking_submitted']
  for (let i = 0; i < 10; i++) reach(`opened-${i}`, all.slice(0, 1))
  for (let i = 0; i < 4; i++) reach(`dated-${i}`, all.slice(0, 3))
  reach('booked', all)
  // 同じ人が予約ページを何度開いても1人
  reach('booked', all.slice(0, 1))

  const report = g.buildSimpleReport_(rows, options())
  assert.equal(report.funnelMonthIndex, 0, '最後まである月（9月）で見る')
  assert.deepEqual(Array.from(report.funnel, (step) => step.people[0]), [15, 5, 5, 1, 1])
  assert.equal(report.biggestDropIndex, 1, '日付を選ぶ前に10人がやめている')
  assert.ok(report.insights.some((text) => text.includes('「日付を選んだ」の手前です（10人・約67%）')))
})

test('only the needed columns of recent rows are read from the event sheet', () => {
  const { g, headers } = setup()
  const dates = [jst('2026-07-01 00:00:00'), jst('2026-08-15 00:00:00'), jst('2026-09-01 00:00:00'), jst('2026-10-01 00:00:00')]
  const reads = []
  const sheet = {
    getLastRow: () => dates.length + 1,
    getRange: (row, column, rows, columns) => ({
      getValues: () => {
        reads.push({ row, column, rows, columns })
        return Array.from({ length: rows }, (_, i) => [column === 1 ? dates[row - 2 + i] : `${headers[column - 1]}-${row + i}`])
      },
    }),
  }
  const rows = g.readEventRowsSince_(sheet, jst('2026-08-01 00:00:00'))
  assert.equal(rows.length, 3)
  assert.equal(rows[0][headers.indexOf('日時')], dates[1])
  assert.equal(rows[2][headers.indexOf('イベント')], 'イベント-5')
  assert.ok(reads.slice(1).every((read) => read.row === 3 && read.rows === 3 && read.columns === 1))
  assert.equal(reads.length, 1 + 13, '日付の確認1回＋必要な13列だけ')
})

test('the report sheet is written with month columns and is never deleted by workbook setup', () => {
  const { g, row } = setup()
  assert.ok(Array.from(g.requiredSheetNames_()).includes('かんたんレポート'))

  let written = null
  const chain = new Proxy({}, { get: (_, name) => name === 'setValues' ? (values) => { written = values; return chain } : () => chain })
  const sheet = new Proxy({}, { get: (_, name) => name === 'getRange' ? () => chain : () => chain })
  const rows = [row({ '日時': jst('2026-09-02 10:00:00'), 'イベント': 'page_view', 'ページ': '/', 'Visitor ID': '00000000-0000-4000-8000-000000000001' })]
  g.writeSimpleReport_(sheet, g.buildSimpleReport_(rows, options()), jst('2026-10-05 06:00:00'), 'Asia/Tokyo')

  const lines = Array.from(written, (line) => Array.from(line))
  assert.equal(lines[0][0], '海亀兄弟 かんたんレポート（月ごと）')
  const header = lines.find((line) => line[0] === '項目')
  assert.deepEqual(header.slice(2), ['9月', '10月（4日まで）'])
  assert.ok(lines.some((line) => line[0] === '直接・不明' && line[1].startsWith('ブックマーク')))
  assert.ok(lines.every((line) => line.length === 4))
})

test('months recorded before visitor IDs and form steps existed show a dash instead of a misleading zero', () => {
  const { g, row } = setup()
  const rows = [
    // 7月：ページ表示と予約はあるが、誰が来たか（ID）と予約フォームの段階はまだ記録していない
    row({ '日時': jst('2026-07-25 10:00:00'), 'イベント': 'page_view', 'ページ': '/', '参照元ホスト': 'www.google.com' }),
    row({ '日時': jst('2026-07-25 10:30:00'), 'イベント': 'booking_submitted', '参照元ホスト': 'www.google.com', 'プラン名': 'ウミガメ', '人数合計': 1, '金額': 6500 }),
    row({ '日時': jst('2026-08-02 10:00:00'), 'イベント': 'page_view', 'ページ': '/', '参照元ホスト': 'www.google.com', 'Visitor ID': '00000000-0000-4000-8000-000000000001' }),
    row({ '日時': jst('2026-08-02 10:01:00'), 'イベント': 'booking_form_view', 'Visitor ID': '00000000-0000-4000-8000-000000000001', '予約ファネルID': 'f1' }),
  ]
  const report = g.buildSimpleReport_(rows, options({ months: ['2026-06', '2026-07', '2026-08'], end: jst('2026-09-01 00:00:00'), lastDay: 31, lastMonthComplete: true }))
  assert.deepEqual(Array.from(report.months), ['2026-07', '2026-08'], '空の6月は出さない')
  assert.deepEqual(Array.from(report.metrics[0].values), [null, 1])
  assert.deepEqual(Array.from(report.metrics[1].values), [1, 1])
  const search = report.sources.find((s) => s.label === '検索')
  assert.deepEqual(Array.from(search.visitors), [null, 1])
  assert.deepEqual(Array.from(search.bookings), [1, 0])
  assert.deepEqual(Array.from(report.funnel, (step) => step.people[0]), [null, null, null, null, 1])
  assert.equal(g.formatReportValue_(null, '人'), '—')
})
