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

/** Create a stable unique id without extra dependencies. */
function makeId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

/** Build a new, unticked plan item from raw input text. */
export function createPlanItem(text) {
  return {
    id: makeId(),
    text: String(text || '').trim().slice(0, MAX_PLAN_ITEM_LENGTH),
    done: false,
  }
}

/**
 * Coerce an arbitrary value into a valid plan list.
 *
 * Accepts anything: missing, a non-array, or an array of malformed records
 * all degrade to a clean list. Blank items are dropped and duplicate ids are
 * re-generated, so the result is always safe to render keyed by `id`.
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

    items.push({ id, text, done: Boolean(item.done) })
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
  const done = items.filter((item) => item.done).length
  return Math.round((done / items.length) * 100)
}

/** Toggle one item by id, returning a new list. */
export function togglePlanItem(items, id) {
  return sanitizePlanItems(items).map((item) =>
    item.id === id ? { ...item, done: !item.done } : item,
  )
}

/** How many items remain unticked. */
export function planRemaining(items) {
  if (!Array.isArray(items)) return 0
  return items.filter((item) => !item.done).length
}

/** Plain-text rendering of a plan, used by the CSV export. */
export function planToText(items) {
  const list = sanitizePlanItems(items)
  return list.map((item) => `[${item.done ? 'x' : '!'}] ${item.text}`).join('; ')
}
