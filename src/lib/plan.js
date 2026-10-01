/**
 * Tomorrow Planner items.
 *
 * A plan item is a small, self-contained task bound to the ISO date of the day
 * it was planned for. It lives on that day's journey entry as `plannedItems`,
 * so a plan travels with the record it belongs to: backups, CSV export, and the
 * offline sync queue all carry it with no separate bookkeeping.
 *
 * Time discipline is enforced by the caller, not here: the Planner may only
 * write to tomorrow, and once a date has arrived the items are rendered
 * read-only against that day's entry.
 */

/** Longest a single plan item may be, matching the quick to-do input cap. */
export const MAX_PLAN_ITEM_LENGTH = 200

/**
 * Per-item task status.
 *
 * A boolean `done` cannot express work that has started but is not finished,
 * which is most of a real day. The three states map onto the sheet's checkbox
 * column and drive the derived day status, so a half-done plan reads as "In
 * Progress" rather than silently reading as untouched.
 *
 * `done` is retained on every item as a derived mirror of `status === 'Completed'`
 * because several call sites (day progress, the tracker's checkbox) were written
 * against it. One source of truth, two compatible shapes.
 */
export const PLAN_ITEM_STATUSES = ['Pending', 'In Progress', 'Completed']

/** Statuses that mean the item is finished. */
export const ITEM_COMPLETED = 'Completed'

/** Coerce any stored/hand-edited value into a valid item status. */
export function normalizeItemStatus(value) {
  if (typeof value !== 'string') return 'Pending'
  const match = PLAN_ITEM_STATUSES.find(
    (status) => status.toLowerCase() === value.trim().toLowerCase(),
  )
  return match ?? 'Pending'
}

/** True when an item is finished. */
export function isItemComplete(item) {
  if (!item) return false
  // `status` is authoritative; `done` is the legacy mirror and the fallback for
  // records written before the tri-state existed.
  if (item.status) return normalizeItemStatus(item.status) === ITEM_COMPLETED
  return Boolean(item.done)
}

/** Create a stable unique id without extra dependencies. */
function makeId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

/** Build a new plan item from raw input text, optionally at a given status. */
export function createPlanItem(text, status = 'Pending') {
  const resolved = normalizeItemStatus(status)
  return {
    id: makeId(),
    text: String(text || '').trim().slice(0, MAX_PLAN_ITEM_LENGTH),
    status: resolved,
    done: resolved === ITEM_COMPLETED,
  }
}

/**
 * Coerce an arbitrary value into a valid plan list.
 *
 * Accepts anything: missing, a non-array, or an array of malformed records
 * all degrade to a clean list. Blank items are dropped and duplicate ids are
 * re-generated, so the result is always safe to render keyed by `id`.
 *
 * Legacy items carry only `done`, so status is back-filled from it rather than
 * resetting them to Pending - an item ticked before the tri-state existed must
 * not silently reopen when the app loads.
 */
export function sanitizePlanItems(raw) {
  if (!Array.isArray(raw)) return []

  const seen = new Set()
  const items = []

  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    if (typeof item.text !== 'string') continue

    const text = item.text.trim().slice(0, MAX_PLAN_ITEM_LENGTH)
    if (!text) continue

    let id = typeof item.id === 'string' && item.id ? item.id : makeId()
    if (seen.has(id)) id = makeId()
    seen.add(id)

    const status = item.status
      ? normalizeItemStatus(item.status)
      : item.done
        ? ITEM_COMPLETED
        : 'Pending'

    items.push({ id, text, status, done: status === ITEM_COMPLETED })
  }

  return items
}

/**
 * Completion of a plan as a whole percentage.
 *
 * An empty plan is 0 rather than 100: nothing planned is nothing achieved.
 * Drives the day's progress once a date has arrived, so the 1,000-day grid
 * reflects plan completion without a second set of numbers.
 */
export function planProgressPct(items) {
  if (!Array.isArray(items) || items.length === 0) return 0
  const done = sanitizePlanItems(items).filter(isItemComplete).length
  return Math.round((done / items.length) * 100)
}

/**
 * Set one item's status, returning a new sanitized list.
 *
 * The single write path for item status, so the tri-state and the `done` mirror
 * can never drift apart regardless of which surface the user touched.
 */
export function setPlanItemStatus(items, id, status) {
  const next = normalizeItemStatus(status)
  return sanitizePlanItems(items).map((item) =>
    item.id === id ? { ...item, status: next, done: next === ITEM_COMPLETED } : item,
  )
}

/**
 * Cycle an item through Pending -> In Progress -> Completed -> Pending.
 *
 * Used by the compact toggle affordance. The explicit status control is the
 * better path; this exists for the one-tap checkbox, where a cycle beats opening
 * a picker to move a task one step.
 */
export function cyclePlanItemStatus(items, id) {
  const current = sanitizePlanItems(items).find((item) => item.id === id)
  if (!current) return sanitizePlanItems(items)
  const index = PLAN_ITEM_STATUSES.indexOf(normalizeItemStatus(current.status))
  return setPlanItemStatus(items, id, PLAN_ITEM_STATUSES[(index + 1) % PLAN_ITEM_STATUSES.length])
}

/**
 * Toggle one item by id, returning a new list.
 *
 * Kept for callers that only need done/not-done: it flips between Pending (or
 * In Progress, which is still open) and Completed.
 */
export function togglePlanItem(items, id) {
  return sanitizePlanItems(items).map((item) => {
    if (item.id !== id) return item
    const next = isItemComplete(item) ? 'Pending' : ITEM_COMPLETED
    return { ...item, status: next, done: next === ITEM_COMPLETED }
  })
}

/** How many items are still open (Pending or In Progress). */
export function planRemaining(items) {
  if (!Array.isArray(items)) return 0
  return sanitizePlanItems(items).filter((item) => !isItemComplete(item)).length
}

/**
 * Render a plan as the `To-Do List` text used by the sheet, the data table, and
 * the CSV export.
 *
 * Each item becomes a checkbox line, one per line:
 *   `[x]` completed, `[>]` in progress, `[ ]` pending.
 *
 * This is the format the sheet stores, so it has to be readable and editable by
 * hand in the spreadsheet as well as machine-parseable back into `plannedItems`;
 * see `parseToDoList`.
 *
 * Lines are newline-separated rather than comma- or semicolon-separated so an
 * item containing a comma cannot corrupt the list, and so the cell reads the
 * same way in the sheet as it does in the app.
 */
export function planToText(items) {
  const MARK = { Completed: 'x', 'In Progress': '>', Pending: ' ' }
  return sanitizePlanItems(items)
    .map((item) => `[${MARK[item.status] ?? ' '}] ${item.text}`)
    .join('\n')
}

/**
 * Parse a `To-Do List` cell back into plan items.
 *
 * The inverse of `planToText`, so a round trip through the sheet is lossless.
 * Tolerant by design, because these cells get edited by hand:
 *
 *  - `[x]` `[X]` `[*]` `[-]` -> Completed
 *  - `[>]` `[~]`               -> In Progress
 *  - `[ ]` `[!]`              -> Pending (bare text with no checkbox too)
 *
 * `[*]` and `[-]` are kept as Completed and `[!]` as open because that is what
 * the previous two-state parser did; reinterpreting them here would silently
 * rewrite a hand-typed sheet that the app had already agreed with.
 */
export function parseToDoList(text) {
  if (typeof text !== 'string') return []

  const items = []
  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed) continue

    const match = trimmed.match(/^\[(.)\]\s*(.+)$/)
    if (!match) {
      items.push(createPlanItem(trimmed))
      continue
    }

    const itemText = match[2].trim().slice(0, MAX_PLAN_ITEM_LENGTH)
    if (!itemText) continue

    const mark = match[1].toLowerCase()
    let status = 'Pending'
    if (['x', '*', '-'].includes(mark)) status = ITEM_COMPLETED
    else if (['>', '~'].includes(mark)) status = 'In Progress'

    items.push(createPlanItem(itemText, status))
  }

  return sanitizePlanItems(items)
}
