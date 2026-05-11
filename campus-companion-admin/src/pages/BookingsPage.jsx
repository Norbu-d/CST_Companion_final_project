import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CheckCircle, XCircle, Search, CalendarCheck, ChevronDown } from 'lucide-react'
import api from '../api/client'

function statusBadge(status) {
  const map = { PENDING: 'badge-pending', APPROVED: 'badge-approved', REJECTED: 'badge-rejected' }
  return <span className={`badge ${map[status] ?? 'badge-navy'}`}>{status.charAt(0) + status.slice(1).toLowerCase()}</span>
}

function formatSlots(slots) {
  if (!slots?.length) return '—'
  return slots.map(s => `${7 + s}:00–${8 + s}:00`).join(', ')
}

export default function BookingsPage() {
  const qc = useQueryClient()
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [search, setSearch] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['bookings-all'],
    queryFn: () => api.get('/bookings/all'),
  })

  const { mutate: updateStatus, variables: pendingVars } = useMutation({
    mutationFn: ({ id, status }) => api.patch(`/bookings/${id}/status`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bookings-all'] }),
  })

  const allBookings = data?.data ?? []
  const filtered = allBookings
    .filter(b => statusFilter === 'ALL' || b.status === statusFilter)
    .filter(b => {
      if (!search) return true
      const q = search.toLowerCase()
      return (
        b.user?.name?.toLowerCase().includes(q) ||
        b.facility?.name?.toLowerCase().includes(q) ||
        b.user?.studentId?.toLowerCase().includes(q)
      )
    })

  const counts = {
    ALL: allBookings.length,
    PENDING: allBookings.filter(b => b.status === 'PENDING').length,
    APPROVED: allBookings.filter(b => b.status === 'APPROVED').length,
    REJECTED: allBookings.filter(b => b.status === 'REJECTED').length,
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Bookings</h1>
          <div className="page-subtitle">Review and manage facility booking requests</div>
        </div>
      </div>

      <div className="page-body">
        <div className="card">
          <div className="card-header">
            <div className="filter-tabs">
              {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map(s => (
                <button
                  key={s}
                  className={`filter-tab${statusFilter === s ? ' active' : ''}`}
                  onClick={() => setStatusFilter(s)}
                >
                  {s === 'ALL' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
                  <span style={{
                    marginLeft: 6, fontSize: 11, fontWeight: 700,
                    background: statusFilter === s ? 'var(--navy)' : 'var(--border)',
                    color: statusFilter === s ? 'white' : 'var(--text-muted)',
                    padding: '1px 6px', borderRadius: 99
                  }}>{counts[s]}</span>
                </button>
              ))}
            </div>

            <div className="search-wrap">
              <Search className="search-icon" />
              <input
                className="search-input"
                placeholder="Search student or facility..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="table-wrap">
            {isLoading ? (
              <div className="loading-center"><div className="spinner" /></div>
            ) : filtered.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon"><CalendarCheck size={24} /></div>
                <div className="empty-title">No bookings found</div>
                <div className="empty-body">Try adjusting your filters or search query</div>
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Student</th>
                    <th>Facility</th>
                    <th>Date</th>
                    <th>Time Slots</th>
                    <th>Purpose</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(b => {
                    const isUpdating = pendingVars?.id === b.id
                    return (
                      <tr key={b.id}>
                        <td className="text-muted text-sm">#{b.id}</td>
                        <td>
                          <div style={{ fontWeight: 600, fontSize: 14 }}>{b.user?.name ?? '—'}</div>
                          <div className="text-xs text-muted">{b.user?.studentId}</div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 500 }}>{b.facility?.name ?? '—'}</div>
                          <div className="text-xs text-muted">{b.facility?.location}</div>
                        </td>
                        <td>
                          <span className="badge badge-navy">{b.date}</span>
                        </td>
                        <td className="text-sm text-secondary">{formatSlots(b.slots)}</td>
                        <td>
                          <span style={{
                            display: 'inline-block', maxWidth: 180,
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            fontSize: 13
                          }} title={b.purpose}>{b.purpose}</span>
                        </td>
                        <td>{statusBadge(b.status)}</td>
                        <td>
                          {b.status === 'PENDING' ? (
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button
                                className="btn btn-success btn-sm"
                                disabled={isUpdating}
                                onClick={() => updateStatus({ id: b.id, status: 'APPROVED' })}
                                title="Approve"
                              >
                                {isUpdating ? <div className="spinner" style={{ width: 14, height: 14 }} /> : <><CheckCircle size={13} /> Approve</>}
                              </button>
                              <button
                                className="btn btn-danger btn-sm"
                                disabled={isUpdating}
                                onClick={() => updateStatus({ id: b.id, status: 'REJECTED' })}
                                title="Reject"
                              >
                                <XCircle size={13} /> Reject
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-muted">—</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
