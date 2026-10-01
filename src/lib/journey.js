import { JOURNEY_START_ISO, TOTAL_DAYS, dateForDay } from './date'
import { COMPLETED_STATUSES, STATUSES, deriveStatus, hasRecordedContent } from './status'
import { sanitizePlanItems } from './plan'

/** Fields that make up a single journey day record. */
export const ENTRY_FIELDS = [
  'mainTasks',
  'status',
  'progress',
  'details',
  'notes',
  'plannedItems',
]

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
    plannedItems: [],
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

  // 'Done' was folded into 'Completed' when status became derived, so records
  // written before that are migrated rather than silently reset to the default.
  const rawStatus = raw.status === 'Done' ? 'Completed' : raw.status
  const status = STATUSES.includes(rawStatus) ? rawStatus : base.status
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
    // Absent on every record written before the Tomorrow Planner existed, so
    // this is also the migration: older journeys simply load with no plan.
    plannedItems: sanitizePlanItems(raw.plannedItems),
  }
}

/**
 * The day array with every day's status derived from its record and the date.
 *
 * This is what the app presents; the stored record keeps the status the user
 * last chose, so a deliberate choice is never overwritten and `isBlank` can
 * still tell local intent from an untouched day. The derived value is what
 * reaches the screen, the stats, and the sync payload.
 *
 * Returns the same array reference when nothing changes, so consumers keyed on
 * identity do not re-render. Derived during render rather than written in an
 * effect, so the stored record and the record on screen cannot disagree.
 */
export function applyStatus(days, todayISO) {
  if (!Array.isArray(days) || !todayISO) return days

  let next = null
  for (let i = 0; i < days.length; i += 1) {
    const day = days[i]
    const status = deriveStatus(day, todayISO)
    if (status === day.status) continue
    if (!next) next = [...days]
    next[i] = { ...day, status }
  }

  return next ?? days
}

/**
 * True when a day holds something the user actually recorded.
 *
 * Content is what counts, not the status alone. Today promotes itself to
 * "In Progress" at midnight, and that automatic transition must not read as
 * activity: otherwise every new day would pad the streak and the activity rate
 * on its own, and a journey nobody wrote in would look like a perfect run.
 * Closing a day out does count, because that is a deliberate act.
 */
export function isLogged(day) {
  if (!day) return false
  if (hasRecordedContent(day)) return true
  return COMPLETED_STATUSES.has(day.status)
}

/**
 * True when a day holds no local intent at all, so a remote record may
 * safely fill it.
 *
 * Deliberately stricter than `!isLogged`: any status the user chose, any
 * progress, and any plan counts as local intent even when no text was typed.
 * Without this, a background refresh could quietly overwrite a day the user
 * had deliberately marked.
 */
export function isBlank(day) {
  if (!day) return true
  if (day.status && day.status !== STATUSES[0]) return false
  if (Number(day.progress) > 0) return false
  if (sanitizePlanItems(day.plannedItems).length > 0) return false
  return !(
    (day.mainTasks && day.mainTasks.trim()) ||
    (day.details && day.details.trim()) ||
    (day.notes && day.notes.trim())
  )
}
