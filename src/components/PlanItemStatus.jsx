import { PLAN_ITEM_STATUSES } from '../lib/plan'
import { cn } from '../lib/cn'

/**
 * Per-item status control: Pending | In Progress | Completed.
 *
 * Shared by the TO - DO planner and the Daily Tracker so the same task can never
 * present two different controls or two different vocabularies depending on
 * which screen the user happens to be looking at.
 *
 * Deliberately a native `<select>` rather than a custom dropdown:
 *
 *  - On touch it opens the OS picker, which is the only reliably correct way to
 *    get a three-way choice into a thumb-sized target. A custom popover has to
 *    re-implement scrolling, dismissal and focus handling to be worse at it.
 *  - It is keyboard- and screen-reader-correct for free, and it reports its own
 *    value to assistive tech without an aria-live workaround.
 *
 * Always visible rather than revealed on hover. A hover-only control is
 * unreachable on the platform most of this app's users are on: there is no
 * hover, and a control that appears only on hover cannot be the first thing a
 * finger reaches. The edit/remove actions beside it still collapse behind
 * `pointer:fine`, because those are destructive or rare, whereas status is the
 * most common thing anyone does to a task.
 */
const STATUS_DOT = {
  Pending: 'bg-ink-muted',
  'In Progress': 'bg-sky-400',
  Completed: 'bg-emerald-400',
}

const STATUS_TEXT = {
  Pending: 'text-ink-secondary',
  'In Progress': 'text-sky-400',
  Completed: 'text-emerald-400',
}

export default function PlanItemStatus({ id, value, itemText, onChange, disabled = false }) {
  const controlId = `item-status-${id}`

  return (
    <span className="flex shrink-0 items-center gap-1.5">
      <span
        className={cn('h-2 w-2 shrink-0 rounded-full', STATUS_DOT[value] ?? 'bg-ink-muted')}
        aria-hidden="true"
      />
      <label className="sr-only" htmlFor={controlId}>
        Status for {itemText}
      </label>
      <select
        id={controlId}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className={cn(
          // h-11 keeps the 44px touch target; the 2xs text keeps the row dense.
          'h-11 cursor-pointer rounded-lg border border-edge-strong bg-surface-input',
          'py-0 pl-1.5 pr-1 text-2xs font-medium',
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400',
          disabled && 'cursor-not-allowed opacity-60',
          STATUS_TEXT[value] ?? 'text-ink-secondary',
        )}
      >
        {PLAN_ITEM_STATUSES.map((status) => (
          <option key={status} value={status}>
            {status}
          </option>
        ))}
      </select>
    </span>
  )
}