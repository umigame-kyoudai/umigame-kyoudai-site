import assert from "node:assert/strict"
import test from "node:test"
import { clientIp } from "./client-ip.ts"

test("Cloudflare uses its visitor address, not a supplied forwarded-for value", (t) => {
  const previous = process.env.CF_WORKER_DEPLOYMENT
  t.after(() => previous === undefined ? delete process.env.CF_WORKER_DEPLOYMENT : process.env.CF_WORKER_DEPLOYMENT = previous)
  process.env.CF_WORKER_DEPLOYMENT = "1"
  assert.equal(clientIp(new Headers({ "cf-connecting-ip": "192.0.2.1", "x-forwarded-for": "198.51.100.2" })), "192.0.2.1")
  assert.equal(clientIp(new Headers({ "x-forwarded-for": "198.51.100.2" })), "unknown")
})

test("the existing Vercel path keeps its forwarded-for behavior", (t) => {
  const previous = process.env.CF_WORKER_DEPLOYMENT
  t.after(() => previous === undefined ? delete process.env.CF_WORKER_DEPLOYMENT : process.env.CF_WORKER_DEPLOYMENT = previous)
  delete process.env.CF_WORKER_DEPLOYMENT
  assert.equal(clientIp(new Headers({ "x-forwarded-for": "192.0.2.1, 198.51.100.2" })), "192.0.2.1")
})
