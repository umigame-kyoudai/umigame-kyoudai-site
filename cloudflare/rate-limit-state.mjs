export const WINDOW_MS = 10 * 60 * 1000

export function activeAttempts(saved, now) {
  // Retain future timestamps if a clock moves backwards; dropping them would
  // prematurely reset the limit compared with the existing implementation.
  return saved.filter((entry) => entry.time > now - WINDOW_MS)
}

export function decideLimit(saved, scope, key, now) {
  const active = activeAttempts(saved, now)
  if (key && active.some((entry) => entry.key === key)) return { allowed: true, changed: false, active }
  if (active.length >= (scope === 'booking' ? 5 : 15)) return { allowed: false, changed: false, active }
  active.push({ time: now, key })
  return { allowed: true, changed: true, active }
}
