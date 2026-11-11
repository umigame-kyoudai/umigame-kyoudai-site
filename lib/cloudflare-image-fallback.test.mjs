import test from 'node:test'
import assert from 'node:assert/strict'
import { fetchWithImageFallback } from '../cloudflare/image-fallback.mjs'

function request(source, method = 'GET') {
  return new Request(`https://site.example/_next/image?url=${encodeURIComponent(source)}&w=640&q=75`, { method })
}
const failed = { fetch: async () => new Response('unavailable', { status: 503 }) }

test('returns the original local photograph after transformation failure', async () => {
  const response = await fetchWithImageFallback(request('/gallery/turtle.jpg'), {
    ASSETS: { fetch: async (r) => {
      assert.equal(r.url, 'https://site.example/gallery/turtle.jpg')
      return new Response('synthetic-photo', { headers: { 'Content-Type': 'image/jpeg' } })
    } },
  }, {}, failed)
  assert.equal(response.status, 200)
  assert.equal(response.headers.get('Cache-Control'), 'public, max-age=60')
  assert.equal(await response.text(), 'synthetic-photo')
})

test('also handles binding exceptions without leaking their content', async () => {
  const response = await fetchWithImageFallback(request('/photo.png'), {
    ASSETS: { fetch: async () => new Response('photo', { headers: { 'Content-Type': 'image/png' } }) },
  }, {}, { fetch: async () => { throw new Error('synthetic-private-error') } })
  assert.equal(await response.text(), 'photo')
})

test('leaves successful transforms and validation errors unchanged', async () => {
  for (const status of [200, 400, 401, 404]) {
    const expected = new Response('normal', { status })
    const actual = await fetchWithImageFallback(request('/photo.jpg'), {
      ASSETS: { fetch: () => assert.fail('must not bypass handler validation') },
    }, {}, { fetch: async () => expected })
    assert.equal(actual, expected)
  }
})

test('does not fetch remote addresses, dynamic routes, traversal, SVG, or unsafe methods', async () => {
  for (const source of ['https://private.invalid/x.jpg', '//private.invalid/x.jpg', '/api/x.jpg', '/_next/x.jpg', '/a/../x.jpg', '/a/%2e%2e/x.jpg', '/photo.svg', '/photo.jpg?secret=x']) {
    const response = await fetchWithImageFallback(request(source), {
      ASSETS: { fetch: () => assert.fail('unsafe source') },
    }, {}, failed)
    assert.equal(response.status, 503)
  }
  const response = await fetchWithImageFallback(request('/photo.jpg', 'POST'), {
    ASSETS: { fetch: () => assert.fail('unsafe method') },
  }, {}, failed)
  assert.equal(response.status, 503)
})

test('does not replace image failures with HTML or redirect responses', async () => {
  for (const original of [new Response('<html>', { headers: { 'Content-Type': 'text/html' } }), new Response(null, { status: 302, headers: { Location: 'https://private.invalid/' } })]) {
    const response = await fetchWithImageFallback(request('/photo.jpg'), { ASSETS: { fetch: async () => original } }, {}, failed)
    assert.equal(response.status, 503)
  }
})
