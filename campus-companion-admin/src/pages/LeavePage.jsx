import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CalendarOff, Trash2, Search, X, UserCheck } from 'lucide-react'
import { format, parseISO, isAfter, isBefore, isWithinInterval } from 'date-fns'
import api from '../api/client'

function isOnLeaveToday(leave) {
  const today = new Date()
  const start = parseISO(leave.startDate)
  const end = parseISO(leave.endDate)
  return isWithinInterval(today, { start, end })
}

function isUpcoming(leave) {
  return isAfter(parseISO(leave.startDate), new Date())
}

function DeleteLeaveModal({ leave, onClose }) {
  const qc = useQueryClient()
  const { mutate, isPending } = useMutation({
    mutationFn: () => api.delete(`/lecturer/leave/${leave.id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['all-leaves'] })
      onClose()
    },
  })
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 420 }}>
        <div className="modal-header">
          <h2 className="modal-title">Cancel Leave</h2>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="modal-body">
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Cancel leave for <strong>{leave.user?.name}</strong> from{' '}
            <strong>{format(parseISO(leave.startDate), 'd MMM')}</strong> to{' '}
            <strong>{format(parseISO(leave.endDate), 'd MMM yyyy')}</strong>?
          </p>
          {leave.reason && (
            <div style={{ marginTop: 12, padding: '10px 14px', background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', fontSize: 13, color: 'var(--text-secondary)' }}>
              Reason: {leave.reason}
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Keep leave</button>
          <button className="btn btn-danger" onClick={() => mutate()} disabled={isPending}
            style={{ background: 'var(--red)', color: 'white' }}>
            {isPending ? <div className="spinner" /> : <><Trash2 size={14} /> Cancel leave</>}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function LeavePage() {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('ALL')
  const [deleteModal, setDeleteModal] = useState(null)

  // Fetch all lecturers' leave
  const { data: onLeaveData } = useQuery({
    queryKey: ['leave-on'],
    queryFn: () => api.get('/lecturer/on-leave'),
  })

  // We need all leave records — fetch for each lecturer on leave + upcoming/past
  // We'll use /lecturer/on-leave for currently active, and build a combined view
  // In a real app you'd have GET /lecturer/leave/all — for now we use what's available

  const { data, isLoading } = useQuery({
    queryKey: ['all-leaves'],
    queryFn: async () => {
      // Get currently on-leave lecturers
      const onLeaveRes = await api.get('/lecturer/on-leave')
      const onLeave = onLeaveRes.data ?? []

      // Collect unique user IDs and fetch their full leave history
      const userIds = [...new Set(onLeave.map(l => l.userId))]
      const allLeaves = []

      await Promise.all(
        userIds.map(async (uid) => {
          const res = await api.get(`/lecturer/${uid}/leave`)
          if (res.data) {
            allLeaves.push(...res.data.map(l => ({ ...l, user: onLeave.find(o => o.userId === uid)?.user })))
          }
        })
      )

      return { onLeave, allLeaves }
    },
  })

  const onLeave = data?.onLeave ?? []
  const allLeaves = data?.allLeaves ?? []

  const filtered = allLeaves.filter(l => {
    const matchSearch = !search || l.user?.name?.toLowerCase().includes(search.toLowerCase())
    if (!matchSearch) return false
    if (filter === 'ACTIVE') return isOnLeaveToday(l)
    if (filter === 'UPCOMING') return isUpcoming(l)
    if (filter === 'PAST') return isBefore(parseISO(l.endDate), new Date())
    return true
  })

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Lecturer Leave</h1>
          <div className="page-subtitle">Monitor and manage lecturer leave records</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span className="badge badge-amber" style={{ fontSize: 13, padding: '6px 14px' }}>
            <CalendarOff size={13} /> {onLeave.length} on leave today
          </span>
        </div>
      </div>

      <div className="page-body">
        {/* Summary cards */}
        <div className="stats-grid" style={{ marginBottom: 24 }}>
          <div className="stat-card amber" style={{ cursor: 'pointer' }} onClick={() => setFilter('ACTIVE')}>
            <div className="stat-icon amber"><CalendarOff size={20} /></div>
            <div className="stat-value">{onLeave.length}</div>
            <div className="stat-label">Currently on leave</div>
          </div>
          <div className="stat-card navy" style={{ cursor: 'pointer' }} onClick={() => setFilter('UPCOMING')}>
            <div className="stat-icon navy"><UserCheck size={20} /></div>
            <div className="stat-value">{allLeaves.filter(isUpcoming).length}</div>
            <div className="stat-label">Upcoming leave</div>
          </div>
          <div className="stat-card navy" style={{ cursor: 'pointer' }} onClick={() => setFilter('ALL')}>
            <div className="stat-icon navy"><CalendarOff size={20} /></div>
            <div className="stat-value">{allLeaves.length}</div>
            <div className="stat-label">Total records loaded</div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="filter-tabs">
              {[['ALL', 'All'], ['ACTIVE', 'On Leave Today'], ['UPCOMING', 'Upcoming'], ['PAST', 'Past']].map(([val, label]) => (
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
                  {filter === 'ACTIVE' ? 'No lecturers are on leave today.' : 'No records match your filter.'}
                </div>
              </div>
            ) : (
              <div className="leave-timeline">
                {filtered.map(l => {
                  const active = isOnLeaveToday(l)
                  const upcoming = isUpcoming(l)
                  const past = !active && !upcoming

                  const startStr = format(parseISO(l.startDate), 'd MMM yyyy')
                  const endStr = format(parseISO(l.endDate), 'd MMM yyyy')

                  return (
                    <div key={l.id} className="leave-item" style={{
                      borderLeft: active ? '3px solid var(--amber)' : upcoming ? '3px solid var(--navy)' : '3px solid var(--border)',
                      opacity: past ? 0.7 : 1,
                    }}>
                      <div className="leave-avatar">
                        {l.user?.name?.charAt(0) ?? '?'}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                          <span style={{ fontWeight: 700, fontSize: 15 }}>{l.user?.name ?? 'Unknown Lecturer'}</span>
                          {active && <span className="badge badge-pending">On Leave</span>}
                          {upcoming && <span className="badge badge-navy">Upcoming</span>}
                          {past && <span className="badge" style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}>Past</span>}
                        </div>
                        <div className="text-sm text-secondary">
                          {startStr} → {endStr}
                        </div>
                        {l.reason && (
                          <div className="text-xs text-muted" style={{ marginTop: 4 }}>
                            {l.reason}
                          </div>
                        )}
                      </div>

                      <button
                        className="btn btn-danger btn-sm btn-icon"
                        onClick={() => setDeleteModal(l)}
                        title="Cancel leave"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {deleteModal && <DeleteLeaveModal leave={deleteModal} onClose={() => setDeleteModal(null)} />}
    </>
  )
}
