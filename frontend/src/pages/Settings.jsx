import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  User,
  Shield,
  Bell,
  Sliders,
  LogOut,
  CheckCircle2,
  Lock,
  Save,
  Info,
  Clock,
  Key,
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import './Settings.css'

const DEFAULT_SETTINGS = {
  inAppAlerts: true,
  thermalThresholdWarnings: true,
  toolWearAlerts: true,
  audibleAlarms: false,
  compactView: false,
}

export const Settings = () => {
  const navigate = useNavigate()
  const { user, logout, isFirebaseConfigured } = useAuth()

  const [settings, setSettings] = useState(() => {
    try {
      const stored = localStorage.getItem('cncguard_settings')
      return stored ? { ...DEFAULT_SETTINGS, ...JSON.parse(stored) } : DEFAULT_SETTINGS
    } catch {
      return DEFAULT_SETTINGS
    }
  })

  const [saveStatus, setSaveStatus] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const handleToggle = (key) => () => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }))
    setSaveStatus(false)
  }

  const handleSavePreferences = (e) => {
    e.preventDefault()
    try {
      localStorage.setItem('cncguard_settings', JSON.stringify(settings))
      setSaveStatus(true)
      setTimeout(() => setSaveStatus(false), 3000)
    } catch (err) {
      console.warn('Could not save settings:', err)
    }
  }

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      await logout()
      navigate('/login', { replace: true })
    } catch (err) {
      console.error('Logout failed:', err)
    } finally {
      setIsLoggingOut(false)
    }
  }

  const displayName = user?.displayName || user?.email || 'Plant Operator'
  const userInitial = (displayName[0] || 'O').toUpperCase()

  return (
    <div className="settings-container">
      {/* Page Header */}
      <div className="settings-header-row">
        <div className="settings-header-text">
          <h1>System Settings & Preferences</h1>
          <p>Operator profile, notification preferences, and workstation security settings.</p>
        </div>
      </div>

      {saveStatus && (
        <div className="form-banner banner-success" role="status" style={{ marginBottom: '1.25rem' }}>
          <CheckCircle2 size={18} className="banner-icon" />
          <span>Workstation preferences saved successfully to local configuration.</span>
        </div>
      )}

      <div className="settings-sections-list">
        {/* Section 1: User Profile & Account */}
        <div className="settings-card">
          <div className="settings-card-header">
            <h2 className="settings-card-title">
              <User size={18} style={{ color: '#0284c7' }} />
              <span>Operator Account Information</span>
            </h2>
            <p className="settings-card-desc">Active operator identity and authorization status</p>
          </div>

          <div className="user-profile-row">
            <div className="user-avatar-large">{userInitial}</div>
            <div className="user-profile-meta">
              <div className="user-email-heading">{displayName}</div>
              <div className="user-role-badge">
                <span className="status-dot" style={{ backgroundColor: '#0284c7' }} />
                <span>{user ? 'Authenticated Operator Session' : 'Offline Workstation Session'}</span>
              </div>
            </div>
          </div>

          <div className="overview-kv-grid" style={{ marginTop: '1rem', borderTop: '1px solid #f8fafc', paddingTop: '1rem' }}>
            <div className="kv-item">
              <span className="kv-label">Account Email</span>
              <span className="kv-val">{user?.email || 'No email associated with session'}</span>
            </div>

            <div className="kv-item">
              <span className="kv-label">Authentication Provider</span>
              <span className="kv-val">SmartMaintainAI Session Authentication (Flask)</span>
            </div>

            <div className="kv-item">
              <span className="kv-label">Role Status</span>
              <span className="kv-val" style={{ fontSize: '0.85rem', fontWeight: 500, color: '#64748b' }}>
                Role assignment requires backend RBAC confirmation
              </span>
            </div>

            <div className="kv-item">
              <span className="kv-label">Auth Session Timestamp</span>
              <span className="kv-val" style={{ fontSize: '0.85rem', color: '#64748b' }}>
                {user?.metadata?.lastSignInTime ? new Date(user.metadata.lastSignInTime).toLocaleString() : 'Not provided by session'}
              </span>
            </div>
          </div>
        </div>

        {/* Section 2: Notification Preferences (Stored locally) */}
        <div className="settings-card">
          <div className="settings-card-header">
            <h2 className="settings-card-title">
              <Bell size={18} style={{ color: '#0284c7' }} />
              <span>Workstation Notification Preferences</span>
            </h2>
            <p className="settings-card-desc">Configure threshold alerts and diagnostic notifications for this terminal</p>
          </div>

          <form onSubmit={handleSavePreferences}>
            <div className="pref-toggle-list">
              <div className="pref-toggle-item">
                <div className="pref-text-group">
                  <span className="pref-title">In-App Critical Banners</span>
                  <span className="pref-subtext">Display prominent warning banners when sensor readings approach critical limits.</span>
                </div>
                <label className="switch-label">
                  <input
                    type="checkbox"
                    checked={settings.inAppAlerts}
                    onChange={handleToggle('inAppAlerts')}
                  />
                  <span className="switch-slider" />
                </label>
              </div>

              <div className="pref-toggle-item">
                <div className="pref-text-group">
                  <span className="pref-title">Thermal Dissipation Warnings (HDF)</span>
                  <span className="pref-subtext">Alert when process-to-air temperature differential exceeds nominal operating window.</span>
                </div>
                <label className="switch-label">
                  <input
                    type="checkbox"
                    checked={settings.thermalThresholdWarnings}
                    onChange={handleToggle('thermalThresholdWarnings')}
                  />
                  <span className="switch-slider" />
                </label>
              </div>

              <div className="pref-toggle-item">
                <div className="pref-text-group">
                  <span className="pref-title">Tool Wear Threshold Notifications (TWF)</span>
                  <span className="pref-subtext">Alert when cutting tool blade reaches 200 cumulative operating minutes.</span>
                </div>
                <label className="switch-label">
                  <input
                    type="checkbox"
                    checked={settings.toolWearAlerts}
                    onChange={handleToggle('toolWearAlerts')}
                  />
                  <span className="switch-slider" />
                </label>
              </div>

              <div className="pref-toggle-item">
                <div className="pref-text-group">
                  <span className="pref-title">Audible Workstation Alarm</span>
                  <span className="pref-subtext">Play audible notification tone during machine overstrain or emergency alerts.</span>
                </div>
                <label className="switch-label">
                  <input
                    type="checkbox"
                    checked={settings.audibleAlarms}
                    onChange={handleToggle('audibleAlarms')}
                  />
                  <span className="switch-slider" />
                </label>
              </div>
            </div>

            <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="btn-primary-action">
                <Save size={16} />
                <span>Save Notification Settings</span>
              </button>
            </div>
          </form>
        </div>

        {/* Section 3: Account Security & Sign Out */}
        <div className="settings-card">
          <div className="settings-card-header">
            <h2 className="settings-card-title">
              <Lock size={18} style={{ color: '#0284c7' }} />
              <span>Security & Workstation Session</span>
            </h2>
            <p className="settings-card-desc">Password guidelines and active terminal session controls</p>
          </div>

          <div style={{ fontSize: '0.88rem', color: '#475569', lineHeight: 1.6, marginBottom: '1.25rem' }}>
            <p style={{ margin: '0 0 0.5rem' }}>
              <strong>Industrial Cybersecurity Standard:</strong> SmartMaintainAI authenticates operators via secure session credentials
              verified by the Flask REST backend. Contact your systems administrator for plant operator credential management.
            </p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '1.25rem' }}>
            <div>
              <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.9rem' }}>Terminate Current Session</div>
              <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Log out of this CNCGuard workstation terminal.</div>
            </div>

            <button
              type="button"
              className="btn-secondary"
              style={{ color: '#ef4444', borderColor: '#fca5a5' }}
              onClick={handleLogout}
              disabled={isLoggingOut}
            >
              <LogOut size={16} style={{ marginRight: '0.4rem' }} />
              <span>{isLoggingOut ? 'Signing out...' : 'Sign Out of System'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Settings
