/**
 * Global sidebar to-do list persistence.
 *
 * Tasks live under their own localStorage key so they are fully decoupled
 * from the journey dataset: importing, resetting, or re-anchoring the
 * 1,000-day record never touches the user's quick tasks.
 */

/** Storage key for the global quick to-do list. */
export const TODOS_STORAGE_KEY = 'chiliad_global_todos'

/** Maximum tasks kept at once so the sidebar cannot grow unbounded. */
export const MAX_TODOS = 100

/** Shape: { id: string, text: string, done: boolean, createdAt: number } */

/** Create a stable unique id without extra dependencies. */
function makeId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

/** Build a new task from raw input text. */
export function createTodo(text) {
  return {
    id: makeId(),
    text: String(text || '').trim(),
    done: false,
    createdAt: Date.now(),
  }
}

/**
 * Read tasks from localStorage. Malformed payloads degrade to an empty
 * list rather than crashing the app.
 */
export function loadTodos() {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(TODOS_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((task) => task && typeof task === 'object' && typeof task.text === 'string')
      .map((task) => ({
        id: typeof task.id === 'string' ? task.id : makeId(),
        text: task.text.trim(),
        done: Boolean(task.done),
        createdAt: Number.isFinite(task.createdAt) ? task.createdAt : Date.now(),
      }))
      .filter((task) => task.text.length > 0)
      .slice(0, MAX_TODOS)
  } catch {
    return []
  }
}

/** Persist tasks. Returns true on success; failures are swallowed. */
export function saveTodos(todos) {
  if (typeof window === 'undefined') return false
  try {
    window.localStorage.setItem(TODOS_STORAGE_KEY, JSON.stringify(todos))
    return true
  } catch {
    return false
  }
}
