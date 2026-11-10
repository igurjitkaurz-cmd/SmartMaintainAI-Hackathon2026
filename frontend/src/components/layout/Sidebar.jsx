import React from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Cpu,
  PlusCircle,
  Activity,
  TrendingUp,
  FileText,
  AlertTriangle,
  Wrench,
  Settings,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react'
import './Sidebar.css'

export const Sidebar = ({
  isOpen = false,
  onClose = () => { },
  isCollapsed = false,
  onToggleCollapse = () => { },
}) => {
  const navItems = [
    {
      label: 'Dashboard',
      path: '/dashboard',
      icon: LayoutDashboard,
      end: true,
    },
    {
      label: 'My Machines',
      path: '/machines',
      icon: Cpu,
      end: true,
    },
    {
      label: 'Add Machine',
      path: '/machines/add',
      icon: PlusCircle,
      end: true,
    },
    {
      label: 'Machine Analysis',
      path: '/analysis',
      icon: Activity,
      end: true,
    },
    {
      label: 'Predictions',
      path: '/reports',
      icon: TrendingUp,
      end: false,
    },
    {
      label: 'Reports History',
      path: '/reports',
      icon: FileText,
      end: false,
    },
    {
      label: 'Alerts',
      path: '/alerts',
      icon: AlertTriangle,
      end: true,
    },
    {
      label: 'Maintenance Logs',
      path: '/maintenance-logs',
      icon: Wrench,
      end: true,
    },
    {
      label: 'Settings',
      path: '/settings',
      icon: Settings,
      end: true,
    },
  ]

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      <div
        className={`sidebar-backdrop ${isOpen ? 'active' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Main Sidebar Element */}
      <aside
        className={`sidebar-root ${isCollapsed ? 'collapsed' : ''} ${isOpen ? 'mobile-open' : ''
          }`}
      >
        {/* Brand Header */}
        <div className="sidebar-header">
          <NavLink to="/dashboard" className="sidebar-brand" onClick={onClose}>
            <div className="sidebar-brand-icon">
              <Cpu size={20} />
            </div>
            {!isCollapsed && (
              <div className="sidebar-brand-text">
                <span className="brand-title">SmartMaintainAI</span>
                <span className="brand-subtitle">Predictive Maintenance</span>
              </div>
            )}
          </NavLink>

          {/* Mobile Close Button */}
          <button
            type="button"
            className="sidebar-close-btn"
            onClick={onClose}
            aria-label="Close sidebar"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation List */}
        <nav className="sidebar-nav-container">
          {!isCollapsed && (
            <div className="sidebar-section-title">Navigation Fleet</div>
          )}

          {navItems.map((item, idx) => {
            const Icon = item.icon
            return (
              <NavLink
                key={`${item.path}-${idx}`}
                to={item.path}
                end={item.end}
                onClick={onClose}
                className={({ isActive }) =>
                  `sidebar-nav-link ${isActive ? 'active' : ''}`
                }
                title={isCollapsed ? item.label : undefined}
              >
                <Icon size={19} className="nav-icon" />
                {!isCollapsed && <span className="nav-label">{item.label}</span>}
              </NavLink>
            )
          })}
        </nav>

        {/* Desktop Collapse Toggle */}
        <div className="sidebar-footer">
          <button
            type="button"
            className="collapse-toggle-btn"
            onClick={onToggleCollapse}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? (
              <ChevronRight size={18} />
            ) : (
              <>
                <ChevronLeft size={16} />
                <span>Collapse Panel</span>
              </>
            )}
          </button>
        </div>
      </aside>
    </>
  )
}

export default Sidebar

