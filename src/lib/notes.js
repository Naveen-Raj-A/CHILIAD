/**
 * Global Notes scratchpad persistence.
 *
 * A single free-text canvas, deliberately decoupled from the journey dataset
 * so it is never touched by an import, a reset, or a journey re-anchor. The
 * same key backs the canvas in every view, which is what makes notes appear
 * identically on the Dashboard and the Daily Tracker.
 */

/** Storage key for the global scratchpad. */
export const NOTES_STORAGE_KEY = 'chiliad_global_notes'

/** Soft cap so a runaway paste cannot fill the storage quota. */
export const MAX_NOTES_LENGTH = 20000

/**
 * Read the scratchpad. Never throws: unavailable or corrupt storage yields an
 * empty canvas.
 */
export function loadNotes() {
  if (typeof window === 'undefined') return ''
  try {
    const raw = window.localStorage.getItem(NOTES_STORAGE_KEY)
    return typeof raw === 'string' ? raw.slice(0, MAX_NOTES_LENGTH) : ''
  } catch {
    return ''
  }
}

/** Persist the scratchpad. Returns false when storage is unavailable. */
export function saveNotes(text) {
  if (typeof window === 'undefined') return false
  try {
    window.localStorage.setItem(
      NOTES_STORAGE_KEY,
      String(text ?? '').slice(0, MAX_NOTES_LENGTH),
    )
    return true
  } catch {
    return false
  }
}

/**
 * Observe scratchpad changes made in another tab.
 *
 * Returns an unsubscribe function. No-ops outside the browser.
 */
export function subscribeNotes(callback) {
  if (typeof window === 'undefined') return () => {}

  function handleStorage(event) {
    if (event.key !== NOTES_STORAGE_KEY) return
    callback(typeof event.newValue === 'string' ? event.newValue : '')
  }

  window.addEventListener('storage', handleStorage)
  return () => window.removeEventListener('storage', handleStorage)
}
