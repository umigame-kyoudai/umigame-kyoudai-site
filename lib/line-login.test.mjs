import assert from "node:assert/strict"
import test from "node:test"
import { buildLineBookingUrl, hasNonPortableBookingInput, readLineSession } from "./line-login.ts"

const now = Date.UTC(2026, 10, 6)
const sdk = (claims = {}, overrides = {}) => ({
  isLoggedIn: () => true,
  getIDToken: () => "signed-id-token",
  getDecodedIDToken: () => ({ sub: "Uexample", name: "表示名", exp: now / 1000 + 3600, ...claims }),
  ...overrides,
})

test("a valid LINE session needs no profile network call to be usable", () => {
  const liff = sdk({}, { getProfile: () => { throw new Error("network unavailable") } })
  assert.deepEqual(readLineSession(liff, now), {
    idToken: "signed-id-token", userId: "Uexample", displayName: "表示名",
  })
  assert.equal(readLineSession(sdk({ name: undefined }), now)?.displayName, null)
})

test("missing, expired, nearly expired, or malformed LINE sessions fail closed", () => {
  for (const exp of [now / 1000 - 1, now / 1000 + 60, undefined, NaN, Infinity, "9999999999"]) {
    assert.equal(readLineSession(sdk({ exp }), now), null)
  }
  assert.ok(readLineSession(sdk({ exp: now / 1000 + 61 }), now))
  assert.equal(readLineSession(sdk({ sub: "" }), now), null)
  assert.equal(readLineSession(sdk({}, { isLoggedIn: () => false }), now), null)
  assert.equal(readLineSession(sdk({}, { getIDToken: () => null }), now), null)
  assert.equal(readLineSession(sdk({}, { getDecodedIDToken: () => { throw new Error("SDK not ready") } }), now), null)
})

test("only plan and date can move to another browser; all other filled inputs stay protected", () => {
  const emptyJa = { selectedPlan: "S3", selectedDate: "2027-03-10", adultCount: 0, participants: [], selectedDuration: "5h", customerName: "", agreedToTerms: false }
  assert.equal(hasNonPortableBookingInput(emptyJa), false)
  assert.equal(hasNonPortableBookingInput({ planId: "S1", date: "2027-03-10", participants: [], agreed: false }), false)
  for (const fields of [
    { customerName: "入力中" }, { customerPhone: "09000000000" }, { specialRequests: "要望" },
    { adultCount: 1 }, { participants: [{ age: 10 }] }, { selectedTime: "19:00" },
    { nightTime: "19:30" }, { couponCode: "TEST" }, { photoPublicationConsent: true },
    { selectedDuration: "7h" }, { futureField: "入力" },
  ]) assert.equal(hasNonPortableBookingInput({ ...emptyJa, ...fields }), true)
})

test("LINE app links keep the latest tour/date and language, without personal or OAuth data", () => {
  for (const path of ["/book", "/en/book", "/ko/book", "/zh-tw/book/"]) {
    const result = buildLineBookingUrl({
      liffId: "1234567890-Abcd1234",
      currentUrl: `https://example.com${path}?plan=S1&date=2027-03-01&name=private&phone=09000000000&code=oauth&state=secret&liff.state=private&redirect_uri=https://evil.test&access_token=secret#id_token=secret`,
      planId: "S3", date: "2027-03-10",
    })
    const url = new URL(result)
    assert.equal(url.origin, "https://liff.line.me")
    assert.equal(url.pathname, `/1234567890-Abcd1234${path.replace(/\/$/, "")}`)
    assert.deepEqual([...url.searchParams.entries()], [["plan", "S3"], ["date", "2027-03-10"], ["line_entry", "app"]])
    assert.equal(url.hash, "")
  }
})

test("Instagram acquisition survives an app switch without forwarding arbitrary query values", () => {
  const token = `${Buffer.from(JSON.stringify({ source: "umigame", entry: "instagram", acquiredAt: new Date().toISOString() })).toString("base64url")}.${"A".repeat(43)}`
  const url = new URL(buildLineBookingUrl({
    liffId: "1234567890-Abcd1234", currentUrl: "https://example.com/book?utm_source=internal&private=hidden",
    planId: "S3", date: "2027-03-10", bookingSource: token,
    attribution: { source: "instagram", medium: "profile", campaign: "night-tour" },
  }))
  assert.equal(url.searchParams.get("utm_source"), "instagram")
  assert.equal(url.searchParams.get("utm_medium"), "profile")
  assert.equal(url.searchParams.get("booking_source"), token)
  assert.equal(url.searchParams.has("private"), false)
})

test("invalid app identifiers, other destinations, and invalid source tokens are not forwarded", () => {
  const defaults = { liffId: "1234567890-Abcd1234", currentUrl: "https://example.com/book", planId: "", date: "" }
  for (const liffId of ["", "../../evil", "123/../../evil", "123-abcd?target=evil"]) {
    assert.equal(buildLineBookingUrl({ ...defaults, liffId }), null)
  }
  for (const currentUrl of ["not a URL", "https://example.com/admin", "https://example.com/book/../../evil"]) {
    assert.equal(buildLineBookingUrl({ ...defaults, currentUrl }), null)
  }
  const url = new URL(buildLineBookingUrl({ ...defaults, bookingSource: "not-signed" }))
  assert.equal(url.searchParams.has("booking_source"), false)
  assert.equal(url.searchParams.has("plan"), false)
})
