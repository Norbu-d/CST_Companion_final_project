import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import BookingsPage from './pages/BookingsPage'
import NoticesPage from './pages/NoticesPage'
import LeavePage from './pages/LeavePage'
import FacilitiesPage from './pages/FacilitiesPage'
import SchedulePage from './pages/SchedulePage'

function ProtectedRoute({ children }) {
  const { token, isAdmin } = useAuth()
  if (!token || !isAdmin) return <Navigate to="/login" replace />
  return children
}

function PublicRoute({ children }) {
  const { token, isAdmin } = useAuth()
  if (token && isAdmin) return <Navigate to="/" replace />
  return children
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<DashboardPage />} />
          <Route path="bookings" element={<BookingsPage />} />
          <Route path="schedule" element={<SchedulePage />} />
          <Route path="notices" element={<NoticesPage />} />
          <Route path="leave" element={<LeavePage />} />
          <Route path="facilities" element={<FacilitiesPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  )
}