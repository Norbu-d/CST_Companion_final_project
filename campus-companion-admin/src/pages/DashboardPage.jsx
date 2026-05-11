import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { CalendarCheck, Megaphone, CalendarOff, Building2, Clock, CheckCircle, XCircle } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'

function StatCard({ label, value, icon: Icon, variant = 'navy', loading }) {
  return (
    <div className={`stat-card ${variant}`}>
      <div className={`stat-icon ${variant}`}>
        <Icon size={20} />
      </div>
      <div className="stat-value">{loading ? '—' : value}</div>
      <div className="stat-label">{label}</div>
    </div>
  )
}

function statusBadge(status) {
  const map = {
    PENDING: 'badge-pending',
    APPROVED: 'badge-approved',
    REJECTED: 'badge-rejected',
  }
  return <span className={`badge ${map[status] ?? 'badge-navy'}`}>{status}</span>
}

export default function DashboardPage() {
  const { user } = useAuth()

  const { data: bookingsData, isLoading: bLoad } = useQuery({
    queryKey: ['bookings-all'],
    queryFn: () => api.get('/bookings/all'),
  })

  const { data: noticesData, isLoading: nLoad } = useQuery({
    queryKey: ['notices'],
    queryFn: () => api.get('/notices'),
  })

  const { data: leaveData, isLoading: lLoad } = useQuery({
    queryKey: ['leave-on'],
    queryFn: () => api.get('/lecturer/on-leave'),
  })

  const { data: facilitiesData, isLoading: fLoad } = useQuery({
    queryKey: ['facilities'],
    queryFn: () => api.get('/facilities'),
  })

  const bookings = bookingsData?.data ?? []
  const notices = noticesData?.data ?? []
  const onLeave = leaveData?.data ?? []
  const facilities = facilitiesData?.data ?? []

  const pending = bookings.filter(b => b.status === 'PENDING').length
  const approved = bookings.filter(b => b.status === 'APPROVED').length
  const recent = [...bookings].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 6)

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <div className="page-subtitle">
            Good morning, {user?.name?.split(' ')[0] ?? 'Admin'} · {format(new Date(), 'EEEE, d MMMM yyyy')}
          </div>
        </div>
      </div>

      <div className="page-body">
        {/* Stats */}
        <div className="stats-grid">
          <StatCard label="Pending Bookings" value={pending} icon={Clock} variant="gold" loading={bLoad} />
          <StatCard label="Approved Bookings" value={approved} icon={CheckCircle} variant="green" loading={bLoad} />
          <StatCard label="Total Notices" value={notices.length} icon={Megaphone} variant="navy" loading={nLoad} />
          <StatCard label="Lecturers on Leave" value={onLeave.length} icon={CalendarOff} variant="amber" loading={lLoad} />
          <StatCard label="Total Facilities" value={facilities.length} icon={Building2} variant="navy" loading={fLoad} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
          {/* Recent bookings */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">Recent Booking Activity</span>
              <a href="/bookings" style={{ fontSize: 13, color: 'var(--navy)', fontWeight: 600, textDecoration: 'none' }}>
                View all →
              </a>
            </div>
            <div className="table-wrap">
              {bLoad ? (
                <div className="loading-center"><div className="spinner" /></div>
              ) : recent.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon"><CalendarCheck size={22} /></div>
                  <div className="empty-title">No bookings yet</div>
                </div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Facility</th>
                      <th>Date</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recent.map(b => (
                      <tr key={b.id}>
                        <td>
                          <div style={{ fontWeight: 600 }}>{b.user?.name ?? '—'}</div>
                          <div className="text-xs text-muted">{b.user?.studentId}</div>
                        </td>
                        <td>{b.facility?.name ?? '—'}</td>
                        <td>
                          <span className="text-sm">{b.date}</span>
                        </td>
                        <td>{statusBadge(b.status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* On leave */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">Lecturers on Leave</span>
              <span className="badge badge-amber">{onLeave.length} today</span>
            </div>
            <div className="card-body" style={{ padding: '12px 20px' }}>
              {lLoad ? (
                <div className="loading-center"><div className="spinner" /></div>
              ) : onLeave.length === 0 ? (
                <div className="empty-state" style={{ padding: '32px 0' }}>
                  <div className="empty-icon"><CalendarOff size={20} /></div>
                  <div className="empty-title" style={{ fontSize: 13 }}>No one on leave today</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {onLeave.slice(0, 8).map(l => (
                    <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 34, height: 34, borderRadius: '50%',
                        background: 'linear-gradient(135deg, var(--navy), var(--navy-light))',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'white', fontWeight: 700, fontSize: 13, flexShrink: 0
                      }}>
                        {l.user?.name?.charAt(0) ?? '?'}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{l.user?.name}</div>
                        <div className="text-xs text-muted">
                          Until {l.endDate ? format(parseISO(l.endDate), 'd MMM') : '—'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
