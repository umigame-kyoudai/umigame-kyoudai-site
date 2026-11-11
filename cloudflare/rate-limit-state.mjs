export const WINDOW_MS = 10 * 60 * 1000
export const MAX_BOOKING_RETRIES = 3

export function activeAttempts(saved, now) {
  // Retain future timestamps if a clock moves backwards; dropping them would
  // prematurely reset the limit compared with the existing implementation.
  return saved.filter((entry) => entry.time > now - WINDOW_MS)
}

export function decideLimit(saved, scope, key, now) {
  const active = activeAttempts(saved, now)
  const existing = key ? active.findIndex((entry) => entry.key === key) : -1
  if (existing !== -1) {
    const retries = active[existing].retries || 0
    if (retries >= MAX_BOOKING_RETRIES) return { allowed: false, changed: false, active }
    active[existing] = { ...active[existing], retries: retries + 1 }
    return { allowed: true, changed: true, active }
  }
  if (active.length >= (scope === 'booking' ? 5 : 15)) return { allowed: false, changed: false, active }
  active.push({ time: now, key, retries: 0 })
  return { allowed: true, changed: true, active }
}
