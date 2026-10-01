import { useRef, useState } from 'react'
import {
  AlertTriangle,
  CalendarDays,
  FileJson,
  FileSpreadsheet,
  HardDrive,
  Trash2,
  Upload,
} from 'lucide-react'
import {
  STORAGE_KEY,
  buildExport,
  formatBytes,
  parseImport,
  storageSizeBytes,
} from '../../lib/storage'
import { buildCsv } from '../../lib/csv'
import { tagsForDay } from '../../lib/tags'
import { GOOGLE_SHEET_URL, hasSheetUrl } from '../../lib/config'
import ViewSheetButton from '../ViewSheetButton'
import { TOTAL_DAYS, formatShortDate } from '../../lib/date'

/**
 * Settings & Data: backup, restore, and reset controls plus a read-out of
 * what is currently held in localStorage.
 */
export default function SettingsView({ days, stats, onImport, onReset, onNotify }) {
  const fileRef = useRef(null)
  const [isConfirming, setIsConfirming] = useState(false)

  const byteSize = storageSizeBytes()

  /** Trigger a client-side file download from a string payload. */
  const download = (text, extension, mime) => {
    const blob = new Blob([text], { type: mime })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `chiliad-journey-${days[0]?.date || 'backup'}.${extension}`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handleExportJson = () => {
    try {
      download(buildExport(days), 'json', 'application/json')
      onNotify({ tone: 'success', message: 'JSON backup downloaded.' })
    } catch {
      onNotify({ tone: 'error', message: 'Could not create the backup file.' })
    }
  }

  const handleExportCsv = () => {
    try {
      // BOM keeps Excel from mangling non-ASCII characters on open.
      download(`\uFEFF${buildCsv(days, tagsForDay)}`, 'csv', 'text/csv;charset=utf-8')
      onNotify({ tone: 'success', message: 'CSV export downloaded.' })
    } catch {
      onNotify({ tone: 'error', message: 'Could not create the CSV file.' })
    }
  }

  const handleFile = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const text = await file.text()
      const result = parseImport(text)
      if (!result.ok) {
        onNotify({ tone: 'error', message: result.error })
      } else {
        onImport(result.days)
        onNotify({ tone: 'success', message: 'Backup imported successfully.' })
      }
    } catch {
      onNotify({ tone: 'error', message: 'Could not read that file.' })
    } finally {
      // Allow re-selecting the same file after a failure.
      event.target.value = ''
    }
  }

  const handleReset = () => {
    onReset()
    setIsConfirming(false)
    onNotify({ tone: 'info', message: 'All journey data has been reset.' })
  }


  return (
    <div className="w-full space-y-6">
      <div>
        <p className="text-2xs font-medium uppercase tracking-[0.16em] text-ink-muted">
          Settings &amp; Data
        </p>
        <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
          Data Management
        </h1>
        <p className="mt-1 text-sm text-ink-secondary">
          Your journey is stored locally in this browser. Back it up regularly.
        </p>
      </div>

      {/* Storage status */}
      <section className="card p-4 md:p-5" aria-labelledby="storage-heading">
        <h2
          id="storage-heading"
          className="text-sm font-semibold uppercase tracking-[0.12em] text-ink-secondary"
        >
          Storage Status
        </h2>

        <dl className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {[
            { label: 'Total records', value: days.length.toLocaleString(), icon: FileJson },
            { label: 'Logged days', value: stats.logged.toLocaleString(), icon: HardDrive },
            { label: 'Storage size', value: formatBytes(byteSize), icon: HardDrive },
            { label: 'Day 1 starts', value: formatShortDate(days[0].date), icon: CalendarDays },
          ].map(({ label, value, icon: Icon }) => (
            <div
              key={label}
              className="rounded-lg border border-edge bg-surface-input px-3 py-3 transition-all duration-200 hover:border-[#333333]"
            >
              <dt className="flex items-center gap-1.5 text-2xs uppercase tracking-wide text-ink-muted">
                <Icon className="h-3.5 w-3.5" strokeWidth={2} />
                {label}
              </dt>
              <dd className="mt-1.5 text-xl font-semibold tabular-nums text-ink">{value}</dd>
            </div>
          ))}
        </dl>

        <p className="mt-4 text-xs text-ink-muted">
          Storage key:{' '}
          <code className="rounded bg-surface-input px-1.5 py-0.5 font-mono text-2xs text-ink-secondary">
            {STORAGE_KEY}
          </code>
        </p>
      </section>

      {/* Cloud sheet */}
      <section className="card p-4 md:p-5" aria-labelledby="sheet-heading">
        <h2
          id="sheet-heading"
          className="text-sm font-semibold uppercase tracking-[0.12em] text-ink-secondary"
        >
          Google Sheet
        </h2>
        <p className="mt-1 text-xs text-ink-muted">
          {hasSheetUrl()
            ? 'The sheet mirroring this journey. It opens in a new tab.'
            : 'No sheet is configured. Set VITE_GOOGLE_SHEET_URL to enable the link.'}
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <ViewSheetButton label="View Google Sheet" className="px-4 py-2" />
          {hasSheetUrl() && (
            <code className="min-w-0 break-all rounded bg-surface-input px-1.5 py-0.5 font-mono text-2xs text-ink-secondary">
              {GOOGLE_SHEET_URL}
            </code>
          )}
        </div>
      </section>

      {/* Backup / restore */}
      <section className="card p-4 md:p-5" aria-labelledby="backup-heading">
        <h2
          id="backup-heading"
          className="text-sm font-semibold uppercase tracking-[0.12em] text-ink-secondary"
        >
          Backup &amp; Restore
        </h2>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          <button
            type="button"
            onClick={handleExportJson}
            className="flex min-h-[44px] items-start gap-3 rounded-lg border border-edge-strong bg-surface-input p-4 text-left transition-colors hover:bg-surface-hover"
          >
            <FileJson className="mt-0.5 h-4 w-4 shrink-0 text-ink" strokeWidth={2} />
            <span>
              <span className="block text-sm font-medium text-ink">Export to JSON</span>
              <span className="mt-1 block text-xs text-ink-muted">
                Full backup, restorable via Import.
              </span>
            </span>
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            className="flex min-h-[44px] items-start gap-3 rounded-lg border border-edge-strong bg-surface-input p-4 text-left transition-colors hover:bg-surface-hover"
          >
            <FileSpreadsheet
              className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400"
              strokeWidth={2}
            />
            <span>
              <span className="block text-sm font-medium text-ink">Export to CSV</span>
              <span className="mt-1 block text-xs text-ink-muted">
                Spreadsheet-ready, includes tag columns.
              </span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex min-h-[44px] items-start gap-3 rounded-lg border border-edge-strong bg-surface-input p-4 text-left transition-colors hover:bg-surface-hover"
          >
            <Upload className="mt-0.5 h-4 w-4 shrink-0 text-ink" strokeWidth={2} />
            <span>
              <span className="block text-sm font-medium text-ink">Import Data</span>
              <span className="mt-1 block text-xs text-ink-muted">
                Restore from an exported JSON backup.
              </span>
            </span>
          </button>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          onChange={handleFile}
          className="hidden"
          aria-label="Import backup file"
        />
      </section>

      {/* Danger zone */}
      <section
        className="card border-rose-900/50 bg-rose-950/20 p-5"
        aria-labelledby="reset-heading"
      >
        <h2
          id="reset-heading"
          className="text-sm font-semibold uppercase tracking-[0.12em] text-rose-400"
        >
          Danger Zone
        </h2>
        <p className="mt-1 text-xs text-ink-muted">
          Permanently delete every saved day. This cannot be undone.
        </p>

        {isConfirming ? (
          <div className="mt-4 flex flex-wrap items-center gap-3 rounded-lg border border-rose-900/50 bg-rose-950/20 p-3">
            <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" strokeWidth={2} />
            <p className="mr-auto text-sm text-rose-400">
              Reset all {TOTAL_DAYS.toLocaleString()} days to blank?
            </p>
            <button
              type="button"
              onClick={() => setIsConfirming(false)}
              className="inline-flex min-h-[44px] items-center rounded-lg border border-edge-strong bg-surface-input px-3 py-1.5 text-sm text-ink-secondary transition-colors hover:bg-surface-hover hover:text-ink"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex min-h-[44px] items-center rounded-lg bg-rose-500 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-rose-600"
            >
              Yes, reset everything
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setIsConfirming(true)}
            className="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-rose-900/50 bg-rose-950/20 px-3.5 py-2 text-sm font-medium text-rose-400 transition-colors hover:bg-rose-900/40"
          >
            <Trash2 className="h-4 w-4" strokeWidth={2} />
            Reset All Data
          </button>
        )}
      </section>
    </div>
  )
}
