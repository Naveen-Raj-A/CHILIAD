import { useState } from 'react'
import { ChevronLeft, ChevronRight, Save, X } from 'lucide-react'
import StatusBadge from '../StatusBadge'
import ProgressBar from '../ProgressBar'
import { STATUSES } from '../../lib/status'
import { TOTAL_DAYS, formatLongDate } from '../../lib/date'

/**
 * Daily Tracker: a focused, full-width logging surface for a single day.
 *
 * Holds its own draft so typing never mutates the journey dataset; changes
 * are committed only when Save is pressed.
 */
export default function DailyTrackerView({ days, selectedDayNum, onSelectDay, onSave, todayISO }) {
  const [draft, setDraft] = useState(null)
  const [dirtyDay, setDirtyDay] = useState(null)

  // Show the stored entry unless the user is mid-edit on this same day.
  const entry = days[selectedDayNum - 1]
  const editing = dirtyDay === selectedDayNum && draft
  const values = editing ? draft : entry
  const isDirty = Boolean(editing)

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

  const handleSave = () => {
    onSave({ ...values })
    setDraft(null)
    setDirtyDay(null)
  }

  const handleDiscard = () => {
    setDraft(null)
    setDirtyDay(null)
  }

  const isToday = entry?.date === todayISO


  return (
    <div className="w-full space-y-6">
      {/* Header + day navigation */}
      <div className="card p-5">
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
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-edge-strong bg-surface-input text-ink-secondary transition-colors hover:bg-surface-hover hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <select
            aria-label="Select day"
            value={selectedDayNum}
            onChange={(event) => goToDay(Number(event.target.value))}
            className="field flex-1 appearance-none text-center tabular-nums"
          >
            {days.map((day) => (
              <option key={day.dayNum} value={day.dayNum}>
                Day {day.dayNum} - {formatLongDate(day.date)}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => goToDay(selectedDayNum + 1)}
            disabled={selectedDayNum >= TOTAL_DAYS}
            aria-label="Next day"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-edge-strong bg-surface-input text-ink-secondary transition-colors hover:bg-surface-hover hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>


      {/* Entry form */}
      <div className="card space-y-5 p-5 sm:p-6">
        {isDirty && (
          <p className="inline-flex items-center gap-1.5 rounded-full bg-sky-500/20 px-2.5 py-1 text-2xs font-medium uppercase tracking-wide text-sky-400">
            Unsaved changes
          </p>
        )}

        {/* Two-column workspace: identity/plan on the left, narrative on the right. */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Left column */}
          <div className="space-y-5">
            <div>
              <label className="label" htmlFor="tracker-mainTasks">
                Main Tasks
              </label>
              <input
                id="tracker-mainTasks"
                type="text"
                className="field"
                placeholder="What must be true by end of day?"
                value={values.mainTasks}
                onChange={update('mainTasks')}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="tracker-status">
                  Status
                </label>
                <select
                  id="tracker-status"
                  className="field appearance-none"
                  value={values.status}
                  onChange={update('status')}
                >
                  {STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
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
                    className="field pr-8 tabular-nums"
                    value={values.progress}
                    onChange={update('progress')}
                  />
                  <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-ink-muted">
                    %
                  </span>
                </div>
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
                className="field resize-y"
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
                className="field resize-y"
                placeholder="What did you learn? What changes tomorrow?"
                value={values.notes}
                onChange={update('notes')}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-edge pt-4">
          <button
            type="button"
            onClick={handleDiscard}
            disabled={!isDirty}
            className="inline-flex items-center gap-2 rounded-lg border border-edge-strong bg-surface-input px-3.5 py-2 text-sm font-medium text-ink-secondary transition-colors hover:bg-surface-hover hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
          >
            <X className="h-4 w-4" strokeWidth={2} />
            Discard
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!isDirty}
            className="inline-flex items-center gap-2 rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-obsidian transition-colors hover:bg-neutral-200 active:bg-neutral-300 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Save className="h-4 w-4" strokeWidth={2.25} />
            Save Day
          </button>
        </div>
      </div>

      {/* Quick paging */}
      <div className="flex items-center justify-center gap-2 pb-2">
        <button
          type="button"
          onClick={() => goToDay(selectedDayNum - 1)}
          disabled={selectedDayNum <= 1}
          className="rounded-lg border border-edge-strong bg-surface-input px-3 py-1.5 text-xs text-ink-secondary transition-colors hover:bg-surface-hover hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
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
          className="rounded-lg border border-edge-strong bg-surface-input px-3 py-1.5 text-xs text-ink-secondary transition-colors hover:bg-surface-hover hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  )
}

            <X className="h-4 w-4" strokeWidth={2} />
