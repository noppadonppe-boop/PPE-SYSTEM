import React, { useState, useMemo, useRef } from 'react'
import { Plus, Pencil, Trash2, Search, ChevronUp, ChevronDown, Download, Upload, FileSpreadsheet, AlertCircle, CheckCircle, X } from 'lucide-react'
import { useApp } from '../context/AppContext'
import Modal from '../components/ui/Modal'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import { exportUnitRates, downloadUnitRateTemplate, parseUnitRatesExcel } from '../utils/excelUtils'

const CATEGORIES = ['Mechanical', 'Civil', 'Electrical', 'Instrumentation', 'Insulation', 'Piping', 'Structural', 'Others']

const DIFFICULTY_OPTIONS = [
  { value: 'Easy',   label: 'Easy',   color: 'bg-green-100 text-green-700' },
  { value: 'Normal', label: 'Normal', color: 'bg-blue-100 text-blue-700' },
  { value: 'Hard',   label: 'Hard',   color: 'bg-red-100 text-red-700' },
]

const EMPTY_FORM = { category: 'Mechanical', task: '', unit: '', min: '', max: '', avg: '', difficultyFactor: '', adjustUnitMH: '' }

export default function UnitRates() {
  const { unitRates, addUnitRate, updateUnitRate, deleteUnitRate, userHasRole } = useApp()

  const canEdit = userHasRole(['ppeLead', 'ppeManager', 'ppeAdmin', 'MasterAdmin', 'GM/MD'])

  // ── Excel state ──────────────────────────────────────────────────────────
  const importRef = useRef(null)
  const [importResult, setImportResult] = useState(null)  // { valid, errors, total }
  const [importing, setImporting]       = useState(false)
  const [importDone, setImportDone]     = useState(false)

  const [search, setSearch]         = useState('')
  const [filterCat, setFilterCat]   = useState('All')
  const [sortKey, setSortKey]       = useState('category')
  const [sortDir, setSortDir]       = useState('asc')
  const [modalOpen, setModalOpen]   = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [form, setForm]             = useState(EMPTY_FORM)
  const [errors, setErrors]         = useState({})
  const [deleteTarget, setDeleteTarget] = useState(null)

  // ── Derived list ────────────────────────────────────────────────────────
  const displayed = useMemo(() => {
    let list = [...unitRates]
    if (filterCat !== 'All') list = list.filter(r => r.category === filterCat)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(r => r.task.toLowerCase().includes(q) || r.category.toLowerCase().includes(q))
    }
    list.sort((a, b) => {
      const av = typeof a[sortKey] === 'string' ? a[sortKey].toLowerCase() : a[sortKey]
      const bv = typeof b[sortKey] === 'string' ? b[sortKey].toLowerCase() : b[sortKey]
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })
    return list
  }, [unitRates, search, filterCat, sortKey, sortDir])

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  // ── Form logic ──────────────────────────────────────────────────────────
  const openAdd = () => {
    setEditTarget(null)
    setForm(EMPTY_FORM)
    setErrors({})
    setModalOpen(true)
  }

  const openEdit = (row) => {
    setEditTarget(row.id)
    setForm({
      category: row.category,
      task: row.task,
      unit: row.unit,
      min: row.min,
      max: row.max,
      avg: row.avg,
      difficultyFactor: row.difficultyFactor ?? '',
      adjustUnitMH: row.adjustUnitMH ?? '',
    })
    setErrors({})
    setModalOpen(true)
  }

  const validate = () => {
    const e = {}
    if (!form.task.trim())      e.task = 'Task name is required'
    if (!form.unit.trim())      e.unit = 'Unit is required'
    if (form.min === '' || isNaN(form.min) || Number(form.min) < 0) e.min = 'Valid number required'
    if (form.max === '' || isNaN(form.max) || Number(form.max) < 0) e.max = 'Valid number required'
    if (form.avg === '' || isNaN(form.avg) || Number(form.avg) < 0) e.avg = 'Valid number required'
    if (!e.min && !e.max && Number(form.min) > Number(form.max)) e.min = 'Min must be ≤ Max'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const getAdjustMH = (difficulty, min, max, avg) => {
    if (!difficulty) return null
    const v = difficulty === 'Easy' ? parseFloat(min) : difficulty === 'Hard' ? parseFloat(max) : parseFloat(avg)
    return isNaN(v) ? null : v
  }

  const handleSave = () => {
    if (!validate()) return
    const computedMH = getAdjustMH(form.difficultyFactor, form.min, form.max, form.avg)
    const payload = {
      category: form.category,
      task: form.task.trim(),
      unit: form.unit.trim(),
      min: parseFloat(form.min),
      max: parseFloat(form.max),
      avg: parseFloat(form.avg),
      difficultyFactor: form.difficultyFactor || null,
      adjustUnitMH: computedMH,
    }
    if (editTarget) updateUnitRate(editTarget, payload)
    else addUnitRate(payload)
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

  // ── Excel handlers ───────────────────────────────────────────────────────
  const handleImportFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    try {
      const result = await parseUnitRatesExcel(file)
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
      await addUnitRate(row)
    }
    setImporting(false)
    setImportDone(true)
  }

  const SortIcon = ({ k }) => sortKey === k
    ? (sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)
    : <span className="w-3" />

  const thCls = 'px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer select-none hover:text-slate-700'

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Unit Rate Manhour</h2>
          <p className="text-xs text-slate-500 mt-0.5">Modal G — Standard task manhour rates library</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Template */}
          <button
            onClick={downloadUnitRateTemplate}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            title="Download Excel template"
          >
            <FileSpreadsheet size={15} className="text-green-600" /> Template
          </button>
          {/* Import */}
          {canEdit && (
            <>
              <input ref={importRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImportFile} />
              <button
                onClick={() => importRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                title="Import from Excel"
              >
                <Upload size={15} className="text-blue-600" /> Import
              </button>
            </>
          )}
          {/* Export */}
          <button
            onClick={() => exportUnitRates(unitRates)}
            disabled={unitRates.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            title="Export to Excel"
          >
            <Download size={15} className="text-orange-500" /> Export
          </button>
          {/* Add */}
          {canEdit && (
            <button
              onClick={openAdd}
              className="flex items-center gap-2 px-4 py-2 bg-[#0f2035] text-white text-sm font-medium rounded-lg hover:bg-[#162d4a] transition-colors"
            >
              <Plus size={16} /> Add Rate
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-4 py-3 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search task or category…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200"
          />
        </div>
        <select
          value={filterCat}
          onChange={e => setFilterCat(e.target.value)}
          className="px-3 py-2 text-sm border border-slate-300 rounded-lg outline-none focus:border-blue-500 bg-white"
        >
          <option value="All">All Categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <span className="text-xs text-slate-400">{displayed.length} records</span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className={thCls} onClick={() => toggleSort('category')}>
                  <span className="flex items-center gap-1">Category <SortIcon k="category" /></span>
                </th>
                <th className={thCls} onClick={() => toggleSort('task')}>
                  <span className="flex items-center gap-1">Task <SortIcon k="task" /></span>
                </th>
                <th className={thCls} onClick={() => toggleSort('unit')}>
                  <span className="flex items-center gap-1">Unit <SortIcon k="unit" /></span>
                </th>
                <th className={thCls} onClick={() => toggleSort('min')}>
                  <span className="flex items-center gap-1">Min (Easy) <SortIcon k="min" /></span>
                </th>
                <th className={thCls} onClick={() => toggleSort('max')}>
                  <span className="flex items-center gap-1">Max (Hard) <SortIcon k="max" /></span>
                </th>
                <th className={thCls} onClick={() => toggleSort('avg')}>
                  <span className="flex items-center gap-1">Avg (Normal) <SortIcon k="avg" /></span>
                </th>
                <th className={thCls} onClick={() => toggleSort('difficultyFactor')}>
                  <span className="flex items-center gap-1">Difficulty <SortIcon k="difficultyFactor" /></span>
                </th>
                <th className={thCls} onClick={() => toggleSort('adjustUnitMH')}>
                  <span className="flex items-center gap-1">Adjust MH <SortIcon k="adjustUnitMH" /></span>
                </th>
                {canEdit && <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayed.length === 0 ? (
                <tr>
                  <td colSpan={canEdit ? 9 : 8} className="px-4 py-10 text-center text-slate-400 text-sm">
                    No records found.
                  </td>
                </tr>
              ) : displayed.map(row => (
                <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-blue-50 text-blue-700">{row.category}</span>
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-800">{row.task}</td>
                  <td className="px-4 py-3 text-slate-500">{row.unit}</td>
                  <td className="px-4 py-3 text-slate-700 tabular-nums">{row.min.toFixed(2)}</td>
                  <td className="px-4 py-3 text-slate-700 tabular-nums">{row.max.toFixed(2)}</td>
                  <td className="px-4 py-3 font-semibold text-[#0f2035] tabular-nums">{row.avg.toFixed(2)}</td>
                  <td className="px-4 py-3">
                    {row.difficultyFactor
                      ? <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                          row.difficultyFactor === 'Easy' ? 'bg-green-100 text-green-700' :
                          row.difficultyFactor === 'Hard' ? 'bg-red-100 text-red-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>{row.difficultyFactor}</span>
                      : <span className="text-slate-300 text-xs">—</span>}
                  </td>
                  <td className={`px-4 py-3 font-semibold tabular-nums ${
                    row.difficultyFactor === 'Easy' ? 'text-green-700' :
                    row.difficultyFactor === 'Hard' ? 'text-red-700' :
                    row.difficultyFactor === 'Normal' ? 'text-blue-700' : 'text-slate-400'
                  }`}>
                    {row.adjustUnitMH != null ? row.adjustUnitMH.toFixed(2) : <span className="text-slate-300">—</span>}
                  </td>
                  {canEdit && (
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
                  )}
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
        title={editTarget ? 'Edit Unit Rate' : 'Add Unit Rate'}
        size="md"
      >
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Category</label>
            <select
              value={form.category}
              onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200 bg-white"
            >
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {field('task', 'Task Name')}
          {field('unit', 'Unit of Measurement', 'text', { placeholder: 'e.g. m², unit, inch-dia' })}

          <div className="grid grid-cols-3 gap-3">
            {field('min', 'Min / Easy (MH)', 'number', { min: 0, step: 0.01, placeholder: '0.00' })}
            {field('max', 'Max / Hard (MH)', 'number', { min: 0, step: 0.01, placeholder: '0.00' })}
            {field('avg', 'Avg / Normal (MH)', 'number', { min: 0, step: 0.01, placeholder: '0.00' })}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Difficulty Factor</label>
              <select
                value={form.difficultyFactor}
                onChange={e => setForm(p => ({ ...p, difficultyFactor: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200 bg-white"
              >
                <option value="">— Select —</option>
                {DIFFICULTY_OPTIONS.map(d => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Adjust Unit MH
                {form.difficultyFactor && (
                  <span className="ml-1.5 text-[11px] font-normal text-slate-400">
                    ({form.difficultyFactor === 'Easy' ? 'uses Min' : form.difficultyFactor === 'Hard' ? 'uses Max' : 'uses Avg'})
                  </span>
                )}
              </label>
              <input
                type="number"
                readOnly
                value={(() => {
                  const v = getAdjustMH(form.difficultyFactor, form.min, form.max, form.avg)
                  return v != null ? v : ''
                })()}
                placeholder="auto"
                className="w-full px-3 py-2 text-sm border rounded-lg outline-none bg-slate-50 border-slate-200 text-slate-500 cursor-not-allowed"
              />
              {form.difficultyFactor && (
                <p className={`text-[11px] mt-1 ${
                  form.difficultyFactor === 'Easy' ? 'text-green-600' :
                  form.difficultyFactor === 'Hard' ? 'text-red-600' : 'text-blue-600'
                }`}>
                  Auto-filled from {form.difficultyFactor === 'Easy' ? 'Min' : form.difficultyFactor === 'Hard' ? 'Max' : 'Avg'} value
                </p>
              )}
            </div>
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
              {editTarget ? 'Save Changes' : 'Add Rate'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteUnitRate(deleteTarget?.id)}
        title="Delete Unit Rate"
        message={`Are you sure you want to delete "${deleteTarget?.task}"? This action cannot be undone.`}
      />

      {/* Import Preview Modal */}
      <Modal
        isOpen={!!importResult}
        onClose={() => { setImportResult(null); setImportDone(false) }}
        title="Import Unit Rates — Preview"
        size="lg"
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
                <p className="text-xs text-green-600 mt-0.5">{importResult?.valid?.length} records added to Firestore</p>
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
                  <div className="overflow-x-auto max-h-60 overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50 sticky top-0">
                        <tr>
                          {['Category', 'Task', 'Unit', 'Min', 'Max', 'Avg'].map(h => (
                            <th key={h} className="px-3 py-2 text-left font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {importResult.valid.map((row, i) => (
                          <tr key={i} className="hover:bg-slate-50">
                            <td className="px-3 py-2 text-slate-600">{row.category}</td>
                            <td className="px-3 py-2 font-medium text-slate-800">{row.task}</td>
                            <td className="px-3 py-2 text-slate-500">{row.unit}</td>
                            <td className="px-3 py-2 tabular-nums">{Number(row.min).toFixed(2)}</td>
                            <td className="px-3 py-2 tabular-nums">{Number(row.max).toFixed(2)}</td>
                            <td className="px-3 py-2 font-semibold tabular-nums">{Number(row.avg).toFixed(2)}</td>
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
                  : <><Upload size={14} /> Import {importResult.valid.length} Rows</>
                }
              </button>
            )}
          </div>
        </div>
      </Modal>
    </div>
  )
}
