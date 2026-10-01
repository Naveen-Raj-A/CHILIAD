/**
 * Status vocabulary and the rules that produce it.
 *
 * A day's status is never stored as a decision the user has to keep in sync
 * with reality - it is *derived* from the date, the recorded progress, and the
 * plan checklist. That is what makes "tick a task" automatically move the day
 * from Not Started to In Progress and finally to Completed, with no second
 * control to forget to update and no way for status and progress to disagree.
 */
import { sanitizePlanItems } from './plan'

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
  const ticked = items.filter((item) => item.done).length

  if (progress >= 100 || (items.length > 0 && ticked === items.length)) return 'Completed'

  if (!day.date || !todayISO) return STATUSES[0]

  if (day.date > todayISO) return STATUSES[0]

  if (day.date < todayISO) return 'Not Completed'

  // Today: live once anything at all has been recorded.
  return progress > 0 || ticked > 0 ? 'In Progress' : STATUSES[0]
}
