import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Cpu,
  Activity,
  FileText,
  Wrench,
  PlusCircle,
  Clock,
  ArrowRight,
  Info,
  CheckCircle2,
  AlertTriangle,
  Layers,
  ChevronRight,
  ShieldCheck,
  RefreshCw,
  PieChart as PieIcon,
  BarChart3,
  Gauge,
} from 'lucide-react'
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts'
import axiosClient from '../api/axiosClient'
import './Dashboard.css'

export const Dashboard = () => {
  const [machines, setMachines] = useState([])
  const [reports, setReports] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [backendStatus, setBackendStatus] = useState({
    checked: false,
    online: false,
    modelLoaded: false,
    error: null,
  })

  const fetchDashboardData = async () => {
    setLoading(true)

    // 1. Health check verification
    try {
      const healthRes = await axiosClient.get('/api/health')
      if (healthRes.data?.status === 'healthy') {
        setBackendStatus({
          checked: true,
          online: true,
          modelLoaded: !!healthRes.data.model_loaded,
          error: null,
        })
      }
    } catch (err) {
      setBackendStatus({
        checked: true,
        online: false,
        modelLoaded: false,
        error: err.normalizedMessage || 'Unable to connect to Flask server at http://127.0.0.1:5000.',
      })
    }

    try {
      // Fetch stats
      const statsRes = await axiosClient.get('/api/dashboard/stats')
      if (statsRes.data?.success) {
        setStats(statsRes.data)
      }
    } catch (err) {
      console.warn('Dashboard stats fetch fallback:', err)
    }

    try {
      // Fetch machines
      const machRes = await axiosClient.get('/api/machines')
      if (machRes.data?.machines) {
        setMachines(machRes.data.machines)
        localStorage.setItem('cncguard_machines', JSON.stringify(machRes.data.machines))
      }
    } catch (err) {
      console.warn('Dashboard machines fetch fallback:', err)
      try {
        const stored = localStorage.getItem('cncguard_machines')
        if (stored) setMachines(JSON.parse(stored))
      } catch {
        setMachines([])
      }
    }

    try {
      const storedReports = localStorage.getItem('cncguard_reports')
      setReports(storedReports ? JSON.parse(storedReports) : [])
    } catch {
      setReports([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const totalMachines = stats?.total_machines ?? machines.length
  const normalCount = stats?.prediction_distribution?.no_failure ?? machines.filter((m) => m.prediction === 0).length
  const failureCount = stats?.prediction_distribution?.failure_predicted ?? machines.filter((m) => m.prediction === 1).length
  const typeDist = stats?.type_distribution || { L: 0, M: 0, H: 0 }
  const averages = stats?.averages || null

  // Fleet Health Donut Chart Data
  const healthData = [
    { name: 'Optimal / Safe', value: normalCount, color: '#10b981' },
    { name: 'Failure Alert', value: failureCount, color: '#ef4444' },
  ].filter((d) => d.value > 0 || totalMachines === 0)

  // Variant Distribution Data
  const variantData = [
    { variant: 'Type L (Low)', count: typeDist.L || 0, fill: '#38bdf8' },
    { variant: 'Type M (Medium)', count: typeDist.M || 0, fill: '#0284c7' },
    { variant: 'Type H (High)', count: typeDist.H || 0, fill: '#4f46e5' },
  ]

  // Machine Telemetry Comparison Data (Top machines)
  const telemetryData = machines.slice(0, 5).map((m) => ({
    name: m.machine_name ? (m.machine_name.length > 10 ? m.machine_name.slice(0, 10) + '…' : m.machine_name) : `M-${m.machineId || m.id}`,
    torque: Number(m.torque) || 0,
    wear: Number(m.tool_wear) || 0,
  }))

  // Risk Distribution Data
  const riskBreakdown = stats?.risk_breakdown || {
    LOW: machines.filter((m) => m.risk_level === 'LOW' || (!m.risk_level && m.prediction === 0)).length,
    WARNING: machines.filter((m) => m.risk_level === 'WARNING').length,
    CRITICAL: machines.filter((m) => m.risk_level === 'CRITICAL' || (!m.risk_level && m.prediction === 1)).length,
  }

  const riskData = [
    { level: 'Low Risk', count: riskBreakdown.LOW || 0, fill: '#10b981' },
    { level: 'Warning', count: riskBreakdown.WARNING || 0, fill: '#f59e0b' },
    { level: 'Critical', count: riskBreakdown.CRITICAL || 0, fill: '#ef4444' },
  ]

  return (
    <div className="dashboard-container">
      {/* Page Header */}
      <div className="dashboard-header-row">
        <div className="dashboard-header-text">
          <h1>SmartMaintainAI Control Center</h1>
          <p>Real-time machine monitoring, sensor telemetry aggregation, and AI predictive maintenance diagnostics.</p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={fetchDashboardData}
            title="Refresh dashboard metrics"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <RefreshCw size={15} className={loading ? 'navbar-spinner' : ''} />
            <span>Sync</span>
          </button>
          <Link to="/machines/add" className="btn-add-machine-primary">
            <PlusCircle size={17} />
            <span>Register Machine</span>
          </Link>
        </div>
      </div>

      {/* Backend Integration Status Notice */}
      {backendStatus.online ? (
        <div className="form-banner banner-info" role="status" style={{ marginBottom: '1.5rem' }}>
          <CheckCircle2 size={20} className="banner-icon" style={{ color: '#0284c7' }} />
          <div>
            <strong>System Status: SmartMaintainAI Backend Online.</strong> Connected to Flask REST API (`http://127.0.0.1:5000`)
            and SQLite telemetry database (`smartmaintain.db`). Random Forest predictive model is active.
          </div>
        </div>
      ) : backendStatus.checked ? (
        <div className="form-banner banner-warning" role="alert" style={{ marginBottom: '1.5rem', backgroundColor: '#fef2f2', borderColor: '#fca5a5' }}>
          <AlertTriangle size={20} className="banner-icon" style={{ color: '#dc2626' }} />
          <div>
            <strong style={{ color: '#991b1b' }}>Backend Server Offline or Unreachable:</strong>{' '}
            <span style={{ color: '#7f1d1d' }}>{backendStatus.error}</span>
            <div style={{ fontSize: '0.82rem', color: '#b91c1c', marginTop: '0.35rem' }}>
              Please start the Flask API backend server: <code>cd SmartmaintainAI; python app.py</code>
            </div>
          </div>
        </div>
      ) : (
        <div className="form-banner banner-info" role="status" style={{ marginBottom: '1.5rem', opacity: 0.85 }}>
          <RefreshCw size={18} className="navbar-spinner banner-icon" style={{ color: '#0284c7' }} />
          <div>
            <strong>Verifying SmartMaintainAI API Service...</strong> Connecting to http://127.0.0.1:5000/api/health.
          </div>
        </div>
      )}

      {/* Quick Navigation Cards */}
      <div className="quick-nav-grid">
        <Link to="/machines/add" className="quick-nav-card">
          <div className="quick-nav-top">
            <div className="quick-nav-icon-wrap icon-blue">
              <PlusCircle size={22} />
            </div>
            <ArrowRight size={18} className="quick-nav-arrow" />
          </div>
          <div>
            <div className="quick-nav-title">Add Machine</div>
            <p className="quick-nav-desc">Register new milling units into your monitored fleet.</p>
          </div>
        </Link>

        <Link to="/analysis" className="quick-nav-card">
          <div className="quick-nav-top">
            <div className="quick-nav-icon-wrap icon-green">
              <Activity size={22} />
            </div>
            <ArrowRight size={18} className="quick-nav-arrow" />
          </div>
          <div>
            <div className="quick-nav-title">Machine Analysis</div>
            <p className="quick-nav-desc">Configure parameters and run AI failure diagnostics.</p>
          </div>
        </Link>

        <Link to="/reports" className="quick-nav-card">
          <div className="quick-nav-top">
            <div className="quick-nav-icon-wrap icon-amber">
              <FileText size={22} />
            </div>
            <ArrowRight size={18} className="quick-nav-arrow" />
          </div>
          <div>
            <div className="quick-nav-title">Reports History</div>
            <p className="quick-nav-desc">View diagnostic records and historical summaries.</p>
          </div>
        </Link>

        <Link to="/maintenance-logs" className="quick-nav-card">
          <div className="quick-nav-top">
            <div className="quick-nav-icon-wrap icon-blue">
              <Wrench size={22} />
            </div>
            <ArrowRight size={18} className="quick-nav-arrow" />
          </div>
          <div>
            <div className="quick-nav-title">Maintenance Logs</div>
            <p className="quick-nav-desc">Track tool servicing, cutter replacements, and repairs.</p>
          </div>
        </Link>
      </div>

      {/* Visual Analytics Grid (Recharts) */}
      <div className="dashboard-charts-grid">
        {/* Chart 1: Fleet Health Distribution */}
        <div className="chart-card">
          <div className="chart-card-header">
            <h3 className="chart-card-title">
              <PieIcon size={18} style={{ color: '#0284c7' }} />
              <span>Fleet Operational Health Status</span>
            </h3>
            <p className="chart-card-subtitle">
              Model failure classification distribution across all {totalMachines} registered machines.
            </p>
          </div>

          <div className="chart-wrapper">
            {totalMachines === 0 ? (
              <div className="activity-empty-box" style={{ height: '100%', justifyContent: 'center' }}>
                <p style={{ margin: 0, color: '#64748b' }}>No machines registered for health evaluation.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={healthData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={88}
                    paddingAngle={4}
                  >
                    {healthData.map((entry, idx) => (
                      <Cell key={`cell-${idx}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '0.8rem' }}
                    itemStyle={{ color: '#f8fafc' }}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Chart 2: Machine Variant Composition */}
        <div className="chart-card">
          <div className="chart-card-header">
            <h3 className="chart-card-title">
              <BarChart3 size={18} style={{ color: '#0284c7' }} />
              <span>Machine Variant Distribution</span>
            </h3>
            <p className="chart-card-subtitle">
              AI4I product quality variants: L (50%), M (30%), and H (20%) specifications.
            </p>
          </div>

          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={variantData} margin={{ top: 15, right: 20, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="variant" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={{ stroke: '#cbd5e1' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#64748b' }} axisLine={{ stroke: '#cbd5e1' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '0.8rem' }}
                  itemStyle={{ color: '#f8fafc' }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {variantData.map((entry, idx) => (
                    <Cell key={`var-cell-${idx}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 3: Fleet Telemetry (Torque & Tool Wear) */}
        <div className="chart-card">
          <div className="chart-card-header">
            <h3 className="chart-card-title">
              <Activity size={18} style={{ color: '#0284c7' }} />
              <span>Cutting Torque & Tool Wear Telemetry</span>
            </h3>
            <p className="chart-card-subtitle">
              Measured operating cutting torque (Nm) and cumulative wear time (min) across machines.
            </p>
          </div>

          <div className="chart-wrapper">
            {telemetryData.length === 0 ? (
              <div className="activity-empty-box" style={{ height: '100%', justifyContent: 'center' }}>
                <p style={{ margin: 0, color: '#64748b' }}>No live machine telemetry records to plot.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={telemetryData} margin={{ top: 15, right: 20, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={{ stroke: '#cbd5e1' }} />
                  <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={{ stroke: '#cbd5e1' }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '0.8rem' }}
                    itemStyle={{ color: '#f8fafc' }}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="rect" />
                  <Bar dataKey="torque" name="Torque (Nm)" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="wear" name="Tool Wear (min)" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Chart 4: Risk Tier Breakdown & Sensor Averages */}
        <div className="chart-card">
          <div className="chart-card-header">
            <h3 className="chart-card-title">
              <Gauge size={18} style={{ color: '#0284c7' }} />
              <span>Diagnostic Risk Tier Classification</span>
            </h3>
            <p className="chart-card-subtitle">
              Categorized severity distribution across monitored equipment.
            </p>
          </div>

          <div className="chart-wrapper" style={{ height: '150px', minHeight: '150px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={riskData} margin={{ top: 5, right: 25, left: 15, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis dataKey="level" type="category" tick={{ fontSize: 11, fill: '#64748b' }} width={70} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '0.8rem' }}
                  itemStyle={{ color: '#f8fafc' }}
                />
                <Bar dataKey="count" name="Machines" radius={[0, 4, 4, 0]}>
                  {riskData.map((entry, idx) => (
                    <Cell key={`risk-cell-${idx}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Real Sensor Telemetry Averages */}
          {averages ? (
            <div className="sensor-summary-pills">
              <div className="sensor-pill">
                <div className="sensor-pill-label">Avg Air Temp</div>
                <div className="sensor-pill-val">{averages.air_temperature_k} <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#64748b' }}>K</span></div>
              </div>
              <div className="sensor-pill">
                <div className="sensor-pill-label">Avg Proc Temp</div>
                <div className="sensor-pill-val">{averages.process_temperature_k} <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#64748b' }}>K</span></div>
              </div>
              <div className="sensor-pill">
                <div className="sensor-pill-label">Avg Spindle</div>
                <div className="sensor-pill-val">{averages.rotational_speed_rpm} <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#64748b' }}>RPM</span></div>
              </div>
              <div className="sensor-pill">
                <div className="sensor-pill-label">Avg Torque</div>
                <div className="sensor-pill-val">{averages.torque_nm} <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#64748b' }}>Nm</span></div>
              </div>
            </div>
          ) : (
            <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '0.5rem', textAlign: 'center' }}>
              Sensor baseline telemetry averages will calculate automatically when machines are registered.
            </div>
          )}
        </div>
      </div>

      {/* Main Grid: Machine Overview & Activity */}
      <div className="dashboard-main-grid">
        {/* Machine Overview Card */}
        <div className="dashboard-card">
          <div className="dashboard-card-header">
            <h2 className="dashboard-card-title">
              <Cpu size={18} style={{ color: '#0284c7' }} />
              <span>Registered Machine Fleet ({totalMachines})</span>
            </h2>
            <Link to="/machines" className="dashboard-card-action">
              View All Fleet →
            </Link>
          </div>

          {machines.length === 0 ? (
            <div className="activity-empty-box">
              <Layers size={36} className="activity-empty-icon" />
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.35rem' }}>
                No Machines Registered Yet
              </h3>
              <p style={{ fontSize: '0.85rem', color: '#64748b', maxWidth: '420px', margin: '0 auto 1rem' }}>
                Register your CNC milling machines to configure baseline operating parameters and monitor diagnostic health.
              </p>
              <Link to="/machines/add" className="btn-secondary" style={{ display: 'inline-flex' }}>
                <span>+ Register First Machine</span>
              </Link>
            </div>
          ) : (
            <div>
              {machines.slice(0, 6).map((m) => {
                const mId = m.machineId || m.id
                const mName = m.machine_name || m.name || `Machine #${mId}`
                const isFail = m.prediction === 1
                return (
                  <div key={mId} className="mini-machine-item">
                    <div className="mini-machine-info">
                      <div className="mini-machine-icon" style={{ backgroundColor: isFail ? '#fee2e2' : '#f0f9ff', color: isFail ? '#dc2626' : '#0284c7' }}>
                        <Cpu size={17} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.9rem' }}>
                          {mName}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                          <span style={{ fontFamily: 'monospace', color: '#0284c7', marginRight: '0.5rem' }}>
                            ID: {mId}
                          </span>
                          <span>{m.location || 'Shop Floor'} (Variant {m.machine_type || m.qualityType || 'M'})</span>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      {m.prediction !== undefined && m.prediction !== null ? (
                        isFail ? (
                          <span
                            className="status-badge"
                            style={{
                              backgroundColor: '#fef2f2',
                              color: '#b91c1c',
                              border: '1px solid #fecaca',
                              fontSize: '0.75rem',
                            }}
                          >
                            ⚠️ Failure Risk ({m.failure_probability != null ? `${Number(m.failure_probability).toFixed(0)}%` : 'High'})
                          </span>
                        ) : (
                          <span
                            className="status-badge"
                            style={{
                              backgroundColor: '#f0fdf4',
                              color: '#15803d',
                              border: '1px solid #bbf7d0',
                              fontSize: '0.75rem',
                            }}
                          >
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
                            fontSize: '0.75rem',
                          }}
                        >
                          Telemetry Synchronized
                        </span>
                      )}
                      <Link to={`/machines/${mId}`} className="btn-table-action">
                        <span>Details</span>
                        <ChevronRight size={14} />
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Status / Activity Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Telemetry Pipeline Status Card */}
          <div className="dashboard-card">
            <div className="dashboard-card-header">
              <h2 className="dashboard-card-title">
                <ShieldCheck size={18} style={{ color: '#0284c7' }} />
                <span>Diagnostics Fleet Metrics</span>
              </h2>
            </div>

            <div style={{ fontSize: '0.88rem', color: '#475569', lineHeight: 1.6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.45rem 0', borderBottom: '1px solid #f8fafc' }}>
                <span style={{ color: '#64748b' }}>Total Fleet:</span>
                <strong>{totalMachines} Units</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.45rem 0', borderBottom: '1px solid #f8fafc' }}>
                <span style={{ color: '#64748b' }}>Optimal / Normal:</span>
                <strong style={{ color: '#16a34a' }}>{normalCount} Units</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.45rem 0', borderBottom: '1px solid #f8fafc' }}>
                <span style={{ color: '#64748b' }}>Failure Risks:</span>
                <strong style={{ color: failureCount > 0 ? '#dc2626' : '#64748b' }}>{failureCount} Alerts</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.45rem 0', borderBottom: '1px solid #f8fafc' }}>
                <span style={{ color: '#64748b' }}>Variant Distribution:</span>
                <span><strong>L:</strong> {typeDist.L} • <strong>M:</strong> {typeDist.M} • <strong>H:</strong> {typeDist.H}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.45rem 0', borderBottom: '1px solid #f8fafc' }}>
                <span style={{ color: '#64748b' }}>Backend Link:</span>
                <span style={{ color: '#16a34a', fontWeight: 600 }}>Connected (Flask Port 5000)</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.45rem 0' }}>
                <span style={{ color: '#64748b' }}>AI Inference Engine:</span>
                <span style={{ color: '#0f172a', fontWeight: 600 }}>Random Forest (200 Trees)</span>
              </div>
            </div>

            {/* Average Sensor Telemetry Metrics */}
            {averages && (
              <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid #e2e8f0', fontSize: '0.8rem' }}>
                <div style={{ fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>Fleet Average Telemetry:</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.35rem', color: '#64748b' }}>
                  <div>Air Temp: <strong>{averages.air_temperature_k} K</strong></div>
                  <div>Process Temp: <strong>{averages.process_temperature_k} K</strong></div>
                  <div>Spindle: <strong>{averages.rotational_speed_rpm} RPM</strong></div>
                  <div>Torque: <strong>{averages.torque_nm} Nm</strong></div>
                  <div>Tool Wear: <strong>{averages.tool_wear_min} min</strong></div>
                </div>
              </div>
            )}
          </div>

          {/* Recent Reports / Analysis Card */}
          <div className="dashboard-card" style={{ flex: 1 }}>
            <div className="dashboard-card-header">
              <h2 className="dashboard-card-title">
                <FileText size={18} style={{ color: '#0284c7' }} />
                <span>Recent Diagnostics History</span>
              </h2>
              <Link to="/reports" className="dashboard-card-action">
                View All →
              </Link>
            </div>

            {reports.length === 0 ? (
              <div className="activity-empty-box" style={{ padding: '1.5rem 0' }}>
                <Clock size={28} className="activity-empty-icon" />
                <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                  No diagnostic runs recorded yet.
                </div>
              </div>
            ) : (
              <div>
                {reports.slice(0, 3).map((r) => (
                  <div key={r.id} style={{ padding: '0.5rem 0', borderBottom: '1px solid #f8fafc', fontSize: '0.85rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: 600, color: '#0f172a' }}>{r.machineName}</span>
                      <span style={{ color: '#0284c7', fontSize: '0.78rem', fontFamily: 'monospace' }}>{r.id}</span>
                    </div>
                    <div style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '0.15rem' }}>
                      {r.summary || 'Diagnostic analysis completed'} • {new Date(r.date).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
