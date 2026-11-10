import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  ArrowLeft,
  Cpu,
  Clock,
  Settings,
  Activity,
  AlertTriangle,
  Info,
  Calendar,
  MapPin,
  Building,
  CheckCircle2,
  FileQuestion,
  HelpCircle,
} from 'lucide-react'
import axiosClient from '../api/axiosClient'
import './MachineDetail.css'

export const MachineDetail = () => {
  const { machineId } = useParams()
  const [machine, setMachine] = useState(null)
  const [loading, setLoading] = useState(true)
  const [actionNotice, setActionNotice] = useState(null)

  useEffect(() => {
    let isMounted = true

    const fetchDetail = async () => {
      try {
        const response = await axiosClient.get('/api/machines')
        if (!isMounted) return
        const fleet = response.data?.machines || []
        const found = fleet.find(
          (m) => String(m.machineId || m.id || '').toUpperCase() === String(machineId || '').toUpperCase()
        )
        if (found) {
          setMachine(found)
          setLoading(false)
          return
        }
      } catch (err) {
        console.warn('API machine detail fetch warning:', err)
      }

      try {
        const stored = localStorage.getItem('cncguard_machines')
        const fleet = stored ? JSON.parse(stored) : []
        const found = fleet.find(
          (m) => String(m.machineId || m.id || '').toUpperCase() === String(machineId || '').toUpperCase()
        )
        if (isMounted) setMachine(found || null)
      } catch (err) {
        console.warn('Error reading stored machine detail:', err)
        if (isMounted) setMachine(null)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    fetchDetail()

    return () => {
      isMounted = false
    }
  }, [machineId])

  const getQualityBadge = (type) => {
    if (!type) return null
    const cls = `quality-pill quality-${type.toLowerCase()}`
    return (
      <span className={cls} title={`Quality Variant: ${type}`}>
        Variant {type}
      </span>
    )
  }

  // Not found / unconfigured state
  if (!loading && !machine) {
    return (
      <div className="machine-detail-container">
        <div className="detail-top-nav">
          <Link to="/machines" className="btn-back-link">
            <ArrowLeft size={16} />
            <span>Back to My Machines</span>
          </Link>
        </div>

        <div className="detail-card" style={{ textAlign: 'center', padding: '3.5rem 1.5rem' }}>
          <FileQuestion size={48} style={{ color: '#94a3b8', margin: '0 auto 1rem' }} />
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.5rem' }}>
            Machine "{machineId}" Not Found in Local Fleet
          </h2>
          <p style={{ maxWidth: '520px', margin: '0 auto 1.5rem', color: '#64748b', fontSize: '0.92rem', lineHeight: 1.6 }}>
            No local configuration record matches machine identifier <code>{machineId}</code>.
            If this milling machine is registered on the central plant server, its profile will populate once the FastAPI backend is connected.
          </p>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/machines" className="btn-secondary">
              View All Machines
            </Link>
            <Link to="/machines/add" className="btn-primary-action">
              Register New Machine
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="machine-detail-container">
      {/* Top Navigation */}
      <div className="detail-top-nav">
        <Link to="/machines" className="btn-back-link">
          <ArrowLeft size={16} />
          <span>Back to My Machines</span>
        </Link>
      </div>

      {/* Action Advisory Modal / Banner */}
      {actionNotice && (
        <div className="form-banner banner-info" role="alert" style={{ marginBottom: '1.25rem' }}>
          <Info size={20} className="banner-icon" />
          <div style={{ flex: 1 }}>
            <strong>{actionNotice.title}</strong>
            <div style={{ marginTop: '0.2rem' }}>{actionNotice.desc}</div>
          </div>
          <button
            type="button"
            className="link-button"
            onClick={() => setActionNotice(null)}
            style={{ fontSize: '0.8rem', color: '#0369a1' }}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Machine Header Card */}
      <div className="detail-header-card">
        <div className="detail-header-identity">
          <div className="detail-header-icon">
            <Cpu size={28} />
          </div>
          <div className="detail-header-text">
            <h1>{machine?.name || `CNC Machine (${machineId})`}</h1>
            <div className="detail-header-meta">
              <span className="detail-id-tag">{machineId}</span>
              {getQualityBadge(machine?.qualityType)}
              <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                {machine?.manufacturer} {machine?.modelNumber || machine?.model || ''}
              </span>
            </div>
          </div>
        </div>

        <div className="detail-header-actions">
          <button
            type="button"
            className="btn-secondary"
            onClick={() =>
              setActionNotice({
                title: 'Machine Configuration Editing',
                desc: 'Editing machine parameters will be enabled once the backend PUT/PATCH API endpoint contract is confirmed in Step 3.2.',
              })
            }
          >
            <Settings size={15} style={{ marginRight: '0.35rem' }} />
            Edit Machine
          </button>

          <button
            type="button"
            className="btn-primary-action"
            onClick={() =>
              setActionNotice({
                title: 'Predictive Inference Unavailable',
                desc: 'AI predictive maintenance analysis is awaiting the FastAPI prediction endpoint (/predict). No unverified API calls or simulated predictions were executed.',
              })
            }
          >
            <Activity size={15} />
            Analyze Machine
          </button>
        </div>
      </div>

      {/* Machine Status Section (Task 4) */}
      <div className="detail-status-card">
        <div className="status-callout">
          <div className="status-callout-icon">
            {machine?.prediction === 1 ? (
              <AlertTriangle size={20} style={{ color: '#dc2626' }} />
            ) : (
              <CheckCircle2 size={20} style={{ color: '#16a34a' }} />
            )}
          </div>
          <div>
            <h2 className="status-callout-title">
              {machine?.prediction === 1
                ? 'Warning: AI Predictive Failure Detected'
                : 'Optimal Operating Condition — Telemetry Synchronized'}
            </h2>
            <p className="status-callout-desc">
              {machine?.suggestion || 'Live operational metrics evaluated against trained Random Forest classifier.'}
            </p>
          </div>
        </div>

        {machine?.prediction === 1 ? (
          <span
            className="status-badge"
            style={{
              backgroundColor: '#fef2f2',
              color: '#b91c1c',
              border: '1px solid #fecaca',
              whiteSpace: 'nowrap',
            }}
          >
            <span className="status-dot-sm" style={{ backgroundColor: '#ef4444' }} />
            Critical Alert ({machine.failure_probability != null ? `${Number(machine.failure_probability).toFixed(1)}%` : 'Active'})
          </span>
        ) : (
          <span
            className="status-badge"
            style={{
              backgroundColor: '#f0fdf4',
              color: '#15803d',
              border: '1px solid #bbf7d0',
              whiteSpace: 'nowrap',
            }}
          >
            <span className="status-dot-sm" style={{ backgroundColor: '#22c55e' }} />
            Operational / Normal
          </span>
        )}
      </div>

      <div className="detail-grid-sections">
        {/* Machine Overview Section (Task 2) */}
        <div className="detail-card">
          <div className="detail-card-header">
            <div>
              <h2 className="detail-card-title">
                <Building size={18} style={{ color: '#0284c7' }} />
                <span>Machine Overview & Specification</span>
              </h2>
              <div className="detail-card-subtitle">
                Hardware specifications, facility placement, and operational scope
              </div>
            </div>
          </div>

          <div className="overview-kv-grid">
            <div className="kv-item">
              <span className="kv-label">Machine Name</span>
              <span className="kv-val">{machine?.name || '—'}</span>
            </div>

            <div className="kv-item">
              <span className="kv-label">Machine ID</span>
              <span className="kv-val" style={{ fontFamily: 'monospace' }}>
                {machineId}
              </span>
            </div>

            <div className="kv-item">
              <span className="kv-label">Machine Type</span>
              <span className="kv-val">{machine?.machineType || 'CNC Milling Machine'}</span>
            </div>

            <div className="kv-item">
              <span className="kv-label">Manufacturer</span>
              <span className="kv-val">{machine?.manufacturer || '—'}</span>
            </div>

            <div className="kv-item">
              <span className="kv-label">Model Number</span>
              <span className="kv-val">{machine?.modelNumber || machine?.model || '—'}</span>
            </div>

            <div className="kv-item">
              <span className="kv-label">Installation Year</span>
              <span className="kv-val">{machine?.installationYear || '—'}</span>
            </div>

            <div className="kv-item">
              <span className="kv-label">Facility Location</span>
              <span className="kv-val">{machine?.location || '—'}</span>
            </div>

            <div className="kv-item">
              <span className="kv-label">Quality Variant</span>
              <span className="kv-val">
                {machine?.qualityType ? `Variant ${machine.qualityType}` : '—'}
              </span>
            </div>

            <div className="kv-item" style={{ gridColumn: '1 / -1' }}>
              <span className="kv-label">Description / Work Notes</span>
              <span className="kv-val desc-text">
                {machine?.description?.trim() ? machine.description : 'No operational notes provided for this machine.'}
              </span>
            </div>
          </div>
        </div>

        {/* Machine Configuration Section (Task 3) */}
        <div className="detail-card">
          <div className="detail-card-header">
            <div>
              <h2 className="detail-card-title">
                <Cpu size={18} style={{ color: '#0284c7' }} />
                <span>Machine Configuration Parameters (ML Baseline)</span>
              </h2>
              <div className="detail-card-subtitle">
                Six confirmed predictive maintenance baseline parameters
              </div>
            </div>
          </div>

          <div className="ml-params-grid">
            {/* Machine Quality Type */}
            <div className="ml-param-box">
              <div className="param-header">
                <span className="param-name">Quality Type</span>
                <span className="param-unit-tag">L / M / H</span>
              </div>
              <div className="param-value">{machine?.qualityType || '—'}</div>
            </div>

            {/* Air Temperature */}
            <div className="ml-param-box">
              <div className="param-header">
                <span className="param-name">Air Temperature</span>
                <span className="param-unit-tag">Kelvin (K)</span>
              </div>
              <div className="param-value">{machine?.airTemperature || '—'} K</div>
            </div>

            {/* Process Temperature */}
            <div className="ml-param-box">
              <div className="param-header">
                <span className="param-name">Process Temperature</span>
                <span className="param-unit-tag">Kelvin (K)</span>
              </div>
              <div className="param-value">{machine?.processTemperature || '—'} K</div>
            </div>

            {/* Rotational Speed */}
            <div className="ml-param-box">
              <div className="param-header">
                <span className="param-name">Rotational Speed</span>
                <span className="param-unit-tag">RPM</span>
              </div>
              <div className="param-value">{machine?.rotationalSpeed || '—'} RPM</div>
            </div>

            {/* Torque */}
            <div className="ml-param-box">
              <div className="param-header">
                <span className="param-name">Torque</span>
                <span className="param-unit-tag">Nm</span>
              </div>
              <div className="param-value">{machine?.torque || '—'} Nm</div>
            </div>

            {/* Tool Wear */}
            <div className="ml-param-box">
              <div className="param-header">
                <span className="param-name">Tool Wear</span>
                <span className="param-unit-tag">Minutes</span>
              </div>
              <div className="param-value">{machine?.toolWear || '—'} min</div>
            </div>
          </div>

          <div className="param-disclaimer">
            <Info size={18} style={{ flexShrink: 0 }} />
            <div>
              <strong>Configuration Notice:</strong> These six fields represent configured baseline inputs,
              not live telemetry sensor streams. Live streaming sensor telemetry will activate once the backend
              telemetry pipeline is established.
            </div>
          </div>
        </div>

        {/* Predictive Maintenance Section (Task 5) */}
        <div className="detail-card">
          <div className="detail-card-header">
            <div>
              <h2 className="detail-card-title">
                <Activity size={18} style={{ color: '#0284c7' }} />
                <span>AI Predictive Maintenance Diagnostics</span>
              </h2>
              <div className="detail-card-subtitle">
                Machine learning health assessment and failure mode predictions
              </div>
            </div>
          </div>

          {machine?.prediction !== undefined && machine?.prediction !== null ? (
            <div className="predictive-status-block" style={{ backgroundColor: machine.prediction === 1 ? '#fef2f2' : '#f0fdf4', border: `1px solid ${machine.prediction === 1 ? '#fecaca' : '#bbf7d0'}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                {machine.prediction === 1 ? (
                  <AlertTriangle size={32} style={{ color: '#dc2626' }} />
                ) : (
                  <CheckCircle2 size={32} style={{ color: '#16a34a' }} />
                )}
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', color: machine.prediction === 1 ? '#991b1b' : '#14532d' }}>
                    {machine.prediction === 1 ? '⚠️ Failure Predicted — Maintenance Inspection Recommended' : '✅ Optimal Condition — No Failure Predicted'}
                  </h3>
                  <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: machine.prediction === 1 ? '#b91c1c' : '#15803d' }}>
                    Model Confidence: {machine.confidence != null ? `${machine.confidence}%` : '100%'} • Failure Probability: {machine.failure_probability != null ? `${Number(machine.failure_probability).toFixed(1)}%` : '0.0%'} • Risk Tier: {machine.risk_level || 'LOW'}
                  </p>
                </div>
              </div>

              {machine.suggestion && (
                <div style={{ margin: '0.75rem 0', padding: '0.75rem', backgroundColor: 'rgba(255,255,255,0.85)', borderRadius: '6px', fontSize: '0.88rem', color: '#1e293b' }}>
                  <strong>Operational Recommendation:</strong> {machine.suggestion}
                </div>
              )}

              {machine.diagnostics && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', marginTop: '1rem' }}>
                  {Object.entries(machine.diagnostics).map(([k, d]) => (
                    <div key={k} style={{ padding: '0.65rem', backgroundColor: '#ffffff', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.82rem' }}>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>{d.name}</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', margin: '0.3rem 0' }}>
                        <span style={{ color: '#64748b' }}>Metric: {d.metric}</span>
                        <span style={{ fontWeight: 700, color: d.risk === 'CRITICAL' ? '#dc2626' : (d.risk === 'WARNING' ? '#d97706' : '#16a34a') }}>
                          {d.risk}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{d.details}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="predictive-status-block">
              <Activity size={36} className="pdm-notice-icon" />
              <h3 className="pdm-notice-title">Predictive Maintenance Active</h3>
              <p className="pdm-notice-desc">
                Machine learning diagnostics are enabled. Real-time predictions evaluate tool wear, thermal differentials, mechanical power, and spindle strain.
              </p>
              <div className="pdm-specs-list">
                <div className="pdm-spec-item">
                  <strong>Analysis Status:</strong> Online / Synchronized
                </div>
                <div className="pdm-spec-item">
                  <strong>Target Service:</strong> Flask ML Pipeline (Port 5000)
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default MachineDetail
