# Chiliad

A 1,000-day journey tracker: a read-only command center, one focused daily
editor, forward planning for any upcoming day, a heatmap, streak and milestone
analytics, and a global scratchpad. Runs entirely in the browser with local
storage as the source of truth; the network is an optional enhancement.

React 19 + Vite 8 + Tailwind 3. No test framework — verify with `npm run lint`
and `npm run build`.

## Commands

```bash
npm run dev      # dev server
npm run build    # regenerate PWA icons, then production build
npm run icons    # regenerate PWA icons only
npm run preview  # serve the production build
npm run lint     # oxlint
```

## Configuration

Copy `.env.example` to `.env` and fill in the sheet URL:

```
VITE_GOOGLE_SHEET_URL=
```

Optional. With it unset, every "View Google Sheet" control renders disabled
with an explanatory tooltip, and nothing is guessed. The constant lives in
`src/lib/config.js`.

## Views

- **Dashboard** — read-only command center: macro metrics, today's status
  snapshot, the next queued plan, quick to-dos, and the global scratchpad.
- **Daily Tracker** — the only day editor. Tasks, plan checklist, log, progress,
  reflections.
- **1,000-Day Grid** — period analytics, the full heatmap, and a searchable,
  filterable, paginated table.
- **TO - DO** — forward planning. The next 30 days are offered as targets;
  every plan that has settled is listed below in order, read-only.
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

## Status is derived, never typed

There is no status dropdown. A day's status is a pure function of its date,
its recorded progress, and its plan checklist (`src/lib/status.js`):

| Status          | Rule                                                     |
| --------------- | -------------------------------------------------------- |
| `Completed`     | Progress is 100%, or every planned item is ticked.        |
| `Not Started`   | The day is in the future, or today with nothing recorded. |
| `In Progress`   | Today, with at least some progress or a tick.             |
| `Not Completed` | The day is over and it did not reach 100%.                |

Four values, not five: `Done` was folded into `Completed` and older records
migrated on load. `Not Completed` is the honest label for a missed day — it
used to be indistinguishable from a day that was never touched.

Completion is tested first, so a finished day stays finished once it is in the
past instead of decaying to `Not Completed` the moment midnight passes.

Because the status follows the record, ticking a task is the only action
needed to move a day forward, and status and progress cannot drift apart. The
one explicit override is **Mark day complete**, which sets progress to 100% on
a manual day and ticks the whole checklist on a planned day.

Derivation happens on read (`applyStatus`) and never writes to storage. The
stored `status` is preserved untouched, so derivation is identity-stable and
causes no re-render churn.

## Midnight roll-over

The clock is live, not read once: `src/hooks/useTodayISO.js` re-reads the date
on an interval and whenever the tab regains focus, so a window left open
overnight — or restored from the background after midnight — notices the new day
instead of treating yesterday as today.

The previous day re-derives to `Not Completed` and the new one starts
`Not Started`, from the same records. Nothing is promoted or back-filled.

A derived status is **not** activity. `isLogged` counts content, not status, so
an untouched new morning cannot pad a streak or the activity rate on its own.

Streak counters walk back from today rather than from Day 1000, and an
unwritten today keeps the run built up through yesterday — it takes a whole
missed day to break a streak.

## Plans and progress

The planner writes `plannedItems` onto the target day's entry, so a plan travels
with the record: backups, CSV export, and the sync queue all carry it. Once a
date arrives, those same items are the day's action items in the Tracker —
nothing is copied, so there is only ever one copy of a plan.

Planning is forward-only. Any of the next 30 days can be a target; once a date
has passed it moves into the settled list, which is chronological and
read-only.

For a day that has a plan, `progress` is derived from checklist completion
rather than typed: `App.handleSave` recomputes it on every save
(`Math.round((done / total) * 100)`), and status follows from it. Days with no
plan keep the manual percentage. This is why ticking an item moves the
checkmark, the heatmap, the stats, and the `To-Do List` cell in the sheet
together.

The Data Table shows the same `[x]` / `[ ]` list, so what the table displays and
what the sheet stores are recognisably the same thing.

## Layout

The app is a fixed full-window shell: a full-height sidebar beside a main panel,
with each scrolling independently. The outer element is `h-screen w-screen
overflow-hidden`, so the page itself never scrolls and the sidebar footer stays
pinned. Navigation is the sidebar's scrolling region, so a long list cannot
push the sync and Sheet controls off-screen.

## Data

| Key                        | Contents                              |
| -------------------------- | ------------------------------------- |
| `chiliad_journey_data`     | The 1,000-day record                  |
| `chiliad_global_todos`     | Quick to-do list                      |
| `chiliad_global_notes`     | Scratchpad                            |
| `chiliad_pending_sync`     | Queued offline writes                 |

Records written before the planner existed load with an empty `plannedItems`;
no migration is needed. The scratchpad is never synced or included in backups.
It is saved 400ms after typing stops and re-read on `storage` events, so two
tabs stay in step.

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

### Sheet schema

The wire format is the sheet. `SHEET_COLUMNS`, `toSheetRow`, and `fromSheetRow`
in `src/lib/sync.js` define one eight-column contract, and both the push, the
queued retry, and the merge go through it, so the payload and the parser cannot
drift apart.

| Column                | Field         |
| --------------------- | ------------- |
| `Day Number`          | `dayNum`      |
| `Date`                | `date`        |
| `Main Tasks`          | `mainTasks`   |
| `To-Do List`          | `plannedItems`|
| `Status`              | `status`      |
| `Progress %`          | `progress`    |
| `Details / Log`       | `details`     |
| `Notes & Reflections` | `notes`       |

Rows are keyed by column name, not index, so a column can be added without
silently shifting data sideways. Parsing is tolerant: a renamed header, a blank
or stringified `Progress %`, or a missing `Day Number` degrades instead of
throwing, and the row is always bound to its day slot by position.

`To-Do List` is a real round trip, not a one-way export. `planToText` flattens
the checklist to one checkbox line per item — `[x]` for done, `[ ]` for open,
newline-separated — and `parseToDoList` reads it back into structured items. A
plan written or edited by hand in the spreadsheet therefore imports as a working
checklist. A bare line with no marker is read as an open item, `[X]` is
accepted as ticked, and `[!]` — the pre-`To-Do List` open marker — still reads
as open, so older exports migrate without being rewritten.

Because items are newline-separated rather than comma- or semicolon-separated,
an item containing a comma cannot corrupt the cell; the CSV exporter quotes it
per RFC 4180.

A refresh merges remote rows into local days, and local content always wins — a
remote row only fills a day that holds no local intent. A background refresh
therefore can never clobber unsynced work.

### Exports

The CSV export (`src/lib/csv.js`) uses the same column order as the sheet, so
the two line up field by field: `Day`, `Date`, `Main Tasks`, `To-Do List`,
`Status`, `Progress %`, `Details / Log`, `Notes`, plus a trailing `Tags` column
that exists only in the CSV. The JSON export carries `plannedItems` as real
structured items.

## Icons

`scripts/generate-icons.mjs` writes `public/chiliad-logo.png`,
`apple-touch-icon.png`, `pwa-192x192.png`, `pwa-512x512.png`, and
`favicon.ico` from a single source. It runs automatically as the first step of
`npm run build`, so the icons cannot go stale relative to the sidebar branding
that uses them.

