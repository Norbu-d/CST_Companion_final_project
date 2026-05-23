import React, { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Pin, Plus, Pencil, Trash2, Megaphone, BookOpen, AlertTriangle, Info, Calendar, X, Search, Paperclip, Upload, FileText, Image as ImageIcon } from 'lucide-react'
import api, { uploadNoticeFile } from '../api/client'

// ─── Constants ────────────────────────────────────────────────────────────────

const DEPARTMENTS = [
  { value: 'SOFTWARE_ENGINEERING',        label: 'Software Engineering' },
  { value: 'INFORMATION_TECHNOLOGY',      label: 'Information Technology' },
  { value: 'ELECTRICAL_ENGINEERING',      label: 'Electrical Engineering' },
  { value: 'CIVIL_ENGINEERING',           label: 'Civil Engineering' },
  { value: 'MECHANICAL_ENGINEERING',      label: 'Mechanical Engineering' },
  { value: 'ELECTRONICS_ENGINEERING',     label: 'Electronics Engineering' },
  { value: 'INSTRUMENTATION_ENGINEERING', label: 'Instrumentation Engineering' },
  { value: 'ARCHITECTURE',               label: 'Architecture' },
  { value: 'WATER_RESOURCE_ENGINEERING',  label: 'Water Resource Engineering' },
  { value: 'GEOLOGY',                    label: 'Geology' },
]

function fmtDept(val) {
  return DEPARTMENTS.find(d => d.value === val)?.label ?? val?.replace(/_/g, ' ') ?? ''
}

const TARGET_TYPES = [
  { value: 'EVERYONE',   label: 'Everyone',           icon: '🌐' },
  { value: 'DEPARTMENT', label: 'Department',          icon: '🏛️' },
  { value: 'YEAR_GROUP', label: 'Year Group',          icon: '📅' },
  { value: 'ROLE_ONLY',  label: 'Role Only',           icon: '👤' },
]

const ROLE_OPTIONS = [
  { value: 'STUDENTS_ONLY',  label: 'Students Only' },
  { value: 'LECTURERS_ONLY', label: 'Lecturers Only' },
]

const CATEGORIES = ['General', 'Exam', 'Event', 'Maintenance', 'Holiday', 'Academic', 'Emergency']
const ICONS      = ['megaphone', 'book', 'alert', 'info', 'calendar']

const ICON_COMPONENTS = {
  megaphone: Megaphone,
  book:      BookOpen,
  alert:     AlertTriangle,
  info:      Info,
  calendar:  Calendar,
}

// Category → accent color
const CATEGORY_COLORS = {
  General:     { bg: 'rgba(26,60,110,0.08)',  color: '#1A3C6E' },
  Exam:        { bg: 'rgba(220,38,38,0.08)',   color: '#DC2626' },
  Event:       { bg: 'rgba(16,163,74,0.08)',   color: '#16A34A' },
  Maintenance: { bg: 'rgba(217,119,6,0.08)',   color: '#D97706' },
  Holiday:     { bg: 'rgba(234,179,8,0.08)',   color: '#CA8A04' },
  Academic:    { bg: 'rgba(37,99,235,0.08)',   color: '#2563EB' },
  Emergency:   { bg: 'rgba(239,68,68,0.10)',   color: '#EF4444' },
}

// ─── Target badge ─────────────────────────────────────────────────────────────

function TargetBadge({ notice }) {
  const { targetType, targetDepartment, targetYear, targetRole } = notice
  const base = {
    display: 'inline-flex', alignItems: 'center', gap: 4,
    fontSize: 11, fontWeight: 600,
    padding: '2px 8px', borderRadius: 99, whiteSpace: 'nowrap',
  }
  if (!targetType || targetType === 'EVERYONE')
    return <span style={{ ...base, background: 'rgba(26,60,110,0.08)', color: '#2A5298' }}>🌐 Everyone</span>
  if (targetType === 'DEPARTMENT')
    return <span style={{ ...base, background: 'rgba(37,99,235,0.10)', color: '#2563EB' }}>🏛️ {fmtDept(targetDepartment) || 'Dept'}</span>
  if (targetType === 'YEAR_GROUP')
    return <span style={{ ...base, background: 'rgba(16,163,74,0.10)', color: '#16A34A' }}>📅 Yr {targetYear} · {fmtDept(targetDepartment) || 'All'}</span>
  if (targetType === 'ROLE_ONLY')
    return <span style={{ ...base, background: 'rgba(217,119,6,0.10)', color: '#D97706' }}>{targetRole === 'STUDENTS_ONLY' ? '🎓 Students' : '👨‍🏫 Lecturers'}</span>
  return null
}

const ACCEPT_FILES = '.jpg,.jpeg,.png,.pdf,.doc,.docx'
const MAX_FILE_MB = 10

function formatBytes(bytes) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function fileIcon(fileType) {
  if (fileType === 'IMAGE') return ImageIcon
  return FileText
}

// ─── Notice Modal ─────────────────────────────────────────────────────────────

function NoticeModal({ notice, onClose, onSave, isSaving }) {
  const fileInputRef = useRef(null)
  const [existingAttachments, setExistingAttachments] = useState(notice?.attachments ?? [])
  const [newAttachments, setNewAttachments] = useState([])
  const [removeAttachmentIds, setRemoveAttachmentIds] = useState([])
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState(null)

  const [form, setForm] = useState({
    title:            notice?.title            ?? '',
    body:             notice?.body             ?? '',
    category:         notice?.category         ?? 'General',
    pinned:           notice?.pinned           ?? false,
    icon:             notice?.icon             ?? 'megaphone',
    targetType:       notice?.targetType       ?? 'EVERYONE',
    targetDepartment: notice?.targetDepartment ?? '',
    targetYear:       notice?.targetYear       ?? '',
    targetRole:       notice?.targetRole       ?? 'STUDENTS_ONLY',
  })

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const processFiles = async (fileList) => {
    if (!fileList?.length) return
    setUploadError(null)
    setUploading(true)
    try {
      const uploaded = []
      for (const file of fileList) {
        if (file.size > MAX_FILE_MB * 1024 * 1024) {
          throw new Error(`${file.name} exceeds ${MAX_FILE_MB} MB`)
        }
        uploaded.push(await uploadNoticeFile(file))
      }
      setNewAttachments(prev => [...prev, ...uploaded])
    } catch (err) {
      setUploadError(err.message || 'Upload failed')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const removeExisting = (id) => {
    setExistingAttachments(prev => prev.filter(a => a.id !== id))
    setRemoveAttachmentIds(prev => [...prev, id])
  }

  const removeNew = (index) => {
    setNewAttachments(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = () => {
    if (!form.title.trim() || !form.body.trim()) return
    onSave({
      title:    form.title.trim(),
      body:     form.body.trim(),
      category: form.category,
      pinned:   form.pinned,
      icon:     form.icon,
      targetType: form.targetType,
      targetDepartment: ['DEPARTMENT', 'YEAR_GROUP'].includes(form.targetType) ? (form.targetDepartment || null) : null,
      targetYear:       form.targetType === 'YEAR_GROUP' ? (parseInt(form.targetYear) || null) : null,
      targetRole:       form.targetType === 'ROLE_ONLY'  ? form.targetRole : null,
      attachments:           newAttachments.length ? newAttachments : undefined,
      removeAttachmentIds:   removeAttachmentIds.length ? removeAttachmentIds : undefined,
    })
  }

  const allFiles = [
    ...existingAttachments.map(a => ({ ...a, _existing: true })),
    ...newAttachments.map((a, i) => ({ ...a, _newIndex: i, _existing: false })),
  ]

  const IconComp = ICON_COMPONENTS[form.icon] ?? Megaphone
  const catColor = CATEGORY_COLORS[form.category] ?? CATEGORY_COLORS.General

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal"
        style={{ maxWidth: 580 }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header">
          <h2 className="modal-title">{notice ? 'Edit Notice' : 'New Notice'}</h2>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, borderRadius: 6, display: 'flex', alignItems: 'center' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

          {/* Title */}
          <div className="form-group">
            <label className="form-label">Title *</label>
            <input
              className="form-input"
              value={form.title}
              onChange={e => set('title', e.target.value)}
              placeholder="e.g. Semester Exam Timetable Released"
            />
          </div>

          {/* Body */}
          <div className="form-group">
            <label className="form-label">Body *</label>
            <textarea
              className="form-textarea"
              value={form.body}
              onChange={e => set('body', e.target.value)}
              placeholder="Write the full notice content here…"
              rows={4}
              style={{ padding: '10px 14px', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: 14, fontFamily: 'var(--font-body)', color: 'var(--text-primary)', background: 'var(--surface)', width: '100%', resize: 'vertical', minHeight: 100 }}
            />
          </div>

          {/* Category + Icon — 2 col */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Category</label>
              <select className="form-input" value={form.category} onChange={e => set('category', e.target.value)}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Icon</label>
              <select className="form-input" value={form.icon} onChange={e => set('icon', e.target.value)}>
                {ICONS.map(i => <option key={i} value={i}>{i.charAt(0).toUpperCase() + i.slice(1)}</option>)}
              </select>
            </div>
          </div>

          {/* Target audience */}
          <div className="form-group">
            <label className="form-label">Target Audience</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
              {TARGET_TYPES.map(t => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => set('targetType', t.value)}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                    padding: '10px 8px',
                    borderRadius: 'var(--radius-sm)',
                    border: form.targetType === t.value ? '2px solid var(--navy)' : '1.5px solid var(--border)',
                    background: form.targetType === t.value ? 'rgba(26,60,110,0.06)' : 'var(--surface)',
                    color: form.targetType === t.value ? 'var(--navy)' : 'var(--text-secondary)',
                    fontWeight: form.targetType === t.value ? 700 : 500,
                    fontSize: 12,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    fontFamily: 'var(--font-body)',
                  }}
                >
                  <span style={{ fontSize: 20 }}>{t.icon}</span>
                  <span style={{ textAlign: 'center', lineHeight: 1.3 }}>{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Conditional: Department */}
          {(form.targetType === 'DEPARTMENT' || form.targetType === 'YEAR_GROUP') && (
            <div className="form-group">
              <label className="form-label">Department</label>
              <select className="form-input" value={form.targetDepartment} onChange={e => set('targetDepartment', e.target.value)} required>
                <option value="">Select department</option>
                {DEPARTMENTS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
            </div>
          )}

          {/* Conditional: Year */}
          {form.targetType === 'YEAR_GROUP' && (
            <div className="form-group">
              <label className="form-label">Year</label>
              <select className="form-input" value={form.targetYear} onChange={e => set('targetYear', e.target.value)}>
                <option value="">Select year</option>
                {[1, 2, 3, 4].map(y => <option key={y} value={y}>Year {y}</option>)}
              </select>
            </div>
          )}

          {/* Conditional: Role */}
          {form.targetType === 'ROLE_ONLY' && (
            <div className="form-group">
              <label className="form-label">Role</label>
              <select className="form-input" value={form.targetRole} onChange={e => set('targetRole', e.target.value)}>
                {ROLE_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
          )}

          {/* Attachments */}
          <div className="form-group">
            <label className="form-label">Attachments (optional)</label>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 10px' }}>
              JPG, PNG, PDF, DOC, DOCX — max {MAX_FILE_MB} MB each
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPT_FILES}
              multiple
              style={{ display: 'none' }}
              onChange={e => processFiles(Array.from(e.target.files || []))}
            />
            <div
              role="button"
              tabIndex={0}
              onClick={() => !uploading && fileInputRef.current?.click()}
              onKeyDown={e => e.key === 'Enter' && fileInputRef.current?.click()}
              onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--navy)' }}
              onDragLeave={e => { e.currentTarget.style.borderColor = 'var(--border)' }}
              onDrop={e => {
                e.preventDefault()
                e.currentTarget.style.borderColor = 'var(--border)'
                processFiles(Array.from(e.dataTransfer.files || []))
              }}
              style={{
                border: '2px dashed var(--border)',
                borderRadius: 'var(--radius-sm)',
                padding: 24,
                textAlign: 'center',
                cursor: uploading ? 'wait' : 'pointer',
                background: 'var(--surface-2)',
                marginBottom: 12,
              }}
            >
              <Upload size={22} style={{ color: 'var(--text-muted)', marginBottom: 8 }} />
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>
                {uploading ? 'Uploading…' : 'Drop files here or click to browse'}
              </div>
            </div>
            {uploadError && (
              <p style={{ fontSize: 12, color: '#DC2626', marginBottom: 8 }}>{uploadError}</p>
            )}
            {allFiles.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {allFiles.map((att) => {
                  const Icon = fileIcon(att.fileType)
                  const key = att.id ?? `new-${att._newIndex}`
                  return (
                    <div
                      key={key}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '10px 12px', borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border)', background: 'var(--surface)',
                      }}
                    >
                      {att.fileType === 'IMAGE' ? (
                        <img src={att.fileUrl} alt="" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 6 }} />
                      ) : (
                        <div style={{ width: 40, height: 40, borderRadius: 6, background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Icon size={18} color="var(--navy)" />
                        </div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{att.fileName}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{att.fileType} · {formatBytes(att.fileSize)}</div>
                      </div>
                      <button
                        type="button"
                        className="btn btn-sm btn-ghost"
                        onClick={() => att._existing ? removeExisting(att.id) : removeNew(att._newIndex)}
                        style={{ padding: 6 }}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Pinned toggle */}
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--border)', background: form.pinned ? 'rgba(244,166,35,0.06)' : 'var(--surface)', borderColor: form.pinned ? 'var(--gold)' : 'var(--border)', marginBottom: 16 }}>
            <input type="checkbox" checked={form.pinned} onChange={e => set('pinned', e.target.checked)} style={{ accentColor: 'var(--gold)', width: 16, height: 16 }} />
            <span style={{ fontSize: 14, fontWeight: 600, color: form.pinned ? '#B77A10' : 'var(--text-secondary)' }}>📌 Pin this notice to the top</span>
          </label>

          {/* Preview strip */}
          <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: catColor.bg, color: catColor.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <IconComp size={17} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{form.title || 'Notice title preview'}</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11, fontWeight: 600, padding: '1px 8px', borderRadius: 99, background: catColor.bg, color: catColor.color }}>{form.category}</span>
                <TargetBadge notice={form} />
                {form.pinned && <span style={{ fontSize: 11, fontWeight: 600, padding: '1px 8px', borderRadius: 99, background: 'rgba(244,166,35,0.12)', color: '#B77A10' }}>📌 Pinned</span>}
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={!form.title.trim() || !form.body.trim() || isSaving || uploading}
          >
            {isSaving ? 'Saving…' : notice ? 'Save Changes' : 'Publish Notice'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Delete Modal ─────────────────────────────────────────────────────────────

function DeleteModal({ onClose, onConfirm, isDeleting }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Delete Notice</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, display: 'flex', alignItems: 'center' }}>
            <X size={20} />
          </button>
        </div>
        <div className="modal-body">
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6 }}>
            Are you sure you want to delete this notice? This action cannot be undone.
          </p>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-danger" onClick={onConfirm} disabled={isDeleting}>
            {isDeleting ? 'Deleting…' : 'Delete Notice'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Notice Card ──────────────────────────────────────────────────────────────

function NoticeCard({ notice, onEdit, onDelete }) {
  const IconComp = ICON_COMPONENTS[notice.icon] ?? Megaphone
  const catColor = CATEGORY_COLORS[notice.category] ?? CATEGORY_COLORS.General
  const date = new Date(notice.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

  return (
    <div
      className="notice-card"
      style={{
        background: 'var(--surface)',
        border: notice.pinned ? '1.5px solid rgba(244,166,35,0.5)' : '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        padding: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 0,
        position: 'relative',
        overflow: 'hidden',
        transition: 'box-shadow 0.2s, transform 0.2s',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      {/* Pinned colour strip */}
      {notice.pinned && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'var(--gold)', borderRadius: '12px 12px 0 0' }} />
      )}

      {/* Card header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12, marginTop: notice.pinned ? 6 : 0 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: catColor.bg, color: catColor.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <IconComp size={18} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.4, marginBottom: 6, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
            {notice.title}
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 99, background: catColor.bg, color: catColor.color }}>{notice.category}</span>
            <TargetBadge notice={notice} />
            {notice.pinned && <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 99, background: 'rgba(244,166,35,0.12)', color: '#B77A10' }}>📌 Pinned</span>}
            {notice.attachments?.length > 0 && (
              <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 99, background: 'rgba(37,99,235,0.10)', color: '#2563EB', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <Paperclip size={10} /> {notice.attachments.length}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Body */}
      <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.65, marginBottom: 14, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>
        {notice.body}
      </p>

      {/* Footer */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: 12, borderTop: '1px solid var(--border)' }}>
        <div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{date}</div>
          {notice.sentBy && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>by {notice.sentBy.name}</div>}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn btn-sm btn-ghost" onClick={onEdit} style={{ padding: '5px 10px' }}>
            <Pencil size={13} /> Edit
          </button>
          <button className="btn btn-sm btn-danger" onClick={onDelete} style={{ padding: '5px 10px' }}>
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function NoticesPage() {
  const qc = useQueryClient()
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [targetFilter,   setTargetFilter]   = useState('All')
  const [search,         setSearch]         = useState('')
  const [modalOpen,      setModalOpen]      = useState(false)
  const [editingNotice,  setEditingNotice]  = useState(null)
  const [deleteId,       setDeleteId]       = useState(null)

  const { data, isLoading } = useQuery({
    queryKey: ['notices'],
    queryFn:  () => api.get('/notices'),
  })

  const notices = data?.data ?? []

  const categories  = ['All', ...new Set(notices.map(n => n.category))]
  const targetTypes = ['All', 'EVERYONE', 'DEPARTMENT', 'YEAR_GROUP', 'ROLE_ONLY']

  const filtered = notices.filter(n => {
    const catOk    = categoryFilter === 'All' || n.category === categoryFilter
    const targetOk = targetFilter   === 'All' || (n.targetType ?? 'EVERYONE') === targetFilter
    const searchOk = !search || n.title.toLowerCase().includes(search.toLowerCase()) || n.body.toLowerCase().includes(search.toLowerCase())
    return catOk && targetOk && searchOk
  })

  const pinned   = filtered.filter(n => n.pinned)
  const unpinned = filtered.filter(n => !n.pinned)

  const createMut = useMutation({
    mutationFn: (body) => api.post('/notices', body),
    onSuccess:  () => { qc.invalidateQueries(['notices']); setModalOpen(false) },
  })

  const updateMut = useMutation({
    mutationFn: ({ id, body }) => api.patch(`/notices/${id}`, body),
    onSuccess:  () => { qc.invalidateQueries(['notices']); setEditingNotice(null) },
  })

  const deleteMut = useMutation({
    mutationFn: (id) => api.delete(`/notices/${id}`),
    onSuccess:  () => { qc.invalidateQueries(['notices']); setDeleteId(null) },
  })

  const handleSave = (payload) => {
    if (editingNotice) updateMut.mutate({ id: editingNotice.id, body: payload })
    else               createMut.mutate(payload)
  }

  const openCreate = () => { setEditingNotice(null); setModalOpen(true) }
  const openEdit   = (n) => { setEditingNotice(n);   setModalOpen(true) }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* ── Page header ── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Notice Board</h1>
          <p className="page-subtitle">{notices.length} notice{notices.length !== 1 ? 's' : ''} published</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          <Plus size={16} /> New Notice
        </button>
      </div>

      {/* ── Page body ── */}
      <div className="page-body" style={{ flex: 1, overflowY: 'auto' }}>

        {/* Toolbar: search + filters */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>

          {/* Search */}
          <div className="search-wrap">
            <Search className="search-icon" size={16} />
            <input
              className="search-input"
              style={{ width: '100%' }}
              placeholder="Search notices…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {/* Category filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', flexShrink: 0 }}>Category:</span>
            <div className="filter-tabs">
              {categories.map(c => (
                <button key={c} className={`filter-tab ${categoryFilter === c ? 'active' : ''}`} onClick={() => setCategoryFilter(c)}>{c}</button>
              ))}
            </div>
          </div>

          {/* Target filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', flexShrink: 0 }}>Target:</span>
            <div className="filter-tabs">
              {targetTypes.map(t => (
                <button key={t} className={`filter-tab ${targetFilter === t ? 'active' : ''}`} onClick={() => setTargetFilter(t)}>
                  {t === 'All' ? 'All' : TARGET_TYPES.find(tt => tt.value === t)?.label ?? t}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="loading-center"><div className="spinner" /></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon"><Megaphone size={22} /></div>
            <div className="empty-title">No notices found</div>
            <div className="empty-body">Try adjusting the filters or create a new notice.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

            {/* Pinned */}
            {pinned.length > 0 && (
              <section>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <Pin size={13} style={{ color: 'var(--gold)' }} />
                  <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)' }}>Pinned</span>
                  <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                </div>
                <div className="notice-grid">
                  {pinned.map(n => <NoticeCard key={n.id} notice={n} onEdit={() => openEdit(n)} onDelete={() => setDeleteId(n.id)} />)}
                </div>
              </section>
            )}

            {/* Regular */}
            {unpinned.length > 0 && (
              <section>
                {pinned.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                    <Megaphone size={13} style={{ color: 'var(--text-muted)' }} />
                    <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)' }}>Recent</span>
                    <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                  </div>
                )}
                <div className="notice-grid">
                  {unpinned.map(n => <NoticeCard key={n.id} notice={n} onEdit={() => openEdit(n)} onDelete={() => setDeleteId(n.id)} />)}
                </div>
              </section>
            )}

          </div>
        )}
      </div>

      {/* ── Create / Edit modal ── */}
      {modalOpen && (
        <NoticeModal
          notice={editingNotice}
          onClose={() => { setModalOpen(false); setEditingNotice(null) }}
          onSave={handleSave}
          isSaving={createMut.isPending || updateMut.isPending}
        />
      )}

      {/* ── Delete confirm modal ── */}
      {deleteId && (
        <DeleteModal
          onClose={() => setDeleteId(null)}
          onConfirm={() => deleteMut.mutate(deleteId)}
          isDeleting={deleteMut.isPending}
        />
      )}

    </div>
  )
}