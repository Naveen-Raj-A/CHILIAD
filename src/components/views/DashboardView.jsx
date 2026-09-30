import { CheckCircle2, Flame, Layers, Target } from 'lucide-react'
import Headline from '../Headline'
import StatCard from '../StatCard'
import ProgressBar from '../ProgressBar'
import ActiveFocusForm from '../ActiveFocusForm'
import { cn } from '../../lib/cn'
import { COMPLETED_STATUSES } from '../../lib/status'

/** Days offered in the quick-jump grid. */
const QUICK_JUMP_MAX = 50

/**
 * Dashboard: executive summary, the active focus form for the current day,
 * and fast day-jump buttons for the first 50 days.
 */
export default function DashboardView({
  days,
  stats,
  todayISO,
  selectedDayNum,
  onSelectDay,
  onSave,
  currentEntry,
  onNavigate,
  syncStatus,
  pendingCount,
}) {
  return (
    <div className="w-full space-y-6">
      <Headline
        dayNum={selectedDayNum}
        syncStatus={syncStatus}
        pendingCount={pendingCount}
        subtitle="Executive Dashboard"
      />

      {/* Executive metrics: 4 cards so the XL row is filled edge to edge. */}
      <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Layers}
          label="Total days"
          value={stats.totalDays}
          iconClass="text-sky-400"
          caption={`${stats.logged.toLocaleString()} day(s) logged so far`}
        />
        <StatCard
          icon={CheckCircle2}
          label="Completed"
          value={stats.completed}
          iconClass="text-emerald-400"
          caption={`${stats.inProgress.toLocaleString()} in progress`}
        />
        <StatCard
          icon={Flame}
          label="Current streak"
          value={stats.currentStreak}
          iconClass="text-emerald-400"
          caption={`Longest streak: ${stats.longestStreak.toLocaleString()}`}
        />
        <StatCard
          icon={Target}
          label="Overall progress"
          value={`${stats.completionRate.toFixed(1)}%`}
          iconClass="text-emerald-400"
          caption={`${stats.remaining.toLocaleString()} days remaining`}
        >
          <ProgressBar
            value={stats.completionRate}
            label="Overall journey completion"
            tone="emerald"
            className="mt-3"
          />
        </StatCard>
      </div>

      {/* Active focus form */}
      <ActiveFocusForm
        key={selectedDayNum}
        entry={currentEntry}
        onSave={onSave}
        todayISO={todayISO}
      />

      {/* Quick day jump */}
      <section className="card w-full p-5" aria-labelledby="quick-jump-heading">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2
            id="quick-jump-heading"
            className="text-sm font-semibold uppercase tracking-[0.12em] text-ink-secondary"
          >
            Quick Jump
          </h2>
          <div className="flex items-center gap-3">
            <p className="text-xs text-ink-muted">Days 1-{QUICK_JUMP_MAX}</p>
            <button
              type="button"
              onClick={() => onNavigate('tracker')}
              className="text-xs font-medium text-ink underline decoration-ink-muted underline-offset-4 transition-colors hover:decoration-ink"
            >
              Open full tracker
            </button>
          </div>
        </div>

        <div className="mt-4 grid w-full grid-cols-10 gap-1.5 sm:grid-cols-13 lg:grid-cols-25 xl:grid-cols-50">
          {days.slice(0, QUICK_JUMP_MAX).map((day) => {
            const isSelected = day.dayNum === selectedDayNum
            const isComplete = COMPLETED_STATUSES.has(day.status)
            return (
              <button
                key={day.dayNum}
                type="button"
                onClick={() => onSelectDay(day.dayNum)}
                aria-pressed={isSelected}
                aria-label={`Day ${day.dayNum}`}
                className={cn(
                  'rounded-lg border py-2 text-xs font-medium tabular-nums transition-colors',
                  isSelected
                    ? 'border-ink bg-ink text-obsidian'
                    : isComplete
                      ? 'border-emerald-500/40 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                      : day.status === 'In Progress'
                        ? 'border-sky-500/40 bg-sky-500/20 text-sky-400 hover:bg-sky-500/30'
                        : 'border-edge-strong bg-surface-input text-ink-secondary hover:bg-surface-hover hover:text-ink',
                )}
              >
                {day.dayNum}
              </button>
            )
          })}
        </div>
      </section>
    </div>
  )
}
