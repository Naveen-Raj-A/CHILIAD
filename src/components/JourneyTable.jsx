import { useState } from 'react'
import { ChevronLeft, ChevronRight, Lock, Pencil } from 'lucide-react'
import StatusBadge from './StatusBadge'
import { cn } from '../lib/cn'
import { formatShortDate } from '../lib/date'
import { LOCK_FUTURE, lockState } from '../lib/lock'
import { sanitizePlanItems } from '../lib/plan'

const PAGE_SIZE = 25

/** Shown in an empty cell. A real character: JSX text does not expand \uXXXX. */
const EM_DASH = '\u2014'

const COLUMNS = [
  'Day',
  'Date',
  'Main Tasks',
  'To-Do List',
  'Status',
  'Progress %',
  'Details / Log',
  'Notes',
  '',
]

/** Slim progress meter rendered inside the table's progress cell. */
function ProgressCell({ value }) {
  const clamped = Math.min(Math.max(value || 0, 0), 100)
  return (
    <div className="flex items-center gap-2">
      <div className="h-1 w-16 overflow-hidden rounded-full bg-edge">
        <div
          className={cn(
            'h-full rounded-full',
            clamped >= 100 ? 'bg-emerald-500/70' : 'bg-sky-500/70',
          )}
          style={{ width: `${clamped}%` }}
        />
      </div>
      <span className="w-9 text-right text-xs tabular-nums text-ink-secondary">
        {value}%
      </span>
    </div>
  )
}

/**
 * A day's checklist, rendered as `[x]` / `[ ]` lines.
 *
 * Mirrors the `To-Do List` sheet column exactly - same markers, same order - so
 * what the table shows and what the sheet stores are recognisably the same
 * thing. Whitespace is preserved and the block is capped in height: a long plan
 * scrolls inside the cell instead of stretching one table row to fit a dozen
 * items.
 */
function ToDoCell({ items }) {
  const list = sanitizePlanItems(items)
  if (list.length === 0) return <span className="text-ink-muted">{EM_DASH}</span>

  return (
    <ul className="max-h-24 space-y-0.5 overflow-y-auto whitespace-pre pr-1 text-xs leading-relaxed">
      {list.map((item) => (
        <li key={item.id} className="flex gap-1.5">
          <span
            aria-hidden="true"
            className={cn(
              'shrink-0 font-mono',
              item.done ? 'text-emerald-400' : 'text-ink-muted',
            )}
          >
            {item.done ? '[x]' : '[ ]'}
          </span>
          <span className={cn('min-w-0 break-words', item.done ? 'text-ink-secondary' : 'text-ink')}>
            {item.text}
          </span>
        </li>
      ))}
    </ul>
  )
}

function Cell({ children, className }) {
  return <td className={cn('px-4 py-3', className)}>{children}</td>
}

/**
 * Paginated spreadsheet-style table over the (already filtered) day rows.
 *
 * Selecting a row loads it into the tracker. Future rows are hard-locked:
 * they render dimmed with a lock indicator and never fire a selection.
 * Past rows open read-only (view-only) and today's row is the editable one.
 */
export default function JourneyTable({
  rows,
  todayISO,
  selectedDayNum,
  onSelectDay,
  emptyMessage = 'No days match your current filters.',
}) {
  const [page, setPage] = useState(0)

  const totalPages = Math.max(Math.ceil(rows.length / PAGE_SIZE), 1)
  const safePage = Math.min(page, totalPages - 1)
  const start = safePage * PAGE_SIZE
  const visible = rows.slice(start, start + PAGE_SIZE)

  const goToPage = (next) => setPage(Math.min(Math.max(next, 0), totalPages - 1))

  const firstRow = rows.length ? start + 1 : 0
  const lastRow = Math.min(start + PAGE_SIZE, rows.length)


  return (
    <section className="card overflow-hidden" aria-labelledby="journey-heading">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-edge px-4 py-4 md:px-5">
        <div>
          <h2
            id="journey-heading"
            className="text-sm font-semibold uppercase tracking-[0.12em] text-ink-secondary"
          >
            Data Table
          </h2>
          <p className="mt-1 text-xs text-ink-muted">
            {rows.length
              ? `Showing ${firstRow.toLocaleString()}\u2013${lastRow.toLocaleString()} of ${rows.length.toLocaleString()}. Select a row to edit it.`
              : emptyMessage}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => goToPage(safePage - 1)}
            disabled={safePage === 0}
            aria-label="Previous page"
            className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-edge-strong bg-surface-input text-ink-secondary transition-colors hover:bg-surface-hover hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-24 text-center text-xs tabular-nums text-ink-secondary">
            Page {safePage + 1} / {totalPages}
          </span>
          <button
            type="button"
            onClick={() => goToPage(safePage + 1)}
            disabled={safePage >= totalPages - 1}
            aria-label="Next page"
            className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-edge-strong bg-surface-input text-ink-secondary transition-colors hover:bg-surface-hover hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/*
        Touch-scroll container for the wide table.

        The negative inline margin plus matching padding makes the scroll area
        bleed to the screen edges on a phone, so the table can be swiped across
        the full viewport width while the header and paging controls stay
        aligned with the card. Without it the table is boxed inside the card and
        a horizontal drag has only the leftover gutter to work with.

        `overscroll-x-contain` stops a sideways flick at either end from
        chaining to the page scroll, and both values are dropped at `sm` where
        the card is already wide enough to hold the table without bleeding.
      */}
      <div className="-mx-4 overflow-x-auto px-4 overscroll-x-contain sm:mx-0 sm:px-0">
        <table className="w-full min-w-[84rem] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-edge bg-surface-raised/60">
              {COLUMNS.map((column, index) => (
                <th
                  key={column || `actions-${index}`}
                  scope="col"
                  className={cn(
                    'px-4 py-2.5 text-2xs font-medium uppercase tracking-[0.12em] text-ink-muted',
                    !column && 'w-10',
                  )}
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((day) => {
              const isSelected = day.dayNum === selectedDayNum
              const isFuture = lockState(day, todayISO) === LOCK_FUTURE
              return (
                <tr
                  key={day.dayNum}
                  onClick={() => {
                    if (isFuture) return
                    onSelectDay(day.dayNum)
                  }}
                  tabIndex={0}
                  aria-selected={isSelected}
                  onKeyDown={(event) => {
                    if (event.key !== 'Enter' && event.key !== ' ') return
                    event.preventDefault()
                    if (!isFuture) onSelectDay(day.dayNum)
                  }}
                  className={cn(
                    // A tappable row needs 44px; on desktop a pointer makes the
                    // cell area itself a perfectly good target, and padding
                    // every row out would double the visible table height for
                    // no gain. `pointer-fine` keys off the input device, so a
                    // touch laptop or tablet keeps the larger rows.
                    'border-b border-edge/70 transition-colors',
                    'min-h-[44px] [@media(pointer:fine)]:min-h-0',
                    isFuture
                      ? 'bg-surface-input/40 text-ink-muted opacity-60'
                      : cn(
                          'cursor-pointer',
                          isSelected
                            ? 'bg-surface-hover'
                            : 'hover:bg-surface-hover/60 focus:bg-surface-hover/60 focus:outline-none',
                        ),
                  )}
                >
                  <Cell className="font-mono text-xs tabular-nums text-ink-secondary">
                    {String(day.dayNum).padStart(3, '0')}
                  </Cell>
                  <Cell className="whitespace-nowrap text-xs tabular-nums text-ink-secondary">
                    {formatShortDate(day.date)}
                  </Cell>
                  <Cell className="max-w-64 truncate text-ink">
                    {day.mainTasks || <span className="text-ink-muted">{EM_DASH}</span>}
                  </Cell>
                  <Cell className="max-w-56">
                    <ToDoCell items={day.plannedItems} />
                  </Cell>
                  <Cell>
                    <StatusBadge status={day.status} />
                  </Cell>
                  <Cell>
                    <ProgressCell value={day.progress} />
                  </Cell>
                  <Cell className="max-w-72 truncate text-xs text-ink-secondary">
                    {day.details || <span className="text-ink-muted">{EM_DASH}</span>}
                  </Cell>
                  <Cell className="max-w-64 truncate text-xs text-ink-secondary">
                    {day.notes || <span className="text-ink-muted">{EM_DASH}</span>}
                  </Cell>
                  <Cell>
                    {isFuture ? (
                      <Lock
                        className="h-3.5 w-3.5 text-ink-muted"
                        strokeWidth={2}
                        aria-label="Locked — future date"
                      />
                    ) : (
                      <Pencil
                        className="h-3.5 w-3.5 text-ink-muted"
                        strokeWidth={2}
                        aria-hidden="true"
                      />
                    )}
                  </Cell>
                </tr>
              )
            })}
            {!visible.length && (
              <tr>
                <td colSpan={COLUMNS.length} className="px-4 py-10 text-center">
                  <span className="text-sm text-ink-muted">{emptyMessage}</span>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
