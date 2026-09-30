import { useMemo, useState } from 'react'
import Headline from '../Headline'
import Heatmap from '../Heatmap'
import SearchFilterBar from '../SearchFilterBar'
import JourneyTable from '../JourneyTable'
import { filterDays } from '../../lib/stats'
import { collectTags, filterByTag } from '../../lib/tags'
import { cn } from '../../lib/cn'

/**
 * 1,000-Day Grid: the full visual heatmap matrix plus the searchable,
 * paginated journey window table. Both read from the same filtered set, so
 * the grid and the table can never disagree.
 *
 * Selecting a day routes to the tracker with that day loaded.
 */
export default function GridView({ days, selectedDayNum, onOpenInTracker, syncStatus, pendingCount }) {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('All')
  const [activeTag, setActiveTag] = useState('All')

  const tags = useMemo(() => collectTags(days), [days])

  const rows = useMemo(
    () => filterDays(filterByTag(days, activeTag), query, status),
    [days, query, status, activeTag],
  )

  const handleSelectDay = (dayNum) => {
    onOpenInTracker(dayNum)
  }

  return (
    <div className="w-full space-y-6">
      <Headline
        dayNum={selectedDayNum}
        syncStatus={syncStatus}
        pendingCount={pendingCount}
        subtitle="1,000-Day Grid"
      />

      <Heatmap
        days={days}
        selectedDayNum={selectedDayNum}
        onSelectDay={handleSelectDay}
      />

      {/* Pillar tag filter */}
      {tags.length > 0 && (
        <div className="card flex flex-wrap items-center gap-2 p-4">
          <span className="text-2xs font-medium uppercase tracking-[0.12em] text-ink-secondary">
            Pillars
          </span>
          <button
            type="button"
            onClick={() => setActiveTag('All')}
            className={cn(
              'rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
              activeTag === 'All'
                ? 'bg-ink text-obsidian'
                : 'border border-edge-strong bg-surface-input text-ink-secondary hover:bg-surface-hover hover:text-ink',
            )}
          >
            All
          </button>
          {tags.map(({ tag, count }) => (
            <button
              key={tag}
              type="button"
              onClick={() => setActiveTag(tag)}
              className={cn(
                'rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                activeTag === tag
                  ? 'border border-sky-500/30 bg-sky-500/20 text-sky-400'
                  : 'border border-edge-strong bg-surface-input text-ink-secondary hover:bg-surface-hover hover:text-ink',
              )}
            >
              #{tag}
              <span className="ml-1.5 tabular-nums text-ink-muted">{count}</span>
            </button>
          ))}
        </div>
      )}

      <SearchFilterBar
        query={query}
        onQueryChange={setQuery}
        status={status}
        onStatusChange={setStatus}
        resultCount={rows.length}
        totalCount={days.length}
      />

      <JourneyTable
        rows={rows}
        selectedDayNum={selectedDayNum}
        onSelectDay={handleSelectDay}
      />
    </div>
  )
}
