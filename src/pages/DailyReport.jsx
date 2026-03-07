import React, { useState, useMemo } from 'react'
import {
  Plus, Eye, Search, BookOpen, CalendarDays, Clock,
  TrendingUp, AlertTriangle, Coffee, CheckCircle, Pencil,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import Modal from '../components/ui/Modal'
import StatusBadge from '../components/ui/StatusBadge'

// ── Submit / Edit Daily Report Form ──────────────────────────────────────────

function DailyReportForm({ workOrder, teamRates, existingReports, editTarget, onSave, onClose }) {
  // Compute cumulative MH from all existing reports (exclude edit target if editing)
  const priorReports = existingReports.filter(d =>
    editTarget ? d.id !== editTarget.id : true
  ).sort((a, b) => a.reportDate.localeCompare(b.reportDate))

  const priorCumulativeSpentMH  = priorReports.reduce((s, d) => s + (d.isLeaveAbsent ? 0 : d.spentMHToday), 0)
  const priorCumulativeProgress = priorReports.length > 0
    ? priorReports[priorReports.length - 1].cumulativeProgress
    : 0

  const [form, setForm] = useState({
    reportDate:    editTarget?.reportDate    ?? new Date().toISOString().split('T')[0],
    submittedBy:   editTarget?.submittedBy   ?? (teamRates[0]?.id || ''),
    progressToday: editTarget?.progressToday ?? '',
    spentMHToday:  editTarget?.spentMHToday  ?? '',
    isLeaveAbsent: editTarget?.isLeaveAbsent ?? false,
    notes:         editTarget?.notes         ?? '',
  })
  const [errors, setErrors] = useState({})

  // ── Auto-calculations (reactive) ──────────────────────────────────────────
  const spentMHNum       = form.isLeaveAbsent ? 0 : (parseFloat(form.spentMHToday) || 0)
  const progressNum      = form.isLeaveAbsent ? 0 : (parseFloat(form.progressToday) || 0)
  const newCumulSpentMH  = priorCumulativeSpentMH + spentMHNum
  const newCumulProgress = Math.min(priorCumulativeProgress + progressNum, 100)
  // KEY FORMULA: Balance MH = Total Planned MH − Cumulative Today Spent MH
  const balanceMH        = workOrder.totalPlannedMH - newCumulSpentMH

  const validate = () => {
    const e = {}
    if (!form.reportDate) e.reportDate = 'Date required'
    if (!form.submittedBy) e.submittedBy = 'Reporter required'
    if (!form.isLeaveAbsent) {
      if (form.progressToday === '' || isNaN(form.progressToday) || Number(form.progressToday) < 0 || Number(form.progressToday) > 100)
        e.progressToday = 'Enter 0–100%'
      if (form.spentMHToday === '' || isNaN(form.spentMHToday) || Number(form.spentMHToday) < 0)
        e.spentMHToday = 'Enter a valid MH value'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSave = () => {
    if (!validate()) return
    onSave({
      workOrderId:       workOrder.id,
      requestWorkNo:     workOrder.requestWorkNo,
      reportDate:        form.reportDate,
      submittedBy:       form.submittedBy,
      progressToday:     form.isLeaveAbsent ? 0 : parseFloat(form.progressToday),
      cumulativeProgress: newCumulProgress,
      spentMHToday:      form.isLeaveAbsent ? 0 : parseFloat(form.spentMHToday),
      cumulativeSpentMH: newCumulSpentMH,
      balanceMH,
      isLeaveAbsent:     form.isLeaveAbsent,
      notes:             form.notes.trim(),
    })
  }

  const inputCls = (key) =>
    `w-full px-3 py-2 text-sm border rounded-lg outline-none transition-colors ${
      errors[key] ? 'border-red-400 bg-red-50' : 'border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-200'
    }`

  return (
    <div className="px-6 py-5 space-y-5">
      {/* Work Order info banner */}
      <div className="bg-slate-50 rounded-lg border border-slate-200 p-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-500 font-medium">Work Order</p>
          <p className="font-bold text-[#0f2035]">{workOrder.requestWorkNo}</p>
          <p className="text-sm text-slate-600">{workOrder.client}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-500 font-medium">Total Planned MH</p>
          <p className="text-xl font-bold text-[#0f2035]">{workOrder.totalPlannedMH}</p>
        </div>
      </div>

      {/* Date & Reporter */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Report Date</label>
          <input type="date" value={form.reportDate}
            onChange={e => setForm(p => ({ ...p, reportDate: e.target.value }))}
            className={inputCls('reportDate')} />
          {errors.reportDate && <p className="text-xs text-red-500 mt-1">{errors.reportDate}</p>}
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Reported By</label>
          <select value={form.submittedBy}
            onChange={e => setForm(p => ({ ...p, submittedBy: e.target.value }))}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg outline-none focus:border-blue-500 bg-white">
            <option value="">— Select —</option>
            {teamRates.filter(t =>
              (workOrder.assignedTeam || []).includes(t.id)
            ).map(t => (
              <option key={t.id} value={t.id}>{t.name} ({t.position})</option>
            ))}
          </select>
          {errors.submittedBy && <p className="text-xs text-red-500 mt-1">{errors.submittedBy}</p>}
        </div>
      </div>

      {/* Leave / Absent Toggle */}
      <div>
        <button
          type="button"
          onClick={() => setForm(p => ({ ...p, isLeaveAbsent: !p.isLeaveAbsent, progressToday: p.isLeaveAbsent ? '' : 0, spentMHToday: p.isLeaveAbsent ? '' : 0 }))}
          className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl border-2 transition-all ${
            form.isLeaveAbsent
              ? 'border-orange-400 bg-orange-50 text-orange-700'
              : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
          }`}
        >
          <Coffee size={18} className={form.isLeaveAbsent ? 'text-orange-500' : 'text-slate-400'} />
          <div className="text-left flex-1">
            <p className="text-sm font-semibold">Leave / Absent</p>
            <p className="text-xs opacity-70">Toggle ON if the engineer is on leave or absent today</p>
          </div>
          <div className={`w-10 h-5 rounded-full transition-colors ${form.isLeaveAbsent ? 'bg-orange-400' : 'bg-slate-300'}`}>
            <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${form.isLeaveAbsent ? 'translate-x-5' : 'translate-x-0'}`} />
          </div>
        </button>
      </div>

      {/* Progress inputs (disabled when leave) */}
      {!form.isLeaveAbsent ? (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Today Progress (%)</label>
            <input type="number" min="0" max="100" step="0.5"
              placeholder="e.g. 5"
              value={form.progressToday}
              onChange={e => setForm(p => ({ ...p, progressToday: e.target.value }))}
              className={inputCls('progressToday')} />
            {errors.progressToday && <p className="text-xs text-red-500 mt-1">{errors.progressToday}</p>}
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Today Spent MH</label>
            <input type="number" min="0" step="0.5"
              placeholder="e.g. 8"
              value={form.spentMHToday}
              onChange={e => setForm(p => ({ ...p, spentMHToday: e.target.value }))}
              className={inputCls('spentMHToday')} />
            {errors.spentMHToday && <p className="text-xs text-red-500 mt-1">{errors.spentMHToday}</p>}
          </div>
        </div>
      ) : (
        <div className="bg-orange-50 border border-orange-200 rounded-lg px-4 py-3 text-sm text-orange-700 font-medium">
          Progress and Manhours will be recorded as 0 for this leave/absent day.
        </div>
      )}

      {/* Auto-calculated summary */}
      <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Auto-Calculated Values</p>
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center">
            <p className="text-lg font-bold text-blue-700">{newCumulProgress.toFixed(1)}%</p>
            <p className="text-[10px] text-slate-500">Cumulative Progress</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-slate-700">{newCumulSpentMH.toFixed(1)}</p>
            <p className="text-[10px] text-slate-500">Cumulative Spent MH</p>
          </div>
          <div className={`text-center rounded-lg p-1 ${balanceMH < 0 ? 'bg-red-100' : balanceMH < workOrder.totalPlannedMH * 0.1 ? 'bg-yellow-100' : 'bg-green-100'}`}>
            <p className={`text-lg font-bold ${balanceMH < 0 ? 'text-red-700' : balanceMH < workOrder.totalPlannedMH * 0.1 ? 'text-yellow-700' : 'text-green-700'}`}>
              {balanceMH.toFixed(1)}
            </p>
            <p className="text-[10px] text-slate-500">
              Balance MH
              <span className="block text-[9px] opacity-70">{workOrder.totalPlannedMH} − {newCumulSpentMH.toFixed(1)}</span>
            </p>
          </div>
        </div>
        {balanceMH < 0 && (
          <div className="mt-3 flex items-center gap-2 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2 border border-red-200">
            <AlertTriangle size={13} />
            Over-budget: Spent MH exceeds planned by {Math.abs(balanceMH).toFixed(1)} MH
          </div>
        )}
      </div>

      {/* Notes */}
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1">Notes / Activities</label>
        <textarea rows={3} value={form.notes}
          onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
          placeholder="Describe today's work activities, issues, or remarks…"
          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg outline-none resize-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200"
        />
      </div>

      <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
        <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg">Cancel</button>
        <button onClick={handleSave}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-2">
          <CheckCircle size={15} /> {editTarget ? 'Update Report' : 'Submit Report'}
        </button>
      </div>
    </div>
  )
}

// ── Detail view ───────────────────────────────────────────────────────────────

function DRDetailModal({ dr, teamRates, workOrder, onClose }) {
  const reporter = teamRates.find(t => t.id === dr.submittedBy)
  return (
    <div className="px-6 py-5 space-y-4">
      <div className="grid grid-cols-2 gap-4 text-sm">
        {[
          ['Work No.',    dr.requestWorkNo],
          ['Date',        dr.reportDate],
          ['Reported By', reporter?.name || dr.submittedBy],
          ['Status',      dr.isLeaveAbsent ? 'Leave / Absent' : 'Submitted'],
        ].map(([k, v]) => (
          <div key={k}>
            <p className="text-xs text-slate-400 font-medium">{k}</p>
            <p className="font-semibold text-slate-800">{v}</p>
          </div>
        ))}
      </div>

      {dr.isLeaveAbsent && (
        <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-lg px-4 py-3 text-sm text-orange-700">
          <Coffee size={16} /> Engineer was on Leave / Absent this day.
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Today Progress', value: `${dr.progressToday}%`, cls: '' },
          { label: 'Cumul. Progress', value: `${dr.cumulativeProgress}%`, cls: 'text-blue-700' },
          { label: 'Today Spent MH', value: dr.spentMHToday, cls: '' },
          { label: 'Cumul. Spent MH', value: dr.cumulativeSpentMH, cls: '' },
        ].map(c => (
          <div key={c.label} className="bg-slate-50 rounded-lg border border-slate-200 p-3 text-center">
            <p className={`text-xl font-bold ${c.cls || 'text-slate-800'}`}>{c.value}</p>
            <p className="text-[10px] text-slate-500">{c.label}</p>
          </div>
        ))}
      </div>

      <div className={`rounded-xl border p-4 text-center ${dr.balanceMH < 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
        <p className="text-xs text-slate-500 font-medium mb-1">
          Balance MH = {workOrder?.totalPlannedMH ?? '?'} (Planned) − {dr.cumulativeSpentMH} (Spent)
        </p>
        <p className={`text-3xl font-bold ${dr.balanceMH < 0 ? 'text-red-700' : 'text-green-700'}`}>{dr.balanceMH}</p>
        <p className="text-xs text-slate-500 mt-1">Balance Manhours</p>
      </div>

      {dr.notes && (
        <div>
          <p className="text-xs text-slate-400 font-medium mb-1">Notes / Activities</p>
          <p className="text-sm text-slate-700 bg-slate-50 rounded-lg p-3 border border-slate-200">{dr.notes}</p>
        </div>
      )}

      <div className="flex justify-end pt-2 border-t border-slate-100">
        <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg">Close</button>
      </div>
    </div>
  )
}

// ── Main Daily Report Page ────────────────────────────────────────────────────

export default function DailyReport() {
  const { workOrders, dailyReports, addDailyReport, updateDailyReport, teamRates, currentRole } = useApp()

  const [search, setSearch]           = useState('')
  const [filterWO, setFilterWO]       = useState('All')
  const [activeModal, setActiveModal] = useState(null)

  const canSubmit = ['ppeTeam', 'ppeLead', 'ppeManager', 'ppeAdmin'].includes(currentRole)

  // Only ongoing work orders are available for daily reports
  const ongoingWOs = workOrders.filter(w => w.status === 'Ongoing')

  const displayed = useMemo(() => {
    let list = [...dailyReports]
    if (filterWO !== 'All') list = list.filter(d => d.workOrderId === filterWO)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(d =>
        d.requestWorkNo.toLowerCase().includes(q) ||
        d.reportDate.includes(q)
      )
    }
    return list.sort((a, b) => b.reportDate.localeCompare(a.reportDate))
  }, [dailyReports, search, filterWO])

  const openModal = (type, data = null) => setActiveModal({ type, data })
  const closeModal = () => setActiveModal(null)

  // Stats
  const totalReports    = dailyReports.length
  const leaveReports    = dailyReports.filter(d => d.isLeaveAbsent).length
  const totalSpentMH    = dailyReports.filter(d => !d.isLeaveAbsent).reduce((s, d) => s + d.spentMHToday, 0)
  const latestBalanceMH = ongoingWOs.map(wo => {
    const woDrs  = dailyReports.filter(d => d.workOrderId === wo.id)
      .sort((a, b) => b.reportDate.localeCompare(a.reportDate))
    const latest = woDrs[0]
    return latest ? latest.balanceMH : wo.totalPlannedMH
  }).reduce((s, b) => s + b, 0)

  const getWorkOrder = (woId) => workOrders.find(w => w.id === woId)
  const getDrReporter = (dr) => teamRates.find(t => t.id === dr.submittedBy)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Daily Report</h2>
          <p className="text-xs text-slate-500 mt-0.5">Modal E — Submit daily progress and manhour records</p>
        </div>
        {canSubmit && ongoingWOs.length > 0 && (
          <button onClick={() => openModal('submit')}
            className="flex items-center gap-2 px-4 py-2 bg-[#0f2035] text-white text-sm font-medium rounded-lg hover:bg-[#162d4a] transition-colors">
            <Plus size={16} /> Submit Daily Report
          </button>
        )}
      </div>

      {/* No ongoing WOs warning */}
      {ongoingWOs.length === 0 && canSubmit && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle size={16} className="text-yellow-600 flex-shrink-0" />
          <p className="text-sm text-yellow-800">No ongoing work orders. Daily reports can only be submitted for <strong>Ongoing</strong> work orders.</p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total Reports',    value: totalReports,               cls: 'text-slate-800' },
          { label: 'Active Projects',  value: ongoingWOs.length,          cls: 'text-blue-600' },
          { label: 'Total Spent MH',   value: `${totalSpentMH.toFixed(1)}`, cls: 'text-slate-700' },
          { label: 'Leave / Absent',   value: leaveReports,               cls: 'text-orange-600' },
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
          <input type="text" placeholder="Search work no. or date…"
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200" />
        </div>
        <select value={filterWO} onChange={e => setFilterWO(e.target.value)}
          className="px-3 py-2 text-sm border border-slate-300 rounded-lg outline-none focus:border-blue-500 bg-white">
          <option value="All">All Work Orders</option>
          {workOrders.map(wo => (
            <option key={wo.id} value={wo.id}>{wo.requestWorkNo}</option>
          ))}
        </select>
        <span className="text-xs text-slate-400">{displayed.length} records</span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Work No.</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Reported By</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Today %</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Cumul %</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Spent MH</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Cumul MH</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Balance MH</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Flag</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayed.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-10 text-center text-slate-400 text-sm">
                    No daily reports found.
                  </td>
                </tr>
              ) : displayed.map(dr => {
                const reporter = getDrReporter(dr)
                return (
                  <tr key={dr.id} className={`hover:bg-slate-50 transition-colors ${dr.isLeaveAbsent ? 'bg-orange-50/40' : ''}`}>
                    <td className="px-4 py-3 text-slate-700 text-xs">
                      <span className="flex items-center gap-1"><CalendarDays size={12} />{dr.reportDate}</span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-[#0f2035]">{dr.requestWorkNo}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-[#0f2035] text-white flex items-center justify-center text-[9px] font-bold flex-shrink-0">
                          {reporter?.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?'}
                        </div>
                        <span className="text-xs text-slate-700">{reporter?.name || dr.submittedBy}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-600">
                      {dr.isLeaveAbsent ? '—' : `${dr.progressToday}%`}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      <span className="font-medium text-blue-700">{dr.cumulativeProgress}%</span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-600">
                      {dr.isLeaveAbsent ? '—' : dr.spentMHToday}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-600">{dr.cumulativeSpentMH}</td>
                    <td className={`px-4 py-3 text-right font-bold tabular-nums ${dr.balanceMH < 0 ? 'text-red-600' : dr.balanceMH < 30 ? 'text-yellow-600' : 'text-green-700'}`}>
                      {dr.balanceMH}
                    </td>
                    <td className="px-4 py-3">
                      {dr.isLeaveAbsent && (
                        <span className="flex items-center gap-1 text-[10px] font-semibold text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full">
                          <Coffee size={10} /> Leave
                        </span>
                      )}
                      {!dr.isLeaveAbsent && dr.balanceMH < 0 && (
                        <span className="flex items-center gap-1 text-[10px] font-semibold text-red-600 bg-red-100 px-2 py-0.5 rounded-full">
                          <AlertTriangle size={10} /> Over
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        {canSubmit && (
                          <button onClick={() => openModal('edit', dr)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" title="Edit">
                            <Pencil size={15} />
                          </button>
                        )}
                        <button onClick={() => openModal('detail', dr)}
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

      {/* ── Modals ──────────────────────────────────────────────────────────── */}

      {/* Submit New Report — Work Order Picker first */}
      <Modal isOpen={activeModal?.type === 'submit'} onClose={closeModal}
        title="Submit Daily Report" size="lg">
        <WorkOrderPicker
          workOrders={ongoingWOs}
          onSelect={(wo) => openModal('form', { wo })}
          onClose={closeModal}
        />
      </Modal>

      {/* Report Form */}
      <Modal isOpen={activeModal?.type === 'form'} onClose={closeModal}
        title={`Daily Report — ${activeModal?.data?.wo?.requestWorkNo || ''}`} size="lg">
        {activeModal?.data?.wo && (
          <DailyReportForm
            workOrder={activeModal.data.wo}
            teamRates={teamRates}
            existingReports={dailyReports.filter(d => d.workOrderId === activeModal.data.wo.id)}
            editTarget={null}
            onClose={closeModal}
            onSave={(data) => { addDailyReport(data); closeModal() }}
          />
        )}
      </Modal>

      {/* Edit Report */}
      <Modal isOpen={activeModal?.type === 'edit'} onClose={closeModal}
        title={`Edit Daily Report — ${activeModal?.data?.reportDate || ''}`} size="lg">
        {activeModal?.data && (() => {
          const wo = getWorkOrder(activeModal.data.workOrderId)
          return wo ? (
            <DailyReportForm
              workOrder={wo}
              teamRates={teamRates}
              existingReports={dailyReports.filter(d => d.workOrderId === wo.id)}
              editTarget={activeModal.data}
              onClose={closeModal}
              onSave={(data) => { updateDailyReport(activeModal.data.id, data); closeModal() }}
            />
          ) : null
        })()}
      </Modal>

      {/* Detail */}
      <Modal isOpen={activeModal?.type === 'detail'} onClose={closeModal}
        title={`Daily Report Detail — ${activeModal?.data?.reportDate || ''}`} size="md">
        {activeModal?.data && (
          <DRDetailModal
            dr={activeModal.data}
            teamRates={teamRates}
            workOrder={getWorkOrder(activeModal.data.workOrderId)}
            onClose={closeModal}
          />
        )}
      </Modal>
    </div>
  )
}

// ── Work Order Picker (step before form) ──────────────────────────────────────

function WorkOrderPicker({ workOrders, onSelect, onClose }) {
  return (
    <div className="px-6 py-5 space-y-4">
      <p className="text-sm text-slate-600">Select the ongoing work order to submit a report for:</p>
      <div className="space-y-2">
        {workOrders.map(wo => (
          <button key={wo.id} onClick={() => onSelect(wo)}
            className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 rounded-xl transition-colors text-left group">
            <div>
              <p className="font-bold text-[#0f2035] group-hover:text-blue-700">{wo.requestWorkNo}</p>
              <p className="text-sm text-slate-500">{wo.client}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-slate-700">{wo.totalPlannedMH} MH</p>
              <StatusBadge status={wo.status} />
            </div>
          </button>
        ))}
      </div>
      <div className="flex justify-end pt-2 border-t border-slate-100">
        <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg">Cancel</button>
      </div>
    </div>
  )
}
