import React from 'react'
import { Link } from 'react-router-dom'
import './NotFound.css'

export const NotFound = () => {
  return (
    <div className="notfound-container">
      <div className="notfound-card">
        <div className="notfound-code">404</div>
        <h1 className="notfound-title">Page Not Found</h1>
        <p className="notfound-desc">
          The requested CNCGuard AI resource, telemetry stream, or route does not exist or has been relocated.
        </p>
        <div className="notfound-actions">
          <Link to="/dashboard" className="btn-primary">
            Return to Dashboard
          </Link>
          <Link to="/login" className="btn-secondary">
            Sign In Screen
          </Link>
        </div>
      </div>
    </div>
  )
}

export default NotFound

