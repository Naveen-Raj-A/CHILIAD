import SyncBadge from './SyncBadge'
import ViewSheetButton from './ViewSheetButton'
import { TOTAL_DAYS } from '../lib/date'

/**
 * View headline: "Day {n} of 1,000" plus the live sync status badge and the
 * shortcut to the backing Google Sheet.
 */
export default function Headline({ dayNum, syncStatus = 'LOCAL', pendingCount = 0, subtitle }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {subtitle && (
          <p className="text-2xs font-medium uppercase tracking-[0.16em] text-ink-secondary">
            {subtitle}
          </p>
        )}
        <h1 className="mt-1.5 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          Day{' '}
          <span className="tabular-nums text-ink">{dayNum.toLocaleString()}</span>{' '}
          <span className="text-ink-secondary">of {TOTAL_DAYS.toLocaleString()}</span>
        </h1>
      </div>

      <div className="flex items-center gap-2">
        <SyncBadge status={syncStatus} pending={pendingCount} />
        <ViewSheetButton />
      </div>
    </div>
  )
}
