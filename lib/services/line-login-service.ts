const LINE_ID_TOKEN_VERIFY_URL = "https://api.line.me/oauth2/v2.1/verify"
const LINE_TOKEN_MAX_LENGTH = 8192
const LINE_VERIFY_TIMEOUT_MS = 5000

export type LineVerificationErrorCode =
  | "INVALID_TOKEN"
  | "CONFIGURATION_ERROR"
  | "UPSTREAM_ERROR"

export class LineVerificationError extends Error {
  readonly code: LineVerificationErrorCode

  constructor(code: LineVerificationErrorCode, message: string) {
    super(message)
    this.name = "LineVerificationError"
    this.code = code
  }
}

export interface VerifiedLineProfile {
  userId: string
  displayName: string
}

const isJSONObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const getLineLoginChannelId = (): string => {
  const channelId = process.env.LINE_LOGIN_CHANNEL_ID?.trim()
  if (!channelId || !/^\d+$/.test(channelId)) {
    throw new LineVerificationError(
      "CONFIGURATION_ERROR",
      "LINE_LOGIN_CHANNEL_ID is not configured correctly"
    )
  }
  return channelId
}

export async function verifyLineIdToken(idToken: unknown): Promise<VerifiedLineProfile> {
  if (
    typeof idToken !== "string" ||
    idToken.length === 0 ||
    idToken.length > LINE_TOKEN_MAX_LENGTH
  ) {
    throw new LineVerificationError("INVALID_TOKEN", "LINE ID token is missing or invalid")
  }

  const channelId = getLineLoginChannelId()
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), LINE_VERIFY_TIMEOUT_MS)

  try {
    const response = await fetch(LINE_ID_TOKEN_VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        id_token: idToken,
        client_id: channelId,
      }),
      signal: controller.signal,
      cache: "no-store",
    })

    if (!response.ok) {
      console.warn("[v0] LINE ID token verification was rejected:", response.status)
      throw new LineVerificationError(
        response.status === 400 ? "INVALID_TOKEN" : "UPSTREAM_ERROR",
        "LINE ID token verification failed"
      )
    }

    let result: unknown
    try {
      result = await response.json()
    } catch {
      throw new LineVerificationError(
        "UPSTREAM_ERROR",
        "LINE verification returned invalid JSON"
      )
    }

    const nowInSeconds = Math.floor(Date.now() / 1000)
    if (
      !isJSONObject(result) ||
      result.iss !== "https://access.line.me" ||
      result.aud !== channelId ||
      typeof result.sub !== "string" ||
      result.sub.length === 0 ||
      typeof result.exp !== "number" ||
      result.exp <= nowInSeconds
    ) {
      throw new LineVerificationError(
        "INVALID_TOKEN",
        "LINE verification response did not match the expected channel or user"
      )
    }

    return {
      userId: result.sub,
      displayName: typeof result.name === "string" ? result.name : "",
    }
  } catch (error) {
    if (error instanceof LineVerificationError) throw error
    if (error instanceof Error && error.name === "AbortError") {
      throw new LineVerificationError("UPSTREAM_ERROR", "LINE verification timed out")
    }

    console.error("[v0] LINE verification request failed")
    throw new LineVerificationError("UPSTREAM_ERROR", "LINE verification request failed")
  } finally {
    clearTimeout(timeoutId)
  }
}
