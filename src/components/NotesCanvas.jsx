import { useEffect, useRef, useState } from 'react'
import { NotebookPen } from 'lucide-react'
import { MAX_NOTES_LENGTH, loadNotes, saveNotes, subscribeNotes } from '../lib/notes'

/** How long typing pauses before the scratchpad is written to storage. */
const SAVE_DEBOUNCE_MS = 400

/**
 * Global Notes scratchpad.
 *
 * One canvas, one storage key, so it is identical on the Dashboard and the
 * Daily Tracker and survives navigation between them. It owns its own state:
 * writes are debounced so typing never hammers localStorage, then flushed on
 * blur and on unmount so nothing is lost if the view is left mid-sentence.
 *
 * Changes made in another tab arrive through the `storage` event, which keeps
 * two open windows from silently diverging.
 */
export default function NotesCanvas({ title = 'Global Notes & Scratchpad' }) {
  const [notes, setNotes] = useState(loadNotes)
  const timerRef = useRef(null)
  // Holds the value that arrived from another tab, so an incoming change is
  // never echoed straight back into storage as if the user had typed it.
  const remoteValueRef = useRef(null)

  useEffect(() => {
    return subscribeNotes((incoming) => {
      remoteValueRef.current = incoming
      setNotes(incoming)
    })
  }, [])

  // Pending debounce must not survive the component leaving the screen.
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const handleChange = (event) => {
    const value = event.target.value
    setNotes(value)

    if (remoteValueRef.current === value) {
      remoteValueRef.current = null
      return
    }

    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      saveNotes(value)
    }, SAVE_DEBOUNCE_MS)
  }

  /** Write immediately when the field loses focus. */
  const handleBlur = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    saveNotes(notes)
  }

  return (
    <section className="card w-full p-5" aria-labelledby="notes-canvas-heading">
      <div className="flex items-center justify-between gap-3">
        <h2
          id="notes-canvas-heading"
          className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.12em] text-ink-secondary"
        >
          <NotebookPen className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden="true" />
          {title}
        </h2>
        <span className="text-2xs tabular-nums text-ink-muted">
          {notes.length.toLocaleString()} / {MAX_NOTES_LENGTH.toLocaleString()}
        </span>
      </div>

      <label className="sr-only" htmlFor="global-notes">
        Global notes and scratchpad
      </label>
      <textarea
        id="global-notes"
        value={notes}
        onChange={handleChange}
        onBlur={handleBlur}
        maxLength={MAX_NOTES_LENGTH}
        rows={6}
        placeholder="Loose thoughts, links, questions. Saved locally and shared across every view."
        className="field mt-4 resize-y leading-relaxed"
      />

      <p className="mt-2 text-2xs text-ink-muted">
        Scratchpad only — never synced or included in backups.
      </p>
    </section>
  )
}
