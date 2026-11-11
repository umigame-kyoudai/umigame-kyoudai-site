// Keep locally owned photographs visible if the image transformation service
// is unavailable or its quota is exhausted. Never proxy arbitrary URLs.
export async function fetchWithImageFallback(request, env, ctx, handler) {
  const url = new URL(request.url)
  const source = url.searchParams.get('url') || ''
  const eligible = ['GET', 'HEAD'].includes(request.method)
    && /^\/_next\/image\/?$/.test(url.pathname)
    && /^\/(?!\/)[a-zA-Z0-9_./-]+\.(?:avif|gif|jpe?g|png|webp)$/i.test(source)
    && !source.split('/').some((part) => part === '.' || part === '..')
    && !source.startsWith('/api/') && !source.startsWith('/_next/')
    && env.ASSETS?.fetch
  let response
  try { response = await handler.fetch(request, env, ctx) } catch (error) {
    if (!eligible) throw error
    response = new Response(null, { status: 503 })
  }
  if (!eligible || (response.status < 500 && response.status !== 429)) return response
  let original
  try {
    original = await env.ASSETS.fetch(new Request(new URL(source, url.origin), { method: request.method }))
  } catch { return response }
  if (!original.ok || !/^image\/(avif|gif|jpeg|png|webp)(?:;|$)/i.test(original.headers.get('Content-Type') || '')) return response
  const headers = new Headers(original.headers)
  // Retry optimization shortly; do not retain an unoptimized fallback for the
  // normal image cache lifetime or cache an upstream error.
  headers.set('Cache-Control', 'public, max-age=60')
  headers.set('X-Content-Type-Options', 'nosniff')
  headers.set('X-Image-Fallback', 'original')
  return new Response(original.body, { status: 200, headers })
}
