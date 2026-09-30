import { useCallback, useEffect, useMemo, useState } from 'react'
import Sidebar from './components/Sidebar'
import Toast from './components/Toast'
import CommandPalette from './components/CommandPalette'
import DashboardView from './components/views/DashboardView'
import DailyTrackerView from './components/views/DailyTrackerView'
import GridView from './components/views/GridView'
import AnalyticsView from './components/views/AnalyticsView'
import SettingsView from './components/views/SettingsView'
import { computeStats } from './lib/stats'
import { isLogged } from './lib/journey'
import {
  SYNC_STATUS,
  fetchRemote,
  flushQueue,
  isOnline,
  mergeRemote,
  pushEntry,
  queueSize,
} from './lib/sync'
import { toISODate } from './lib/date'
import {
  blankJourney,
  clearJourney,
  loadJourney,
  saveJourney,
} from './lib/storage'
import { DEFAULT_VIEW } from './lib/nav'

/**
 * Route table. `activeView` holds one of these ids; the sidebar and the
 * renderer both read from here so they can never disagree.
 */
const VIEWS = {
  dashboard: DashboardView,
  tracker: DailyTrackerView,
  grid: GridView,
  analytics: AnalyticsView,
  settings: SettingsView,
}

export default function App() {
  // Resolved once on mount: the journey is anchored to the day it was opened.
  const [todayISO] = useState(() => toISODate(new Date()))

  const [days, setDays] = useState(loadJourney)
  // Day 1 is the starting point on a fresh journey.
  const [selectedDayNum, setSelectedDayNum] = useState(1)
  const [activeView, setActiveView] = useState(DEFAULT_VIEW)
  const [toast, setToast] = useState(null)
  const [syncStatus, setSyncStatus] = useState(
    isOnline() ? SYNC_STATUS.SYNCED : SYNC_STATUS.OFFLINE,
  )
  const [pendingCount, setPendingCount] = useState(() => queueSize())
  const [isPaletteOpen, setIsPaletteOpen] = useState(false)

  // Persist on every change so a refresh never loses edits.
  useEffect(() => {
    saveJourney(days)
  }, [days])

  /**
   * Background sync on load: drain anything queued from a previous offline
   * session, then pull remote rows and merge them in. Local edits always win
   * the merge, so this can never overwrite unsynced work.
   */
  useEffect(() => {
    let cancelled = false

    async function runBackgroundSync() {
      if (!isOnline()) {
        setSyncStatus(SYNC_STATUS.OFFLINE)
        setPendingCount(queueSize())
        return
      }

      setSyncStatus(SYNC_STATUS.SAVING)

      const flushed = await flushQueue()
      if (cancelled) return
      setPendingCount(queueSize())

      const remote = await fetchRemote()
      if (cancelled) return

      if (!remote.ok) {
        // A missing backend is expected in local-only use; degrade quietly.
        setSyncStatus(
          flushed.pushed > 0 ? SYNC_STATUS.SYNCED : SYNC_STATUS.OFFLINE,
        )
        return
      }

      setDays((prev) => mergeRemote(prev, remote.entries, { isLogged }).days)
      setSyncStatus(SYNC_STATUS.SYNCED)
    }

    runBackgroundSync()
    return () => {
      cancelled = true
    }
  }, [])

  /**
   * Global Ctrl/Cmd + K listener. Bound once here so the palette opens from
   * any view without each view registering its own handler.
   */
  useEffect(() => {
    if (typeof window === 'undefined') return undefined

    function handleKeyDown(event) {
      const isPaletteCombo = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k'
      if (isPaletteCombo) {
        // Stop the browser's own Ctrl+K (link/search) behaviour.
        event.preventDefault()
        setIsPaletteOpen((prev) => !prev)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const notify = useCallback((next) => setToast(next), [])
  const dismissToast = useCallback(() => setToast(null), [])
  const closePalette = useCallback(() => setIsPaletteOpen(false), [])

  /**
   * Flush the offline queue as soon as connectivity is restored, so edits
   * made without a network are not stranded.
   */
  useEffect(() => {
    if (typeof window === 'undefined') return undefined

    async function handleOnline() {
      const flushed = await flushQueue()
      setPendingCount(queueSize())
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

  const stats = useMemo(() => computeStats(days), [days])
  const currentEntry = days[selectedDayNum - 1]
  const ActiveView = VIEWS[activeView] ?? DashboardView

  /** Commit a single day. Only called on an explicit Save. */
  const handleSave = useCallback(
    (entry) => {
      const clamped = {
        ...entry,
        progress: Math.min(Math.max(Number(entry.progress) || 0, 0), 100),
      }

      // 1. Local first, so the UI reflects the save instantly and offline.
      setDays((prev) => {
        const next = [...prev]
        next[clamped.dayNum - 1] = { ...next[clamped.dayNum - 1], ...clamped }
        return next
      })
      notify({ tone: 'success', message: `Day ${clamped.dayNum} saved.` })

      // 2. Background push. Failure is queued, never surfaced as a lost save.
      setSyncStatus(SYNC_STATUS.SAVING)
      pushEntry(clamped)
        .then((result) => {
          setPendingCount(queueSize())
          if (result.ok) {
            setSyncStatus(SYNC_STATUS.SYNCED)
          } else {
            setSyncStatus(isOnline() ? SYNC_STATUS.ERROR : SYNC_STATUS.OFFLINE)
          }
        })
        .catch(() => {
          setSyncStatus(SYNC_STATUS.ERROR)
          setPendingCount(queueSize())
        })
    },
    [notify],
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
  const handleOpenInTracker = useCallback((dayNum) => {
    setSelectedDayNum(dayNum)
    setActiveView('tracker')
  }, [])

  const handleImport = useCallback(
    (imported) => {
      setDays(imported)
    },
    [],
  )

  const handleReset = useCallback(() => {
    clearJourney()
    setDays(blankJourney())
    setSelectedDayNum(1)
  }, [])

  /** Props shared by every view so each one stays a pure presentation layer. */
  const viewProps = {
    days,
    stats,
    todayISO,
    selectedDayNum,
    onSelectDay: setSelectedDayNum,
    onSave: handleSave,
    currentEntry,
    onNavigate: setActiveView,
    onOpenInTracker: handleOpenInTracker,
    onImport: handleImport,
    onReset: handleReset,
    onNotify: notify,
    syncStatus,
    pendingCount,
  }

  return (
    <div className="flex h-screen overflow-hidden bg-obsidian">
      <Sidebar
        activeView={activeView}
        onNavigate={setActiveView}
        activeDayNum={selectedDayNum}
        onUpdateToday={handleUpdateToday}
        syncStatus={syncStatus}
        pendingCount={pendingCount}
        onOpenSearch={() => setIsPaletteOpen(true)}
      />

      {/* Fills the full canvas: flex-column that stretches to fill viewport */}
      <main className="flex w-full flex-1 flex-col overflow-y-auto bg-obsidian">
        <div className="w-full flex-1 flex flex-col px-6 py-6 lg:px-10">
          <div className="flex-1 space-y-6">
            <ActiveView {...viewProps} />

            <footer className="w-full py-4 text-2xs text-ink-muted border-t border-edge">
              Chiliad - 1,000 Day Journey. Data is stored locally in your browser.
            </footer>
          </div>
        </div>
      </main>

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
