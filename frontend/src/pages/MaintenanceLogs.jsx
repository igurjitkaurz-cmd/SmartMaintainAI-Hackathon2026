import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Wrench,
  Plus,
  Search,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  Info,
  X,
  Cpu,
  Layers,
} from 'lucide-react'
import './MaintenanceLogs.css'

export const MaintenanceLogs = () => {
  // Read genuine maintenance logs created by operators
  const [logs, setLogs] = useState(() => {
    try {
      const stored = localStorage.getItem('cncguard_maintenance_logs')
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  })

  // Read genuine registered machines for the dropdown
  const [fleet, setFleet] = useState([])
  const [modalOpen, setModalOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // New maintenance form states
  const [formData, setFormData] = useState({
    machineId: '',
    maintenanceType: 'Tool / Cutter Replacement',
    date: new Date().toISOString().split('T')[0],
    status: 'Completed',
    description: '',
  })
  const [formError, setFormError] = useState('')

  useEffect(() => {
    try {
      const storedFleet = localStorage.getItem('cncguard_machines')
      const parsed = storedFleet ? JSON.parse(storedFleet) : []
      setFleet(parsed)
      if (parsed.length > 0 && !formData.machineId) {
        setFormData((prev) => ({ ...prev, machineId: parsed[0].machineId || parsed[0].id }))
      }
    } catch {
      setFleet([])
    }
  }, [])

  const handleOpenModal = () => {
    setFormError('')
    setModalOpen(true)
  }

  const handleSaveLog = (e) => {
    e.preventDefault()
    setFormError('')

    if (!formData.machineId.trim()) {
      setFormError('Please select or enter a valid Machine ID.')
      return
    }

    if (!formData.description.trim()) {
      setFormError('Please provide a brief servicing description.')
      return
    }

    const newLog = {
      id: `LOG-${Date.now().toString().slice(-6)}`,
      machineId: formData.machineId.trim(),
      maintenanceType: formData.maintenanceType,
      date: formData.date,
      status: formData.status,
      description: formData.description.trim(),
      createdAt: new Date().toISOString(),
    }

    try {
      const updated = [newLog, ...logs]
      localStorage.setItem('cncguard_maintenance_logs', JSON.stringify(updated))
      setLogs(updated)
      setModalOpen(false)
      setFormData({
        machineId: fleet.length > 0 ? (fleet[0].machineId || fleet[0].id) : '',
        maintenanceType: 'Tool / Cutter Replacement',
        date: new Date().toISOString().split('T')[0],
        status: 'Completed',
        description: '',
      })
    } catch (err) {
      console.warn('Could not save log:', err)
      setFormError('Failed to save log to local workstation storage.')
    }
  }

  const filteredLogs = logs.filter((l) => {
    const q = searchQuery.toLowerCase().trim()
    if (!q) return true
    return (
      (l.id && l.id.toLowerCase().includes(q)) ||
      (l.machineId && l.machineId.toLowerCase().includes(q)) ||
      (l.maintenanceType && l.maintenanceType.toLowerCase().includes(q)) ||
      (l.description && l.description.toLowerCase().includes(q))
    )
  })

  return (
    <div className="maint-container">
      {/* Page Header */}
      <div className="maint-header-row">
        <div className="maint-header-text">
          <h1>Maintenance Logs</h1>
          <p>Operator logbook for cutter replacements, spindle lubrication, and preventative inspections.</p>
        </div>

        <button
          type="button"
          className="btn-add-machine-primary"
          onClick={handleOpenModal}
        >
          <Plus size={18} />
          <span>Log Maintenance Event</span>
        </button>
      </div>

      {/* Backend Integration Advisory */}
      <div className="form-banner banner-info" role="status" style={{ marginBottom: '1.5rem' }}>
        <Info size={20} className="banner-icon" />
        <div>
          <strong>Logbook Synchronization Notice:</strong> Maintenance records created here are preserved in your local workstation logbook.
          Centralized server synchronization will activate once FastAPI maintenance management endpoints are confirmed in Step 3.2.
        </div>
      </div>

      {/* Logs Table / Empty Card */}
      <div className="maint-card">
        {logs.length === 0 ? (
          <div className="empty-reports-state">
            <div className="empty-reports-icon" style={{ backgroundColor: '#f0f9ff', color: '#0284c7' }}>
              <Wrench size={26} />
            </div>

            <h2 className="empty-reports-title">No Maintenance Events Logged</h2>

            <p className="empty-reports-desc">
              Record cutter replacements, spindle calibrations, or lubrication procedures to track milling machine upkeep
              and correlate operational servicing with tool degradation.
            </p>

            <button
              type="button"
              className="btn-primary-action"
              onClick={handleOpenModal}
            >
              <Plus size={16} />
              <span>Record First Maintenance Event</span>
            </button>
          </div>
        ) : (
          <div>
            {/* Search toolbar */}
            <div className="machines-toolbar" style={{ border: 'none', borderRadius: 0, borderBottom: '1px solid #e2e8f0' }}>
              <div className="search-box-wrapper">
                <Search size={16} className="search-icon" />
                <input
                  type="text"
                  className="search-input"
                  placeholder="Search maintenance logs by ID, machine, or type..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {filteredLogs.length > 0 ? (
              <div className="table-responsive-wrapper">
                <table className="machines-table">
                  <thead>
                    <tr>
                      <th>Log ID</th>
                      <th>Machine</th>
                      <th>Maintenance Type</th>
                      <th>Date</th>
                      <th>Status</th>
                      <th>Servicing Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLogs.map((log) => (
                      <tr key={log.id}>
                        <td style={{ fontFamily: 'monospace', fontWeight: 700, color: '#0284c7' }}>
                          {log.id}
                        </td>
                        <td>
                          <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#0f172a' }}>
                            {log.machineId}
                          </span>
                        </td>
                        <td style={{ fontWeight: 600, color: '#334155' }}>
                          {log.maintenanceType}
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#64748b', fontSize: '0.85rem' }}>
                            <Calendar size={13} />
                            <span>{log.date}</span>
                          </div>
                        </td>
                        <td>
                          <span
                            className="status-badge"
                            style={{
                              backgroundColor: log.status === 'Completed' ? '#ecfdf5' : '#eff6ff',
                              color: log.status === 'Completed' ? '#065f46' : '#1e40af',
                              border: log.status === 'Completed' ? '1px solid #a7f3d0' : '1px solid #bfdbfe',
                              fontSize: '0.78rem',
                            }}
                          >
                            <span
                              className="status-dot-sm"
                              style={{ backgroundColor: log.status === 'Completed' ? '#10b981' : '#3b82f6' }}
                            />
                            {log.status}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.88rem', color: '#475569', maxWidth: '300px' }}>
                          {log.description}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-reports-state" style={{ padding: '2rem' }}>
                <p>No maintenance logs match your search.</p>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setSearchQuery('')}
                >
                  Clear Search
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal: Log Maintenance Event */}
      {modalOpen && (
        <div className="maint-modal-backdrop" onClick={() => setModalOpen(false)}>
          <div className="maint-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="maint-modal-header">
              <h2 className="maint-modal-title">
                <Wrench size={18} style={{ color: '#0284c7' }} />
                <span>Log Maintenance Event</span>
              </h2>
              <button
                type="button"
                className="input-toggle-btn"
                onClick={() => setModalOpen(false)}
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveLog}>
              <div className="maint-modal-body">
                {formError && (
                  <div className="form-banner banner-error" style={{ marginBottom: '0.5rem', padding: '0.75rem' }}>
                    <AlertCircle size={17} className="banner-icon" />
                    <div>{formError}</div>
                  </div>
                )}

                {/* Target Machine */}
                <div className="form-group-item">
                  <label htmlFor="log-machine" className="form-label-row">
                    <span>Target Machine<span className="required-star">*</span></span>
                  </label>
                  {fleet.length > 0 ? (
                    <select
                      id="log-machine"
                      className="form-control-select"
                      value={formData.machineId}
                      onChange={(e) => setFormData({ ...formData, machineId: e.target.value })}
                    >
                      {fleet.map((m) => {
                        const mId = m.machineId || m.id
                        return (
                          <option key={mId} value={mId}>
                            [{mId}] {m.name}
                          </option>
                        )
                      })}
                    </select>
                  ) : (
                    <input
                      id="log-machine"
                      type="text"
                      className="form-control-input"
                      placeholder="e.g. CNC-001"
                      value={formData.machineId}
                      onChange={(e) => setFormData({ ...formData, machineId: e.target.value })}
                    />
                  )}
                </div>

                {/* Maintenance Type */}
                <div className="form-group-item">
                  <label htmlFor="log-type" className="form-label-row">
                    <span>Maintenance Category<span className="required-star">*</span></span>
                  </label>
                  <select
                    id="log-type"
                    className="form-control-select"
                    value={formData.maintenanceType}
                    onChange={(e) => setFormData({ ...formData, maintenanceType: e.target.value })}
                  >
                    <option value="Tool / Cutter Replacement">Tool / Cutter Replacement</option>
                    <option value="Spindle Lubrication">Spindle Lubrication</option>
                    <option value="Bearing Inspection">Bearing Inspection</option>
                    <option value="Spindle Taper Cleaning">Spindle Taper Cleaning</option>
                    <option value="Belt Tension Calibration">Belt Tension Calibration</option>
                    <option value="Routine Preventative Servicing">Routine Preventative Servicing</option>
                  </select>
                </div>

                {/* Date & Status */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group-item">
                    <label htmlFor="log-date" className="form-label-row">
                      <span>Service Date<span className="required-star">*</span></span>
                    </label>
                    <input
                      id="log-date"
                      type="date"
                      className="form-control-input"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    />
                  </div>

                  <div className="form-group-item">
                    <label htmlFor="log-status" className="form-label-row">
                      <span>Execution Status<span className="required-star">*</span></span>
                    </label>
                    <select
                      id="log-status"
                      className="form-control-select"
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    >
                      <option value="Completed">Completed</option>
                      <option value="Scheduled">Scheduled</option>
                      <option value="In Progress">In Progress</option>
                    </select>
                  </div>
                </div>

                {/* Description */}
                <div className="form-group-item">
                  <label htmlFor="log-desc" className="form-label-row">
                    <span>Servicing Notes & Observations<span className="required-star">*</span></span>
                  </label>
                  <textarea
                    id="log-desc"
                    rows="3"
                    className="form-control-textarea"
                    placeholder="Replaced worn carbide end-mill cutter blade. Inspected spindle collet taper..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
              </div>

              <div className="maint-modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary-action">
                  <span>Record Event</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default MaintenanceLogs
