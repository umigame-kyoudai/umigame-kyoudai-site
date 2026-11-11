/** Use the edge-provided address on Workers; never trust a visitor's XFF there. */
export function clientIp(headers: Headers): string {
  if (process.env.CF_WORKER_DEPLOYMENT === "1") {
    return headers.get("cf-connecting-ip")?.trim() || "unknown"
  }
  return (headers.get("x-forwarded-for") || "unknown").split(",")[0].trim()
}
