import { Search, X } from 'lucide-react'
import { STATUSES } from '../lib/status'

const STATUS_OPTIONS = ['All', ...STATUSES]

/**
 * Search box + status filter for the journey data table.
 * Fully controlled by the parent so the result count can be shown inline.
 */
export default function SearchFilterBar({
  query,
  onQueryChange,
  status,
  onStatusChange,
  resultCount,
  totalCount,
}) {
  return (
    <div className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted"
          strokeWidth={2}
        />
        <input
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search tasks, notes, logs or day number..."
          aria-label="Search journey entries"
          className="field pl-9 pr-9"
        />
        {query && (
          <button
            type="button"
            onClick={() => onQueryChange('')}
            aria-label="Clear search"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded text-ink-muted transition-colors hover:text-ink"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="flex items-center gap-2">
        {STATUS_OPTIONS.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onStatusChange(option)}
            aria-pressed={status === option}
            className={
              status === option
                ? 'inline-flex min-h-[44px] items-center rounded-full bg-ink px-3 py-1.5 text-xs font-medium text-obsidian transition-colors'
                : 'inline-flex min-h-[44px] items-center rounded-full border border-edge-strong bg-surface-input px-3 py-1.5 text-xs font-medium text-ink-secondary transition-colors hover:bg-surface-hover hover:text-ink'
            }
          >
            {option}
          </button>
        ))}
      </div>

      <p className="shrink-0 text-xs tabular-nums text-ink-muted sm:ml-2">
        {resultCount.toLocaleString()} / {totalCount.toLocaleString()} days
      </p>
    </div>
  )
}
