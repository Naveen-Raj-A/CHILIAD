/**
 * Cloud sync client for the `/api/sync` endpoint (Google Sheets backend).
 *
 * Design contract: localStorage is always the source of truth for rendering.
 * The network is strictly an enhancement layer. Every function here resolves
 * to a result object rather than throwing, so a missing or failing backend
 * degrades the app to pure-local behaviour instead of breaking it.
 */

/** The backend endpoint. */
export const SYNC_ENDPOINT = '/api/sync'

/** Request timeout in ms. A hung backend must never block the UI. */
const REQUEST_TIMEOUT_MS = 8000

/** Attempts per request (1 initial + N retries). */
const MAX_ATTEMPTS = 3

/** Base backoff between retries, in ms (doubled each attempt). */
const RETRY_BASE_MS = 500

/**
 * Pending offline writes, keyed by day number. These are flushed to the
 * backend as soon as connectivity returns. This is the app-level queue;
 * Milestone 2's service worker complements it at the transport layer.
 */
export const PENDING_QUEUE_KEY = 'chiliad_pending_sync'

export const SYNC_STATUS = {
  SYNCED: 'SYNCED',
  SAVING: 'SAVING',
  OFFLINE: 'OFFLINE',
  ERROR: 'ERROR',
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/** True when the browser reports a usable connection. */
export function isOnline() {
  if (typeof navigator === 'undefined') return true
  // navigator.onLine can be true while the backend is unreachable, so this is
  // a hint, not a guarantee; the request path is the real test.
  return navigator.onLine !== false
}

/** Abort a fetch after a timeout so the UI never hangs on a dead endpoint. */
async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    return await fetch(url, { ...options, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Perform a request with bounded retries and exponential backoff.
 * Returns `{ ok, data, error, status }`; never throws.
 */
async function requestWithRetry(url, options, { retries = MAX_ATTEMPTS } = {}) {
  let lastError = 'Request failed'
  let lastStatus = 0

  for (let attempt = 0; attempt < retries; attempt += 1) {
    try {
      const response = await fetchWithTimeout(url, options)
      lastStatus = response.status

      if (response.ok) {
        const data = await response.json().catch(() => null)
        return { ok: true, data, error: null, status: response.status }
      }

      // 4xx (except 408/429) are permanent client errors: retrying is pointless.
      if (
        response.status >= 400 &&
        response.status < 500 &&
        response.status !== 408 &&
        response.status !== 429
      ) {
        return {
          ok: false,
          data: null,
          error: `Request failed with status ${response.status}`,
          status: response.status,
        }
      }

      lastError = `Request failed with status ${response.status}`
    } catch (error) {
      lastError =
        error?.name === 'AbortError' ? 'Request timed out' : 'Network unreachable'
    }

    if (attempt < retries - 1) {
      await sleep(RETRY_BASE_MS * 2 ** attempt)
    }
  }

  return { ok: false, data: null, error: lastError, status: lastStatus }
}


// --- Offline queue -------------------------------------------------------

/** Read the pending-write queue from localStorage. */
export function readQueue() {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(PENDING_QUEUE_KEY)
    const parsed = raw ? JSON.parse(raw) : {}
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function writeQueue(queue) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(PENDING_QUEUE_KEY, JSON.stringify(queue))
  } catch {
    // Queue is best-effort; local journey data is already persisted.
  }
}

/** Queue a day for later delivery. Latest write per day wins. */
export function enqueue(entry) {
  const queue = readQueue()
  queue[entry.dayNum] = entry
  writeQueue(queue)
}

/** Remove a day from the queue after a successful push. */
export function dequeue(dayNum) {
  const queue = readQueue()
  delete queue[dayNum]
  writeQueue(queue)
}

export function queueSize() {
  return Object.keys(readQueue()).length
}

// --- API operations ------------------------------------------------------

/**
 * GET /api/sync - fetch the full journey from the backend.
 * Accepts either a bare array or `{ days: [...] }`.
 */
export async function fetchRemote() {
  const result = await requestWithRetry(SYNC_ENDPOINT, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  })

  if (!result.ok) {
    return { ok: false, entries: null, error: result.error, status: result.status }
  }

  const payload = result.data
  const entries = Array.isArray(payload) ? payload : payload?.days
  if (!Array.isArray(entries)) {
    return { ok: false, entries: null, error: 'Malformed response', status: result.status }
  }

  return { ok: true, entries, error: null, status: result.status }
}

/**
 * POST /api/sync - push a single day entry.
 * On failure the entry is queued so it is retried when connectivity returns.
 */
export async function pushEntry(entry) {
  const result = await requestWithRetry(SYNC_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(entry),
  })

  if (result.ok) {
    dequeue(entry.dayNum)
    return { ok: true, queued: false, error: null }
  }

  enqueue(entry)
  return { ok: false, queued: true, error: result.error }
}

/**
 * Drain the offline queue. Called on mount and whenever the browser reports
 * the connection is back. Returns counts for reporting in the UI.
 */
export async function flushQueue() {
  const queue = readQueue()
  const dayNums = Object.keys(queue)
  if (!dayNums.length) return { pushed: 0, failed: 0 }

  let pushed = 0
  let failed = 0

  for (const dayNum of dayNums) {
    // Sequential on purpose: avoids a burst of parallel writes to Sheets.
    const result = await requestWithRetry(
      SYNC_ENDPOINT,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(queue[dayNum]),
      },
      { retries: 1 },
    )

    if (result.ok) {
      dequeue(Number(dayNum))
      pushed += 1
    } else {
      failed += 1
    }
  }

  return { pushed, failed }
}

/**
 * Merge remote records with local days.
 *
 * Local content always wins: a remote record only fills days that are still
 * blank locally. This makes a background refresh non-destructive - it can
 * never clobber unsynced local work, which would be data loss.
 */
export function mergeRemote(localDays, remoteEntries, { isLogged } = {}) {
  const merged = localDays.map((day) => ({ ...day }))
  let applied = 0

  remoteEntries.forEach((remote, index) => {
    if (!remote || typeof remote !== 'object') return

    const target = merged[index]
    if (!target) return

    const remoteHasContent =
      remote.mainTasks ||
      remote.details ||
      remote.notes ||
      Number(remote.progress) > 0 ||
      (remote.status && remote.status !== 'Not Started')

    const localIsBlank = isLogged ? !isLogged(target) : true

    if (!remoteHasContent || !localIsBlank) return

    merged[index] = {
      ...target,
      mainTasks: remote.mainTasks || target.mainTasks,
      status: remote.status || target.status,
      progress: Number(remote.progress) || 0,
      details: remote.details || target.details,
      notes: remote.notes || target.notes,
    }
    applied += 1
  })

  return { days: merged, applied }
}

