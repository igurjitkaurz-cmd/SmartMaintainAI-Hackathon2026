import React from 'react'
import './LoadingSpinner.css'

export const LoadingSpinner = ({ message = 'Loading CNCGuard AI system...' }) => {
  return (
    <div className="loading-container">
      <div className="spinner" aria-label="Loading indicator"></div>
      <p className="loading-message">{message}</p>
    </div>
  )
}

export default LoadingSpinner

