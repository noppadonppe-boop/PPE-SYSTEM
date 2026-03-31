import React, { useState, useMemo, useRef } from 'react'
import {
  Plus, Pencil, Trash2, Search, ChevronUp, ChevronDown,
  Download, Upload, FileSpreadsheet, AlertCircle, CheckCircle, X, DollarSign,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import Modal from '../components/ui/Modal'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import {
  exportEngStandardRates,
  downloadEngStandardRateTemplate,
  parseEngStandardRatesExcel,
} from '../utils/excelUtils'

const EMPTY_FORM = { position: '', hourRate: '' }

function formatTHB(value) {
  if (value === null || value === undefined || value === '') return '—'
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

export default function EngStandardRate() {
  const {
    engStandardRates,
    addEngStandardRate,
    updateEngStandardRate,
    deleteEngStandardRate,
  } = useApp()

  const [search,       setSearch]       = useState('')
  const [sortKey,      setSortKey]      = useState('position')
  const [sortDir,      setSortDir]      = useState('asc')
  const [modalOpen,    setModalOpen]    = useState(false)
  const [editTarget,   setEditTarget]   = useState(null)
  const [form,         setForm]         = useState(EMPTY_FORM)
  const [errors,       setErrors]       = useState({})
  const [deleteTarget, setDeleteTarget] = useState(null)

  // ── Excel state ──────────────────────────────────────────────────────────
  const importRef                             = useRef(null)
  const [importResult, setImportResult]       = useState(null)
  const [importing,    setImporting]          = useState(false)
  const [importDone,   setImportDone]         = useState(false)

  // ── Excel handlers ───────────────────────────────────────────────────────
  const handleImportFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    try {
      const result = await parseEngStandardRatesExcel(file)
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
      await addEngStandardRate(row)
    }
    setImporting(false)
    setImportDone(true)
  }

  // ── Derived list ─────────────────────────────────────────────────────────
  const displayed = useMemo(() => {
    let list = [...engStandardRates]
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(r => r.position.toLowerCase().includes(q))
    }
    list.sort((a, b) => {
      const av = typeof a[sortKey] === 'string' ? a[sortKey].toLowerCase() : (a[sortKey] ?? 0)
      const bv = typeof b[sortKey] === 'string' ? b[sortKey].toLowerCase() : (b[sortKey] ?? 0)
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })
    return list
  }, [engStandardRates, search, sortKey, sortDir])

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  // ── Stats ─────────────────────────────────────────────────────────────────
  const maxRate = engStandardRates.length ? Math.max(...engStandardRates.map(r => r.hourRate)) : 0
  const minRate = engStandardRates.length ? Math.min(...engStandardRates.map(r => r.hourRate)) : 0

  // ── Form logic ────────────────────────────────────────────────────────────
  const openAdd = () => {
    setEditTarget(null)
    setForm(EMPTY_FORM)
    setErrors({})
    setModalOpen(true)
  }

  const openEdit = (row) => {
    setEditTarget(row.id)
    setForm({ position: row.position, hourRate: row.hourRate })
    setErrors({})
    setModalOpen(true)
  }

  const validate = () => {
    const e = {}
    if (!form.position.trim()) e.position = 'Position is required'
    if (form.hourRate === '' || isNaN(form.hourRate) || Number(form.hourRate) <= 0)
      e.hourRate = 'Valid rate required (> 0)'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSave = () => {
    if (!validate()) return
    const payload = {
      position: form.position.trim(),
      hourRate: parseFloat(form.hourRate),
    }
    if (editTarget) updateEngStandardRate(editTarget, payload)
    else addEngStandardRate(payload)
    setModalOpen(false)
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
          <h2 className="text-lg font-bold text-slate-800">Eng. Standard Rate</h2>
          <p className="text-xs text-slate-500 mt-0.5">Engineering standard hour rates by position</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={downloadEngStandardRateTemplate}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            title="Download Excel template"
          >
            <FileSpreadsheet size={15} className="text-green-600" /> Template
          </button>
          <input ref={importRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImportFile} />
          <button
            onClick={() => importRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            title="Import from Excel"
          >
            <Upload size={15} className="text-blue-600" /> Import
          </button>
          <button
            onClick={() => exportEngStandardRates(engStandardRates)}
            disabled={engStandardRates.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            title="Export to Excel"
          >
            <Download size={15} className="text-orange-500" /> Export
          </button>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2 bg-[#0f2035] text-white text-sm font-medium rounded-lg hover:bg-[#162d4a] transition-colors"
          >
            <Plus size={16} /> Add Position
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Positions', value: engStandardRates.length, sub: 'positions defined', color: 'teal' },
          { label: 'Highest Rate',    value: formatTHB(maxRate),       sub: 'per hour',         color: 'green' },
          { label: 'Lowest Rate',     value: formatTHB(minRate),       sub: 'per hour',         color: 'blue' },
        ].map(card => (
          <div key={card.label} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg bg-${card.color}-50 flex items-center justify-center flex-shrink-0`}>
              <DollarSign size={18} className={`text-${card.color}-600`} />
            </div>
            <div>
              <p className="text-base font-bold text-slate-800 leading-tight">{card.value}</p>
              <p className="text-xs text-slate-500">{card.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-4 py-3 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search position…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200"
          />
        </div>
        <span className="text-xs text-slate-400">{displayed.length} records</span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-10">#</th>
                <th className={thCls} onClick={() => toggleSort('position')}>
                  <span className="flex items-center gap-1">Position <SortIcon k="position" /></span>
                </th>
                <th className={thCls} onClick={() => toggleSort('hourRate')}>
                  <span className="flex items-center gap-1">Hour Rate <SortIcon k="hourRate" /></span>
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayed.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-slate-400 text-sm">
                    No records found.
                  </td>
                </tr>
              ) : displayed.map((row, idx) => (
                <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 text-slate-400 text-xs">{idx + 1}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">{row.position}</td>
                  <td className="px-4 py-3 font-semibold text-teal-700 tabular-nums">{formatTHB(row.hourRate)}</td>
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
        title={editTarget ? 'Edit Standard Rate' : 'Add Standard Rate'}
        size="sm"
      >
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Position / Title</label>
            <input
              type="text"
              value={form.position}
              onChange={e => setForm(p => ({ ...p, position: e.target.value }))}
              placeholder="e.g. Project manager"
              className={`w-full px-3 py-2 text-sm border rounded-lg outline-none transition-colors ${
                errors.position ? 'border-red-400 bg-red-50' : 'border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-200'
              }`}
            />
            {errors.position && <p className="text-xs text-red-500 mt-1">{errors.position}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Hour Rate (THB)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">฿</span>
              <input
                type="number"
                min="0"
                step="10"
                placeholder="e.g. 550"
                value={form.hourRate}
                onChange={e => setForm(p => ({ ...p, hourRate: e.target.value }))}
                className={`w-full pl-9 pr-3 py-2 text-sm border rounded-lg outline-none transition-colors ${
                  errors.hourRate ? 'border-red-400 bg-red-50' : 'border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-200'
                }`}
              />
            </div>
            {errors.hourRate && <p className="text-xs text-red-500 mt-1">{errors.hourRate}</p>}
            {form.hourRate && !errors.hourRate && (
              <p className="text-xs text-slate-400 mt-1">{formatTHB(Number(form.hourRate))}</p>
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
              {editTarget ? 'Save Changes' : 'Add Position'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteEngStandardRate(deleteTarget?.id)}
        title="Delete Standard Rate"
        message={`Are you sure you want to remove "${deleteTarget?.position}" from the rate table? This action cannot be undone.`}
      />

      {/* Import Preview Modal */}
      <Modal
        isOpen={!!importResult}
        onClose={() => { setImportResult(null); setImportDone(false) }}
        title="Import Eng Standard Rates — Preview"
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
                <p className="text-xs text-green-600 mt-0.5">{importResult?.valid?.length} positions added</p>
              </div>
            </div>
          ) : (
            <>
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

              {importResult?.errors?.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 max-h-32 overflow-y-auto">
                  <p className="text-xs font-semibold text-red-700 mb-2">Rows with errors (will be skipped):</p>
                  {importResult.errors.map((e, i) => (
                    <p key={i} className="text-xs text-red-600">Row {e.row}: {e.issues.join(', ')}</p>
                  ))}
                </div>
              )}

              {importResult?.valid?.length > 0 ? (
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <div className="bg-slate-50 px-4 py-2 border-b border-slate-200">
                    <p className="text-xs font-semibold text-slate-600">Preview — {importResult.valid.length} rows to be imported</p>
                  </div>
                  <div className="overflow-x-auto max-h-56 overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50 sticky top-0">
                        <tr>
                          {['Position', 'Hour Rate (THB)'].map(h => (
                            <th key={h} className="px-3 py-2 text-left font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {importResult.valid.map((row, i) => (
                          <tr key={i} className="hover:bg-slate-50">
                            <td className="px-3 py-2 font-medium text-slate-800">{row.position}</td>
                            <td className="px-3 py-2 font-semibold text-teal-700 tabular-nums">
                              {formatTHB(row.hourRate)}
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
                  : <><Upload size={14} /> Import {importResult.valid.length} Positions</>
                }
              </button>
            )}
          </div>
        </div>
      </Modal>
    </div>
  )
}
