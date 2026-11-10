import React, { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Navbar from './Navbar'
import './AppLayout.css'

/**
 * Shared Application Layout for CNCGuard AI
 * Coordinates desktop collapsible sidebar, mobile drawer, top navigation bar,
 * and renders child routes inside the main content container via <Outlet />.
 */
export const AppLayout = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  return (
    <div className="app-layout-root">
      {/* Sidebar Navigation */}
      <Sidebar
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
      />

      {/* Main Column Wrapper */}
      <div className="app-layout-main-wrapper">
        {/* Top Navbar */}
        <Navbar onOpenMobileMenu={() => setMobileMenuOpen(true)} />

        {/* Dynamic Main Page Content via React Router */}
        <main className="app-main-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default AppLayout
