import test from 'node:test'
import assert from 'node:assert/strict'
import { fetchForProductionHost } from '../cloudflare/production-host.mjs'

test('apex redirects to the existing canonical host with path, query and 308 method semantics', async () => {
  for (const method of ['GET', 'POST']) {
    const response = await fetchForProductionHost(new Request('https://umigamekyoudaimiyakojima.com/r/partner?c=summer', { method }), () => assert.fail('redirect must not run the booking app'))
    assert.equal(response.status, 308)
    assert.equal(response.headers.get('Location'), 'https://www.umigamekyoudaimiyakojima.com/r/partner?c=summer')
  }
})

test('canonical responses, cookies and streaming body remain unchanged', async () => {
  const expected = new Response('page', { headers: { 'Set-Cookie': 'test=1; HttpOnly' } })
  assert.equal(await fetchForProductionHost(new Request('https://www.umigamekyoudaimiyakojima.com/book'), async () => expected), expected)
  assert.equal(expected.headers.has('X-Robots-Tag'), false)
})

test('verification hosts are noindex while preserving status, redirect and multiple cookies', async () => {
  const headers = new Headers({ Location: 'https://migration-check.umigamekyoudaimiyakojima.com/', 'Cache-Control': 'private, no-store' })
  headers.append('Set-Cookie', 'a=1; HttpOnly')
  headers.append('Set-Cookie', 'b=2; Secure')
  const response = await fetchForProductionHost(new Request('https://migration-check.umigamekyoudaimiyakojima.com/r/partner'), async () => new Response(null, { status: 307, headers }))
  assert.equal(response.status, 307)
  assert.equal(response.headers.get('X-Robots-Tag'), 'noindex, nofollow')
  assert.equal(response.headers.get('Cache-Control'), 'private, no-store')
  assert.deepEqual(response.headers.getSetCookie(), ['a=1; HttpOnly', 'b=2; Secure'])
  assert.equal(response.headers.get('Location'), 'https://migration-check.umigamekyoudaimiyakojima.com/')
})
