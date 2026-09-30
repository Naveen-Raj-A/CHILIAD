export const TOTAL_DAYS = 1000

/**
 * The journey's fixed Day 1 anchor: October 1, 2026.
 *
 * Every date in the app is projected from this constant rather than from
 * "today", so the 1,000-day window is stable no matter when the app is
 * opened. Day 1000 therefore lands on 2029-06-26.
 */
export const JOURNEY_START_ISO = '2026-10-01'

/** Day 1 as a local-time Date. */
export function journeyStartDate() {
  return fromISODate(JOURNEY_START_ISO)
}

/** The ISO date of Day 1000, useful for headers and validation. */
export const JOURNEY_END_ISO = dateForDay(JOURNEY_START_ISO, TOTAL_DAYS)

/**
 * Format a Date as YYYY-MM-DD in local time (avoids the UTC shift that
 * toISOString() introduces for negative/positive timezone offsets).
 */
export function toISODate(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Parse YYYY-MM-DD as a local-time Date. */
export function fromISODate(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** Human-readable long date, e.g. "Mon, Sep 30, 2026". */
export function formatLongDate(iso) {
  return fromISODate(iso).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

/** Compact date for table cells, e.g. "Sep 30, 2026". */
export function formatShortDate(iso) {
  return fromISODate(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

/** The ISO date of `dayNum` days after the journey start date. */
export function dateForDay(startISO, dayNum) {
  const start = fromISODate(startISO)
  start.setDate(start.getDate() + (dayNum - 1))
  return toISODate(start)
}
