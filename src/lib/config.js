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
