import nextHandler from './.open-next/worker.js'
import { fetchWithImageFallback } from './cloudflare/image-fallback.mjs'
export { RateLimiter } from './cloudflare/rate-limiter.mjs'

export default {
  fetch(request, env, ctx) { return fetchWithImageFallback(request, env, ctx, nextHandler) },
}
