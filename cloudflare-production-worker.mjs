import nextHandler from './.open-next/worker.js'
export { RateLimiter } from './cloudflare/rate-limiter.mjs'

export default {
  fetch(request, env, ctx) { return nextHandler.fetch(request, env, ctx) },
}
