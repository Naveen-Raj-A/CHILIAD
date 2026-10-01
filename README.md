# Chiliad

A 1,000-day journey tracker: daily logs, a heatmap, streak and milestone
analytics, and a time-locked planner for tomorrow. Runs entirely in the browser
with local storage as the source of truth; the network is an optional
enhancement.

React 19 + Vite 8 + Tailwind 3. No test framework — verify with `npm run lint`
and `npm run build`.

## Commands

```bash
npm run dev      # dev server
npm run build    # regenerate PWA icons, then production build
npm run preview  # serve the production build
npm run lint     # oxlint
```

## Configuration

Copy `.env.example` to `.env` and fill in the sheet URL:

```
VITE_GOOGLE_SHEET_URL=
```

Optional. With it unset, every "View Google Sheet" control renders disabled
with an explanatory tooltip, and nothing is guessed. The default lives in
`src/lib/config.js`.

## Views

- **Dashboard** — read-only executive command center: macro metrics, today's
  status snapshot, tomorrow's queued plan, and the global scratchpad.
- **Daily Tracker** — the only editor. Tasks, log, progress, reflections.
- **1,000-Day Grid** — period analytics, the full heatmap, and a searchable,
  filterable, paginated table.
- **Tomorrow Planner** (`TO - DO`) — forward-only planning. Tomorrow is the
  single editable target; settled plans are shown read-only.
- **Analytics** — streaks, milestone velocity, status breakdown.
- **Settings & Data** — JSON/CSV backup and restore, storage status, reset.

## Date lockdown

Days are classified against today (`src/lib/lock.js`):

| State   | Rule                                     |
| ------- | ---------------------------------------- |
| Future  | Locked. Cannot be opened or edited.      |
| Today   | The only editable day.                   |
| Past    | Read-only. No retroactive editing.       |

The rules are applied to the controls themselves and re-checked in
`App.handleSave`, so a bypassed control still cannot commit a write outside
today. The journey is anchored to a fixed Day 1 (`JOURNEY_START_ISO` in
`src/lib/date.js`); dates are always derived, never read from storage.

## Midnight roll-over

The clock is live, not read once: `src/hooks/useTodayISO.js` re-reads the date
on an interval and whenever the tab regains focus, so a window left open
overnight — or restored from the background after midnight — notices the new day
instead of treating yesterday as today.

When a date becomes today it stops being "Not Started" and is presented as
"In Progress", so the day reads as live rather than blank. Any status the user
has set is left alone, so a closed day stays closed. This is derived during
render (`promoteToday`) rather than written by an effect, so the stored record
and the record on screen can never disagree.

Promoting a day is **not** treated as activity. `isLogged` counts content, not
status, so an untouched new morning cannot pad a streak or the activity rate on
its own.

Streak counters walk back from today rather than from Day 1000, and an
unwritten today keeps the run built up through yesterday — it takes a whole
missed day to break a streak.

## Plans and progress

The Tomorrow Planner writes `plannedItems` onto the target day's entry, so a
plan travels with the record: backups, CSV export, and the sync queue all carry
it. Once a date arrives, those same items are the day's action items in the
Tracker — nothing is copied, so there is only ever one copy of a plan.

For a day that has a plan, `progress` is derived from checklist completion
rather than typed. Days with no plan keep the manual percentage. This is why
ticking an item moves the heatmap and the stats.

## Data

| Key                        | Contents                              |
| -------------------------- | ------------------------------------- |
| `chiliad_journey_data`     | The 1,000-day record                  |
| `chiliad_global_todos`     | Quick to-do list                      |
| `chiliad_global_notes`     | Scratchpad                            |
| `chiliad_pending_sync`     | Queued offline writes                 |

Records written before the planner existed load with an empty `plannedItems`;
no migration is needed. The scratchpad is never synced or included in backups.

## Sync

`src/lib/sync.js` targets `/api/sync` and never throws — every call resolves to
a result object, so a missing or failing backend degrades to local-only use
rather than breaking the app. The badge distinguishes:

- `SAVING...` — a sync is in flight.
- `SYNCED` — the backend answered.
- `LOCAL MODE` — no backend reachable; running on local storage. Emerald, not a
  fault.
- `OFFLINE` — the device itself has no connection.
- `SYNC ERROR` — a write genuinely failed.

Failed writes queue locally and flush when connectivity returns.
