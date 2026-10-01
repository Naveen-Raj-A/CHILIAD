# Chiliad — Sidebar Restructure, Tomorrow Planner, Global Notes, Sync Badge

## Context

`C:\CHILIAD` is a React 19 + Vite 8 + Tailwind 3 single-page app: a 1,000-day journey
tracker. `src/App.jsx` is the single state owner; it holds the 1,000-day array, the
selected day, the active view, to-dos, and sync status, then swaps one of five view
components from a `VIEWS` table (`App.jsx:36-42`).

Current shape: 5 views, a sidebar with a collapsible global Quick To-Do block
(`Sidebar.jsx:99-135`), `localStorage` as the source of truth (`src/lib/storage.js`),
a resilient sync client that never throws (`src/lib/sync.js`), and a strict date
lockdown — future locked, today editable, past read-only (`src/lib/lock.js`).

Goal: restructure the sidebar, split Dashboard (read-only command center) from Daily
Tracker (the one editor), add a time-locked Tomorrow Planner, add a global notes
scratchpad, and fix the misleading sync badge.

### Findings that shape this plan

- **No backend in the repo.** `src/lib/sync.js:11` targets `/api/sync`, which does not
  exist here. Confirmed out of scope: the backend is deployed elsewhere. The badge work
  is client-side only.
- **The "sidebar footer To-Do entry" in the brief does not exist.** `Sidebar.jsx:138-149`
  holds only `SyncBadge` + "Update Today". The Quick To-Do List is a separate block above
  it. Decision: remove that block; the Dashboard keeps its to-do card.
- **The Daily Tracker enforces no lockdown in the UI.** Past days are fully editable and
  the write is only rejected after the fact by `App.jsx:180-194`.
- **`JourneyTable.jsx:1,6` imports `Lock`, `Eye`, `LOCK_PAST`, `lockState` and never uses
  them**, while its own doc comment (`JourneyTable.jsx:46-52`) promises dimmed future
  rows with a lock indicator. Either implement it or drop the imports.
- **`DailyTrackerView.jsx:272` has dead stray JSX** (`<X className="h-4 w-4" .../>`) after
  the component closes. Valid syntax, zero effect — delete it.
- `src/lib/status.js:26` exports `SYNC_STYLES`, which nothing imports.

### Lockdown interaction that drives the design

`handleSave` (`App.jsx:180-194`) rejects every write whose date is not today. The
Tomorrow Planner must write to **tomorrow**, a future day. So the planner needs its own
narrow write path in `App` that bypasses the day lockdown while touching **only**
`plannedItems` of **only** tomorrow. Reusing `handleSave` would make the feature
impossible to build.

## Decisions (confirmed with the user)

| Decision | Choice |
| --- | --- |
| Sheet URL | `src/lib/config.js` constant, overridable by `VITE_GOOGLE_SHEET_URL` |
| Backend | Exists outside the repo; no server work here |
| Planner storage | New `plannedItems` field on the day entry |
| Sidebar to-do block | Removed; Dashboard keeps its card |
| Badge states | `SAVING` / `SYNCED` / `LOCAL MODE` / `OFFLINE` / `ERROR` |
| "Lock into today" | Same field, rendered read-only — no copying |
| Plan → progress % | Auto-derived `round(done/total*100)` written to `progress` |
| Planner scope | Tomorrow editable; other days visible read-only |

## Tasks

### 1. Foundation — config and the plan/scratchpad modules

1. Create `src/lib/config.js`:
   ```js
   export const GOOGLE_SHEET_URL = import.meta.env.VITE_GOOGLE_SHEET_URL || ''
   export function hasSheetUrl() { return Boolean(GOOGLE_SHEET_URL) }
   ```
2. Create `.env.example` with `VITE_GOOGLE_SHEET_URL=` and add `.env*` (keep
   `.env.example`) to `.gitignore`. Do not invent a URL.
3. Create `src/lib/plan.js`:
   - `createPlanItem(text)` → `{ id, text, done: false }`; ids via
     `Date.now().toString(36)` + random suffix, matching the `makeId` pattern in
     `src/lib/todos.js:18-20`.
   - `planProgressPct(items)` → `0` when empty, else `Math.round(done / total * 100)`.
   - `sanitizePlanItems(raw)` → array of valid `{id, text, done}`, drops blanks/dupe ids.
4. Create `src/lib/notes.js` — `NOTES_STORAGE_KEY = 'chiliad_global_notes'`,
   `loadNotes()`, `saveNotes(text)`. Same guarded `try/catch` + `typeof window` shape as
   `src/lib/storage.js:25-43`. Add a `subscribeNotes(cb)` helper built on the browser
   `storage` event so two open tabs stay in sync.

### 2. Journey data model — `plannedItems`

5. `src/lib/journey.js`:
   - `ENTRY_FIELDS` (line 5): add `'plannedItems'`.
   - `emptyEntry` (line 11): add `plannedItems: []`.
   - `normalizeEntry` (line 46): coerce `raw.plannedItems` through `sanitizePlanItems`.
6. `src/lib/csv.js`: add a `Planned Items` column to `CSV_COLUMNS` (after `Main Tasks`)
   and emit `[!] text` / `[x] text` lines joined by `; `. Keep the injected
   `tagsForDay` pattern; import `tagsForDay`-style access is already dependency-free here.
7. `src/lib/sync.js` `mergeRemote` (line 254-261): also adopt `plannedItems` from the
   remote record when the local day is blank, using `sanitizePlanItems`.
8. Existing `chiliad_journey_data` records load fine — `normalizeEntry` fills
   `plannedItems: []` for every pre-existing day, so no migration is needed.

### 3. Sidebar and nav

9. `src/lib/nav.js`: import `CheckSquare`, insert
   `{ id: 'planner', label: 'Tomorrow Planner', icon: CheckSquare }` between `grid` and
   `analytics`, so the order is Dashboard → Daily Tracker → 1,000-Day Grid → Tomorrow
   Planner → Analytics → Settings & Data.
10. `src/components/Sidebar.jsx`:
    - Delete the Quick To-Do List block (lines 98-135) and its `todosOpen` state,
      `openCount`, and the `ListTodo`/`ChevronDown` imports.
    - Drop the `todos`, `onAddTodo`, `onToggleTodo`, `onRemoveTodo`, `onEditTodo` props
      from the signature (lines 28-32) and stop passing them from `App.jsx:351-355`.
    - Keep brand, active-day pill, search button, `NAV_ITEMS` list, footer.
    - Footer: `SyncBadge` + the new `ViewSheetButton` side by side, then "Update Today".
11. `src/App.jsx` `VIEWS` (line 36): add `planner: TomorrowPlannerView`. Keep `todos`
    state in `App` — the Dashboard card and the Tracker still consume it.

### 4. Sync badge

12. `src/lib/sync.js`: add `SYNC_STATUS.LOCAL = 'LOCAL'`.
13. `src/components/SyncBadge.jsx`: add an emerald `LOCAL MODE` tone (reuse the
    `SYNCED` wrapper), set the `SAVING` label to `SAVING...` per the brief, and add
    `hasSheetUrl`-driven `onViewSheet` support via the separate `ViewSheetButton`
    (keep `SyncBadge` a pure status pill).
14. Create `src/components/ViewSheetButton.jsx`: a small pill button that calls
    `window.open(GOOGLE_SHEET_URL, '_blank', 'noopener,noreferrer')`. When the URL is
    empty, render it `disabled` with `title="Sheet URL not configured — set
    VITE_GOOGLE_SHEET_URL"`. Use the `ExternalLink` icon.
15. `src/components/Headline.jsx`: render `ViewSheetButton` next to `SyncBadge`, and
    accept/forward it. This covers "next to the Sync badge in the Header" for the
    Dashboard, Grid, and Analytics headlines at once.
16. `src/App.jsx` `runBackgroundSync` (lines 81-107) — the actual bug fix:
    - `!isOnline()` → `OFFLINE` (unchanged; this is a genuinely offline device).
    - `fetchRemote()` not ok → **`LOCAL`**, not `OFFLINE`. This is the misleading
      behavior being fixed: a missing backend currently renders as "Offline".
    - success → `SYNCED`.
    - Initial state (line 53-55): `isOnline() ? SYNCED : OFFLINE` → start as
      `SAVING` and let the effect settle it, so first paint never claims a sync
      that has not happened.
17. `src/components/views/SettingsView.jsx`: add a "View Google Sheet" action in the
    Backup & Restore grid (4th tile, or its own row) reusing `ViewSheetButton`, plus the
    configured URL shown as read-only text when set.

### 5. Tomorrow Planner view

18. Create `src/components/views/TomorrowPlannerView.jsx`:
    - `const tomorrowISO = addDaysISO(todayISO, 1)` — add `addDaysISO(iso, n)` to
      `src/lib/date.js` alongside `dateForDay` (line 57).
    - Resolve `tomorrow = days.find(d => d.date === tomorrowISO)`. If it is missing
      (only possible outside the 1,000-day window), show an explanatory empty state.
    - Editable checklist for tomorrow only: add, rename inline, delete, reorder optional
      (skip reorder — not requested). Reuse the `QuickTodos` visual language and the
      `field`/`card` utility classes already in `src/index.css`.
    - `disabled` unless `tomorrow.date === tomorrowISO`; show `lockLabel(lockState(...))`
      when locked.
    - Read-only section below: the last 14 days that have `plannedItems`, newest first,
      with per-day progress `planProgressPct` and a `ProgressBar`. Explicitly not
      editable.
19. Add `handleSavePlan` to `src/App.jsx` (beside `handleSave`, sharing `notify`):
    ```js
    const handleSavePlan = useCallback((dayNum, plannedItems) => {
      setDays((prev) => {
        const day = prev[dayNum - 1]
        if (!day || day.date !== tomorrowISO) { /* notify error, return prev */ }
        return prev.map((d, i) => i === dayNum - 1 ? { ...d, plannedItems: sanitizePlanItems(plannedItems) } : d)
      })
      // push to sync, reusing the same pushEntry/queue path as handleSave
    }, [...])
    ```
    It must merge **only** `plannedItems` — `mainTasks`, `status`, `progress`, `details`,
    and `notes` of a future day stay untouched. Push the resulting entry via `pushEntry`
    so the offline queue and `SyncBadge` behave as they do for normal saves.
20. Add `tomorrowISO`, `onSavePlan`, and `onSave` to the `viewProps` object
    (`App.jsx:318-339`) so every view receives it.

### 6. Auto-derived progress

21. In `App.handleSave` (line 196-199), after the existing clamp: if
    `clamped.plannedItems?.length`, set
    `clamped.progress = planProgressPct(clamped.plannedItems)` so ticking a plan item
    moves the heatmap cell and `stats` with no extra code.
22. The Daily Tracker must reflect this: when the selected day has `plannedItems`, render
    the progress input `readOnly` with a hint "Derived from N planned items", otherwise
    keep the manual input. A control that silently ignores typing is worse than none.

### 7. Global notes scratchpad

23. Create `src/components/NotesCanvas.jsx`: a `card` with a heading, a character
    count, and a `textarea` bound to local state. Save on a 400ms debounce so typing
    does not hammer `localStorage`; flush on blur and on unmount. Subscribe to
    `subscribeNotes` to pick up changes from another tab.
24. Render `<NotesCanvas />` in **both** `DashboardView` and `DailyTrackerView`. Because
    each view loads on mount from the same key, notes persist across navigation — that
    is the "sync live across views" requirement; no App-level state is needed.
25. Load/save are cheap and local, so no App wiring beyond nothing — `NotesCanvas` owns
    its own state. Confirm no `App` prop is required.

### 8. Dashboard becomes a read-only command center

26. `src/components/views/DashboardView.jsx`:
    - **Delete** the `ActiveFocusForm` import (line 5) and its render block (lines 96-101).
    - Order: `Headline` → 4 macro `StatCard`s (Total Days, Completed, Current Streak,
      Overall Progress) → **Today's Status Snapshot** (read-only: today's `mainTasks`,
      `status`, `details` preview, `ProgressBar`) → **Tomorrow's Strategy Summary**
      (tomorrow's `plannedItems` read-only, with `planProgressPct`) → `NotesCanvas` →
      Quick Jump matrix (Days 1-50, unchanged).
    - The Today's/Tomorrow's snapshots need `tomorrowISO` — add it to the destructured
      props and to `App`'s `viewProps`.
27. Delete `src/components/ActiveFocusForm.jsx` — the Daily Tracker is now the only
    editor, so this file has no remaining consumer. Grep to confirm before deleting.

### 9. Daily Tracker owns editing and enforces the lockdown

28. `src/components/views/DailyTrackerView.jsx`:
    - Add `const state = lockState(entry, todayISO)` and `const editable = canEdit(entry, todayISO)`.
    - Render a `lockLabel(state)` banner at the top of the form card.
    - `disabled={!editable}` on `mainTasks`, `status`, `progress`, `details`, `notes` and
      on both Discard and Save. `App.handleSave` stays as the defence-in-depth guard.
    - When the day has `plannedItems`, render them as a read-only/editable checklist
      bound to the day (ticking calls `onSave`), and make `progress` read-only per
      task 22.
    - Remove the dead stray JSX at line 272.
29. `src/components/JourneyTable.jsx`: honor the doc comment — dim future rows, show a
    `Lock` icon, and skip `onSelectDay` for them (use the already-imported `Lock` /
    `lockState` / `LOCK_FUTURE`); drop the genuinely unused `Eye` and `LOCK_PAST`
    imports.

### 10. Cleanup

30. Remove the unused `SYNC_STYLES` export from `src/lib/status.js:26`.
31. `npm run lint` (`oxlint`) must be clean; `react/only-export-components` is set to
    `warn` in `.oxlintrc.json` and the brief demands 0 warnings — keep new modules
    exporting plain functions/constants, and export React components as default exports
    only.

## Validation

Run from `C:\CHILIAD` (these were blocked in plan mode; the implementing agent needs
permission for `npm`):

1. `npm run build` → exit 0, no warnings. Regenerates PWA icons first via
   `scripts/generate-icons.mjs`, so it exercises the config change too.
2. `npm run lint` → 0 errors, 0 warnings.
3. `npm run dev`, then confirm by hand:
   - Sidebar order is Dashboard, Daily Tracker, 1,000-Day Grid, **Tomorrow Planner**,
     Analytics, Settings & Data; no Quick To-Do block remains; the Dashboard still shows
     "Today's Quick Action Items" and it still syncs with any other surface.
   - Badge reads emerald `LOCAL MODE` with no backend reachable, `SAVING...` during a
     save, `SYNCED` after a successful push, neutral `OFFLINE` only when the device is
     offline.
   - "View Google Sheet" appears in the sidebar footer, the headline, and Settings;
     with no env var it is disabled with the explanatory tooltip; with one set it opens
     the sheet in a new tab.
   - Dashboard has no editable form; Today's snapshot and Tomorrow's summary are
     read-only; the notes canvas appears on both Dashboard and Tracker and survives
     navigation and reload.
   - Planner: add items for tomorrow, reload, they persist. Try to edit a past or
     further-future day — it is read-only with a lock badge.
   - Tick a plan item on **today** via the Tracker → `progress` updates and the heatmap
     cell changes. Tick an item for **tomorrow** in the Planner → no `progress` write on
     a locked day.
   - Export JSON → import → planned items and notes survive. Export CSV and confirm the
     new `Planned Items` column appears.

## Risks

- **`addDaysISO` across a DST boundary** — use the same local-time `setDate` approach as
  `dateForDay` (`src/lib/date.js:57-61`) and `toISODate`, never `toISOString()`, to avoid
  the off-by-one-day shift the existing comments warn about.
- **Deriving `progress` from the plan changes existing behavior** for anyone who already
  hand-types a percentage on a planned day. Mitigation: only derive when
  `plannedItems.length > 0`, and make the field visibly read-only when derived.
- **CSV column change** breaks any spreadsheet consuming an existing export by column
  position. Accepted; document the new column in the export description.
- **`/api/sync` shape for `plannedItems`** is unverified because the backend is external.
  `mergeRemote` sanitizes defensively, so an older backend that omits the field simply
  leaves the local plan intact.
- **No test framework** exists in this repo. Verification is build + lint + the manual
  checklist above. Adding a test runner is out of scope.
