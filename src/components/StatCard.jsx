import { cn } from '../lib/cn'

/**
 * Small labelled metric tile. Shared by the Overview and Progress views so
 * card styling stays identical across the app.
 */
export default function StatCard({ icon: Icon, iconClass, label, value, caption, children }) {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-2">
        {Icon && (
          <Icon
            className={cn('h-4 w-4 text-ink-secondary', iconClass)}
            strokeWidth={2}
          />
        )}
        <p className="text-2xs font-medium uppercase tracking-[0.12em] text-ink-secondary">
          {label}
        </p>
      </div>

      <div className="mt-3 flex min-h-8 items-center">
        {typeof value === 'string' || typeof value === 'number' ? (
          <p className="text-3xl font-semibold tracking-tight text-ink tabular-nums">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
        ) : (
          value
        )}
      </div>

      {children}

      {caption && <p className="mt-1.5 text-xs text-ink-secondary">{caption}</p>}
    </div>
  )
}
