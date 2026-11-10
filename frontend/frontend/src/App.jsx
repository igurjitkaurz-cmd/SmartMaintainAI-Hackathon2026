import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from './components/auth/ProtectedRoute'
import AppLayout from './components/layout/AppLayout'

// Public Route Placeholders
import LandingPage from './pages/LandingPage'
import Login from './pages/Login'
import Register from './pages/Register'

// Protected Route Placeholders
import Dashboard from './pages/Dashboard'
import Machines from './pages/Machines'
import AddMachine from './pages/AddMachine'
import MachineDetail from './pages/MachineDetail'
import Analysis from './pages/Analysis'
import PredictionDetail from './pages/PredictionDetail'
import Reports from './pages/Reports'
import Alerts from './pages/Alerts'
import MaintenanceLogs from './pages/MaintenanceLogs'
import Settings from './pages/Settings'

// 404 Route
import NotFound from './pages/NotFound'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Protected Application Routes wrapped with AppLayout */}
        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/machines" element={<Machines />} />
          <Route path="/machines/add" element={<AddMachine />} />
          <Route path="/machines/:machineId" element={<MachineDetail />} />
          <Route path="/analysis" element={<Analysis />} />
          <Route path="/predictions/:predictionId" element={<PredictionDetail />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/alerts" element={<Alerts />} />
          <Route path="/maintenance-logs" element={<MaintenanceLogs />} />
          <Route path="/settings" element={<Settings />} />
        </Route>

        {/* Catch-all 404 Route */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
