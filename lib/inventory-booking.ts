// 予約在庫（管理システム docs/130）：ホームページのリアルタイム受付で、管理システムへ送る予約の形を作る。
// 旧GAS（apps-script/umigame-reservation-admin/Code.gs）が「予約一覧」シートに書く行と同じ内容（セットの分け方・時刻・金額の分け方・
// 人数内訳・参加者詳細）を、ホームページのサーバーで作る。管理システムはシートの取り込みと同じ形で予約を作るので、集計・LINEの案内も今と同じになる。
// Code.gs と同じ結果になることは lib/inventory-booking.test.mjs で、本物の Code.gs を動かして1行ずつ比べる。

export interface InventoryGasPayload {
  bookingNumber: string
  planId: string
  planName: string
  customerName: string
  customerEmail: string
  customerPhone: string
  selectedDate: string
  selectedTime: string
  participants: ReadonlyArray<object>
  adultCount: number
  childCount: number
  under3Count: number
  totalPrice: number
  staffName: string
  specialRequests: string
  lineUserId: string
  lineDisplayName: string
  couponCode: string
  couponDiscount: number
}

export interface InventoryRow {
  time: string
  planName: string
  totalPrice: number
  couponDiscount: number
  staffName: string
}

export interface InventoryTour {
  date: string
  time: string | null
  plan_code: string | null
  plan_text: string
  amount: number
}

const SEA_SKY_TURTLE = '海空セット（ウミガメシュノーケル）'
const SEA_SKY_SUP = '海空セット（ドローンSUP）'
const COMBO_TURTLE = '昼夜セット海亀'
const COMBO_NIGHT = '昼夜セットヤシガニ'
const TRIPLE = { turtle: 'まるごと1日セット海亀', sup: 'まるごと1日セットドローンSUP', night: 'まるごと1日セットヤシガニ' }
const TRIPLE_PRIVATE = { turtle: '貸切まるごと1日セット海亀', sup: '貸切まるごと1日セットドローンSUP', night: '貸切まるごと1日セットヤシガニ' }
const TURTLE_MINUTES = 90
const COMBO_PRICE_RULES = {
  normal: { adult: { turtle: 6000, night: 3500 }, child: { turtle: 5500, night: 3500 }, under3: { turtle: 0, night: 0 } },
  private: { adult: { turtle: 8500, night: 7500 }, child: { turtle: 8500, night: 7500 }, under3: { turtle: 0, night: 0 } },
} as const

// Code.gs normalizeTime_ と同じ。
export function normalizeTime(value: unknown): string {
  const m = String(value ?? '').match(/(\d{1,2})\s*(?::|：|時)\s*(\d{1,2})/)
  if (!m) return ''
  const hour = Number(m[1])
  const minute = Number(m[2])
  if (hour > 23 || minute > 59) return ''
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

// Code.gs addMinutesToTime_ と同じ（日付をまたぐと時刻だけ回り込む）。
export function addMinutes(value: unknown, minutes: number): string {
  const normalized = normalizeTime(value)
  if (!normalized) return ''
  const [h, m] = normalized.split(':').map(Number)
  const total = (((h * 60 + m + minutes) % 1440) + 1440) % 1440
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

const toNumber = (value: unknown): number => {
  if (value === null || value === undefined || value === '') return 0
  if (typeof value === 'number') return Number.isNaN(value) ? 0 : value
  const n = Number(String(value).replace(/[¥,円,\s]/g, ''))
  return Number.isNaN(n) ? 0 : n
}
const splitEvenly = (amount: unknown) => {
  const normalized = Math.round(toNumber(amount))
  const first = Math.floor(normalized / 2)
  return { first, second: normalized - first }
}
const splitThree = (amount: unknown) => {
  const total = Math.round(toNumber(amount))
  const turtle = Math.floor(total / 3)
  const sup = Math.floor((total - turtle) / 2)
  return { turtle, sup, night: total - turtle - sup }
}

// 昼夜セット（C1・C2）の行の金額：Code.gs getComboRowAmounts_ と同じ（料金表の割合から、送られた合計との差を半分ずつ引く）。
function comboAmounts(p: InventoryGasPayload) {
  const rules = p.planId === 'C2' ? COMBO_PRICE_RULES.private : COMBO_PRICE_RULES.normal
  const counts = { adult: Number(p.adultCount || 0), child: Number(p.childCount || 0), under3: Number(p.under3Count || 0) }
  let turtle = 0
  let night = 0
  for (const category of ['adult', 'child', 'under3'] as const) {
    const count = Number.isNaN(counts[category]) ? 0 : counts[category]
    turtle += count * rules[category].turtle
    night += count * rules[category].night
  }
  const submitted = toNumber(p.totalPrice)
  if (!submitted) return { turtle, night }
  const adjust = splitEvenly(turtle + night - submitted)
  return { turtle: turtle - adjust.first, night: night - adjust.second }
}

// Code.gs が書く行（時刻・プラン名・合計金額・クーポン割引額・スタッフ指名）。nightTime：ナイトの時刻（昼夜・まるごと1日）。
export function buildInventoryRows(p: InventoryGasPayload, nightTime: string | null): InventoryRow[] {
  const staffName = p.staffName || ''
  const planId = String(p.planId || '').trim().toUpperCase()
  if (planId === 'C3' || planId === 'C4') {
    const turtleTime = normalizeTime(p.selectedTime)
    const supTime = addMinutes(turtleTime, TURTLE_MINUTES)
    if (!turtleTime || !supTime) throw new Error('海空セットの開始時間を確認できません')
    const amount = splitEvenly(p.totalPrice)
    const coupon = splitEvenly(p.couponDiscount)
    return [
      { time: turtleTime, planName: SEA_SKY_TURTLE, totalPrice: amount.first, couponDiscount: coupon.first, staffName },
      { time: supTime, planName: SEA_SKY_SUP, totalPrice: amount.second, couponDiscount: coupon.second, staffName },
    ]
  }
  if (planId === 'C1' || planId === 'C2') {
    const turtleTime = normalizeTime(p.selectedTime)
    const night = normalizeTime(nightTime)
    if (!turtleTime || !night) throw new Error('昼夜セットの開始時間を確認できません')
    const amount = comboAmounts(p)
    const coupon = splitEvenly(p.couponDiscount)
    return [
      { time: turtleTime, planName: COMBO_TURTLE, totalPrice: amount.turtle, couponDiscount: coupon.first, staffName },
      { time: night, planName: COMBO_NIGHT, totalPrice: amount.night, couponDiscount: coupon.second, staffName },
    ]
  }
  if (planId === 'C5' || planId === 'C6') {
    const turtleTime = normalizeTime(p.selectedTime)
    const supTime = addMinutes(turtleTime, TURTLE_MINUTES)
    const night = normalizeTime(nightTime)
    if (!turtleTime || !supTime || !night) throw new Error('まるごと1日セットの開始時間を確認できません')
    const labels = planId === 'C6' ? TRIPLE_PRIVATE : TRIPLE
    const amount = splitThree(p.totalPrice)
    const coupon = splitThree(p.couponDiscount)
    return [
      { time: turtleTime, planName: labels.turtle, totalPrice: amount.turtle, couponDiscount: coupon.turtle, staffName },
      { time: supTime, planName: labels.sup, totalPrice: amount.sup, couponDiscount: coupon.sup, staffName },
      { time: night, planName: labels.night, totalPrice: amount.night, couponDiscount: coupon.night, staffName },
    ]
  }
  return [{
    time: normalizeTime(p.selectedTime) || String(p.selectedTime || ''),
    planName: p.planName || '',
    totalPrice: toNumber(p.totalPrice || 0),
    couponDiscount: toNumber(p.couponDiscount || 0),
    staffName,
  }]
}

const CATEGORY: Record<string, string> = { adult: '大人', child: '子供', under3: '3歳未満' }
// Code.gs buildParticipantsDetail と同じ。
export function participantsDetail(participants: ReadonlyArray<object>): string {
  if (!Array.isArray(participants)) return ''
  return (participants as ReadonlyArray<Record<string, unknown>>).map((p, i) => {
    const parts = [`${i + 1}.`]
    if (p.name) parts.push(String(p.name))
    if (p.age || p.age === 0) parts.push(`${p.age}歳`)
    if (p.height) parts.push(`${p.height}cm`)
    if (p.weight) parts.push(`${p.weight}kg`)
    if (p.footSize) parts.push(`足${p.footSize}cm`)
    if (p.wetsuitRental === true) parts.push('【ウェットスーツ希望】')
    if (p.prescriptionMaskRental === true) parts.push('【度付きマスク希望】')
    parts.push(`(${CATEGORY[String(p.category ?? '')] ?? String(p.category ?? '')})`)
    return parts.join(' ')
  }).join('\n')
}
const participantValues = (participants: ReadonlyArray<object>, field: string) =>
  (Array.isArray(participants) ? (participants as ReadonlyArray<Record<string, unknown>>) : []).map((p) => {
    const v = p?.[field]
    return v === null || v === undefined || v === '' ? '' : String(v)
  }).join(' / ')

// 管理システムへ送る予約（create_web_booking の item・details）。status は確定（空きがあればその場で確定：2026-11-08 オーナー回答）。
export function buildInventoryBooking(p: InventoryGasPayload, nightTime: string | null) {
  const rows = buildInventoryRows(p, nightTime)
  const headcount = `大人${p.adultCount || 0}名 / 子供${p.childCount || 0}名 / 3歳未満${p.under3Count || 0}名`
  const detail = participantsDetail(p.participants)
  const planCode = /^[A-Z][0-9]{1,2}$/.test(String(p.planId || '')) ? String(p.planId) : null
  const tours: InventoryTour[] = rows.map((r) => ({
    date: p.selectedDate,
    time: normalizeTime(r.time) || null,
    plan_code: planCode,
    plan_text: r.planName,
    amount: Math.round(r.totalPrice),
  }))
  const sheetRows = rows.map((r) => ({
    '参加日': p.selectedDate,
    '時間': r.time,
    'プラン': r.planName,
    '管理プランID': p.planId || '',
    '人数内訳': headcount,
    '参加者詳細': detail,
    'LINE名': p.lineDisplayName || '',
    'スタッフ指名': r.staffName,
    '合計金額': String(r.totalPrice),
    'クーポンコード': p.couponCode || '',
    'クーポン割引額': String(r.couponDiscount),
    '参加者年齢': participantValues(p.participants, 'age'),
    '参加者身長': participantValues(p.participants, 'height'),
    '参加者体重': participantValues(p.participants, 'weight'),
    '参加者足サイズ': participantValues(p.participants, 'footSize'),
  }))
  const item = {
    booking_number: p.bookingNumber,
    status: 'CONFIRMED',
    customer: { name: p.customerName || null, phone: p.customerPhone || null, email: p.customerEmail || null },
    people: { adult: Number(p.adultCount || 0), child: Number(p.childCount || 0), under3: Number(p.under3Count || 0) },
    amount: tours.reduce((sum, t) => sum + t.amount, 0),
    coupon: { code: p.couponCode || null, discount: rows.reduce((sum, r) => sum + Math.round(r.couponDiscount), 0) },
    tours,
  }
  const details = {
    line_user_id: /^U[0-9a-f]{32}$/.test(p.lineUserId || '') ? p.lineUserId : null,
    line_name: p.lineDisplayName || null,
    requests: p.specialRequests || null,
    sheet_rows: sheetRows,
  }
  return { booking_number: p.bookingNumber, item, details }
}
