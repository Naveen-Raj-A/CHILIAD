import { JOURNEY_START_ISO, TOTAL_DAYS, dateForDay } from './date'
import { COMPLETED_STATUSES, STATUSES } from './status'
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
    // Absent on every record written before the Tomorrow Planner existed, so
    // this is also the migration: older journeys simply load with no plan.
    plannedItems: sanitizePlanItems(raw.plannedItems),
  }
}

/**
 * The day array as it should be presented, with today opened up.
 *
 * The moment a date becomes today it stops being "Not Started": the day opens
 * as "In Progress" so the tracker, the heatmap, and the grid all show it as
 * live rather than blank. This applies to every day still sitting at the
 * default status, whether or not anything has been written on it yet - a day
 * that has work recorded but was never explicitly marked is plainly underway.
 *
 * Any status the user has set is left exactly as it is, so a day that was
 * closed out stays closed, and no deliberate choice is ever overwritten.
 *
 * Returned unchanged - same reference - when nothing needs promoting, so
 * consumers keyed on identity do not re-render. Deriving this during render
 * rather than writing it in an effect keeps a single source of truth: the
 * stored record and the record on screen can never disagree.
 */
export function promoteToday(days, todayISO) {
  if (!Array.isArray(days) || !todayISO) return days

  const index = days.findIndex((day) => day.date === todayISO)
  if (index === -1) return days

  const day = days[index]
  if (day.status !== STATUSES[0]) return days

  const next = [...days]
  next[index] = { ...day, status: STATUSES[1] }
  return next
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
  if (day.progress > 0) return true
  if (COMPLETED_STATUSES.has(day.status)) return true
  return Boolean(
    (day.mainTasks && day.mainTasks.trim()) ||
      (day.details && day.details.trim()) ||
      (day.notes && day.notes.trim()),
  )
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
