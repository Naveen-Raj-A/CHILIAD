import { useEffect, useMemo, useRef, useState } from 'react'
import { CornerDownLeft, Search, Tag, X } from 'lucide-react'
import StatusBadge from './StatusBadge'
import { cn } from '../lib/cn'
import { formatShortDate } from '../lib/date'
import { collectTags, filterByTag, tagsForDay } from '../lib/tags'
import { matchesQuery } from '../lib/stats'

/** Cap results so the list stays scannable and renders fast. */
const MAX_RESULTS = 40

/**
 * Global command palette (Ctrl/Cmd + K).
 *
 * Searches every day by task, notes, details or date, and exposes tag facets
 * for quick pillar filtering. Selecting a result jumps to that day in the
 * Daily Tracker.
 */
/**
 * Global command palette (Ctrl/Cmd + K).
 *
 * Searches every day by task, notes, details or date, and exposes tag facets
 * for quick pillar filtering. Selecting a result jumps to that day in the
 * Daily Tracker.
 *
 * Split in two: the outer component only gates on `isOpen`, so the inner
 * content mounts fresh each time. That resets query/tag/highlight without
 * calling setState inside an effect.
 */
export default function CommandPalette({ isOpen, onClose, days, onSelectDay }) {
  if (!isOpen) return null

  return <PaletteContent days={days} onClose={onClose} onSelectDay={onSelectDay} />
}

function PaletteContent({ days, onClose, onSelectDay }) {
  const [query, setQuery] = useState('')
  const [activeTag, setActiveTag] = useState('All')
  const [highlight, setHighlight] = useState(0)
  const inputRef = useRef(null)
  const listRef = useRef(null)

  const tags = useMemo(() => collectTags(days).slice(0, 12), [days])

  const results = useMemo(() => {
    const trimmed = query.trim()

    // With no query, show recent activity rather than all 1,000 blank days.
    let pool = days
    if (!trimmed) {
      const logged = days.filter(
        (d) =>
          d.status !== 'Not Started' ||
          d.progress > 0 ||
          d.mainTasks ||
          d.notes ||
          d.details,
      )
      pool = logged.length ? logged.slice(0, MAX_RESULTS) : days.slice(0, MAX_RESULTS)
    }

    const tagged = filterByTag(pool, activeTag)
    const matched = trimmed ? tagged.filter((day) => matchesQuery(day, trimmed)) : tagged
    return matched.slice(0, MAX_RESULTS)
  }, [query, activeTag, days])

  // Clamp during render instead of resetting in an effect, so the highlighted
  // index can never point past the end of the current result set.
  const safeHighlight = Math.min(highlight, Math.max(results.length - 1, 0))

  // Focus the input on mount (external DOM sync, not React state).
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Keyboard navigation: arrows to move, Enter to open, Esc to dismiss.
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }
      if (event.key === 'ArrowDown') {
        event.preventDefault()
        setHighlight((prev) => (results.length ? (prev + 1) % results.length : 0))
        return
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault()
        setHighlight((prev) =>
          results.length ? (prev - 1 + results.length) % results.length : 0,
        )
        return
      }
      if (event.key === 'Enter') {
        const chosen = results[safeHighlight]
        if (chosen) {
          event.preventDefault()
          onSelectDay(chosen.dayNum)
          onClose()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [results, safeHighlight, onClose, onSelectDay])

  // Keep the highlighted row visible while arrowing through results.
  useEffect(() => {
    const node = listRef.current?.querySelector('[data-active="true"]')
    node?.scrollIntoView({ block: 'nearest' })
  }, [safeHighlight])


  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[10vh]">
      {/* Scrim */}
      <button
        type="button"
        aria-label="Close search"
        onClick={onClose}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Global search"
        className="relative flex max-h-[70vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-edge-strong bg-surface shadow-2xl"
      >
        {/* Search input */}
        <div className="flex items-center gap-3 border-b border-edge px-4 py-3">
          <Search className="h-4 w-4 shrink-0 text-ink-muted" strokeWidth={2} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search tasks, notes, logs, dates or #tags..."
            aria-label="Search all days"
            className="flex-1 bg-transparent text-sm text-ink placeholder:text-ink-muted focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Clear search"
              className="flex h-11 w-11 items-center justify-center rounded text-ink-muted transition-colors hover:text-ink"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <kbd className="hidden shrink-0 rounded border border-edge-strong bg-surface-input px-1.5 py-0.5 font-mono text-2xs text-ink-muted sm:block">
            ESC
          </kbd>
        </div>

        {/* Tag facets */}
        {tags.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto border-b border-edge px-4 py-2">
            <Tag className="h-3.5 w-3.5 shrink-0 text-ink-muted" strokeWidth={2} />
            <button
              type="button"
              onClick={() => setActiveTag('All')}
              className={cn(
                'inline-flex min-h-[44px] shrink-0 items-center rounded-full px-3 py-1 text-2xs font-medium transition-colors',
                activeTag === 'All'
                  ? 'bg-ink text-obsidian'
                  : 'border border-edge-strong bg-surface-input text-ink-secondary hover:text-ink',
              )}
            >
              All
            </button>
            {tags.map(({ tag, count }) => (
              <button
                key={tag}
                type="button"
                onClick={() => setActiveTag(tag)}
                className={cn(
                  'inline-flex min-h-[44px] shrink-0 items-center rounded-full px-3 py-1 text-2xs font-medium transition-colors',
                  activeTag === tag
                    ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                    : 'border border-edge-strong bg-surface-input text-ink-secondary hover:text-ink',
                )}
              >
                #{tag}
                <span className="ml-1.5 tabular-nums text-ink-muted">{count}</span>
              </button>
            ))}
          </div>
        )}


        {/* Results */}
        <div ref={listRef} className="flex-1 overflow-y-auto">
          {results.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-ink-muted">
              No days match your search.
            </p>
          ) : (
            <ul>
              {results.map((day, index) => {
                const dayTags = tagsForDay(day)
                const isActive = index === safeHighlight
                return (
                  <li key={day.dayNum}>
                    <button
                      type="button"
                      data-active={isActive}
                      onMouseEnter={() => setHighlight(index)}
                      onClick={() => {
                        onSelectDay(day.dayNum)
                        onClose()
                      }}
                      className={cn(
                        'flex min-h-[44px] w-full items-start gap-3 px-4 py-3 text-left transition-colors',
                        isActive ? 'bg-surface-hover' : 'hover:bg-surface-hover/60',
                      )}
                    >
                      <span className="w-12 shrink-0 pt-0.5 font-mono text-xs tabular-nums text-ink-muted">
                        {String(day.dayNum).padStart(3, '0')}
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="truncate text-sm text-ink">
                            {day.mainTasks || (
                              <span className="text-ink-muted">Untitled day</span>
                            )}
                          </span>
                          <StatusBadge status={day.status} />
                        </span>
                        <span className="mt-1 flex flex-wrap items-center gap-2">
                          <span className="text-2xs tabular-nums text-ink-muted">
                            {formatShortDate(day.date)}
                          </span>
                          {dayTags.map((tag) => (
                            <span
                              key={tag}
                              className="rounded bg-sky-500/10 px-1.5 py-0.5 text-2xs text-sky-400"
                            >
                              #{tag}
                            </span>
                          ))}
                        </span>
                        {(day.details || day.notes) && (
                          <span className="mt-1 block truncate text-xs text-ink-muted">
                            {day.details || day.notes}
                          </span>
                        )}
                      </span>

                      {isActive && (
                        <CornerDownLeft
                          className="mt-1 h-3.5 w-3.5 shrink-0 text-ink-muted"
                          strokeWidth={2}
                        />
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {/* Footer hint */}
        <div className="flex items-center justify-between border-t border-edge px-4 py-2 text-2xs text-ink-muted">
          <span>
            {results.length} result{results.length === 1 ? '' : 's'}
          </span>
          <span className="hidden gap-3 sm:flex">
            <span>Up/Down navigate</span>
            <span>Enter opens in tracker</span>
          </span>
        </div>
      </div>
    </div>
  )
}
