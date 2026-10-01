import { ChevronDown, Flame, ListTodo, Pencil, Search } from 'lucide-react'
import { useState } from 'react'
import { NAV_ITEMS } from '../lib/nav'
import { cn } from '../lib/cn'
import { TOTAL_DAYS } from '../lib/date'
import SyncBadge from './SyncBadge'
import QuickTodos from './QuickTodos'

/** Detect macOS so the shortcut hint matches the platform convention. */
function detectMac() {
  if (typeof navigator === 'undefined') return false
  return /Mac|iPhone|iPad/i.test(navigator.platform || navigator.userAgent || '')
}

/**
 * Fixed left navigation rail: brand, active day pill, route links, the
 * sticky Quick To-Do List, and a footer holding the storage-mode indicator
 * plus the primary CTA.
 */
export default function Sidebar({
  activeView,
  onNavigate,
  activeDayNum,
  onUpdateToday,
  syncStatus,
  pendingCount,
  onOpenSearch,
  todos,
  onAddTodo,
  onToggleTodo,
  onRemoveTodo,
  onEditTodo,
}) {
  const isMac = detectMac()
  const [todosOpen, setTodosOpen] = useState(true)
  const openCount = todos.filter((task) => !task.done).length

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-edge bg-sidebar">
      {/* Brand */}
      <div className="border-b border-edge px-5 py-5">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-edge bg-surface">
            <Flame className="h-4 w-4 text-ink" strokeWidth={2} />
          </span>
          <div className="leading-tight">
            <p className="text-sm font-semibold tracking-tight text-ink">Chiliad</p>
            <p className="text-2xs text-ink-secondary">1,000-Day OS</p>
          </div>
        </div>

        <div className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-edge bg-surface-input px-2.5 py-1">
          <span className="text-2xs font-medium uppercase tracking-wide text-ink-secondary">
            Day
          </span>
          <span className="text-2xs font-semibold tabular-nums text-ink">
            {activeDayNum.toLocaleString()} / {TOTAL_DAYS.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav aria-label="Primary" className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        <button
          type="button"
          onClick={onOpenSearch}
          className="mb-2 flex w-full items-center gap-3 rounded-lg border border-edge-strong bg-surface-input px-3 py-2.5 text-sm text-ink-secondary transition-colors hover:bg-surface-hover hover:text-ink"
        >
          <Search className="h-4 w-4 shrink-0" strokeWidth={2} />
          <span className="flex-1 text-left">Search</span>
          <kbd className="rounded border border-edge-strong bg-surface px-1.5 py-0.5 font-mono text-2xs text-ink-secondary">
            {isMac ? 'Cmd' : 'Ctrl'} K
          </kbd>
        </button>

        {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
          const isActive = id === activeView
          return (
            <button
              key={id}
              type="button"
              onClick={() => onNavigate(id)}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'flex w-full items-center gap-3 rounded-lg border-r-2 px-3 py-2.5 text-sm font-medium transition-all duration-200',
                isActive
                  ? 'border-sky-400 bg-sky-500/10 text-sky-400'
                  : 'border-transparent text-ink-secondary hover:bg-surface-hover hover:text-ink',
              )}
            >
              <Icon className="h-4 w-4 shrink-0" strokeWidth={2} />
              <span className="truncate">{label}</span>
            </button>
          )
        })}
      </nav>

      {/* Quick To-Do List (sticky section below the main links) */}
      <div className="border-t border-edge px-3 py-3">
        <button
          type="button"
          onClick={() => setTodosOpen((prev) => !prev)}
          aria-expanded={todosOpen}
          aria-controls="sidebar-todos"
          className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-2xs font-semibold uppercase tracking-[0.12em] text-ink-secondary transition-colors hover:text-ink"
        >
          <ListTodo className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
          <span className="flex-1 text-left">Quick To-Do List</span>
          <span className="rounded-full bg-surface-input px-2 py-0.5 text-2xs tabular-nums text-ink-muted">
            {openCount}
          </span>
          <ChevronDown
            aria-hidden="true"
            className={cn(
              'h-3.5 w-3.5 shrink-0 text-ink-muted transition-transform duration-200',
              todosOpen ? 'rotate-180' : 'rotate-0',
            )}
            strokeWidth={2}
          />
        </button>

        {todosOpen && (
          <div id="sidebar-todos" className="mt-2 max-h-64 overflow-y-auto pr-0.5">
            <QuickTodos
              todos={todos}
              onAdd={onAddTodo}
              onToggle={onToggleTodo}
              onRemove={onRemoveTodo}
              onEdit={onEditTodo}
              variant="sidebar"
              showHeader={false}
            />
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="space-y-3 border-t border-edge px-5 py-4">
        <SyncBadge status={syncStatus} pending={pendingCount} className="w-full justify-center" />

        <button
          type="button"
          onClick={onUpdateToday}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-ink px-3.5 py-2.5 text-sm font-semibold text-obsidian transition-colors hover:bg-neutral-200 active:bg-neutral-300"
        >
          <Pencil className="h-4 w-4" strokeWidth={2.25} />
          Update Today
        </button>
      </div>
    </aside>
  )
}
