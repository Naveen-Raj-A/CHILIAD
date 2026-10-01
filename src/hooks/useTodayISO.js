import { useEffect, useState } from 'react'
import { toISODate } from '../lib/date'

/** How often the calendar day is re-checked while the app is open. */
const CHECK_INTERVAL_MS = 30000

/**
 * Today's local date, kept live.
 *
 * Reading the clock once on mount would freeze "today" for the lifetime of the
 * tab, so a window left open overnight would keep treating yesterday as today:
 * the day would never roll over, and the edit lock would let yesterday be
 * edited and refuse today. This re-reads on an interval and whenever the tab
 * regains focus, so both a tab left open and one restored from the background
 * notice the new day.
 *
 * The value is only replaced when the date actually differs, so nothing
 * re-renders on a no-op check.
 */
export default function useTodayISO() {
  const [todayISO, setTodayISO] = useState(() => toISODate(new Date()))

  useEffect(() => {
    function check() {
      setTodayISO((previous) => {
        const next = toISODate(new Date())
        return next === previous ? previous : next
      })
    }

    const timer = setInterval(check, CHECK_INTERVAL_MS)
    window.addEventListener('focus', check)
    document.addEventListener('visibilitychange', check)

    return () => {
      clearInterval(timer)
      window.removeEventListener('focus', check)
      document.removeEventListener('visibilitychange', check)
    }
  }, [])

  return todayISO
}
