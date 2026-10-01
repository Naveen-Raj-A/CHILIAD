import { useState } from 'react'
import { Check, ListTodo, Pencil, Plus, X } from 'lucide-react'
import { cn } from '../lib/cn'

/**
 * Shared interactive quick to-do widget.
 *
 * Rendered by the Sidebar (compact variant), the Dashboard's "Today's Quick
 * Action Items" card, and the Daily Tracker. All instances read the same
 * App-level `todos` state, so completing, editing, adding, or deleting a
 * task in one place updates every other instance on the same render - no
 * refresh required.
 *
 * Tasks themselves are persisted to localStorage by App (see lib/todos).
 */
export default function QuickTodos({
  todos,
  onAdd,
  onToggle,
  onRemove,
  onEdit,
  variant = 'sidebar',
  title = 'Quick To-Do List',
  showHeader = true,
}) {
  const [draft, setDraft] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editDraft, setEditDraft] = useState('')

  const isSidebar = variant === 'sidebar'
  const remaining = todos.filter((task) => !task.done).length

  const handleAdd = (event) => {
    event.preventDefault()
    const text = draft.trim()
    if (!text) return
    onAdd(text)
    setDraft('')
  }

  const beginEdit = (task) => {
    setEditingId(task.id)
    setEditDraft(task.text)
  }

  const commitEdit = () => {
    const text = editDraft.trim()
    if (text && editingId) onEdit(editingId, text)
    setEditingId(null)
    setEditDraft('')
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditDraft('')
  }

  return (
    <div className={cn(!isSidebar && 'card p-5')}>
      {showHeader && (
        <div className="flex items-center justify-between gap-2">
          <h2
            className={cn(
              'flex items-center gap-2 font-semibold uppercase tracking-[0.12em] text-ink-secondary',
              isSidebar ? 'text-2xs' : 'text-sm',
            )}
          >
            <ListTodo className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden="true" />
            {title}
          </h2>
          {todos.length > 0 && (
            <span className="rounded-full bg-surface-input px-2 py-0.5 text-2xs tabular-nums text-ink-muted">
              {remaining} open
            </span>
          )}
        </div>
      )}

      {/* Fast capture: Enter or the + button adds instantly. */}
      <form
        onSubmit={handleAdd}
        className={cn('flex items-center gap-2', showHeader ? 'mt-3' : isSidebar ? 'mt-2' : 'mt-3')}
      >
        <label className="sr-only" htmlFor={`quick-todo-${variant}`}>
          Add quick task
        </label>
        <input
          id={`quick-todo-${variant}`}
          type="text"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Add quick task..."
          maxLength={200}
          className={cn('field', isSidebar && 'px-2.5 py-1.5 text-xs')}
        />
        <button
          type="submit"
          disabled={!draft.trim()}
          aria-label="Add task"
          className={cn(
            'inline-flex shrink-0 items-center justify-center rounded-lg bg-ink text-obsidian transition-colors hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-40',
            isSidebar ? 'h-7 w-7' : 'h-9 w-9',
          )}
        >
          <Plus className={isSidebar ? 'h-3.5 w-3.5' : 'h-4 w-4'} strokeWidth={2.25} />
        </button>
      </form>

      <ul className={cn('mt-2 space-y-1.5', !isSidebar && 'mt-3')}>
        {todos.length === 0 && (
          <li className="rounded-lg border border-dashed border-edge px-3 py-3 text-center text-2xs text-ink-muted">
            No tasks yet - add one above.
          </li>
        )}

        {todos.map((task) => (
          <li
            key={task.id}
            className="group flex items-start gap-2 rounded-lg border border-edge bg-surface-input px-2.5 py-2 transition-colors hover:border-edge-strong"
          >
            <button
              type="button"
              role="checkbox"
              aria-checked={task.done}
              aria-label={`Mark "${task.text}" as ${task.done ? 'not done' : 'done'}`}
              onClick={() => onToggle(task.id)}
              className={cn(
                'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors',
                task.done
                  ? 'border-emerald-500/60 bg-emerald-500 text-obsidian'
                  : 'border-edge-strong bg-surface hover:border-neutral-600',
              )}
            >
              {task.done && <Check className="h-3 w-3" strokeWidth={3} />}
            </button>

            {editingId === task.id ? (
              <input
                autoFocus
                type="text"
                value={editDraft}
                onChange={(event) => setEditDraft(event.target.value)}
                onBlur={commitEdit}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') commitEdit()
                  if (event.key === 'Escape') cancelEdit()
                }}
                aria-label="Edit task"
                className="field min-w-0 flex-1 px-2 py-0.5 text-xs"
              />
            ) : (
              <button
                type="button"
                onClick={() => onToggle(task.id)}
                onDoubleClick={() => beginEdit(task)}
                className={cn(
                  'min-w-0 flex-1 break-words text-left text-xs leading-relaxed transition-colors',
                  task.done ? 'text-ink-muted line-through' : 'text-ink-secondary hover:text-ink',
                )}
                title={task.text}
              >
                {task.text}
              </button>
            )}

            {editingId !== task.id && (
              <span className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                <button
                  type="button"
                  onClick={() => beginEdit(task)}
                  aria-label={`Edit task: ${task.text}`}
                  className="rounded p-0.5 text-ink-muted transition-colors hover:text-ink"
                >
                  <Pencil className="h-3 w-3" strokeWidth={2} />
                </button>
                <button
                  type="button"
                  onClick={() => onRemove(task.id)}
                  aria-label={`Delete task: ${task.text}`}
                  className="rounded p-0.5 text-ink-muted transition-colors hover:text-red-400"
                >
                  <X className="h-3 w-3" strokeWidth={2} />
                </button>
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}