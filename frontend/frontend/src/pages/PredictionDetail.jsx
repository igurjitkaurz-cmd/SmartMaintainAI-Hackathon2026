import React, { useState, useEffect } from 'react'
import { useParams, useLocation, Link } from 'react-router-dom'
import {
  ArrowLeft,
  Activity,
  Cpu,
  Clock,
  AlertTriangle,
  Info,
  CheckCircle2,
  Sliders,
  Shield,
  Layers,
  Wrench,
  Gauge,
  BarChart3,
} from 'lucide-react'
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Tooltip,
} from 'recharts'
import './PredictionDetail.css'

export const PredictionDetail = () => {
  const { predictionId } = useParams()
  const location = useLocation()

  // State from location or local cache
  const [predictionData, setPredictionData] = useState(() => {
    if (location.state?.predictionResult) {
      return {
        result: location.state.predictionResult,
        machine: location.state.machine || null,
        parameters: location.state.parameters || null,
      }
    }
    return null
  })

  useEffect(() => {
    if (!predictionData) {
      try {
        const cached = localStorage.getItem('cncguard_last_prediction')
        if (cached) {
          const parsed = JSON.parse(cached)
          if (
            !predictionId ||
            predictionId === 'manual-input' ||
            String(parsed.targetRef).toUpperCase() === String(predictionId).toUpperCase() ||
            String(parsed.machineId).toUpperCase() === String(predictionId).toUpperCase()
          ) {
            setPredictionData({
              result: parsed.result,
              machine: parsed.machineName ? { name: parsed.machineName } : null,
              parameters: parsed.parameters,
            })
            return
          }
        }

        // Try searching in reports
        const reports = JSON.parse(localStorage.getItem('cncguard_reports') || '[]')
        const found = reports.find(
          (r) => String(r.id).toUpperCase() === String(predictionId).toUpperCase() ||
                 String(r.machineId).toUpperCase() === String(predictionId).toUpperCase()
        )
        if (found && found.result) {
          setPredictionData({
            result: found.result,
            machine: { name: found.machineName },
            parameters: found.result.parameters_evaluated,
          })
        }
      } catch (err) {
        console.warn('Could not read cached prediction detail:', err)
      }
    }
  }, [predictionId, predictionData])

  const result = predictionData?.result
  const parameters = predictionData?.parameters || result?.parameters_evaluated
  const machine = predictionData?.machine

  const isFailure = result?.prediction === 1
  const failureProb = result?.failure_probability != null ? Number(result.failure_probability) : 0.0
  const confidence = result?.confidence != null ? Number(result.confidence) : 100.0
  const riskLevel = result?.risk_level || (isFailure ? 'CRITICAL' : 'LOW')

  // Confirmed failure categories supported by the AI4I Milling model
  const defaultFailureCategories = [
    { code: 'TWF', name: 'Tool Wear Failure', description: 'Cutter blade exceeding wear limit (minutes)' },
    { code: 'HDF', name: 'Heat Dissipation Failure', description: 'Process-to-air temperature differential anomaly' },
    { code: 'PWF', name: 'Power Failure', description: 'Over-power or under-power torque/speed product' },
    { code: 'OSF', name: 'Overstrain Failure', description: 'Spindle overload from excessive cutting torque' },
  ]

  const diagnostics = result?.failure_mode_diagnostics

  // Semicircular Gauge Data
  const gaugeData = [
    { name: 'Failure Probability', value: Math.min(100, Math.max(0, failureProb)), fill: isFailure ? '#ef4444' : '#10b981' },
    { name: 'Operating Margin', value: Math.max(0, 100 - Math.min(100, Math.max(0, failureProb))), fill: '#e2e8f0' },
  ]

  // Telemetry Parameter Values for Radar Stress Analysis
  const airVal = Number(parameters?.air_temperature ?? parameters?.airTemperature) || 300
  const procVal = Number(parameters?.process_temperature ?? parameters?.processTemperature) || 310
  const speedVal = Number(parameters?.rotational_speed ?? parameters?.rotationalSpeed) || 1500
  const torqueVal = Number(parameters?.torque) || 40
  const wearVal = Number(parameters?.tool_wear ?? parameters?.toolWear) || 0

  // Normalized to percentage of typical upper safe operating threshold
  const radarData = [
    {
      parameter: 'Air Temp',
      score: Math.min(100, Math.max(10, Math.round(((airVal - 290) / 20) * 100))),
      fullMark: 100,
      reading: `${airVal.toFixed(1)} K`,
    },
    {
      parameter: 'Proc Temp',
      score: Math.min(100, Math.max(10, Math.round(((procVal - 300) / 20) * 100))),
      fullMark: 100,
      reading: `${procVal.toFixed(1)} K`,
    },
    {
      parameter: 'Spindle RPM',
      score: Math.min(100, Math.max(10, Math.round((speedVal / 2800) * 100))),
      fullMark: 100,
      reading: `${speedVal.toFixed(0)} RPM`,
    },
    {
      parameter: 'Torque',
      score: Math.min(100, Math.max(10, Math.round((torqueVal / 80) * 100))),
      fullMark: 100,
      reading: `${torqueVal.toFixed(1)} Nm`,
    },
    {
      parameter: 'Tool Wear',
      score: Math.min(100, Math.max(10, Math.round((wearVal / 240) * 100))),
      fullMark: 100,
      reading: `${wearVal.toFixed(0)} min`,
    },
  ]

  return (
    <div className="prediction-results-container">
      {/* Top Navigation */}
      <div className="pred-top-nav">
        <Link to="/analysis" className="btn-back-link">
          <ArrowLeft size={16} />
          <span>Back to Machine Analysis</span>
        </Link>
      </div>

      {/* Backend Integration Banner */}
      <div className="form-banner banner-info" role="status" style={{ marginBottom: '1.25rem' }}>
        <CheckCircle2 size={20} className="banner-icon" style={{ color: '#0284c7' }} />
        <div>
          <strong>SmartMaintainAI Inference Engine:</strong> Model predictions generated directly by your trained
          Random Forest Classifier (`machine_failure_model.pkl`) via the Flask REST API.
        </div>
      </div>

      {/* Prediction Header Card */}
      <div className="pred-header-card">
        <div className="pred-header-left">
          <div className="pred-header-icon" style={{ backgroundColor: isFailure ? '#fee2e2' : '#e0f2fe', color: isFailure ? '#dc2626' : '#0284c7' }}>
            <Activity size={28} />
          </div>
          <div className="pred-header-text">
            <h1>Predictive Maintenance Diagnostics</h1>
            <div className="pred-header-meta">
              <span>Target Machine:</span>
              <span className="pred-id-badge">{predictionId || 'Active Analysis'}</span>
              {machine?.name && <span>— {machine.name}</span>}
            </div>
          </div>
        </div>

        <Link to="/analysis" className="btn-secondary">
          <Sliders size={15} style={{ marginRight: '0.4rem' }} />
          Adjust Input Parameters
        </Link>
      </div>

      {result ? (
        <>
          {/* Main Status Callout (Live Prediction State) */}
          <div
            className="pred-status-card"
            style={{
              borderColor: isFailure ? '#fca5a5' : '#86efac',
              backgroundColor: isFailure ? '#fff5f5' : '#f8fdf9',
            }}
          >
            <div
              className="pred-status-icon-wrap"
              style={{
                backgroundColor: isFailure ? '#fee2e2' : '#dcfce7',
                color: isFailure ? '#dc2626' : '#16a34a',
              }}
            >
              {isFailure ? <AlertTriangle size={32} /> : <CheckCircle2 size={32} />}
            </div>

            <div
              className="pred-state-pill"
              style={{
                backgroundColor: isFailure ? '#fecaca' : '#bbf7d0',
                color: isFailure ? '#991b1b' : '#14532d',
              }}
            >
              <span
                className="status-dot-sm"
                style={{ backgroundColor: isFailure ? '#dc2626' : '#16a34a' }}
              />
              <span>
                {isFailure ? '⚠️ High Risk: Machine Failure Predicted' : '✅ Optimal: No Failure Predicted'}
              </span>
            </div>

            <h2 className="pred-status-main-title" style={{ color: isFailure ? '#991b1b' : '#0f172a' }}>
              {isFailure
                ? 'Elevated failure probability detected across milling operational parameters.'
                : 'All operating conditions fall within safe manufacturing thresholds.'}
            </h2>

            <p className="pred-status-main-desc">
              {result.suggestion ||
                (isFailure
                  ? 'Arrange an urgent maintenance inspection. Review the spindle telemetry readings and investigate possible cutting tool or thermal dissipation faults.'
                  : 'Continue routine operational monitoring according to standard maintenance schedules.')}
            </p>
          </div>

          {/* Prediction Output Grid */}
          <div className="pred-results-grid">
            {/* Failure Probability Block */}
            <div className="pred-block-card">
              <div className="pred-block-header">
                <Activity size={16} style={{ color: '#0284c7' }} />
                <span>Model Estimated Failure Probability</span>
              </div>

              <div
                className="pred-placeholder-val"
                style={{
                  fontSize: '2.5rem',
                  fontWeight: 800,
                  color: isFailure ? '#dc2626' : '#16a34a',
                }}
              >
                {failureProb.toFixed(1)}%
              </div>

              {/* Progress bar */}
              <div style={{ width: '100%', height: '8px', backgroundColor: '#e2e8f0', borderRadius: '4px', overflow: 'hidden', marginTop: '0.5rem' }}>
                <div
                  style={{
                    width: `${Math.min(Math.max(failureProb, 2), 100)}%`,
                    height: '100%',
                    backgroundColor: isFailure ? '#dc2626' : '#16a34a',
                    transition: 'width 0.4s ease',
                  }}
                />
              </div>

              <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '0.75rem', lineHeight: 1.5 }}>
                Random Forest probability scoring. Overall model inference confidence is <strong>{confidence.toFixed(1)}%</strong>.
              </div>
            </div>

            {/* Predicted Risk Classification Block */}
            <div className="pred-block-card">
              <div className="pred-block-header">
                <AlertTriangle size={16} style={{ color: isFailure ? '#dc2626' : '#f59e0b' }} />
                <span>Risk Level & Diagnostics Status</span>
              </div>

              <div
                className="pred-placeholder-val"
                style={{
                  fontSize: '2.1rem',
                  fontWeight: 800,
                  color: riskLevel === 'CRITICAL' ? '#dc2626' : (riskLevel === 'WARNING' ? '#d97706' : '#16a34a'),
                }}
              >
                {riskLevel} TIER
              </div>

              <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '0.75rem', lineHeight: 1.5 }}>
                Classification Output: <strong>{result.prediction_label || (isFailure ? 'Failure Predicted' : 'No Failure Predicted')}</strong> (Class ID: {result.prediction}).
              </div>
            </div>
          </div>

          {/* Prediction Visualizations: Gauge & Radar */}
          <div className="pred-viz-grid">
            {/* Semicircular Gauge Card */}
            <div className="viz-chart-card">
              <div className="viz-card-header">
                <h3 className="viz-card-title">
                  <Gauge size={18} style={{ color: isFailure ? '#dc2626' : '#16a34a' }} />
                  <span>Model Failure Probability Gauge</span>
                </h3>
                <p className="viz-card-subtitle">
                  Random Forest binary likelihood score for machine breakdown.
                </p>
              </div>

              <div className="gauge-chart-wrapper">
                <ResponsiveContainer width="100%" height={210}>
                  <PieChart>
                    <Pie
                      data={gaugeData}
                      dataKey="value"
                      startAngle={180}
                      endAngle={0}
                      cx="50%"
                      cy="85%"
                      innerRadius={70}
                      outerRadius={95}
                      stroke="none"
                    >
                      {gaugeData.map((entry, index) => (
                        <Cell key={`gauge-cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>

                <div className="gauge-value-overlay">
                  <div
                    className="gauge-pct-text"
                    style={{ color: isFailure ? '#dc2626' : '#16a34a' }}
                  >
                    {failureProb.toFixed(1)}%
                  </div>
                  <div className="gauge-label-text">
                    {isFailure ? 'Elevated Failure Risk' : 'Safe Operating Zone'}
                  </div>
                </div>
              </div>

              <div style={{ fontSize: '0.78rem', color: '#64748b', textAlign: 'center', marginTop: '0.25rem' }}>
                Note: Failure probability is the model's statistical decision tree ensemble estimate, not an absolute guarantee of breakdown.
              </div>
            </div>

            {/* Parameter Operating Envelope Radar */}
            <div className="viz-chart-card">
              <div className="viz-card-header">
                <h3 className="viz-card-title">
                  <Activity size={18} style={{ color: '#0284c7' }} />
                  <span>Operational Parameter Stress Envelope</span>
                </h3>
                <p className="viz-card-subtitle">
                  Evaluated sensor values relative to nominal capacity limits (100%).
                </p>
              </div>

              <div className="radar-chart-wrapper">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData} cx="50%" cy="50%" outerRadius={78}>
                    <PolarGrid stroke="#e2e8f0" />
                    <PolarAngleAxis dataKey="parameter" tick={{ fontSize: 11, fill: '#475569' }} />
                    <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                    <Tooltip
                      formatter={(val, name, item) => [`${val}% of limit (${item.payload.reading})`, 'Stress Level']}
                      contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '0.8rem' }}
                      itemStyle={{ color: '#f8fafc' }}
                    />
                    <Radar
                      name="Sensor Stress"
                      dataKey="score"
                      stroke={isFailure ? '#ef4444' : '#0ea5e9'}
                      fill={isFailure ? '#ef4444' : '#0ea5e9'}
                      fillOpacity={0.4}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>

              <div style={{ fontSize: '0.78rem', color: '#64748b', textAlign: 'center', marginTop: '0.25rem' }}>
                Stress values normalized to standard AI4I manufacturing thresholds.
              </div>
            </div>
          </div>

          {/* Failure Modes Diagnostics */}
          <div className="pred-block-card" style={{ marginBottom: '1.5rem' }}>
            <div className="pred-block-header">
              <Shield size={16} style={{ color: '#0284c7' }} />
              <span>AI4I Failure Mode Diagnostics Breakdown</span>
            </div>

            <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.75rem', lineHeight: 1.4 }}>
              These diagnostics are physics-based engineering rules derived from the AI4I Milling Dataset standard
              (TWF, HDF, PWF, OSF). They complement the Random Forest ML prediction by pinpointing physical breakdown causes.
            </div>

            <div className="failure-modes-list">
              {diagnostics ? (
                Object.entries(diagnostics).map(([key, item]) => {
                  const isCrit = item.risk === 'CRITICAL'
                  const isWarn = item.risk === 'WARNING'
                  return (
                    <div key={key} className="failure-mode-item" style={{ backgroundColor: isCrit ? '#fef2f2' : '#ffffff' }}>
                      <div style={{ flex: 1 }}>
                        <div>
                          <span className="mode-abbr">{item.code || 'MODE'}</span> — <strong className="mode-name">{item.name}</strong>
                        </div>
                        <div style={{ fontSize: '0.82rem', color: '#475569', marginTop: '0.2rem' }}>
                          Metric: <strong>{item.metric}</strong> (Threshold: {item.threshold})
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.15rem' }}>
                          {item.details}
                        </div>
                      </div>

                      <span
                        className="mode-status-tag"
                        style={{
                          backgroundColor: isCrit ? '#fee2e2' : (isWarn ? '#fef3c7' : '#dcfce7'),
                          color: isCrit ? '#991b1b' : (isWarn ? '#92400e' : '#166534'),
                          border: `1px solid ${isCrit ? '#fca5a5' : (isWarn ? '#fde68a' : '#bbf7d0')}`,
                          fontWeight: 700,
                        }}
                      >
                        {item.risk}
                      </span>
                    </div>
                  )
                })
              ) : (
                defaultFailureCategories.map((cat) => (
                  <div key={cat.code} className="failure-mode-item">
                    <div>
                      <span className="mode-abbr">{cat.code}</span> — <strong className="mode-name">{cat.name}</strong>: {cat.description}
                    </div>
                    <span className="mode-status-tag">Nominal</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Evaluated Parameters Summary Card */}
          <div className="pred-block-card" style={{ marginBottom: '1.5rem' }}>
            <div className="pred-block-header">
              <Sliders size={16} style={{ color: '#0284c7' }} />
              <span>Evaluated Machine Parameters</span>
            </div>

            {parameters ? (
              <div className="overview-kv-grid">
                <div className="kv-item">
                  <span className="kv-label">Quality Variant</span>
                  <span className="kv-val">Variant {parameters.machine_type || parameters.qualityType || 'M'}</span>
                </div>
                <div className="kv-item">
                  <span className="kv-label">Air Temperature</span>
                  <span className="kv-val">{parameters.air_temperature ?? parameters.airTemperature} K</span>
                </div>
                <div className="kv-item">
                  <span className="kv-label">Process Temperature</span>
                  <span className="kv-val">{parameters.process_temperature ?? parameters.processTemperature} K</span>
                </div>
                <div className="kv-item">
                  <span className="kv-label">Rotational Speed</span>
                  <span className="kv-val">{parameters.rotational_speed ?? parameters.rotationalSpeed} RPM</span>
                </div>
                <div className="kv-item">
                  <span className="kv-label">Cutting Torque</span>
                  <span className="kv-val">{parameters.torque} Nm</span>
                </div>
                <div className="kv-item">
                  <span className="kv-label">Tool Wear Time</span>
                  <span className="kv-val">{parameters.tool_wear ?? parameters.toolWear} min</span>
                </div>
              </div>
            ) : (
              <div style={{ fontSize: '0.88rem', color: '#64748b' }}>
                Parameters evaluated from live model query.
              </div>
            )}
          </div>

          {/* Model & Metadata Information */}
          <div className="model-info-card">
            <div className="pred-block-header">
              <Cpu size={16} style={{ color: '#0284c7' }} />
              <span>Model & Execution Metadata</span>
            </div>

            <div className="overview-kv-grid">
              <div className="kv-item">
                <span className="kv-label">Model Pipeline</span>
                <span className="kv-val">RandomForestClassifier (200 Trees)</span>
              </div>

              <div className="kv-item">
                <span className="kv-label">Target Dataset</span>
                <span className="kv-val">AI4I 2020 Milling PdM Standard</span>
              </div>

              <div className="kv-item">
                <span className="kv-label">Execution Environment</span>
                <span className="kv-val">Flask REST API (Port 5000)</span>
              </div>

              <div className="kv-item">
                <span className="kv-label">Feature Vector</span>
                <span className="kv-val">8 Feature Dimensions</span>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="pred-status-card">
          <div className="pred-status-icon-wrap">
            <Clock size={28} />
          </div>

          <div className="pred-state-pill">
            <span className="status-dot-sm" style={{ backgroundColor: '#94a3b8' }} />
            <span>Awaiting Model Inference</span>
          </div>

          <h2 className="pred-status-main-title">
            No live prediction result loaded for reference "{predictionId}".
          </h2>

          <p className="pred-status-main-desc">
            Please run an analysis from the Machine Telemetry page to evaluate operating parameters and view real-time diagnostics.
          </p>

          <Link to="/analysis" className="btn-primary-action" style={{ marginTop: '1rem', display: 'inline-flex' }}>
            <span>Go to Machine Analysis</span>
          </Link>
        </div>
      )}
    </div>
  )
}

export default PredictionDetail
