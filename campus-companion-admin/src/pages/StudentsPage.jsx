import React, { useRef, useState } from 'react'
import { AlertCircle, Download, Upload, Users, X } from 'lucide-react'
import api from '../api/client'

const TEMPLATE = [
  'StudentID,Name,Email,Department,Year,Semester,Contact',
  '02241241,Tenzin Dorji,tenzin@example.edu.bt,SOFTWARE_ENGINEERING,3,2,+97517000000',
].join('\n')

export default function StudentsPage() {
  const input = useRef(null)
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const downloadTemplate = () => {
    const url = URL.createObjectURL(new Blob([TEMPLATE], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = 'cst-student-import-template.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  const previewFile = async selected => {
    setFile(selected); setPreview(null); setMessage(''); setError(''); setBusy(true)
    const form = new FormData(); form.append('file', selected)
    try {
      const response = await api.post('/users/import-students?preview=true', form)
      setPreview(response.data ?? response)
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Could not preview this sheet.')
      setFile(null)
    } finally { setBusy(false) }
  }

  const confirmImport = async () => {
    if (!file || !preview?.valid?.length) return
    setBusy(true); setError('')
    const form = new FormData(); form.append('file', file)
    try {
      const response = await api.post('/users/import-students', form)
      setMessage(response.message)
      setFile(null); setPreview(null)
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Import failed.')
    } finally { setBusy(false) }
  }

  const close = () => { if (!busy) { setFile(null); setPreview(null); setError('') } }

  return <>
    <div className="page-header">
      <div><h1 className="page-title">Students</h1><div className="page-subtitle">Add new students or update student records from an Excel sheet</div></div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn btn-secondary" onClick={downloadTemplate}><Download size={15} /> Template</button>
        <button className="btn btn-primary" onClick={() => input.current?.click()}><Upload size={15} /> Import students</button>
        <input ref={input} hidden type="file" accept=".xlsx,.xls,.csv" onChange={event => { const selected = event.target.files?.[0]; if (selected) previewFile(selected); event.target.value = '' }} />
      </div>
    </div>
    <div className="page-body">
      <div className="card" style={{ padding: 24, maxWidth: 850 }}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
          <Users size={22} color="var(--navy)" />
          <div><h2 style={{ fontSize: 16, marginBottom: 8 }}>Bulk student registration</h2>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>Upload a CSV or Excel file with StudentID, Name, Email, Department, Year, and Semester columns. Contact is optional. Year must be 1–4 and semester 1 or 2. New accounts start with the student ID as their password; matching existing students are updated without changing their password.</p>
          </div>
        </div>
        {message && <div style={{ marginTop: 20, padding: 12, borderRadius: 8, background: 'var(--green-bg)', color: 'var(--green)', fontSize: 13 }}>{message}</div>}
        {error && <div className="error-alert" style={{ marginTop: 20 }}><AlertCircle size={14} />{error}</div>}
      </div>
    </div>

    {file && <div className="modal-overlay" onClick={event => event.target === event.currentTarget && close()}>
      <div className="modal" style={{ maxWidth: 900, maxHeight: '85vh', overflow: 'auto' }}>
        <div className="modal-header"><h2 className="modal-title">Student import preview</h2><button className="btn btn-ghost btn-icon btn-sm" onClick={close}><X size={16} /></button></div>
        <div className="modal-body">
          {busy && <p>Checking student records…</p>}
          {preview && <>
            <p>{preview.valid.length} valid rows · {preview.errors.length} issues. New rows create accounts; existing student IDs/emails update the matching student.</p>
            {!!preview.errors.length && <div style={{ color: 'var(--red)', marginBottom: 12 }}><strong>Rows needing correction</strong>{preview.errors.map((issue, i) => <div key={i}>Row {issue.row} · {issue.field}: {issue.message}</div>)}</div>}
            <div style={{ maxHeight: 360, overflow: 'auto' }}><table className="data-table"><thead><tr><th>Student ID</th><th>Name</th><th>Email</th><th>Department</th><th>Year</th><th>Semester</th><th>Action</th></tr></thead><tbody>{preview.valid.map((row, i) => <tr key={`${row.studentId}-${i}`}><td>{row.studentId}</td><td>{row.name}</td><td>{row.email}</td><td>{row.department}</td><td>{row.year}</td><td>{row.semester}</td><td>{row.action}</td></tr>)}</tbody></table></div>
          </>}
        </div>
        <div className="modal-footer"><button className="btn btn-ghost" disabled={busy} onClick={close}>Cancel</button><button className="btn btn-primary" disabled={busy || !preview?.valid?.length} onClick={confirmImport}>{busy ? 'Working…' : `Import ${preview?.valid?.length || 0} students`}</button></div>
      </div>
    </div>}
  </>
}
