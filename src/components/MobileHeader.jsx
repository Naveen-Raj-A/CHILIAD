import { Pencil, Search, Settings } from 'lucide-react'
import { TOTAL_DAYS } from '../lib/date'
import { cn } from '../lib/cn'

/**
 * The mobile-only top bar.
 *
 * The hamburger it replaces is gone with the drawer: BottomNav now owns primary
 * navigation, and two navigation affordances competing on one screen is how
 * you get a rail nobody uses. What stays is what the bottom bar cannot carry —
 * search, Settings, and today's editor — plus the selected day, which was
 * otherwise only visible inside the drawer.
 *
 * Settings lives here rather than as a sixth tab because five labels already
 * fill 375px. It is a destination, not a primary one, and it must remain
 * reachable on mobile or the route is dead on the platform most people use.
 *
 * `md:hidden` throughout — the desktop rail already carries all of this, and
 * two of each would be duplicate controls.
 */
export default function MobileHeader({
  activeView,
  activeDayNum,
  onOpenSearch,
  onOpenSettings,
  onUpdateToday,
}) {
  const iconButton =
    'flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-ink-secondary transition-colors hover:bg-surface-hover hover:text-ink'

  // Settings is a real destination reached from here, so when it is the active
  // view this control has to say so — otherwise the app is showing the Settings
  // page with nothing on screen marked as selected.
  const isSettingsActive = activeView === 'settings'

  return (
    <header className="flex flex-shrink-0 items-center gap-1 border-b border-edge bg-surface/50 px-3 py-2 md:hidden">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <img
          src="/chiliad-logo.png"
          alt=""
          width={28}
          height={28}
          className="h-7 w-7 shrink-0 rounded border border-edge/40 bg-surface/80 object-contain p-0.5"
        />
        <p className="min-w-0 truncate text-sm font-semibold tabular-nums text-ink">
          Day {activeDayNum.toLocaleString()}{' '}
          <span className="font-normal text-ink-secondary">
            / {TOTAL_DAYS.toLocaleString()}
          </span>
        </p>
      </div>

      <button type="button" onClick={onOpenSearch} aria-label="Search" className={iconButton}>
        <Search className="h-5 w-5" strokeWidth={2} />
      </button>

      <button
        type="button"
        onClick={onOpenSettings}
        aria-label="Settings and data"
        aria-current={isSettingsActive ? 'page' : undefined}
        className={cn(iconButton, isSettingsActive && 'bg-surface-hover text-emerald-400')}
      >
        <Settings className="h-5 w-5" strokeWidth={2} />
      </button>

      <button
        type="button"
        onClick={onUpdateToday}
        className="ml-1 flex h-11 shrink-0 items-center gap-1.5 rounded-lg bg-ink px-3 text-sm font-semibold text-obsidian transition-colors active:bg-neutral-300"
      >
        <Pencil className="h-4 w-4" strokeWidth={2.25} />
        Update
      </button>
    </header>
  )
}