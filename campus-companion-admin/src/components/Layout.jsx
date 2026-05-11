import React from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, CalendarCheck, Megaphone,
  CalendarOff, Building2, LogOut
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/bookings', icon: CalendarCheck, label: 'Bookings' },
  { to: '/notices', icon: Megaphone, label: 'Notices' },
  { to: '/leave', icon: CalendarOff, label: 'Lecturer Leave' },
  { to: '/facilities', icon: Building2, label: 'Facilities' },
]

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const initials = user?.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() ?? 'AD'

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-brand-mark">
            <div className="brand-icon">C</div>
            <div className="brand-text">
              <div className="brand-name">Campus Companion</div>
              <div className="brand-sub">Admin Portal — CST</div>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section-label">Main</div>
          {navItems.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
            >
              <Icon className="nav-icon" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-card" onClick={handleLogout} title="Sign out">
            <div className="user-avatar">{initials}</div>
            <div className="user-info">
              <div className="user-name">{user?.name ?? 'Admin'}</div>
              <div className="user-role">Administrator</div>
            </div>
            <LogOut size={15} style={{ color: 'rgba(255,255,255,0.35)', flexShrink: 0 }} />
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  )
}
