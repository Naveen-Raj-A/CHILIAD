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
 *
 * `shortLabel` is the compact form for the mobile bottom bar, where five tabs
 * share the viewport width. At 375px that is ~73px per tab, and the full
 * labels ("1,000-Day Grid", "Daily Tracker") either truncate mid-word or force
 * the row to three lines. The full `label` is still what the desktop rail
 * shows and what assistive tech reads on the mobile tabs.
 *
 * `inBottomNav` marks the five primary destinations. Settings is deliberately
 * absent: six tabs at 375px is below the width where labels stay legible, so
 * it lives in the mobile header instead. It must keep `inBottomNav` unset only
 * if it is reachable some other way on mobile, or it becomes dead there.
 */
export const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', shortLabel: 'Dashboard', icon: LayoutDashboard, inBottomNav: true },
  { id: 'tracker', label: 'Daily Tracker', shortLabel: 'Tracker', icon: Edit3, inBottomNav: true },
  { id: 'grid', label: '1,000-Day Grid', shortLabel: 'Grid', icon: Grid, inBottomNav: true },
  { id: 'planner', label: 'TO - DO', shortLabel: 'To-Do', icon: CheckSquare, inBottomNav: true },
  { id: 'analytics', label: 'Analytics', shortLabel: 'Analytics', icon: BarChart3, inBottomNav: true },
  { id: 'settings', label: 'Settings & Data', shortLabel: 'Settings', icon: Settings },
]

/** The subset rendered as mobile bottom tabs, in rail order. */
export const BOTTOM_NAV_ITEMS = NAV_ITEMS.filter((item) => item.inBottomNav)

/** The route shown on first load. */
export const DEFAULT_VIEW = 'dashboard'
