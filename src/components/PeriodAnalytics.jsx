import { useEffect, useMemo, useState } from 'react'
import { cn } from '../lib/cn'
import { collectTags } from '../lib/tags'
import { COMPLETED_STATUSES } from '../lib/status'
import { fromISODate, toISODate } from '../lib/date'

/**
 * Period Analytics bar for the 1,000-Day Grid.
 *
 * A `[ Day | Week | Month | Year ]` toggle drives a compact chart panel that
 * summarises the journey at four granularities:
 *
 *  - Day:   today's focus breakdown - progress donut, logged-field coverage
 *           and a 24-hour day clock.
 *  - Week:  the last 7 days as a completion/velocity bar chart plus a status
 *           donut for the window.
 *  - Month: month-to-date progress banked against a linear pace target, with
 *           a mini month grid.
 *  - Year:  12-month macro trajectory and pillar (#tag) distribution.
 *
 * Every number derives from real stored entries whose date has arrived;
 * future days are excluded so the charts can never show data that does not
 * exist yet. No fabrication, no placeholders.
 */

const PERIODS = ['Day', 'Week', 'Month', 'Year']

/** Status colours shared by donuts and bars (emerald / sky / neutral). */
const DONE = '#10b981' // emerald-500
const PROGRESS = '#0ea5e9' // sky-500
const NONE = '#3f3f46' // neutral-700

/** Palette for pillar distribution segments. */
const PILLAR_COLORS = ['#10b981', '#0ea5e9', '#f59e0b', '#a78bfa', '#f472b6', '#14b8a6']

/** Colour for a single day entry based on its status. */
function statusColor(day) {
  if (!day) return NONE
  if (COMPLETED_STATUSES.has(day.status)) return DONE
  if (day.status === 'In Progress') return PROGRESS
  return NONE
}

/** Segments for a donut built from counted buckets. */
function countSegments(daysList) {
  let done = 0
  let progress = 0
  let none = 0
  for (const day of daysList) {
    if (!day) continue
    if (COMPLETED_STATUSES.has(day.status)) done += 1
    else if (day.status === 'In Progress') progress += 1
    else none += 1
  }
  return [
    { label: 'Completed', value: done, color: DONE },
    { label: 'In Progress', value: progress, color: PROGRESS },
    { label: 'Not Started', value: none, color: NONE },
  ].filter((segment) => segment.value > 0)
}

/**
 * Compact SVG donut. `segments` are `{ label, value, color }`; the centre
 * shows the primary value and caption passed by the caller.
 */
function Donut({ segments, caption, value, size = 132, thickness = 14 }) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0)
  const radius = (size - thickness) / 2
  const circumference = 2 * Math.PI * radius
  let offset = 0

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#222222"
          strokeWidth={thickness}
        />
        {total > 0 &&
          segments.map((segment) => {
            const length = (segment.value / total) * circumference
            const circle = (
              <circle
                key={segment.label}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={segment.color}
                strokeWidth={thickness}
                strokeDasharray={`${length} ${circumference - length}`}
                strokeDashoffset={-offset}
              />
            )
            offset += length
            return circle
          })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-semibold tabular-nums text-ink">{value}</span>
        <span className="mt-0.5 max-w-[80%] text-center text-2xs leading-tight text-ink-muted">
          {caption}
        </span>
      </div>
    </div>
  )
}

/** Small labelled statistic tile used across the panels. */
function Metric({ label, value, hint, tone = 'plain' }) {
  const tones = {
    plain: 'text-ink',
    good: 'text-emerald-400',
    warn: 'text-amber-400',
    info: 'text-sky-400',
  }
  return (
    <div className="rounded-lg border border-edge bg-surface-input px-3 py-2.5">
      <p className="text-2xs uppercase tracking-wide text-ink-muted">{label}</p>
      <p className={cn('mt-1 text-lg font-semibold tabular-nums', tones[tone])}>{value}</p>
      {hint && <p className="mt-0.5 text-2xs text-ink-muted">{hint}</p>}
    </div>
  )
}

/** Legend row below donuts / stacked bars. */
function Legend({ items }) {
  return (
    <ul className="flex flex-wrap gap-x-3 gap-y-1">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-1.5 text-2xs text-ink-muted">
          <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: item.color }} />
          {item.label}
          {typeof item.value === 'number' && (
            <span className="tabular-nums text-ink-secondary">{item.value}</span>
          )}
        </li>
      ))}
    </ul>
  )
}

/**
 * The current local hour, read outside render and refreshed each minute.
 *
 * The clock cannot be read during render: `Date` is impure, so a re-render
 * could otherwise produce a different hour than the one the strip was drawn
 * with. `null` means "not read yet", which the clock strip renders as no
 * highlighted hour rather than guessing.
 */
function useCurrentHour() {
  const [hour, setHour] = useState(null)

  useEffect(() => {
    const read = () => setHour(new Date().getHours())
    read()
    const timer = setInterval(read, 60000)
    return () => clearInterval(timer)
  }, [])

  return hour
}

/**
 * Day panel: today's detailed focus breakdown.
 * Progress donut, logged-field coverage, and a 24-hour clock strip showing
 * where the current day sits inside its hourly window.
 */
function DayPanel({ entry, todayISO }) {
  const now = fromISODate(todayISO)
  const hourNow = useCurrentHour()
  const fieldsLogged = [entry?.mainTasks, entry?.details, entry?.notes].filter(
    (text) => text && text.trim(),
  ).length

  if (!entry) {
    return (
      <p className="text-sm text-ink-muted">
        Today does not fall inside the journey window yet.
      </p>
    )
  }

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="flex flex-col items-center gap-3 rounded-lg border border-edge bg-surface-input p-4">
        <Donut
          segments={[
            { label: 'Progress', value: entry.progress, color: '#0ea5e9' },
            { label: 'Remaining', value: 100 - entry.progress, color: '#222222' },
          ]}
          caption="day progress"
          value={`${entry.progress}%`}
        />
        <p className="text-center text-2xs text-ink-muted">
          {now.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
        </p>
      </div>

      <div className="space-y-3 rounded-lg border border-edge bg-surface-input p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-secondary">
          Focus breakdown
        </p>
        <Metric
          label="Status"
          value={entry.status}
          hint={COMPLETED_STATUSES.has(entry.status) ? 'Day closed out' : 'Day still open'}
          tone={COMPLETED_STATUSES.has(entry.status) ? 'good' : 'info'}
        />
        <Metric
          label="Logged fields"
          value={`${fieldsLogged} / 3`}
          hint="Main tasks · Details · Notes"
        />
        <p className="break-words text-xs leading-relaxed text-ink-secondary">
          {entry.mainTasks ? entry.mainTasks : 'No main tasks recorded for today yet.'}
        </p>
      </div>

      <div className="space-y-3 rounded-lg border border-edge bg-surface-input p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-secondary">
          Hourly day clock
        </p>
        <div className="grid grid-cols-12 gap-1" aria-hidden="true">
          {Array.from({ length: 24 }, (_, hour) => (
            <div
              key={hour}
              title={`${String(hour).padStart(2, '0')}:00`}
              className={cn(
                'h-5 rounded-sm border',
                hourNow === null
                  ? 'border-edge bg-surface'
                  : hour < hourNow
                    ? 'border-sky-500/40 bg-sky-500/60'
                    : hour === hourNow
                      ? 'border-emerald-500/70 bg-emerald-500/70'
                      : 'border-edge bg-surface',
              )}
            />
          ))}
        </div>
        <div className="flex items-center justify-between text-2xs text-ink-muted">
          <span>00:00</span>
          {hourNow !== null ? (
            <span className="text-emerald-400">
              now · {String(hourNow).padStart(2, '0')}:00
            </span>
          ) : (
            <span>reading clock…</span>
          )}
          <span>24:00</span>
        </div>
        {hourNow !== null && (
          <p className="text-2xs text-ink-muted">
            {23 - hourNow} hours remain in the active day. The day stays editable until
            midnight, then becomes read-only.
          </p>
        )}
      </div>
    </div>
  )
}

/**
 * Week panel: the trailing 7 days ending today as a completion-rate and
 * velocity bar chart, plus a status donut for the window.
 */
function WeekPanel({ days, todayISO }) {
  const window = useMemo(() => {
    const end = fromISODate(todayISO)
    const entries = []
    for (let offset = 6; offset >= 0; offset -= 1) {
      const cursor = new Date(end)
      cursor.setDate(end.getDate() - offset)
      const iso = toISODate(cursor)
      entries.push({
        iso,
        day: days.find((day) => day.date === iso) || null,
        label: cursor.toLocaleDateString('en-US', { weekday: 'narrow' }),
        isToday: iso === todayISO,
      })
    }
    return entries
  }, [days, todayISO])

  const windowDays = window.map((slot) => slot.day).filter(Boolean)
  const completed = windowDays.filter((day) => COMPLETED_STATUSES.has(day.status)).length
  const logged = windowDays.length
  const rate = windowDays.length ? Math.round((completed / windowDays.length) * 100) : 0
  const segments = countSegments(windowDays)

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="flex flex-col items-center gap-3 rounded-lg border border-edge bg-surface-input p-4">
        <Donut
          segments={segments.length ? segments : [{ label: 'No data', value: 1, color: NONE }]}
          caption="7-day status"
          value={segments.length ? `${rate}%` : '--'}
        />
        <Legend items={segments.length ? segments : [{ label: 'No data yet', color: NONE }]} />
      </div>

      <div className="space-y-3 lg:col-span-2">
        <div className="grid grid-cols-3 gap-3">
          <Metric
            label="Completion rate"
            value={segments.length ? `${rate}%` : '--'}
            hint={`${completed} of ${windowDays.length || 7} days`}
            tone={rate >= 50 ? 'good' : 'warn'}
          />
          <Metric
            label="Velocity"
            value={`${logged}/7`}
            hint="Days with any log"
            tone="info"
          />
          <Metric
            label="Avg progress"
            value={
              windowDays.length
                ? `${Math.round(
                    windowDays.reduce((sum, day) => sum + day.progress, 0) / windowDays.length,
                  )}%`
                : '--'
            }
            hint="Across logged days"
          />
        </div>

        <div className="flex h-40 items-end gap-2 rounded-lg border border-edge bg-surface-input p-3">
          {window.map((slot) => {
            const progress = slot.day ? slot.day.progress : 0
            const color = slot.day ? statusColor(slot.day) : NONE
            return (
              <div key={slot.iso} className="flex flex-1 flex-col items-center gap-1.5">
                <span className="text-2xs tabular-nums text-ink-muted">{progress}%</span>
                <div className="flex h-24 w-full items-end rounded bg-surface">
                  <div
                    className={cn('w-full rounded transition-all duration-500', !slot.day && 'opacity-40')}
                    style={{ height: `${Math.max(progress, 2)}%`, backgroundColor: color }}
                    title={`${slot.iso}: ${slot.day ? `${slot.day.status} · ${progress}%` : 'not logged'}`}
                  />
                </div>
                <span
                  className={cn(
                    'text-2xs',
                    slot.isToday ? 'font-semibold text-emerald-400' : 'text-ink-muted',
                  )}
                >
                  {slot.label}
                </span>
              </div>
            )
          })}
        </div>
        <p className="text-2xs text-ink-muted">
          7-day window ending today · bar colour matches day status · green marks today.
        </p>
      </div>
    </div>
  )
}

/**
 * Month panel: month-to-date progress banked against a linear pace target,
 * with a mini month grid showing each date's state.
 */
function MonthPanel({ days, todayISO }) {
  const { monthDays, elapsedInMonth, daysInMonth, targetPct, bankedPct, todayDay } = useMemo(() => {
    const today = fromISODate(todayISO)
    const year = today.getFullYear()
    const month = today.getMonth()
    const inMonth = days.filter((day) => {
      const date = fromISODate(day.date)
      return date.getFullYear() === year && date.getMonth() === month && day.date <= todayISO
    })
    const total = new Date(year, month + 1, 0).getDate()
    const elapsed = today.getDate()
    const banked = inMonth.length
      ? Math.round(
          (inMonth.reduce((sum, day) => sum + day.progress, 0) / (elapsed * 100)) * 100,
        )
      : 0
    return {
      monthDays: inMonth,
      elapsedInMonth: elapsed,
      daysInMonth: total,
      targetPct: Math.round((elapsed / total) * 100),
      bankedPct: banked,
      todayDay: elapsed,
    }
  }, [days, todayISO])

  const completed = monthDays.filter((day) => COMPLETED_STATUSES.has(day.status)).length
  const delta = bankedPct - targetPct
  const today = fromISODate(todayISO)

  // Mini grid: every calendar day of the month with its live state.
  const grid = Array.from({ length: daysInMonth }, (_, index) => {
    const dayNum = index + 1
    const iso = toISODate(new Date(today.getFullYear(), today.getMonth(), dayNum))
    const entry = days.find((day) => day.date === iso) || null
    return { dayNum, iso, entry, isToday: dayNum === todayDay, isFuture: dayNum > todayDay }
  })

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="flex flex-col items-center gap-3 rounded-lg border border-edge bg-surface-input p-4">
        <Donut
          segments={[
            { label: 'Banked', value: bankedPct, color: '#0ea5e9' },
            { label: 'Remaining', value: 100 - bankedPct, color: '#222222' },
          ]}
          caption={`${today.toLocaleDateString('en-US', { month: 'long' })} progress`}
          value={`${bankedPct}%`}
        />
        <Legend
          items={[
            { label: 'Progress banked', value: bankedPct, color: '#0ea5e9' },
            { label: 'Linear target', value: targetPct, color: '#f59e0b' },
          ]}
        />
      </div>

      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Metric
            label="Progress"
            value={`${bankedPct}%`}
            hint="Avg progress across elapsed days"
            tone="info"
          />
          <Metric
            label="Target"
            value={`${targetPct}%`}
            hint={`Linear pace · day ${elapsedInMonth}/${daysInMonth}`}
            tone="warn"
          />
        </div>
        <Metric
          label={delta >= 0 ? 'Ahead of target' : 'Behind target'}
          value={`${delta >= 0 ? '+' : ''}${delta} pts`}
          hint={`${completed} completed · ${monthDays.length} logged this month`}
          tone={delta >= 0 ? 'good' : 'warn'}
        />
      </div>

      <div className="rounded-lg border border-edge bg-surface-input p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-secondary">
          Month grid
        </p>
        <div className="mt-3 grid grid-cols-7 gap-1.5" aria-hidden="true">
          {grid.map((cell) => (
            <div
              key={cell.iso}
              title={`Day ${cell.dayNum} · ${
                cell.isFuture
                  ? 'locked (future)'
                  : cell.entry
                    ? cell.entry.status
                    : 'no entry'
              }`}
              className={cn(
                'flex h-7 items-center justify-center rounded border text-2xs tabular-nums',
                cell.isFuture
                  ? 'border-edge/60 bg-surface text-ink-muted opacity-50'
                  : cell.isToday
                    ? 'border-emerald-500/70 bg-emerald-500/15 text-emerald-400'
                    : cell.entry && COMPLETED_STATUSES.has(cell.entry.status)
                      ? 'border-emerald-500/30 bg-emerald-500/20 text-emerald-400'
                      : cell.entry && cell.entry.status === 'In Progress'
                        ? 'border-sky-500/30 bg-sky-500/20 text-sky-400'
                        : 'border-edge bg-surface text-ink-secondary',
              )}
            >
              {cell.dayNum}
            </div>
          ))}
        </div>
        <p className="mt-3 text-2xs text-ink-muted">
          Dimmed cells are future dates — locked until their day arrives.
        </p>
      </div>
    </div>
  )
}

/**
 * Year panel: the calendar year's 12-month macro trajectory (completion per
 * month) plus the pillar (#tag) distribution across the days elapsed so far.
 */
function YearPanel({ days, todayISO }) {
  const year = fromISODate(todayISO).getFullYear()

  const { months, elapsedDays, pillarSegments } = useMemo(() => {
    const inYear = days.filter((day) => day.date.startsWith(`${year}-`))
    const buckets = Array.from({ length: 12 }, (_, month) => {
      const monthEntries = inYear.filter(
        (day) => fromISODate(day.date).getMonth() === month && day.date <= todayISO,
      )
      const completed = monthEntries.filter((day) => COMPLETED_STATUSES.has(day.status)).length
      return {
        month,
        completed,
        logged: monthEntries.length,
        rate: monthEntries.length
          ? Math.round((completed / monthEntries.length) * 100)
          : 0,
        hasData: monthEntries.length > 0,
      }
    })

    const elapsed = inYear.filter((day) => day.date <= todayISO)
    const tagCounts = collectTags(elapsed)
    const top = tagCounts.slice(0, PILLAR_COLORS.length)
    const rest = tagCounts
      .slice(PILLAR_COLORS.length)
      .reduce((sum, item) => sum + item.count, 0)

    const pillars = top.map((item, index) => ({
      label: `#${item.tag}`,
      value: item.count,
      color: PILLAR_COLORS[index],
    }))
    if (rest > 0) pillars.push({ label: 'Other', value: rest, color: '#52525b' })

    return { months: buckets, elapsedDays: elapsed, pillarSegments: pillars }
  }, [days, todayISO, year])

  const yearCompleted = months.reduce((sum, month) => sum + month.completed, 0)
  const yearLogged = months.reduce((sum, month) => sum + month.logged, 0)
  const currentMonth = fromISODate(todayISO).getMonth()

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="space-y-3 lg:col-span-2">
        <div className="grid grid-cols-3 gap-3">
          <Metric
            label={`${year} completed`}
            value={yearCompleted}
            hint={`${yearLogged} days logged`}
            tone="good"
          />
          <Metric
            label="Months with data"
            value={months.filter((month) => month.hasData).length}
            hint="Counted to date only"
            tone="info"
          />
          <Metric
            label="Pillars active"
            value={pillarSegments.length}
            hint="Distinct tags this year"
          />
        </div>

        <div className="flex h-44 items-end gap-1.5 rounded-lg border border-edge bg-surface-input p-3">
          {months.map((month) => {
            const label = new Date(2000, month.month, 1)
              .toLocaleDateString('en-US', { month: 'narrow' })
            const isCurrent = month.month === currentMonth
            return (
              <div key={month.month} className="flex flex-1 flex-col items-center gap-1.5">
                <span className="text-2xs tabular-nums text-ink-muted">
                  {month.hasData ? `${month.rate}%` : ''}
                </span>
                <div className="flex h-24 w-full items-end rounded bg-surface">
                  <div
                    className={cn(
                      'w-full rounded transition-all duration-500',
                      !month.hasData && 'opacity-30',
                      isCurrent && 'ring-1 ring-emerald-400/70',
                    )}
                    style={{
                      height: `${month.hasData ? Math.max(month.rate, 3) : 4}%`,
                      backgroundColor: month.hasData
                        ? month.rate >= 50
                          ? DONE
                          : PROGRESS
                        : NONE,
                    }}
                    title={`${new Date(2000, month.month, 1).toLocaleDateString('en-US', {
                      month: 'long',
                    })}: ${month.completed}/${month.logged} completed`}
                  />
                </div>
                <span
                  className={cn(
                    'text-2xs',
                    isCurrent ? 'font-semibold text-emerald-400' : 'text-ink-muted',
                  )}
                >
                  {label}
                </span>
              </div>
            )
          })}
        </div>
        <p className="text-2xs text-ink-muted">
          Monthly completion trajectory for {year} · bars show completed share of logged days ·
          ring marks the current month.
        </p>
      </div>

      <div className="flex flex-col items-center gap-3 rounded-lg border border-edge bg-surface-input p-4">
        <p className="self-start text-xs font-semibold uppercase tracking-wide text-ink-secondary">
          Pillar distribution
        </p>
        {pillarSegments.length ? (
          <>
            <Donut
              segments={pillarSegments}
              caption={`${elapsedDays.length} days scanned`}
              value={pillarSegments.length}
            />
            <Legend items={pillarSegments} />
          </>
        ) : (
          <p className="py-6 text-center text-xs text-ink-muted">
            No pillars tagged yet — add #tags to your tasks to see distribution here.
          </p>
        )}
      </div>
    </div>
  )
}

/**
 * Period analytics bar: the `[ Day | Week | Month | Year ]` toggle plus the
 * chart panel for the active period. Mounted at the top of GridView.
 */
export default function PeriodAnalytics({ days, todayISO }) {
  const [period, setPeriod] = useState('Day')

  const todayEntry = useMemo(
    () => days.find((day) => day.date === todayISO) || null,
    [days, todayISO],
  )

  return (
    <section className="card p-5" aria-labelledby="period-analytics-heading">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2
            id="period-analytics-heading"
            className="text-sm font-semibold uppercase tracking-[0.12em] text-ink-secondary"
          >
            Period Analytics
          </h2>
          <p className="mt-1 text-xs text-ink-muted">
            Progress summaries by day, week, month, and year — based only on days that have
            arrived.
          </p>
        </div>

        {/* Period toggle */}
        <div
          role="tablist"
          aria-label="Analytics period"
          className="flex items-center gap-1 rounded-lg border border-edge bg-surface-input p-1"
        >
          {PERIODS.map((option) => (
            <button
              key={option}
              type="button"
              role="tab"
              aria-selected={period === option}
              onClick={() => setPeriod(option)}
              className={cn(
                'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                period === option
                  ? 'bg-ink text-obsidian'
                  : 'text-ink-secondary hover:bg-surface-hover hover:text-ink',
              )}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4">
        {period === 'Day' && <DayPanel entry={todayEntry} todayISO={todayISO} />}
        {period === 'Week' && <WeekPanel days={days} todayISO={todayISO} />}
        {period === 'Month' && <MonthPanel days={days} todayISO={todayISO} />}
        {period === 'Year' && <YearPanel days={days} todayISO={todayISO} />}
      </div>
    </section>
  )
}





