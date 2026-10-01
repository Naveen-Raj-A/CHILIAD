import { useMemo } from 'react'
import { Activity, Flame, Trophy } from 'lucide-react'
import Headline from '../Headline'
import StatCard from '../StatCard'
import ProgressBar from '../ProgressBar'
import { computeMilestones } from '../../lib/stats'
import { TOTAL_DAYS } from '../../lib/date'

/** Status segments used for the completion-vs-remaining stacked bar. */
const BREAKDOWN = [
  { key: 'completed', label: 'Completed', className: 'bg-emerald-500/70' },
  { key: 'inProgress', label: 'In Progress', className: 'bg-sky-500/70' },
  { key: 'notStarted', label: 'Not Started', className: 'bg-neutral-700' },
  { key: 'notCompleted', label: 'Not Completed', className: 'bg-amber-500/50' },
]

/**
 * Progress: velocity by 100-day milestone, streak counters, and a status
 * breakdown. Everything derives from the same stats the Overview uses.
 */
export default function AnalyticsView({ days, stats, selectedDayNum, syncStatus, pendingCount }) {
  const milestones = useMemo(() => computeMilestones(days), [days])

  return (
    <div className="w-full space-y-6">
      <Headline
        dayNum={selectedDayNum}
        syncStatus={syncStatus}
        pendingCount={pendingCount}
        subtitle="Analytics"
      />

      {/* Streak counters */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard
          icon={Flame}
          label="Current streak"
          value={stats.currentStreak}
          iconClass="text-emerald-400"
          caption="Consecutive days logged, counting back from the latest"
        />
        <StatCard
          icon={Trophy}
          label="Longest streak"
          value={stats.longestStreak}
          iconClass="text-emerald-400"
          caption="Best run achieved anywhere in the journey"
        />
        <StatCard
          icon={Activity}
          label="Days logged"
          value={stats.logged}
          iconClass="text-sky-400"
          caption={`${stats.activityRate.toFixed(1)}% of the ${TOTAL_DAYS.toLocaleString()}-day journey`}
        />
      </div>

      {/* Milestone velocity bars */}
      <section className="card p-4 md:p-5" aria-labelledby="milestones-heading">
        <h2
          id="milestones-heading"
          className="text-sm font-semibold uppercase tracking-[0.12em] text-ink-secondary"
        >
          Velocity by Milestone
        </h2>
        <p className="mt-1 text-xs text-ink-muted">
          Completion rate for each 100-day block.
        </p>

        <div className="mt-5 grid grid-cols-1 gap-3 md:gap-4 md:grid-cols-2">
          {milestones.map((block) => (
            <div
              key={block.start}
              className="rounded-lg border border-edge bg-surface-input p-3 transition-all duration-200 hover:border-[#333333]"
            >
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-xs font-medium text-ink">{block.label}</p>
                <p className="text-xs tabular-nums text-ink-secondary">
                  {block.completed}/{block.size}
                </p>
              </div>
              <ProgressBar
                value={block.rate}
                label={`${block.label} completion`}
                tone="emerald"
                size="sm"
                className="mt-2"
              />
              <p className="mt-1.5 text-2xs text-ink-muted">
                {block.logged} logged · avg {block.averageProgress.toFixed(0)}% progress
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Status breakdown */}
      <section className="card p-4 md:p-5" aria-labelledby="breakdown-heading">
        <h2
          id="breakdown-heading"
          className="text-sm font-semibold uppercase tracking-[0.12em] text-ink-secondary"
        >
          Status Breakdown
        </h2>
        <p className="mt-1 text-xs text-ink-muted">
          How all {TOTAL_DAYS.toLocaleString()} days are distributed right now.
        </p>

        {/* Stacked distribution bar */}
        <div className="mt-4 flex h-2.5 w-full overflow-hidden rounded-full bg-edge">
          {BREAKDOWN.map(({ key, className }) => {
            const pct = (stats[key] / TOTAL_DAYS) * 100
            if (pct <= 0) return null
            return (
              <div
                key={key}
                className={className}
                style={{ width: `${pct}%` }}
                title={`${key}: ${stats[key]}`}
              />
            )
          })}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {BREAKDOWN.map(({ key, label, className }) => (
            <div
              key={key}
              className="flex items-center justify-between gap-2 rounded-lg border border-edge bg-surface-input px-3 py-2.5"
            >
              <span className="flex items-center gap-2 text-xs text-ink-secondary">
                <span className={`h-2.5 w-2.5 rounded-sm ${className}`} />
                {label}
              </span>
              <span className="text-sm font-semibold tabular-nums text-ink">
                {stats[key].toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
