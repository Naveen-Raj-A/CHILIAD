/**
 * Hashtag pillar support.
 *
 * Users type tags inline in their task/notes text (e.g. "#Fitness"). Tags are
 * derived from that text rather than stored in a separate field, so there is
 * no second source of truth to keep in sync and no migration needed for
 * existing records.
 */

/** Matches #tag, allowing letters, digits, hyphen and underscore (1-24 chars). */
const TAG_PATTERN = /#([A-Za-z][A-Za-z0-9_-]{0,23})/g

/** The four suggested pillars surfaced in the filter bar. */
export const SUGGESTED_TAGS = ['Fitness', 'Coding', 'Reading', 'Career']

/** Capitalize each hyphen-separated part for consistent tag display. */
function titleCaseHyphenated(s) {
  return s
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join('-')
}

/** Extract tags from an arbitrary string, normalized to Title Case. */
export function parseTags(text) {
  if (!text || typeof text !== 'string') return []

  const found = new Set()
  for (const match of text.matchAll(TAG_PATTERN)) {
    const raw = match[1]
    // Normalize so #fitness and #Fitness are the same pillar, but preserve
    // internal hyphens with proper capitalization.
    found.add(titleCaseHyphenated(raw))
  }
  return [...found]
}

/** All tags present on a day, drawn from the task and log fields. */
export function tagsForDay(day) {
  if (!day) return []
  const combined = [day.mainTasks, day.details, day.notes].filter(Boolean).join(' ')
  return parseTags(combined)
}

/**
 * Every tag in the journey with usage counts, sorted by frequency descending,
 * then alphabetically for ties.
 */
export function collectTags(days) {
  const counts = new Map()

  for (const day of days) {
    for (const tag of tagsForDay(day)) {
      counts.set(tag, (counts.get(tag) || 0) + 1)
    }
  }

  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || b.tag.localeCompare(a.tag))
}

/** True when the day carries the given tag (case-insensitive). */
export function hasTag(day, tag) {
  if (!tag || tag === 'All') return true
  const needle = tag.replace(/^#/, '').toLowerCase()
  return tagsForDay(day).some((t) => t.toLowerCase() === needle)
}

/** Filter days down to those carrying the tag. */
export function filterByTag(days, tag) {
  if (!tag || tag === 'All') return days
  return days.filter((day) => hasTag(day, tag))
}
