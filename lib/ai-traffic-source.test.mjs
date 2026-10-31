import assert from 'node:assert/strict'
import test from 'node:test'
import { createGas } from './test-helpers/gas-runtime.mjs'

const { g: booking } = createGas('umigame-reservation-admin')
const { g: analytics } = createGas('umigame-analytics')
const services = [
  ['ChatGPT', ['chatgpt', 'openai'], ['chatgpt.com', 'chat.openai.com']],
  ['Claude', ['claude', 'anthropic'], ['claude.ai']],
  ['Gemini', ['gemini', 'google_gemini', 'bard'], ['gemini.google.com', 'bard.google.com']],
  ['Perplexity', ['perplexity'], ['perplexity.ai']],
  ['Copilot', ['copilot', 'microsoft_copilot', 'bing_copilot'], ['copilot.com', 'copilot.microsoft.com', 'copilot.cloud.microsoft']],
  ['Grok', ['grok'], ['grok.com']],
  ['DeepSeek', ['deepseek'], ['chat.deepseek.com']],
]

test('booking email and analytics share the identical AI classifier', () => {
  assert.equal(booking.identifyAiTrafficSource_.toString(), analytics.identifyAiTrafficSource_.toString())
})

for (const [name, aliases, hosts] of services) {
  test(`${name} is named consistently in emails and reports from tags and referrers`, () => {
    for (const source of [...aliases, ...hosts]) {
      assert.deepEqual(Array.from(analytics.classifySource_(source, 'referral', '')), ['AI（ChatGPTなど）', name])
      assert.ok(booking.buildBookingTrafficEmailBlock_({ attribution: { source, medium: 'referral' } }).includes(`媒体：${name}\n`))
    }
    for (const host of hosts.flatMap(host => [host, `www.${host}`, host.toUpperCase(), `${host}.`])) {
      assert.deepEqual(Array.from(analytics.classifySource_('', '', host)), ['AI（ChatGPTなど）', name], host)
      const body = booking.buildBookingTrafficEmailBlock_({ attribution: { referrer: host } })
      assert.ok(body.includes(`媒体：${name}\n`), host)
      assert.ok(body.includes('判定根拠：参照元ドメイン'))
    }
  })
}

test('company sites, ordinary search, unknown traffic and lookalike domains are not classified as AI', () => {
  for (const host of ['', 'google.com', 'www.google.co.jp', 'bing.com', 'x.com', 'openai.com', 'anthropic.com',
    'notclaude.ai', 'chatgpt.com.evil.example', 'mycopilot.com', 'grok.com.example', 'claude', 'gemini']) {
    assert.equal(analytics.identifyAiTrafficSource_(host, false), '', host)
    assert.notEqual(analytics.classifySource_('', '', host)[0], 'AI（ChatGPTなど）', host)
  }
  assert.ok(booking.buildBookingTrafficEmailBlock_({}).includes('媒体：不明\n'))
})

test('explicit UTM source keeps precedence over an AI referrer', () => {
  assert.deepEqual(Array.from(analytics.classifySource_('instagram', 'profile', 'gemini.google.com')), ['SNS', 'Instagram（プロフィール）'])
  assert.ok(booking.buildBookingTrafficEmailBlock_({ attribution: { source: 'instagram', referrer: 'gemini.google.com' } }).includes('媒体：Instagram\n'))
})
