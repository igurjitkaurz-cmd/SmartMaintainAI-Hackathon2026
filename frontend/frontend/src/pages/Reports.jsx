import React, { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  FileText,
  Search,
  Filter,
  Info,
  Activity,
  ArrowRight,
  Calendar,
  Layers,
} from 'lucide-react'
import './Reports.css'

export const Reports = () => {
  // Read genuine reports generated from predictive maintenance inferences
  const [reports] = useState(() => {
    try {
      const stored = localStorage.getItem('cncguard_reports')
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  })

  const [searchQuery, setSearchQuery] = useState('')

  const filteredReports = useMemo(() => {
    return reports.filter((r) => {
      const q = searchQuery.toLowerCase().trim()
      if (!q) return true
      return (
        (r.id && r.id.toLowerCase().includes(q)) ||
        (r.machineName && r.machineName.toLowerCase().includes(q)) ||
        (r.machineId && r.machineId.toLowerCase().includes(q))
      )
    })
  }, [reports, searchQuery])

  return (
    <div className="reports-container">
      {/* Header */}
      <div className="reports-header-row">
        <div className="reports-header-text">
          <h1>Reports History</h1>
          <p>Historical predictive maintenance diagnostics and operational reliability summaries.</p>
        </div>

        <Link to="/analysis" className="btn-add-machine-primary">
          <Activity size={17} />
          <span>Run Machine Analysis</span>
        </Link>
      </div>

      {/* Backend Contract Advisory Notice */}
      <div className="form-banner banner-info" role="status" style={{ marginBottom: '1.5rem' }}>
        <Info size={20} className="banner-icon" />
        <div>
          <strong>Reporting Log:</strong> Diagnostic reports are recorded automatically upon running predictive inferences on the Machine Telemetry page.
          In accordance with data integrity guidelines, only genuine model evaluations are archived.
        </div>
      </div>

      {/* Reports Card / Listing */}
      <div className="reports-card">
        {reports.length === 0 ? (
          <div className="empty-reports-state">
            <div className="empty-reports-icon">
              <FileText size={26} />
            </div>
            <h2 className="empty-reports-title">No Reports Generated Yet</h2>
            <p className="empty-reports-desc">
              Predictive maintenance reports will be compiled automatically here once machine diagnostic evaluations
              are executed through the FastAPI predictive inference pipeline.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <Link to="/analysis" className="btn-primary-action">
                <Activity size={16} />
                <span>Go to Machine Analysis</span>
              </Link>
              <Link to="/machines" className="btn-secondary">
                <span>View Registered Fleet</span>
              </Link>
            </div>
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
                  placeholder="Search by report ID, machine..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {filteredReports.length > 0 ? (
              <table className="reports-table">
                <thead>
                  <tr>
                    <th>Report ID</th>
                    <th>Machine</th>
                    <th>Date & Time</th>
                    <th>Diagnostic Summary</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReports.map((report) => (
                    <tr key={report.id}>
                      <td style={{ fontFamily: 'monospace', fontWeight: 700, color: '#0284c7' }}>
                        {report.id}
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: '#0f172a' }}>{report.machineName}</div>
                        <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{report.machineId}</div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#64748b' }}>
                          <Calendar size={14} />
                          <span>{new Date(report.date).toLocaleDateString()}</span>
                        </div>
                      </td>
                      <td>{report.summary || 'Completed Diagnostics'}</td>
                      <td>
                        <Link to={`/predictions/${report.id}`} className="btn-table-action">
                          <span>View</span>
                          <ArrowRight size={14} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="empty-reports-state" style={{ padding: '2rem' }}>
                <p>No reports match your search query.</p>
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
    </div>
  )
}

export default Reports
