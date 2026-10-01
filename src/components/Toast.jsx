import { useEffect } from 'react'
import { CheckCircle2, X } from 'lucide-react'
import { cn } from '../lib/cn'

const TONES = {
  success: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400',
  error: 'border-red-500/40 bg-red-500/10 text-red-400',
  info: 'border-edge-strong bg-surface text-ink-secondary',
}

/**
 * Transient confirmation message. Self-dismisses after a few seconds and can
 * be closed early. Rendered once by App and driven by a `toast` prop.
 */
export default function Toast({ toast, onDismiss, duration = 3000 }) {
  useEffect(() => {
    if (!toast) return undefined
    const timer = setTimeout(onDismiss, duration)
    return () => clearTimeout(timer)
  }, [toast, onDismiss, duration])

  if (!toast) return null

  return (
    <div
      role="status"
      aria-live="polite"
      // `bottom-20` on mobile lifts the toast clear of the fixed BottomNav, which is
// also z-50 and would otherwise cover it; at md and up nothing is pinned to the
// bottom, so it returns to the corner.
className="pointer-events-none fixed bottom-20 right-4 z-[60] md:bottom-6 md:right-6"
    >
      <div
        className={cn(
          'pointer-events-auto flex items-center gap-3 rounded-lg border px-4 py-3 shadow-xl backdrop-blur',
          TONES[toast.tone] || TONES.info,
        )}
      >
        {toast.tone !== 'error' && (
          <CheckCircle2 className="h-4 w-4 shrink-0" strokeWidth={2.25} />
        )}
        <p className="text-sm font-medium">{toast.message}</p>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss notification"
          className="flex h-11 w-11 items-center justify-center rounded opacity-70 transition-opacity hover:opacity-100"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}
