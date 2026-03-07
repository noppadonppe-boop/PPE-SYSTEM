import React, { useState, useMemo } from 'react'
import { Plus, Pencil, Trash2, Search, ChevronUp, ChevronDown } from 'lucide-react'
import { useApp } from '../context/AppContext'
import Modal from '../components/ui/Modal'
import ConfirmDialog from '../components/ui/ConfirmDialog'

const CATEGORIES = ['Mechanical', 'Civil', 'Electrical', 'Instrumentation', 'Insulation', 'Piping', 'Structural', 'Others']

const EMPTY_FORM = { category: 'Mechanical', task: '', unit: '', min: '', max: '', avg: '' }

export default function UnitRates() {
  const { unitRates, addUnitRate, updateUnitRate, deleteUnitRate, currentRole } = useApp()

  const canEdit = ['ppeLead', 'ppeManager', 'ppeAdmin'].includes(currentRole)

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
    setForm({ category: row.category, task: row.task, unit: row.unit, min: row.min, max: row.max, avg: row.avg })
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

  const handleSave = () => {
    if (!validate()) return
    const payload = {
      category: form.category,
      task: form.task.trim(),
      unit: form.unit.trim(),
      min: parseFloat(form.min),
      max: parseFloat(form.max),
      avg: parseFloat(form.avg),
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

  const SortIcon = ({ k }) => sortKey === k
    ? (sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)
    : <span className="w-3" />

  const thCls = 'px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer select-none hover:text-slate-700'

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Unit Rate Manhour</h2>
          <p className="text-xs text-slate-500 mt-0.5">Modal G — Standard task manhour rates library</p>
        </div>
        {canEdit && (
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2 bg-[#0f2035] text-white text-sm font-medium rounded-lg hover:bg-[#162d4a] transition-colors"
          >
            <Plus size={16} /> Add Rate
          </button>
        )}
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
                {canEdit && <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayed.length === 0 ? (
                <tr>
                  <td colSpan={canEdit ? 7 : 6} className="px-4 py-10 text-center text-slate-400 text-sm">
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
    </div>
  )
}
