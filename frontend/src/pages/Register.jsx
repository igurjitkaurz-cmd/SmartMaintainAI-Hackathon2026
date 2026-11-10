import React, { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  User,
  Cpu,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import './Register.css'

export const Register = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, signup, logout, isAuthenticated, loading, authError, clearAuthError, isFirebaseConfigured } = useAuth()

  // Form states
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [agreedToTerms, setAgreedToTerms] = useState(false)

  // Validation & UI states
  const [fieldErrors, setFieldErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  // Redirect if user was routed here from a protected page and is already authenticated
  useEffect(() => {
    if (!loading && isAuthenticated && location.state?.from?.pathname) {
      navigate(location.state.from.pathname, { replace: true })
    }
  }, [isAuthenticated, loading, navigate, location])

  // Clear errors on field changes
  const handleFieldChange = (field, setter) => (e) => {
    setter(e.target.value)
    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: '' }))
    }
    if (errorMessage) setErrorMessage('')
    if (authError) clearAuthError()
  }

  // Client-side validation
  const validateForm = () => {
    const errors = {}
    const trimmedName = fullName.trim()
    const trimmedEmail = email.trim()

    if (!trimmedName) {
      errors.fullName = 'Full name is required.'
    } else if (trimmedName.length < 2) {
      errors.fullName = 'Full name must be at least 2 characters.'
    }

    if (!trimmedEmail) {
      errors.email = 'Username or email address is required.'
    }

    if (!password) {
      errors.password = 'Password is required.'
    } else if (password.length < 6) {
      errors.password = 'Password must be at least 6 characters long.'
    }

    if (!confirmPassword) {
      errors.confirmPassword = 'Confirmation password is required.'
    } else if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match.'
    }

    if (!agreedToTerms) {
      errors.terms = 'You must accept the plant safety & data policy to register.'
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrorMessage('')

    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)
    try {
      await signup(email.trim(), password, fullName.trim())
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setErrorMessage(err.message || 'Registration failed. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="auth-viewport">
      <div className="auth-card">
        {/* Header / Branding */}
        <div className="auth-header">
          <div className="auth-brand">
            <div className="auth-brand-icon">
              <Cpu size={22} />
            </div>
            <span className="auth-brand-name">CNCGuard AI</span>
            <span className="auth-brand-tag">Milling PdM</span>
          </div>
          <h1 className="auth-title">Create Machine Operator Account</h1>
          <p className="auth-subtitle">
            Join the predictive maintenance portal to monitor milling health and alerts
          </p>
        </div>

        {/* Already Authenticated Notice */}
        {isAuthenticated && user && (
          <div className="auth-alert auth-alert-config" style={{ marginBottom: '1.25rem' }}>
            <AlertCircle size={18} className="alert-icon" />
            <div style={{ flex: 1, fontSize: '0.85rem' }}>
              Currently signed in as <strong>{user.username || user.email}</strong>.
              <div style={{ marginTop: '0.45rem', display: 'flex', gap: '0.85rem', flexWrap: 'wrap' }}>
                <Link to="/dashboard" style={{ color: '#0284c7', fontWeight: 600, textDecoration: 'underline' }}>
                  Proceed to Dashboard →
                </Link>
                <button
                  type="button"
                  onClick={async () => { await logout() }}
                  className="link-button"
                  style={{ color: '#ef4444', fontWeight: 600, textDecoration: 'underline' }}
                >
                  Sign Out to create new account
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Dynamic Error Banner */}
        {(errorMessage || authError) && (
          <div className="auth-alert auth-alert-error" role="alert">
            <AlertCircle size={18} className="alert-icon" />
            <div>{errorMessage || authError}</div>
          </div>
        )}

        {/* Registration Form */}
        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          {/* Full Name */}
          <div className="form-group">
            <label htmlFor="reg-name" className="form-label">
              <span>Full Name</span>
            </label>
            <div className="form-input-wrapper">
              <span className="input-icon-left">
                <User size={16} />
              </span>
              <input
                id="reg-name"
                type="text"
                className={`form-input ${fieldErrors.fullName ? 'has-error' : ''}`}
                placeholder="Marcus Vance"
                value={fullName}
                onChange={handleFieldChange('fullName', setFullName)}
                disabled={isSubmitting}
                autoComplete="name"
                autoFocus
              />
            </div>
            {fieldErrors.fullName && (
              <span className="field-error-text">
                <AlertCircle size={13} /> {fieldErrors.fullName}
              </span>
            )}
          </div>

          {/* Email / Username Address */}
          <div className="form-group">
            <label htmlFor="reg-email" className="form-label">
              <span>Username or Plant Email</span>
            </label>
            <div className="form-input-wrapper">
              <span className="input-icon-left">
                <Mail size={16} />
              </span>
              <input
                id="reg-email"
                type="text"
                className={`form-input ${fieldErrors.email ? 'has-error' : ''}`}
                placeholder="e.g. operator_john or john@plant.com"
                value={email}
                onChange={handleFieldChange('email', setEmail)}
                disabled={isSubmitting}
                autoComplete="username"
              />
            </div>
            {fieldErrors.email && (
              <span className="field-error-text">
                <AlertCircle size={13} /> {fieldErrors.email}
              </span>
            )}
          </div>

          {/* Password */}
          <div className="form-group">
            <label htmlFor="reg-password" className="form-label">
              <span>Password (min. 6 characters)</span>
            </label>
            <div className="form-input-wrapper">
              <span className="input-icon-left">
                <Lock size={16} />
              </span>
              <input
                id="reg-password"
                type={showPassword ? 'text' : 'password'}
                className={`form-input ${fieldErrors.password ? 'has-error' : ''}`}
                placeholder="••••••••••••"
                value={password}
                onChange={handleFieldChange('password', setPassword)}
                disabled={isSubmitting}
                autoComplete="new-password"
              />
              <button
                type="button"
                className="input-toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {fieldErrors.password && (
              <span className="field-error-text">
                <AlertCircle size={13} /> {fieldErrors.password}
              </span>
            )}
          </div>

          {/* Confirm Password */}
          <div className="form-group">
            <label htmlFor="reg-confirm" className="form-label">
              <span>Confirm Password</span>
            </label>
            <div className="form-input-wrapper">
              <span className="input-icon-left">
                <Lock size={16} />
              </span>
              <input
                id="reg-confirm"
                type={showConfirmPassword ? 'text' : 'password'}
                className={`form-input ${fieldErrors.confirmPassword ? 'has-error' : ''}`}
                placeholder="••••••••••••"
                value={confirmPassword}
                onChange={handleFieldChange('confirmPassword', setConfirmPassword)}
                disabled={isSubmitting}
                autoComplete="new-password"
              />
              <button
                type="button"
                className="input-toggle-btn"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label={showConfirmPassword ? 'Hide confirmation password' : 'Show confirmation password'}
                tabIndex={-1}
              >
                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {fieldErrors.confirmPassword && (
              <span className="field-error-text">
                <AlertCircle size={13} /> {fieldErrors.confirmPassword}
              </span>
            )}
          </div>

          {/* Terms & Conditions Checkbox */}
          <div className="form-group">
            <label className="checkbox-label" style={{ alignItems: 'flex-start' }}>
              <input
                type="checkbox"
                className="checkbox-input"
                style={{ marginTop: '0.2rem' }}
                checked={agreedToTerms}
                onChange={(e) => {
                  setAgreedToTerms(e.target.checked)
                  if (fieldErrors.terms) {
                    setFieldErrors((prev) => ({ ...prev, terms: '' }))
                  }
                }}
                disabled={isSubmitting}
              />
              <span className="terms-text">
                I accept the CNC operational safety protocols and acknowledge data logging of machine
                telemetry actions.
              </span>
            </label>
            {fieldErrors.terms && (
              <span className="field-error-text" style={{ marginLeft: '1.6rem' }}>
                <AlertCircle size={13} /> {fieldErrors.terms}
              </span>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="btn-auth-submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <span className="btn-spinner" />
                <span>Creating Account...</span>
              </>
            ) : (
              <>
                <ShieldCheck size={17} />
                <span>Create Operator Account</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* Footer / Switch Route */}
        <div className="auth-footer">
          Already registered?
          <Link to="/login">Sign in here</Link>
        </div>
      </div>
    </div>
  )
}

export default Register
