import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CalendarOff, Trash2, Search, X, UserCheck, CheckCircle2, XCircle, Clock } from 'lucide-react'
import { format, parseISO, isAfter, isBefore, isWithinInterval } from 'date-fns'
import api from '../api/client'

function isOnLeaveToday(leave) {
  const today = new Date()
  const start = parseISO(leave.startDate)
  const end = parseISO(leave.endDate)
  return leave.status === 'APPROVED' && isWithinInterval(today, { start, end })
}

function isUpcoming(leave) {
  return isAfter(parseISO(leave.startDate), new Date())
}

function getStatusColor(status) {
  if (status === 'APPROVED') return { bg: '#dcfce7', text: '#166534', border: '#86efac' }
  if (status === 'REJECTED') return { bg: '#fee2e2', text: '#991b1b', border: '#fca5a5' }
  return { bg: '#fef3c7', text: '#92400e', border: '#fcd34d' }
}

function ApprovalModal({ leave, onClose }) {
  const qc = useQueryClient()
  const [action, setAction] = useState(null)
  
  const { mutate, isPending } = useMutation({
    mutationFn: (status) => api.patch(`/lecturer/leave/${leave.id}/status`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['all-leaves'] })
      onClose()
    },
  })

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 420 }}>
        <div className="modal-header">
          <h2 className="modal-title">{action ? `${action} Leave` : 'Review Leave Request'}</h2>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="modal-body">
          {!action ? (
            <>
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ fontWeight: 700, fontSize: 15 }}>{leave.user?.name}</span>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>({leave.user?.department})</span>
                </div>
                <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                  {format(parseISO(leave.startDate), 'd MMM')} → {format(parseISO(leave.endDate), 'd MMM yyyy')}
                </div>
              </div>
              {leave.reason && (
                <div style={{ marginBottom: 16, padding: '10px 14px', background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', fontSize: 13, color: 'var(--text-secondary)' }}>
                  <strong>Reason:</strong> {leave.reason}
                </div>
              )}
              <div style={{ padding: '12px 14px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 'var(--radius-sm)', fontSize: 12, color: '#1e40af' }}>
                ℹ If approved, students will see {leave.user?.name} as unavailable during this period.
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <p style={{ color: 'var(--text-secondary)', marginBottom: 12 }}>
                {action === 'APPROVE' 
                  ? `Approve leave for ${leave.user?.name}?`
                  : `Reject leave for ${leave.user?.name}?`
                }
              </p>
            </div>
          )}
        </div>
        <div className="modal-footer">
          {!action ? (
            <>
              <button className="btn btn-ghost" onClick={onClose}>Close</button>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className="btn btn-danger"
                  onClick={() => setAction('REJECT')}
                  style={{ background: 'var(--red)', color: 'white' }}
                >
                  <XCircle size={14} /> Reject
                </button>
                <button
                  className="btn btn-success"
                  onClick={() => setAction('APPROVE')}
                  style={{ background: 'var(--green)', color: 'white' }}
                >
                  <CheckCircle2 size={14} /> Approve
                </button>
              </div>
            </>
          ) : (
            <>
              <button className="btn btn-ghost" onClick={() => setAction(null)} disabled={isPending}>Cancel</button>
              <button
                className={`btn ${action === 'APPROVE' ? 'btn-success' : 'btn-danger'}`}
                onClick={() => mutate(action)}
                disabled={isPending}
                style={{
                  background: action === 'APPROVE' ? 'var(--green)' : 'var(--red)',
                  color: 'white'
                }}
              >
                {isPending ? <div className="spinner" /> : action}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function LeavePage() {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('ALL')
  const [approvalModal, setApprovalModal] = useState(null)

  const { data, isLoading } = useQuery({
    queryKey: ['all-leaves'],
    queryFn: async () => {
      const res = await api.get('/lecturer/leave/all')
      return res.data ?? []
    },
  })

  const leaves = data ?? []

  const pendingLeaves = leaves.filter(l => l.status === 'PENDING')
  const approvedLeaves = leaves.filter(l => l.status === 'APPROVED')
  const rejectedLeaves = leaves.filter(l => l.status === 'REJECTED')
  const onLeaveToday = leaves.filter(isOnLeaveToday)

  const filtered = leaves.filter(l => {
    const matchSearch = !search || l.user?.name?.toLowerCase().includes(search.toLowerCase())
    if (!matchSearch) return false
    if (filter === 'PENDING') return l.status === 'PENDING'
    if (filter === 'APPROVED') return l.status === 'APPROVED'
    if (filter === 'REJECTED') return l.status === 'REJECTED'
    if (filter === 'ACTIVE') return isOnLeaveToday(l)
    if (filter === 'UPCOMING') return l.status === 'APPROVED' && isUpcoming(l)
    return true
  })

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Lecturer Leave Management</h1>
          <div className="page-subtitle">Review, approve, and manage lecturer leave requests</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span className="badge badge-amber" style={{ fontSize: 13, padding: '6px 14px' }}>
            <Clock size={13} /> {pendingLeaves.length} Pending
          </span>
          <span className="badge" style={{ fontSize: 13, padding: '6px 14px', background: 'var(--green)', color: 'white' }}>
            <CheckCircle2 size={13} /> {onLeaveToday.length} On Leave
          </span>
        </div>
      </div>

      <div className="page-body">
        {/* Summary stats */}
        <div className="stats-grid" style={{ marginBottom: 24 }}>
          <div className="stat-card amber" style={{ cursor: 'pointer' }} onClick={() => setFilter('PENDING')}>
            <div className="stat-icon amber"><Clock size={20} /></div>
            <div className="stat-value">{pendingLeaves.length}</div>
            <div className="stat-label">Pending Approval</div>
          </div>
          <div className="stat-card navy" style={{ cursor: 'pointer' }} onClick={() => setFilter('APPROVED')}>
            <div className="stat-icon navy"><CheckCircle2 size={20} /></div>
            <div className="stat-value">{approvedLeaves.length}</div>
            <div className="stat-label">Approved</div>
          </div>
          <div className="stat-card red" style={{ cursor: 'pointer' }} onClick={() => setFilter('REJECTED')}>
            <div className="stat-icon red"><XCircle size={20} /></div>
            <div className="stat-value">{rejectedLeaves.length}</div>
            <div className="stat-label">Rejected</div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="filter-tabs">
              {[['ALL', 'All'], ['PENDING', 'Pending'], ['APPROVED', 'Approved'], ['REJECTED', 'Rejected'], ['ACTIVE', 'On Leave Today']].map(([val, label]) => (
                <button key={val} className={`filter-tab${filter === val ? ' active' : ''}`} onClick={() => setFilter(val)}>
                  {label}
                </button>
              ))}
            </div>
            <div className="search-wrap">
              <Search className="search-icon" />
              <input className="search-input" placeholder="Search lecturer..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>

          <div style={{ padding: '16px 24px' }}>
            {isLoading ? (
              <div className="loading-center"><div className="spinner" /></div>
            ) : filtered.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon"><CalendarOff size={24} /></div>
                <div className="empty-title">No leave records</div>
                <div className="empty-body">
                  {filter === 'PENDING' ? 'No pending leave requests.' : 'No records match your filter.'}
                </div>
              </div>
            ) : (
              <div className="leave-timeline">
                {filtered.map(l => {
                  const colors = getStatusColor(l.status)
                  const startStr = format(parseISO(l.startDate), 'd MMM yyyy')
                  const endStr = format(parseISO(l.endDate), 'd MMM yyyy')

                  return (
                    <div key={l.id} className="leave-item" style={{
                      borderLeft: `3px solid ${colors.border}`,
                    }}>
                      <div className="leave-avatar">
                        {l.user?.name?.charAt(0) ?? '?'}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                          <span style={{ fontWeight: 700, fontSize: 15 }}>{l.user?.name ?? 'Unknown'}</span>
                          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>({l.user?.department})</span>
                          <span className="badge" style={{
                            background: colors.bg,
                            color: colors.text,
                            fontSize: 11,
                            padding: '3px 10px',
                            fontWeight: 600
                          }}>
                            {l.status}
                          </span>
                        </div>
                        <div className="text-sm text-secondary">
                          {startStr} → {endStr}
                        </div>
                        {l.reason && (
                          <div className="text-xs text-muted" style={{ marginTop: 4 }}>
                            Reason: {l.reason}
                          </div>
                        )}
                      </div>

                      {l.status === 'PENDING' && (
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => setApprovalModal(l)}
                          style={{ background: 'var(--amber)', color: 'white' }}
                        >
                          Review
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {approvalModal && <ApprovalModal leave={approvalModal} onClose={() => setApprovalModal(null)} />}
    </>
  )
}
