import nextHandler from "./.open-next/worker.js"

// A separately configured, read-only migration preview. Never bind production
// integration secrets here; reject writes even if a secret is added by mistake.
export default {
  async fetch(request, env, ctx) {
    const headers = { "X-Robots-Tag": "noindex, nofollow", "Cache-Control": "no-store" }
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("This migration preview does not accept submissions.", { status: 403, headers })
    }
    // run_worker_first keeps the guard in front of assets as well as pages.
    // OpenNext normally relies on the assets router to serve matching files.
    const assetResponse = await env.ASSETS.fetch(request)
    const response = assetResponse.status === 404
      ? await nextHandler.fetch(request, env, ctx)
      : assetResponse
    const copy = new Response(response.body, response)
    for (const [name, value] of Object.entries(headers)) copy.headers.set(name, value)
    return copy
  },
}
