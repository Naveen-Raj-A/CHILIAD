import { cn } from '../lib/cn'
import { COMPLETED_STATUSES } from '../lib/status'
import { lockState, LOCK_FUTURE } from '../lib/lock'

/**
 * Fill colour for a single day block.
 * Neutral for untouched days, sky for active work, emerald for closed-out
 * days, with intensity scaled by recorded progress.
 */
function blockTone(day) {
  if (COMPLETED_STATUSES.has(day.status)) {
    return day.progress >= 100 ? 'bg-emerald-500' : 'bg-emerald-500/60'
  }
  if (day.status === 'In Progress') {
    return day.progress > 0 ? 'bg-sky-500/80' : 'bg-sky-500/40'
  }
  return 'bg-edge'
}

/** Row labels every 100 days so the grid is navigable at a glance. */
const ROW_LABELS = [1, 101, 201, 301, 401, 501, 601, 701, 801, 901]

/**
 * 1,000 colour-coded blocks, one per day, laid out in ten rows of 100.
 * Clicking a block selects that day. Future days are hard-locked: they
 * render disabled with a lock indicator and cannot be clicked at all.
 */
export default function Heatmap({ days, todayISO, selectedDayNum, onSelectDay }) {
  const rows = ROW_LABELS.map((start, index) =>
    days.slice(index * 100, index * 100 + 100),
  )

  return (
    <div className="card p-5" role="group" aria-label="1,000 day heatmap">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-ink-secondary">
            Journey Heatmap
          </h2>
          <p className="mt-1 text-xs text-ink-muted">
            All 1,000 days. Click any block to focus that day — future days are locked.
          </p>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 text-2xs text-ink-muted">
          {[
            ['bg-edge', 'Not started'],
            ['bg-sky-500/60', 'In progress'],
            ['bg-emerald-500/60', 'Partial'],
            ['bg-emerald-500', 'Complete'],
            ['bg-edge-strong ring-1 ring-inset ring-neutral-600', 'Locked (future)'],
          ].map(([color, text]) => (
            <span key={text} className="inline-flex items-center gap-1.5">
              <span className={cn('h-2.5 w-2.5 rounded-sm', color)} />
              {text}
            </span>
          ))}
        </div>
      </div>

      {/*
        1,000 cells cannot all be 44px: at that size the grid would be wider
        than the 1,000-day journey it depicts. So the heatmap is a *pan* surface
        on touch rather than a tap surface — it scrolls horizontally with cells
        held above a legible floor, and precise day selection on a phone is
        served by the Data Table, which has real 44px rows.

        `min-w-[34rem]` keeps 25 columns at ~20px instead of letting them
        collapse to ~12px at 360px, and `overscroll-x-contain` stops a sideways
        flick from chaining to the page.
      */}
      <div className="-mx-4 mt-5 overflow-x-auto px-4 overscroll-x-contain sm:mx-0 sm:px-0">
        <div className="min-w-[34rem] space-y-1.5 md:min-w-0">
          {rows.map((row, rowIndex) => (
            <div key={ROW_LABELS[rowIndex]} className="flex items-center gap-2">
              <span className="w-10 shrink-0 text-right font-mono text-2xs tabular-nums text-ink-muted">
                {ROW_LABELS[rowIndex]}
              </span>
              <div className="grid flex-1 grid-cols-25 gap-0.5 min-[640px]:grid-cols-50 lg:grid-cols-100">
                {row.map((day) => {
                  const isSelected = day.dayNum === selectedDayNum
                  const isFuture = lockState(day, todayISO) === LOCK_FUTURE
                  return (
                    <button
                      key={day.dayNum}
                      type="button"
                      disabled={isFuture}
                      onClick={() => onSelectDay(day.dayNum)}
                      title={
                        isFuture
                          ? `Day ${day.dayNum} - locked (future date)`
                          : `Day ${day.dayNum} - ${day.status}`
                      }
                      aria-label={
                        isFuture
                          ? `Day ${day.dayNum}, locked, future date`
                          : `Day ${day.dayNum}, ${day.status}`
                      }
                      aria-pressed={isSelected}
                      aria-disabled={isFuture}
                      className={cn(
                        // A cell is a pointer target, so it keeps a sane hover
                        // and focus ring; touch users get the scroll instead.
                        'aspect-square rounded-sm transition-all focus:outline-none focus:ring-2 focus:ring-white/70',
                        blockTone(day),
                        isFuture
                          ? 'cursor-not-allowed border border-dashed border-neutral-600 bg-surface-input opacity-50'
                          : 'hover:ring-1 hover:ring-white/60',
                        !isFuture && isSelected && 'ring-2 ring-white ring-offset-1 ring-offset-surface',
                      )}
                    />
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
