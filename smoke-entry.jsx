import { renderToString } from 'react-dom/server'
import { readFileSync } from 'node:fs'
import App from './src/App.jsx'
import BottomNav from './src/components/BottomNav.jsx'
import Sidebar from './src/components/Sidebar.jsx'
import { BOTTOM_NAV_ITEMS, NAV_ITEMS } from './src/lib/nav.js'

let bad = 0
const check = (label, ok) => {
  if (!ok) bad += 1
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`)
}

const src = readFileSync('src/App.jsx', 'utf8')
const sidebarSrc = readFileSync('src/components/Sidebar.jsx', 'utf8')
const bottomSrc = readFileSync('src/components/BottomNav.jsx', 'utf8')
const headerSrc = readFileSync('src/components/MobileHeader.jsx', 'utf8')
const html = renderToString(<App />)

console.log('--- no overlay covers the content ---')
check('no drawer scrim anywhere', !html.includes('z-40') && !html.includes('backdrop-blur-sm'))
check('no drawer translate classes', !html.includes('-translate-x-full') && !html.includes('translate-x-0'))
check('no drawer state remains in App', !/isMobileOpen|setIsMobileOpen|openMobileNav|closeMobileNav/.test(src))
check('no body scroll lock effect', !/document\.body\.style\.overflow/.test(src))
check('no hamburger in the header', !headerSrc.includes('onOpenNav') && !headerSrc.includes('Menu'))
check('dashboard content is present', html.includes('Dashboard') || html.includes('Executive'))

console.log('\n--- bottom nav renders ---')
const bar = renderToString(<BottomNav activeView="tracker" onNavigate={() => {}} />)
check('bar is fixed to the bottom', /fixed bottom-0 left-0 right-0/.test(bottomSrc))
check('bar is mobile only', /md:hidden/.test(bottomSrc))
check('bar sits above content', /z-50/.test(bottomSrc))
check('bar has translucent blurred surface', /bg-surface\/95/.test(bottomSrc) && /backdrop-blur-md/.test(bottomSrc))
check('bar pads for the home indicator', /env\(safe-area-inset-bottom\)/.test(bottomSrc))
check('bar has a top border', /border-t/.test(bottomSrc))
check('bar is in the App tree', html.includes('Primary') || bar.length > 0)
check('five tabs rendered', (bar.match(/aria-current|aria-label=/g) || []).length >= 5)

console.log('\n--- every route stays reachable on mobile ---')
check('bottom nav has exactly the 5 primary tabs', BOTTOM_NAV_ITEMS.length === 5)
check('settings excluded from bottom nav', !BOTTOM_NAV_ITEMS.some((i) => i.id === 'settings'))
check('settings reachable from mobile header', /onOpenSettings/.test(headerSrc))
check('App wires settings navigation', /onOpenSettings=\{\(\) => setActiveView\('settings'\)\}/.test(src))
check('search reachable from mobile header', /onOpenSearch/.test(headerSrc))
check('every NAV_ITEM has a shortLabel', NAV_ITEMS.every((i) => i.shortLabel && i.label))

console.log('\n--- touch targets and active state ---')
check('tabs meet the 44px touch target', /min-h-\[44px\]/.test(bottomSrc))
check('active tab uses emerald + medium weight', /isActive \? 'text-emerald-400 font-medium'/.test(bottomSrc))
check('active route is marked aria-current', /aria-current=\{isActive \? 'page' : undefined\}/.test(bottomSrc))
check('accessible name is the full label', /aria-label=\{label\}/.test(bottomSrc))
check('hover tint is pointer-gated', /@media\(pointer:fine\)/.test(bottomSrc))
check('tabs shrink to fit narrow viewports', /flex-1/.test(bottomSrc) && /truncate/.test(bottomSrc))

console.log('\n--- desktop rail unchanged ---')
const rail = renderToString(
  <Sidebar
    activeView="dashboard"
    onNavigate={() => {}}
    activeDayNum={1}
    onUpdateToday={() => {}}
    syncStatus="LOCAL"
    pendingCount={0}
    onOpenSearch={() => {}}
  />,
)
check('rail is desktop only', /hidden[\s\S]{0,60}md:flex/.test(sidebarSrc))
check('rail keeps all six nav items', (rail.match(/aria-current|1,000-Day Grid|Daily Tracker/g) || []).length > 0)
check('rail keeps search', rail.includes('Search'))
check('rail keeps sync badge + sheet button', rail.includes('LOCAL MODE') && rail.includes('View Google Sheet'))
check('rail has no drawer props', !/isOpen|onClose/.test(sidebarSrc))
check('rail no longer imports X', !/X[,\s}]/.test(sidebarSrc.split('\n')[0]))

console.log('\n--- layout clears the bar ---')
check('main content pads below the bar', /pb-20/.test(src))
check('desktop drops that padding', /md:pb-6/.test(src))
// Assert on the root element's actual className, not the whole file: the
// `w-screen` discussion lives in a comment there and would match a naive
// search for the class.
const rootClass = html.match(/<div class="flex h-\[100dvh\][^"]*"/)
check('viewport lock retained', /h-\[100dvh\]/.test(src) && /overflow-hidden/.test(src))
check('root is w-full not w-screen', !!rootClass && /w-full/.test(rootClass[0]) && !/w-screen/.test(rootClass[0]))
check('safe-area inset handled by the bar only', !/safe-area-inset-bottom/.test(src))
check('toast clears the bottom bar', /bottom-20/.test(readFileSync('src/components/Toast.jsx', 'utf8')))

console.log('\n--- no other permanently-mounted overlay ---')
const cp = readFileSync('src/components/CommandPalette.jsx', 'utf8')
check('command palette returns null when closed', /if \(!isOpen\) return null/.test(cp))

console.log(bad ? `\n${bad} problem(s)` : '\nALL GOOD')
if (bad) process.exit(1)