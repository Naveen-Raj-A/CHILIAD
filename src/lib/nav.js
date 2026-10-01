import {
  BarChart3,
  CheckSquare,
  Edit3,
  Grid,
  LayoutDashboard,
  Settings,
} from 'lucide-react'

/**
 * Single source of truth for the route table. `id` is the value held in
 * App's `activeView` state; the sidebar renders these and App maps the same
 * ids to view components.
 */
export const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'tracker', label: 'Daily Tracker', icon: Edit3 },
  { id: 'grid', label: '1,000-Day Grid', icon: Grid },
  { id: 'planner', label: 'TO - DO', icon: CheckSquare },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'settings', label: 'Settings & Data', icon: Settings },
]

/** The route shown on first load. */
export const DEFAULT_VIEW = 'dashboard'
