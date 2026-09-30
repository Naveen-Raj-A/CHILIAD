import { useState } from 'react'
import { RotateCcw, Save } from 'lucide-react'
import { STATUSES } from '../lib/status'
import { formatLongDate } from '../lib/date'

/** Fields the user can edit, used to derive dirty state. */
const EDITABLE_KEYS = ['mainTasks', 'status', 'progress', 'details', 'notes']

/**
 * Editable form for the currently selected day.
 *
 * Edits are held in local draft state and only committed to the journey
 * dataset on save, so typing never mutates the table behind it.
 *
 * The parent keys this component by day number, so switching days remounts it
 * with a fresh draft instead of syncing state through an effect.
 */
export default function ActiveFocusForm({ entry, onSave }) {
  const [draft, setDraft] = useState(entry)

  // Derived during render rather than tracked in a second state variable.
  const isDirty = EDITABLE_KEYS.some((key) => draft[key] !== entry[key])

  const update = (key) => (event) => {
    const value =
      event.target.type === 'number' ? Number(event.target.value) : event.target.value
    setDraft((prev) => ({ ...prev, [key]: value }))
  }

  const handleSave = () => onSave(draft)

  const handleReset = () => setDraft(entry)

  return (
    <section className="card w-full p-5 sm:p-6" aria-labelledby="active-focus-heading">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2
            id="active-focus-heading"
            className="text-sm font-semibold uppercase tracking-[0.12em] text-ink-secondary"
          >
            Active Focus: Day {entry.dayNum}
            <span className="ml-2 normal-case tracking-normal text-ink-muted">
              ({formatLongDate(entry.date)})
            </span>
          </h2>
          <p className="mt-1 text-xs text-ink-secondary">
            Select any row in the journey window to load it here.
          </p>
        </div>

        {isDirty && (
          <span className="rounded-full bg-sky-500/20 px-2.5 py-1 text-2xs font-medium uppercase tracking-wide text-sky-400">
            Unsaved changes
          </span>
        )}
      </div>

      <div className="mt-5 grid w-full gap-5 lg:grid-cols-2">
        {/* Left column */}
        <div className="space-y-4">
          <div>
            <label className="label" htmlFor="mainTasks">
              Main Tasks
            </label>
            <input
              id="mainTasks"
              type="text"
              className="field"
              placeholder="What must be true by end of day?"
              value={draft.mainTasks}
              onChange={update('mainTasks')}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="status">
                Status
              </label>
              <select
                id="status"
                className="field appearance-none"
                value={draft.status}
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
              <label className="label" htmlFor="progress">
                Progress %
              </label>
              <div className="relative">
                <input
                  id="progress"
                  type="number"
                  min="0"
                  max="100"
                  step="5"
                  className="field pr-8 tabular-nums"
                  value={draft.progress}
                  onChange={update('progress')}
                />
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-ink-muted">
                  %
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          <div>
            <label className="label" htmlFor="details">
              Details / Log
            </label>
            <textarea
              id="details"
              rows={4}
              className="field resize-y"
              placeholder="Log the work as it happened."
              value={draft.details}
              onChange={update('details')}
            />
          </div>

          <div>
            <label className="label" htmlFor="notes">
              Notes &amp; Reflections
            </label>
            <textarea
              id="notes"
              rows={4}
              className="field resize-y"
              placeholder="What did you learn? What changes tomorrow?"
              value={draft.notes}
              onChange={update('notes')}
            />
          </div>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-end gap-2 border-t border-edge pt-4">
        <button
          type="button"
          onClick={handleReset}
          disabled={!isDirty}
          className="inline-flex items-center gap-2 rounded-lg border border-edge-strong bg-surface-input px-3.5 py-2 text-sm font-medium text-ink-secondary transition-colors hover:bg-surface-hover hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
        >
          <RotateCcw className="h-4 w-4" strokeWidth={2} />
          Discard
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={!isDirty}
          className="inline-flex items-center gap-2 rounded-lg bg-ink px-3.5 py-2 text-sm font-semibold text-obsidian transition-colors hover:bg-neutral-200 active:bg-neutral-300 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Save className="h-4 w-4" strokeWidth={2.25} />
          Save day
        </button>
      </div>
    </section>
  )
}
