import assert from "node:assert/strict"
import test from "node:test"

import {
  LineVerificationError,
  verifyLineIdToken,
} from "./line-login-service.ts"

const channelId = "1234567890"
const idToken = "header.payload.signature"

const validVerificationResponse = () => ({
  iss: "https://access.line.me",
  sub: "U1234567890abcdef",
  aud: channelId,
  exp: Math.floor(Date.now() / 1000) + 300,
  iat: Math.floor(Date.now() / 1000),
  name: "Fresh LINE User",
})

test("verifies the ID token with LINE and returns the server-confirmed profile", async (t) => {
  process.env.LINE_LOGIN_CHANNEL_ID = channelId
  t.mock.method(globalThis, "fetch", async (url, init) => {
    assert.equal(url, "https://api.line.me/oauth2/v2.1/verify")
    assert.equal(init?.method, "POST")
    assert.equal(init?.headers?.["Content-Type"], "application/x-www-form-urlencoded")

    const body = new URLSearchParams(init?.body)
    assert.equal(body.get("id_token"), idToken)
    assert.equal(body.get("client_id"), channelId)

    return new Response(JSON.stringify(validVerificationResponse()), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  })

  const profile = await verifyLineIdToken(idToken)

  assert.deepEqual(profile, {
    userId: "U1234567890abcdef",
    displayName: "Fresh LINE User",
  })
})

test("fails closed when the server-side channel ID is missing", async () => {
  delete process.env.LINE_LOGIN_CHANNEL_ID

  await assert.rejects(() => verifyLineIdToken(idToken), (error) => {
    assert.ok(error instanceof LineVerificationError)
    assert.equal(error.code, "CONFIGURATION_ERROR")
    return true
  })
})

test("rejects a missing or oversized token before contacting LINE", async (t) => {
  process.env.LINE_LOGIN_CHANNEL_ID = channelId
  const fetchMock = t.mock.method(globalThis, "fetch", async () => {
    throw new Error("fetch must not be called")
  })

  await assert.rejects(() => verifyLineIdToken(null), { code: "INVALID_TOKEN" })
  await assert.rejects(() => verifyLineIdToken("x".repeat(8193)), { code: "INVALID_TOKEN" })
  assert.equal(fetchMock.mock.callCount(), 0)
})

const rejectedResponses = [
  ["LINE rejects the token", () => new Response(JSON.stringify({ error: "invalid" }), { status: 400 }), "INVALID_TOKEN"],
  ["LINE is unavailable", () => new Response("unavailable", { status: 500 }), "UPSTREAM_ERROR"],
  ["LINE returns invalid JSON", () => new Response("<html>error</html>", { status: 200 }), "UPSTREAM_ERROR"],
]

test("maps LINE verification failures to safe error categories", async (t) => {
  process.env.LINE_LOGIN_CHANNEL_ID = channelId

  for (const [name, createResponse, expectedCode] of rejectedResponses) {
    await t.test(name, async (t) => {
      t.mock.method(console, "warn", () => {})
      t.mock.method(globalThis, "fetch", async () => createResponse())

      await assert.rejects(() => verifyLineIdToken(idToken), (error) => {
        assert.ok(error instanceof LineVerificationError)
        assert.equal(error.code, expectedCode)
        return true
      })
    })
  }
})

const invalidPayloads = [
  ["wrong issuer", { ...validVerificationResponse(), iss: "https://example.com" }],
  ["wrong channel", { ...validVerificationResponse(), aud: "9999999999" }],
  ["expired token", { ...validVerificationResponse(), exp: Math.floor(Date.now() / 1000) - 1 }],
  ["missing user ID", { ...validVerificationResponse(), sub: "" }],
  ["non-object payload", ["invalid"]],
]

test("rejects verification payloads that cannot identify the expected user", async (t) => {
  process.env.LINE_LOGIN_CHANNEL_ID = channelId

  for (const [name, payload] of invalidPayloads) {
    await t.test(name, async (t) => {
      t.mock.method(globalThis, "fetch", async () =>
        new Response(JSON.stringify(payload), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      )

      await assert.rejects(() => verifyLineIdToken(idToken), {
        code: "INVALID_TOKEN",
      })
    })
  }
})
