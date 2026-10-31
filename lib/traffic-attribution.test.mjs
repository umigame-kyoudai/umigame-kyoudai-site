import test from 'node:test'
import assert from 'node:assert/strict'
import { TRAFFIC_SOURCES, captureTrafficAttribution, getTrafficAttribution, normalizeTrafficAttribution, clearTrafficAttribution, classifyTrafficSource, trafficAttributionNote } from './traffic-attribution.ts'
import { setTrackingConsent } from './customer-tracking.ts'
import { createGas } from './test-helpers/gas-runtime.mjs'
const store = () => { const m = new Map(); return { getItem: k => m.get(k) ?? null, setItem: (k,v) => m.set(k,String(v)), removeItem:k=>m.delete(k) } }
function browser(t) {
  const previous = { window: globalThis.window, document: globalThis.document }
  globalThis.window = { localStorage: store(), sessionStorage: store(), dispatchEvent() {}, location: new URL('https://example.test/') }
  globalThis.document = { referrer: '' }
  t.after(() => { clearTrafficAttribution(); Object.assign(globalThis, previous) })
  setTrackingConsent('accepted')
  return (query='', referrer='') => { window.location = new URL(`https://example.test/book${query}`); globalThis.document = { referrer }; captureTrafficAttribution(); return getTrafficAttribution() }
}
test('Instagram origin stays separate from LINE route, including internal CTA and authentication returns', t => {
  const visit = browser(t)
  assert.equal(visit('?utm_source=instagram&utm_medium=profile').originSource, 'instagram')
  const line = visit('?utm_source=line&utm_medium=richmenu')
  assert.equal(line.originSource, 'instagram'); assert.equal(line.routeSource, 'line'); assert.equal(line.routeMedium, 'richmenu')
  for (const [q, ref] of [['?utm_source=blog','https://example.test/blog'], ['', 'https://access.line.me/'], ['?code=local&state=local', ''], ['', 'https://line.me/']]) {
    assert.deepEqual(visit(q,ref),line)
  }
  const direct=visit()
  assert.equal(direct.originSource,'instagram'); assert.equal(direct.routeSource,'direct')
})
test('LINE first, legacy last-touch, and direct first visits do not invent an original marketing source', t => {
  const visit=browser(t)
  window.localStorage.setItem('booking_attribution_v1', JSON.stringify({source:'google',ts:Date.now()}))
  assert.equal(visit('?utm_source=line').originSource,'unknown')
  assert.equal(visit('?utm_source=instagram').originSource,'unknown')
  assert.equal(getTrafficAttribution('youtube').originSource,'youtube')
  assert.equal(getTrafficAttribution('youtube').originEvidence,'reported')
  clearTrafficAttribution()
  assert.equal(visit().originSource,'unknown')
  assert.equal(visit('?utm_source=chatgpt').originSource,'unknown')
})
test('customer answers work without tracking consent, while automatic tracking remains empty', t => {
  const visit=browser(t)
  setTrackingConsent('declined'); clearTrafficAttribution()
  const a=visit('?utm_source=instagram')
  assert.equal(a.routeSource,'unknown'); assert.equal(a.originSource,'unknown')
  assert.equal(window.localStorage.getItem('booking_first_observed_v1'),null)
  const answer=getTrafficAttribution('gbp')
  assert.equal(answer.originSource,'gbp'); assert.equal(answer.originEvidence,'reported'); assert.equal(answer.routeSource,'unknown')
  setTrackingConsent('accepted')
  assert.equal(visit('?utm_source=gemini').originSource,'gemini')
})
test('expired first touch and route are not reused; a fresh browser does not inherit another browser history', t => {
  const visit=browser(t);visit('?utm_source=instagram')
  const old = JSON.parse(window.localStorage.getItem('booking_first_observed_v1')); old.at=Date.now()-91*86400000
  window.localStorage.setItem('booking_first_observed_v1',JSON.stringify(old))
  assert.equal(getTrafficAttribution().originSource,'unknown')
  assert.equal(visit('?utm_source=youtube').originSource,'youtube')
  const route=JSON.parse(window.sessionStorage.getItem('booking_entry_route_v1'));route.at=Date.now()-31*60000
  window.sessionStorage.setItem('booking_entry_route_v1',JSON.stringify(route))
  assert.equal(getTrafficAttribution().routeSource,'unknown')
  window.localStorage=store();window.sessionStorage=store();setTrackingConsent('accepted')
  assert.equal(visit('', 'https://access.line.me/').originSource,'unknown')
  assert.equal(getTrafficAttribution().routeSource,'unknown')
})
test('named AI services and domain boundaries remain distinguishable', () => {
  for(const [key, host] of [['chatgpt','chatgpt.com'],['claude','claude.ai'],['gemini','gemini.google.com'],['perplexity','perplexity.ai'],['copilot','copilot.microsoft.com'],['grok','grok.com'],['deepseek','chat.deepseek.com']]) {
    assert.equal(classifyTrafficSource('',host),key)
    assert.equal(classifyTrafficSource(key),key)
    assert.equal(classifyTrafficSource('',host+'.evil.test'),'other_web')
  }
  assert.equal(classifyTrafficSource('','google.com'),'google')
  assert.equal(classifyTrafficSource('gbp'),'gbp')
})
test('Web, booking GAS and analytics GAS normalize the same finite data; no arbitrary text reaches mail or reports', () => {
  const booking=createGas('umigame-reservation-admin').g
  const analytics=createGas('umigame-analytics').g
  assert.deepEqual(JSON.parse(JSON.stringify(booking.TRAFFIC_SOURCES)),TRAFFIC_SOURCES)
  assert.deepEqual(JSON.parse(JSON.stringify(analytics.TRAFFIC_SOURCES)),TRAFFIC_SOURCES)
  const examples=[null,{}, {version:2}, ...Object.keys(TRAFFIC_SOURCES).map(source=>({version:1,originSource:source,originEvidence:'reported',routeSource:'line',routeEvidence:'tag',routeMedium:'richmenu'})),
    {version:1,originSource:'line',originEvidence:'first_observed',routeSource:'__proto__',routeEvidence:'tag',routeMedium:'constructor'},
    {version:1,originSource:'[COMBO booking]',originEvidence:'reported',routeSource:'anything',routeEvidence:'evil',routeMedium:'=SUM(1,2)'}]
  for (const input of examples) {
    const expected=normalizeTrafficAttribution(input)
    for(const gas of [booking,analytics]) assert.deepEqual(JSON.parse(JSON.stringify(gas.normalizeTrafficAttribution_(input))),expected)
  }
})
test('all-booking summary deduplicates split rows and keeps legacy origins unknown', () => {
  const g=createGas('umigame-reservation-admin').g
  const row=(id, note)=> { const r=Array(52).fill('');r[0]=new Date('2026-10-31T00:00:00Z');r[1]=id;r[43]=note;return r }
  const a={version:1,originSource:'instagram',originEvidence:'reported',routeSource:'line',routeEvidence:'tag',routeMedium:'richmenu'}
  const rows=[row('new',trafficAttributionNote(a)),row('new',trafficAttributionNote(a)),row('old','[流入元] google'),row('',trafficAttributionNote(a))]
  const report=Array.from(g.bookingTrafficReportRows_(rows),r=>Array.from(r))
  assert.equal(report.reduce((s,r)=>s+r[6],0),2)
  assert.ok(report.some(r=>r[1]==='Instagram'&&r[2]==='LINE → 公式サイト'&&r[3]==='お客様の回答'&&r[6]===1))
  assert.ok(report.some(r=>r[1]==='不明'&&r[2]==='不明 → 公式サイト'))
})
