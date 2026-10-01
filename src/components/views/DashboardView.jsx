import {
  CalendarClock,
  CheckCircle2,
  Flame,
  Layers,
  Lock,
  Pencil,
  Sun,
  Target,
} from 'lucide-react'
import Headline from '../Headline'
import StatCard from '../StatCard'
import StatusBadge from '../StatusBadge'
import ProgressBar from '../ProgressBar'
import NotesCanvas from '../NotesCanvas'
import QuickTodos from '../QuickTodos'
import { cn } from '../../lib/cn'
import { COMPLETED_STATUSES } from '../../lib/status'
import { LOCK_FUTURE, lockState } from '../../lib/lock'
import { planProgressPct } from '../../lib/plan'
import { formatLongDate } from '../../lib/date'

/** Days offered in the quick-jump grid. */
const QUICK_JUMP_MAX = 50

/**
 * Dashboard: the executive command center.
 *
 * Strictly read-only. It reports where the journey stands, what today looks
 * like, and what tomorrow already has queued, then hands off: the Daily Tracker
 * is the one place a day is written, so there is exactly one editor and no
 * ambiguity about which surface owns a change.
 */
export default function DashboardView({
  days,
  stats,
  todayISO,
  tomorrowISO,
  selectedDayNum,
  onSelectDay,
  onNavigate,
  syncStatus,
  pendingCount,
  todos,
  onAddTodo,
  onToggleTodo,
  onRemoveTodo,
  onEditTodo,
}) {
  const today = days.find((day) => day.date === todayISO) || null
  const tomorrow = days.find((day) => day.date === tomorrowISO) || null

  const tomorrowItems = tomorrow?.plannedItems ?? []
  const tomorrowProgress = planProgressPct(tomorrowItems)

  return (
    <div className="w-full space-y-6">
      <Headline
        dayNum={selectedDayNum}
        syncStatus={syncStatus}
        pendingCount={pendingCount}
        subtitle="Executive Dashboard"
      />

      {/* Macro metrics: the whole journey at a glance.
          One column on a phone so a 4-up row of cards cannot crush to
          unreadable slivers, widening only once there is room for them. */}
      <div className="grid w-full grid-cols-1 gap-3 md:grid-cols-2 md:gap-4 lg:grid-cols-4">
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

      {/* Today's snapshot: read-only, and a pointer to the one editor. */}
      <section className="card w-full p-4 md:p-5" aria-labelledby="today-snapshot-heading">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2
              id="today-snapshot-heading"
              className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.12em] text-ink-secondary"
            >
              <Sun className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden="true" />
              Today's Status Snapshot
            </h2>
            <p className="mt-1 text-xs text-ink-muted">
              {today ? formatLongDate(today.date) : 'Today is outside the journey window'}
            </p>
          </div>
          {today && <StatusBadge status={today.status} />}
        </div>

        {!today ? (
          <p className="mt-4 rounded-lg border border-dashed border-edge px-4 py-8 text-center text-sm text-ink-muted">
            Today does not fall inside the 1,000-day window.
          </p>
        ) : (
          <>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border border-edge bg-surface-input p-3">
                <p className="text-2xs uppercase tracking-wide text-ink-muted">Main targets</p>
                <p className="mt-1.5 break-words text-sm leading-relaxed text-ink">
                  {today.mainTasks || (
                    <span className="text-ink-muted">No targets recorded yet.</span>
                  )}
                </p>
              </div>
              <div className="rounded-lg border border-edge bg-surface-input p-3">
                <p className="text-2xs uppercase tracking-wide text-ink-muted">Day progress</p>
                <ProgressBar
                  value={today.progress}
                  label="Today's progress"
                  tone={today.progress >= 100 ? 'emerald' : 'sky'}
                  className="mt-2"
                  showValue
                />
                <p className="mt-2 text-2xs text-ink-muted">
                  {COMPLETED_STATUSES.has(today.status)
                    ? 'Day closed out.'
                    : 'Day still open until midnight.'}
                </p>
              </div>
            </div>

            {today.details && (
              <div className="mt-3 rounded-lg border border-edge bg-surface-input p-3">
                <p className="text-2xs uppercase tracking-wide text-ink-muted">
                  Latest log
                </p>
                <p className="mt-1.5 line-clamp-4 break-words text-sm leading-relaxed text-ink-secondary">
                  {today.details}
                </p>
              </div>
            )}

            <button
              type="button"
              onClick={() => onNavigate('tracker')}
              className="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-edge-strong bg-surface-input px-3.5 py-2 text-sm font-medium text-ink-secondary transition-colors hover:bg-surface-hover hover:text-ink"
            >
              <Pencil className="h-4 w-4" strokeWidth={2.25} aria-hidden="true" />
              Open today's editor
            </button>
          </>
        )}
      </section>

      {/* Tomorrow: what is already queued, still read-only. */}
      <section className="card w-full p-4 md:p-5" aria-labelledby="tomorrow-summary-heading">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2
              id="tomorrow-summary-heading"
              className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.12em] text-ink-secondary"
            >
              <CalendarClock className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden="true" />
              Tomorrow's Strategy Summary
            </h2>
            <p className="mt-1 text-xs text-ink-muted">
              {tomorrow
                ? `${tomorrowItems.length} item(s) queued for ${formatLongDate(tomorrow.date)}`
                : 'Tomorrow is outside the journey window'}
            </p>
          </div>
          {tomorrowItems.length > 0 && (
            <ProgressBar
              value={tomorrowProgress}
              label="Tomorrow's plan completion"
              tone={tomorrowProgress === 100 ? 'emerald' : 'sky'}
              className="w-40"
              showValue
            />
          )}
        </div>

        {tomorrowItems.length === 0 ? (
          <p className="mt-4 rounded-lg border border-dashed border-edge px-4 py-6 text-center text-xs text-ink-muted">
            Nothing planned for tomorrow yet.
          </p>
        ) : (
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {tomorrowItems.map((item) => (
              <li
                key={item.id}
                className="flex items-start gap-2 rounded-lg border border-edge bg-surface-input px-3 py-2 min-h-[44px]"
              >
                <span className="text-2xs tabular-nums text-ink-muted">
                  {item.done ? '✓' : '○'}
                </span>
                <span
                  className={cn(
                    'min-w-0 flex-1 break-words text-xs leading-relaxed',
                    item.done ? 'text-ink-muted line-through' : 'text-ink-secondary',
                  )}
                >
                  {item.text}
                </span>
              </li>
            ))}
          </ul>
        )}

        <button
          type="button"
          onClick={() => onNavigate('planner')}
          className="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-edge-strong bg-surface-input px-3.5 py-2 text-sm font-medium text-ink-secondary transition-colors hover:bg-surface-hover hover:text-ink"
        >
          <CalendarClock className="h-4 w-4" strokeWidth={2.25} aria-hidden="true" />
          Open To-Do
        </button>
      </section>

      {/* Scratchpad: shared with the Daily Tracker. */}
      <NotesCanvas />

      {/* Today's quick actions: same App-level todos, now surfaced here only. */}
      <QuickTodos
        todos={todos}
        onAdd={onAddTodo}
        onToggle={onToggleTodo}
        onRemove={onRemoveTodo}
        onEdit={onEditTodo}
        variant="card"
        title="Today's Quick Action Items"
      />

      {/* Quick day jump */}
      <section className="card w-full p-4 md:p-5" aria-labelledby="quick-jump-heading">
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
              className="inline-flex min-h-[44px] items-center text-xs font-medium text-ink underline decoration-ink-muted underline-offset-4 transition-colors hover:decoration-ink"
            >
              Open full tracker
            </button>
          </div>
        </div>

        {/* Six across on a phone: at 360px, ten would be ~30px per button, under the
            44px minimum tap target. The density scales up as room appears. */}
        <div className="mt-4 grid w-full grid-cols-6 gap-1.5 sm:grid-cols-10 lg:grid-cols-13 xl:grid-cols-25 2xl:grid-cols-50">
          {days.slice(0, QUICK_JUMP_MAX).map((day) => {
            const isSelected = day.dayNum === selectedDayNum
            const isComplete = COMPLETED_STATUSES.has(day.status)
            const isFuture = lockState(day, todayISO) === LOCK_FUTURE
            if (isFuture) {
              return (
                <button
                  key={day.dayNum}
                  type="button"
                  disabled
                  aria-label={`Day ${day.dayNum} — locked, future date`}
                  title="Locked — future dates cannot be opened"
                  className="flex min-h-[44px] cursor-not-allowed items-center justify-center gap-0.5 rounded-lg border border-edge bg-surface-input text-xs font-medium tabular-nums text-ink-muted opacity-50"
                >
                  <Lock className="h-3 w-3" strokeWidth={2} aria-hidden="true" />
                </button>
              )
            }
            return (
              <button
                key={day.dayNum}
                type="button"
                onClick={() => onSelectDay(day.dayNum)}
                aria-pressed={isSelected}
                aria-label={`Day ${day.dayNum}`}
                className={cn(
                  'min-h-[44px] w-full rounded-lg border text-xs font-medium tabular-nums transition-colors',
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
