import { JOURNEY_START_ISO, TOTAL_DAYS, dateForDay } from './date'
import { STATUSES } from './status'

/** Fields that make up a single journey day record. */
export const ENTRY_FIELDS = ['mainTasks', 'status', 'progress', 'details', 'notes']

/**
 * A blank, untouched day record. Every field starts empty so a fresh
 * initialization is genuinely empty and ready for real user input.
 */
export function emptyEntry(dayNum, date) {
  return {
    dayNum,
    date,
    mainTasks: '',
    status: STATUSES[0], // 'Not Started'
    progress: 0,
    details: '',
    notes: '',
  }
}

/**
 * Build the default 1,000 day dataset.
 *
 * Day 1 is always the fixed journey anchor (2026-10-01) and every entry is
 * blank. No content is ever fabricated; the journey starts empty and only
 * fills in as real work is recorded.
 */
export function createEmptyDays(startISO = JOURNEY_START_ISO) {
  return Array.from({ length: TOTAL_DAYS }, (_, index) => {
    const dayNum = index + 1
    return emptyEntry(dayNum, dateForDay(startISO, dayNum))
  })
}

/**
 * Coerce a stored/loaded record into a valid entry, filling any missing or
 * malformed field with blank defaults.
 *
 * Note: `date` is always taken from `fallback`, never from the stored record.
 * Day numbers are the stable identity in this app, so the calendar is derived
 * rather than persisted. That is what lets the journey re-anchor to a new
 * start date without touching a user's saved content.
 */
export function normalizeEntry(raw, fallback) {
  const base = emptyEntry(fallback.dayNum, fallback.date)
  if (!raw || typeof raw !== 'object') return base

  const status = STATUSES.includes(raw.status) ? raw.status : base.status
  const rawProgress = Number(raw.progress)

  return {
    dayNum: base.dayNum,
    date: base.date,
    mainTasks: typeof raw.mainTasks === 'string' ? raw.mainTasks : base.mainTasks,
    status,
    progress: Number.isFinite(rawProgress)
      ? Math.min(Math.max(rawProgress, 0), 100)
      : base.progress,
    details: typeof raw.details === 'string' ? raw.details : base.details,
    notes: typeof raw.notes === 'string' ? raw.notes : base.notes,
  }
}

/** True when a day has any recorded activity (status, progress, or text). */
export function isLogged(day) {
  if (!day) return false
  if (day.status && day.status !== 'Not Started') return true
  if (day.progress > 0) return true
  return Boolean(
    (day.mainTasks && day.mainTasks.trim()) ||
      (day.details && day.details.trim()) ||
      (day.notes && day.notes.trim()),
  )
}
