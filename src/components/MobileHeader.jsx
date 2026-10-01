import { Menu, Pencil } from 'lucide-react'
import { TOTAL_DAYS } from '../lib/date'

/**
 * The mobile-only top bar.
 *
 * On phones the rail is an off-canvas drawer, which would otherwise leave no
 * persistent way to reach navigation or to jump to today's editor: the drawer
 * would have to be opened first, every time. This bar keeps both actions one
 * tap away and states which day is selected, which is otherwise only visible
 * inside the drawer.
 *
 * `md:hidden` throughout — the desktop rail already carries both actions, and
 * two of each would be duplicate controls with different state.
 */
export default function MobileHeader({ activeDayNum, onOpenNav, onUpdateToday }) {
  return (
    <header className="flex flex-shrink-0 items-center gap-2 border-b border-edge bg-surface/50 px-3 py-2 md:hidden">
      <button
        type="button"
        onClick={onOpenNav}
        aria-label="Open navigation"
        aria-haspopup="dialog"
        className="-ml-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-ink transition-colors hover:bg-surface-hover"
      >
        <Menu className="h-5 w-5" strokeWidth={2} />
      </button>

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

      <button
        type="button"
        onClick={onUpdateToday}
        className="flex h-11 shrink-0 items-center gap-1.5 rounded-lg bg-ink px-3 text-sm font-semibold text-obsidian transition-colors active:bg-neutral-300"
      >
        <Pencil className="h-4 w-4" strokeWidth={2.25} />
        Update
      </button>
    </header>
  )
}
