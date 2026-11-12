import nextHandler from './.open-next/worker.js'
import { fetchWithImageFallback } from './cloudflare/image-fallback.mjs'
import { fetchForProductionHost } from './cloudflare/production-host.mjs'
export { RateLimiter } from './cloudflare/rate-limiter.mjs'

export default {
  fetch(request, env, ctx) {
    return fetchForProductionHost(request, (nextRequest) =>
      fetchWithImageFallback(nextRequest, env, ctx, nextHandler))
  },
}
