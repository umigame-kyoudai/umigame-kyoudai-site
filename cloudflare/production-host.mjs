const CANONICAL_HOST = 'www.umigamekyoudaimiyakojima.com'
const APEX_HOST = 'umigamekyoudaimiyakojima.com'

// Preserve the former hosting platform's apex redirect, including request method.
export async function fetchForProductionHost(request, fetchPage) {
  const url = new URL(request.url)
  if (url.hostname === APEX_HOST) {
    url.protocol = 'https:'
    url.hostname = CANONICAL_HOST
    url.port = ''
    return Response.redirect(url.toString(), 308)
  }
  const response = await fetchPage(request)
  if (url.hostname === CANONICAL_HOST) return response
  // Temporary verification hosts must never compete with the canonical site.
  const guarded = new Response(response.body, response)
  guarded.headers.set('X-Robots-Tag', 'noindex, nofollow')
  return guarded
}
