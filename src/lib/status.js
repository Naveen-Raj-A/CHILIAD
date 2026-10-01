/**
 * Status vocabulary and the rules that produce it.
 *
 * A day's status is never stored as a decision the user has to keep in sync
 * with reality - it is *derived* from the date, the recorded progress, and the
 * plan checklist. That is what makes "tick a task" automatically move the day
 * from Not Started to In Progress and finally to Completed, with no second
 * control to forget to update and no way for status and progress to disagree.
 */
import { isItemComplete, sanitizePlanItems } from './plan'

/**
 * The four canonical status values, in escalation order.
 *
 * 'Not Completed' is the new status for a day that ended unfinished; it is the
 * honest label for a missed day and was previously indistinguishable from a
 * day that was never touched.
 */
export const STATUSES = ['Not Started', 'In Progress', 'Not Completed', 'Completed']

/** Statuses that count toward the "completed days" metric. */
export const COMPLETED_STATUSES = new Set(['Completed'])

/**
 * Badge styling per status.
 * - Completed      -> emerald: the day was finished
 * - In Progress    -> sky: the day is live and underway
 * - Not Completed  -> amber: the day ended unfinished
 * - Not Started    -> neutral: nothing has happened yet
 * Each carries a matching hairline border so badges read crisply on dark
 * surfaces at small sizes.
 */
export const STATUS_STYLES = {
  'Not Started': 'bg-neutral-800 text-neutral-400 border border-neutral-700',
  'In Progress': 'bg-sky-500/20 text-sky-400 border border-sky-500/30',
  'Not Completed': 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
  Completed: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
}

/** Clamp a progress value into the 0-100 the rest of the app assumes. */
function clampProgress(day) {
  const value = Number(day?.progress)
  if (!Number.isFinite(value)) return 0
  return Math.min(Math.max(value, 0), 100)
}

/**
 * True when a day holds something the user actually wrote, ticked or logged.
 *
 * Deliberately independent of the day's status, so callers can ask "was this
 * day engaged with at all?" without the answer being contaminated by a status
 * that is itself derived from that same question. A plan with no ticks does not
 * count: creating an empty checklist is intent, not activity.
 */
export function hasRecordedContent(day) {
  if (!day) return false
  if (clampProgress(day) > 0) return true

  const items = sanitizePlanItems(day.plannedItems)
  if (items.some((item) => item.status !== 'Pending')) return true

  return Boolean(
    (day.mainTasks && day.mainTasks.trim()) ||
      (day.details && day.details.trim()) ||
      (day.notes && day.notes.trim()),
  )
}

/**
 * The status a day presents, as a pure function of its record and the date.
 *
 * The rules, in the order they are applied:
 *
 *  - Completed   progress is 100%, or every planned item is ticked.
 *  - Not Started the day is in the future, or today with nothing recorded.
 *  - In Progress today, with at least some progress or a tick.
 *  - Not Completed the day is over and it did not reach 100%.
 *
 * Completion is tested first so a finished day stays finished once it is in
 * the past, rather than decaying to "Not Completed" the moment midnight
 * passes. Past days are read-only, so this is a label, never a write.
 */
export function deriveStatus(day, todayISO) {
  if (!day) return STATUSES[0]

  const progress = clampProgress(day)
  const items = sanitizePlanItems(day.plannedItems)
  const complete = items.filter(isItemComplete).length

  if (progress >= 100 || (items.length > 0 && complete === items.length)) return 'Completed'

  if (!day.date || !todayISO) return STATUSES[0]

  if (day.date > todayISO) return STATUSES[0]

  // The subtle branch. An untouched past day is *Not Started*, not *Not
  // Completed*: nothing was attempted, so calling it a miss invents a failure
  // the user never committed. It also keeps the analytics honest - every day
  // that has simply gone by would otherwise be tallied as a miss, so the count
  // would grow with the calendar rather than with effort, and a journey where
  // the user did nothing at all would render as a wall of amber failures.
  if (day.date < todayISO) {
    return hasRecordedContent(day) ? 'Not Completed' : STATUSES[0]
  }

  // Today: live as soon as anything at all has been recorded, including an item
  // moved off Pending without being finished.
  return hasRecordedContent(day) ? 'In Progress' : STATUSES[0]
}
