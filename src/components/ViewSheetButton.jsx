import { ExternalLink } from 'lucide-react'
import { GOOGLE_SHEET_URL, hasSheetUrl } from '../lib/config'
import { cn } from '../lib/cn'

/**
 * Opens the configured Google Sheet in a new browser tab.
 *
 * The URL comes from `src/lib/config.js` and is never guessed. When nothing is
 * configured the control renders disabled and explains itself in a tooltip, so
 * the absence of a sheet is visible rather than silently broken.
 *
 * Rendered beside the sync badge in the sidebar footer and the view headline,
 * and as a full action tile in Settings.
 */
export default function ViewSheetButton({ className, label = 'View Google Sheet' }) {
  const configured = hasSheetUrl()

  const handleClick = () => {
    if (!configured) return
    window.open(GOOGLE_SHEET_URL, '_blank', 'noopener,noreferrer')
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={!configured}
      title={
        configured
          ? 'Open the journey sheet in a new tab'
          : 'Sheet URL not configured — set VITE_GOOGLE_SHEET_URL'
      }
      aria-label={configured ? `${label} (opens in a new tab)` : `${label} (not configured)`}
      className={cn(
        'inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-full border border-edge-strong',
        'bg-surface-input px-2.5 py-1 text-2xs font-medium uppercase tracking-wide',
        'text-ink-secondary transition-colors',
        configured ? 'hover:bg-surface-hover hover:text-ink' : 'cursor-not-allowed opacity-40',
        className,
      )}
    >
      <ExternalLink className="h-3 w-3" strokeWidth={2.5} aria-hidden="true" />
      {label}
    </button>
  )
}
