import React, { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Cpu,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Info,
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import './Login.css'

export const Login = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, login, logout, isAuthenticated, loading, authError, clearAuthError, isFirebaseConfigured } = useAuth()

  // Form states
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)

  // Validation & UI states
  const [fieldErrors, setFieldErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [infoModalOpen, setInfoModalOpen] = useState(false)

  // Redirect if user was routed here from a protected page and is already authenticated
  useEffect(() => {
    if (!loading && isAuthenticated && location.state?.from?.pathname) {
      navigate(location.state.from.pathname, { replace: true })
    }
  }, [isAuthenticated, loading, navigate, location])

  // Clear errors when user modifies input
  const handleEmailChange = (e) => {
    setEmail(e.target.value)
    if (fieldErrors.email) {
      setFieldErrors((prev) => ({ ...prev, email: '' }))
    }
    if (errorMessage) setErrorMessage('')
    if (authError) clearAuthError()
  }

  const handlePasswordChange = (e) => {
    setPassword(e.target.value)
    if (fieldErrors.password) {
      setFieldErrors((prev) => ({ ...prev, password: '' }))
    }
    if (errorMessage) setErrorMessage('')
    if (authError) clearAuthError()
  }

  // Client-side validation
  const validateForm = () => {
    const errors = {}
    const trimmedEmail = email.trim()

    if (!trimmedEmail) {
      errors.email = 'Username or email address is required.'
    }

    if (!password) {
      errors.password = 'Password is required.'
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
      await login(email.trim(), password)
      const destination = location.state?.from?.pathname || '/dashboard'
      navigate(destination, { replace: true })
    } catch (err) {
      // Readable error message handled in AuthContext/firebase.js
      setErrorMessage(err.message || 'Authentication failed. Please check your credentials.')
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
          <h1 className="auth-title">Operator & Engineer Sign In</h1>
          <p className="auth-subtitle">
            Real-time milling machine telemetry and AI predictive maintenance system
          </p>
        </div>

        {/* Already Authenticated Notice */}
        {isAuthenticated && user && (
          <div className="auth-alert auth-alert-config" style={{ marginBottom: '1.25rem' }}>
            <Info size={18} className="alert-icon" />
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
                  Sign Out to switch account
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

        {/* Forgot Password Modal / Info Note */}
        {infoModalOpen && (
          <div className="auth-alert auth-alert-config" style={{ marginBottom: '1rem' }}>
            <Info size={18} className="alert-icon" />
            <div style={{ flex: 1 }}>
              <strong>Password Reset:</strong> For operator security,
              please contact your system administrator to reset your credentials.
            </div>
            <button
              onClick={() => setInfoModalOpen(false)}
              className="link-button"
              style={{ fontSize: '0.75rem', marginLeft: '0.5rem' }}
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          {/* Email / Username Field */}
          <div className="form-group">
            <label htmlFor="login-email" className="form-label">
              <span>Username or Work Email</span>
            </label>
            <div className="form-input-wrapper">
              <span className="input-icon-left">
                <Mail size={16} />
              </span>
              <input
                id="login-email"
                type="text"
                className={`form-input ${fieldErrors.email ? 'has-error' : ''}`}
                placeholder="e.g. gurjitkaur or operator@plant.com"
                value={email}
                onChange={handleEmailChange}
                disabled={isSubmitting}
                autoComplete="username"
                autoFocus
              />
            </div>
            {fieldErrors.email && (
              <span className="field-error-text">
                <AlertCircle size={13} /> {fieldErrors.email}
              </span>
            )}
          </div>

          {/* Password Field */}
          <div className="form-group">
            <label htmlFor="login-password" className="form-label">
              <span>Password</span>
            </label>
            <div className="form-input-wrapper">
              <span className="input-icon-left">
                <Lock size={16} />
              </span>
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                className={`form-input ${fieldErrors.password ? 'has-error' : ''}`}
                placeholder="••••••••••••"
                value={password}
                onChange={handlePasswordChange}
                disabled={isSubmitting}
                autoComplete="current-password"
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

          {/* Remember Me & Forgot Password Options */}
          <div className="auth-options">
            <label className="checkbox-label">
              <input
                type="checkbox"
                className="checkbox-input"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                disabled={isSubmitting}
              />
              <span>Remember workstation</span>
            </label>

            <button
              type="button"
              className="link-button"
              onClick={() => setInfoModalOpen(true)}
            >
              Forgot password?
            </button>
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
                <span>Authenticating...</span>
              </>
            ) : (
              <>
                <span>Sign In to System</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* Footer / Switch Route */}
        <div className="auth-footer">
          Don't have an operator account?
          <Link to="/register">Create an account / Register</Link>
        </div>
      </div>
    </div>
  )
}

export default Login
