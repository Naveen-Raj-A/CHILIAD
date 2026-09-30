import { cn } from '../lib/cn'
import { COMPLETED_STATUSES } from '../lib/status'

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
 * Clicking a block selects that day.
 */
export default function Heatmap({ days, selectedDayNum, onSelectDay }) {
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
            All 1,000 days. Click any block to focus that day.
          </p>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 text-2xs text-ink-muted">
          {[
            ['bg-edge', 'Not started'],
            ['bg-sky-500/60', 'In progress'],
            ['bg-emerald-500/60', 'Partial'],
            ['bg-emerald-500', 'Complete'],
          ].map(([color, text]) => (
            <span key={text} className="inline-flex items-center gap-1.5">
              <span className={cn('h-2.5 w-2.5 rounded-sm', color)} />
              {text}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-5 space-y-1.5">
        {rows.map((row, rowIndex) => (
          <div key={ROW_LABELS[rowIndex]} className="flex items-center gap-2">
            <span className="w-10 shrink-0 text-right font-mono text-2xs tabular-nums text-ink-muted">
              {ROW_LABELS[rowIndex]}
            </span>
            <div className="grid flex-1 grid-cols-25 gap-0.5 min-[640px]:grid-cols-50 lg:grid-cols-100">
              {row.map((day) => {
                const isSelected = day.dayNum === selectedDayNum
                return (
                  <button
                    key={day.dayNum}
                    type="button"
                    onClick={() => onSelectDay(day.dayNum)}
                    title={`Day ${day.dayNum} - ${day.status}`}
                    aria-label={`Day ${day.dayNum}, ${day.status}`}
                    aria-pressed={isSelected}
                    className={cn(
                      'aspect-square rounded-sm transition-all hover:ring-1 hover:ring-white/60 focus:outline-none focus:ring-2 focus:ring-white/70',
                      blockTone(day),
                      isSelected && 'ring-2 ring-white ring-offset-1 ring-offset-surface',
                    )}
                  />
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
