/**
 * The four canonical status values for a journey day.
 * Order matters: it drives the <select> option order in the form.
 */
export const STATUSES = ['Not Started', 'In Progress', 'Completed', 'Done']

/** Statuses that count toward the "completed days" metric. */
export const COMPLETED_STATUSES = new Set(['Completed', 'Done'])

/**
 * Badge styling per status.
 * - Done / Completed -> emerald (secondary accent)
 * - In Progress      -> sky (primary accent)
 * - Not Started      -> neutral
 * Each carries a matching hairline border so badges read crisply on dark
 * surfaces at small sizes.
 */
export const STATUS_STYLES = {
  'Not Started': 'bg-neutral-800 text-neutral-400 border border-neutral-700',
  'In Progress': 'bg-sky-500/20 text-sky-400 border border-sky-500/30',
  Completed: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
  Done: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
}
