import { renderToString } from 'react-dom/server'
import { readFileSync } from 'node:fs'
import App from './src/App.jsx'
import BottomNav from './src/components/BottomNav.jsx'
import { NAV_ITEMS } from './src/lib/nav.js'
import { createPlanItem, parseToDoList, planToText, sanitizePlanItems, setPlanItemStatus, planProgressPct, isItemComplete } from './src/lib/plan.js'
import { deriveStatus } from './src/lib/status.js'
import { computeStats } from './src/lib/stats.js'
import { classifySheetUrl, SHEET_URL_PROBLEM } from './src/lib/config.js'

let bad = 0
const check = (label, ok) => {
  if (!ok) bad += 1
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`)
}

const src = readFileSync('src/App.jsx', 'utf8')
const plannerSrc = readFileSync('src/components/views/TomorrowPlannerView.jsx', 'utf8')
const trackerSrc = readFileSync('src/components/views/DailyTrackerView.jsx', 'utf8')
const headerSrc = readFileSync('src/components/MobileHeader.jsx', 'utf8')

const blank = (over = {}) => ({ dayNum: 1, date: '2026-10-01', mainTasks: '', status: 'Not Started', progress: 0, details: '', notes: '', plannedItems: [], ...over })
const TODAY = '2026-10-01'

console.log('--- 1. defaults: nothing is completed unless the user did it ---')
check('blank day 1 derives NOT STARTED', deriveStatus(blank(), TODAY) === 'Not Started')
check('blank day 1 progress is 0', blank().progress === 0)
check('all 1000 stored days default to 0 / Not Started', (() => {
  const stats = computeStats(Array.from({ length: 1000 }, (_, i) => blank({ dayNum: i + 1 })), TODAY)
  return stats.completed === 0 && stats.notCompleted === 0 && stats.logged === 0
})())
check('future days are NOT STARTED', deriveStatus(blank({ date: '2026-10-05' }), TODAY) === 'Not Started')

console.log('\n--- analytics ignores open / unlogged days ---')
check('untouched PAST day is NOT STARTED, not a miss', deriveStatus(blank({ date: '2026-09-30' }), TODAY) === 'Not Started')
check('untouched past days are not counted as misses', computeStats(Array.from({ length: 30 }, (_, i) => blank({ dayNum: i + 1, date: `2026-09-${String(30 - i).padStart(2, '0')}` })), TODAY).notCompleted === 0)
check('a past day with real content but unfinished IS a miss', deriveStatus(blank({ date: '2026-09-30', mainTasks: 'wrote the spec' }), TODAY) === 'Not Completed')
check('a past day at 100% stays COMPLETED', deriveStatus(blank({ date: '2026-09-30', progress: 100 }), TODAY) === 'Completed')
check('completion needs an explicit act, not the calendar', deriveStatus(blank({ date: '2026-09-01' }), TODAY) !== 'Completed')
check('empty plan does not count as completed', deriveStatus(blank({ plannedItems: [] }), TODAY) === 'Not Started')

console.log('\n--- 2a. tri-state task status ---')
check('three statuses exist', ['Pending', 'In Progress', 'Completed'].every((s) => createPlanItem('t', s).status === s))
check('legacy done item migrates to Completed, not reopened', sanitizePlanItems([{ id: 'a', text: 'x', done: true }])[0].status === 'Completed')
check('legacy open item migrates to Pending', sanitizePlanItems([{ id: 'a', text: 'x', done: false }])[0].status === 'Pending')
check('done mirrors Completed', isItemComplete(sanitizePlanItems([{ id: 'a', text: 'x', status: 'Completed' }])[0]) === true)
check('In Progress is not complete', isItemComplete(sanitizePlanItems([{ id: 'a', text: 'x', status: 'In Progress' }])[0]) === false)
check('setPlanItemStatus writes the state', setPlanItemStatus([createPlanItem('a')], 'nope', 'Completed').length === 1)
check('partial plan progress counts only completed', planProgressPct([createPlanItem('a', 'Completed'), createPlanItem('b', 'In Progress'), createPlanItem('c')]) === 33)
check('day completes only when every item is', deriveStatus(blank({ plannedItems: [createPlanItem('a', 'Completed'), createPlanItem('b')] }), TODAY) !== 'Completed')
check('day completes when all items are', deriveStatus(blank({ plannedItems: [createPlanItem('a', 'Completed'), createPlanItem('b', 'Completed')] }), TODAY) === 'Completed')
check('an In Progress item makes the day In Progress', deriveStatus(blank({ plannedItems: [createPlanItem('a', 'In Progress')] }), TODAY) === 'In Progress')

console.log('\n--- 2b. sheet round trip keeps the three states ---')
const three = [createPlanItem('a', 'Pending'), createPlanItem('b', 'In Progress'), createPlanItem('c', 'Completed')]
const cell = planToText(three)
check('writes three distinct marks', cell.includes('[ ] a') && cell.includes('[>] b') && cell.includes('[x] c'))
check('round trip is lossless', JSON.stringify(parseToDoList(cell).map((i) => i.status)) === JSON.stringify(['Pending', 'In Progress', 'Completed']))
check('legacy [x] still parses as Completed', parseToDoList('[x] done')[0].status === 'Completed')
check('legacy [X] still parses as Completed', parseToDoList('[X] done')[0].status === 'Completed')
check('legacy [*] still parses as Completed', parseToDoList('[*] done')[0].status === 'Completed')
check('legacy [-] still parses as Completed', parseToDoList('[-] done')[0].status === 'Completed')
check('legacy [!] stays open as Pending', parseToDoList('[!] open')[0].status === 'Pending')
check('bare text is a Pending item', parseToDoList('just text')[0].status === 'Pending')

console.log('\n--- 2c. status control is present, visible and shared ---')
for (const [name, file] of [['TO-DO', plannerSrc], ['Daily Tracker', trackerSrc]]) {
  check(`${name} renders PlanItemStatus`, file.includes('<PlanItemStatus'))
}
check('both write through the same helper', plannerSrc.includes('setPlanItemStatus(items, id, status)') && trackerSrc.includes('setPlanItemStatus(planItems, id, status)'))
check('status control is not hover-gated', !/pointer:fine[\s\S]{0,200}PlanItemStatus/.test(plannerSrc))
check('tri-state checkbox reports mixed', trackerSrc.includes("'mixed'"))
check('no raw item.done reads remain in the views', !/item\.done/.test(plannerSrc) && !/item\.done/.test(trackerSrc))

console.log('\n--- 2d. local mode never shows a red sync error ---')
check('view-only sheet URL is classified VIEW_ONLY', classifySheetUrl('https://docs.google.com/spreadsheets/d/abc/edit?usp=drivesdk') === SHEET_URL_PROBLEM.VIEW_ONLY)
check('empty URL is UNSET', classifySheetUrl('') === SHEET_URL_PROBLEM.UNSET)
check('writable exec endpoint passes', classifySheetUrl('https://script.google.com/macros/s/ABC123/exec') === null)
// Two call sites plus the declaration itself.
check('every push site uses the resolver', (src.match(/resolvePushStatus\(result\)/g) || []).length === 3)
check('resolver maps blocked to LOCAL, not ERROR', /if \(result\?\.blocked\) return SYNC_STATUS\.LOCAL/.test(src))
// The ternary is allowed to exist exactly once - inside the resolver, where
// mapping a genuine failure to ERROR is the correct behaviour.
check('ERROR/OFFLINE ternary is confined to the resolver', (src.match(/isOnline\(\) \? SYNC_STATUS\.ERROR : SYNC_STATUS\.OFFLINE/g) || []).length === 1)
check('reconnect flush honours skipped', /if \(flushed\.skipped\)/.test(src))

console.log('\n--- 3. header update button removed ---')
// Assert on the rendered control, not the word: the file's doc comment explains
// why the button was removed, so a bare /Update/ match is expected.
check('header has no Update button', !headerSrc.includes('onUpdateToday') && !/onClick=\{onUpdateToday\}/.test(headerSrc))
check('header renders only logo, search and settings', (headerSrc.match(/aria-label="/g) || []).length === 2)
check('header does not import Pencil', !headerSrc.includes('Pencil'))
check('App does not pass onUpdateToday to the header', !/MobileHeader[\s\S]{0,300}onUpdateToday/.test(src))
check('header keeps logo/title', headerSrc.includes('chiliad-logo.png') && headerSrc.includes('Day {activeDayNum'))
check('header keeps search', headerSrc.includes('aria-label="Search"'))
check('header keeps settings', headerSrc.includes('aria-label="Settings and data"'))
check('desktop rail still has Update Today', readFileSync('src/components/Sidebar.jsx', 'utf8').includes('Update Today'))

console.log('\n--- shell still intact ---')
const html = renderToString(<App />)
check('bottom nav renders', (renderToString(<BottomNav activeView="dashboard" onNavigate={() => {}} />) || '').length > 0)
check('no overlay scrim', !html.includes('backdrop-blur-sm'))
check('five nav items with short labels', NAV_ITEMS.filter((i) => i.inBottomNav).length === 5 && NAV_ITEMS.every((i) => i.shortLabel))

console.log(bad ? `\n${bad} problem(s)` : '\nALL GOOD')
if (bad) process.exit(1)