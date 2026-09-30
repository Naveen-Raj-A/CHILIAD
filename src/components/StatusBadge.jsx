import { cn } from '../lib/cn'
import { STATUS_STYLES } from '../lib/status'

/**
 * Pill badge for a journey status. Reused in the table and the form so the
 * colour language stays consistent across the app.
 */
export default function StatusBadge({ status, className }) {
  return (
    <span
      className={cn(
        'inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5',
        'text-2xs font-medium uppercase tracking-wide',
        STATUS_STYLES[status] || STATUS_STYLES['Not Started'],
        className,
      )}
    >
      {status}
    </span>
  )
}
