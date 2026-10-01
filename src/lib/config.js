/**
 * App configuration.
 *
 * Values that differ per deployment live here as constants, with an
 * environment override where one is genuinely useful. Nothing is invented: an
 * unset value stays empty and the UI degrades to a disabled control rather
 * than opening a wrong or guessed URL.
 */

/**
 * The Google Sheet that mirrors the journey. Override per environment with
 * `VITE_GOOGLE_SHEET_URL` (see `.env.example`); leave empty to run with the
 * "View Google Sheet" actions disabled.
 */
export const GOOGLE_SHEET_URL =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GOOGLE_SHEET_URL) || ''

/** True when a sheet URL has been configured and the button can be enabled. */
export function hasSheetUrl() {
  return Boolean(GOOGLE_SHEET_URL)
}

/**
 * Why a configured URL cannot be used to sync.
 *
 * Returned as a short reason so the UI can explain itself instead of silently
 * doing nothing. `null` means the URL is usable.
 */
export const SHEET_URL_PROBLEM = {
  UNSET: 'No sheet URL configured',
  MALFORMED: 'Sheet URL is not a valid absolute URL',
  VIEW_ONLY: 'Sheet URL is a view-only link, not a writable Apps Script endpoint',
  UNSUPPORTED: 'Sheet URL is not a recognised Google Apps Script endpoint',
}

/**
 * A writable Google Apps Script web-app endpoint that accepts a POST.
 *
 * Only `script.google.com/macros/s/<id>/exec` can receive the app's writes. A
 * `docs.google.com/spreadsheets/...` link is a human-facing viewer page: it
 * renders fine in a browser but rejects every POST, so posting to it would
 * burn retries and surface a permanent error badge for a configuration that was
 * never going to work. Detecting it up front is what turns that into a calm
 * LOCAL MODE.
 */
const APPS_SCRIPT_EXEC = /^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec\/?$/

/** A `docs.google.com/spreadsheets/...` link, i.e. the view-only form. */
const SHEETS_VIEWER = /^https:\/\/docs\.google\.com\/spreadsheets\//

/**
 * Classify `VITE_GOOGLE_SHEET_URL` as a usable write endpoint or not.
 *
 * Returns `null` when the URL is a live Apps Script `exec` endpoint, otherwise
 * the reason it cannot be used. Unparseable input is treated as unconfigured
 * rather than trusted, so a typo degrades to LOCAL MODE instead of producing a
 * confusing network error.
 */
export function classifySheetUrl(url = GOOGLE_SHEET_URL) {
  const raw = typeof url === 'string' ? url.trim() : ''
  if (!raw) return SHEET_URL_PROBLEM.UNSET

  let parsed
  try {
    parsed = new URL(raw)
  } catch {
    return SHEET_URL_PROBLEM.MALFORMED
  }

  if (parsed.protocol !== 'https:') return SHEET_URL_PROBLEM.MALFORMED
  if (SHEETS_VIEWER.test(raw)) return SHEET_URL_PROBLEM.VIEW_ONLY
  if (APPS_SCRIPT_EXEC.test(raw)) return null

  return SHEET_URL_PROBLEM.UNSUPPORTED
}

/** True when the configured sheet URL can accept a POST. */
export function isWritableSheetUrl(url = GOOGLE_SHEET_URL) {
  return classifySheetUrl(url) === null
}
