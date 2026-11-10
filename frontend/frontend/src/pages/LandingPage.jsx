import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Cpu,
  Activity,
  Shield,
  Gauge,
  BarChart3,
  Server,
  Database,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Sliders,
  Layers,
  Wrench,
  Clock,
  Sparkles,
  Terminal,
  LogIn,
  UserPlus,
  LogOut,
  User,
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import './LandingPage.css'

export const LandingPage = () => {
  const { user, logout } = useAuth()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      await logout()
    } catch (err) {
      console.warn('Logout error:', err)
    } finally {
      setIsLoggingOut(false)
    }
  }

  return (
    <div className="landing-page-root">
      {/* Top Navigation */}
      <nav className="landing-nav">
        <div className="landing-nav-inner">
          <Link to="/" className="landing-brand">
            <div className="landing-brand-icon">
              <Cpu size={22} />
            </div>
            <div>
              <span className="landing-brand-title">SmartMaintainAI</span>
            </div>
            <span className="landing-brand-badge">ML Core v2.0</span>
          </Link>

          <div className="landing-nav-links">
            <a href="#features" className="landing-nav-link">Capabilities</a>
            <a href="#how-it-works" className="landing-nav-link">How It Works</a>
            <a href="#architecture" className="landing-nav-link">ML Architecture</a>
            <a href="#preview" className="landing-nav-link">Live Telemetry</a>
          </div>

          <div className="landing-nav-actions">
            {user ? (
              <>
                <div className="landing-user-pill" title={`Signed in as ${user.username || user.email || 'Operator'}`}>
                  <span className="user-status-dot" />
                  <span className="landing-user-name">{user.username || user.email || 'Operator'}</span>
                </div>

                <Link to="/login" className="btn-landing-secondary" title="Sign in with another account">
                  <LogIn size={15} />
                  <span>Sign In</span>
                </Link>

                <Link to="/dashboard" className="btn-landing-primary">
                  <span>Open Dashboard</span>
                  <ArrowRight size={15} />
                </Link>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="btn-landing-logout"
                  disabled={isLoggingOut}
                  title="Sign out of current account"
                >
                  <LogOut size={14} />
                  <span>{isLoggingOut ? 'Signing out...' : 'Sign Out'}</span>
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn-landing-secondary">
                  <LogIn size={15} />
                  <span>Sign In</span>
                </Link>

                <Link to="/register" className="btn-landing-outline">
                  <UserPlus size={15} />
                  <span>Create Account</span>
                </Link>

                <Link to="/dashboard" className="btn-landing-primary">
                  <span>Open Dashboard</span>
                  <ArrowRight size={15} />
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-container">
          <div className="hero-pill-badge">
            <Sparkles size={14} />
            <span>AI Predictive Maintenance for Industry 4.0</span>
          </div>

          <h1 className="hero-title">
            Anticipate Machine Failures <br />
            <span className="hero-gradient-text">Before Production Downtime Occurs</span>
          </h1>

          <p className="hero-subtitle">
            SmartMaintainAI integrates high-frequency CNC milling telemetry with a 200-tree Random Forest
            machine learning classifier. Evaluate thermodynamic stress, rotational resistance, and tool wear
            in real-time to schedule maintenance proactively.
          </p>

          <div className="hero-cta-group">
            <Link to={user ? "/dashboard" : "/login"} className="hero-cta-primary">
              <span>{user ? "Go to Control Center" : "Launch SmartMaintainAI"}</span>
              <ArrowRight size={17} />
            </Link>

            <Link to="/analysis" className="hero-cta-secondary">
              <Sliders size={17} />
              <span>Try Machine Analysis</span>
            </Link>
          </div>

          {!user ? (
            <div className="hero-auth-hint">
              <span>Already registered? </span>
              <Link to="/login" className="hero-auth-link">Sign In to Account</Link>
              <span className="hero-auth-dot">•</span>
              <span>New operator? </span>
              <Link to="/register" className="hero-auth-link">Create Account / Register</Link>
            </div>
          ) : (
            <div className="hero-auth-hint">
              <span>Signed in as <strong>{user.username || user.email}</strong></span>
              <span className="hero-auth-dot">•</span>
              <Link to="/dashboard" className="hero-auth-link">Open Dashboard Fleet</Link>
              <span className="hero-auth-dot">•</span>
              <button type="button" onClick={handleLogout} className="hero-auth-btn-link">Sign Out</button>
            </div>
          )}

          {/* Hero Technical Specifications Bar */}
          <div className="hero-stats-grid">
            <div className="hero-stat-card">
              <div className="hero-stat-number">200</div>
              <div className="hero-stat-label">Random Forest Trees</div>
            </div>

            <div className="hero-stat-card">
              <div className="hero-stat-number">8-Dim</div>
              <div className="hero-stat-label">Evaluated Sensor Features</div>
            </div>

            <div className="hero-stat-card">
              <div className="hero-stat-number">4 Modes</div>
              <div className="hero-stat-label">AI4I Physics Diagnostics</div>
            </div>

            <div className="hero-stat-card">
              <div className="hero-stat-number">&lt; 10ms</div>
              <div className="hero-stat-label">Flask Inference Latency</div>
            </div>
          </div>

          {/* Live Interactive Telemetry Preview */}
          <div id="preview" className="hero-preview-section">
            <div className="preview-browser-frame">
              <div className="preview-browser-header">
                <span className="dot-red" />
                <span className="dot-yellow" />
                <span className="dot-green" />
                <div className="preview-address-bar">
                  https://smartmaintain.ai/api/predict — Random Forest Inference
                </div>
              </div>

              <div className="preview-content-grid">
                {/* Left Preview: Parameters */}
                <div className="preview-card-dark">
                  <div className="preview-card-header">
                    <div className="preview-card-title">
                      <Sliders size={16} style={{ color: '#38bdf8' }} />
                      <span>Live Telemetry Vector</span>
                    </div>
                    <span className="preview-badge-green">AI4I Mill #104</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem', fontSize: '0.85rem' }}>
                    <div>
                      <div style={{ color: '#64748b', fontSize: '0.72rem', textTransform: 'uppercase' }}>Air Temperature</div>
                      <div style={{ color: '#f8fafc', fontWeight: 700 }}>298.1 K (25.0°C)</div>
                    </div>
                    <div>
                      <div style={{ color: '#64748b', fontSize: '0.72rem', textTransform: 'uppercase' }}>Process Temp</div>
                      <div style={{ color: '#f8fafc', fontWeight: 700 }}>308.6 K (35.5°C)</div>
                    </div>
                    <div>
                      <div style={{ color: '#64748b', fontSize: '0.72rem', textTransform: 'uppercase' }}>Spindle Speed</div>
                      <div style={{ color: '#38bdf8', fontWeight: 700 }}>1,551 RPM</div>
                    </div>
                    <div>
                      <div style={{ color: '#64748b', fontSize: '0.72rem', textTransform: 'uppercase' }}>Cutting Torque</div>
                      <div style={{ color: '#38bdf8', fontWeight: 700 }}>42.8 Nm</div>
                    </div>
                    <div>
                      <div style={{ color: '#64748b', fontSize: '0.72rem', textTransform: 'uppercase' }}>Tool Wear Time</div>
                      <div style={{ color: '#f59e0b', fontWeight: 700 }}>112 minutes</div>
                    </div>
                    <div>
                      <div style={{ color: '#64748b', fontSize: '0.72rem', textTransform: 'uppercase' }}>Quality Variant</div>
                      <div style={{ color: '#a855f7', fontWeight: 700 }}>Type M (Medium)</div>
                    </div>
                  </div>
                </div>

                {/* Right Preview: ML Outcome */}
                <div className="preview-card-dark">
                  <div className="preview-card-header">
                    <div className="preview-card-title">
                      <Activity size={16} style={{ color: '#34d399' }} />
                      <span>ML Prediction Result</span>
                    </div>
                    <span className="preview-badge-green">Optimal Status</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <div>
                      <div style={{ fontSize: '2rem', fontWeight: 800, color: '#34d399', lineHeight: 1 }}>
                        4.5%
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.2rem' }}>
                        Failure Probability Score
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f8fafc' }}>
                        LOW RISK TIER
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#34d399' }}>
                        Confidence: 95.5%
                      </div>
                    </div>
                  </div>

                  <div style={{ fontSize: '0.8rem', color: '#cbd5e1', lineHeight: 1.5, padding: '0.65rem 0.85rem', background: 'rgba(255, 255, 255, 0.04)', borderRadius: '6px' }}>
                    ✓ Tool Wear within limit (112/200 min)<br />
                    ✓ Thermal differential safe (10.5 K &gt; 8.6 K)<br />
                    ✓ Mechanical power stable (6,950 W nominal)
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Capabilities Section */}
      <section id="features" className="section-features">
        <div className="section-container">
          <div className="section-header">
            <div className="section-tag">Platform Capabilities</div>
            <h2 className="section-title">Built for Modern Industrial Manufacturing</h2>
            <p className="section-subtitle">
              SmartMaintainAI bridges raw sensor data and plant operations with end-to-end machine learning,
              rigorous physical diagnostics, and intuitive visualization.
            </p>
          </div>

          <div className="features-grid">
            <div className="feature-box">
              <div className="feature-icon-wrap">
                <Cpu size={24} />
              </div>
              <h3 className="feature-title">Random Forest Classifier</h3>
              <p className="feature-desc">
                Trained on 10,000 real-world AI4I CNC milling telemetry records across 8 input dimensions,
                generating probabilistic breakdown predictions within milliseconds.
              </p>
            </div>

            <div className="feature-box">
              <div className="feature-icon-wrap">
                <Shield size={24} />
              </div>
              <h3 className="feature-title">AI4I Physics Diagnostics</h3>
              <p className="feature-desc">
                Diagnose physical failure mechanisms: Tool Wear Failure (TWF), Heat Dissipation (HDF),
                Power Over/Underflow (PWF), and Spindle Overstrain (OSF).
              </p>
            </div>

            <div className="feature-box">
              <div className="feature-icon-wrap">
                <BarChart3 size={24} />
              </div>
              <h3 className="feature-title">Recharts Visual Analytics</h3>
              <p className="feature-desc">
                Interactive fleet health donuts, variant distribution bar charts, cutting torque telemetry,
                and semicircular failure probability gauges.
              </p>
            </div>

            <div className="feature-box">
              <div className="feature-icon-wrap">
                <Server size={24} />
              </div>
              <h3 className="feature-title">Flask REST API</h3>
              <p className="feature-desc">
                Lightweight Python Flask backend serving endpoints for authentication, live prediction scoring,
                fleet querying, and summary statistics.
              </p>
            </div>

            <div className="feature-box">
              <div className="feature-icon-wrap">
                <Database size={24} />
              </div>
              <h3 className="feature-title">SQLite Fleet Storage</h3>
              <p className="feature-desc">
                Persistent relational storage of machine fleet parameters, user profiles, and operational
                telemetry baselines.
              </p>
            </div>

            <div className="feature-box">
              <div className="feature-icon-wrap">
                <Zap size={24} />
              </div>
              <h3 className="feature-title">Instant Decision Support</h3>
              <p className="feature-desc">
                Automated engineering suggestions advising operators whether to schedule immediate cutter
                replacement, cooling inspection, or routine upkeep.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="section-workflow">
        <div className="section-container">
          <div className="section-header">
            <div className="section-tag">Step-by-Step Workflow</div>
            <h2 className="section-title">How SmartMaintainAI Predicts Failure</h2>
            <p className="section-subtitle">
              From raw spindle telemetry to actionable maintenance alerts in four structured stages.
            </p>
          </div>

          <div className="workflow-steps-grid">
            <div className="step-card">
              <div className="step-number">01</div>
              <h3 className="step-title">Equipment Registration</h3>
              <p className="step-desc">
                Add milling machines to your fleet, specifying product quality variant (L, M, or H) and factory shop floor location.
              </p>
            </div>

            <div className="step-card">
              <div className="step-number">02</div>
              <h3 className="step-title">Telemetry Ingestion</h3>
              <p className="step-desc">
                Stream or input sensor readings: air temperature, process temperature, rotational speed, torque, and cumulative cutter wear.
              </p>
            </div>

            <div className="step-card">
              <div className="step-number">03</div>
              <h3 className="step-title">Model Evaluation</h3>
              <p className="step-desc">
                Flask feeds the one-hot encoded feature vector into the Random Forest classifier to compute class probabilities.
              </p>
            </div>

            <div className="step-card">
              <div className="step-number">04</div>
              <h3 className="step-title">Preventive Action</h3>
              <p className="step-desc">
                Review failure probability gauges, physics mode diagnostics, and actionable maintenance suggestions before catastrophic breakdown.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Machine Learning Architecture Specs */}
      <section id="architecture" className="section-architecture">
        <div className="section-container">
          <div className="section-header">
            <div className="section-tag">Technical Architecture</div>
            <h2 className="section-title">Machine Learning Pipeline Specifications</h2>
            <p className="section-subtitle">
              Verified specifications of our trained machine learning pipeline and system stack.
            </p>
          </div>

          <div className="arch-grid">
            <div className="arch-card">
              <div className="arch-card-header">
                <Cpu size={22} style={{ color: '#38bdf8' }} />
                <h3>ML Model & Feature Engineering</h3>
              </div>

              <div className="arch-list">
                <div className="arch-item">
                  <CheckCircle2 size={16} style={{ color: '#38bdf8', marginTop: 2, flexShrink: 0 }} />
                  <div>
                    <strong>Algorithm:</strong> Scikit-learn <code>RandomForestClassifier(n_estimators=200, random_state=42)</code>
                  </div>
                </div>

                <div className="arch-item">
                  <CheckCircle2 size={16} style={{ color: '#38bdf8', marginTop: 2, flexShrink: 0 }} />
                  <div>
                    <strong>Continuous Features (5):</strong> Air Temp [K], Process Temp [K], Spindle Speed [RPM], Cutting Torque [Nm], Tool Wear [min]
                  </div>
                </div>

                <div className="arch-item">
                  <CheckCircle2 size={16} style={{ color: '#38bdf8', marginTop: 2, flexShrink: 0 }} />
                  <div>
                    <strong>Categorical Features (1):</strong> Machine Type (Variant L / M / H) one-hot encoded into <code>Type_H</code>, <code>Type_L</code>, <code>Type_M</code>
                  </div>
                </div>

                <div className="arch-item">
                  <CheckCircle2 size={16} style={{ color: '#38bdf8', marginTop: 2, flexShrink: 0 }} />
                  <div>
                    <strong>Training Standard:</strong> AI4I 2020 Predictive Maintenance Dataset (UCI / Kaggle CNC Milling Benchmark)
                  </div>
                </div>
              </div>
            </div>

            <div className="arch-card">
              <div className="arch-card-header">
                <Server size={22} style={{ color: '#38bdf8' }} />
                <h3>Application Stack & Integration</h3>
              </div>

              <div className="arch-list">
                <div className="arch-item">
                  <CheckCircle2 size={16} style={{ color: '#38bdf8', marginTop: 2, flexShrink: 0 }} />
                  <div>
                    <strong>REST Backend:</strong> Python Flask serving endpoints for <code>/api/predict</code>, <code>/api/machines</code>, and <code>/api/dashboard/stats</code>
                  </div>
                </div>

                <div className="arch-item">
                  <CheckCircle2 size={16} style={{ color: '#38bdf8', marginTop: 2, flexShrink: 0 }} />
                  <div>
                    <strong>Frontend Architecture:</strong> React 18, Vite, React Router 7, Axios with credentials, and Recharts
                  </div>
                </div>

                <div className="arch-item">
                  <CheckCircle2 size={16} style={{ color: '#38bdf8', marginTop: 2, flexShrink: 0 }} />
                  <div>
                    <strong>Database:</strong> SQLite (<code>smartmaintain.db</code>) with users and machines relational tables
                  </div>
                </div>

                <div className="arch-item">
                  <CheckCircle2 size={16} style={{ color: '#38bdf8', marginTop: 2, flexShrink: 0 }} />
                  <div>
                    <strong>Security:</strong> Session cookie authentication with CORS credentials support for development and production
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="section-cta">
        <div className="cta-box">
          <h2 className="cta-title">Ready to Transform Your Maintenance Strategy?</h2>
          <p className="cta-desc">
            Access the complete SmartMaintainAI dashboard, evaluate machine parameters with our trained ML model,
            and monitor your entire industrial equipment fleet.
          </p>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            {user ? (
              <>
                <Link to="/dashboard" className="hero-cta-primary">
                  <span>Open Dashboard Fleet</span>
                  <ArrowRight size={17} />
                </Link>
                <Link to="/machines/add" className="hero-cta-secondary">
                  <span>Register Machine</span>
                </Link>
              </>
            ) : (
              <>
                <Link to="/register" className="hero-cta-primary">
                  <span>Create Operator Account</span>
                  <ArrowRight size={17} />
                </Link>
                <Link to="/login" className="hero-cta-secondary">
                  <span>Sign In</span>
                </Link>
              </>
            )}

            <Link to="/analysis" className="hero-cta-secondary">
              <Sliders size={17} />
              <span>Evaluate Parameters</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-inner">
          <div className="footer-copy">
            © 2026 SmartMaintainAI. Machine Learning Predictive Maintenance System.
          </div>

          <div className="footer-links">
            <Link to="/dashboard" className="footer-link">Dashboard</Link>
            <Link to="/analysis" className="footer-link">Analysis</Link>
            <Link to="/machines" className="footer-link">Machines</Link>
            <Link to="/reports" className="footer-link">Reports</Link>
            <Link to="/login" className="footer-link">Sign In</Link>
            <Link to="/register" className="footer-link">Create Account / Register</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default LandingPage

