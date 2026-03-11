import React, { useState, useMemo } from 'react'
import {
  Plus, Eye, Search, Trash2, CheckCircle, XCircle, ArrowRight,
  Calculator, Users, DollarSign, ClipboardList, FileText,
  ChevronRight, InboxIcon, ClipboardCheck, BadgeCheck,
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
  if (['Pending Lead', 'Returned'].includes(status)) return 0
  if (['Pending MH'].includes(status))               return 1
  if (['Pending Manager'].includes(status))          return 2
  if (['Pending Approval'].includes(status))         return 3
  if (['Approved', 'Rejected', 'Cancelled'].includes(status)) return 4
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

// ─── Stage 1: Request Form ────────────────────────────────────────────────────

const SERVICE_TYPE_PREFIX = { CMG: 'RQ-CMG-J', PPE: 'RQ-PPE-EJ', Other: 'RQ-Gen-J' }

const EMPTY_RFQ_FORM = {
  dateRequest:  new Date().toISOString().split('T')[0],
  serviceType:  'CMG',
  requestWorkNo: '',
  requestor:    '',
  emailRequestor:'',
  tel:          '',
  projectNo:    '',
  client:       '',
  urgency:      'Normal',
  s1Location:   'ภายในพื้นที่ผู้ว่าจ้าง',
  s2WorkType:   'โครงการใหม่',
  s3WorkKind:   '',
  details:      '',
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

// ─── Stage 2: Manhour Plan (ppeLead) ─────────────────────────────────────────

function Stage2Form({ rfq, onSave, onClose }) {
  const { unitRates, teamRates } = useApp()
  const [wbsItems, setWbsItems] = useState(rfq.wbsItems || [])
  const [assigned, setAssigned] = useState(rfq.assignedEngineers || [])
  const [addRow, setAddRow]     = useState({ unitRateId: '', qty: '', difficulty: 'avg' })

  const totalMH = wbsItems.reduce((s, w) => s + w.totalMH, 0)

  const selectedUR = unitRates.find(r => r.id === addRow.unitRateId)

  const addWbs = () => {
    if (!addRow.unitRateId || !addRow.qty || Number(addRow.qty) <= 0) return
    const ur  = unitRates.find(r => r.id === addRow.unitRateId)
    const mhPerUnit = addRow.difficulty === 'min' ? ur.min : addRow.difficulty === 'max' ? ur.max : ur.avg
    const qty = parseFloat(addRow.qty)
    setWbsItems(prev => [...prev, {
      id: `wbs-${Date.now()}`,
      task: ur.task, unit: ur.unit,
      qty, difficulty: addRow.difficulty,
      unitMH: mhPerUnit, totalMH: +(mhPerUnit * qty).toFixed(2),
    }])
    setAddRow({ unitRateId: '', qty: '', difficulty: 'avg' })
  }

  const removeWbs = (id) => setWbsItems(prev => prev.filter(w => w.id !== id))

  const toggleEngineer = (id) => setAssigned(prev =>
    prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]
  )

  return (
    <div className="px-6 py-5 space-y-5">
      {/* WBS Builder */}
      <div>
        <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2"><ClipboardList size={15} /> WBS Manhour Breakdown</h3>
        {/* Add row */}
        <div className="grid grid-cols-12 gap-2 mb-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
          <div className="col-span-5">
            <label className="text-xs text-slate-500 font-medium block mb-1">Task (from Modal G)</label>
            <select value={addRow.unitRateId} onChange={e => setAddRow(p => ({ ...p, unitRateId: e.target.value }))}
              className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded-md outline-none focus:border-blue-500 bg-white">
              <option value="">— Select Task —</option>
              {unitRates.map(ur => (
                <option key={ur.id} value={ur.id}>{ur.category} — {ur.task} ({ur.unit})</option>
              ))}
            </select>
          </div>
          <div className="col-span-2">
            <label className="text-xs text-slate-500 font-medium block mb-1">Qty</label>
            <input type="number" min="0" step="0.1" value={addRow.qty}
              onChange={e => setAddRow(p => ({ ...p, qty: e.target.value }))}
              className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded-md outline-none focus:border-blue-500" />
          </div>
          <div className="col-span-3">
            <label className="text-xs text-slate-500 font-medium block mb-1">Difficulty</label>
            <select value={addRow.difficulty} onChange={e => setAddRow(p => ({ ...p, difficulty: e.target.value }))}
              className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded-md outline-none focus:border-blue-500 bg-white">
              <option value="min">Easy (Min)</option>
              <option value="avg">Normal (Avg)</option>
              <option value="max">Hard (Max)</option>
            </select>
          </div>
          <div className="col-span-2 flex items-end">
            {selectedUR && addRow.difficulty && (
              <div className="text-xs text-slate-500 mb-2 mr-1">
                {addRow.difficulty === 'min' ? selectedUR.min : addRow.difficulty === 'max' ? selectedUR.max : selectedUR.avg} MH/unit
              </div>
            )}
            <button onClick={addWbs}
              className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md flex items-center gap-1 mb-0.5">
              <Plus size={12} /> Add
            </button>
          </div>
        </div>
        {/* WBS Table */}
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-3 py-2 text-left text-slate-500 font-semibold">Task</th>
                <th className="px-3 py-2 text-left text-slate-500 font-semibold">Unit</th>
                <th className="px-3 py-2 text-right text-slate-500 font-semibold">Qty</th>
                <th className="px-3 py-2 text-left text-slate-500 font-semibold">Difficulty</th>
                <th className="px-3 py-2 text-right text-slate-500 font-semibold">MH/Unit</th>
                <th className="px-3 py-2 text-right text-slate-500 font-semibold">Total MH</th>
                <th className="px-3 py-2 w-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {wbsItems.length === 0 ? (
                <tr><td colSpan={7} className="px-3 py-6 text-center text-slate-400">No WBS items yet. Add tasks above.</td></tr>
              ) : wbsItems.map(w => (
                <tr key={w.id} className="hover:bg-slate-50">
                  <td className="px-3 py-2 font-medium text-slate-800">{w.task}</td>
                  <td className="px-3 py-2 text-slate-500">{w.unit}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{w.qty}</td>
                  <td className="px-3 py-2">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${w.difficulty === 'max' ? 'bg-red-100 text-red-600' : w.difficulty === 'min' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
                      {w.difficulty === 'min' ? 'Easy' : w.difficulty === 'max' ? 'Hard' : 'Normal'}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{w.unitMH}</td>
                  <td className="px-3 py-2 text-right font-semibold tabular-nums text-[#0f2035]">{w.totalMH}</td>
                  <td className="px-3 py-2">
                    <button onClick={() => removeWbs(w.id)} className="text-slate-300 hover:text-red-500 transition-colors">
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            {wbsItems.length > 0 && (
              <tfoot className="border-t-2 border-slate-300 bg-slate-50">
                <tr>
                  <td colSpan={5} className="px-3 py-2 font-semibold text-slate-700 text-right">Total Planned MH:</td>
                  <td className="px-3 py-2 font-bold text-[#0f2035] text-right tabular-nums text-sm">{totalMH.toFixed(2)}</td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Assign Engineers */}
      <div>
        <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2"><Users size={15} /> Assign Engineers</h3>
        <div className="grid grid-cols-2 gap-2">
          {teamRates.map(eng => (
            <label key={eng.id}
              className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors ${assigned.includes(eng.id) ? 'border-blue-400 bg-blue-50' : 'border-slate-200 hover:bg-slate-50'}`}>
              <input type="checkbox" checked={assigned.includes(eng.id)} onChange={() => toggleEngineer(eng.id)} className="accent-blue-600" />
              <div className="w-7 h-7 rounded-full bg-[#0f2035] text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                {eng.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-800 truncate">{eng.name}</p>
                <p className="text-[10px] text-slate-500">{eng.position}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      <div className="flex justify-between gap-3 pt-2 border-t border-slate-100">
        <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg">Cancel</button>
        <button
          onClick={() => wbsItems.length > 0 && onSave({ wbsItems, assignedEngineers: assigned, totalPlannedMH: +totalMH.toFixed(2), status: 'Pending Manager' })}
          disabled={wbsItems.length === 0}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
          Submit to Manager <ArrowRight size={14} />
        </button>
      </div>
    </div>
  )
}

// ─── Stage 3: Cost Estimate (ppeManager) ─────────────────────────────────────

function Stage3Form({ rfq, onSave, onClose, onCancel }) {
  const { teamRates } = useApp()
  const [costItems, setCostItems] = useState(rfq.costItems || [])
  const [addCost, setAddCost]     = useState({ type: 'Direct', description: '', amount: '' })
  const [showConfirmCancel, setShowConfirmCancel] = useState(false)

  // AUTO: labour cost from assigned engineers × planned MH
  const labourCost = useMemo(() => {
    const engineers = (rfq.assignedEngineers || []).map(id => teamRates.find(t => t.id === id)).filter(Boolean)
    if (!engineers.length || !rfq.totalPlannedMH) return 0
    const avgRate = engineers.reduce((s, e) => s + e.ratePerHour, 0) / engineers.length
    return Math.round(avgRate * rfq.totalPlannedMH)
  }, [rfq.assignedEngineers, rfq.totalPlannedMH, teamRates])

  const assignedEngineers = (rfq.assignedEngineers || [])
    .map(id => teamRates.find(t => t.id === id))
    .filter(Boolean)

  const manualTotal  = costItems.reduce((s, c) => s + Number(c.amount), 0)
  const totalCost    = labourCost + manualTotal

  const addCostItem = () => {
    if (!addCost.description.trim() || !addCost.amount || Number(addCost.amount) <= 0) return
    setCostItems(prev => [...prev, { id: `ci-${Date.now()}`, type: addCost.type, description: addCost.description.trim(), amount: Number(addCost.amount) }])
    setAddCost({ type: 'Direct', description: '', amount: '' })
  }

  const removeCostItem = (id) => setCostItems(prev => prev.filter(c => c.id !== id))

  return (
    <div className="px-6 py-5 space-y-5">
      {/* Summary from Stage 2 */}
      <div className="bg-slate-50 rounded-lg border border-slate-200 p-4">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">From Manhour Plan</p>
        <div className="flex gap-6">
          <div>
            <p className="text-xl font-bold text-[#0f2035]">{rfq.totalPlannedMH} MH</p>
            <p className="text-xs text-slate-500">Total Planned Manhours</p>
          </div>
          <div>
            <p className="text-xl font-bold text-[#0f2035]">{rfq.wbsItems?.length || 0}</p>
            <p className="text-xs text-slate-500">WBS Tasks</p>
          </div>
        </div>
      </div>

      {/* Auto Labour Cost from Modal H */}
      <div>
        <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
          <Calculator size={15} />
          Auto-Calculated Labour Cost
          <span className="text-[10px] font-normal text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-200">Pulled from Modal H</span>
        </h3>
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 space-y-2">
          <div className="flex flex-wrap gap-2 mb-3">
            {assignedEngineers.map(eng => (
              <div key={eng.id} className="flex items-center gap-1.5 bg-white border border-green-200 rounded-lg px-2.5 py-1.5">
                <div className="w-6 h-6 rounded-full bg-[#0f2035] text-white flex items-center justify-center text-[9px] font-bold">
                  {eng.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-700">{eng.name}</p>
                  <p className="text-[10px] text-slate-500">{formatIDR(eng.ratePerHour)}/hr</p>
                </div>
              </div>
            ))}
            {assignedEngineers.length === 0 && <p className="text-xs text-slate-400">No engineers assigned in Stage 2.</p>}
          </div>
          <div className="flex items-center justify-between border-t border-green-200 pt-2">
            <div className="text-xs text-slate-600">
              Avg Rate ({formatIDR(assignedEngineers.length ? Math.round(assignedEngineers.reduce((s,e) => s+e.ratePerHour,0)/assignedEngineers.length) : 0)}/hr)
              × {rfq.totalPlannedMH} MH
            </div>
            <span className="font-bold text-green-700 text-sm">{formatIDR(labourCost)}</span>
          </div>
        </div>
      </div>

      {/* Additional Cost Items */}
      <div>
        <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2"><DollarSign size={15} /> Additional Cost Items</h3>
        <div className="grid grid-cols-12 gap-2 mb-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
          <div className="col-span-2">
            <label className="text-xs text-slate-500 font-medium block mb-1">Type</label>
            <select value={addCost.type} onChange={e => setAddCost(p => ({ ...p, type: e.target.value }))}
              className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded-md outline-none focus:border-blue-500 bg-white">
              <option>Direct</option>
              <option>Indirect</option>
            </select>
          </div>
          <div className="col-span-6">
            <label className="text-xs text-slate-500 font-medium block mb-1">Description</label>
            <input value={addCost.description} onChange={e => setAddCost(p => ({ ...p, description: e.target.value }))}
              placeholder="e.g. Materials, Mobilization…"
              className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded-md outline-none focus:border-blue-500" />
          </div>
          <div className="col-span-3">
            <label className="text-xs text-slate-500 font-medium block mb-1">Amount (THB)</label>
            <input type="number" min="0" value={addCost.amount} onChange={e => setAddCost(p => ({ ...p, amount: e.target.value }))}
              placeholder="0"
              className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded-md outline-none focus:border-blue-500" />
          </div>
          <div className="col-span-1 flex items-end">
            <button onClick={addCostItem}
              className="px-2 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md flex items-center gap-1">
              <Plus size={11} />
            </button>
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-3 py-2 text-left text-slate-500 font-semibold">Type</th>
                <th className="px-3 py-2 text-left text-slate-500 font-semibold">Description</th>
                <th className="px-3 py-2 text-right text-slate-500 font-semibold">Amount</th>
                <th className="px-3 py-2 w-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {/* Auto labour row */}
              <tr className="bg-green-50">
                <td className="px-3 py-2"><span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-green-100 text-green-700">Labour</span></td>
                <td className="px-3 py-2 text-slate-600">Engineer Labour Cost (auto)</td>
                <td className="px-3 py-2 text-right font-semibold tabular-nums text-green-700">{formatIDR(labourCost)}</td>
                <td></td>
              </tr>
              {costItems.length === 0 && (
                <tr><td colSpan={4} className="px-3 py-4 text-center text-slate-400">No additional items.</td></tr>
              )}
              {costItems.map(c => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="px-3 py-2">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${c.type === 'Direct' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                      {c.type}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-slate-700">{c.description}</td>
                  <td className="px-3 py-2 text-right font-semibold tabular-nums">{formatIDR(c.amount)}</td>
                  <td className="px-3 py-2">
                    <button onClick={() => removeCostItem(c.id)} className="text-slate-300 hover:text-red-500 transition-colors">
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t-2 border-slate-300 bg-slate-50">
              <tr>
                <td colSpan={2} className="px-3 py-2 font-bold text-slate-700 text-right">TOTAL COST ESTIMATE:</td>
                <td className="px-3 py-2 font-bold text-[#0f2035] text-right tabular-nums text-sm">{formatIDR(totalCost)}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div className="flex justify-between gap-3 pt-2 border-t border-slate-100">
        <button onClick={() => setShowConfirmCancel(true)}
          className="px-4 py-2 text-sm font-medium text-red-600 border border-red-200 bg-red-50 hover:bg-red-100 rounded-lg flex items-center gap-2">
          <XCircle size={15} /> Mark Cancelled / Lost
        </button>
        <div className="flex gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg">Cancel</button>
          <button onClick={() => onSave({ costItems, totalCost, status: 'Pending Approval' })}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-2">
            Submit to Requestor <ArrowRight size={14} />
          </button>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showConfirmCancel}
        onClose={() => setShowConfirmCancel(false)}
        onConfirm={() => { onCancel(); onClose() }}
        title="Mark as Cancelled / Lost"
        message="Are you sure you want to mark this RFQ as Cancelled/Lost? This cannot be undone."
      />
    </div>
  )
}

// ─── Stage 4: Approval (Requestor / GM/MD) ───────────────────────────────────

function Stage4Form({ rfq, onSave, onClose }) {
  const { teamRates } = useApp()
  const [note, setNote] = useState(rfq.approvalNote || '')

  const assignedEngineers = (rfq.assignedEngineers || [])
    .map(id => teamRates.find(t => t.id === id))
    .filter(Boolean)

  return (
    <div className="px-6 py-5 space-y-5">
      {/* Cost Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 text-center">
          <p className="text-xl font-bold text-[#0f2035]">{rfq.totalPlannedMH}</p>
          <p className="text-xs text-slate-500 mt-0.5">Total Planned MH</p>
        </div>
        <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 text-center">
          <p className="text-xl font-bold text-[#0f2035]">{rfq.wbsItems?.length || 0}</p>
          <p className="text-xs text-slate-500 mt-0.5">WBS Tasks</p>
        </div>
        <div className="bg-green-50 rounded-xl border border-green-200 p-4 text-center">
          <p className="text-xl font-bold text-green-700">{formatIDR(rfq.totalCost)}</p>
          <p className="text-xs text-slate-500 mt-0.5">Total Cost Estimate</p>
        </div>
      </div>

      {/* Assigned Engineers */}
      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Assigned Engineers</p>
        <div className="flex flex-wrap gap-2">
          {assignedEngineers.map(eng => (
            <div key={eng.id} className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5">
              <div className="w-6 h-6 rounded-full bg-[#0f2035] text-white flex items-center justify-center text-[9px] font-bold">
                {eng.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <span className="text-xs font-medium text-slate-700">{eng.name}</span>
              <span className="text-[10px] text-slate-400">{eng.position}</span>
            </div>
          ))}
          {assignedEngineers.length === 0 && <p className="text-xs text-slate-400">No engineers assigned.</p>}
        </div>
      </div>

      {/* WBS Summary */}
      {rfq.wbsItems?.length > 0 && (
        <div className="rounded-lg border border-slate-200 overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-3 py-2 text-left text-slate-500 font-semibold">Task</th>
                <th className="px-3 py-2 text-right text-slate-500 font-semibold">Qty</th>
                <th className="px-3 py-2 text-right text-slate-500 font-semibold">Total MH</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rfq.wbsItems.map(w => (
                <tr key={w.id}>
                  <td className="px-3 py-2 text-slate-700">{w.task}</td>
                  <td className="px-3 py-2 text-right">{w.qty} {w.unit}</td>
                  <td className="px-3 py-2 text-right font-semibold">{w.totalMH}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Approval Note */}
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1">Approval Note (optional)</label>
        <textarea rows={3} value={note} onChange={e => setNote(e.target.value)}
          placeholder="Add remarks, conditions, or rejection reason…"
          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg outline-none resize-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200"
        />
      </div>

      <div className="flex justify-between gap-3 pt-2 border-t border-slate-100">
        <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg">Close</button>
        <div className="flex gap-3">
          <button onClick={() => onSave({ status: 'Rejected', approvalNote: note })}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg flex items-center gap-2">
            <XCircle size={15} /> Reject
          </button>
          <button onClick={() => onSave({ status: 'Approved', approvalNote: note })}
            className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg flex items-center gap-2">
            <CheckCircle size={15} /> Approve
          </button>
        </div>
      </div>
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

function RFQTable({ rows, onAction, onDetail, actionLabel, actionColor, emptyMsg, canEdit }) {
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('All')
  const STATUS_OPTIONS = ['All', 'Pending Lead', 'Pending Manager', 'Pending Approval', 'Approved', 'Rejected', 'Cancelled']

  const filtered = useMemo(() => {
    let list = [...rows]
    if (filterStatus !== 'All') list = list.filter(r => r.status === filterStatus)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(r =>
        r.requestWorkNo.toLowerCase().includes(q) ||
        r.client.toLowerCase().includes(q) ||
        (r.details || '').toLowerCase().includes(q)
      )
    }
    return list.sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
  }, [rows, search, filterStatus])

  return (
    <div className="space-y-3">
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-4 py-3 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" placeholder="Search work no., client…"
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200" />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="px-3 py-2 text-sm border border-slate-300 rounded-lg outline-none focus:border-blue-500 bg-white">
          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <span className="text-xs text-slate-400">{filtered.length} records</span>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Work No.</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Client</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Type</th>
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
                <tr key={rfq.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-semibold text-[#0f2035]">{rfq.requestWorkNo}</td>
                  <td className="px-4 py-3 text-slate-700 max-w-[140px] truncate">{rfq.client}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${rfq.type === 'CMG' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>{rfq.type}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${URGENCY_CLS[rfq.urgency] || 'bg-slate-100 text-slate-600'}`}>{rfq.urgency}</span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-700">{rfq.totalPlannedMH > 0 ? `${rfq.totalPlannedMH} MH` : '—'}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-700">{rfq.totalCost > 0 ? formatIDR(rfq.totalCost) : '—'}</td>
                  <td className="px-4 py-3"><StatusBadge status={rfq.status} /></td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{rfq.submittedAt}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {canEdit && onAction && (
                        <button onClick={() => onAction(rfq)}
                          className={`px-3 py-1.5 text-xs font-semibold text-white rounded-lg transition-colors ${actionColor}`}>
                          {actionLabel}
                        </button>
                      )}
                      <button onClick={() => onDetail(rfq)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" title="View Details">
                        <Eye size={15} />
                      </button>
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
  const { rfqs, addRfq, updateRfq, currentRole } = useApp()
  const [activeTab, setActiveTab]     = useState('request')
  const [activeModal, setActiveModal] = useState(null)

  const openModal = (type, rfq = null) => setActiveModal({ type, rfq })
  const closeModal = () => setActiveModal(null)

  const canCreateRfq  = true // Any authenticated user can submit an RFQ request
  const canPlanMH     = ['ppeLead', 'ppeAdmin'].includes(currentRole)
  const canCostEst    = ['ppeManager', 'ppeAdmin'].includes(currentRole)
  const canApprove    = ['Requestor', 'GM/MD', 'ppeAdmin'].includes(currentRole)

  // Per-tab filtered lists
  const pendingLeadRfqs     = rfqs.filter(r => r.status === 'Pending Lead')
  const returnedRfqs        = rfqs.filter(r => r.status === 'Returned')
  const pendingMHRfqs       = rfqs.filter(r => r.status === 'Pending MH')
  const pendingManagerRfqs  = rfqs.filter(r => r.status === 'Pending Manager')
  const pendingApprovalRfqs = rfqs.filter(r => r.status === 'Pending Approval')

  // Summary stats
  const stats = [
    { label: 'Total RFQs',        value: rfqs.length,                                                                          cls: 'text-slate-800',  bg: 'bg-slate-50' },
    { label: 'Pending Review',    value: pendingLeadRfqs.length,                                                                cls: 'text-yellow-600', bg: 'bg-yellow-50' },
    { label: 'Returned',          value: returnedRfqs.length,                                                                   cls: 'text-orange-600', bg: 'bg-orange-50' },
    { label: 'Pending MH Plan',   value: pendingMHRfqs.length,                                                                  cls: 'text-blue-600',   bg: 'bg-blue-50' },
    { label: 'Pending Approval',  value: pendingApprovalRfqs.length,                                                           cls: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Approved',          value: rfqs.filter(r => r.status === 'Approved').length,                                     cls: 'text-green-600',  bg: 'bg-green-50' },
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
            // badge count per tab
            const badge = tab.id === 'request' ? returnedRfqs.length
              : tab.id === 'manhour' ? (pendingLeadRfqs.length + pendingMHRfqs.length)
              : tab.id === 'cost' ? pendingManagerRfqs.length
              : tab.id === 'approval' ? pendingApprovalRfqs.length
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

          {/* ── Tab 1: Request ── */}
          {activeTab === 'request' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2"><FileText size={15} className="text-[#0f2035]" /> Request</h3>
                  <p className="text-xs text-slate-400 mt-0.5">All RFQ submissions. Returned RFQs can be revised and resubmitted.</p>
                </div>
                <button
                  onClick={() => openModal('new')}
                  className="flex items-center gap-2 px-4 py-2 bg-[#0f2035] text-white text-sm font-medium rounded-lg hover:bg-[#162d4a] transition-colors"
                >
                  <Plus size={16} /> New RFQ
                </button>
              </div>

              {/* Returned RFQs — needs attention */}
              {returnedRfqs.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-100 text-orange-700 text-xs font-semibold">
                      <XCircle size={11} /> {returnedRfqs.length} Returned — Needs Revision
                    </span>
                  </div>
                  <RFQTable
                    rows={returnedRfqs}
                    onDetail={(rfq) => openModal('detail', rfq)}
                    onAction={(rfq) => openModal('revise', rfq)}
                    actionLabel="Revise & Resubmit"
                    actionColor="bg-orange-500 hover:bg-orange-600"
                    emptyMsg=""
                    canEdit={true}
                  />
                </div>
              )}

              {/* All RFQs */}
              <div>
                <p className="text-xs font-semibold text-slate-500 mb-2">All Submissions</p>
                <RFQTable
                  rows={rfqs}
                  onDetail={(rfq) => openModal('detail', rfq)}
                  onAction={null}
                  emptyMsg="No RFQ submissions yet. Click 'New RFQ' to create one."
                  canEdit={false}
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
                  <p className="text-xs text-slate-400 mt-0.5">RFQs with cost estimates ready for Requestor / GM/MD review and final approval.</p>
                </div>
              </div>
              {!canApprove && (
                <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-xs text-green-700">
                  You need <span className="font-semibold">Requestor</span>, <span className="font-semibold">GM/MD</span>, or <span className="font-semibold">PPE Admin</span> role to approve RFQs.
                </div>
              )}
              <RFQTable
                rows={pendingApprovalRfqs}
                onDetail={(rfq) => openModal('detail', rfq)}
                onAction={canApprove ? (rfq) => openModal('stage4', rfq) : null}
                actionLabel="Review & Approve"
                actionColor="bg-green-600 hover:bg-green-700"
                emptyMsg="No RFQs pending approval."
                canEdit={canApprove}
              />
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
              onCancel={() => updateRfq(activeModal.rfq.id, { status: 'Cancelled' })} />
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
    </div>
  )
}
