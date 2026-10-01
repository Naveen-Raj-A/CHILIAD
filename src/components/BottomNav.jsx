import { BOTTOM_NAV_ITEMS } from '../lib/nav'
import { cn } from '../lib/cn'

/**
 * Mobile-only bottom tab bar, the counterpart to the desktop rail.
 *
 * A bottom bar rather than an off-canvas drawer because the primary
 * destinations here are all frequent destinations. A drawer makes the common
 * case cost two taps and hides the app's structure behind a hamburger; a
 * persistent bar shows where you are and how to leave, one tap each, with the
 * thumb rather than the top of the screen.
 *
 * The trade this accepts is that the bar is fixed to five destinations. That is
 * why Settings sits in the mobile header instead of as a sixth tab: six labels
 * at 375px stop being legible, and a truncated tab is worse than a missing one.
 *
 * Sits above the safe-area inset itself rather than relying on the page to pad
 * for it — `env(safe-area-inset-bottom)` is the height of the iOS home
 * indicator and the Android gesture bar, and icons placed under it are
 * unreadable and untappable on exactly the devices this bar exists for.
 *
 * `md:hidden` throughout: the static rail takes over at md and above.
 */
export default function BottomNav({ activeView, onNavigate }) {
  return (
    <nav
      aria-label="Primary"
      className={cn(
        'fixed bottom-0 left-0 right-0 z-50 md:hidden',
        'flex items-stretch justify-around',
        // Translucent rather than solid so the content scrolling underneath
        // stays legible as it passes; the border and shadow give the bar an
        // edge without a hard colour break.
        'border-t border-edge bg-surface/95 backdrop-blur-md',
        // min-h keeps the row at a comfortable height on devices without a home
        // indicator; the pb term grows the bar by the inset only where there is
        // one, so it is not double-padding everywhere.
        'min-h-[3.75rem] px-1 pb-[max(0.25rem,env(safe-area-inset-bottom))] pt-1.5',
        'shadow-[0_-4px_16px_-4px_rgba(0,0,0,0.5)]',
      )}
    >
      {BOTTOM_NAV_ITEMS.map(({ id, label, shortLabel, icon: Icon }) => {
        const isActive = id === activeView
        return (
          <button
            key={id}
            type="button"
            onClick={() => onNavigate(id)}
            // The visible label is the short form, so the accessible name has
            // to come from the full one or a screen reader announces "Grid".
            aria-label={label}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              // flex-1 shares the width evenly; min-h-[44px] is the minimum
              // comfortable touch target, and it holds even with the safe-area
              // padding added above.
              'flex min-h-[44px] flex-1 flex-col items-center justify-center gap-1',
              'rounded-lg px-0.5 transition-colors duration-200',
              // Pointer-gated hover: a hover tint on touch fires on tap and
              // lingers after the finger lifts, which reads as a stuck state.
              '[@media(pointer:fine)]:hover:bg-surface-hover',
              isActive ? 'text-emerald-400 font-medium' : 'text-ink-secondary',
            )}
          >
            <Icon className="h-5 w-5 shrink-0" strokeWidth={isActive ? 2.25 : 2} />
            <span className="w-full truncate text-center text-2xs leading-tight">{shortLabel}</span>
          </button>
        )
      })}
    </nav>
  )
}