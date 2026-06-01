import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertCircle, Lock, Mail, ArrowRight } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import api from '../api/client'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await api.post('/auth/login', form)
      if (!res.success) throw new Error(res.message)
      if (res.data.user.role !== 'ADMIN') throw new Error('Access denied. Admins only.')
      login(res.data.token, res.data.user)
      navigate('/')
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      {/* Left panel */}
      <div className="login-left">
        <div className="login-logo">C</div>
        <h1 className="login-heading">Campus<br />Companion</h1>
        <p className="login-desc">
          Internal admin portal for CST, Rinchending.<br />
          Manage bookings, notices, and lecturer leave from one place.
        </p>

        <div style={{ marginTop: 48, display: 'flex', flexDirection: 'column', gap: 16, position: 'relative', zIndex: 1 }}>
          {[
            { icon: '✦', text: 'Approve & reject facility bookings' },
            { icon: '✦', text: 'Publish campus-wide notices' },
            { icon: '✦', text: 'View lecturer leave records' },
          ].map(({ icon, text }) => (
            <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ color: '#F4A623', fontSize: 10 }}>{icon}</span>
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>{text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div className="login-right">
        <div className="login-form-box">
          <h2 className="login-form-title">Welcome back</h2>
          <p className="login-form-sub">Sign in to your admin account</p>

          {error && (
            <div className="error-alert">
              <AlertCircle size={15} />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Email address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  className="form-input"
                  style={{ paddingLeft: 38 }}
                  placeholder="admin@cst.edu.bt"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  required
                  autoFocus
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="password"
                  className="form-input"
                  style={{ paddingLeft: 38 }}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', marginTop: 8, padding: '12px 18px', fontSize: 15 }}
              disabled={loading}
            >
              {loading ? <div className="spinner" /> : <>Sign in <ArrowRight size={16} /></>}
            </button>
          </form>

          <p style={{ marginTop: 32, fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
            CST, Rinchending · Royal University of Bhutan
          </p>
        </div>
      </div>
    </div>
  )
}
