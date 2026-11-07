import React, { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  Search,
  CheckCircle2,
  Info,
  Clock,
  Shield,
  Bell,
  ArrowRight,
} from 'lucide-react'
import axiosClient from '../api/axiosClient'
import './Alerts.css'

export const Alerts = () => {
  const [alerts, setAlerts] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [severityFilter, setSeverityFilter] = useState('ALL')

  useEffect(() => {
    let isMounted = true

    const fetchAlerts = async () => {
      let combined = []

      // 1. Check local manual alerts
      try {
        const stored = localStorage.getItem('cncguard_alerts')
        if (stored) combined = JSON.parse(stored)
      } catch {
        combined = []
      }

      // 2. Fetch machine predictions from backend and derive real incident alerts
      try {
        const res = await axiosClient.get('/api/machines')
        if (!isMounted) return
        const machines = res.data?.machines || []
        const derived = []

        machines.forEach((m) => {
          const mId = m.machineId || m.id
          const mName = m.machine_name || m.name || `Machine #${mId}`
          if (m.prediction === 1) {
            derived.push({
              id: `ALT-CRIT-${mId}`,
              severity: 'CRITICAL',
              category: 'Machine Failure Predicted',
              machineId: String(mId),
              timestamp: new Date().toISOString(),
              description: `[${mName}] Failure predicted with ${m.failure_probability ? Number(m.failure_probability).toFixed(1) : 'elevated'}% probability. ${m.suggestion || ''}`,
            })
          } else if (m.risk_level === 'WARNING') {
            derived.push({
              id: `ALT-WARN-${mId}`,
              severity: 'WARNING',
              category: 'Parameter Warning Threshold',
              machineId: String(mId),
              timestamp: new Date().toISOString(),
              description: `[${mName}] Machine operating near thermal or tool wear warning limits.`,
            })
          }
        })

        // Merge without duplicate IDs
        const existingIds = new Set(combined.map((a) => a.id))
        derived.forEach((d) => {
          if (!existingIds.has(d.id)) {
            combined.push(d)
          }
        })
      } catch (err) {
        console.warn('Could not fetch machines for alerts:', err)
      }

      if (isMounted) {
        setAlerts(combined)
        localStorage.setItem('cncguard_alerts', JSON.stringify(combined))
      }
    }

    fetchAlerts()

    return () => {
      isMounted = false
    }
  }, [])

  const filteredAlerts = useMemo(() => {
    return alerts.filter((a) => {
      const q = searchQuery.toLowerCase().trim()
      const matchesSearch =
        !q ||
        (a.title && a.title.toLowerCase().includes(q)) ||
        (a.machineId && String(a.machineId).toLowerCase().includes(q)) ||
        (a.description && a.description.toLowerCase().includes(q)) ||
        (a.category && a.category.toLowerCase().includes(q))

      const matchesSeverity =
        severityFilter === 'ALL' || a.severity?.toUpperCase() === severityFilter

      return matchesSearch && matchesSeverity
    })
  }, [alerts, searchQuery, severityFilter])

  return (
    <div className="alerts-container">
      {/* Page Header */}
      <div className="alerts-header-row">
        <div className="alerts-header-text">
          <h1>Active Alarms & Critical Alerts</h1>
          <p>Real-time thermal thresholds, tool wear limits, and AI predictive maintenance incident log.</p>
        </div>
      </div>

      {/* Backend Status Notice */}
      <div className="form-banner banner-info" role="status" style={{ marginBottom: '1.5rem' }}>
        <CheckCircle2 size={20} className="banner-icon" style={{ color: '#0284c7' }} />
        <div>
          <strong>Alert Pipeline Active:</strong> Alarms are derived directly from machine failure predictions
          and parameter threshold evaluations by your trained Random Forest model.
        </div>
      </div>

      {/* Alerts Main Container */}
      <div className="alerts-card">
        {alerts.length === 0 ? (
          <div className="empty-alerts-state">
            <div className="empty-alerts-icon" style={{ backgroundColor: '#f0fdf4', borderColor: '#bbf7d0', color: '#16a34a' }}>
              <CheckCircle2 size={26} />
            </div>

            <h2 className="empty-alerts-title">No Critical Alarms Detected</h2>

            <p className="empty-alerts-desc">
              All monitored machines are currently running within nominal operational thresholds with zero predictive failures detected.
            </p>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <Link to="/analysis" className="btn-primary-action">
                <span>Go to Machine Analysis</span>
                <ArrowRight size={15} />
              </Link>
              <Link to="/machines" className="btn-secondary">
                <span>View Registered Fleet</span>
              </Link>
            </div>

            {/* Threshold Specifications Reference */}
            <div style={{ marginTop: '2.25rem', borderTop: '1px solid #f1f5f9', paddingTop: '1.5rem' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.75rem' }}>
                <Info size={14} />
                <span>AI4I Standard Machine Threshold Specifications</span>
              </div>

              <div className="alerts-spec-grid">
                <div className="alert-spec-box">
                  <div className="alert-spec-title">Heat Dissipation (HDF)</div>
                  <p className="alert-spec-desc">
                    Process-to-air differential threshold (&lt; 8.6 K at rotational speed &lt; 1380 RPM).
                  </p>
                </div>

                <div className="alert-spec-box">
                  <div className="alert-spec-title">Tool Wear Limit (TWF)</div>
                  <p className="alert-spec-desc">
                    Cumulative cutter tool wear duration (&ge; 200 min cutter degradation limit).
                  </p>
                </div>

                <div className="alert-spec-box">
                  <div className="alert-spec-title">Overstrain Limit (OSF)</div>
                  <p className="alert-spec-desc">
                    Spindle cutting torque and rotational speed overstrain mechanical stress product.
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div>
            {/* Search & Filters toolbar */}
            <div className="machines-toolbar" style={{ border: 'none', borderRadius: 0, borderBottom: '1px solid #e2e8f0' }}>
              <div className="search-box-wrapper">
                <Search size={16} className="search-icon" />
                <input
                  type="text"
                  className="search-input"
                  placeholder="Search alerts by title, machine..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="toolbar-filters">
                <select
                  className="filter-select"
                  value={severityFilter}
                  onChange={(e) => setSeverityFilter(e.target.value)}
                >
                  <option value="ALL">All Severities</option>
                  <option value="CRITICAL">Critical</option>
                  <option value="WARNING">Warning</option>
                  <option value="INFO">Info</option>
                </select>
              </div>
            </div>

            {/* Alerts Table */}
            {filteredAlerts.length > 0 ? (
              <div className="table-responsive-wrapper">
                <table className="machines-table">
                  <thead>
                    <tr>
                      <th>Severity</th>
                      <th>Alert Category</th>
                      <th>Machine ID</th>
                      <th>Timestamp</th>
                      <th>Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAlerts.map((a) => (
                      <tr key={a.id || Math.random()}>
                        <td>
                          <span
                            className="status-badge"
                            style={{
                              backgroundColor: a.severity === 'CRITICAL' ? '#fef2f2' : '#fffbeb',
                              color: a.severity === 'CRITICAL' ? '#991b1b' : '#92400e',
                              border: a.severity === 'CRITICAL' ? '1px solid #fecaca' : '1px solid #fde68a',
                            }}
                          >
                            {a.severity}
                          </span>
                        </td>
                        <td style={{ fontWeight: 600, color: '#0f172a' }}>{a.category}</td>
                        <td style={{ fontFamily: 'monospace', color: '#0284c7' }}>{a.machineId}</td>
                        <td style={{ fontSize: '0.8rem', color: '#64748b' }}>
                          {a.timestamp ? new Date(a.timestamp).toLocaleString() : '—'}
                        </td>
                        <td style={{ fontSize: '0.88rem', color: '#334155' }}>{a.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-alerts-state" style={{ padding: '2rem' }}>
                <p>No alerts match your filter criteria.</p>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setSearchQuery('')
                    setSeverityFilter('ALL')
                  }}
                >
                  Reset Filters
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default Alerts
