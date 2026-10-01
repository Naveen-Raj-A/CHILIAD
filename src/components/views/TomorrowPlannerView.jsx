import { useState } from 'react'
import { CalendarClock, Check, Lock, Pencil, Plus, Target, X } from 'lucide-react'
import Headline from '../Headline'
import ProgressBar from '../ProgressBar'
import { cn } from '../../lib/cn'
import { addDaysISO, formatLongDate } from '../../lib/date'
import { createPlanItem, planProgressPct, sanitizePlanItems } from '../../lib/plan'

/** How many past days with a plan the history strip shows. */
const HISTORY_LIMIT = 14

/**
 * Tomorrow Planner.
 *
 * A forward-only planning surface. The single editable target is tomorrow's
 * date; the writer in App (`handleSavePlan`) re-checks that independently, so
 * this view is convenience, not the security boundary.
 *
 * Everything else is read-only. A plan is written against a specific date and
 * stays bound to it: once that date arrives, the same items are the day's
 * official action items inside the Daily Tracker, and neither the plan nor the
 * past can be edited from here. Nothing is copied between records, so there is
 * only ever one copy of a plan.
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
  const tomorrowISO = addDaysISO(todayISO, 1)
  const tomorrow = days.find((day) => day.date === tomorrowISO)

  const [draft, setDraft] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editDraft, setEditDraft] = useState('')

  const items = tomorrow ? sanitizePlanItems(tomorrow.plannedItems) : []

  /** Every edit funnels through here so tomorrowISO is validated once. */
  const commit = (nextItems) => {
    if (!tomorrow) return
    onSavePlan(tomorrow.dayNum, nextItems)
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

  // Newest first, so the most recent plans sit at the top of the strip.
  const history = days
    .filter((day) => day.date < tomorrowISO && sanitizePlanItems(day.plannedItems).length > 0)
    .slice(-HISTORY_LIMIT)
    .reverse()

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

      {/* The one editable surface */}
      <section className="card w-full p-5 sm:p-6" aria-labelledby="planner-heading">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2
              id="planner-heading"
              className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.12em] text-ink-secondary"
            >
              <CalendarClock className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden="true" />
              Tomorrow
              {tomorrow && (
                <span className="normal-case tracking-normal text-ink-muted">
                  {formatLongDate(tomorrow.date)} · Day {tomorrow.dayNum.toLocaleString()}
                </span>
              )}
            </h2>
            <p className="mt-1 text-xs text-ink-secondary">
              Items are bound to this date. They become the day's official action items in
              the Daily Tracker once the date arrives.
            </p>
          </div>

          {tomorrow && (
            <div className="text-right">
              <p className="text-2xs uppercase tracking-wide text-ink-muted">
                {items.length ? `${remaining} of ${items.length} open` : 'Nothing planned'}
              </p>
            </div>
          )}
        </div>

        {!tomorrow ? (
          <p className="mt-5 rounded-lg border border-dashed border-edge px-4 py-8 text-center text-sm text-ink-muted">
            Tomorrow falls outside the 1,000-day window, so there is nothing to plan yet.
          </p>
        ) : (
          <>
            <form onSubmit={handleAdd} className="mt-5 flex items-center gap-2">
              <label className="sr-only" htmlFor="plan-item">
                Add a plan item for tomorrow
              </label>
              <input
                id="plan-item"
                type="text"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="What must be true tomorrow?"
                maxLength={200}
                className="field flex-1"
              />
              <button
                type="submit"
                disabled={!draft.trim()}
                aria-label="Add plan item"
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-ink text-obsidian transition-colors hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Plus className="h-4 w-4" strokeWidth={2.25} />
              </button>
            </form>

            <ProgressBar
              value={progress}
              label="Tomorrow's plan completion"
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
                  className="group flex items-start gap-2 rounded-lg border border-edge bg-surface-input px-2.5 py-2 transition-colors hover:border-edge-strong"
                >
                  <button
                    type="button"
                    onClick={() => handleToggle(item.id)}
                    aria-pressed={item.done}
                    aria-label={`Mark "${item.text}" as ${item.done ? 'not planned' : 'planned'}`}
                    className={cn(
                      'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors',
                      item.done
                        ? 'border-emerald-500/60 bg-emerald-500 text-obsidian'
                        : 'border-edge-strong bg-surface hover:border-neutral-600',
                    )}
                  >
                    {item.done && <Check className="h-3 w-3" strokeWidth={3} />}
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
                        'min-w-0 flex-1 break-words text-left text-xs leading-relaxed transition-colors',
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
                    <span className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                      <button
                        type="button"
                        onClick={() => beginEdit(item)}
                        aria-label={`Edit plan item: ${item.text}`}
                        className="rounded p-0.5 text-ink-muted transition-colors hover:text-ink"
                      >
                        <Pencil className="h-3 w-3" strokeWidth={2} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemove(item.id)}
                        aria-label={`Remove plan item: ${item.text}`}
                        className="rounded p-0.5 text-ink-muted transition-colors hover:text-red-400"
                      >
                        <X className="h-3 w-3" strokeWidth={2} />
                      </button>
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      {/* Read-only history */}
      <section className="card w-full p-5" aria-labelledby="plan-history-heading">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2
            id="plan-history-heading"
            className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.12em] text-ink-secondary"
          >
            <Target className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden="true" />
            Settled Plans
          </h2>
          <p className="text-xs text-ink-muted">Read-only · last {HISTORY_LIMIT} days</p>
        </div>

        {history.length === 0 ? (
          <p className="mt-4 rounded-lg border border-dashed border-edge px-4 py-8 text-center text-xs text-ink-muted">
            No plans have settled yet.
          </p>
        ) : (
          <ul className="mt-4 space-y-2">
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
                      <Lock
                        className="h-3 w-3 shrink-0 text-ink-muted"
                        strokeWidth={2.5}
                        aria-hidden="true"
                      />
                      <span className="text-xs text-ink">
                        Day {day.dayNum.toLocaleString()}
                        <span className="ml-1.5 text-ink-muted">
                          {formatLongDate(day.date)}
                        </span>
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => onOpenInTracker(day.dayNum)}
                      className="text-xs font-medium text-ink underline decoration-ink-muted underline-offset-4 transition-colors hover:decoration-ink"
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
          </ul>
        )}
      </section>
    </div>
  )
}
