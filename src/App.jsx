import { useCallback, useEffect, useMemo, useState } from 'react'
import Sidebar from './components/Sidebar'
import MobileHeader from './components/MobileHeader'
import BottomNav from './components/BottomNav'
import Toast from './components/Toast'
import CommandPalette from './components/CommandPalette'
import DashboardView from './components/views/DashboardView'
import DailyTrackerView from './components/views/DailyTrackerView'
import GridView from './components/views/GridView'
import TomorrowPlannerView from './components/views/TomorrowPlannerView'
import AnalyticsView from './components/views/AnalyticsView'
import SettingsView from './components/views/SettingsView'
import { computeStats } from './lib/stats'
import { applyStatus, isBlank } from './lib/journey'
import {
  SYNC_STATUS,
  clearQueue,
  fetchRemote,
  flushQueue,
  isOnline,
  isSyncConfigured,
  mergeRemote,
  pushEntry,
  queueSize,
} from './lib/sync'
import { addDaysISO, dayNumForDate, toISODate, TOTAL_DAYS } from './lib/date'
import { planProgressPct, sanitizePlanItems } from './lib/plan'
import useTodayISO from './hooks/useTodayISO'
import {
  blankJourney,
  clearJourney,
  loadJourney,
  saveJourney,
} from './lib/storage'
import { DEFAULT_VIEW } from './lib/nav'
import { LOCK_FUTURE, LOCK_TODAY, canOpen, lockState } from './lib/lock'
import { createTodo, loadTodos, saveTodos } from './lib/todos'

/**
 * Route table. `activeView` holds one of these ids; the sidebar and the
 * renderer both read from here so they can never disagree.
 */
const VIEWS = {
  dashboard: DashboardView,
  tracker: DailyTrackerView,
  grid: GridView,
  planner: TomorrowPlannerView,
  analytics: AnalyticsView,
  settings: SettingsView,
}

/**
 * Translate a push result into a badge state.
 *
 * One function for every push site, because they used to disagree: two of the
 * three treated `blocked` as a failed write. `blocked` means the destination was
 * inspected up front and found unwritable, so no request was attempted and there
 * is nothing that could have succeeded. Reporting that as a red SYNC ERROR was
 * wrong twice over - it is a configuration state, not a failure, and no amount
 * of retrying clears it.
 *
 * A genuine failure still earns SYNC ERROR, and an offline device still gets
 * OFFLINE, because those two are states the user can act on.
 */
function resolvePushStatus(result) {
  if (result?.ok) return SYNC_STATUS.SYNCED
  if (result?.blocked) return SYNC_STATUS.LOCAL
  return isOnline() ? SYNC_STATUS.ERROR : SYNC_STATUS.OFFLINE
}

export default function App() {
  // Kept live rather than read once: when the calendar day rolls over, the
  // planner's writable target, the edit lock, and the streak counters all have
  // to follow it. Tomorrow is derived from this single value, never from a
  // second clock read, so the two can never disagree about which day the
  // planner may write to.
  const todayISO = useTodayISO()
  const tomorrowISO = useMemo(() => addDaysISO(todayISO, 1), [todayISO])

  // The stored record. `days` below is what the app presents.
  const [storedDays, setStoredDays] = useState(loadJourney)

  // Status is derived during render from the date, the progress, and the plan
  // checklist, so ticking a task moves the day from Not Started to In Progress
  // and on to Completed with no second control to keep in sync. Nothing is
  // written back here, so the stored record keeps the user's own choice and
  // the two can never disagree.
  const days = useMemo(() => applyStatus(storedDays, todayISO), [storedDays, todayISO])

  // Open on today, clamped into the window. Hardcoding Day 1 would drop the
  // user on a read-only past day as soon as real time moved past the start.
  const [selectedDayNum, setSelectedDayNum] = useState(() =>
    Math.min(Math.max(dayNumForDate(toISODate(new Date())) ?? 1, 1), TOTAL_DAYS),
  )
  const [activeView, setActiveView] = useState(DEFAULT_VIEW)
  const [toast, setToast] = useState(null)
  // Starts as SAVING so the first paint never claims a sync that has not
  // happened yet; the bootstrap effect settles it within a moment.
  const [syncStatus, setSyncStatus] = useState(SYNC_STATUS.SAVING)
  const [pendingCount, setPendingCount] = useState(() => queueSize())
  const [isPaletteOpen, setIsPaletteOpen] = useState(false)

  // Global sidebar to-do list — shared by Sidebar, Dashboard and Tracker.
  // Held at the top level so every view reacts to changes in the same render.
  const [todos, setTodos] = useState(loadTodos)

  // Persist the stored record, never the derived one. Writing the derived
  // status back would destroy the user's original choice and make every
  // settled past day look like local intent to a background merge.
  useEffect(() => {
    saveJourney(storedDays)
  }, [storedDays])

  // Persist quick tasks under their own key, decoupled from the journey.
  useEffect(() => {
    saveTodos(todos)
  }, [todos])

  /**
   * Background sync on load: drain anything queued from a previous offline
   * session, then pull remote rows and merge them in. Local edits always win
   * the merge, so this can never overwrite unsynced work.
   */
  useEffect(() => {
    let cancelled = false

    async function runBackgroundSync() {
      // A sheet URL that cannot accept a write settles the badge immediately,
      // before any request. Queued writes from a previous session are dropped
      // rather than retried forever against a destination that does not exist.
      if (!isSyncConfigured()) {
        clearQueue()
        setPendingCount(0)
        setSyncStatus(SYNC_STATUS.LOCAL)
        return
      }

      if (!isOnline()) {
        setSyncStatus(SYNC_STATUS.OFFLINE)
        setPendingCount(queueSize())
        return
      }

      setSyncStatus(SYNC_STATUS.SAVING)

      await flushQueue()
      if (cancelled) return
      setPendingCount(queueSize())

      const remote = await fetchRemote()
      if (cancelled) return

      if (!remote.ok) {
        // A missing or unreachable backend is expected in local-only use.
        // This is LOCAL MODE, not an error and not an offline device: the
        // journey is fully persisted and every feature still works.
        setSyncStatus(SYNC_STATUS.LOCAL)
        return
      }

          setStoredDays((prev) => mergeRemote(prev, remote.entries, { isBlank }).days)
      setSyncStatus(SYNC_STATUS.SYNCED)
    }

    runBackgroundSync()
    return () => {
      cancelled = true
    }
  }, [])

/**
   * Global Ctrl/Cmd + K listener, plus Escape-to-close for the palette.
   */
  useEffect(() => {
    if (typeof window === 'undefined') return undefined

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        if (isPaletteOpen) {
          setIsPaletteOpen(false)
          return
        }
      }

      if (event.ctrlKey || event.metaKey) {
        if (event.key.toLowerCase() === 'k') {
          // Stop the browser's own Ctrl+K (link/search) behaviour.
          event.preventDefault()
          setIsPaletteOpen((prev) => !prev)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isPaletteOpen])

  const notify = useCallback((next) => setToast(next), [])
  const dismissToast = useCallback(() => setToast(null), [])
  const closePalette = useCallback(() => setIsPaletteOpen(false), [])
  const openSearch = useCallback(() => setIsPaletteOpen(true), [])

  /**
   * Flush the offline queue as soon as connectivity is restored, so edits
   * made without a network are not stranded.
   */
  useEffect(() => {
    if (typeof window === 'undefined') return undefined

    async function handleOnline() {
      // Reconnecting cannot help if there is nowhere to connect to. Bail out
      // before the flush so this does not resolve to a SYNCED state that never
      // actually synced anything.
      if (!isSyncConfigured()) {
        clearQueue()
        setPendingCount(0)
        setSyncStatus(SYNC_STATUS.LOCAL)
        return
      }

      const flushed = await flushQueue()
      setPendingCount(queueSize())

      // `skipped` means the flush declined to run at all because the
      // destination is unwritable. Reporting SYNCED there would claim a write
      // that never happened and hide the real state behind a green badge.
      if (flushed.skipped) {
        clearQueue()
        setPendingCount(0)
        setSyncStatus(SYNC_STATUS.LOCAL)
        return
      }

      setSyncStatus(flushed.failed > 0 ? SYNC_STATUS.ERROR : SYNC_STATUS.SYNCED)
      if (flushed.pushed > 0) {
        notify({
          tone: 'success',
          message: `Synced ${flushed.pushed} queued change(s).`,
        })
      }
    }

    function handleOffline() {
      setSyncStatus(SYNC_STATUS.OFFLINE)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [notify])

  const stats = useMemo(() => computeStats(days, todayISO), [days, todayISO])
  const currentEntry = days[selectedDayNum - 1]
  const ActiveView = VIEWS[activeView] ?? DashboardView

  /** Commit a single day. Only called on an explicit Save. */
  const handleSave = useCallback(
    (entry) => {
      // Strict lockdown: only the current active date accepts writes.
      // Future days are prohibited outright; past days are read-only so no
      // retroactive editing can slip through, even from a stale form.
      const state = lockState(entry, todayISO)
      if (state === LOCK_FUTURE) {
        notify({
          tone: 'error',
          message: `Day ${entry.dayNum} is a future date — locked.`,
        })
        return
      }
      if (state !== LOCK_TODAY) {
        notify({
          tone: 'error',
          message: `Day ${entry.dayNum} has ended — entries are read-only.`,
        })
        return
      }

      const clamped = {
        ...entry,
        plannedItems: sanitizePlanItems(entry.plannedItems),
        progress: Math.min(Math.max(Number(entry.progress) || 0, 0), 100),
      }

      // A planned day owns its own progress: completion is derived from the
      // checklist so ticking an item moves the heatmap and the stats without
      // a second set of numbers to keep in sync. Days with no plan keep the
      // manual percentage.
      if (clamped.plannedItems.length > 0) {
        clamped.progress = planProgressPct(clamped.plannedItems)
      }

      // 1. Local first, so the UI reflects the save instantly and offline.
      setStoredDays((prev) => {
        const next = [...prev]
        next[clamped.dayNum - 1] = { ...next[clamped.dayNum - 1], ...clamped }
        return next
      })
      notify({ tone: 'success', message: `Day ${clamped.dayNum} saved.` })

      // 2. Background push. Failure is queued, never surfaced as a lost save.
      // No `SAVING` flip first when there is nowhere to push to: that flashes
      // the badge on every keystroke-triggered save and then falls back to
      // LOCAL, which reads as a fault that has just been fixed.
      if (!isSyncConfigured()) setSyncStatus(SYNC_STATUS.LOCAL)
      else setSyncStatus(SYNC_STATUS.SAVING)

      pushEntry(clamped)
        .then((result) => {
          setPendingCount(queueSize())
          setSyncStatus(resolvePushStatus(result))
        })
        .catch(() => {
          setSyncStatus(SYNC_STATUS.ERROR)
          setPendingCount(queueSize())
        })
    },
    [notify, todayISO],
  )

  /**
   * Write a future day's checklist.
   *
   * The only write path allowed to touch a future day, and it is deliberately
   * narrow in two ways. The target must be strictly in the future, so today
   * and the past are unreachable and settled history can never be rewritten.
   * And only `plannedItems` may change: a future day's tasks, log, status,
   * progress, and notes are left alone.
   *
   * Progress is never derived here either. A future day's completion is
   * unknown until the day actually arrives, so writing it now would put a
   * number in the grid for work that has not happened.
   */
  const handleSavePlan = useCallback(
    (dayNum, plannedItems) => {
      const target = days[dayNum - 1]
      if (!target || !target.date || target.date <= todayISO) {
        notify({
          tone: 'error',
          message: 'Plans can only be written for a future date.',
        })
        return
      }

      const clean = sanitizePlanItems(plannedItems)
      const updated = { ...target, plannedItems: clean }

      setStoredDays((prev) => {
        const next = [...prev]
        next[dayNum - 1] = updated
        return next
      })

      // Pushed on the same path as a normal save so the offline queue and the
      // sync badge behave identically for planned writes.
      if (!isSyncConfigured()) setSyncStatus(SYNC_STATUS.LOCAL)
      else setSyncStatus(SYNC_STATUS.SAVING)

      pushEntry(updated)
        .then((result) => {
          setPendingCount(queueSize())
          setSyncStatus(resolvePushStatus(result))
        })
        .catch(() => {
          setSyncStatus(SYNC_STATUS.ERROR)
          setPendingCount(queueSize())
        })
    },
    [days, notify, todayISO],
  )

/**
 * "Update Today" opens the tracker on today's date, falling back to the
 * first day with recorded activity, then to Day 1.
 */
  const handleUpdateToday = useCallback(() => {
    const byDate = days.find((day) => day.date === todayISO)
    if (byDate) {
      setSelectedDayNum(byDate.dayNum)
      setActiveView('tracker')
      return
    }
    const firstLogged = days.find(
      (day) => day.status !== 'Not Started' || day.progress > 0,
    )
    setSelectedDayNum(firstLogged ? firstLogged.dayNum : 1)
    setActiveView('tracker')
  }, [days, todayISO])

  // Jump from the grid/table straight into the tracker for a given day.
  // Future dates cannot be opened at all; past dates open read-only.
  const handleOpenInTracker = useCallback(
    (dayNum) => {
      const day = days[dayNum - 1]
      if (day && !canOpen(day, todayISO)) {
        notify({
          tone: 'error',
          message: `Day ${dayNum} is a future date — it stays locked until its day arrives.`,
        })
        return
      }
      setSelectedDayNum(dayNum)
      setActiveView('tracker')
    },
    [days, todayISO, notify],
  )

  /**
   * Central selection guard used by every view. Blocks future dates so a
   * locked day can never be surfaced for editing anywhere in the app.
   */
  const handleSelectDay = useCallback(
    (dayNum) => {
      const day = days[dayNum - 1]
      if (day && !canOpen(day, todayISO)) {
        notify({
          tone: 'error',
          message: `Day ${dayNum} is a future date — locked.`,
        })
        return
      }
      setSelectedDayNum(dayNum)
    },
    [days, todayISO, notify],
  )

  /** Global to-do handlers — one source of truth for every surface. */
  const handleAddTodo = useCallback((text) => {
    setTodos((prev) => [createTodo(text), ...prev])
  }, [])

  const handleToggleTodo = useCallback((id) => {
    setTodos((prev) =>
      prev.map((task) => (task.id === id ? { ...task, done: !task.done } : task)),
    )
  }, [])

  const handleRemoveTodo = useCallback((id) => {
    setTodos((prev) => prev.filter((task) => task.id !== id))
  }, [])

  const handleEditTodo = useCallback((id, text) => {
    setTodos((prev) =>
      prev.map((task) => (task.id === id ? { ...task, text } : task)),
    )
  }, [])

  const handleImport = useCallback(
    (imported) => {
      setStoredDays(imported)
    },
    [],
  )

  const handleReset = useCallback(() => {
    clearJourney()
    setStoredDays(blankJourney())
    setSelectedDayNum(1)
  }, [])

  /** Props shared by every view so each one stays a pure presentation layer. */
  const viewProps = {
    days,
    stats,
    todayISO,
    tomorrowISO,
    selectedDayNum,
    onSelectDay: handleSelectDay,
    onSave: handleSave,
    onSavePlan: handleSavePlan,
    currentEntry,
    onNavigate: setActiveView,
    onOpenInTracker: handleOpenInTracker,
    onImport: handleImport,
    onReset: handleReset,
    onNotify: notify,
    syncStatus,
    pendingCount,
    // Global to-do state shared by Dashboard and Daily Tracker.
    todos,
    onAddTodo: handleAddTodo,
    onToggleTodo: handleToggleTodo,
    onRemoveTodo: handleRemoveTodo,
    onEditTodo: handleEditTodo,
  }

  return (
    // `h-[100dvh]` rather than `h-screen`: on mobile browsers `100vh` is the
    // *largest* viewport, so it includes the space behind the collapsing
    // address bar and pushes the footer below the fold. `dvh` tracks the
    // viewport actually visible right now.
    //
    // `w-full` rather than `w-screen`: `100vw` counts the classic scrollbar,
    // which is enough on its own to push a few pixels of horizontal overflow
    // onto the root and produce a whole-page sideways scroll on a phone, and to
    // overflow the viewport on desktop. `w-full` is the same width without the
    // scrollbar added back.
    <div className="flex h-[100dvh] w-full overflow-hidden bg-obsidian text-ink">
      <Sidebar
        activeView={activeView}
        onNavigate={setActiveView}
        activeDayNum={selectedDayNum}
        onUpdateToday={handleUpdateToday}
        syncStatus={syncStatus}
        pendingCount={pendingCount}
        onOpenSearch={openSearch}
      />

      {/* Content column: the mobile bar, then the one scrolling region. */}
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileHeader
          activeView={activeView}
          activeDayNum={selectedDayNum}
          onOpenSearch={openSearch}
          onOpenSettings={() => setActiveView('settings')}
        />

        {/*
          `min-h-0` is what lets this actually scroll: a flex child defaults to
          `min-height: auto`, which refuses to shrink below its content and
          makes an `overflow-y-auto` here a no-op.
        */}
        <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain scroll-smooth bg-obsidian">
          {/*
            `pb-20` clears the fixed BottomNav so the last card and the footer
            are not permanently underneath it; `md:pb-6` gives that space back
            on desktop, where the rail is a sibling and nothing is fixed over
            the content.

            The safe-area inset itself is handled by the bottom bar, which pads
            for it where it actually sits — padding it here as well would stack
            a full extra inset of dead space above the bar on a notched phone.
          */}
          <div className="flex min-h-full w-full flex-col px-4 py-4 pb-20 md:px-6 md:py-6 md:pb-6 lg:px-10">
            <div className="flex-1 space-y-4 md:space-y-6">
              <ActiveView {...viewProps} />

              <footer className="w-full border-t border-edge py-4 text-2xs text-ink-muted">
                Chiliad - 1,000 Day Journey. Data is stored locally in your browser.
              </footer>
            </div>
          </div>
        </main>
      </div>

      {/*
        The mobile tab bar. A sibling of the content column rather than a child
        of `main`, because it is `fixed` and must not scroll with the content or
        inherit `main`'s scroll container.
      */}
      <BottomNav activeView={activeView} onNavigate={setActiveView} />

      <Toast toast={toast} onDismiss={dismissToast} />

      <CommandPalette
        isOpen={isPaletteOpen}
        onClose={closePalette}
        days={days}
        onSelectDay={handleOpenInTracker}
      />
    </div>
  )
}