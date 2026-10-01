/**
 * CSV export for the 1,000-day dataset, formatted for spreadsheet analysis.
 */

import { planToText } from './plan'

/** Escape a value for RFC 4180 CSV. */
function csvCell(value) {
  const text = value === null || value === undefined ? '' : String(value)
  // Quote when the value contains a delimiter, quote, or newline.
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`
  }
  return text
}

export const CSV_COLUMNS = [
  'Day',
  'Date',
  'Status',
  'Progress %',
  'Main Tasks',
  'Planned Items',
  'Details / Log',
  'Notes',
  'Tags',
]

/** Build the CSV text for the journey. `tagsForDay` is injected to avoid
 *  importing the tag module here and creating a cycle. */
export function buildCsv(days, tagsForDay) {
  const header = CSV_COLUMNS.join(',')

  const rows = days.map((day) =>
    [
      day.dayNum,
      day.date,
      day.status,
      day.progress,
      day.mainTasks,
      planToText(day.plannedItems),
      day.details,
      day.notes,
      tagsForDay ? tagsForDay(day).map((t) => `#${t}`).join(' ') : '',
    ]
      .map(csvCell)
      .join(','),
  )

  // CRLF per RFC 4180 for maximum spreadsheet compatibility.
  return [header, ...rows].join('\r\n')
}
