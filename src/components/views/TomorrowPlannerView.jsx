import { useMemo, useState } from 'react'
import { CalendarClock, Check, Lock, Pencil, Plus, Target, X } from 'lucide-react'
import Headline from '../Headline'
import ProgressBar from '../ProgressBar'
import StatusBadge from '../StatusBadge'
import { cn } from '../../lib/cn'
import { formatLongDate } from '../../lib/date'
import { createPlanItem, planProgressPct, sanitizePlanItems } from '../../lib/plan'

/** How many upcoming days the planner offers to queue work against. */
const UPCOMING_LIMIT = 30
/**
 * TO - DO: forward-only planning.
 *
 * Any future date can be queued - tomorrow, or three weeks out - and each plan
 * stays bound to the date it was written for. Today and the past are
 * unreachable from here: the writer in App (`handleSavePlan`) rejects anything
 * that is not strictly in the future, so this view is convenience, not the
 * security boundary.
 *
 * When a queued date arrives, its plan becomes that day's official action items
 * in the Daily Tracker. Nothing is copied between records, so there is only
 * ever one copy of a plan and no migration to reconcile.
 */
export default function TomorrowPlannerView({
  days,
  todayISO,
  selectedDayNum,
  syncStatus,
  pendingCount,
  onSavePlan,
  onOpenInTracker,
}) {
  const upcoming = useMemo(
    () => days.filter((day) => day.date > todayISO).slice(0, UPCOMING_LIMIT),
    [days, todayISO],
  )

  // Default to the nearest future day, and keep a valid target selected even
  // after a day is planned to the end and rolls off the end of the window.
  const [targetDayNum, setTargetDayNum] = useState(() => upcoming[0]?.dayNum ?? 0)
  const active = upcoming.find((day) => day.dayNum === targetDayNum) || upcoming[0] || null

  const [draft, setDraft] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editDraft, setEditDraft] = useState('')

  const items = active ? sanitizePlanItems(active.plannedItems) : []

  /** Every edit funnels through here so the write path is validated once. */
  const commit = (nextItems) => {
    if (!active) return
    onSavePlan(active.dayNum, nextItems)
  }

  const handleAdd = (event) => {
    event.preventDefault()
    const text = draft.trim()
    if (!text) return
    commit([...items, createPlanItem(text)])
    setDraft('')
  }

  const handleToggle = (id) => {
    commit(items.map((item) => (item.id === id ? { ...item, done: !item.done } : item)))
  }

  const handleRemove = (id) => {
    commit(items.filter((item) => item.id !== id))
  }

  const beginEdit = (item) => {
    setEditingId(item.id)
    setEditDraft(item.text)
  }

  const commitEdit = () => {
    const text = editDraft.trim()
    if (text && editingId) {
      commit(items.map((item) => (item.id === editingId ? { ...item, text } : item)))
    }
    setEditingId(null)
    setEditDraft('')
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditDraft('')
  }

  /**
   * Settled plans, oldest first: Day 1, Day 2, Day 3 ...
   *
   * A day settles the moment its date is in the past, so the list is built by
   * filtering on the date rather than on day number, then sorted explicitly.
   * `days` already arrives in ascending order, so the sort is a no-op today —
   * it is here to make the ordering a stated guarantee instead of an accident
   * of how the caller happened to build the array.
   */
  const history = days
    .filter((day) => day.date < todayISO && sanitizePlanItems(day.plannedItems).length > 0)
    .slice()
    .sort((a, b) => a.dayNum - b.dayNum)

  const progress = planProgressPct(items)
  const remaining = items.filter((item) => !item.done).length

  return (
    <div className="w-full space-y-6">
      <Headline
        dayNum={selectedDayNum}
        syncStatus={syncStatus}
        pendingCount={pendingCount}
        subtitle="TO - DO"
      />

      {/* Upcoming day picker: any future date can be queued. */}
      {upcoming.length > 0 && (
        <section className="card w-full p-4" aria-labelledby="upcoming-heading">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2
              id="upcoming-heading"
              className="text-2xs font-semibold uppercase tracking-[0.12em] text-ink-secondary"
            >
              Upcoming
            </h2>
            <p className="text-2xs text-ink-muted">
              Next {upcoming.length} day{upcoming.length === 1 ? '' : 's'}
            </p>
          </div>

          <div className="mt-3 flex gap-1.5 overflow-x-auto overscroll-x-contain pb-1">
            {upcoming.map((day) => {
              const isActive = active?.dayNum === day.dayNum
              const count = sanitizePlanItems(day.plannedItems).length
              return (
                <button
                  key={day.dayNum}
                  type="button"
                  onClick={() => setTargetDayNum(day.dayNum)}
                  aria-pressed={isActive}
                  className={cn(
                    'flex min-h-[44px] min-w-[4.75rem] flex-shrink-0 flex-col items-center justify-center gap-0.5 rounded-lg border px-2.5 py-2 transition-colors',
                    isActive
                      ? 'border-ink bg-ink text-obsidian'
                      : 'border-edge-strong bg-surface-input text-ink-secondary hover:bg-surface-hover hover:text-ink',
                  )}
                >
                  <span className="text-2xs uppercase tracking-wide opacity-70">
                    Day {day.dayNum}
                  </span>
                  <span className="text-2xs tabular-nums opacity-60">
                    {formatLongDate(day.date).replace(/,.*/, '')}
                  </span>
                  <span
                    className={cn(
                      'text-2xs font-semibold tabular-nums',
                      isActive ? '' : count > 0 ? 'text-sky-400' : 'text-ink-muted',
                    )}
                  >
                    {count > 0 ? `${count} item${count === 1 ? '' : 's'}` : '—'}
                  </span>
                </button>
              )
            })}
          </div>
        </section>
      )}

      {/* The one editable surface */}
      <section className="card w-full p-4 md:p-5 md:p-6" aria-labelledby="planner-heading">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2
              id="planner-heading"
              className="flex flex-wrap items-center gap-2 text-sm font-semibold uppercase tracking-[0.12em] text-ink-secondary"
            >
              <CalendarClock className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden="true" />
              {active ? `Day ${active.dayNum.toLocaleString()}` : 'Queue'}
              {active && (
                <span className="normal-case tracking-normal text-ink-muted">
                  {formatLongDate(active.date)}
                </span>
              )}
            </h2>
            <p className="mt-1 text-xs text-ink-secondary">
              Items are bound to this date. They become the day's official action items in
              the Daily Tracker once the date arrives.
            </p>
          </div>

          {active && (
            <p className="text-2xs uppercase tracking-wide text-ink-muted">
              {items.length ? `${remaining} of ${items.length} open` : 'Nothing queued'}
            </p>
          )}
        </div>

        {!active ? (
          <p className="mt-5 rounded-lg border border-dashed border-edge px-4 py-8 text-center text-sm text-ink-muted">
            There are no future days left in the 1,000-day window to plan against.
          </p>
        ) : (
          <>
            <form onSubmit={handleAdd} className="mt-5 flex items-center gap-2">
              <label className="sr-only" htmlFor="plan-item">
                Add a plan item for Day {active.dayNum}
              </label>
              <input
                id="plan-item"
                type="text"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="What must be true by this day?"
                maxLength={200}
                className="field flex-1"
              />
              <button
                type="submit"
                disabled={!draft.trim()}
                aria-label="Add plan item"
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-ink text-obsidian transition-colors hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Plus className="h-4 w-4" strokeWidth={2.25} />
              </button>
            </form>

            <ProgressBar
              value={progress}
              label={`Day ${active.dayNum} plan completion`}
              tone={progress === 100 ? 'emerald' : 'sky'}
              className="mt-4"
              showValue
            />

            <ul className="mt-4 space-y-1.5">
              {items.length === 0 && (
                <li className="rounded-lg border border-dashed border-edge px-3 py-4 text-center text-2xs text-ink-muted">
                  Nothing planned for tomorrow yet — add the first item above.
                </li>
              )}

              {items.map((item) => (
                <li
                  key={item.id}
                  className="group flex items-start gap-1 rounded-lg border border-edge bg-surface-input px-2 py-1 transition-colors hover:border-edge-strong"
                >
                  <button
                    type="button"
                    onClick={() => handleToggle(item.id)}
                    aria-pressed={item.done}
                    aria-label={`Mark "${item.text}" as ${item.done ? 'not planned' : 'planned'}`}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded transition-colors"
                  >
                    <span
                      className={cn(
                        'flex h-4 w-4 items-center justify-center rounded border transition-colors',
                        item.done
                          ? 'border-emerald-500/60 bg-emerald-500 text-obsidian'
                          : 'border-edge-strong bg-surface hover:border-neutral-600',
                      )}
                    >
                      {item.done && <Check className="h-3 w-3" strokeWidth={3} />}
                    </span>
                  </button>

                  {editingId === item.id ? (
                    <input
                      autoFocus
                      type="text"
                      value={editDraft}
                      onChange={(event) => setEditDraft(event.target.value)}
                      onBlur={commitEdit}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') commitEdit()
                        if (event.key === 'Escape') cancelEdit()
                      }}
                      aria-label="Edit plan item"
                      className="field min-w-0 flex-1 px-2 py-0.5 text-xs"
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleToggle(item.id)}
                      onDoubleClick={() => beginEdit(item)}
                      className={cn(
                        'flex min-h-[44px] min-w-0 flex-1 items-center break-words py-1 text-left text-xs leading-relaxed transition-colors',
                        item.done
                          ? 'text-ink-muted line-through'
                          : 'text-ink-secondary hover:text-ink',
                      )}
                      title={item.text}
                    >
                      {item.text}
                    </button>
                  )}

                  {editingId !== item.id && (
                    <span className="flex shrink-0 items-center gap-1 opacity-100 transition-opacity focus-within:opacity-100 [@media(pointer:fine)]:opacity-0 [@media(pointer:fine)]:group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={() => beginEdit(item)}
                        aria-label={`Edit plan item: ${item.text}`}
                        className="flex h-11 w-11 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-surface-input hover:text-ink active:bg-surface-input"
                      >
                        <Pencil className="h-4 w-4" strokeWidth={2} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemove(item.id)}
                        aria-label={`Remove plan item: ${item.text}`}
                        className="flex h-11 w-11 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-surface-input hover:text-red-400 active:bg-surface-input"
                      >
                        <X className="h-4 w-4" strokeWidth={2} />
                      </button>
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      {/* Settled plans, in strict chronological order. */}
      <section className="card w-full p-4 md:p-5" aria-labelledby="plan-history-heading">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2
            id="plan-history-heading"
            className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.12em] text-ink-secondary"
          >
            <Target className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden="true" />
            Settled Plans
          </h2>
          <p className="text-xs text-ink-muted">
            Read-only · {history.length} day{history.length === 1 ? '' : 's'} in order
          </p>
        </div>

        {history.length === 0 ? (
          <p className="mt-4 rounded-lg border border-dashed border-edge px-4 py-8 text-center text-xs text-ink-muted">
            No plans have settled yet.
          </p>
        ) : (
          <ol className="mt-4 space-y-2">
            {history.map((day) => {
              const dayItems = sanitizePlanItems(day.plannedItems)
              const dayProgress = planProgressPct(dayItems)
              return (
                <li
                  key={day.dayNum}
                  className="rounded-lg border border-edge bg-surface-input p-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-surface px-1.5 py-0.5 text-2xs font-semibold tabular-nums text-ink-secondary">
                        Day {day.dayNum.toLocaleString()}
                      </span>
                      <StatusBadge status={day.status} />
                      <span className="text-2xs tabular-nums text-ink-muted">
                        {formatLongDate(day.date)}
                      </span>
                      <Lock
                        className="h-3 w-3 shrink-0 text-ink-muted"
                        strokeWidth={2.5}
                        aria-label="Read-only"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => onOpenInTracker(day.dayNum)}
                      className="inline-flex min-h-[44px] items-center text-xs font-medium text-ink underline decoration-ink-muted underline-offset-4 transition-colors hover:decoration-ink"
                    >
                      Open in tracker
                    </button>
                  </div>

                  <p className="mt-2 text-xs leading-relaxed text-ink-secondary">
                    {dayItems.map((item) => item.text).join(' · ')}
                  </p>

                  <ProgressBar
                    value={dayProgress}
                    label={`Day ${day.dayNum} plan completion`}
                    tone={dayProgress === 100 ? 'emerald' : 'sky'}
                    size="sm"
                    className="mt-2.5"
                    showValue
                  />
                </li>
              )
            })}
          </ol>
        )}
      </section>
    </div>
  )
}
