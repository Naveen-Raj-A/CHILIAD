import { TOTAL_DAYS } from './date'
import { COMPLETED_STATUSES } from './status'
import { isLogged } from './journey'

/** Size of each progress milestone block (Days 1-100, 101-200, ...). */
export const MILESTONE_SIZE = 100

/**
 * Compute every derived metric the dashboard needs in a single pass.
 * Kept as one function so the three views never disagree on the numbers.
 *
 * `todayISO` anchors the streak counters. Without it they would walk in from
 * Day 1000 - a day that is always blank until the journey is over - and
 * report zero forever.
 */
export function computeStats(days, todayISO) {
  let completed = 0
  let inProgress = 0
  let notCompleted = 0
  let notStarted = 0
  let logged = 0
  let progressSum = 0

  for (const day of days) {
    if (COMPLETED_STATUSES.has(day.status)) completed += 1
    else if (day.status === 'In Progress') inProgress += 1
    else if (day.status === 'Not Completed') notCompleted += 1
    else notStarted += 1

    if (isLogged(day)) logged += 1
    progressSum += day.progress
  }

  const currentStreak = computeCurrentStreak(days, todayISO)
  const longestStreak = computeLongestStreak(days)

  return {
    totalDays: TOTAL_DAYS,
    completed,
    inProgress,
    notCompleted,
    notStarted,
    logged,
    unlogged: days.length - logged,
    // Share of the whole journey that is closed out.
    completionRate: (completed / TOTAL_DAYS) * 100,
    // Share of the journey that has any recorded activity at all.
    activityRate: (logged / TOTAL_DAYS) * 100,
    averageProgress: days.length ? progressSum / days.length : 0,
    currentStreak,
    longestStreak,
    remaining: TOTAL_DAYS - completed,
  }
}

/**
 * Consecutive logged days ending today.
 *
 * A day that has not been written yet does not break the run: an untouched
 * morning still reports the streak built up through yesterday, and only resets
 * once a whole day is missed. Reporting 0 until the first entry of each day
 * would be technically defensible and practically useless.
 *
 * Outside the journey window the answer is 0.
 */
function computeCurrentStreak(days, todayISO) {
  let index = todayISO ? days.findIndex((day) => day.date === todayISO) : -1
  if (index === -1) return 0

  // Today has not been logged yet, so the run belongs to the day before it.
  if (!isLogged(days[index])) index -= 1

  let streak = 0
  for (let i = index; i >= 0; i -= 1) {
    if (isLogged(days[i])) streak += 1
    else break
  }
  return streak
}

/** The longest run of consecutive logged days anywhere in the journey. */
function computeLongestStreak(days) {
  let longest = 0
  let run = 0
  for (const day of days) {
    if (isLogged(day)) {
      run += 1
      if (run > longest) longest = run
    } else {
      run = 0
    }
  }
  return longest
}

/**
 * Slice the journey into 100-day milestone blocks with per-block progress.
 * Ten blocks covers all 1,000 days.
 */
export function computeMilestones(days) {
  const blocks = []

  for (let start = 1; start <= TOTAL_DAYS; start += MILESTONE_SIZE) {
    const end = Math.min(start + MILESTONE_SIZE - 1, TOTAL_DAYS)
    const slice = days.slice(start - 1, end)

    const completed = slice.filter((d) => COMPLETED_STATUSES.has(d.status)).length
    const logged = slice.filter(isLogged).length
    const progressSum = slice.reduce((sum, d) => sum + d.progress, 0)

    blocks.push({
      label: `Days ${start}-${end}`,
      start,
      end,
      size: slice.length,
      completed,
      logged,
      rate: (completed / slice.length) * 100,
      activityRate: (logged / slice.length) * 100,
      averageProgress: slice.length ? progressSum / slice.length : 0,
    })
  }

  return blocks
}

/** Free-text match across the searchable fields of a day. */
export function matchesQuery(day, query) {
  if (!query) return true
  const needle = query.trim().toLowerCase()
  if (!needle) return true

  return (
    String(day.dayNum).includes(needle) ||
    day.date.toLowerCase().includes(needle) ||
    (day.mainTasks || '').toLowerCase().includes(needle) ||
    (day.details || '').toLowerCase().includes(needle) ||
    (day.notes || '').toLowerCase().includes(needle)
  )
}

/** Combine the search box and status filter into one filtered day list. */
export function filterDays(days, query, status) {
  return days.filter((day) => {
    if (status !== 'All' && day.status !== status) return false
    return matchesQuery(day, query)
  })
}
