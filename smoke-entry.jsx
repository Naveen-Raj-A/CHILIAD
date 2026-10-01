import { renderToString } from 'react-dom/server'
import { readFileSync } from 'node:fs'
import App from './src/App.jsx'
import Sidebar from './src/components/Sidebar.jsx'

let bad = 0
const check = (label, ok) => {
  if (!ok) bad += 1
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`)
}

// The regression: on load, with the drawer closed, nothing must cover content.
const closed = renderToString(<App />)

console.log('--- the reported bug: closed drawer must not cover content ---')
check('no full-screen scrim in the DOM when closed', !closed.includes('fixed inset-0 z-40'))
check('no backdrop-blur anywhere on load', !closed.includes('backdrop-blur'))
check('no bg-black/60 veil on load', !closed.includes('bg-black/60'))
check('no aria-hidden scrim button rendered when closed', !closed.includes('z-40'))
check('main content is present and not wrapped in an overlay', closed.includes('Executive Dashboard') || closed.includes('Total days'))
check('drawer itself is translated off-canvas when closed', closed.includes('-translate-x-full'))
check('mobile header is still rendered', closed.includes('Open navigation'))

// A scrim that only ever mounts when open must be guarded in source, because
// the closed-state render above cannot distinguish "conditionally rendered"
// from "rendered with a class that hides it".
const src = readFileSync('src/App.jsx', 'utf8')
const guarded = /\{isMobileOpen\s*&&\s*\(/.test(src)
check('scrim is wrapped in an isMobileOpen guard in source', guarded)

console.log('\n--- open state ---')
const props = {
  activeView: 'dashboard',
  onNavigate: () => {},
  activeDayNum: 1,
  onUpdateToday: () => {},
  syncStatus: 'LOCAL',
  pendingCount: 0,
  onOpenSearch: () => {},
}
const open = renderToString(<Sidebar {...props} isOpen onClose={() => {}} />)
const closedRail = renderToString(<Sidebar {...props} isOpen={false} onClose={() => {}} />)
check('drawer slides in when open', open.includes('translate-x-0') && !open.includes('-translate-x-full'))
check('drawer is off-canvas when closed', closedRail.includes('-translate-x-full'))
check('open drawer carries a shadow', open.includes('shadow-2xl'))
check('scrim classes are correct in source', /fixed inset-0 z-40 bg-black\/60 backdrop-blur-sm md:hidden/.test(src))
check('scrim is click-to-close', /z-40[\s\S]{0,320}onClick=\{closeMobileNav\}|onClick=\{closeMobileNav\}[\s\S]{0,320}z-40/.test(src))

console.log('\n--- dismiss paths ---')
const sidebar = readFileSync('src/components/Sidebar.jsx', 'utf8')
check('nav items call onClose', /const navigate = \(id\) => \{[\s\S]{0,80}onClose\?\.\(\)/.test(sidebar))
check('search calls onClose', /const openSearch = \(\) => \{[\s\S]{0,80}onClose\?\.\(\)/.test(sidebar))
check('Update Today calls onClose', /onUpdateToday\(\)[\s\S]{0,40}onClose\?\.\(\)/.test(sidebar))
check('drawer X button calls onClose', /onClick=\{onClose\}[\s\S]{0,200}Close navigation/.test(sidebar))
check('Escape closes the drawer', /event\.key === 'Escape'[\s\S]{0,120}setIsMobileOpen\(false\)/.test(src))
check('body scroll locked only while open', /if \(!isMobileOpen\) return[\s\S]{0,200}overflow = 'hidden'/.test(src))
check('state initialised closed', /useState\(false\)/.test(src.slice(src.indexOf('isMobileOpen'), src.indexOf('isMobileOpen') + 60)))

console.log('\n--- no other permanently-mounted overlay ---')
const cp = readFileSync('src/components/CommandPalette.jsx', 'utf8')
check('command palette returns null when closed', /if \(!isOpen\) return null/.test(cp))

console.log(bad ? `\n${bad} problem(s)` : '\nALL GOOD')
if (bad) process.exit(1)
