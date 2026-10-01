/**
 * Strict date-lockdown rules for the 1,000-day journey.
 *
 * Three states, derived purely from comparing ISO date strings
 * (YYYY-MM-DD compares correctly lexicographically):
 *
 *  - FUTURE: days beyond today are hard-locked. They cannot be opened or
 *    edited at all.
 *  - TODAY:  the current active date. Freely readable and writable.
 *  - PAST:   days that have ended are read-only. Entries stay viewable but
 *    every write path is blocked so no retroactive editing can happen.
 *
 * The rules are enforced both in the UI (disabled controls, lock
 * indicators) and centrally in App's save/open handlers, so a bypassed
 * control can still never commit a write outside today.
 */

export const LOCK_FUTURE = 'future'
export const LOCK_TODAY = 'today'
export const LOCK_PAST = 'past'

/**
 * Classify a date (or an entry exposing `.date`) relative to `todayISO`.
 * Fails closed: unknown dates are treated as locked so a missing value can
 * never accidentally open a write path.
 */
export function lockState(entryOrDate, todayISO) {
  const date = typeof entryOrDate === 'string' ? entryOrDate : entryOrDate?.date
  if (!date || !todayISO) return LOCK_FUTURE
  if (date > todayISO) return LOCK_FUTURE
  if (date === todayISO) return LOCK_TODAY
  return LOCK_PAST
}

/** True only for the current active date — the sole editable day. */
export function canEdit(entryOrDate, todayISO) {
  return lockState(entryOrDate, todayISO) === LOCK_TODAY
}

/** Future days cannot even be opened; today and past days are viewable. */
export function canOpen(entryOrDate, todayISO) {
  return lockState(entryOrDate, todayISO) !== LOCK_FUTURE
}

/** Human-readable reason shown in lock badges and toasts. */
export function lockLabel(state) {
  if (state === LOCK_FUTURE) return 'Locked — future date'
  if (state === LOCK_PAST) return 'Read-only — day ended'
  return 'Editable — today'
}
