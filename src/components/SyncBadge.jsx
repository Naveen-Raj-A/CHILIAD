import { AlertTriangle, CloudOff, Loader2, Wifi } from 'lucide-react'
import { cn } from '../lib/cn'
import { SYNC_STATUS } from '../lib/sync'

/** Visual treatment per sync state. */
const TONES = {
  [SYNC_STATUS.SYNCED]: {
    wrapper: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
    label: 'Synced',
  },
  [SYNC_STATUS.SAVING]: {
    wrapper: 'bg-sky-500/20 text-sky-400 border border-sky-500/30',
    label: 'Saving',
  },
  [SYNC_STATUS.OFFLINE]: {
    wrapper: 'bg-neutral-800 text-neutral-400 border border-neutral-700',
    label: 'Offline',
  },
  [SYNC_STATUS.ERROR]: {
    wrapper: 'bg-rose-500/20 text-rose-400 border border-rose-500/30',
    label: 'Sync Error',
  },
}

function StatusIcon({ status }) {
  if (status === SYNC_STATUS.SAVING) {
    // Spinner communicates in-flight work.
    return <Loader2 className="h-3 w-3 animate-spin" strokeWidth={2.5} />
  }
  if (status === SYNC_STATUS.SYNCED) {
    return <Wifi className="h-3 w-3" strokeWidth={2.5} />
  }
  if (status === SYNC_STATUS.ERROR) {
    return <AlertTriangle className="h-3 w-3" strokeWidth={2.5} />
  }
  return <CloudOff className="h-3 w-3" strokeWidth={2.5} />
}

/**
 * Live connection status pill. Renders `pending` as a count of queued offline
 * writes so the user can see work is safely held locally.
 */
export default function SyncBadge({ status, pending = 0, className }) {
  const tone = TONES[status] || TONES[SYNC_STATUS.OFFLINE]

  return (
    <span
      role="status"
      aria-live="polite"
      title={
        pending > 0
          ? `${pending} change(s) queued locally, waiting to sync`
          : `Connection: ${tone.label}`
      }
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1',
        'text-2xs font-medium uppercase tracking-wide',
        tone.wrapper,
        className,
      )}
    >
      <StatusIcon status={status} />
      {tone.label}
      {pending > 0 && (
        <span className="rounded-full bg-obsidian/40 px-1.5 tabular-nums">
          {pending}
        </span>
      )}
    </span>
  )
}
