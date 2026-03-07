import React, { useState, useMemo } from 'react'
import {
  Plus, Eye, Search, FileText, ChevronDown, ChevronUp,
  Trash2, CheckCircle, XCircle, AlertTriangle, ArrowRight,
  Calculator, Users, DollarSign, ClipboardList,
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

const STAGES = ['Request', 'Manhour Plan', 'Cost Estimate', 'Approval']

function stageName(status) {
  if (['Pending Lead'].includes(status))     return 0
  if (['Pending Manager'].includes(status))  return 1
  if (['Pending Approval'].includes(status)) return 2
  if (['Approved', 'Rejected'].includes(status)) return 3
  return -1
}

function Stepper({ status }) {
  const active = stageName(status)
  if (active < 0) return null
  return (
    <div className="flex items-center gap-0 mb-6">
      {STAGES.map((s, i) => (
        <React.Fragment key={s}>
          <div className="flex flex-col items-center">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors ${
              i < active  ? 'bg-green-500 border-green-500 text-white'
              : i === active ? 'bg-blue-600 border-blue-600 text-white'
              : 'bg-white border-slate-300 text-slate-400'
            }`}>{i < active ? '✓' : i + 1}</div>
            <span className={`text-[10px] mt-1 font-medium ${i === active ? 'text-blue-600' : i < active ? 'text-green-600' : 'text-slate-400'}`}>{s}</span>
          </div>
          {i < STAGES.length - 1 && (
            <div className={`flex-1 h-0.5 mx-1 mb-4 ${i < active ? 'bg-green-400' : 'bg-slate-200'}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  )
}

// ─── Stage 1: Request Form ────────────────────────────────────────────────────

const EMPTY_RFQ_FORM = {
  requestWorkNo: '', client: '', type: 'External', urgency: 'Normal', details: '',
}

function Stage1Form({ onSave, onClose, initial }) {
  const [form, setForm] = useState(initial || EMPTY_RFQ_FORM)
  const [errors, setErrors] = useState({})

  const validate = () => {
    const e = {}
    if (!form.requestWorkNo.trim()) e.requestWorkNo = 'Work No. is required'
    if (!form.client.trim())         e.client = 'Client is required'
    if (!form.details.trim())        e.details = 'Details are required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const fld = (key, label, opts = {}) => (
    <div>
      <label className="block text-xs font-semibold text-slate-600 mb-1">{label}</label>
      <input
        value={form[key]}
        onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
        className={`w-full px-3 py-2 text-sm border rounded-lg outline-none transition-colors ${errors[key] ? 'border-red-400 bg-red-50' : 'border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-200'}`}
        {...opts}
      />
      {errors[key] && <p className="text-xs text-red-500 mt-1">{errors[key]}</p>}
    </div>
  )

  return (
    <div className="px-6 py-5 space-y-4">
      <div className="grid grid-cols-2 gap-4">
        {fld('requestWorkNo', 'Request Work No.', { placeholder: 'e.g. RWN-2024-004' })}
        {fld('client', 'Client / Project Owner', { placeholder: 'e.g. PT Pertamina' })}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Project Type</label>
          <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg outline-none focus:border-blue-500 bg-white">
            <option>CMG</option>
            <option>External</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Urgency</label>
          <select value={form.urgency} onChange={e => setForm(p => ({ ...p, urgency: e.target.value }))}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg outline-none focus:border-blue-500 bg-white">
            <option>Low</option>
            <option>Normal</option>
            <option>High</option>
            <option>Urgent</option>
          </select>
        </div>
      </div>
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1">Scope of Work / Details</label>
        <textarea
          rows={4}
          value={form.details}
          onChange={e => setForm(p => ({ ...p, details: e.target.value }))}
          placeholder="Describe the scope, location, and requirements…"
          className={`w-full px-3 py-2 text-sm border rounded-lg outline-none transition-colors resize-none ${errors.details ? 'border-red-400 bg-red-50' : 'border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-200'}`}
        />
        {errors.details && <p className="text-xs text-red-500 mt-1">{errors.details}</p>}
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

  return (
    <div className="px-6 py-5 space-y-4">
      <div className="grid grid-cols-2 gap-4 text-sm">
        {[
          ['Work No.', rfq.requestWorkNo],
          ['Client', rfq.client],
          ['Type', rfq.type],
          ['Urgency', rfq.urgency],
          ['Submitted', rfq.submittedAt],
          ['Status', rfq.status],
        ].map(([k, v]) => (
          <div key={k}>
            <p className="text-xs text-slate-400 font-medium">{k}</p>
            <p className="font-semibold text-slate-800">{v}</p>
          </div>
        ))}
      </div>
      <div>
        <p className="text-xs text-slate-400 font-medium mb-1">Scope of Work</p>
        <p className="text-sm text-slate-700 bg-slate-50 rounded-lg p-3 border border-slate-200">{rfq.details}</p>
      </div>
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

// ─── Main RFQ Page ────────────────────────────────────────────────────────────

export default function RFQ() {
  const { rfqs, addRfq, updateRfq, currentRole } = useApp()

  const [search, setSearch]           = useState('')
  const [filterStatus, setFilterStatus] = useState('All')
  const [activeModal, setActiveModal] = useState(null) // { type, rfq }

  const STATUS_OPTIONS = ['All', 'Pending Lead', 'Pending Manager', 'Pending Approval', 'Approved', 'Rejected', 'Cancelled']

  const displayed = useMemo(() => {
    let list = [...rfqs]
    if (filterStatus !== 'All') list = list.filter(r => r.status === filterStatus)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(r =>
        r.requestWorkNo.toLowerCase().includes(q) ||
        r.client.toLowerCase().includes(q) ||
        r.details.toLowerCase().includes(q)
      )
    }
    return list.sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
  }, [rfqs, search, filterStatus])

  const openModal = (type, rfq = null) => setActiveModal({ type, rfq })
  const closeModal = () => setActiveModal(null)

  const canCreateRfq = ['Requestor', 'ppeAdmin'].includes(currentRole)

  const getActionButton = (rfq) => {
    if (rfq.status === 'Pending Lead' && ['ppeLead', 'ppeAdmin'].includes(currentRole)) {
      return { label: 'Plan MH', color: 'bg-yellow-500 hover:bg-yellow-600', action: () => openModal('stage2', rfq) }
    }
    if (rfq.status === 'Pending Manager' && ['ppeManager', 'ppeAdmin'].includes(currentRole)) {
      return { label: 'Cost Estimate', color: 'bg-blue-600 hover:bg-blue-700', action: () => openModal('stage3', rfq) }
    }
    if (rfq.status === 'Pending Approval' && ['Requestor', 'GM/MD', 'ppeAdmin'].includes(currentRole)) {
      return { label: 'Review & Approve', color: 'bg-green-600 hover:bg-green-700', action: () => openModal('stage4', rfq) }
    }
    return null
  }

  // Stats
  const stats = {
    total:    rfqs.length,
    pending:  rfqs.filter(r => ['Pending Lead','Pending Manager','Pending Approval'].includes(r.status)).length,
    approved: rfqs.filter(r => r.status === 'Approved').length,
    cancelled:rfqs.filter(r => ['Cancelled','Rejected','Lost'].includes(r.status)).length,
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-800">RFQ & Estimation Engine</h2>
          <p className="text-xs text-slate-500 mt-0.5">Modal A/B — Multi-stage estimation workflow</p>
        </div>
        {canCreateRfq && (
          <button onClick={() => openModal('new')}
            className="flex items-center gap-2 px-4 py-2 bg-[#0f2035] text-white text-sm font-medium rounded-lg hover:bg-[#162d4a] transition-colors">
            <Plus size={16} /> New RFQ
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total RFQs',   value: stats.total,     cls: 'text-slate-800' },
          { label: 'In Progress',  value: stats.pending,   cls: 'text-yellow-600' },
          { label: 'Approved',     value: stats.approved,  cls: 'text-green-600' },
          { label: 'Cancelled',    value: stats.cancelled, cls: 'text-red-600' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-slate-200 shadow-sm px-4 py-3">
            <p className={`text-2xl font-bold ${s.cls}`}>{s.value}</p>
            <p className="text-xs text-slate-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-4 py-3 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" placeholder="Search work no., client, details…"
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200" />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="px-3 py-2 text-sm border border-slate-300 rounded-lg outline-none focus:border-blue-500 bg-white">
          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <span className="text-xs text-slate-400">{displayed.length} records</span>
      </div>

      {/* Table */}
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
              {displayed.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-slate-400 text-sm">No RFQ records found.</td>
                </tr>
              ) : displayed.map(rfq => {
                const action = getActionButton(rfq)
                return (
                  <tr key={rfq.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-semibold text-[#0f2035]">{rfq.requestWorkNo}</td>
                    <td className="px-4 py-3 text-slate-700 max-w-[140px] truncate">{rfq.client}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${rfq.type === 'CMG' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                        {rfq.type}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${URGENCY_CLS[rfq.urgency] || 'bg-slate-100 text-slate-600'}`}>
                        {rfq.urgency}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-700">
                      {rfq.totalPlannedMH > 0 ? `${rfq.totalPlannedMH} MH` : '—'}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-700">
                      {rfq.totalCost > 0 ? formatIDR(rfq.totalCost) : '—'}
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={rfq.status} /></td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{rfq.submittedAt}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        {action && (
                          <button onClick={action.action}
                            className={`px-3 py-1.5 text-xs font-semibold text-white rounded-lg transition-colors ${action.color}`}>
                            {action.label}
                          </button>
                        )}
                        <button onClick={() => openModal('detail', rfq)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" title="View Details">
                          <Eye size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Modals ─────────────────────────────────────────────────────────── */}

      {/* New RFQ */}
      <Modal isOpen={activeModal?.type === 'new'} onClose={closeModal} title="New RFQ — Stage 1: Request" size="lg">
        <Stage1Form
          onClose={closeModal}
          onSave={(form) => {
            addRfq({
              ...form,
              status: 'Pending Lead',
              submittedBy: currentRole,
              submittedAt: new Date().toISOString().split('T')[0],
            })
            closeModal()
          }}
        />
      </Modal>

      {/* Stage 2 — Manhour Plan */}
      <Modal isOpen={activeModal?.type === 'stage2'} onClose={closeModal}
        title={`Stage 2: Manhour Plan — ${activeModal?.rfq?.requestWorkNo || ''}`} size="xl">
        {activeModal?.rfq && (
          <>
            <div className="px-6 pt-5"><Stepper status={activeModal.rfq.status} /></div>
            <Stage2Form rfq={activeModal.rfq} onClose={closeModal}
              onSave={(data) => { updateRfq(activeModal.rfq.id, data); closeModal() }} />
          </>
        )}
      </Modal>

      {/* Stage 3 — Cost Estimate */}
      <Modal isOpen={activeModal?.type === 'stage3'} onClose={closeModal}
        title={`Stage 3: Cost Estimate — ${activeModal?.rfq?.requestWorkNo || ''}`} size="xl">
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
        title={`Stage 4: Approval — ${activeModal?.rfq?.requestWorkNo || ''}`} size="lg">
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
