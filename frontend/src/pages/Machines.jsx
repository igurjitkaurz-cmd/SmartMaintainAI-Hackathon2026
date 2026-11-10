import React, { useState, useMemo, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  Plus,
  Search,
  Cpu,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  Info,
  Layers,
  RefreshCw,
  AlertCircle,
} from 'lucide-react'
import axiosClient from '../api/axiosClient'
import LoadingSpinner from '../components/common/LoadingSpinner'
import './Machines.css'

export const Machines = () => {
  const [machines, setMachines] = useState(() => {
    try {
      const stored = localStorage.getItem('cncguard_machines')
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  })

  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [qualityFilter, setQualityFilter] = useState('ALL')

  const fetchFleet = useCallback(async () => {
    setLoading(true)
    setFetchError(null)
    try {
      const response = await axiosClient.get('/api/machines')
      if (response.data?.machines) {
        setMachines(response.data.machines)
        localStorage.setItem('cncguard_machines', JSON.stringify(response.data.machines))
      }
    } catch (err) {
      console.warn('Could not fetch machines from Flask API:', err)
      if (err.response?.status === 401) {
        setFetchError('Session not authenticated. Please log in to view fleet machines.')
      } else if (err.response?.status === 404) {
        setFetchError('The /api/machines endpoint was not found on the backend (404).')
      } else {
        setFetchError(err.normalizedMessage || 'Unable to connect to Flask server at http://127.0.0.1:5000.')
      }
      try {
        const cached = localStorage.getItem('cncguard_machines')
        if (cached) setMachines(JSON.parse(cached))
      } catch {
        setMachines([])
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchFleet()
  }, [fetchFleet])

  // Filtered list based on actual records
  const filteredMachines = useMemo(() => {
    return machines.filter((item) => {
      const q = searchQuery.toLowerCase().trim()
      const machineName = item.machine_name || item.name || ''
      const machineId = String(item.machineId || item.id || '')
      const location = item.location || ''
      const manufacturer = item.manufacturer || ''
      const qType = (item.machine_type || item.qualityType || '').toUpperCase()

      const matchesSearch =
        !q ||
        machineName.toLowerCase().includes(q) ||
        machineId.toLowerCase().includes(q) ||
        location.toLowerCase().includes(q) ||
        manufacturer.toLowerCase().includes(q)

      const matchesQuality =
        qualityFilter === 'ALL' || qType === qualityFilter

      return matchesSearch && matchesQuality
    })
  }, [machines, searchQuery, qualityFilter])

  // Fleet overview statistics derived strictly from genuine records
  const metrics = useMemo(() => {
    const total = machines.length
    const normalCount = machines.filter((m) => m.prediction === 0).length
    const alertCount = machines.filter((m) => m.prediction === 1).length
    return { total, normalCount, alertCount }
  }, [machines])

  const getQualityBadge = (type) => {
    const t = (type || 'M').toUpperCase()
    const cls = `quality-pill quality-${t.toLowerCase()}`
    return <span className={cls} title={`Quality Variant: ${t}`}>Variant {t}</span>
  }

  return (
    <div className="machines-container">
      {/* Page Header */}
      <div className="machines-header-row">
        <div className="machines-header-text">
          <h1>My Machines</h1>
          <p>Milling machine fleet inventory, baseline configurations, and operational AI predictions.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={fetchFleet}
            disabled={loading}
            title="Refresh fleet from server"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <RefreshCw size={15} className={loading ? 'navbar-spinner' : ''} />
            <span>Refresh</span>
          </button>
          <Link to="/machines/add" className="btn-add-machine-primary">
            <Plus size={18} />
            <span>Register New Machine</span>
          </Link>
        </div>
      </div>

      {/* Backend Status Advisory Notice */}
      {fetchError ? (
        <div className="form-banner banner-error" role="alert" style={{ marginBottom: '1.5rem' }}>
          <AlertCircle size={20} className="banner-icon" />
          <div style={{ flex: 1 }}>
            <strong>Server Advisory:</strong> {fetchError} Showing local cached records if available.
          </div>
        </div>
      ) : (
        <div className="form-banner banner-info" role="status" style={{ marginBottom: '1.5rem' }}>
          <CheckCircle2 size={20} className="banner-icon" style={{ color: '#0284c7' }} />
          <div>
            <strong>SmartMaintainAI Connected:</strong> Synchronized with Flask backend (`smartmaintain.db`).
            All machine predictions are generated using your trained Random Forest classifier.
          </div>
        </div>
      )}

      {/* Quick Fleet Metrics Bar */}
      <div className="fleet-metrics-bar" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className="metric-mini-card">
          <div>
            <div className="metric-mini-label">Total Registered Fleet</div>
            <div className="metric-mini-val">{metrics.total} Units</div>
          </div>
          <div className="metric-mini-icon icon-blue">
            <Cpu size={20} />
          </div>
        </div>

        <div className="metric-mini-card">
          <div>
            <div className="metric-mini-label">Operational (Normal)</div>
            <div className="metric-mini-val" style={{ color: '#16a34a' }}>
              {metrics.normalCount} Machines
            </div>
          </div>
          <div className="metric-mini-icon icon-green">
            <CheckCircle2 size={20} />
          </div>
        </div>

        <div className="metric-mini-card">
          <div>
            <div className="metric-mini-label">Predictive Alerts</div>
            <div className="metric-mini-val" style={{ color: metrics.alertCount > 0 ? '#dc2626' : '#64748b' }}>
              {metrics.alertCount} Detected
            </div>
          </div>
          <div className="metric-mini-icon icon-amber">
            <AlertTriangle size={20} />
          </div>
        </div>
      </div>

      {/* Search and Filters Toolbar */}
      <div className="machines-toolbar">
        <div className="search-box-wrapper">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search by name, ID, model, location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="toolbar-filters">
          <select
            className="filter-select"
            value={qualityFilter}
            onChange={(e) => setQualityFilter(e.target.value)}
            aria-label="Filter by machine quality variant"
          >
            <option value="ALL">All Quality Variants (L/M/H)</option>
            <option value="L">Variant L (High Speed)</option>
            <option value="M">Variant M (Medium)</option>
            <option value="H">Variant H (Heavy Duty)</option>
          </select>
        </div>
      </div>

      {/* Fleet Inventory Table Card */}
      <div className="machines-table-card">
        {loading && machines.length === 0 ? (
          <div style={{ padding: '3rem 0' }}>
            <LoadingSpinner message="Fetching registered fleet from Flask database..." />
          </div>
        ) : machines.length === 0 ? (
          <div className="empty-machines-state">
            <Layers size={44} className="empty-icon" />
            <h3 className="empty-title">No Machines Registered Yet</h3>
            <p className="empty-desc">
              Your fleet inventory is currently empty. Register a CNC milling machine using the configuration form
              to save it to the SQLite database and generate predictive maintenance diagnostics.
            </p>
            <Link to="/machines/add" className="btn-add-machine-primary" style={{ display: 'inline-flex' }}>
              <Plus size={16} />
              <span>Register Your First Machine</span>
            </Link>
          </div>
        ) : filteredMachines.length > 0 ? (
          <div className="table-responsive-wrapper">
            <table className="machines-table">
              <thead>
                <tr>
                  <th>Machine Identity</th>
                  <th>Model / Specs</th>
                  <th>Quality Variant</th>
                  <th>Facility Location</th>
                  <th>AI Model Prediction</th>
                  <th>Configured ML Baseline</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredMachines.map((m) => {
                  const mId = m.machineId || m.id
                  const machineName = m.machine_name || m.name || `Machine #${mId}`
                  const qType = m.machine_type || m.qualityType || 'M'
                  const speed = m.rotational_speed ?? m.rotationalSpeed
                  const torque = m.torque
                  const airTemp = m.air_temperature ?? m.airTemperature

                  const hasPrediction = m.prediction !== undefined && m.prediction !== null
                  const isFailure = m.prediction === 1

                  return (
                    <tr key={mId}>
                      <td>
                        <div className="cell-machine-identity">
                          <span className="machine-name-text">{machineName}</span>
                          <span className="machine-id-badge">ID: {mId}</span>
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: '#1e293b' }}>
                          {m.manufacturer || 'Precision Milling'} {m.model_number || m.modelNumber || ''}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                          {m.machineType || 'CNC Milling Unit'}
                        </div>
                      </td>
                      <td>{getQualityBadge(qType)}</td>
                      <td>{m.location || 'Shop Floor'}</td>
                      <td>
                        {hasPrediction ? (
                          isFailure ? (
                            <span
                              className="status-badge"
                              style={{
                                backgroundColor: '#fef2f2',
                                color: '#b91c1c',
                                border: '1px solid #fecaca',
                              }}
                            >
                              <span className="status-dot-sm" style={{ backgroundColor: '#ef4444' }} />
                              ⚠️ Failure Risk ({m.failure_probability != null ? `${Number(m.failure_probability).toFixed(1)}%` : 'Active'})
                            </span>
                          ) : (
                            <span
                              className="status-badge"
                              style={{
                                backgroundColor: '#f0fdf4',
                                color: '#15803d',
                                border: '1px solid #bbf7d0',
                              }}
                            >
                              <span className="status-dot-sm" style={{ backgroundColor: '#22c55e' }} />
                              Optimal / Operational
                            </span>
                          )
                        ) : (
                          <span
                            className="status-badge"
                            style={{
                              backgroundColor: '#f1f5f9',
                              color: '#475569',
                              border: '1px solid #cbd5e1',
                            }}
                          >
                            <span className="status-dot-sm" style={{ backgroundColor: '#94a3b8' }} />
                            Awaiting Telemetry
                          </span>
                        )}
                      </td>
                      <td>
                        <div className="baseline-preview">
                          <span className="baseline-tag">{speed} RPM</span>
                          <span className="baseline-tag">{torque} Nm</span>
                          <span className="baseline-tag">{airTemp} K</span>
                        </div>
                      </td>
                      <td>
                        <Link to={`/machines/${mId}`} className="btn-table-action">
                          <span>Details</span>
                          <ArrowRight size={14} />
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-machines-state">
            <Cpu size={40} className="empty-icon" />
            <h3 className="empty-title">No matching machines found</h3>
            <p className="empty-desc">
              No CNC units match your current search query "{searchQuery}". Try modifying your filter criteria.
            </p>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setSearchQuery('')
                setQualityFilter('ALL')
              }}
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default Machines
