import { cn } from '../lib/cn'

/**
 * Horizontal progress meter used across the three views.
 * Renders a real progressbar role so it is accessible.
 */
export default function ProgressBar({
  value,
  label,
  tone = 'sky',
  size = 'md',
  showValue = false,
  className,
}) {
  const clamped = Math.min(Math.max(Number(value) || 0, 0), 100)

  const tones = {
    // Emerald fill signals forward progress and completion.
    sky: 'bg-gradient-to-r from-sky-500/80 to-emerald-500/70',
    emerald: 'bg-gradient-to-r from-emerald-500/70 to-emerald-400/90',
    neutral: 'bg-gradient-to-r from-neutral-600 to-neutral-500',
  }

  const sizes = {
    sm: 'h-1',
    md: 'h-1.5',
    lg: 'h-2.5',
  }

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuenow={Math.round(clamped)}
        aria-valuemin={0}
        aria-valuemax={100}
        className={cn('flex-1 overflow-hidden rounded-full bg-edge', sizes[size])}
      >
        <div
          className={cn('h-full rounded-full transition-[width] duration-500', tones[tone])}
          style={{ width: `${clamped}%` }}
        />
      </div>
      {showValue && (
        <span className="w-12 shrink-0 text-right text-xs tabular-nums text-ink-secondary">
          {clamped.toFixed(clamped < 10 && !Number.isInteger(clamped) ? 1 : 0)}%
        </span>
      )}
    </div>
  )
}
