import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus, Pencil, Trash2, X, Calendar,
  BookOpen, FlaskConical, GraduationCap, Wrench, UserX, ChevronDown,
  AlertCircle, CheckCircle2,
} from 'lucide-react'
import api from '../api/client'

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

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const CLASS_TYPES = ['Lecture', 'Lab', 'Tutorial', 'Workshop']

const TYPE_META = {
  Lecture:  { icon: BookOpen,      bg: '#EFF6FF', text: '#1d4ed8', bar: '#2563EB' },
  Lab:      { icon: FlaskConical,  bg: '#ecfeff', text: '#0e7490', bar: '#06b6d4' },
  Tutorial: { icon: GraduationCap, bg: '#f5f3ff', text: '#6d28d9', bar: '#7c3aed' },
  Workshop: { icon: Wrench,        bg: '#fffbeb', text: '#b45309', bar: '#d97706' },
}

const YEARS     = [1, 2, 3, 4]
const SEMESTERS = [1, 2]

// Default form — day is passed in dynamically when opening from a column
const makeEmptyForm = (day = 'Monday') => ({
  day,
  time:       '',
  subject:    '',
  room:       '',
  type:       'Lecture',
  lecturerId: '',
})

function fmtDept(val) {
  return DEPARTMENTS.find(d => d.value === val)?.label ?? val?.replace(/_/g, ' ') ?? ''
}

// ─── Toast ────────────────────────────────────────────────────────────────────

function Toast({ message, type = 'error', onClose }) {
  React.useEffect(() => {
    const t = setTimeout(onClose, 4000)
    return () => clearTimeout(t)
  }, [onClose])

  const isError = type === 'error'
  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
      background: isError ? 'var(--red-bg)' : 'var(--green-bg)',
      border: `1px solid ${isError ? 'rgba(220,38,38,0.25)' : 'rgba(22,163,74,0.25)'}`,
      color: isError ? 'var(--red)' : 'var(--green)',
      borderRadius: 'var(--radius-sm)',
      padding: '12px 16px',
      display: 'flex', alignItems: 'center', gap: 10,
      fontSize: 13, fontWeight: 600,
      boxShadow: 'var(--shadow-lg)',
      animation: 'slideUp 0.25s ease',
      maxWidth: 340,
    }}>
      {isError ? <AlertCircle size={15} /> : <CheckCircle2 size={15} />}
      <span>{message}</span>
      <button
        onClick={onClose}
        style={{
          marginLeft: 'auto', background: 'none', border: 'none',
          cursor: 'pointer', color: 'inherit', padding: 2,
          display: 'flex', alignItems: 'center',
        }}
      >
        <X size={13} />
      </button>
    </div>
  )
}

// ─── Select ───────────────────────────────────────────────────────────────────

function Sel({ value, onChange, options, placeholder }) {
  return (
    <div style={{ position: 'relative' }}>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="form-select"
        style={{ paddingRight: 32, appearance: 'none', WebkitAppearance: 'none' }}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(o => (
          <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>
        ))}
      </select>
      <ChevronDown size={14} style={{
        position: 'absolute', right: 10, top: '50%',
        transform: 'translateY(-50%)', pointerEvents: 'none',
        color: 'var(--text-muted)',
      }} />
    </div>
  )
}

// ─── Class Card ───────────────────────────────────────────────────────────────

function ClassCard({ entry, onEdit, onDelete }) {
  const meta = TYPE_META[entry.type] ?? TYPE_META.Lecture
  const Icon = meta.icon

  return (
    <div
      style={{
        background: '#fff', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-sm)', borderLeft: `3px solid ${meta.bar}`,
        padding: '10px 12px', marginBottom: 8, boxShadow: 'var(--shadow-sm)',
        transition: 'box-shadow 0.15s, transform 0.15s',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.boxShadow = 'var(--shadow)'
        e.currentTarget.style.transform = 'translateY(-1px)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow = 'var(--shadow-sm)'
        e.currentTarget.style.transform = 'none'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          background: meta.bg, color: meta.text,
          borderRadius: 99, padding: '2px 8px', fontSize: 10, fontWeight: 700,
        }}>
          <Icon size={9} />
          {entry.type}
        </div>
        <div style={{ display: 'flex', gap: 2 }}>
          <button
            onClick={() => onEdit(entry)}
            className="btn btn-ghost btn-icon btn-sm"
            style={{ padding: '3px 5px', border: 'none' }}
            title="Edit entry"
          >
            <Pencil size={11} />
          </button>
          <button
            onClick={() => onDelete(entry.id)}
            className="btn btn-icon btn-sm"
            style={{
              padding: '3px 5px', background: 'none',
              border: 'none', color: 'var(--text-muted)',
              cursor: 'pointer',
            }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--red)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
            title="Delete entry"
          >
            <Trash2 size={11} />
          </button>
        </div>
      </div>

      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 5, lineHeight: 1.3 }}>
        {entry.subject}
      </div>

      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>
        🕐 {entry.time} &nbsp;·&nbsp; 📍 {entry.room}
      </div>

      {entry.lecturer ? (
        <div style={{
          fontSize: 11, color: 'var(--text-secondary)',
          borderTop: '1px solid var(--border)', paddingTop: 6, marginTop: 4,
          display: 'flex', alignItems: 'center', gap: 5,
        }}>
          <div style={{
            width: 18, height: 18, borderRadius: '50%',
            background: 'var(--navy)', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 8, fontWeight: 700, flexShrink: 0,
          }}>
            {entry.lecturer.name?.charAt(0)}
          </div>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {entry.lecturer.name}
          </span>
        </div>
      ) : (
        <div style={{
          fontSize: 10, color: 'var(--amber)', fontWeight: 600,
          borderTop: '1px solid var(--border)', paddingTop: 6, marginTop: 4,
          display: 'flex', alignItems: 'center', gap: 4,
        }}>
          <UserX size={10} /> Unassigned
        </div>
      )}
    </div>
  )
}

// ─── Delete Confirm Modal ─────────────────────────────────────────────────────

function DeleteConfirmModal({ onConfirm, onCancel, isPending }) {
  return (
    <div
      className="modal-overlay"
      onClick={e => e.target === e.currentTarget && onCancel()}
    >
      <div className="modal" style={{ maxWidth: 400 }}>
        <div className="modal-header">
          <h2 className="modal-title" style={{ fontSize: 18 }}>Delete Class Entry</h2>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onCancel}><X size={16} /></button>
        </div>
        <div className="modal-body">
          <div style={{
            display: 'flex', gap: 14, alignItems: 'flex-start',
            background: 'var(--red-bg)', border: '1px solid rgba(220,38,38,0.2)',
            borderRadius: 'var(--radius-sm)', padding: '14px 16px',
          }}>
            <AlertCircle size={18} style={{ color: 'var(--red)', flexShrink: 0, marginTop: 1 }} />
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Are you sure you want to delete this class entry? This action
              <strong style={{ color: 'var(--text-primary)' }}> cannot be undone</strong>.
            </p>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onCancel} disabled={isPending}>
            Cancel
          </button>
          <button
            className="btn btn-danger"
            onClick={onConfirm}
            disabled={isPending}
            style={{ background: 'var(--red)', color: '#fff' }}
          >
            {isPending
              ? <div className="spinner" style={{ width: 14, height: 14, borderWidth: 2, borderTopColor: '#fff' }} />
              : <><Trash2 size={13} /> Delete</>
            }
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Entry Modal ──────────────────────────────────────────────────────────────

function EntryModal({ entry, department, year, semester, academicYear, lecturers, onClose }) {
  const qc     = useQueryClient()

  // entry can be:
  //   null                   → new entry (no day pre-fill)
  //   { _new: true, day }    → new entry pre-filled with a day from a column button
  //   { id, day, … }         → existing entry being edited
  const isEdit = !!(entry && entry.id)

  const [form, setForm] = useState(() => {
    if (isEdit) {
      // Editing an existing entry
      return {
        day:        entry.day,
        time:       entry.time,
        subject:    entry.subject,
        room:       entry.room,
        type:       entry.type,
        // Ensure lecturerId is always a string for the <select>
        lecturerId: entry.lecturerId != null ? String(entry.lecturerId) : '',
      }
    }
    // New entry — pre-fill day if provided via column button
    return makeEmptyForm(entry?._new ? entry.day : 'Monday')
  })

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const { mutate, isPending, isError } = useMutation({
    mutationFn: (data) => isEdit
      ? api.patch(`/schedule/${entry.id}`, data)
      : api.post('/schedule', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['schedule-admin', department, year] })
      onClose()
    },
  })

  const canSubmit = form.time.trim() && form.subject.trim() && form.room.trim()

  const handleSubmit = () => {
    if (!canSubmit || isPending) return
    mutate({
      department,
      year:        Number(year),
      // Coerce to number — semester state comes from parseInt but double-check
      semester:    Number(semester),
      academicYear,
      day:         form.day,
      time:        form.time.trim(),
      subject:     form.subject.trim(),
      room:        form.room.trim(),
      type:        form.type,
      // Send null when unassigned so the backend clears the relation
      lecturerId:  form.lecturerId ? parseInt(form.lecturerId, 10) : null,
    })
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 500 }}>
        <div className="modal-header">
          <h2 className="modal-title">{isEdit ? 'Edit Class Entry' : 'Add Class Entry'}</h2>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}><X size={16} /></button>
        </div>

        <div className="modal-body">
          {/* Context banner */}
          <div style={{
            background: 'rgba(26,60,110,0.05)', border: '1px solid rgba(26,60,110,0.12)',
            borderRadius: 'var(--radius-sm)', padding: '10px 14px',
            fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20,
            display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
          }}>
            <span style={{ color: 'var(--navy)', fontWeight: 700 }}>{fmtDept(department)}</span>
            <span style={{ color: 'var(--border-strong)' }}>—</span>
            <span>Year {year}, Semester {semester}</span>
            <span style={{ color: 'var(--text-muted)', marginLeft: 4 }}>({academicYear})</span>
          </div>

          {/* Day + Type */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Day</label>
              <Sel value={form.day} onChange={v => set('day', v)} options={DAYS.map(d => ({ value: d, label: d }))} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Class Type</label>
              <Sel value={form.type} onChange={v => set('type', v)} options={CLASS_TYPES.map(t => ({ value: t, label: t }))} />
            </div>
          </div>

          {/* Time */}
          <div className="form-group">
            <label className="form-label">
              Time
              <span style={{ fontWeight: 400, color: 'var(--text-muted)', marginLeft: 6, fontSize: 12 }}>
                e.g. 08:00–09:50
              </span>
            </label>
            <input
              className="form-input"
              value={form.time}
              onChange={e => set('time', e.target.value)}
              placeholder="08:00–09:50"
            />
          </div>

          {/* Subject + Room */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Subject</label>
              <input
                className="form-input"
                value={form.subject}
                onChange={e => set('subject', e.target.value)}
                placeholder="e.g. Database Systems"
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Room / Lab</label>
              <input
                className="form-input"
                value={form.room}
                onChange={e => set('room', e.target.value)}
                placeholder="e.g. Lab 2"
              />
            </div>
          </div>

          {/* Lecturer */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Assign Lecturer</label>
            <Sel
              value={form.lecturerId}
              onChange={v => set('lecturerId', v)}
              placeholder="— Leave unassigned —"
              options={lecturers.map(l => ({
                value: String(l.id),
                label: `${l.name}${l.designation ? ` · ${l.designation.replace(/_/g, ' ')}` : ''}`,
              }))}
            />
            {lecturers.length === 0 && (
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 5 }}>
                No lecturers found in {fmtDept(department)}.
              </p>
            )}
          </div>

          {isError && (
            <div className="error-alert" style={{ marginTop: 16, marginBottom: 0 }}>
              <AlertCircle size={14} />
              Could not save entry. Please check all fields and try again.
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose} disabled={isPending}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={isPending || !canSubmit}
          >
            {isPending
              ? <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2, borderTopColor: '#fff' }} />
              : isEdit ? 'Save Changes' : 'Add Class'
            }
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SchedulePage() {
  const qc = useQueryClient()

  const [department,   setDepartment]   = useState('SOFTWARE_ENGINEERING')
  const [year,         setYear]         = useState(3)
  const [semester,     setSemester]     = useState(1)
  const [academicYear, setAcademicYear] = useState('2025-26')

  // modal state:
  //   null                    → closed
  //   'new'                   → new entry, no day pre-fill (from page-header button)
  //   { _new: true, day }     → new entry pre-filled for a specific day column
  //   { id, day, … }          → edit existing entry
  const [modal,        setModal]        = useState(null)

  // Confirm-delete state: holds the id to delete, or null
  const [deleteTarget, setDeleteTarget] = useState(null)

  // Toast notifications
  const [toast, setToast] = useState(null) // { message, type }

  const showToast = (message, type = 'error') => setToast({ message, type })

  // ── Fetch schedule entries ──────────────────────────────────────────────────
  const { data: allEntries = [], isLoading } = useQuery({
    queryKey: ['schedule-admin', department, year],
    queryFn:  async () => {
      const res = await api.get(`/schedule/department/${department}/year/${year}`)
      return res.data.data ?? res.data ?? []
    },
  })

  // Filter by semester client-side.
  // IMPORTANT: compare as numbers — the API returns semester as a number,
  // and our semester state is also a number (via parseInt), so === is safe.
  const schedule = allEntries.filter(s => Number(s.semester) === Number(semester))

  // ── Fetch lecturers for this department ────────────────────────────────────
  const { data: lecturers = [] } = useQuery({
    queryKey: ['lecturers-dept', department],
    queryFn:  async () => {
      const res = await api.get('/contacts')
      const all = res.data.data ?? res.data ?? []
      return all.filter(l => l.department === department)
    },
  })

  // ── Delete mutation ────────────────────────────────────────────────────────
  const { mutate: deleteEntry, isPending: isDeleting } = useMutation({
    mutationFn: (id) => api.delete(`/schedule/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['schedule-admin', department, year] })
      setDeleteTarget(null)
      showToast('Class entry deleted successfully.', 'success')
    },
    onError: () => {
      setDeleteTarget(null)
      showToast('Could not delete this entry. It may be referenced elsewhere or a network error occurred.')
    },
  })

  // Opens the confirm modal instead of window.confirm
  const handleDeleteRequest = (id) => setDeleteTarget(id)
  const handleDeleteConfirm = () => { if (deleteTarget) deleteEntry(deleteTarget) }
  const handleDeleteCancel  = () => setDeleteTarget(null)

  // ── Group by day ───────────────────────────────────────────────────────────
  const byDay        = DAYS.reduce((acc, d) => { acc[d] = schedule.filter(s => s.day === d); return acc }, {})
  const totalEntries = schedule.length
  const unassigned   = schedule.filter(s => !s.lecturerId).length

  return (
    <>
      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Schedule Management</h1>
          <div className="page-subtitle">Build timetables and assign lecturers to each class session</div>
        </div>
        <button className="btn btn-primary" onClick={() => setModal('new')}>
          <Plus size={15} /> Add Class
        </button>
      </div>

      <div className="page-body">

        {/* ── Filter bar ───────────────────────────────────────────────────── */}
        <div className="card" style={{ padding: '18px 24px', marginBottom: 24 }}>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'flex-end' }}>

            <div className="form-group" style={{ marginBottom: 0, flex: '1 1 200px' }}>
              <label className="form-label">Department</label>
              <Sel value={department} onChange={setDepartment} options={DEPARTMENTS} />
            </div>

            <div className="form-group" style={{ marginBottom: 0, width: 105 }}>
              <label className="form-label">Year</label>
              <Sel
                value={String(year)}
                onChange={v => setYear(parseInt(v, 10))}
                options={YEARS.map(y => ({ value: String(y), label: `Year ${y}` }))}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0, width: 120 }}>
              <label className="form-label">Semester</label>
              <Sel
                value={String(semester)}
                onChange={v => setSemester(parseInt(v, 10))}
                options={SEMESTERS.map(s => ({ value: String(s), label: `Semester ${s}` }))}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0, width: 110 }}>
              <label className="form-label">Academic Year</label>
              <input
                className="form-input"
                value={academicYear}
                onChange={e => setAcademicYear(e.target.value)}
                placeholder="2025-26"
              />
            </div>

            {/* Summary badges */}
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, alignItems: 'center', paddingBottom: 1 }}>
              <span className="badge badge-navy">
                <Calendar size={11} />
                {totalEntries} {totalEntries === 1 ? 'class' : 'classes'}
              </span>
              {unassigned > 0 && (
                <span className="badge" style={{ background: 'var(--amber-bg)', color: 'var(--amber)' }}>
                  <UserX size={11} /> {unassigned} unassigned
                </span>
              )}
            </div>

          </div>
        </div>

        {/* ── Timetable grid ───────────────────────────────────────────────── */}
        {isLoading ? (
          <div className="loading-center"><div className="spinner" /></div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12 }}>
              {DAYS.map(day => {
                const entries = byDay[day]
                return (
                  <div key={day}>
                    {/* Day header */}
                    <div style={{
                      background: 'var(--navy-dark)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '9px 12px', marginBottom: 10,
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}>
                      <span style={{ fontWeight: 700, fontSize: 13, color: '#fff', letterSpacing: '0.03em' }}>
                        {day.slice(0, 3)}
                      </span>
                      {entries.length > 0 && (
                        <span style={{
                          background: 'rgba(244,166,35,0.2)', color: 'var(--gold)',
                          fontSize: 10, fontWeight: 700, borderRadius: 99, padding: '1px 7px',
                        }}>
                          {entries.length}
                        </span>
                      )}
                    </div>

                    {entries.map(entry => (
                      <ClassCard
                        key={entry.id}
                        entry={entry}
                        onEdit={setModal}
                        onDelete={handleDeleteRequest}
                      />
                    ))}

                    {/* Add class button — passes day context so modal pre-selects it */}
                    <button
                      onClick={() => setModal({ _new: true, day })}
                      style={{
                        width: '100%',
                        border: '1.5px dashed var(--border-strong)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '9px 0',
                        background: 'transparent', cursor: 'pointer',
                        color: 'var(--text-muted)', fontSize: 12,
                        fontFamily: 'var(--font-body)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                        transition: 'all 0.15s',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.borderColor = 'var(--navy)'
                        e.currentTarget.style.color = 'var(--navy)'
                        e.currentTarget.style.background = 'rgba(26,60,110,0.04)'
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.borderColor = 'var(--border-strong)'
                        e.currentTarget.style.color = 'var(--text-muted)'
                        e.currentTarget.style.background = 'transparent'
                      }}
                    >
                      <Plus size={12} /> Add class
                    </button>
                  </div>
                )
              })}
            </div>

            {totalEntries === 0 && (
              <div className="empty-state" style={{ marginTop: 32 }}>
                <div className="empty-icon"><Calendar size={22} /></div>
                <div className="empty-title">No classes yet</div>
                <div className="empty-body">
                  Add classes for <strong>{fmtDept(department)}</strong>,
                  Year {year}, Semester {semester}.
                </div>
                <button
                  className="btn btn-primary"
                  style={{ marginTop: 16 }}
                  onClick={() => setModal('new')}
                >
                  <Plus size={14} /> Add First Class
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Entry modal (add / edit) ──────────────────────────────────────── */}
      {modal && (
        <EntryModal
          // When modal === 'new' pass null; otherwise pass the object as-is
          entry={modal === 'new' ? null : modal}
          department={department}
          year={year}
          semester={semester}
          academicYear={academicYear}
          lecturers={lecturers}
          onClose={() => setModal(null)}
        />
      )}

      {/* ── Delete confirm modal ──────────────────────────────────────────── */}
      {deleteTarget !== null && (
        <DeleteConfirmModal
          onConfirm={handleDeleteConfirm}
          onCancel={handleDeleteCancel}
          isPending={isDeleting}
        />
      )}

      {/* ── Toast notification ────────────────────────────────────────────── */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </>
  )
}