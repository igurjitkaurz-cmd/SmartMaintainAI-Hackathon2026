import React, { useState, useEffect, useRef } from 'react'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import {
  Menu,
  Bell,
  ChevronDown,
  User,
  LogOut,
  Settings,
  Shield,
  Activity,
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import './Navbar.css'

export const Navbar = ({ onOpenMobileMenu = () => {} }) => {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const dropdownRef = useRef(null)

  // Map route path to breadcrumb labels
  const getBreadcrumbInfo = (pathname) => {
    if (pathname === '/dashboard') return { section: 'Overview', current: 'Dashboard' }
    if (pathname === '/machines') return { section: 'Fleet', current: 'CNC Machines' }
    if (pathname === '/machines/add') return { section: 'CNC Machines', current: 'Add New Unit' }
    if (pathname.startsWith('/machines/')) return { section: 'CNC Machines', current: 'Machine Detail' }
    if (pathname === '/analysis') return { section: 'Diagnostics', current: 'Telemetry & Analysis' }
    if (pathname.startsWith('/predictions/')) return { section: 'Analytics', current: 'Prediction Detail' }
    if (pathname === '/reports') return { section: 'Analytics', current: 'Reports & Predictions' }
    if (pathname === '/alerts') return { section: 'Operations', current: 'Active Alerts' }
    if (pathname === '/maintenance-logs') return { section: 'Operations', current: 'Maintenance Logs' }
    if (pathname === '/settings') return { section: 'Configuration', current: 'Settings' }
    return { section: 'SmartMaintainAI', current: 'Monitoring' }
  }

  const { section, current } = getBreadcrumbInfo(location.pathname)

  // Close dropdown on click outside or Escape
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false)
      }
    }

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  const [alertsCount, setAlertsCount] = useState(0)

  useEffect(() => {
    try {
      const storedAlerts = localStorage.getItem('cncguard_alerts')
      const parsed = storedAlerts ? JSON.parse(storedAlerts) : []
      setAlertsCount(parsed.length)
    } catch {
      setAlertsCount(0)
    }
  }, [location.pathname])

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      await logout()
      navigate('/login', { replace: true })
    } catch (err) {
      console.error('Logout failed:', err)
    } finally {
      setIsLoggingOut(false)
      setDropdownOpen(false)
    }
  }

  // Display name or formatted email
  const displayName = user?.displayName || user?.email || 'Plant Operator'
  const userInitial = (displayName[0] || 'O').toUpperCase()

  return (
    <header className="navbar-root">
      {/* Left section: Mobile Toggle & Breadcrumbs */}
      <div className="navbar-left">
        <button
          type="button"
          className="mobile-menu-trigger"
          onClick={onOpenMobileMenu}
          aria-label="Open navigation menu"
        >
          <Menu size={20} />
        </button>

        <div className="navbar-breadcrumb">
          <span className="breadcrumb-section">{section}</span>
          <span className="breadcrumb-separator">/</span>
          <h1 className="breadcrumb-current" style={{ margin: 0, fontSize: '0.95rem' }}>
            {current}
          </h1>
        </div>
      </div>

      {/* Right section: Notifications & User Profile */}
      <div className="navbar-right">
        {!user && (
          <Link
            to="/login"
            className="navbar-signin-btn"
            style={{
              padding: '0.42rem 0.95rem',
              borderRadius: '7px',
              backgroundColor: '#0284c7',
              color: '#ffffff',
              fontSize: '0.84rem',
              fontWeight: 600,
              textDecoration: 'none',
              marginRight: '0.65rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
            }}
          >
            <span>Sign In</span>
          </Link>
        )}

        {/* Notification Bell */}
        <Link
          to="/alerts"
          className="notification-btn"
          aria-label="System notifications"
          title={alertsCount > 0 ? `${alertsCount} active alert(s)` : 'No active alerts'}
          style={{ textDecoration: 'none' }}
        >
          <Bell size={18} />
          {alertsCount > 0 && <span className="notification-badge">{alertsCount}</span>}
        </Link>

        {/* User Profile Dropdown Menu */}
        <div className="user-menu-wrapper" ref={dropdownRef}>
          <button
            type="button"
            className="user-profile-trigger"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            aria-expanded={dropdownOpen}
            aria-haspopup="true"
          >
            <div className="user-avatar">{userInitial}</div>
            <div className="user-info-text">
              <span className="user-display-name">{displayName}</span>
              <span className="user-role-label">Workstation User</span>
            </div>
            <ChevronDown
              size={15}
              className={`user-chevron ${dropdownOpen ? 'open' : ''}`}
            />
          </button>

          {/* Dropdown Card */}
          {dropdownOpen && (
            <div className="user-dropdown" role="menu">
              <div className="dropdown-header">
                <div className="dropdown-user-name">{displayName}</div>
                <div className="dropdown-user-role">
                  <span className="status-dot" style={{ backgroundColor: '#0284c7' }}></span>
                  <span>{user ? 'Authenticated Session' : 'Local Terminal Session'}</span>
                </div>
              </div>

              <Link
                to="/settings"
                className="dropdown-item"
                role="menuitem"
                style={{ textDecoration: 'none' }}
              >
                <Settings size={15} />
                <span>System Settings</span>
              </Link>

              <Link
                to="/alerts"
                className="dropdown-item"
                role="menuitem"
                style={{ textDecoration: 'none' }}
              >
                <Activity size={15} />
                <span>Alerts Feed</span>
              </Link>

              <button
                type="button"
                className="dropdown-item logout"
                onClick={handleLogout}
                disabled={isLoggingOut}
                role="menuitem"
              >
                {isLoggingOut ? (
                  <>
                    <span className="navbar-spinner" />
                    <span>Signing out...</span>
                  </>
                ) : (
                  <>
                    <LogOut size={15} />
                    <span>Sign Out</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

export default Navbar

