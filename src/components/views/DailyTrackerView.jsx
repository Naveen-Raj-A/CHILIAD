import { useState } from 'react'
import { Check, CheckCircle2, ChevronLeft, ChevronRight, Lock, Save, X } from 'lucide-react'
import StatusBadge from '../StatusBadge'
import PlanItemStatus from '../PlanItemStatus'
import ProgressBar from '../ProgressBar'
import NotesCanvas from '../NotesCanvas'
import { cn } from '../../lib/cn'
import { LOCK_PAST, LOCK_TODAY, LOCK_FUTURE, canEdit, lockLabel, lockState } from '../../lib/lock'
import {
  cyclePlanItemStatus,
  isItemComplete,
  planProgressPct,
  sanitizePlanItems,
  setPlanItemStatus,
} from '../../lib/plan'
import { TOTAL_DAYS, formatLongDate } from '../../lib/date'

/** Today is the only editable day; everything else is viewable at most. */
function fieldClass(disabled) {
  return cn('field', disabled && 'cursor-not-allowed opacity-60')
}

/**
 * Daily Tracker: the one and only editor for a journey day.
 *
 * The dashboard is deliberately read-only, so this surface owns every write.
 * Today is editable, past days are read-only, and future days are locked out
 * before they can even be selected. The lockdown is applied to the controls
 * themselves rather than only being caught on save, and App re-checks it as
 * defence in depth.
 *
 * Holds its own draft so typing never mutates the journey dataset; changes are
 * committed only when Save is pressed.
 */
export default function DailyTrackerView({ days, selectedDayNum, onSelectDay, onSave, todayISO }) {
  const [draft, setDraft] = useState(null)
  const [dirtyDay, setDirtyDay] = useState(null)

  // Show the stored entry unless the user is mid-edit on this same day.
  const entry = days[selectedDayNum - 1]
  const editing = dirtyDay === selectedDayNum && draft
  const values = editing ? draft : entry
  const isDirty = Boolean(editing)

  const state = lockState(entry, todayISO)
  const editable = canEdit(entry, todayISO)
  const isToday = entry?.date === todayISO

  // A day carrying a plan owns its progress: it is derived from the checklist,
  // so the field is shown but not typed into.
  const planItems = entry ? sanitizePlanItems(entry.plannedItems) : []
  const hasPlan = planItems.length > 0

  const goToDay = (next) => {
    const clamped = Math.min(Math.max(next, 1), TOTAL_DAYS)
    setDraft(null)
    setDirtyDay(null)
    onSelectDay(clamped)
  }

  const update = (key) => (event) => {
    const raw = event.target.value
    const value = event.target.type === 'number' ? Number(raw) : raw
    setDraft((prev) => ({ ...(prev || entry), [key]: value }))
    setDirtyDay(selectedDayNum)
  }

  /** Move a planned item through its status cycle and commit immediately. */
  const handleTogglePlanItem = (id) => {
    if (!editable || !entry) return
    onSave({ ...entry, plannedItems: cyclePlanItemStatus(planItems, id) })
  }

  /**
   * Set an item's status explicitly.
   *
   * Same write path as the planner's control and the same day record, so a task
   * moved to "Completed" here and one moved in the TO - DO view are the same
   * edit - whichever screen the user happened to use, the day's progress and
   * status follow.
   */
  const handlePlanItemStatus = (id, status) => {
    if (!editable || !entry) return
    onSave({ ...entry, plannedItems: setPlanItemStatus(planItems, id, status) })
  }

  /**
   * Drop a planned item and commit immediately.
   *
   * Removing the last item is allowed: the day simply falls back to a manual
   * percentage rather than being stranded at 0 with an empty checklist.
   */
  const handleRemovePlanItem = (id) => {
    if (!editable || !entry) return
    onSave({ ...entry, plannedItems: planItems.filter((item) => item.id !== id) })
  }

  const handleSave = () => {
    onSave({ ...values })
    setDraft(null)
    setDirtyDay(null)
  }

  const handleDiscard = () => {
    setDraft(null)
    setDirtyDay(null)
  }

  /**
   * Close the day out in one action.
   *
   * On a planned day this ticks the whole checklist rather than typing 100%,
   * because progress there is derived from the checklist: writing the number
   * directly would be recomputed away on the next save and the button would
   * silently do nothing.
   */
  const handleMarkComplete = () => {
    if (!editable) return
    if (hasPlan) {
      onSave({
        ...values,
        plannedItems: planItems.map((item) => ({
          ...item,
          status: 'Completed',
          done: true,
        })),
      })
    } else {
      onSave({ ...values, progress: 100 })
    }
    setDraft(null)
    setDirtyDay(null)
  }

  return (
    <div className="w-full space-y-6">
      {/* Header + day navigation */}
      <div className="card p-4 md:p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-2xs font-medium uppercase tracking-[0.16em] text-ink-muted">
              Daily Tracker
            </p>
            <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
              Day{' '}
              <span className="tabular-nums">{selectedDayNum.toLocaleString()}</span>{' '}
              <span className="text-ink-muted">of {TOTAL_DAYS.toLocaleString()}</span>
            </h1>
            <p className="mt-1 text-sm text-ink-secondary">
              {entry ? formatLongDate(entry.date) : ''}
              {isToday && (
                <span className="ml-2 rounded-full bg-emerald-500/20 px-2 py-0.5 text-2xs font-medium uppercase tracking-wide text-emerald-400">
                  Today
                </span>
              )}
            </p>
          </div>
          <StatusBadge status={values.status} className="text-xs" />
        </div>

        {/* Day selector */}
        <div className="mt-5 flex items-center gap-2">
          <button
            type="button"
            onClick={() => goToDay(selectedDayNum - 1)}
            disabled={selectedDayNum <= 1}
            aria-label="Previous day"
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-edge-strong bg-surface-input text-ink-secondary transition-colors hover:bg-surface-hover hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <select
            aria-label="Select day"
            value={selectedDayNum}
            onChange={(event) => goToDay(Number(event.target.value))}
            className="field flex-1 appearance-none text-center tabular-nums"
          >
            {days.map((day) => {
              const dayState = lockState(day, todayISO)
              return (
                <option
                  key={day.dayNum}
                  value={day.dayNum}
                  disabled={dayState === LOCK_FUTURE}
                >
                  Day {day.dayNum} - {formatLongDate(day.date)}
                  {dayState === LOCK_PAST ? ' (read-only)' : ''}
                  {dayState === LOCK_FUTURE ? ' (locked)' : ''}
                </option>
              )
            })}
          </select>

          <button
            type="button"
            onClick={() => goToDay(selectedDayNum + 1)}
            disabled={selectedDayNum >= TOTAL_DAYS}
            aria-label="Next day"
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-edge-strong bg-surface-input text-ink-secondary transition-colors hover:bg-surface-hover hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Entry form */}
      <div className="card space-y-5 p-4 md:p-5 md:space-y-5 md:p-6">
        {/* Lockdown state is stated up front, not only on the disabled inputs. */}
        <div
          className={cn(
            'flex items-center gap-2 rounded-lg border px-3 py-2',
            state === LOCK_TODAY
              ? 'border-emerald-500/30 bg-emerald-500/10'
              : 'border-edge bg-surface-input',
          )}
        >
          <Lock
            className={cn(
              'h-3.5 w-3.5 shrink-0',
              state === LOCK_TODAY ? 'text-emerald-400' : 'text-ink-muted',
            )}
            strokeWidth={2.5}
            aria-hidden="true"
          />
          <p
            className={cn(
              'text-xs',
              state === LOCK_TODAY ? 'text-emerald-400' : 'text-ink-secondary',
            )}
          >
            {lockLabel(state)}
          </p>
        </div>

        {isDirty && (
          <p className="inline-flex items-center gap-1.5 rounded-full bg-sky-500/20 px-2.5 py-1 text-2xs font-medium uppercase tracking-wide text-sky-400">
            Unsaved changes
          </p>
        )}

        {/* Planned action items, planned in the Tomorrow Planner and now due. */}
        {hasPlan && (
          <div className="rounded-lg border border-edge bg-surface-input p-3 md:p-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-2xs font-semibold uppercase tracking-[0.12em] text-ink-secondary">
                Today's planned items
              </h3>
              <span className="text-2xs tabular-nums text-ink-muted">
                {planProgressPct(planItems)}% complete
              </span>
            </div>

            {/*
                Hover quick actions. The checkbox is always clickable, but it
                is a small target that requires precision; these are extra
                affordances for finishing a line without hunting for it.

                On a touch device there is no hover to reveal them, so they are
                permanently visible there and only collapse behind a hover on a
                device that actually has a pointer. `pointer-fine` keys off the
                input device rather than viewport width, so a touch tablet stays
                usable instead of inheriting the desktop hover behaviour.
              */}
            <ul className="mt-3 space-y-1">
              {planItems.map((item) => (
                <li
                  key={item.id}
                  className="group flex items-center gap-2 rounded-md px-1 py-0.5 transition-colors hover:bg-surface-hover/50"
                >
                  <button
                    type="button"
                    role="checkbox"
                    // 'mixed' is the ARIA value for the half-done state, which is
                    // exactly what a tri-state task is. Reporting a boolean here
                    // would tell assistive tech the task is untouched.
                    aria-checked={
                      isItemComplete(item) ? true : item.status === 'In Progress' ? 'mixed' : false
                    }
                    disabled={!editable}
                    onClick={() => handleTogglePlanItem(item.id)}
                    aria-label={`${item.status === 'Pending' ? 'Start' : isItemComplete(item) ? 'Reopen' : 'Complete'} "${item.text}"`}
                    className={cn(
                      // The 44px box is the tap target; the 16px square drawn
                      // inside it is the visual, centred. Growing the square
                      // itself would wreck the list's density.
                      'flex h-11 w-11 shrink-0 items-center justify-center rounded transition-colors',
                      !editable && 'cursor-not-allowed',
                    )}
                  >
                    <span
                      className={cn(
                        'flex h-4 w-4 items-center justify-center rounded border transition-colors',
                        isItemComplete(item)
                          ? 'border-emerald-500/60 bg-emerald-500 text-obsidian'
                          : item.status === 'In Progress'
                            ? 'border-sky-400 bg-sky-400/20'
                            : 'border-edge-strong bg-surface hover:border-neutral-600',
                      )}
                    >
                      {isItemComplete(item) && <Check className="h-3 w-3" strokeWidth={3} />}
                    </span>
                  </button>
                  <span
                    className={cn(
                      'min-w-0 flex-1 py-2 break-words text-xs leading-relaxed',
                      isItemComplete(item)
                        ? 'text-ink-muted line-through'
                        : item.status === 'In Progress'
                          ? 'text-sky-400'
                          : 'text-ink-secondary',
                    )}
                  >
                    {item.text}
                  </span>

                  {/*
                    Always visible, at every viewport. Status is the most common
                    thing anyone does to a task, so it must not depend on hover;
                    the destructive remove action below still collapses behind
                    `pointer:fine`, which is the right trade for the opposite
                    reason.
                  */}
                  <PlanItemStatus
                    id={item.id}
                    value={item.status}
                    itemText={item.text}
                    onChange={(status) => handlePlanItemStatus(item.id, status)}
                    disabled={!editable}
                  />

                  {editable && (
                    <span className="flex shrink-0 items-center gap-1 opacity-100 transition-opacity focus-within:opacity-100 [@media(pointer:fine)]:opacity-0 [@media(pointer:fine)]:group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={() => handleTogglePlanItem(item.id)}
                        title={isItemComplete(item) ? 'Reopen item' : 'Mark done'}
                        aria-label={`${isItemComplete(item) ? 'Reopen' : 'Mark done'}: ${item.text}`}
                        className="flex h-11 w-11 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-surface-input hover:text-emerald-400 active:bg-surface-input"
                      >
                        <Check className="h-4 w-4" strokeWidth={2.5} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemovePlanItem(item.id)}
                        title="Remove item"
                        aria-label={`Remove: ${item.text}`}
                        className="flex h-11 w-11 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-surface-input hover:text-red-400 active:bg-surface-input"
                      >
                        <X className="h-4 w-4" strokeWidth={2.5} />
                      </button>
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Two-column workspace: identity/plan on the left, narrative on the right. */}
        <div className="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-2">
          {/* Left column */}
          <div className="space-y-5">
            <div>
              <label className="label" htmlFor="tracker-mainTasks">
                Main Tasks
              </label>
              <input
                id="tracker-mainTasks"
                type="text"
                disabled={!editable}
                className={fieldClass(!editable)}
                placeholder="What must be true by end of day?"
                value={values.mainTasks}
                onChange={update('mainTasks')}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <span className="label">Status</span>
                <div className="flex h-11 items-center gap-2 rounded-lg border border-edge bg-surface-input px-3">
                  <StatusBadge status={values.status} />
                </div>
                <p className="mt-1 text-2xs text-ink-muted">
                  Derived from the date, progress, and checklist.
                </p>
              </div>

              <div>
                <label className="label" htmlFor="tracker-progress">
                  Progress %
                </label>
                <div className="relative">
                  <input
                    id="tracker-progress"
                    type="number"
                    min="0"
                    max="100"
                    step="5"
                    readOnly={hasPlan || !editable}
                    aria-describedby="tracker-progress-hint"
                    className={cn(
                      fieldClass(!editable),
                      'pr-8 tabular-nums',
                      hasPlan && 'cursor-not-allowed opacity-60',
                    )}
                    value={values.progress}
                    onChange={update('progress')}
                  />
                  <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-ink-muted">
                    %
                  </span>
                </div>
                <p id="tracker-progress-hint" className="mt-1 text-2xs text-ink-muted">
                  {hasPlan
                    ? `Derived from ${planItems.length} planned item(s)`
                    : 'Type a percentage, or plan the day ahead.'}
                </p>
              </div>
            </div>

            <ProgressBar
              value={values.progress}
              label="Day progress"
              tone={values.progress >= 100 ? 'emerald' : 'sky'}
              size="lg"
              showValue
            />
          </div>

          {/* Right column */}
          <div className="space-y-5">
            <div>
              <label className="label" htmlFor="tracker-details">
                Details / Log
              </label>
              <textarea
                id="tracker-details"
                rows={7}
                disabled={!editable}
                className={cn(fieldClass(!editable), 'resize-y')}
                placeholder="Log the work as it happened."
                value={values.details}
                onChange={update('details')}
              />
            </div>

            <div>
              <label className="label" htmlFor="tracker-notes">
                Notes &amp; Reflections
              </label>
              <textarea
                id="tracker-notes"
                rows={7}
                disabled={!editable}
                className={cn(fieldClass(!editable), 'resize-y')}
                placeholder="What did you learn? What changes tomorrow?"
                value={values.notes}
                onChange={update('notes')}
              />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-edge pt-4">
          {editable && values.status !== 'Completed' && (
            <button
              type="button"
              onClick={handleMarkComplete}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2 text-sm font-medium text-emerald-400 transition-colors hover:bg-emerald-500/20"
            >
              <CheckCircle2 className="h-4 w-4" strokeWidth={2.25} />
              Mark day complete
            </button>
          )}

          <button
            type="button"
            onClick={handleDiscard}
            disabled={!isDirty}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-edge-strong bg-surface-input px-3.5 py-2 text-sm font-medium text-ink-secondary transition-colors hover:bg-surface-hover hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
          >
            <X className="h-4 w-4" strokeWidth={2} />
            Discard
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!isDirty || !editable}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-obsidian transition-colors hover:bg-neutral-200 active:bg-neutral-300 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Save className="h-4 w-4" strokeWidth={2.25} />
            Save Day
          </button>
        </div>
      </div>

      {/* Shared scratchpad: identical to the one on the Dashboard. */}
      <NotesCanvas />

      {/* Quick paging */}
      <div className="flex items-center justify-center gap-2 pb-2">
        <button
          type="button"
          onClick={() => goToDay(selectedDayNum - 1)}
          disabled={selectedDayNum <= 1}
          className="inline-flex min-h-[44px] items-center rounded-lg border border-edge-strong bg-surface-input px-3 py-1.5 text-xs text-ink-secondary transition-colors hover:bg-surface-hover hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
        >
          Previous
        </button>
        <span className="px-2 text-xs tabular-nums text-ink-muted">
          Day {selectedDayNum.toLocaleString()} of {TOTAL_DAYS.toLocaleString()}
        </span>
        <button
          type="button"
          onClick={() => goToDay(selectedDayNum + 1)}
          disabled={selectedDayNum >= TOTAL_DAYS}
          className="inline-flex min-h-[44px] items-center rounded-lg border border-edge-strong bg-surface-input px-3 py-1.5 text-xs text-ink-secondary transition-colors hover:bg-surface-hover hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  )
}
