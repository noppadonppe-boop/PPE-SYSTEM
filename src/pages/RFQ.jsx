import React, { useState, useMemo, useRef } from 'react'
import {
  Plus, Eye, Search, Trash2, CheckCircle, XCircle, ArrowRight,
  Calculator, Users, DollarSign, ClipboardList, FileText,
  ChevronRight, InboxIcon, ClipboardCheck, BadgeCheck,
  Pencil, Link2, Upload, Image, MessageSquare,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import Modal from '../components/ui/Modal'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import StatusBadge from '../components/ui/StatusBadge'

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatIDR(v) {
  if (!v && v !== 0) return '—'
  return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 }).format(v)
}

const URGENCY_CLS = {
  Urgent: 'bg-red-100 text-red-700',
  High:   'bg-orange-100 text-orange-700',
  Normal: 'bg-slate-100 text-slate-600',
  Low:    'bg-green-100 text-green-700',
}

// ─── Stage stepper ───────────────────────────────────────────────────────────

const STAGES = ['Request', 'Lead Review', 'Manhour Plan', 'Cost Estimate', 'Approval']

function stageName(status) {
  if (['Pending Lead', 'Returned', 'Need Clarify'].includes(status)) return 0
  if (['Pending MH'].includes(status))                               return 1
  if (['Pending Manager'].includes(status))                          return 2
  if (['Pending Approval'].includes(status))                         return 3
  if (['Approved to Process', 'Approved', 'Rejected', 'Cancelled'].includes(status)) return 4
  return -1
}

function Stepper({ status }) {
  const active = stageName(status)
  if (active < 0) return null
  const isReturned = status === 'Returned'
  return (
    <div className="flex items-center gap-0 mb-4">
      {STAGES.map((s, i) => (
        <React.Fragment key={s}>
          <div className="flex flex-col items-center">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors ${
              isReturned && i === 0 ? 'bg-orange-500 border-orange-500 text-white'
              : i < active  ? 'bg-green-500 border-green-500 text-white'
              : i === active ? 'bg-blue-600 border-blue-600 text-white'
              : 'bg-white border-slate-300 text-slate-400'
            }`}>{i < active && !isReturned ? '✓' : i + 1}</div>
            <span className={`text-[10px] mt-1 font-medium ${
              isReturned && i === 0 ? 'text-orange-500'
              : i === active ? 'text-blue-600'
              : i < active ? 'text-green-600'
              : 'text-slate-400'
            }`}>{s}</span>
          </div>
          {i < STAGES.length - 1 && (
            <div className={`flex-1 h-0.5 mx-1 mb-4 ${i < active && !isReturned ? 'bg-green-400' : 'bg-slate-200'}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  )
}

// ─── Stage 2A: Lead Receive Form ─────────────────────────────────────────────

function LeadReceiveForm({ rfq, onAccept, onReturn, onClose }) {
  const [receivedDate, setReceivedDate] = useState(rfq.receivedDate || new Date().toISOString().split('T')[0])
  const [note, setNote] = useState(rfq.leadNote || '')
  const [noteErr, setNoteErr] = useState('')

  const handleReturn = () => {
    if (!note.trim()) { setNoteErr('Note is required when returning to requestor'); return }
    setNoteErr('')
    onReturn({ receivedDate, leadNote: note, status: 'Returned' })
  }

  const handleAccept = () => {
    setNoteErr('')
    onAccept({ receivedDate, leadNote: note, status: 'Pending MH' })
  }

  return (
    <div className="px-6 py-5 space-y-5">

      {/* RFQ Summary Card */}
      <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-2">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Request Summary</p>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div><p className="text-xs text-slate-400">Work No.</p><p className="font-semibold text-slate-800">{rfq.requestWorkNo}</p></div>
          <div><p className="text-xs text-slate-400">Type of Service</p><p className="font-semibold text-slate-800">{rfq.serviceType || rfq.type}</p></div>
          <div><p className="text-xs text-slate-400">Requestor</p><p className="font-semibold text-slate-800">{rfq.requestor || rfq.client}</p></div>
          <div><p className="text-xs text-slate-400">Date Requested</p><p className="font-semibold text-slate-800">{rfq.dateRequest || rfq.submittedAt}</p></div>
          <div><p className="text-xs text-slate-400">S1 : สถานที่ทำงาน</p><p className="font-semibold text-slate-800">{rfq.s1Location || '—'}</p></div>
          <div><p className="text-xs text-slate-400">S2 : ประเภทงาน</p><p className="font-semibold text-slate-800">{rfq.s2WorkType || '—'}</p></div>
        </div>
        {rfq.s3WorkKind && (
          <div><p className="text-xs text-slate-400">S3 : ชนิดงาน</p><p className="text-sm font-semibold text-slate-800">{rfq.s3WorkKind}</p></div>
        )}
        {rfq.details && (
          <div><p className="text-xs text-slate-400 mt-1">Scope of Work</p>
            <p className="text-xs text-slate-700 bg-white border border-slate-200 rounded-lg p-2 mt-1">{rfq.details}</p></div>
        )}
      </div>

      {/* Return note banner (if previously returned) */}
      {rfq.status === 'Returned' && rfq.leadNote && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg px-4 py-3">
          <p className="text-xs font-semibold text-orange-700 mb-1">Previously returned with note:</p>
          <p className="text-xs text-orange-600">{rfq.leadNote}</p>
        </div>
      )}

      {/* Received Date */}
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1">Received Date <span className="text-red-500">*</span></label>
        <input type="date" value={receivedDate} onChange={e => setReceivedDate(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200" />
      </div>

      {/* Note */}
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1">
          Note <span className="text-slate-400 font-normal">(required if returning to requestor)</span>
        </label>
        <textarea rows={3} value={note} onChange={e => { setNote(e.target.value); setNoteErr('') }}
          placeholder="Add clarification requests, missing info, or acceptance remarks…"
          className={`w-full px-3 py-2 text-sm border rounded-lg outline-none resize-none transition-colors ${
            noteErr ? 'border-red-400 bg-red-50' : 'border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-200'
          }`} />
        {noteErr && <p className="text-xs text-red-500 mt-1">{noteErr}</p>}
      </div>

      <div className="flex justify-between gap-3 pt-2 border-t border-slate-100">
        <button onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg">Close</button>
        <div className="flex gap-3">
          <button onClick={handleReturn}
            className="px-4 py-2 text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 rounded-lg flex items-center gap-2">
            <XCircle size={14} /> Return to Requestor
          </button>
          <button onClick={handleAccept}
            className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg flex items-center gap-2">
            <CheckCircle size={14} /> Accept RFQ
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── File Upload Field ────────────────────────────────────────────────────────

function FileUploadField({ label, accept, icon, names = [], onChange, isImage }) {
  const ref = useRef(null)
  const handleFiles = (e) => {
    const files = Array.from(e.target.files)
    const newNames = files.map(f => f.name)
    onChange([...names, ...newNames])
    e.target.value = ''
  }
  const remove = (i) => onChange(names.filter((_, idx) => idx !== i))
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1">
        {icon} {label}
      </label>
      <div
        onClick={() => ref.current?.click()}
        className="cursor-pointer border-2 border-dashed border-slate-300 hover:border-blue-400 rounded-lg px-3 py-3 text-center transition-colors bg-slate-50 hover:bg-blue-50"
      >
        <p className="text-xs text-slate-400">{isImage ? 'Click to add photos' : 'Click to attach files'}</p>
        <p className="text-[10px] text-slate-300 mt-0.5">{accept.replace(/\./g, '').toUpperCase()}</p>
      </div>
      <input ref={ref} type="file" accept={accept} multiple className="hidden" onChange={handleFiles} />
      {names.length > 0 && (
        <ul className="mt-2 space-y-1">
          {names.map((n, i) => (
            <li key={i} className="flex items-center justify-between bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs">
              <span className="truncate text-slate-700 max-w-[140px]" title={n}>{isImage ? '🖼 ' : '📎 '}{n}</span>
              <button onClick={() => remove(i)} className="ml-2 text-slate-400 hover:text-red-500 flex-shrink-0"><XCircle size={13} /></button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ─── Stage 1: Request Form ────────────────────────────────────────────────────

const SERVICE_TYPE_PREFIX = { CMG: 'RQ-CMG-J', PPE: 'RQ-PPE-EJ', Other: 'RQ-Gen-J' }

const EMPTY_RFQ_FORM = {
  dateRequest:    new Date().toISOString().split('T')[0],
  serviceType:    'CMG',
  requestWorkNo:  '',
  requestor:      '',
  emailRequestor: '',
  tel:            '',
  projectNo:      '',
  client:         '',
  urgency:        'Normal',
  s1Location:     'ภายในพื้นที่ผู้ว่าจ้าง',
  s2WorkType:     'โครงการใหม่',
  s3WorkKind:     '',
  details:        '',
  linkUrl:        '',
  attachmentNames: [],
  photoNames:     [],
}

function Stage1Form({ onSave, onClose, initial }) {
  const [form, setForm] = useState(initial || EMPTY_RFQ_FORM)
  const [errors, setErrors] = useState({})

  // Auto-generate work no prefix when serviceType changes
  const handleServiceType = (val) => {
    const prefix = SERVICE_TYPE_PREFIX[val] || 'RQ-Gen-J'
    const year   = new Date().getFullYear()
    const seq    = String(Math.floor(Math.random() * 9000) + 1000)
    setForm(p => ({ ...p, serviceType: val, requestWorkNo: `${prefix}-${year}-${seq}` }))
  }

  // Init work no on first render if blank
  React.useEffect(() => {
    if (!form.requestWorkNo) handleServiceType(form.serviceType)
  }, [])

  const set = (key, val) => setForm(p => ({ ...p, [key]: val }))

  const validate = () => {
    const e = {}
    if (!form.dateRequest)            e.dateRequest     = 'Required'
    if (!form.requestWorkNo.trim())   e.requestWorkNo   = 'Required'
    if (!form.requestor.trim())       e.requestor       = 'Required'
    if (!form.emailRequestor.trim())
      e.emailRequestor = 'Required'
    else if (!/^[^@]+@[^@]+\.[^@]+$/.test(form.emailRequestor))
      e.emailRequestor = 'Invalid email'
    if (!form.client.trim())          e.client          = 'Required'
    if (!form.s3WorkKind.trim())      e.s3WorkKind      = 'Required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const inputCls = (key) =>
    `w-full px-3 py-2 text-sm border rounded-lg outline-none transition-colors ${
      errors[key] ? 'border-red-400 bg-red-50 focus:border-red-400' : 'border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-200'
    }`

  const selectCls = 'w-full px-3 py-2 text-sm border border-slate-300 rounded-lg outline-none focus:border-blue-500 bg-white'

  const Label = ({ text, required }) => (
    <label className="block text-xs font-semibold text-slate-600 mb-1">
      {text}{required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  )

  const Err = ({ k }) => errors[k] ? <p className="text-xs text-red-500 mt-1">{errors[k]}</p> : null

  return (
    <div className="px-6 py-5 space-y-5 max-h-[75vh] overflow-y-auto">

      {/* Row 1: Date + Type of Service */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label text="Date Request Work" required />
          <input type="date" value={form.dateRequest}
            onChange={e => set('dateRequest', e.target.value)}
            className={inputCls('dateRequest')} />
          <Err k="dateRequest" />
        </div>
        <div>
          <Label text="Type of Service" required />
          <select value={form.serviceType} onChange={e => handleServiceType(e.target.value)}
            className={selectCls}>
            <option value="CMG">CMG</option>
            <option value="PPE">PPE</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </div>

      {/* Row 2: Request Work No (auto) */}
      <div>
        <Label text="Request Work No." required />
        <div className="flex gap-2 items-center">
          <input value={form.requestWorkNo}
            onChange={e => set('requestWorkNo', e.target.value)}
            className={inputCls('requestWorkNo')}
            placeholder={`${SERVICE_TYPE_PREFIX[form.serviceType]}-YYYY-XXXX`} />
          <button type="button"
            onClick={() => handleServiceType(form.serviceType)}
            className="flex-shrink-0 px-3 py-2 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors whitespace-nowrap"
            title="Re-generate number">
            ↻ Re-gen
          </button>
        </div>
        <p className="text-[10px] text-slate-400 mt-1">
          Format: {SERVICE_TYPE_PREFIX[form.serviceType]}-{new Date().getFullYear()}-XXXX
        </p>
        <Err k="requestWorkNo" />
      </div>

      {/* Row 3: Requestor + Email */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label text="Requestor" required />
          <input value={form.requestor} onChange={e => set('requestor', e.target.value)}
            placeholder="Full name" className={inputCls('requestor')} />
          <Err k="requestor" />
        </div>
        <div>
          <Label text="E-mail Requestor" required />
          <input type="email" value={form.emailRequestor}
            onChange={e => set('emailRequestor', e.target.value)}
            placeholder="name@company.com" className={inputCls('emailRequestor')} />
          <Err k="emailRequestor" />
        </div>
      </div>

      {/* Row 4: Tel + Project No */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label text="Tel." />
          <input value={form.tel} onChange={e => set('tel', e.target.value)}
            placeholder="e.g. +66 81 234 5678" className={inputCls('tel')} />
        </div>
        <div>
          <Label text="Project No." />
          <input value={form.projectNo} onChange={e => set('projectNo', e.target.value)}
            placeholder="e.g. PRJ-2024-001" className={inputCls('projectNo')} />
        </div>
      </div>

      {/* Row 5: Client + Urgency */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label text="Client / Project Owner" required />
          <input value={form.client} onChange={e => set('client', e.target.value)}
            placeholder="e.g. PTT, Chevron" className={inputCls('client')} />
          <Err k="client" />
        </div>
        <div>
          <Label text="Urgency" />
          <select value={form.urgency} onChange={e => set('urgency', e.target.value)}
            className={selectCls}>
            <option>Low</option>
            <option>Normal</option>
            <option>High</option>
            <option>Urgent</option>
          </select>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-slate-100 pt-1">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Scope Classification</p>
      </div>

      {/* Row 6: S1 + S2 */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label text="S1 : สถานที่ทำงาน" />
          <select value={form.s1Location} onChange={e => set('s1Location', e.target.value)}
            className={selectCls}>
            <option>ภายในพื้นที่ผู้ว่าจ้าง</option>
            <option>ภายในพื้นที่บริษัท</option>
          </select>
        </div>
        <div>
          <Label text="S2 : ประเภทงาน" />
          <select value={form.s2WorkType} onChange={e => set('s2WorkType', e.target.value)}
            className={selectCls}>
            <option>โครงการใหม่</option>
            <option>โครงการแก้ไข</option>
            <option>โครงการประมูล</option>
          </select>
        </div>
      </div>

      {/* Row 7: S3 */}
      <div>
        <Label text="S3 : ชนิดงาน" required />
        <input value={form.s3WorkKind} onChange={e => set('s3WorkKind', e.target.value)}
          placeholder="ระบุชนิดงาน / Describe work type…"
          className={inputCls('s3WorkKind')} />
        <Err k="s3WorkKind" />
      </div>

      {/* Row 8: Details / Scope */}
      <div>
        <Label text="Scope of Work / Details" />
        <textarea rows={3} value={form.details}
          onChange={e => set('details', e.target.value)}
          placeholder="Describe the scope, location, and requirements…"
          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200 resize-none"
        />
      </div>

      {/* Divider */}
      <div className="border-t border-slate-100 pt-1">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Attachments & References</p>
      </div>

      {/* Row 9: Link URL */}
      <div>
        <Label text="Reference / Drawing URL" />
        <div className="relative">
          <Link2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={form.linkUrl} onChange={e => set('linkUrl', e.target.value)}
            placeholder="https://drive.google.com/… or SharePoint link"
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200" />
        </div>
        {form.linkUrl && (
          <a href={form.linkUrl} target="_blank" rel="noopener noreferrer"
            className="text-xs text-blue-600 hover:underline mt-1 inline-block">Open link ↗</a>
        )}
      </div>

      {/* Row 10: File Upload + Photo Upload side by side */}
      <div className="grid grid-cols-2 gap-4">
        {/* File Upload */}
        <FileUploadField
          label="Upload Documents / Files"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.zip"
          icon={<Upload size={14} />}
          names={form.attachmentNames}
          onChange={names => set('attachmentNames', names)}
        />
        {/* Photo Upload */}
        <FileUploadField
          label="Upload Photos / Images"
          accept="image/*"
          icon={<Image size={14} />}
          names={form.photoNames}
          onChange={names => set('photoNames', names)}
          isImage
        />
      </div>

      <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
        <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg">Cancel</button>
        <button onClick={() => validate() && onSave(form)}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-2">
          Submit RFQ <ArrowRight size={14} />
        </button>
      </div>
    </div>
  )
}

// ─── Stage 2: Manhour Estimate (ppeLead) ─────────────────────────────────────

const MHE_TYPES = ['Drawing', 'Calculation', 'Estimation', 'Service Eng.', '3D Model', 'Revit Model', 'Other']

function genMheNo(rfq) {
  const base = (rfq.requestWorkNo || 'RQ').replace('RQ-', 'MHE-')
  return base
}

const EMPTY_MHE_ROW = { activityName: '', type: 'Drawing', additionalInfo: '', qty: '', unitMH: '', assignEngineer: '', note: '' }

function Stage2Form({ rfq, onSave, onClose }) {
  const { teamRates } = useApp()
  const [mheNo]        = useState(rfq.mheNo || genMheNo(rfq))
  const [dateCompletion, setDateCompletion] = useState(rfq.dateCompletion || '')
  const [rows, setRows] = useState(
    rfq.mheRows && rfq.mheRows.length > 0
      ? rfq.mheRows
      : [{ ...EMPTY_MHE_ROW, id: `mhe-${Date.now()}` }]
  )

  const addRow = () => setRows(prev => [...prev, { ...EMPTY_MHE_ROW, id: `mhe-${Date.now()}` }])
  const removeRow = (id) => setRows(prev => prev.filter(r => r.id !== id))
  const updateRow = (id, field, value) => setRows(prev => prev.map(r => {
    if (r.id !== id) return r
    const updated = { ...r, [field]: value }
    if (field === 'qty' || field === 'unitMH') {
      const q = parseFloat(field === 'qty' ? value : updated.qty) || 0
      const u = parseFloat(field === 'unitMH' ? value : updated.unitMH) || 0
      updated.totalMH = +(q * u).toFixed(2)
    }
    return updated
  }))

  const totalMH = rows.reduce((s, r) => s + (r.totalMH || 0), 0)

  const engOptions = teamRates.map(e => e.name)

  const canSubmit = rows.some(r => r.activityName.trim()) && dateCompletion

  return (
    <div className="px-6 py-5 space-y-5 max-h-[78vh] overflow-y-auto">

      {/* Header Info */}
      <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Manhour Estimate — {rfq.requestWorkNo}</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">MHE No.</label>
            <div className="px-3 py-2 text-sm font-bold text-[#0f2035] bg-white border border-slate-200 rounded-lg">{mheNo}</div>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Date of Completion <span className="text-red-500">*</span></label>
            <input type="date" value={dateCompletion} onChange={e => setDateCompletion(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200" />
          </div>
        </div>
      </div>

      {/* Manhour Estimate Table */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <ClipboardList size={15} /> Manhour Estimate Table
          </h3>
          <button onClick={addRow}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg">
            <Plus size={12} /> Add Activity
          </button>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-xs" style={{ minWidth: 900 }}>
            <thead className="bg-[#0f2035] text-white">
              <tr>
                <th className="px-2 py-2.5 text-center font-semibold w-10">#</th>
                <th className="px-2 py-2.5 text-left font-semibold min-w-[160px]">Activity Name</th>
                <th className="px-2 py-2.5 text-left font-semibold w-28">Type</th>
                <th className="px-2 py-2.5 text-left font-semibold min-w-[120px]">Additional Info</th>
                <th className="px-2 py-2.5 text-right font-semibold w-16">Qty</th>
                <th className="px-2 py-2.5 text-right font-semibold w-20">Unit MH</th>
                <th className="px-2 py-2.5 text-right font-semibold w-20">Total MH</th>
                <th className="px-2 py-2.5 text-left font-semibold w-36">Assign Engineer</th>
                <th className="px-2 py-2.5 text-left font-semibold min-w-[120px]">Note</th>
                <th className="px-2 py-2.5 w-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row, idx) => (
                <tr key={row.id} className="hover:bg-blue-50 bg-cyan-50/30">
                  <td className="px-2 py-1.5 text-center font-bold text-slate-400 text-[10px]">{String(idx + 1).padStart(2, '0')}</td>
                  <td className="px-2 py-1.5">
                    <input value={row.activityName} onChange={e => updateRow(row.id, 'activityName', e.target.value)}
                      placeholder="Activity name…"
                      className="w-full px-2 py-1 text-xs border border-slate-200 rounded outline-none focus:border-blue-400 bg-white" />
                  </td>
                  <td className="px-2 py-1.5">
                    <select value={row.type} onChange={e => updateRow(row.id, 'type', e.target.value)}
                      className="w-full px-2 py-1 text-xs border border-slate-200 rounded outline-none focus:border-blue-400 bg-white">
                      {MHE_TYPES.map(t => <option key={t}>{t}</option>)}
                    </select>
                  </td>
                  <td className="px-2 py-1.5">
                    <input value={row.additionalInfo} onChange={e => updateRow(row.id, 'additionalInfo', e.target.value)}
                      placeholder="Detail…"
                      className="w-full px-2 py-1 text-xs border border-slate-200 rounded outline-none focus:border-blue-400 bg-white" />
                  </td>
                  <td className="px-2 py-1.5">
                    <input type="number" min="0" step="0.1" value={row.qty} onChange={e => updateRow(row.id, 'qty', e.target.value)}
                      className="w-full px-2 py-1 text-xs border border-slate-200 rounded outline-none focus:border-blue-400 bg-white text-right" />
                  </td>
                  <td className="px-2 py-1.5">
                    <input type="number" min="0" step="0.01" value={row.unitMH} onChange={e => updateRow(row.id, 'unitMH', e.target.value)}
                      className="w-full px-2 py-1 text-xs border border-slate-200 rounded outline-none focus:border-blue-400 bg-white text-right" />
                  </td>
                  <td className="px-2 py-1.5 text-right font-bold text-[#0f2035] tabular-nums">
                    {row.totalMH > 0 ? row.totalMH : '—'}
                  </td>
                  <td className="px-2 py-1.5">
                    <select value={row.assignEngineer} onChange={e => updateRow(row.id, 'assignEngineer', e.target.value)}
                      className="w-full px-2 py-1 text-xs border border-slate-200 rounded outline-none focus:border-blue-400 bg-white">
                      <option value="">— Select —</option>
                      {engOptions.map(n => <option key={n}>{n}</option>)}
                    </select>
                  </td>
                  <td className="px-2 py-1.5">
                    <input value={row.note} onChange={e => updateRow(row.id, 'note', e.target.value)}
                      placeholder="Note…"
                      className="w-full px-2 py-1 text-xs border border-slate-200 rounded outline-none focus:border-blue-400 bg-white" />
                  </td>
                  <td className="px-2 py-1.5">
                    <button onClick={() => removeRow(row.id)} className="text-slate-300 hover:text-red-500 transition-colors">
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-100 border-t-2 border-slate-300">
              <tr>
                <td colSpan={6} className="px-3 py-2 font-bold text-slate-700 text-right text-xs">Total Manhours:</td>
                <td className="px-3 py-2 font-bold text-[#0f2035] text-right tabular-nums">{totalMH.toFixed(2)}</td>
                <td colSpan={3}></td>
              </tr>
            </tfoot>
          </table>
        </div>
        {!canSubmit && (
          <p className="text-xs text-amber-600 mt-1">Add at least one activity and set a completion date before submitting.</p>
        )}
      </div>

      <div className="flex justify-between gap-3 pt-2 border-t border-slate-100">
        <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg">Cancel</button>
        <button
          onClick={() => canSubmit && onSave({
            mheNo, dateCompletion, mheRows: rows,
            wbsItems: rows.map(r => ({ id: r.id, task: r.activityName, unit: 'activity', qty: parseFloat(r.qty)||0, unitMH: parseFloat(r.unitMH)||0, totalMH: r.totalMH||0, type: r.type, additionalInfo: r.additionalInfo, assignEngineer: r.assignEngineer, note: r.note })),
            assignedEngineers: [...new Set(rows.filter(r => r.assignEngineer).map(r => teamRates.find(t => t.name === r.assignEngineer)?.id).filter(Boolean))],
            totalPlannedMH: +totalMH.toFixed(2),
            status: 'Pending Manager',
          })}
          disabled={!canSubmit}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
          Submit to Cost Estimate <ArrowRight size={14} />
        </button>
      </div>
    </div>
  )
}

// ─── Stage 3: Cost Estimate (ppeManager) ─────────────────────────────────────

const EMPTY_INDIRECT = { description: '', unit: '', rate: '', qty: '', note: '' }

function Stage3Form({ rfq, onSave, onClose, onCancel }) {
  // Direct cost rows come from MHE rows — PPE Manager adds Rate per row
  const mheRows = rfq.mheRows || rfq.wbsItems || []
  const [directRows, setDirectRows] = useState(() =>
    (rfq.directCostRows && rfq.directCostRows.length > 0)
      ? rfq.directCostRows
      : mheRows.map(r => ({
          id: r.id,
          activityName: r.activityName || r.task || '',
          type: r.type || '',
          qty: r.qty || 0,
          unitMH: r.unitMH || 0,
          totalMH: r.totalMH || 0,
          assignEngineer: r.assignEngineer || '',
          rate: '',
          totalCost: 0,
          note: r.note || '',
        }))
  )
  const [indirectRows, setIndirectRows] = useState(
    rfq.indirectCostRows && rfq.indirectCostRows.length > 0
      ? rfq.indirectCostRows
      : [{ ...EMPTY_INDIRECT, id: `ind-${Date.now()}` }]
  )
  const [overheadPct, setOverheadPct] = useState(rfq.overheadPct ?? 15)
  const [submitNote, setSubmitNote]   = useState('')
  const [showConfirmCancel, setShowConfirmCancel] = useState(false)

  // Comment history
  const commentHistory = rfq.costComments || []

  // Direct cost calculations
  const updateDirect = (id, field, value) => setDirectRows(prev => prev.map(r => {
    if (r.id !== id) return r
    const updated = { ...r, [field]: value }
    if (field === 'rate') {
      updated.totalCost = +(parseFloat(value || 0) * (r.totalMH || 0)).toFixed(2)
    }
    return updated
  }))
  const totalDirect = directRows.reduce((s, r) => s + (parseFloat(r.totalCost) || 0), 0)

  // Indirect cost calculations
  const addIndirect = () => setIndirectRows(prev => [...prev, { ...EMPTY_INDIRECT, id: `ind-${Date.now()}` }])
  const removeIndirect = (id) => setIndirectRows(prev => prev.filter(r => r.id !== id))
  const updateIndirect = (id, field, value) => setIndirectRows(prev => prev.map(r => {
    if (r.id !== id) return r
    const updated = { ...r, [field]: value }
    if (field === 'rate' || field === 'qty') {
      const rate = parseFloat(field === 'rate' ? value : updated.rate) || 0
      const qty  = parseFloat(field === 'qty'  ? value : updated.qty)  || 0
      updated.amount = +(rate * qty).toFixed(2)
    }
    return updated
  }))
  const totalIndirect = indirectRows.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0)

  // B3.3 Summary
  const totalAB      = totalDirect + totalIndirect
  const overheadAmt  = +(totalAB * (overheadPct / 100)).toFixed(2)
  const grandTotal   = +(totalAB + overheadAmt).toFixed(2)

  const canSubmit = directRows.some(r => parseFloat(r.rate) > 0) && submitNote.trim()

  return (
    <div className="px-6 py-5 space-y-6 max-h-[80vh] overflow-y-auto">

      {/* MHE Reference Banner */}
      <div className="bg-slate-50 rounded-xl border border-slate-200 p-3 flex items-center gap-4">
        <div className="text-center px-4 border-r border-slate-200">
          <p className="text-lg font-bold text-[#0f2035]">{rfq.mheNo || rfq.requestWorkNo}</p>
          <p className="text-[10px] text-slate-400">MHE / RFQ No.</p>
        </div>
        <div className="text-center px-4 border-r border-slate-200">
          <p className="text-lg font-bold text-[#0f2035]">{rfq.totalPlannedMH || 0}</p>
          <p className="text-[10px] text-slate-400">Total MH</p>
        </div>
        <div className="text-center px-4">
          <p className="text-lg font-bold text-[#0f2035]">{rfq.dateCompletion || '—'}</p>
          <p className="text-[10px] text-slate-400">Target Completion</p>
        </div>
      </div>

      {/* Comment History (loop) */}
      {commentHistory.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1"><MessageSquare size={12} /> Review Comment History</p>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {commentHistory.map((c, i) => (
              <div key={i} className={`rounded-lg px-3 py-2 text-xs border ${c.role === 'ppeManager' ? 'bg-blue-50 border-blue-200' : 'bg-amber-50 border-amber-200'}`}>
                <p className="font-semibold text-slate-600">{c.role} — {c.date}</p>
                <p className="text-slate-700 mt-0.5">{c.note}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Table A: Direct Cost */}
      <div>
        <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1">
          <Calculator size={13} /> Table A — Direct Cost Estimate
        </p>
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-xs" style={{ minWidth: 860 }}>
            <thead className="bg-[#0f2035] text-white">
              <tr>
                <th className="px-2 py-2.5 text-center w-10">#</th>
                <th className="px-2 py-2.5 text-left min-w-[140px]">Activity Name</th>
                <th className="px-2 py-2.5 text-left w-28">Type</th>
                <th className="px-2 py-2.5 text-right w-14">Qty</th>
                <th className="px-2 py-2.5 text-right w-20">Unit MH</th>
                <th className="px-2 py-2.5 text-right w-20">Total MH</th>
                <th className="px-2 py-2.5 text-left w-32">Assign Eng.</th>
                <th className="px-2 py-2.5 text-right w-28">Rate (THB/MH)</th>
                <th className="px-2 py-2.5 text-right w-28">Total Cost</th>
                <th className="px-2 py-2.5 text-left min-w-[100px]">Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {directRows.length === 0 ? (
                <tr><td colSpan={10} className="px-3 py-6 text-center text-slate-400">No activities from Manhour Plan.</td></tr>
              ) : directRows.map((row, idx) => (
                <tr key={row.id} className="hover:bg-cyan-50 bg-cyan-50/20">
                  <td className="px-2 py-1.5 text-center text-slate-400 font-bold text-[10px]">{String(idx+1).padStart(2,'0')}</td>
                  <td className="px-2 py-1.5 font-medium text-slate-800">{row.activityName}</td>
                  <td className="px-2 py-1.5 text-slate-500">{row.type}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{row.qty}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{row.unitMH}</td>
                  <td className="px-2 py-1.5 text-right font-semibold tabular-nums">{row.totalMH}</td>
                  <td className="px-2 py-1.5 text-slate-500">{row.assignEngineer}</td>
                  <td className="px-2 py-1.5">
                    <input type="number" min="0" step="1" value={row.rate}
                      onChange={e => updateDirect(row.id, 'rate', e.target.value)}
                      placeholder="0"
                      className="w-full px-2 py-1 text-xs border border-amber-300 rounded outline-none focus:border-amber-500 bg-amber-50 text-right font-semibold" />
                  </td>
                  <td className="px-2 py-1.5 text-right font-bold text-[#0f2035] tabular-nums">
                    {row.totalCost > 0 ? row.totalCost.toLocaleString('th-TH') : '—'}
                  </td>
                  <td className="px-2 py-1.5 text-slate-400 text-[10px]">{row.note}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-100 border-t-2 border-slate-300">
              <tr>
                <td colSpan={8} className="px-3 py-2 font-bold text-slate-700 text-right text-xs">Total Direct Cost:</td>
                <td className="px-3 py-2 font-bold text-[#0f2035] text-right tabular-nums">{totalDirect.toLocaleString('th-TH')}</td>
                <td><span className="text-[10px] text-slate-400 px-1">Baht</span></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Table B: Indirect Cost */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
            <DollarSign size={13} /> Table B — Indirect Cost
          </p>
          <button onClick={addIndirect}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg">
            <Plus size={12} /> Add Item
          </button>
        </div>
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-xs" style={{ minWidth: 720 }}>
            <thead className="bg-indigo-800 text-white">
              <tr>
                <th className="px-2 py-2.5 text-center w-10">Item</th>
                <th className="px-2 py-2.5 text-left min-w-[180px]">Description</th>
                <th className="px-2 py-2.5 text-left w-20">Unit</th>
                <th className="px-2 py-2.5 text-right w-24">Rate</th>
                <th className="px-2 py-2.5 text-right w-16">Qty</th>
                <th className="px-2 py-2.5 text-right w-28">Amount</th>
                <th className="px-2 py-2.5 text-left min-w-[100px]">Note</th>
                <th className="px-2 py-2.5 w-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {indirectRows.map((row, idx) => (
                <tr key={row.id} className="hover:bg-indigo-50">
                  <td className="px-2 py-1.5 text-center text-slate-400 font-bold text-[10px]">{String(idx+1).padStart(2,'0')}</td>
                  <td className="px-2 py-1.5">
                    <input value={row.description} onChange={e => updateIndirect(row.id, 'description', e.target.value)}
                      placeholder="Description…"
                      className="w-full px-2 py-1 text-xs border border-slate-200 rounded outline-none focus:border-indigo-400 bg-white" />
                  </td>
                  <td className="px-2 py-1.5">
                    <input value={row.unit} onChange={e => updateIndirect(row.id, 'unit', e.target.value)}
                      placeholder="ea / m²…"
                      className="w-full px-2 py-1 text-xs border border-slate-200 rounded outline-none focus:border-indigo-400 bg-white" />
                  </td>
                  <td className="px-2 py-1.5">
                    <input type="number" min="0" value={row.rate} onChange={e => updateIndirect(row.id, 'rate', e.target.value)}
                      placeholder="0"
                      className="w-full px-2 py-1 text-xs border border-slate-200 rounded outline-none focus:border-indigo-400 bg-white text-right" />
                  </td>
                  <td className="px-2 py-1.5">
                    <input type="number" min="0" value={row.qty} onChange={e => updateIndirect(row.id, 'qty', e.target.value)}
                      placeholder="0"
                      className="w-full px-2 py-1 text-xs border border-slate-200 rounded outline-none focus:border-indigo-400 bg-white text-right" />
                  </td>
                  <td className="px-2 py-1.5 text-right font-semibold tabular-nums text-indigo-800">
                    {row.amount > 0 ? row.amount.toLocaleString('th-TH') : '—'}
                  </td>
                  <td className="px-2 py-1.5">
                    <input value={row.note} onChange={e => updateIndirect(row.id, 'note', e.target.value)}
                      placeholder="Note…"
                      className="w-full px-2 py-1 text-xs border border-slate-200 rounded outline-none focus:border-indigo-400 bg-white" />
                  </td>
                  <td className="px-2 py-1.5">
                    <button onClick={() => removeIndirect(row.id)} className="text-slate-300 hover:text-red-500">
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))}
              {indirectRows.length === 0 && (
                <tr><td colSpan={8} className="px-3 py-4 text-center text-slate-400">No indirect cost items.</td></tr>
              )}
            </tbody>
            <tfoot className="bg-indigo-50 border-t-2 border-indigo-200">
              <tr>
                <td colSpan={5} className="px-3 py-2 font-bold text-indigo-800 text-right text-xs">Total Indirect Cost:</td>
                <td className="px-3 py-2 font-bold text-indigo-900 text-right tabular-nums">{totalIndirect.toLocaleString('th-TH')}</td>
                <td><span className="text-[10px] text-slate-400 px-1">Baht</span></td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Table B3.3: Grand Summary */}
      <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 space-y-2">
        <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">Table B3.3 — Cost Summary</p>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-slate-600 text-xs">Total Direct + Indirect (Table A + Table B)</span>
            <span className="font-bold text-slate-800 tabular-nums">{totalAB.toLocaleString('th-TH')} Baht</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-600 text-xs flex items-center gap-2">
              Overhead + Profit %
              <input type="number" min="0" max="100" step="0.5" value={overheadPct}
                onChange={e => setOverheadPct(parseFloat(e.target.value) || 0)}
                className="w-16 px-2 py-0.5 text-xs border border-orange-300 rounded outline-none focus:border-orange-500 bg-white text-right font-semibold" />
              %
            </span>
            <span className="font-bold text-orange-700 tabular-nums">{overheadAmt.toLocaleString('th-TH')} Baht</span>
          </div>
          <div className="flex justify-between items-center border-t-2 border-orange-300 pt-2">
            <span className="font-bold text-slate-800">Grand Total (Direct + Indirect + Overhead + Profit)</span>
            <span className="font-bold text-[#0f2035] text-lg tabular-nums">{grandTotal.toLocaleString('th-TH')} Baht</span>
          </div>
          <p className="text-[10px] text-slate-400">(Cost excluding VAT 7%)</p>
        </div>
      </div>

      {/* Submit Note (required for submission / revision loop) */}
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1">
          Note to Requestor <span className="text-red-500">*</span>
          <span className="text-slate-400 font-normal ml-1">— required when submitting for review</span>
        </label>
        <textarea rows={3} value={submitNote} onChange={e => setSubmitNote(e.target.value)}
          placeholder="Describe assumptions, key cost drivers, or messages to requestor…"
          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg outline-none resize-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200"
        />
      </div>

      <div className="flex justify-between gap-3 pt-2 border-t border-slate-100">
        <button onClick={() => setShowConfirmCancel(true)}
          className="px-4 py-2 text-sm font-medium text-red-600 border border-red-200 bg-red-50 hover:bg-red-100 rounded-lg flex items-center gap-2">
          <XCircle size={15} /> Cancel RFQ
        </button>
        <div className="flex gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg">Close</button>
          <button
            onClick={() => canSubmit && onSave({
              directCostRows: directRows,
              indirectCostRows: indirectRows,
              overheadPct,
              totalDirectCost: totalDirect,
              totalIndirectCost: totalIndirect,
              totalCost: grandTotal,
              costComments: [...commentHistory, { role: 'ppeManager', date: new Date().toISOString().split('T')[0], note: submitNote }],
              status: 'Pending Approval',
            })}
            disabled={!canSubmit}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
            Submit to Requestor <ArrowRight size={14} />
          </button>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showConfirmCancel}
        onClose={() => setShowConfirmCancel(false)}
        onConfirm={() => { onCancel(); onClose() }}
        title="Cancel RFQ"
        message="Are you sure you want to cancel this RFQ? This cannot be undone."
      />
    </div>
  )
}

// ─── Stage 4: Approval (Requestor / GM/MD) ───────────────────────────────────

function Stage4Form({ rfq, onSave, onClose }) {
  const [note, setNote]                         = useState('')
  const [showConfirmCancel, setShowConfirmCancel] = useState(false)

  const commentHistory = rfq.costComments || []

  // MHE activity rows (prefer mheRows, fallback to wbsItems)
  const activityRows = rfq.mheRows || rfq.wbsItems || []
  const directRows   = rfq.directCostRows || []

  return (
    <div className="px-6 py-5 space-y-5 max-h-[80vh] overflow-y-auto">

      {/* Cost Summary Banner */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-slate-50 rounded-xl border border-slate-200 p-3 text-center">
          <p className="text-xl font-bold text-[#0f2035]">{rfq.totalPlannedMH || 0}</p>
          <p className="text-xs text-slate-500 mt-0.5">Total MH</p>
        </div>
        <div className="bg-slate-50 rounded-xl border border-slate-200 p-3 text-center">
          <p className="text-xl font-bold text-[#0f2035]">{rfq.mheNo || rfq.requestWorkNo}</p>
          <p className="text-xs text-slate-500 mt-0.5">MHE No.</p>
        </div>
        <div className="bg-green-50 rounded-xl border border-green-200 p-3 text-center">
          <p className="text-xl font-bold text-green-700">{(rfq.totalCost || 0).toLocaleString('th-TH')}</p>
          <p className="text-xs text-slate-500 mt-0.5">Grand Total (Baht)</p>
        </div>
      </div>

      {/* B3.3 Cost Breakdown (read-only) */}
      {(rfq.totalDirectCost > 0 || rfq.totalIndirectCost > 0) && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 space-y-2 text-xs">
          <p className="font-bold text-slate-700 uppercase tracking-wider mb-2">Table B3.3 — Cost Breakdown</p>
          <div className="flex justify-between">
            <span className="text-slate-600">Total Direct Cost (Table A)</span>
            <span className="font-semibold tabular-nums">{(rfq.totalDirectCost||0).toLocaleString('th-TH')} Baht</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600">Total Indirect Cost (Table B)</span>
            <span className="font-semibold tabular-nums">{(rfq.totalIndirectCost||0).toLocaleString('th-TH')} Baht</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600">Overhead + Profit ({rfq.overheadPct || 15}%)</span>
            <span className="font-semibold tabular-nums text-orange-700">
              {(((rfq.totalDirectCost||0)+(rfq.totalIndirectCost||0)) * ((rfq.overheadPct||15)/100)).toLocaleString('th-TH')} Baht
            </span>
          </div>
          <div className="flex justify-between border-t-2 border-orange-300 pt-2">
            <span className="font-bold text-slate-800">Grand Total (excl. VAT 7%)</span>
            <span className="font-bold text-[#0f2035] text-sm tabular-nums">{(rfq.totalCost||0).toLocaleString('th-TH')} Baht</span>
          </div>
        </div>
      )}

      {/* Activity Summary (from MHE) */}
      {activityRows.length > 0 && (
        <div className="rounded-xl border border-slate-200 overflow-hidden">
          <div className="bg-slate-100 px-3 py-2">
            <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">Work Activities (from Manhour Estimate)</p>
          </div>
          <table className="w-full text-xs">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-3 py-2 text-left text-slate-400 font-semibold">#</th>
                <th className="px-3 py-2 text-left text-slate-400 font-semibold">Activity</th>
                <th className="px-3 py-2 text-left text-slate-400 font-semibold">Type</th>
                <th className="px-3 py-2 text-right text-slate-400 font-semibold">Qty</th>
                <th className="px-3 py-2 text-right text-slate-400 font-semibold">Total MH</th>
                <th className="px-3 py-2 text-left text-slate-400 font-semibold">Engineer</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {activityRows.map((w, i) => (
                <tr key={w.id || i} className="hover:bg-slate-50">
                  <td className="px-3 py-1.5 text-slate-400">{i+1}</td>
                  <td className="px-3 py-1.5 font-medium text-slate-800">{w.activityName || w.task}</td>
                  <td className="px-3 py-1.5 text-slate-500">{w.type || '—'}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{w.qty}</td>
                  <td className="px-3 py-1.5 text-right font-semibold tabular-nums">{w.totalMH}</td>
                  <td className="px-3 py-1.5 text-slate-500">{w.assignEngineer || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Comment History */}
      {commentHistory.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1"><MessageSquare size={12} /> Review Comment History</p>
          <div className="space-y-2 max-h-36 overflow-y-auto">
            {commentHistory.map((c, i) => (
              <div key={i} className={`rounded-lg px-3 py-2 text-xs border ${c.role === 'ppeManager' ? 'bg-blue-50 border-blue-200' : 'bg-amber-50 border-amber-200'}`}>
                <p className="font-semibold text-slate-600">{c.role} — {c.date}</p>
                <p className="text-slate-700 mt-0.5">{c.note}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Note (required for any action) */}
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1">
          Your Note / Comment <span className="text-red-500">*</span>
        </label>
        <textarea rows={3} value={note} onChange={e => setNote(e.target.value)}
          placeholder="Add your approval note, or comment to PPE Manager for revision…"
          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg outline-none resize-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200"
        />
      </div>

      <div className="flex justify-between gap-3 pt-2 border-t border-slate-100">
        {/* Cancel RFQ */}
        <button onClick={() => setShowConfirmCancel(true)}
          className="px-4 py-2 text-sm font-medium text-red-600 border border-red-200 bg-red-50 hover:bg-red-100 rounded-lg flex items-center gap-2">
          <XCircle size={15} /> Cancel RFQ
        </button>

        <div className="flex gap-3">
          <button onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg">Close</button>

          {/* Return to Manager for revision */}
          <button
            onClick={() => note.trim() && onSave({
              status: 'Pending Manager',
              costComments: [...commentHistory, { role: 'Requestor', date: new Date().toISOString().split('T')[0], note }],
              approvalNote: note,
            })}
            disabled={!note.trim()}
            className="px-4 py-2 text-sm font-medium text-amber-700 bg-amber-50 border border-amber-300 hover:bg-amber-100 rounded-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
            <ArrowRight size={14} className="rotate-180" /> Return to Manager
          </button>

          {/* Approve to Process */}
          <button
            onClick={() => note.trim() && onSave({
              status: 'Approved to Process',
              approvalNote: note,
              costComments: [...commentHistory, { role: 'Requestor', date: new Date().toISOString().split('T')[0], note }],
              approvedAt: new Date().toISOString().split('T')[0],
            })}
            disabled={!note.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
            <CheckCircle size={15} /> Approve to Process
          </button>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showConfirmCancel}
        onClose={() => setShowConfirmCancel(false)}
        onConfirm={() => { onSave({ status: 'Cancelled', approvalNote: note }); onClose() }}
        title="Cancel RFQ"
        message={`Are you sure you want to cancel RFQ "${rfq.requestWorkNo}"? This cannot be undone.`}
      />
    </div>
  )
}

// ─── Detail View Modal (read-only for other roles) ────────────────────────────

function RFQDetail({ rfq, onClose }) {
  const { teamRates } = useApp()
  const assignedEngineers = (rfq.assignedEngineers || [])
    .map(id => teamRates.find(t => t.id === id)).filter(Boolean)

  const InfoRow = ({ label, value }) => (
    <div>
      <p className="text-xs text-slate-400 font-medium">{label}</p>
      <p className="text-sm font-semibold text-slate-800">{value || '—'}</p>
    </div>
  )

  return (
    <div className="px-6 py-5 space-y-4 max-h-[75vh] overflow-y-auto">

      {/* Request Info */}
      <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-3">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Request Information</p>
        <div className="grid grid-cols-3 gap-3">
          <InfoRow label="Date Request Work" value={rfq.dateRequest} />
          <InfoRow label="Type of Service" value={rfq.serviceType} />
          <InfoRow label="Request Work No." value={rfq.requestWorkNo} />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <InfoRow label="Requestor" value={rfq.requestor} />
          <InfoRow label="E-mail" value={rfq.emailRequestor} />
          <InfoRow label="Tel." value={rfq.tel} />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <InfoRow label="Project No." value={rfq.projectNo} />
          <InfoRow label="Client / Owner" value={rfq.client} />
          <InfoRow label="Urgency" value={rfq.urgency} />
        </div>
      </div>

      {/* Scope Classification */}
      <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-3">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Scope Classification</p>
        <div className="grid grid-cols-3 gap-3">
          <InfoRow label="S1 : สถานที่ทำงาน" value={rfq.s1Location} />
          <InfoRow label="S2 : ประเภทงาน" value={rfq.s2WorkType} />
          <InfoRow label="S3 : ชนิดงาน" value={rfq.s3WorkKind} />
        </div>
      </div>

      {/* Status */}
      <div className="grid grid-cols-2 gap-3">
        <InfoRow label="Submitted Date" value={rfq.submittedAt} />
        <InfoRow label="Status" value={rfq.status} />
      </div>

      {rfq.details && (
        <div>
          <p className="text-xs text-slate-400 font-medium mb-1">Scope of Work / Details</p>
          <p className="text-sm text-slate-700 bg-slate-50 rounded-lg p-3 border border-slate-200">{rfq.details}</p>
        </div>
      )}
      {rfq.totalPlannedMH > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-slate-50 rounded-lg border border-slate-200 p-3 text-center">
            <p className="font-bold text-[#0f2035]">{rfq.totalPlannedMH} MH</p>
            <p className="text-[10px] text-slate-500">Planned MH</p>
          </div>
          <div className="bg-slate-50 rounded-lg border border-slate-200 p-3 text-center">
            <p className="font-bold text-[#0f2035]">{rfq.wbsItems?.length || 0}</p>
            <p className="text-[10px] text-slate-500">WBS Tasks</p>
          </div>
          <div className="bg-green-50 rounded-lg border border-green-200 p-3 text-center">
            <p className="font-bold text-green-700">{formatIDR(rfq.totalCost)}</p>
            <p className="text-[10px] text-slate-500">Cost Estimate</p>
          </div>
        </div>
      )}
      {assignedEngineers.length > 0 && (
        <div>
          <p className="text-xs text-slate-400 font-medium mb-2">Assigned Engineers</p>
          <div className="flex flex-wrap gap-2">
            {assignedEngineers.map(e => (
              <span key={e.id} className="text-xs bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full font-medium">{e.name}</span>
            ))}
          </div>
        </div>
      )}
      {rfq.approvalNote && (
        <div>
          <p className="text-xs text-slate-400 font-medium mb-1">Approval Note</p>
          <p className="text-sm text-slate-700 bg-yellow-50 rounded-lg p-3 border border-yellow-200">{rfq.approvalNote}</p>
        </div>
      )}
      <div className="flex justify-end pt-2 border-t border-slate-100">
        <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg">Close</button>
      </div>
    </div>
  )
}

// ─── Shared RFQ Table ─────────────────────────────────────────────────────────

const ALL_STATUS_OPTIONS = [
  'All', 'Pending Lead', 'Returned', 'Need Clarify', 'Pending MH',
  'Pending Manager', 'Pending Approval', 'Approved to Process', 'Approved', 'Rejected', 'Cancelled',
]

const STATUS_CLS = {
  'Pending Lead':       'bg-yellow-100 text-yellow-700',
  'Returned':           'bg-orange-100 text-orange-700',
  'Need Clarify':       'bg-pink-100 text-pink-700',
  'Pending MH':         'bg-blue-100 text-blue-700',
  'Pending Manager':    'bg-indigo-100 text-indigo-700',
  'Pending Approval':   'bg-purple-100 text-purple-700',
  'Approved to Process':'bg-green-200 text-green-800',
  'Approved':           'bg-green-100 text-green-700',
  'Rejected':           'bg-red-100 text-red-700',
  'Cancelled':          'bg-slate-100 text-slate-500',
}

function StatusPill({ status }) {
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_CLS[status] || 'bg-slate-100 text-slate-600'}`}>
      {status}
    </span>
  )
}

function RFQTable({ rows, onAction, onDetail, onEdit, onDelete, actionLabel, actionColor, emptyMsg, canEdit, showEditDelete }) {
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('All')

  const filtered = useMemo(() => {
    let list = [...rows]
    if (filterStatus !== 'All') list = list.filter(r => r.status === filterStatus)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(r =>
        (r.requestWorkNo || '').toLowerCase().includes(q) ||
        (r.client || '').toLowerCase().includes(q) ||
        (r.requestor || '').toLowerCase().includes(q) ||
        (r.details || '').toLowerCase().includes(q)
      )
    }
    return list.sort((a, b) => (b.submittedAt || '').localeCompare(a.submittedAt || ''))
  }, [rows, search, filterStatus])

  const canDelete = (rfq) => !['Approved', 'Approved to Process'].includes(rfq.status)

  return (
    <div className="space-y-3">
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-4 py-3 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" placeholder="Search work no., requestor, client…"
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200" />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="px-3 py-2 text-sm border border-slate-300 rounded-lg outline-none focus:border-blue-500 bg-white">
          {ALL_STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <span className="text-xs text-slate-400">{filtered.length} records</span>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Work No.</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Requestor</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Service</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Urgency</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Plan MH</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Cost Est.</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-10 text-center text-slate-400 text-sm">{emptyMsg || 'No records found.'}</td></tr>
              ) : filtered.map(rfq => (
                <tr key={rfq.id} className={`hover:bg-slate-50 transition-colors ${rfq.status === 'Need Clarify' ? 'bg-pink-50' : rfq.status === 'Returned' ? 'bg-orange-50' : ''}`}>
                  <td className="px-4 py-3 font-semibold text-[#0f2035] whitespace-nowrap">{rfq.requestWorkNo}</td>
                  <td className="px-4 py-3 text-slate-700 max-w-[130px] truncate">{rfq.requestor || rfq.client || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      rfq.serviceType === 'CMG' || rfq.type === 'CMG' ? 'bg-purple-100 text-purple-700' :
                      rfq.serviceType === 'PPE' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
                    }`}>{rfq.serviceType || rfq.type || '—'}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${URGENCY_CLS[rfq.urgency] || 'bg-slate-100 text-slate-600'}`}>{rfq.urgency || '—'}</span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-700">{rfq.totalPlannedMH > 0 ? `${rfq.totalPlannedMH} MH` : '—'}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-700">{rfq.totalCost > 0 ? formatIDR(rfq.totalCost) : '—'}</td>
                  <td className="px-4 py-3"><StatusPill status={rfq.status} /></td>
                  <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">{rfq.submittedAt}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {canEdit && onAction && (
                        <button onClick={() => onAction(rfq)}
                          className={`px-2.5 py-1.5 text-xs font-semibold text-white rounded-lg transition-colors ${actionColor}`}>
                          {actionLabel}
                        </button>
                      )}
                      <button onClick={() => onDetail(rfq)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" title="View Details">
                        <Eye size={15} />
                      </button>
                      {showEditDelete && onEdit && (
                        <button onClick={() => onEdit(rfq)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors" title="Edit RFQ">
                          <Pencil size={15} />
                        </button>
                      )}
                      {showEditDelete && onDelete && (
                        canDelete(rfq) ? (
                          <button onClick={() => onDelete(rfq)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="Delete RFQ">
                            <Trash2 size={15} />
                          </button>
                        ) : (
                          <span className="p-1.5 rounded-lg text-slate-200 cursor-not-allowed" title="Cannot delete approved RFQ">
                            <Trash2 size={15} />
                          </span>
                        )
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ─── Main RFQ Page ────────────────────────────────────────────────────────────

const TABS = [
  { id: 'request',   label: 'Request',       icon: FileText,       desc: 'Submit & track all RFQs' },
  { id: 'manhour',   label: 'Manhour Plan',   icon: ClipboardList,  desc: 'WBS manhour planning' },
  { id: 'cost',      label: 'Cost Estimate',  icon: Calculator,     desc: 'Cost breakdown & labour' },
  { id: 'approval',  label: 'Approval',       icon: BadgeCheck,     desc: 'Review & approve RFQs' },
]

export default function RFQ() {
  const { rfqs, addRfq, updateRfq, deleteRfq, currentRole } = useApp()
  const [activeTab, setActiveTab]         = useState('request')
  const [activeModal, setActiveModal]     = useState(null)
  const [deleteTarget, setDeleteTarget]   = useState(null)

  const openModal  = (type, rfq = null) => setActiveModal({ type, rfq })
  const closeModal = () => setActiveModal(null)

  const handleDelete = (rfq) => setDeleteTarget(rfq)
  const confirmDelete = async () => {
    if (deleteTarget) { await deleteRfq(deleteTarget.id); setDeleteTarget(null) }
  }

  const canCreateRfq  = true
  const canPlanMH     = ['ppeLead', 'ppeAdmin', 'MasterAdmin'].includes(currentRole)
  const canCostEst    = ['ppeManager', 'ppeAdmin', 'MasterAdmin'].includes(currentRole)
  const canApprove    = ['Requestor', 'GM/MD', 'ppeAdmin', 'MasterAdmin'].includes(currentRole)

  // Reset to a valid tab when the current one becomes inaccessible (e.g. ppeLead on 'cost')
  React.useEffect(() => {
    if (activeTab === 'cost' && currentRole === 'ppeLead') {
      setActiveTab('manhour')
    }
  }, [currentRole, activeTab])

  // Per-tab filtered lists
  const pendingLeadRfqs       = rfqs.filter(r => r.status === 'Pending Lead')
  const returnedRfqs          = rfqs.filter(r => r.status === 'Returned')
  const needClarifyRfqs       = rfqs.filter(r => r.status === 'Need Clarify')
  const pendingMHRfqs         = rfqs.filter(r => r.status === 'Pending MH')
  const pendingManagerRfqs    = rfqs.filter(r => r.status === 'Pending Manager')
  const pendingApprovalRfqs   = rfqs.filter(r => r.status === 'Pending Approval')
  const approvedToProcessRfqs = rfqs.filter(r => r.status === 'Approved to Process')

  // Cost tab hidden from ppeLead
  const canSeeCostTab = !['ppeLead'].includes(currentRole) || ['ppeAdmin', 'MasterAdmin'].includes(currentRole)

  // Summary stats
  const stats = [
    { label: 'Total RFQs',          value: rfqs.length,                  cls: 'text-slate-800',  bg: 'bg-slate-50' },
    { label: 'Pending Review',       value: pendingLeadRfqs.length,       cls: 'text-yellow-600', bg: 'bg-yellow-50' },
    { label: 'Need Clarify',         value: needClarifyRfqs.length,       cls: 'text-pink-600',   bg: 'bg-pink-50' },
    { label: 'Pending MH Plan',      value: pendingMHRfqs.length,         cls: 'text-blue-600',   bg: 'bg-blue-50' },
    { label: 'Pending Approval',     value: pendingApprovalRfqs.length,   cls: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Approved to Process',  value: approvedToProcessRfqs.length, cls: 'text-green-700',  bg: 'bg-green-50' },
  ]

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-800">RFQ & Estimation Engine</h2>
          <p className="text-xs text-slate-500 mt-0.5">Multi-stage estimation workflow — Request → Manhour Plan → Cost Estimate → Approval</p>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-6 gap-2">
        {stats.map(s => (
          <div key={s.label} className={`${s.bg} rounded-xl border border-slate-200 shadow-sm px-3 py-3 text-center`}>
            <p className={`text-xl font-bold ${s.cls}`}>{s.value}</p>
            <p className="text-[10px] text-slate-500 leading-tight mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex border-b border-slate-200">
          {TABS.map((tab, i) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            // hide Cost tab from ppeLead
            if (tab.id === 'cost' && !canSeeCostTab) return null
            // badge count per tab
            const badge = tab.id === 'request' ? (returnedRfqs.length + needClarifyRfqs.length)
              : tab.id === 'manhour' ? (pendingLeadRfqs.length + pendingMHRfqs.length)
              : tab.id === 'cost' ? pendingManagerRfqs.length
              : tab.id === 'approval' ? (pendingApprovalRfqs.length)
              : null
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex flex-col items-center gap-1 px-4 py-3.5 text-sm font-medium transition-colors relative ${
                  isActive
                    ? 'text-[#0f2035] border-b-2 border-[#0f2035] bg-slate-50'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icon size={15} />
                  <span>{tab.label}</span>
                  {badge > 0 && (
                    <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                      {badge}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-normal text-slate-400 hidden sm:block">{tab.desc}</span>
                {i < TABS.length - 1 && !isActive && (
                  <ChevronRight size={14} className="absolute right-0 top-1/2 -translate-y-1/2 text-slate-200" />
                )}
              </button>
            )
          })}
        </div>

        {/* Tab Content */}
        <div className="p-5">

          {/* Fallback: blank tab state guard */}
          {!['request','manhour','cost','approval'].includes(activeTab) && (
            <div className="py-10 text-center text-slate-400 text-sm">Select a tab above to continue.</div>
          )}

          {/* ── Tab 1: Request ── */}
          {activeTab === 'request' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2"><FileText size={15} className="text-[#0f2035]" /> Request</h3>
                  <p className="text-xs text-slate-400 mt-0.5">All RFQ submissions. Requestor can edit/delete pending RFQs. Communicate with PPE Lead/Manager until agreed.</p>
                </div>
                <button
                  onClick={() => openModal('new')}
                  className="flex items-center gap-2 px-4 py-2 bg-[#0f2035] text-white text-sm font-medium rounded-lg hover:bg-[#162d4a] transition-colors"
                >
                  <Plus size={16} /> New RFQ
                </button>
              </div>

              {/* Need Clarify alert — PPE Lead/Manager requests info */}
              {needClarifyRfqs.length > 0 && (
                <div className="bg-pink-50 border border-pink-200 rounded-xl p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <MessageSquare size={14} className="text-pink-600" />
                    <span className="text-xs font-bold text-pink-700">{needClarifyRfqs.length} RFQ(s) need clarification — PPE Lead / Manager is requesting more information</span>
                  </div>
                  <RFQTable
                    rows={needClarifyRfqs}
                    onDetail={(rfq) => openModal('detail', rfq)}
                    onAction={(rfq) => openModal('revise', rfq)}
                    onEdit={(rfq) => openModal('edit', rfq)}
                    onDelete={handleDelete}
                    actionLabel="Respond & Resubmit"
                    actionColor="bg-pink-600 hover:bg-pink-700"
                    emptyMsg=""
                    canEdit={true}
                    showEditDelete={true}
                  />
                </div>
              )}

              {/* Returned RFQs — needs revision */}
              {returnedRfqs.length > 0 && (
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <XCircle size={14} className="text-orange-600" />
                    <span className="text-xs font-bold text-orange-700">{returnedRfqs.length} RFQ(s) returned — please revise and resubmit</span>
                  </div>
                  <RFQTable
                    rows={returnedRfqs}
                    onDetail={(rfq) => openModal('detail', rfq)}
                    onAction={(rfq) => openModal('revise', rfq)}
                    onEdit={(rfq) => openModal('edit', rfq)}
                    onDelete={handleDelete}
                    actionLabel="Revise & Resubmit"
                    actionColor="bg-orange-500 hover:bg-orange-600"
                    emptyMsg=""
                    canEdit={true}
                    showEditDelete={true}
                  />
                </div>
              )}

              {/* All RFQs */}
              <div>
                <p className="text-xs font-semibold text-slate-500 mb-2">All Submissions</p>
                <RFQTable
                  rows={rfqs}
                  onDetail={(rfq) => openModal('detail', rfq)}
                  onEdit={(rfq) => openModal('edit', rfq)}
                  onDelete={handleDelete}
                  onAction={null}
                  emptyMsg="No RFQ submissions yet. Click 'New RFQ' to create one."
                  canEdit={false}
                  showEditDelete={true}
                />
              </div>
            </div>
          )}

          {/* ── Tab 2: Manhour Plan ── */}
          {activeTab === 'manhour' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2"><ClipboardList size={15} className="text-yellow-500" /> Lead Review & Manhour Plan</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Step 1: Review incoming RFQs — Accept or Return to requestor. Step 2: Build WBS manhour plan for accepted RFQs.</p>
                </div>
              </div>
              {!canPlanMH && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3 text-xs text-yellow-700">
                  You need <span className="font-semibold">PPE Lead</span> or <span className="font-semibold">PPE Admin</span> role to review and plan manhours.
                </div>
              )}

              {/* Step 1: Incoming RFQs awaiting review */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Step 1 — Incoming Review</span>
                  {pendingLeadRfqs.length > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 text-[10px] font-bold">{pendingLeadRfqs.length} pending</span>
                  )}
                </div>
                <RFQTable
                  rows={pendingLeadRfqs}
                  onDetail={(rfq) => openModal('detail', rfq)}
                  onAction={canPlanMH ? (rfq) => openModal('leadReceive', rfq) : null}
                  actionLabel="Review & Respond"
                  actionColor="bg-yellow-500 hover:bg-yellow-600"
                  emptyMsg="No new RFQs pending review."
                  canEdit={canPlanMH}
                />
              </div>

              {/* Step 2: Accepted RFQs awaiting WBS plan */}
              <div className="border-t border-slate-100 pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Step 2 — Manhour Planning (Accepted)</span>
                  {pendingMHRfqs.length > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold">{pendingMHRfqs.length} pending</span>
                  )}
                </div>
                <RFQTable
                  rows={pendingMHRfqs}
                  onDetail={(rfq) => openModal('detail', rfq)}
                  onAction={canPlanMH ? (rfq) => openModal('stage2', rfq) : null}
                  actionLabel="Plan MH"
                  actionColor="bg-blue-600 hover:bg-blue-700"
                  emptyMsg="No accepted RFQs awaiting manhour plan."
                  canEdit={canPlanMH}
                />
              </div>
            </div>
          )}

          {/* ── Tab 3: Cost Estimate ── */}
          {activeTab === 'cost' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2"><Calculator size={15} className="text-blue-500" /> Cost Estimate</h3>
                  <p className="text-xs text-slate-400 mt-0.5">RFQs with completed manhour plans, awaiting cost estimation by PPE Manager.</p>
                </div>
              </div>
              {!canCostEst && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-xs text-blue-700">
                  You need <span className="font-semibold">PPE Manager</span> or <span className="font-semibold">PPE Admin</span> role to estimate costs.
                </div>
              )}
              <RFQTable
                rows={pendingManagerRfqs}
                onDetail={(rfq) => openModal('detail', rfq)}
                onAction={canCostEst ? (rfq) => openModal('stage3', rfq) : null}
                actionLabel="Cost Estimate"
                actionColor="bg-blue-600 hover:bg-blue-700"
                emptyMsg="No RFQs pending cost estimation."
                canEdit={canCostEst}
              />
            </div>
          )}

          {/* ── Tab 4: Approval ── */}
          {activeTab === 'approval' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2"><BadgeCheck size={15} className="text-green-600" /> Approval</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Review cost estimate from PPE Manager. Approve to Process or return for revision. Comment loop until both agree.</p>
                </div>
              </div>
              {!canApprove && (
                <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-xs text-green-700">
                  You need <span className="font-semibold">Requestor</span>, <span className="font-semibold">GM/MD</span>, or <span className="font-semibold">PPE Admin</span> role to approve RFQs.
                </div>
              )}

              {/* Pending review by Requestor */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Awaiting Your Review</span>
                  {pendingApprovalRfqs.length > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-[10px] font-bold">{pendingApprovalRfqs.length} pending</span>
                  )}
                </div>
                <RFQTable
                  rows={pendingApprovalRfqs}
                  onDetail={(rfq) => openModal('detail', rfq)}
                  onAction={canApprove ? (rfq) => openModal('stage4', rfq) : null}
                  actionLabel="Review & Decide"
                  actionColor="bg-green-600 hover:bg-green-700"
                  emptyMsg="No RFQs pending your review."
                  canEdit={canApprove}
                />
              </div>

              {/* Approved to Process */}
              {approvedToProcessRfqs.length > 0 && (
                <div className="border-t border-slate-100 pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle size={14} className="text-green-600" />
                    <span className="text-xs font-bold text-green-700 uppercase tracking-wider">Approved to Process ({approvedToProcessRfqs.length})</span>
                  </div>
                  <RFQTable
                    rows={approvedToProcessRfqs}
                    onDetail={(rfq) => openModal('detail', rfq)}
                    onAction={null}
                    emptyMsg=""
                    canEdit={false}
                  />
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* ── Modals ── */}

      {/* New RFQ */}
      <Modal isOpen={activeModal?.type === 'new'} onClose={closeModal} title="New RFQ — Stage 1: Request" size="lg">
        <Stage1Form
          onClose={closeModal}
          onSave={(form) => {
            addRfq({ ...form, status: 'Pending Lead', submittedBy: currentRole, submittedAt: new Date().toISOString().split('T')[0] })
            closeModal()
          }}
        />
      </Modal>

      {/* Edit RFQ (only for non-Approved/non-Approved to Process) */}
      <Modal isOpen={activeModal?.type === 'edit'} onClose={closeModal}
        title={`Edit RFQ — ${activeModal?.rfq?.requestWorkNo || ''}`} size="lg">
        {activeModal?.rfq && (
          ['Approved', 'Approved to Process'].includes(activeModal.rfq.status) ? (
            <div className="px-6 py-8 text-center text-slate-500">
              <CheckCircle size={32} className="mx-auto text-green-500 mb-3" />
              <p className="font-semibold">This RFQ is {activeModal.rfq.status}</p>
              <p className="text-xs mt-1">RFQs that have been approved cannot be edited or deleted.</p>
              <button onClick={closeModal} className="mt-4 px-4 py-2 text-sm bg-slate-100 rounded-lg">Close</button>
            </div>
          ) : (
            <>
              <div className="px-6 pt-4"><Stepper status={activeModal.rfq.status} /></div>
              <Stage1Form
                initial={activeModal.rfq}
                onClose={closeModal}
                onSave={(form) => {
                  updateRfq(activeModal.rfq.id, { ...form })
                  closeModal()
                }}
              />
            </>
          )
        )}
      </Modal>

      {/* Revise & Resubmit (Returned RFQs) */}
      <Modal isOpen={activeModal?.type === 'revise'} onClose={closeModal} title={`Revise & Resubmit — ${activeModal?.rfq?.requestWorkNo || ''}`} size="lg">
        {activeModal?.rfq && (
          <>
            <div className="px-6 pt-4">
              <Stepper status={activeModal.rfq.status} />
              {activeModal.rfq.leadNote && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg px-4 py-3 mb-4">
                  <p className="text-xs font-semibold text-orange-700 mb-1">Returned by PPE Lead with note:</p>
                  <p className="text-xs text-orange-600">{activeModal.rfq.leadNote}</p>
                </div>
              )}
            </div>
            <Stage1Form
              initial={activeModal.rfq}
              onClose={closeModal}
              onSave={(form) => {
                updateRfq(activeModal.rfq.id, { ...form, status: 'Pending Lead', leadNote: '', resubmittedAt: new Date().toISOString().split('T')[0] })
                closeModal()
              }}
            />
          </>
        )}
      </Modal>

      {/* Lead Receive — Review & Accept/Return */}
      <Modal isOpen={activeModal?.type === 'leadReceive'} onClose={closeModal}
        title={`Lead Review — ${activeModal?.rfq?.requestWorkNo || ''}`} size="lg">
        {activeModal?.rfq && (
          <>
            <div className="px-6 pt-4"><Stepper status={activeModal.rfq.status} /></div>
            <LeadReceiveForm
              rfq={activeModal.rfq}
              onClose={closeModal}
              onReturn={(data) => { updateRfq(activeModal.rfq.id, data); closeModal() }}
              onAccept={(data) => { updateRfq(activeModal.rfq.id, data); closeModal() }}
            />
          </>
        )}
      </Modal>

      {/* Stage 2 — Manhour Plan */}
      <Modal isOpen={activeModal?.type === 'stage2'} onClose={closeModal}
        title={`Manhour Plan — ${activeModal?.rfq?.requestWorkNo || ''}`} size="xl">
        {activeModal?.rfq && (
          <>
            <div className="px-6 pt-4"><Stepper status={activeModal.rfq.status} /></div>
            <Stage2Form rfq={activeModal.rfq} onClose={closeModal}
              onSave={(data) => { updateRfq(activeModal.rfq.id, data); closeModal() }} />
          </>
        )}
      </Modal>

      {/* Stage 3 — Cost Estimate */}
      <Modal isOpen={activeModal?.type === 'stage3'} onClose={closeModal}
        title={`Cost Estimate — ${activeModal?.rfq?.requestWorkNo || ''}`} size="xl">
        {activeModal?.rfq && (
          <>
            <div className="px-6 pt-5"><Stepper status={activeModal.rfq.status} /></div>
            <Stage3Form rfq={activeModal.rfq} onClose={closeModal}
              onSave={(data) => { updateRfq(activeModal.rfq.id, data); closeModal() }}
              onCancel={() => { updateRfq(activeModal.rfq.id, { status: 'Cancelled' }); closeModal() }} />
          </>
        )}
      </Modal>

      {/* Stage 4 — Approval */}
      <Modal isOpen={activeModal?.type === 'stage4'} onClose={closeModal}
        title={`Approval — ${activeModal?.rfq?.requestWorkNo || ''}`} size="lg">
        {activeModal?.rfq && (
          <>
            <div className="px-6 pt-5"><Stepper status={activeModal.rfq.status} /></div>
            <Stage4Form rfq={activeModal.rfq} onClose={closeModal}
              onSave={(data) => { updateRfq(activeModal.rfq.id, data); closeModal() }} />
          </>
        )}
      </Modal>

      {/* Detail View */}
      <Modal isOpen={activeModal?.type === 'detail'} onClose={closeModal}
        title={`RFQ Details — ${activeModal?.rfq?.requestWorkNo || ''}`} size="lg">
        {activeModal?.rfq && <RFQDetail rfq={activeModal.rfq} onClose={closeModal} />}
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Delete RFQ"
        message={`Are you sure you want to delete RFQ "${deleteTarget?.requestWorkNo}"? This action cannot be undone.`}
        confirmLabel="Delete"
        confirmClass="bg-red-600 hover:bg-red-700 text-white"
      />
    </div>
  )
}
