import React, { useState, useMemo, useRef } from 'react'
import { Plus, Pencil, Trash2, Search, ChevronUp, ChevronDown, Lock, DollarSign, Download, Upload, FileSpreadsheet, AlertCircle, CheckCircle, X } from 'lucide-react'
import { useApp } from '../context/AppContext'
import Modal from '../components/ui/Modal'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import { exportTeamRates, downloadTeamRateTemplate, parseTeamRatesExcel } from '../utils/excelUtils'

const POSITIONS = [
  'Lead Engineer',
  'Senior Engineer',
  'Engineer',
  'Junior Engineer',
  'Senior Technician',
  'Technician',
  'Drafter',
  'Admin',
  'Senior Architect',
  'Architect',
]

const ALLOWED_ROLES = ['ppeLead', 'ppeManager', 'ppeAdmin', 'MasterAdmin', 'GM/MD']

const ADJUST_FACTORS = [1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 2.0]

const EMPTY_FORM = { name: '', position: 'Engineer', budgetaryRate: '', adjustRateFactor: '', ratePerHour: '' }

function formatIDR(value) {
  if (value === null || value === undefined || value === '') return '—'
  return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 }).format(value)
}

export default function TeamRates() {
  const { teamRates, addTeamRate, updateTeamRate, deleteTeamRate, userHasRole } = useApp()

  const hasAccess = userHasRole(ALLOWED_ROLES)

  const [search, setSearch]         = useState('')
  const [filterPos, setFilterPos]   = useState('All')
  const [sortKey, setSortKey]       = useState('name')
  const [sortDir, setSortDir]       = useState('asc')
  const [modalOpen, setModalOpen]   = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [form, setForm]             = useState(EMPTY_FORM)
  const [errors, setErrors]         = useState({})
  const [deleteTarget, setDeleteTarget] = useState(null)

  // ── Excel state ─────────────────────────────────────────────────────────
  const importRef = useRef(null)
  const [importResult, setImportResult] = useState(null)
  const [importing, setImporting]       = useState(false)
  const [importDone, setImportDone]     = useState(false)

  // ── Excel handlers ───────────────────────────────────────────────────────
  const handleImportFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    try {
      const result = await parseTeamRatesExcel(file)
      setImportResult(result)
      setImportDone(false)
    } catch (err) {
      setImportResult({ parseError: err.message })
    }
  }

  const handleConfirmImport = async () => {
    if (!importResult?.valid?.length) return
    setImporting(true)
    for (const row of importResult.valid) {
      await addTeamRate(row)
    }
    setImporting(false)
    setImportDone(true)
  }

  // ── Access Guard ─────────────────────────────────────────────────────────
  if (!hasAccess) {
    return (
      <div className="flex flex-col items-center justify-center h-72 bg-white rounded-xl border border-slate-200 shadow-sm gap-4">
        <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
          <Lock size={28} className="text-red-400" />
        </div>
        <div className="text-center">
          <p className="font-semibold text-slate-700">Access Restricted</p>
          <p className="text-sm text-slate-400 mt-1">
            Team Hourly Rate data is only visible to PPE Lead, PPE Manager, and PPE Admin.
          </p>
        </div>
        <span className="px-3 py-1 text-xs font-medium bg-red-100 text-red-600 rounded-full">
          Current role: {currentRole}
        </span>
      </div>
    )
  }

  // ── Derived list ──────────────────────────────────────────────────────────
  const displayed = useMemo(() => {
    let list = [...teamRates]
    if (filterPos !== 'All') list = list.filter(r => r.position === filterPos)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(r => r.name.toLowerCase().includes(q) || r.position.toLowerCase().includes(q))
    }
    list.sort((a, b) => {
      const av = typeof a[sortKey] === 'string' ? a[sortKey].toLowerCase() : a[sortKey]
      const bv = typeof b[sortKey] === 'string' ? b[sortKey].toLowerCase() : b[sortKey]
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })
    return list
  }, [teamRates, search, filterPos, sortKey, sortDir])

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  // ── Stats ─────────────────────────────────────────────────────────────────
  const avgRate = teamRates.length
    ? Math.round(teamRates.reduce((s, r) => s + r.ratePerHour, 0) / teamRates.length)
    : 0
  const maxRate = teamRates.length ? Math.max(...teamRates.map(r => r.ratePerHour)) : 0
  const minRate = teamRates.length ? Math.min(...teamRates.map(r => r.ratePerHour)) : 0

  // ── Form logic ─────────────────────────────────────────────────────────────
  const openAdd = () => {
    setEditTarget(null)
    setForm(EMPTY_FORM)
    setErrors({})
    setModalOpen(true)
  }

  const openEdit = (row) => {
    setEditTarget(row.id)
    setForm({
      name: row.name,
      position: row.position,
      budgetaryRate: row.budgetaryRate ?? '',
      adjustRateFactor: row.adjustRateFactor ?? '',
      ratePerHour: row.ratePerHour,
    })
    setErrors({})
    setModalOpen(true)
  }

  const validate = () => {
    const e = {}
    if (!form.name.trim()) e.name = 'Name is required'
    if (form.budgetaryRate !== '' && (isNaN(form.budgetaryRate) || Number(form.budgetaryRate) < 0))
      e.budgetaryRate = 'Must be a valid number (≥ 0)'
    const hasAutoCalc = form.budgetaryRate && form.adjustRateFactor
    if (!hasAutoCalc && (form.ratePerHour === '' || isNaN(form.ratePerHour) || Number(form.ratePerHour) <= 0))
      e.ratePerHour = 'Valid rate required (> 0)'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSave = () => {
    if (!validate()) return
    const bRate = form.budgetaryRate !== '' ? parseInt(form.budgetaryRate, 10) : null
    const factor = form.adjustRateFactor !== '' ? parseFloat(form.adjustRateFactor) : null
    const computedRate = bRate != null && factor != null
      ? Math.round(bRate * factor)
      : parseInt(form.ratePerHour, 10)
    const payload = {
      name: form.name.trim(),
      position: form.position,
      budgetaryRate: bRate,
      adjustRateFactor: factor,
      ratePerHour: computedRate,
    }
    if (editTarget) updateTeamRate(editTarget, payload)
    else addTeamRate(payload)
    setModalOpen(false)
  }

  const field = (key, label, type = 'text', opts = {}) => (
    <div>
      <label className="block text-xs font-semibold text-slate-600 mb-1">{label}</label>
      <input
        type={type}
        value={form[key]}
        onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
        className={`w-full px-3 py-2 text-sm border rounded-lg outline-none transition-colors ${
          errors[key] ? 'border-red-400 bg-red-50' : 'border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-200'
        }`}
        {...opts}
      />
      {errors[key] && <p className="text-xs text-red-500 mt-1">{errors[key]}</p>}
    </div>
  )

  const SortIcon = ({ k }) => sortKey === k
    ? (sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)
    : <span className="w-3" />

  const thCls = 'px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer select-none hover:text-slate-700'

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-800">PPE Team Hourly Rate</h2>
          <p className="text-xs text-slate-500 mt-0.5">Modal H — Engineer cost rates (Restricted: Lead / Manager / Admin)</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Template */}
          <button
            onClick={downloadTeamRateTemplate}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            title="Download Excel template"
          >
            <FileSpreadsheet size={15} className="text-green-600" /> Template
          </button>
          {/* Import */}
          <input ref={importRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImportFile} />
          <button
            onClick={() => importRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            title="Import from Excel"
          >
            <Upload size={15} className="text-blue-600" /> Import
          </button>
          {/* Export */}
          <button
            onClick={() => exportTeamRates(teamRates)}
            disabled={teamRates.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            title="Export to Excel"
          >
            <Download size={15} className="text-orange-500" /> Export
          </button>
          {/* Add */}
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2 bg-[#0f2035] text-white text-sm font-medium rounded-lg hover:bg-[#162d4a] transition-colors"
          >
            <Plus size={16} /> Add Engineer
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Team Members', value: teamRates.length, sub: 'total engineers' },
          { label: 'Average Rate', value: formatIDR(avgRate), sub: 'per hour' },
          { label: 'Rate Range', value: `${formatIDR(minRate)} – ${formatIDR(maxRate)}`, sub: 'min – max' },
        ].map(card => (
          <div key={card.label} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
              <DollarSign size={18} className="text-blue-600" />
            </div>
            <div>
              <p className="text-base font-bold text-slate-800 leading-tight">{card.value}</p>
              <p className="text-xs text-slate-500">{card.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-4 py-3 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search name or position…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200"
          />
        </div>
        <select
          value={filterPos}
          onChange={e => setFilterPos(e.target.value)}
          className="px-3 py-2 text-sm border border-slate-300 rounded-lg outline-none focus:border-blue-500 bg-white"
        >
          <option value="All">All Positions</option>
          {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <span className="text-xs text-slate-400">{displayed.length} records</span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-10">#</th>
                <th className={thCls} onClick={() => toggleSort('name')}>
                  <span className="flex items-center gap-1">Name <SortIcon k="name" /></span>
                </th>
                <th className={thCls} onClick={() => toggleSort('position')}>
                  <span className="flex items-center gap-1">Position <SortIcon k="position" /></span>
                </th>
                <th className={thCls} onClick={() => toggleSort('budgetaryRate')}>
                  <span className="flex items-center gap-1">Budgetary Rate <SortIcon k="budgetaryRate" /></span>
                </th>
                <th className={thCls} onClick={() => toggleSort('adjustRateFactor')}>
                  <span className="flex items-center gap-1">Factor <SortIcon k="adjustRateFactor" /></span>
                </th>
                <th className={thCls} onClick={() => toggleSort('ratePerHour')}>
                  <span className="flex items-center gap-1">Rate / Hour (THB) <SortIcon k="ratePerHour" /></span>
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayed.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-slate-400 text-sm">
                    No records found.
                  </td>
                </tr>
              ) : displayed.map((row, idx) => (
                <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 text-slate-400 text-xs">{idx + 1}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-[#0f2035] text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                        {row.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <span className="font-medium text-slate-800">{row.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-600">{row.position}</span>
                  </td>
                  <td className="px-4 py-3 font-semibold text-blue-700 tabular-nums">
                    {row.budgetaryRate != null ? formatIDR(row.budgetaryRate) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {row.adjustRateFactor != null
                      ? <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-amber-100 text-amber-700">&times; {parseFloat(row.adjustRateFactor).toFixed(1)}</span>
                      : <span className="text-slate-400 text-xs">—</span>}
                  </td>
                  <td className="px-4 py-3 font-semibold text-green-700 tabular-nums">
                    {formatIDR(row.ratePerHour)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEdit(row)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        title="Edit"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(row)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editTarget ? 'Edit Engineer Rate' : 'Add Engineer Rate'}
        size="sm"
      >
        <div className="px-6 py-5 space-y-4">
          {field('name', 'Full Name', 'text', { placeholder: 'e.g. Ahmad Fauzi' })}

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Position</label>
            <select
              value={form.position}
              onChange={e => setForm(p => ({ ...p, position: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200 bg-white"
            >
              {POSITIONS.map(pos => <option key={pos} value={pos}>{pos}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Budgetary Rate (Rate/hour)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">฿</span>
              <input
                type="number"
                min="0"
                step="1000"
                placeholder="e.g. 75000"
                value={form.budgetaryRate}
                onChange={e => setForm(p => ({ ...p, budgetaryRate: e.target.value }))}
                className={`w-full pl-9 pr-3 py-2 text-sm border rounded-lg outline-none transition-colors ${
                  errors.budgetaryRate ? 'border-red-400 bg-red-50' : 'border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-200'
                }`}
              />
            </div>
            {errors.budgetaryRate && <p className="text-xs text-red-500 mt-1">{errors.budgetaryRate}</p>}
            {form.budgetaryRate && !errors.budgetaryRate && (
              <p className="text-xs text-slate-400 mt-1">{formatIDR(Number(form.budgetaryRate))}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Adjust Rate Factor</label>
            <select
              value={form.adjustRateFactor}
              onChange={e => setForm(p => ({ ...p, adjustRateFactor: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200 bg-white"
            >
              <option value="">— Select Factor —</option>
              {ADJUST_FACTORS.map(f => (
                <option key={f} value={f}>× {f.toFixed(1)}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Rate / Hour (THB)
              {form.budgetaryRate && form.adjustRateFactor && (
                <span className="ml-2 text-blue-500 font-normal text-[11px]">
                  = {formatIDR(Number(form.budgetaryRate))} × {parseFloat(form.adjustRateFactor).toFixed(1)} (auto-calculated)
                </span>
              )}
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">฿</span>
              <input
                type="number"
                min="0"
                step="1000"
                placeholder="e.g. 85000"
                value={
                  form.budgetaryRate && form.adjustRateFactor
                    ? Math.round(Number(form.budgetaryRate) * parseFloat(form.adjustRateFactor))
                    : form.ratePerHour
                }
                onChange={e => {
                  if (!form.budgetaryRate || !form.adjustRateFactor)
                    setForm(p => ({ ...p, ratePerHour: e.target.value }))
                }}
                readOnly={!!(form.budgetaryRate && form.adjustRateFactor)}
                className={`w-full pl-9 pr-3 py-2 text-sm border rounded-lg outline-none transition-colors ${
                  form.budgetaryRate && form.adjustRateFactor
                    ? 'bg-blue-50 border-blue-200 text-blue-700 font-semibold cursor-not-allowed'
                    : errors.ratePerHour
                      ? 'border-red-400 bg-red-50'
                      : 'border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-200'
                }`}
              />
            </div>
            {errors.ratePerHour && <p className="text-xs text-red-500 mt-1">{errors.ratePerHour}</p>}
            {form.budgetaryRate && form.adjustRateFactor && (
              <p className="text-xs text-blue-500 mt-1">Auto-calculated from Budgetary Rate × Factor</p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
            <button
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              {editTarget ? 'Save Changes' : 'Add Engineer'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTeamRate(deleteTarget?.id)}
        title="Delete Engineer Rate"
        message={`Are you sure you want to remove "${deleteTarget?.name}" from the rate table? This action cannot be undone.`}
      />

      {/* Import Preview Modal */}
      <Modal
        isOpen={!!importResult}
        onClose={() => { setImportResult(null); setImportDone(false) }}
        title="Import Team Rates — Preview"
        size="md"
      >
        <div className="px-6 py-5 space-y-4">
          {importResult?.parseError ? (
            <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{importResult.parseError}</p>
            </div>
          ) : importDone ? (
            <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-lg px-4 py-4">
              <CheckCircle size={20} className="text-green-500 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-green-800">Import Successful</p>
                <p className="text-xs text-green-600 mt-0.5">{importResult?.valid?.length} engineers added to Firestore</p>
              </div>
            </div>
          ) : (
            <>
              {/* Summary */}
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 rounded-full text-xs font-medium text-slate-600">
                  Total rows: <span className="font-bold text-slate-800 ml-1">{importResult?.total}</span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-100 rounded-full text-xs font-medium text-green-700">
                  <CheckCircle size={12} /> Valid: <span className="font-bold ml-1">{importResult?.valid?.length}</span>
                </div>
                {importResult?.errors?.length > 0 && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-100 rounded-full text-xs font-medium text-red-700">
                    <X size={12} /> Errors: <span className="font-bold ml-1">{importResult.errors.length}</span>
                  </div>
                )}
              </div>

              {/* Error list */}
              {importResult?.errors?.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 max-h-32 overflow-y-auto">
                  <p className="text-xs font-semibold text-red-700 mb-2">Rows with errors (will be skipped):</p>
                  {importResult.errors.map((e, i) => (
                    <p key={i} className="text-xs text-red-600">Row {e.row}: {e.issues.join(', ')}</p>
                  ))}
                </div>
              )}

              {/* Valid preview table */}
              {importResult?.valid?.length > 0 ? (
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <div className="bg-slate-50 px-4 py-2 border-b border-slate-200">
                    <p className="text-xs font-semibold text-slate-600">Preview — {importResult.valid.length} rows to be imported</p>
                  </div>
                  <div className="overflow-x-auto max-h-56 overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50 sticky top-0">
                        <tr>
                          {['Name', 'Position', 'Rate / Hour (THB)'].map(h => (
                            <th key={h} className="px-3 py-2 text-left font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {importResult.valid.map((row, i) => (
                          <tr key={i} className="hover:bg-slate-50">
                            <td className="px-3 py-2 font-medium text-slate-800">{row.name}</td>
                            <td className="px-3 py-2">
                              <span className="px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-600">{row.position}</span>
                            </td>
                            <td className="px-3 py-2 font-semibold text-green-700 tabular-nums">
                              {new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 }).format(row.ratePerHour)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3">
                  <p className="text-sm text-yellow-700 font-medium">No valid rows found to import.</p>
                  <p className="text-xs text-yellow-600 mt-1">Download the Template to see the correct column format.</p>
                </div>
              )}
            </>
          )}

          <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
            <button
              onClick={() => { setImportResult(null); setImportDone(false) }}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              {importDone ? 'Close' : 'Cancel'}
            </button>
            {!importDone && !importResult?.parseError && importResult?.valid?.length > 0 && (
              <button
                onClick={handleConfirmImport}
                disabled={importing}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-60"
              >
                {importing
                  ? <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Importing…</>
                  : <><Upload size={14} /> Import {importResult.valid.length} Engineers</>
                }
              </button>
            )}
          </div>
        </div>
      </Modal>
    </div>
  )
}
