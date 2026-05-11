import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, Megaphone, Pin, X } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import api from '../api/client'

const CATEGORIES = ['General', 'Exam', 'Event', 'Holiday', 'Urgent', 'Academic']
const ICONS = ['megaphone', 'book', 'calendar', 'alert', 'star', 'info']

function categoryColor(cat) {
  const map = {
    Exam: 'badge-pending',
    Urgent: 'badge-rejected',
    Event: 'badge-approved',
    Holiday: 'badge-gold',
    Academic: 'badge-navy',
    General: 'badge-navy',
  }
  return map[cat] ?? 'badge-navy'
}

function NoticeModal({ notice, onClose }) {
  const qc = useQueryClient()
  const isEdit = !!notice?.id
  const [form, setForm] = useState({
    title: notice?.title ?? '',
    body: notice?.body ?? '',
    category: notice?.category ?? 'General',
    pinned: notice?.pinned ?? false,
    icon: notice?.icon ?? 'megaphone',
  })
  const [error, setError] = useState('')

  const { mutate, isPending } = useMutation({
    mutationFn: () =>
      isEdit
        ? api.patch(`/notices/${notice.id}`, form)
        : api.post('/notices', form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notices'] })
      onClose()
    },
    onError: (err) => setError(err.message ?? 'Something went wrong'),
  })

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">{isEdit ? 'Edit Notice' : 'New Notice'}</h2>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="modal-body">
          {error && <div className="error-alert" style={{ marginBottom: 16 }}>{error}</div>}

          <div className="form-group">
            <label className="form-label">Title</label>
            <input className="form-input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Notice title..." required />
          </div>

          <div className="form-group">
            <label className="form-label">Body</label>
            <textarea className="form-textarea" value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} placeholder="Write the notice content here..." rows={4} required />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="form-group">
              <label className="form-label">Category</label>
              <select className="form-select" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Icon</label>
              <select className="form-select" value={form.icon} onChange={e => setForm(f => ({ ...f, icon: e.target.value }))}>
                {ICONS.map(i => <option key={i}>{i}</option>)}
              </select>
            </div>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginTop: 4 }}>
            <input type="checkbox" checked={form.pinned} onChange={e => setForm(f => ({ ...f, pinned: e.target.checked }))} style={{ width: 16, height: 16, accentColor: 'var(--navy)' }} />
            <span className="form-label" style={{ margin: 0 }}>Pin this notice to the top</span>
          </label>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={() => mutate()} disabled={isPending || !form.title || !form.body}>
            {isPending ? <div className="spinner" /> : isEdit ? 'Save changes' : 'Publish notice'}
          </button>
        </div>
      </div>
    </div>
  )
}

function DeleteModal({ notice, onClose }) {
  const qc = useQueryClient()
  const { mutate, isPending } = useMutation({
    mutationFn: () => api.delete(`/notices/${notice.id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notices'] })
      onClose()
    },
  })
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 420 }}>
        <div className="modal-header">
          <h2 className="modal-title">Delete Notice</h2>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="modal-body">
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Are you sure you want to delete <strong>"{notice.title}"</strong>? This cannot be undone.
          </p>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-danger" onClick={() => mutate()} disabled={isPending}
            style={{ background: 'var(--red)', color: 'white' }}>
            {isPending ? <div className="spinner" /> : <><Trash2 size={14} /> Delete</>}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function NoticesPage() {
  const [modal, setModal] = useState(null) // { type: 'edit'|'delete', notice? }
  const [catFilter, setCatFilter] = useState('ALL')

  const { data, isLoading } = useQuery({
    queryKey: ['notices'],
    queryFn: () => api.get('/notices'),
  })

  const notices = data?.data ?? []
  const filtered = catFilter === 'ALL' ? notices : notices.filter(n => n.category === catFilter)
  const pinned = filtered.filter(n => n.pinned)
  const unpinned = filtered.filter(n => !n.pinned)

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Notice Board</h1>
          <div className="page-subtitle">Publish and manage campus notices</div>
        </div>
        <button className="btn btn-primary" onClick={() => setModal({ type: 'edit', notice: null })}>
          <Plus size={16} /> New Notice
        </button>
      </div>

      <div className="page-body">
        {/* Category filters */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          {['ALL', ...CATEGORIES].map(c => (
            <button
              key={c}
              className={`filter-tab${catFilter === c ? ' active' : ''}`}
              onClick={() => setCatFilter(c)}
              style={{ background: catFilter === c ? 'var(--surface)' : 'transparent' }}
            >
              {c}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="loading-center"><div className="spinner" /></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon"><Megaphone size={24} /></div>
            <div className="empty-title">No notices yet</div>
            <div className="empty-body">Click "New Notice" to publish your first announcement</div>
          </div>
        ) : (
          <>
            {pinned.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <Pin size={14} style={{ color: 'var(--gold)' }} />
                  <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>
                    Pinned
                  </span>
                </div>
                <div className="notice-grid">
                  {pinned.map(n => <NoticeCard key={n.id} notice={n} onEdit={() => setModal({ type: 'edit', notice: n })} onDelete={() => setModal({ type: 'delete', notice: n })} />)}
                </div>
              </div>
            )}

            {unpinned.length > 0 && (
              <div>
                {pinned.length > 0 && (
                  <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 12 }}>
                    All Notices
                  </div>
                )}
                <div className="notice-grid">
                  {unpinned.map(n => <NoticeCard key={n.id} notice={n} onEdit={() => setModal({ type: 'edit', notice: n })} onDelete={() => setModal({ type: 'delete', notice: n })} />)}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {modal?.type === 'edit' && <NoticeModal notice={modal.notice} onClose={() => setModal(null)} />}
      {modal?.type === 'delete' && <DeleteModal notice={modal.notice} onClose={() => setModal(null)} />}
    </>
  )
}

function NoticeCard({ notice, onEdit, onDelete }) {
  const dateStr = notice.date ? format(parseISO(notice.date), 'd MMM yyyy') : ''
  return (
    <div className="notice-card" style={{ borderLeft: notice.pinned ? '3px solid var(--gold)' : undefined }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className={`badge ${categoryColor(notice.category)}`}>{notice.category}</span>
          {notice.pinned && <Pin size={12} style={{ color: 'var(--gold)' }} />}
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onEdit} title="Edit"><Pencil size={13} /></button>
          <button className="btn btn-danger btn-icon btn-sm" onClick={onDelete} title="Delete"><Trash2 size={13} /></button>
        </div>
      </div>
      <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6, lineHeight: 1.3 }}>
        {notice.title}
      </h3>
      <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 12 }}>
        {notice.body.length > 140 ? notice.body.slice(0, 140) + '…' : notice.body}
      </p>
      <div className="text-xs text-muted">{dateStr}</div>
    </div>
  )
}
