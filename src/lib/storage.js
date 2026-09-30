import { createEmptyDays, normalizeEntry } from './journey'
import { JOURNEY_START_ISO } from './date'

/** The single localStorage key holding the whole journey. */
export const STORAGE_KEY = 'chiliad_journey_data'

/** Metadata wrapped around an export so an import can be validated later. */
export const EXPORT_VERSION = 1

/** Build a blank, 1,000-day dataset anchored to the fixed journey start. */
export function blankJourney() {
  return createEmptyDays(JOURNEY_START_ISO)
}

/**
 * Read the journey from localStorage, falling back to a blank dataset.
 * Never throws: corrupt or unavailable storage yields a clean start.
 *
 * Stored records are always re-anchored to the current JOURNEY_START_ISO. Only
 * the calendar is taken from storage; a user's actual content (tasks, status,
 * progress, logs, notes) is preserved untouched. This means the journey moves
 * to a new anchor automatically without anyone clicking "Reset All Data" and
 * without discarding real work.
 */
export function loadJourney() {
  const fallback = blankJourney()
  if (typeof window === 'undefined') return fallback

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return fallback

    const parsed = JSON.parse(raw)
    const records = Array.isArray(parsed) ? parsed : parsed?.days
    if (!Array.isArray(records) || records.length !== fallback.length) return fallback

    // `fallback` supplies the canonical date for each day number, so a record
    // stored under an older anchor still lands on the correct new date.
    return records.map((day, index) => normalizeEntry(day, fallback[index]))
  } catch {
    return fallback
  }
}

/** Persist the journey. Returns false when storage is unavailable. */
export function saveJourney(days) {
  if (typeof window === 'undefined') return false
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(days))
    return true
  } catch {
    return false
  }
}

/** Remove all persisted journey data. */
export function clearJourney() {
  if (typeof window === 'undefined') return false
  try {
    window.localStorage.removeItem(STORAGE_KEY)
    return true
  } catch {
    return false
  }
}

/** Bytes currently used by the stored journey payload. */
export function storageSizeBytes() {
  if (typeof window === 'undefined') return 0
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? new Blob([raw]).size : 0
  } catch {
    return 0
  }
}

/** Human-readable byte size, e.g. "42.1 KB". */
export function formatBytes(bytes) {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const exponent = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  )
  const value = bytes / 1024 ** exponent
  return `${value.toFixed(exponent === 0 ? 0 : 1)} ${units[exponent]}`
}

/** Build the downloadable backup payload. */
export function buildExport(days) {
  return JSON.stringify(
    {
      version: EXPORT_VERSION,
      exportedAt: new Date().toISOString(),
      startDate: days.length ? days[0].date : JOURNEY_START_ISO,
      count: days.length,
      days,
    },
    null,
    2,
  )
}

/**
 * Validate and parse a backup file.
 * Returns `{ ok, days, error }` so the UI can report a precise failure.
 */
export function parseImport(text) {
  let parsed
  try {
    parsed = JSON.parse(text)
  } catch {
    return { ok: false, error: 'File is not valid JSON.' }
  }

  const records = Array.isArray(parsed) ? parsed : parsed?.days
  if (!Array.isArray(records)) {
    return { ok: false, error: 'Backup does not contain a day list.' }
  }
  if (records.length !== 1000) {
    return {
      ok: false,
      error: `Backup has ${records.length} days; expected 1,000.`,
    }
  }

  const fallback = blankJourney()
  return { ok: true, days: records.map((day, i) => normalizeEntry(day, fallback[i])) }
}
