import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Activity,
  Cpu,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  RotateCcw,
  Info,
  ArrowRight,
  Sliders,
} from 'lucide-react'
import axiosClient from '../api/axiosClient'
import './Analysis.css'

const DEFAULT_PARAMS = {
  qualityType: 'M',
  airTemperature: '300.0',
  processTemperature: '310.0',
  rotationalSpeed: '1500',
  torque: '40.0',
  toolWear: '50',
}

export const Analysis = () => {
  const navigate = useNavigate()

  // Read genuine user-registered machines
  const [fleet, setFleet] = useState([])
  const [selectedMachineId, setSelectedMachineId] = useState('')

  // Form input states
  const [params, setParams] = useState(DEFAULT_PARAMS)
  const [errors, setErrors] = useState({})
  const [analysisNotice, setAnalysisNotice] = useState(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  // Fetch real machines from Flask API, falling back to local cache
  useEffect(() => {
    let isMounted = true

    const fetchFleet = async () => {
      try {
        const response = await axiosClient.get('/api/machines')
        if (!isMounted) return
        const machines = response.data?.machines || []
        if (machines.length > 0) {
          setFleet(machines)
          const first = machines[0]
          const mId = String(first.machineId || first.id)
          setSelectedMachineId(mId)
          setParams({
            qualityType: (first.qualityType || first.machine_type || 'M').toUpperCase(),
            airTemperature: String(first.air_temperature ?? first.airTemperature ?? '300.0'),
            processTemperature: String(first.process_temperature ?? first.processTemperature ?? '310.0'),
            rotationalSpeed: String(first.rotational_speed ?? first.rotationalSpeed ?? '1500'),
            torque: String(first.torque ?? '40.0'),
            toolWear: String(first.tool_wear ?? first.toolWear ?? '50'),
          })
          return
        }
      } catch (err) {
        console.warn('Could not fetch machines for analysis, using cache:', err)
      }

      try {
        const stored = localStorage.getItem('cncguard_machines')
        const parsed = stored ? JSON.parse(stored) : []
        if (isMounted) {
          setFleet(parsed)
          if (parsed.length > 0) {
            const first = parsed[0]
            const mId = String(first.machineId || first.id)
            setSelectedMachineId(mId)
            setParams({
              qualityType: (first.qualityType || first.machine_type || 'M').toUpperCase(),
              airTemperature: String(first.air_temperature ?? first.airTemperature ?? '300.0'),
              processTemperature: String(first.process_temperature ?? first.processTemperature ?? '310.0'),
              rotationalSpeed: String(first.rotational_speed ?? first.rotationalSpeed ?? '1500'),
              torque: String(first.torque ?? '40.0'),
              toolWear: String(first.tool_wear ?? first.toolWear ?? '50'),
            })
          }
        }
      } catch {
        if (isMounted) setFleet([])
      }
    }

    fetchFleet()

    return () => {
      isMounted = false
    }
  }, [])

  // When operator switches machine selection
  const handleMachineSelect = (e) => {
    const chosenId = e.target.value
    setSelectedMachineId(chosenId)
    setAnalysisNotice(null)
    setErrors({})

    if (chosenId === '') {
      // Manual entry mode
      return
    }

    const machine = fleet.find((m) => String(m.machineId || m.id) === String(chosenId))
    if (machine) {
      setParams({
        qualityType: (machine.qualityType || machine.machine_type || 'M').toUpperCase(),
        airTemperature: String(machine.air_temperature ?? machine.airTemperature ?? '300.0'),
        processTemperature: String(machine.process_temperature ?? machine.processTemperature ?? '310.0'),
        rotationalSpeed: String(machine.rotational_speed ?? machine.rotationalSpeed ?? '1500'),
        torque: String(machine.torque ?? '40.0'),
        toolWear: String(machine.tool_wear ?? machine.toolWear ?? '50'),
      })
    }
  }

  const handleFieldChange = (field) => (e) => {
    setParams((prev) => ({ ...prev, [field]: e.target.value }))
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }))
    }
    if (analysisNotice) setAnalysisNotice(null)
  }

  const validateParams = () => {
    const errs = {}

    if (!['L', 'M', 'H'].includes(params.qualityType)) {
      errs.qualityType = 'Machine quality type must be L, M, or H.'
    }

    const air = parseFloat(params.airTemperature)
    if (params.airTemperature === '' || isNaN(air)) {
      errs.airTemperature = 'Air temperature is required.'
    } else if (air <= 0) {
      errs.airTemperature = 'Air temperature must be positive (Kelvin [K]).'
    }

    const proc = parseFloat(params.processTemperature)
    if (params.processTemperature === '' || isNaN(proc)) {
      errs.processTemperature = 'Process temperature is required.'
    } else if (proc <= 0) {
      errs.processTemperature = 'Process temperature must be positive (Kelvin [K]).'
    } else if (!isNaN(air) && proc < air) {
      errs.processTemperature = 'Process temperature must be greater than or equal to air temperature.'
    }

    const speed = parseFloat(params.rotationalSpeed)
    if (params.rotationalSpeed === '' || isNaN(speed)) {
      errs.rotationalSpeed = 'Rotational speed is required.'
    } else if (speed <= 0) {
      errs.rotationalSpeed = 'Rotational speed must be greater than 0 RPM.'
    }

    const torqueVal = parseFloat(params.torque)
    if (params.torque === '' || isNaN(torqueVal)) {
      errs.torque = 'Torque is required.'
    } else if (torqueVal < 0) {
      errs.torque = 'Torque cannot be negative.'
    }

    const wear = parseFloat(params.toolWear)
    if (params.toolWear === '' || isNaN(wear)) {
      errs.toolWear = 'Tool wear is required.'
    } else if (wear < 0) {
      errs.toolWear = 'Tool wear cannot be negative.'
    }

    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleAnalyze = async (e) => {
    e.preventDefault()

    if (!validateParams()) {
      setAnalysisNotice({
        type: 'error',
        message: 'Please resolve the highlighted parameter errors before running analysis.',
      })
      return
    }

    setIsAnalyzing(true)
    setAnalysisNotice(null)

    try {
      const payload = {
        machine_type: params.qualityType,
        air_temperature: parseFloat(params.airTemperature),
        process_temperature: parseFloat(params.processTemperature),
        rotational_speed: parseFloat(params.rotationalSpeed),
        torque: parseFloat(params.torque),
        tool_wear: parseFloat(params.toolWear),
      }

      const response = await axiosClient.post('/api/predict', payload)
      const result = response.data

      const targetRef = selectedMachineId || 'manual-input'
      const machineName = selectedMachineObj?.machine_name || selectedMachineObj?.name || 'Manual Analysis Input'

      // Save to localStorage as last prediction for PredictionDetail inspection
      try {
        const predictionRecord = {
          id: `PRED-${Date.now().toString().slice(-6)}`,
          targetRef,
          machineId: targetRef,
          machineName,
          date: new Date().toISOString(),
          parameters: payload,
          result,
        }
        localStorage.setItem('cncguard_last_prediction', JSON.stringify(predictionRecord))

        // Also append to cncguard_reports for Reports History
        const existingReports = JSON.parse(localStorage.getItem('cncguard_reports') || '[]')
        existingReports.unshift({
          id: predictionRecord.id,
          machineId: targetRef,
          machineName,
          date: predictionRecord.date,
          summary: `${result.prediction_label} (${Number(result.failure_probability).toFixed(1)}% prob - ${result.risk_level})`,
          result,
        })
        localStorage.setItem('cncguard_reports', JSON.stringify(existingReports.slice(0, 50)))
      } catch (storageErr) {
        console.warn('Could not cache prediction record:', storageErr)
      }

      setAnalysisNotice({
        type: 'success',
        message: `Prediction Complete: ${result.prediction_label} (${Number(result.failure_probability).toFixed(1)}% failure probability).`,
        note: result.suggestion,
        targetRef,
        result,
      })

      // Navigate to Prediction Detail page with state
      navigate(`/predictions/${targetRef}`, {
        state: {
          predictionResult: result,
          machine: selectedMachineObj,
          parameters: payload,
          targetRef,
        },
      })
    } catch (err) {
      console.error('Inference error:', err)
      const errorMsg = err.normalizedMessage || err.response?.data?.error || 'Failed to execute model prediction.'
      setAnalysisNotice({
        type: 'error',
        message: errorMsg,
        note: err.response
          ? `Server returned HTTP ${err.response.status}: ${err.response.data?.error || err.response.statusText || 'Inference rejection'}`
          : 'Unable to reach the Flask service. Please verify the backend is running at http://127.0.0.1:5000.',
      })
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleReset = () => {
    setParams(DEFAULT_PARAMS)
    setSelectedMachineId('')
    setErrors({})
    setAnalysisNotice(null)
  }

  const selectedMachineObj = fleet.find((m) => String(m.machineId || m.id) === String(selectedMachineId))

  return (
    <div className="analysis-container">
      {/* Page Header */}
      <div className="analysis-header-row">
        <div className="analysis-header-text">
          <h1>Machine Telemetry & AI Analysis</h1>
          <p>Configure operational milling parameters and evaluate failure probability using confirmed ML model features.</p>
        </div>
      </div>

      {/* Backend Status Notice */}
      <div className="form-banner banner-info" role="status">
        <CheckCircle2 size={20} className="banner-icon" style={{ color: '#0284c7' }} />
        <div>
          <strong>SmartMaintainAI Active:</strong> Live prediction endpoint (`POST /api/predict`) is connected to your trained Random Forest classifier.
          Evaluates all 6 machine operating parameters in real time.
        </div>
      </div>

      {/* Analysis Feedback Banner */}
      {analysisNotice && (
        <div
          className={`form-banner ${
            analysisNotice.type === 'success' ? 'banner-success' : 'banner-error'
          }`}
          role="alert"
        >
          {analysisNotice.type === 'success' ? (
            <CheckCircle2 size={20} className="banner-icon" />
          ) : (
            <AlertCircle size={20} className="banner-icon" />
          )}
          <div style={{ flex: 1 }}>
            <strong>{analysisNotice.message}</strong>
            {analysisNotice.note && (
              <div style={{ marginTop: '0.35rem' }}>{analysisNotice.note}</div>
            )}
            {analysisNotice.type === 'success' && (
              <div style={{ marginTop: '0.75rem' }}>
                <Link
                  to={`/predictions/${analysisNotice.targetRef}`}
                  state={{
                    predictionResult: analysisNotice.result,
                    machine: selectedMachineObj,
                    parameters: params,
                    targetRef: analysisNotice.targetRef,
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    fontWeight: 600,
                    color: '#0284c7',
                    textDecoration: 'underline',
                  }}
                >
                  <span>View Diagnostic Breakdown & Risk Indicators</span>
                  <ArrowRight size={14} />
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Machine Selection Section */}
      <div className="selector-card">
        <div className="selector-header">
          <h2 className="selector-title">
            <Cpu size={18} style={{ color: '#0284c7' }} />
            <span>Target Machine Selection</span>
          </h2>
          <span className="selector-subtitle">
            {fleet.length > 0
              ? `${fleet.length} registered machine(s) available`
              : '0 registered machines in fleet'}
          </span>
        </div>

        {fleet.length === 0 ? (
          <div
            style={{
              padding: '1rem',
              backgroundColor: '#fffbeb',
              border: '1px solid #fde68a',
              borderRadius: '8px',
              color: '#92400e',
              fontSize: '0.88rem',
            }}
          >
            <strong>No registered machines found in your fleet.</strong> You can input parameters manually below, or{' '}
            <Link to="/machines/add" style={{ color: '#0284c7', fontWeight: 600 }}>
              register a milling machine in My Machines
            </Link>.
          </div>
        ) : (
          <div>
            <select
              className="machine-select-dropdown"
              value={selectedMachineId}
              onChange={handleMachineSelect}
              aria-label="Select machine for analysis"
            >
              <option value="">— Manual Parameter Entry (No machine preselected) —</option>
              {fleet.map((m) => {
                const mId = m.machineId || m.id
                const mName = m.machine_name || m.name || `Machine #${mId}`
                const qType = m.machine_type || m.qualityType || 'M'
                return (
                  <option key={mId} value={mId}>
                    [{mId}] {mName} — {m.location || 'Shop Floor'} (Variant {qType})
                  </option>
                )
              })}
            </select>

            {selectedMachineObj && (
              <div className="selected-machine-pill-info">
                <CheckCircle2 size={15} />
                <span>
                  Pre-populated baseline parameters from <strong>{selectedMachineObj.machine_name || selectedMachineObj.name}</strong> ({selectedMachineId}). You may tweak values for scenario analysis.
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Analysis Form Card */}
      <div className="analysis-form-card">
        <form onSubmit={handleAnalyze} noValidate>
          <h2 className="analysis-section-title">ML Input Parameters</h2>
          <p className="analysis-section-desc">
            The six confirmed predictive maintenance features for CNC milling diagnostics
          </p>

          <div className="analysis-grid-3">
            {/* Machine Quality Type */}
            <div className="form-group-item">
              <label htmlFor="param-quality" className="form-label-row">
                <span>Machine Quality Type<span className="required-star">*</span></span>
              </label>
              <select
                id="param-quality"
                className={`form-control-select ${errors.qualityType ? 'input-error' : ''}`}
                value={params.qualityType}
                onChange={handleFieldChange('qualityType')}
              >
                <option value="L">L — Low Variant (High Speed)</option>
                <option value="M">M — Medium Variant (Standard)</option>
                <option value="H">H — High Variant (Heavy Precision)</option>
              </select>
              {errors.qualityType && (
                <span className="field-error-msg">
                  <AlertCircle size={13} /> {errors.qualityType}
                </span>
              )}
            </div>

            {/* Air Temperature */}
            <div className="form-group-item">
              <label htmlFor="param-air" className="form-label-row">
                <span>Air Temperature<span className="required-star">*</span></span>
              </label>
              <div className="input-with-unit">
                <input
                  id="param-air"
                  type="number"
                  step="0.1"
                  className={`form-control-input ${errors.airTemperature ? 'input-error' : ''}`}
                  placeholder="300.0"
                  value={params.airTemperature}
                  onChange={handleFieldChange('airTemperature')}
                />
                <span className="unit-addon">Kelvin [K]</span>
              </div>
              {errors.airTemperature && (
                <span className="field-error-msg">
                  <AlertCircle size={13} /> {errors.airTemperature}
                </span>
              )}
            </div>

            {/* Process Temperature */}
            <div className="form-group-item">
              <label htmlFor="param-proc" className="form-label-row">
                <span>Process Temperature<span className="required-star">*</span></span>
              </label>
              <div className="input-with-unit">
                <input
                  id="param-proc"
                  type="number"
                  step="0.1"
                  className={`form-control-input ${errors.processTemperature ? 'input-error' : ''}`}
                  placeholder="310.0"
                  value={params.processTemperature}
                  onChange={handleFieldChange('processTemperature')}
                />
                <span className="unit-addon">Kelvin [K]</span>
              </div>
              {errors.processTemperature && (
                <span className="field-error-msg">
                  <AlertCircle size={13} /> {errors.processTemperature}
                </span>
              )}
            </div>

            {/* Rotational Speed */}
            <div className="form-group-item">
              <label htmlFor="param-speed" className="form-label-row">
                <span>Rotational Speed<span className="required-star">*</span></span>
              </label>
              <div className="input-with-unit">
                <input
                  id="param-speed"
                  type="number"
                  step="1"
                  className={`form-control-input ${errors.rotationalSpeed ? 'input-error' : ''}`}
                  placeholder="1500"
                  value={params.rotationalSpeed}
                  onChange={handleFieldChange('rotationalSpeed')}
                />
                <span className="unit-addon">RPM</span>
              </div>
              {errors.rotationalSpeed && (
                <span className="field-error-msg">
                  <AlertCircle size={13} /> {errors.rotationalSpeed}
                </span>
              )}
            </div>

            {/* Torque */}
            <div className="form-group-item">
              <label htmlFor="param-torque" className="form-label-row">
                <span>Torque<span className="required-star">*</span></span>
              </label>
              <div className="input-with-unit">
                <input
                  id="param-torque"
                  type="number"
                  step="0.1"
                  className={`form-control-input ${errors.torque ? 'input-error' : ''}`}
                  placeholder="40.0"
                  value={params.torque}
                  onChange={handleFieldChange('torque')}
                />
                <span className="unit-addon">Nm</span>
              </div>
              {errors.torque && (
                <span className="field-error-msg">
                  <AlertCircle size={13} /> {errors.torque}
                </span>
              )}
            </div>

            {/* Tool Wear */}
            <div className="form-group-item">
              <label htmlFor="param-wear" className="form-label-row">
                <span>Tool Wear<span className="required-star">*</span></span>
              </label>
              <div className="input-with-unit">
                <input
                  id="param-wear"
                  type="number"
                  step="1"
                  className={`form-control-input ${errors.toolWear ? 'input-error' : ''}`}
                  placeholder="50"
                  value={params.toolWear}
                  onChange={handleFieldChange('toolWear')}
                />
                <span className="unit-addon">Minutes</span>
              </div>
              {errors.toolWear && (
                <span className="field-error-msg">
                  <AlertCircle size={13} /> {errors.toolWear}
                </span>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="analysis-actions-bar">
            <button
              type="button"
              className="btn-secondary"
              onClick={handleReset}
              disabled={isAnalyzing}
            >
              <RotateCcw size={15} style={{ marginRight: '0.4rem' }} />
              Reset Parameters
            </button>

            <button
              type="submit"
              className="btn-analyze-primary"
              disabled={isAnalyzing}
            >
              {isAnalyzing ? (
                <span>Running AI Inference...</span>
              ) : (
                <>
                  <Activity size={17} />
                  <span>Run Predictive Analysis</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default Analysis
