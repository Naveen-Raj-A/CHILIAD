import { Pencil, Search } from 'lucide-react'
import { NAV_ITEMS } from '../lib/nav'
import { cn } from '../lib/cn'
import { TOTAL_DAYS } from '../lib/date'
import SyncBadge from './SyncBadge'
import ViewSheetButton from './ViewSheetButton'

/** Detect macOS so the shortcut hint matches the platform convention. */
function detectMac() {
  if (typeof navigator === 'undefined') return false
  return /Mac|iPhone|iPad/i.test(navigator.platform || navigator.userAgent || '')
}

/**
 * Fixed left navigation rail: brand, active day pill, the route links, and a
 * footer holding the storage-mode indicator plus the primary CTA.
 *
 * The Tomorrow Planner is a route like any other rather than a footer widget,
 * so planning and logging read as the same kind of destination.
 */
export default function Sidebar({
  activeView,
  onNavigate,
  activeDayNum,
  onUpdateToday,
  syncStatus,
  pendingCount,
  onOpenSearch,
}) {
  const isMac = detectMac()

  return (
    <aside className="flex h-full w-64 flex-shrink-0 flex-col border-r border-edge bg-surface/50">
      {/* Brand */}
      <div className="flex-shrink-0 border-b border-edge px-5 py-5">
        <div className="flex items-center gap-2.5">
          <img
            src="/chiliad-logo.png"
            alt="Chiliad OS Logo"
            width={36}
            height={36}
            className="h-9 w-9 shrink-0 rounded-md border border-edge/40 bg-surface/80 object-contain p-0.5"
          />
          <div className="leading-tight">
            <p className="text-sm font-semibold tracking-tight text-ink">Chiliad</p>
            <p className="text-2xs text-ink-secondary">1,000-Day OS</p>
          </div>
        </div>

        <div className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-edge bg-surface-input px-2.5 py-1">
          <span className="text-2xs font-medium uppercase tracking-wide text-ink-secondary">
            Day
          </span>
          <span className="text-2xs font-semibold tabular-nums text-ink">
            {activeDayNum.toLocaleString()} / {TOTAL_DAYS.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Navigation. This is the only scrolling region: the brand above and
          the footer below stay pinned, so the rail itself never moves. */}
      <nav
        aria-label="Primary"
        className="min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain px-3 py-4"
      >
        <button
          type="button"
          onClick={onOpenSearch}
          className="mb-2 flex w-full items-center gap-3 rounded-lg border border-edge-strong bg-surface-input px-3 py-2.5 text-sm text-ink-secondary transition-colors hover:bg-surface-hover hover:text-ink"
        >
          <Search className="h-4 w-4 shrink-0" strokeWidth={2} />
          <span className="flex-1 text-left">Search</span>
          <kbd className="rounded border border-edge-strong bg-surface px-1.5 py-0.5 font-mono text-2xs text-ink-secondary">
            {isMac ? 'Cmd' : 'Ctrl'} K
          </kbd>
        </button>

        {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
          const isActive = id === activeView
          return (
            <button
              key={id}
              type="button"
              onClick={() => onNavigate(id)}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'flex w-full items-center gap-3 rounded-lg border-r-2 px-3 py-2.5 text-sm font-medium transition-all duration-200',
                isActive
                  ? 'border-sky-400 bg-sky-500/10 text-sky-400'
                  : 'border-transparent text-ink-secondary hover:bg-surface-hover hover:text-ink',
              )}
            >
              <Icon className="h-4 w-4 shrink-0" strokeWidth={2} />
              <span className="truncate">{label}</span>
            </button>
          )
        })}
      </nav>

      {/* Footer. `mt-auto` pins it to the bottom of the flex column while the
          nav above takes the remaining height and scrolls. Stacked, not side
          by side: at 256px the rail cannot hold a status pill and a labelled
          action on one row without squeezing the labels, and a clipped pill
          reads as a broken control. */}
      <div className="mt-auto flex-shrink-0 space-y-2 border-t border-edge p-4">
        <SyncBadge status={syncStatus} pending={pendingCount} className="w-full justify-center" />
        <ViewSheetButton className="w-full" />

        <button
          type="button"
          onClick={onUpdateToday}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-ink px-3.5 py-2.5 text-sm font-semibold text-obsidian transition-colors hover:bg-neutral-200 active:bg-neutral-300"
        >
          <Pencil className="h-4 w-4" strokeWidth={2.25} />
          Update Today
        </button>
      </div>
    </aside>
  )
}
