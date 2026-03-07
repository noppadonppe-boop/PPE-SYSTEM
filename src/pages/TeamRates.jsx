import React, { useState, useMemo } from 'react'
import { Plus, Pencil, Trash2, Search, ChevronUp, ChevronDown, Lock, DollarSign } from 'lucide-react'
import { useApp } from '../context/AppContext'
import Modal from '../components/ui/Modal'
import ConfirmDialog from '../components/ui/ConfirmDialog'

const POSITIONS = [
  'Lead Engineer',
  'Senior Engineer',
  'Engineer',
  'Junior Engineer',
  'Senior Technician',
  'Technician',
  'Drafter',
  'Admin',
]

const ALLOWED_ROLES = ['ppeLead', 'ppeManager', 'ppeAdmin']

const EMPTY_FORM = { name: '', position: 'Engineer', ratePerHour: '' }

function formatIDR(value) {
  if (value === null || value === undefined || value === '') return '—'
  return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 }).format(value)
}

export default function TeamRates() {
  const { teamRates, addTeamRate, updateTeamRate, deleteTeamRate, currentRole } = useApp()

  const hasAccess = ALLOWED_ROLES.includes(currentRole)

  const [search, setSearch]         = useState('')
  const [filterPos, setFilterPos]   = useState('All')
  const [sortKey, setSortKey]       = useState('name')
  const [sortDir, setSortDir]       = useState('asc')
  const [modalOpen, setModalOpen]   = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [form, setForm]             = useState(EMPTY_FORM)
  const [errors, setErrors]         = useState({})
  const [deleteTarget, setDeleteTarget] = useState(null)

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
    setForm({ name: row.name, position: row.position, ratePerHour: row.ratePerHour })
    setErrors({})
    setModalOpen(true)
  }

  const validate = () => {
    const e = {}
    if (!form.name.trim()) e.name = 'Name is required'
    if (form.ratePerHour === '' || isNaN(form.ratePerHour) || Number(form.ratePerHour) <= 0)
      e.ratePerHour = 'Valid rate required (> 0)'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSave = () => {
    if (!validate()) return
    const payload = {
      name: form.name.trim(),
      position: form.position,
      ratePerHour: parseInt(form.ratePerHour, 10),
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-800">PPE Team Hourly Rate</h2>
          <p className="text-xs text-slate-500 mt-0.5">Modal H — Engineer cost rates (Restricted: Lead / Manager / Admin)</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 bg-[#0f2035] text-white text-sm font-medium rounded-lg hover:bg-[#162d4a] transition-colors"
        >
          <Plus size={16} /> Add Engineer
        </button>
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
                <th className={thCls} onClick={() => toggleSort('ratePerHour')}>
                  <span className="flex items-center gap-1">Rate / Hour (THB) <SortIcon k="ratePerHour" /></span>
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayed.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-slate-400 text-sm">
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
            <label className="block text-xs font-semibold text-slate-600 mb-1">Rate per Hour (THB)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">฿</span>
              <input
                type="number"
                min="0"
                step="1000"
                placeholder="e.g. 85000"
                value={form.ratePerHour}
                onChange={e => setForm(p => ({ ...p, ratePerHour: e.target.value }))}
                className={`w-full pl-9 pr-3 py-2 text-sm border rounded-lg outline-none transition-colors ${
                  errors.ratePerHour ? 'border-red-400 bg-red-50' : 'border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-200'
                }`}
              />
            </div>
            {errors.ratePerHour && <p className="text-xs text-red-500 mt-1">{errors.ratePerHour}</p>}
            {form.ratePerHour && !errors.ratePerHour && (
              <p className="text-xs text-slate-400 mt-1">{formatIDR(Number(form.ratePerHour))}</p>
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
    </div>
  )
}
