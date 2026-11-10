import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  RotateCcw,
  Save,
  Cpu,
  Info,
} from 'lucide-react'
import axiosClient from '../api/axiosClient'
import { useAuth } from '../hooks/useAuth'
import './AddMachine.css'

const INITIAL_FORM_STATE = {
  // Section A: Machine Information
  name: '',
  machineId: '',
  machineType: 'Vertical Milling Center (VMC)',
  manufacturer: '',
  modelNumber: '',
  installationYear: new Date().getFullYear().toString(),
  location: '',
  description: '',

  // Section B: Machine Configuration (ML-Related Parameters)
  qualityType: 'M',
  airTemperature: '300',
  processTemperature: '310',
  rotationalSpeed: '1500',
  torque: '40',
  toolWear: '0',
}

export const AddMachine = () => {
  const { user } = useAuth()
  const [formData, setFormData] = useState(INITIAL_FORM_STATE)
  const [errors, setErrors] = useState({})
  const [submittedData, setSubmittedData] = useState(null)
  const [submitNotice, setSubmitNotice] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleChange = (field) => (e) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }))
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }))
    }
    if (submitNotice) setSubmitNotice(null)
  }

  const validateForm = () => {
    const errs = {}
    const currentYear = new Date().getFullYear()

    // Section A Validations
    if (!formData.name.trim()) {
      errs.name = 'Machine name is required.'
    }

    if (!formData.machineId.trim()) {
      errs.machineId = 'Machine ID is required.'
    } else if (!/^[A-Za-z0-9-_]+$/.test(formData.machineId.trim())) {
      errs.machineId = 'Machine ID must contain only letters, numbers, hyphens, or underscores.'
    }

    if (!formData.machineType.trim()) {
      errs.machineType = 'Machine type is required.'
    }

    if (!formData.manufacturer.trim()) {
      errs.manufacturer = 'Manufacturer name is required.'
    }

    if (!formData.modelNumber.trim()) {
      errs.modelNumber = 'Model number is required.'
    }

    const yearNum = parseInt(formData.installationYear, 10)
    if (!formData.installationYear || isNaN(yearNum)) {
      errs.installationYear = 'Valid installation year is required.'
    } else if (yearNum < 1980 || yearNum > currentYear + 1) {
      errs.installationYear = `Installation year must be between 1980 and ${currentYear + 1}.`
    }

    if (!formData.location.trim()) {
      errs.location = 'Machine location or bay is required.'
    }

    // Section B Validations (ML-Related Parameters)
    if (!['L', 'M', 'H'].includes(formData.qualityType)) {
      errs.qualityType = 'Machine quality type must be L (Low), M (Medium), or H (High).'
    }

    const airTemp = parseFloat(formData.airTemperature)
    if (formData.airTemperature === '' || isNaN(airTemp)) {
      errs.airTemperature = 'Air temperature is required.'
    } else if (airTemp <= 0) {
      errs.airTemperature = 'Air temperature must be positive (Kelvin [K]).'
    } else if (airTemp < 200 || airTemp > 400) {
      errs.airTemperature = 'Typical industrial air temp ranges between 270K and 350K.'
    }

    const procTemp = parseFloat(formData.processTemperature)
    if (formData.processTemperature === '' || isNaN(procTemp)) {
      errs.processTemperature = 'Process temperature is required.'
    } else if (procTemp <= 0) {
      errs.processTemperature = 'Process temperature must be positive (Kelvin [K]).'
    } else if (procTemp < airTemp) {
      errs.processTemperature = 'Process temperature is usually equal to or higher than air temperature.'
    }

    const speed = parseFloat(formData.rotationalSpeed)
    if (formData.rotationalSpeed === '' || isNaN(speed)) {
      errs.rotationalSpeed = 'Rotational speed is required.'
    } else if (speed <= 0) {
      errs.rotationalSpeed = 'Rotational speed must be greater than 0 RPM.'
    }

    const torqueVal = parseFloat(formData.torque)
    if (formData.torque === '' || isNaN(torqueVal)) {
      errs.torque = 'Torque is required.'
    } else if (torqueVal < 0) {
      errs.torque = 'Torque cannot be negative.'
    }

    const wearVal = parseFloat(formData.toolWear)
    if (formData.toolWear === '' || isNaN(wearVal)) {
      errs.toolWear = 'Tool wear is required.'
    } else if (wearVal < 0) {
      errs.toolWear = 'Tool wear cannot be negative.'
    }

    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!validateForm()) {
      setSubmitNotice({
        type: 'error',
        message: 'Please resolve the highlighted validation errors before saving.',
      })
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    setIsSubmitting(true)
    setSubmitNotice(null)

    try {
      const airTemp = parseFloat(formData.airTemperature)
      const procTemp = parseFloat(formData.processTemperature)
      const rotSpeed = parseFloat(formData.rotationalSpeed)
      const torqueVal = parseFloat(formData.torque)
      const toolWearVal = parseFloat(formData.toolWear)

      const payload = {
        name: formData.name.trim(),
        machine_name: formData.name.trim(),
        machineId: formData.machineId.trim(),
        qualityType: formData.qualityType,
        machine_type: formData.qualityType,
        air_temperature: airTemp,
        airTemperature: airTemp,
        process_temperature: procTemp,
        processTemperature: procTemp,
        rotational_speed: rotSpeed,
        rotationalSpeed: rotSpeed,
        torque: torqueVal,
        tool_wear: toolWearVal,
        toolWear: toolWearVal,
        manufacturer: formData.manufacturer.trim(),
        model_number: formData.modelNumber.trim(),
        modelNumber: formData.modelNumber.trim(),
        location: formData.location.trim(),
        installation_year: parseInt(formData.installationYear, 10),
        installationYear: parseInt(formData.installationYear, 10),
        description: formData.description.trim(),
        owner_id: user?.id,
        user_id: user?.id,
      }

      const response = await axiosClient.post('/api/machines', payload)
      const createdMachine = response.data?.machine || payload

      // Sync local storage cache
      try {
        const existing = JSON.parse(localStorage.getItem('cncguard_machines') || '[]')
        const updated = existing.filter((m) => (m.machineId || m.id) !== createdMachine.id)
        updated.unshift(createdMachine)
        localStorage.setItem('cncguard_machines', JSON.stringify(updated))
      } catch (err) {
        console.warn('Could not update localStorage cache:', err)
      }

      setSubmittedData(formData)
      const isFail = createdMachine.prediction === 1
      setSubmitNotice({
        type: 'success',
        message: `Machine "${formData.name}" (ID: ${createdMachine.id || formData.machineId}) has been registered in the database.`,
        note: `AI Health Evaluation: ${createdMachine.prediction_label || (isFail ? 'Failure Predicted' : 'No Failure Predicted')} (${createdMachine.failure_probability != null ? `${Number(createdMachine.failure_probability).toFixed(1)}% failure probability` : 'Nominal'}).`,
        machineId: createdMachine.id || formData.machineId,
      })
    } catch (err) {
      console.error('Failed to register machine:', err)
      const errorMsg = err.normalizedMessage || err.response?.data?.error || 'Failed to save machine on server.'
      setSubmitNotice({
        type: 'error',
        message: errorMsg,
        note: err.response
          ? `Server returned HTTP ${err.response.status}: ${err.response.data?.error || err.response.statusText}`
          : 'Please verify that you are signed in and the Flask backend is running at http://127.0.0.1:5000.',
      })
    } finally {
      setIsSubmitting(false)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const handleReset = () => {
    if (window.confirm('Are you sure you want to reset all form fields?')) {
      setFormData(INITIAL_FORM_STATE)
      setErrors({})
      setSubmitNotice(null)
      setSubmittedData(null)
    }
  }

  return (
    <div className="add-machine-container">
      {/* Top Header */}
      <div className="page-header-row">
        <div className="page-header-text">
          <h1>Register New CNC Machine</h1>
          <p>Configure milling machine hardware specs and predictive maintenance baseline parameters.</p>
        </div>
        <Link to="/machines" className="btn-back-link">
          <ArrowLeft size={16} />
          <span>Back to Fleet</span>
        </Link>
      </div>

      {/* Backend Status Advisory */}
      <div className="form-banner banner-info" role="status">
        <CheckCircle2 size={20} className="banner-icon" style={{ color: '#0284c7' }} />
        <div>
          <strong>SmartMaintainAI Backend Connected:</strong> Saving this machine persists the configuration to your SQLite database and immediately runs inference via your trained Random Forest model.
        </div>
      </div>

      {/* Submission Feedback Banner */}
      {submitNotice && (
        <div
          className={`form-banner ${submitNotice.type === 'success' ? 'banner-success' : 'banner-error'
            }`}
          role="alert"
        >
          {submitNotice.type === 'success' ? (
            <CheckCircle2 size={20} className="banner-icon" />
          ) : (
            <AlertCircle size={20} className="banner-icon" />
          )}
          <div>
            <strong>{submitNotice.message}</strong>
            {submitNotice.note && <div style={{ marginTop: '0.35rem' }}>{submitNotice.note}</div>}
            {submitNotice.machineId && (
              <div style={{ marginTop: '0.75rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <Link to={`/machines/${submitNotice.machineId}`} style={{ fontWeight: 600, color: '#0284c7', textDecoration: 'underline' }}>
                  View Machine Details ({submitNotice.machineId}) →
                </Link>
                <Link to="/machines" style={{ fontWeight: 600, color: '#475569', textDecoration: 'underline' }}>
                  Return to Fleet Overview →
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Form Card */}
      <div className="machine-form-card">
        <form onSubmit={handleSubmit} noValidate>
          {/* Section A: Machine Information */}
          <div className="form-section">
            <div className="section-header">
              <span className="section-badge">A</span>
              <div>
                <h2 className="section-title">Machine Information</h2>
                <p className="section-desc">Hardware identity, physical facility location, and manufacturer details</p>
              </div>
            </div>

            <div className="form-grid-2">
              {/* Machine Name */}
              <div className="form-group-item">
                <label htmlFor="field-name" className="form-label-row">
                  <span>Machine Name<span className="required-star">*</span></span>
                  <span className="field-hint">e.g. CNC Milling Machine 01</span>
                </label>
                <input
                  id="field-name"
                  type="text"
                  className={`form-control-input ${errors.name ? 'input-error' : ''}`}
                  placeholder="CNC Milling Machine 01"
                  value={formData.name}
                  onChange={handleChange('name')}
                />
                {errors.name && (
                  <span className="field-error-msg">
                    <AlertCircle size={13} /> {errors.name}
                  </span>
                )}
              </div>

              {/* Machine ID */}
              <div className="form-group-item">
                <label htmlFor="field-machineId" className="form-label-row">
                  <span>Machine ID<span className="required-star">*</span></span>
                  <span className="field-hint">Unique identifier</span>
                </label>
                <input
                  id="field-machineId"
                  type="text"
                  className={`form-control-input ${errors.machineId ? 'input-error' : ''}`}
                  placeholder="CNC-001"
                  value={formData.machineId}
                  onChange={handleChange('machineId')}
                />
                {errors.machineId && (
                  <span className="field-error-msg">
                    <AlertCircle size={13} /> {errors.machineId}
                  </span>
                )}
              </div>

              {/* Machine Type */}
              <div className="form-group-item">
                <label htmlFor="field-machineType" className="form-label-row">
                  <span>Machine Type<span className="required-star">*</span></span>
                </label>
                <select
                  id="field-machineType"
                  className={`form-control-select ${errors.machineType ? 'input-error' : ''}`}
                  value={formData.machineType}
                  onChange={handleChange('machineType')}
                >
                  <option value="Vertical Milling Center (VMC)">Vertical Milling Center (VMC)</option>
                  <option value="Horizontal Milling Center (HMC)">Horizontal Milling Center (HMC)</option>
                  <option value="5-Axis CNC Milling Center">5-Axis CNC Milling Center</option>
                  <option value="Universal CNC Milling Machine">Universal CNC Milling Machine</option>
                  <option value="CNC Gantry Mill">CNC Gantry Mill</option>
                </select>
                {errors.machineType && (
                  <span className="field-error-msg">
                    <AlertCircle size={13} /> {errors.machineType}
                  </span>
                )}
              </div>

              {/* Manufacturer */}
              <div className="form-group-item">
                <label htmlFor="field-manufacturer" className="form-label-row">
                  <span>Manufacturer<span className="required-star">*</span></span>
                  <span className="field-hint">e.g. Haas, Mazak, DMG Mori</span>
                </label>
                <input
                  id="field-manufacturer"
                  type="text"
                  className={`form-control-input ${errors.manufacturer ? 'input-error' : ''}`}
                  placeholder="Haas"
                  value={formData.manufacturer}
                  onChange={handleChange('manufacturer')}
                />
                {errors.manufacturer && (
                  <span className="field-error-msg">
                    <AlertCircle size={13} /> {errors.manufacturer}
                  </span>
                )}
              </div>

              {/* Model Number */}
              <div className="form-group-item">
                <label htmlFor="field-modelNumber" className="form-label-row">
                  <span>Model Number<span className="required-star">*</span></span>
                  <span className="field-hint">e.g. VF-2</span>
                </label>
                <input
                  id="field-modelNumber"
                  type="text"
                  className={`form-control-input ${errors.modelNumber ? 'input-error' : ''}`}
                  placeholder="VF-2"
                  value={formData.modelNumber}
                  onChange={handleChange('modelNumber')}
                />
                {errors.modelNumber && (
                  <span className="field-error-msg">
                    <AlertCircle size={13} /> {errors.modelNumber}
                  </span>
                )}
              </div>

              {/* Installation Year */}
              <div className="form-group-item">
                <label htmlFor="field-installationYear" className="form-label-row">
                  <span>Installation Year<span className="required-star">*</span></span>
                  <span className="field-hint">1980 - present</span>
                </label>
                <input
                  id="field-installationYear"
                  type="number"
                  min="1980"
                  max={new Date().getFullYear() + 1}
                  className={`form-control-input ${errors.installationYear ? 'input-error' : ''}`}
                  placeholder="2024"
                  value={formData.installationYear}
                  onChange={handleChange('installationYear')}
                />
                {errors.installationYear && (
                  <span className="field-error-msg">
                    <AlertCircle size={13} /> {errors.installationYear}
                  </span>
                )}
              </div>

              {/* Location */}
              <div className="form-group-item form-full-width">
                <label htmlFor="field-location" className="form-label-row">
                  <span>Shop Floor Location / Bay<span className="required-star">*</span></span>
                  <span className="field-hint">e.g. Production Hall A - Bay 3</span>
                </label>
                <input
                  id="field-location"
                  type="text"
                  className={`form-control-input ${errors.location ? 'input-error' : ''}`}
                  placeholder="Production Hall A - Bay 3"
                  value={formData.location}
                  onChange={handleChange('location')}
                />
                {errors.location && (
                  <span className="field-error-msg">
                    <AlertCircle size={13} /> {errors.location}
                  </span>
                )}
              </div>

              {/* Description */}
              <div className="form-group-item form-full-width">
                <label htmlFor="field-description" className="form-label-row">
                  <span>Operational Description (Optional)</span>
                </label>
                <textarea
                  id="field-description"
                  rows="3"
                  className="form-control-textarea"
                  placeholder="Primary duty cycle: aluminum facing, high-speed contouring, and titanium roughing..."
                  value={formData.description}
                  onChange={handleChange('description')}
                />
              </div>
            </div>
          </div>

          {/* Section B: Machine Configuration (ML-Related Parameters) */}
          <div className="form-section">
            <div className="section-header">
              <span className="section-badge">B</span>
              <div>
                <h2 className="section-title">Machine Configuration (ML Baseline)</h2>
                <p className="section-desc">Confirmed feature parameters for predictive maintenance inference</p>
              </div>
            </div>

            <div className="form-grid-3">
              {/* Machine Quality Type */}
              <div className="form-group-item">
                <label htmlFor="field-qualityType" className="form-label-row">
                  <span>Machine Quality Type<span className="required-star">*</span></span>
                </label>
                <select
                  id="field-qualityType"
                  className={`form-control-select ${errors.qualityType ? 'input-error' : ''}`}
                  value={formData.qualityType}
                  onChange={handleChange('qualityType')}
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
                <label htmlFor="field-airTemp" className="form-label-row">
                  <span>Air Temperature<span className="required-star">*</span></span>
                </label>
                <div className="input-with-unit">
                  <input
                    id="field-airTemp"
                    type="number"
                    step="0.1"
                    className={`form-control-input ${errors.airTemperature ? 'input-error' : ''}`}
                    placeholder="300"
                    value={formData.airTemperature}
                    onChange={handleChange('airTemperature')}
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
                <label htmlFor="field-procTemp" className="form-label-row">
                  <span>Process Temperature<span className="required-star">*</span></span>
                </label>
                <div className="input-with-unit">
                  <input
                    id="field-procTemp"
                    type="number"
                    step="0.1"
                    className={`form-control-input ${errors.processTemperature ? 'input-error' : ''}`}
                    placeholder="310"
                    value={formData.processTemperature}
                    onChange={handleChange('processTemperature')}
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
                <label htmlFor="field-speed" className="form-label-row">
                  <span>Rotational Speed<span className="required-star">*</span></span>
                </label>
                <div className="input-with-unit">
                  <input
                    id="field-speed"
                    type="number"
                    step="1"
                    className={`form-control-input ${errors.rotationalSpeed ? 'input-error' : ''}`}
                    placeholder="1500"
                    value={formData.rotationalSpeed}
                    onChange={handleChange('rotationalSpeed')}
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
                <label htmlFor="field-torque" className="form-label-row">
                  <span>Torque<span className="required-star">*</span></span>
                </label>
                <div className="input-with-unit">
                  <input
                    id="field-torque"
                    type="number"
                    step="0.1"
                    className={`form-control-input ${errors.torque ? 'input-error' : ''}`}
                    placeholder="40"
                    value={formData.torque}
                    onChange={handleChange('torque')}
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
                <label htmlFor="field-toolWear" className="form-label-row">
                  <span>Tool Wear<span className="required-star">*</span></span>
                </label>
                <div className="input-with-unit">
                  <input
                    id="field-toolWear"
                    type="number"
                    step="1"
                    className={`form-control-input ${errors.toolWear ? 'input-error' : ''}`}
                    placeholder="100"
                    value={formData.toolWear}
                    onChange={handleChange('toolWear')}
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
          </div>

          {/* Form Actions */}
          <div className="form-actions-bar">
            <button
              type="button"
              className="btn-secondary"
              onClick={handleReset}
              title="Reset all fields"
            >
              <RotateCcw size={15} style={{ marginRight: '0.4rem' }} />
              Reset Form
            </button>

            <Link to="/machines" className="btn-secondary">
              Cancel
            </Link>

            <button type="submit" className="btn-primary-action" disabled={isSubmitting}>
              {isSubmitting ? (
                <span>Registering Machine & Scoring...</span>
              ) : (
                <>
                  <Save size={16} />
                  <span>Validate & Register Machine</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AddMachine
