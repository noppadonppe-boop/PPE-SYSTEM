import React, { useState, useMemo } from 'react'
import {
  Plus, Eye, Search, CalendarDays, AlertTriangle,
  Coffee, CheckCircle, Pencil, ThumbsUp, RotateCcw,
  MessageSquare, ClipboardList, ListChecks,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import Modal from '../components/ui/Modal'
import StatusBadge from '../components/ui/StatusBadge'

const DR_STATUS_CFG = {
  'Submitted':        { cls: 'bg-blue-100 text-blue-700',    label: 'Submitted' },
  'Accepted':         { cls: 'bg-green-100 text-green-700',  label: 'Accepted' },
  'Needs Correction': { cls: 'bg-red-100 text-red-700',      label: 'Needs Correction' },
  'Resubmitted':      { cls: 'bg-purple-100 text-purple-700',label: 'Resubmitted' },
  'Leave':            { cls: 'bg-orange-100 text-orange-700',label: 'Leave / Absent' },
  'Not Submitted':    { cls: 'bg-slate-100 text-slate-500',  label: 'Not Submitted' },
}
function DRStatusBadge({ status }) {
  const cfg = DR_STATUS_CFG[status] || DR_STATUS_CFG['Not Submitted']
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${cfg.cls}`}>{cfg.label}</span>
}

// ── Submit / Edit Daily Report Form ──────────────────────────────────────────

function DailyReportForm({ workOrder, teamRates, existingReports, editTarget, onSave, onClose }) {
  const today     = new Date().toISOString().split('T')[0]
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]

  const priorReports = existingReports.filter(d =>
    editTarget ? d.id !== editTarget.id : true
  ).sort((a, b) => a.reportDate.localeCompare(b.reportDate))

  const priorCumulSpentMH  = priorReports.reduce((s, d) => s + (d.isLeaveAbsent ? 0 : d.spentMHToday), 0)
  const priorCumulProgress = priorReports.length > 0 ? priorReports[priorReports.length - 1].cumulativeProgress : 0

  // Build activity rows from WO mheRows, filtered to the reporter's assigned items
  const allMheRows = workOrder.mheRows || workOrder.wbsItems || []

  const initActivityRows = (reporterId, existingRows) => {
    const myRows = allMheRows.filter(r => !r.assignEngineer || r.assignEngineer === reporterId || reporterId === '')
    if (existingRows && existingRows.length > 0) return existingRows
    return myRows.map(r => ({
      id:            r.id || r.activityName || Math.random().toString(36).slice(2),
      activityName:  r.activityName || r.task || '',
      totalMH:       r.totalMH || 0,
      assignEngineer:r.assignEngineer || '',
      prevProgress:  0,
      todayProgress: '',
      spentMHToday:  '',
      note:          '',
    }))
  }

  const [form, setForm] = useState({
    reportDate:    editTarget?.reportDate    ?? today,
    submittedBy:   editTarget?.submittedBy   ?? '',
    isLeaveAbsent: editTarget?.isLeaveAbsent ?? false,
    notes:         editTarget?.notes         ?? '',
  })
  const [actRows, setActRows] = useState(() =>
    initActivityRows(editTarget?.submittedBy ?? '', editTarget?.activityRows ?? null)
  )
  const [errors, setErrors] = useState({})

  // Re-init rows when reporter changes
  const handleReporterChange = (id) => {
    setForm(p => ({ ...p, submittedBy: id }))
    setActRows(initActivityRows(id, null))
  }

  // Aggregate totals from activity rows
  const totalSpentToday   = form.isLeaveAbsent ? 0 : actRows.reduce((s, r) => s + (parseFloat(r.spentMHToday) || 0), 0)
  const totalProgressToday= form.isLeaveAbsent ? 0 : actRows.reduce((s, r) => s + (parseFloat(r.todayProgress) || 0), 0)
  const newCumulSpentMH   = priorCumulSpentMH + totalSpentToday
  const newCumulProgress  = Math.min(priorCumulProgress + totalProgressToday, 100)
  const balanceMH         = workOrder.totalPlannedMH - newCumulSpentMH

  const updateRow = (idx, field, val) =>
    setActRows(rows => rows.map((r, i) => i === idx ? { ...r, [field]: val } : r))

  // Allowed dates: today or yesterday (late submit)
  const allowedDates = [today, yesterday]

  const validate = () => {
    const e = {}
    if (!form.reportDate) e.reportDate = 'Date required'
    if (!form.submittedBy) e.submittedBy = 'Reporter required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSave = () => {
    if (!validate()) return
    onSave({
      workOrderId:        workOrder.id,
      requestWorkNo:      workOrder.requestWorkNo,
      reportDate:         form.reportDate,
      submittedBy:        form.submittedBy,
      progressToday:      totalProgressToday,
      cumulativeProgress: newCumulProgress,
      spentMHToday:       totalSpentToday,
      cumulativeSpentMH:  newCumulSpentMH,
      balanceMH,
      isLeaveAbsent:      form.isLeaveAbsent,
      notes:              form.notes.trim(),
      activityRows:       actRows,
      drStatus:           form.isLeaveAbsent ? 'Leave' : 'Submitted',
      reviewNote:         '',
    })
  }

  const inCls = (err) =>
    `px-2 py-1 text-xs border rounded outline-none w-full ${err ? 'border-red-400 bg-red-50' : 'border-slate-300 focus:border-blue-400'}`

  return (
    <div className="px-5 py-4 space-y-4 max-h-[85vh] overflow-y-auto">
      {/* WO Banner */}
      <div className="bg-slate-50 rounded-lg border border-slate-200 p-3 flex items-center justify-between">
        <div>
          <p className="text-[10px] text-slate-500 font-medium">Work Order</p>
          <p className="font-bold text-[#0f2035] text-sm">{workOrder.requestWorkNo}</p>
          <p className="text-xs text-slate-600">{workOrder.client}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-slate-500 font-medium">Total Planned MH</p>
          <p className="text-xl font-bold text-[#0f2035]">{workOrder.totalPlannedMH}</p>
        </div>
      </div>

      {/* Date & Reporter */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Report Date <span className="text-slate-400 font-normal">(today or yesterday)</span></label>
          <select value={form.reportDate} onChange={e => setForm(p => ({ ...p, reportDate: e.target.value }))}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg outline-none focus:border-blue-500 bg-white">
            {allowedDates.map(d => <option key={d} value={d}>{d}{d === today ? ' (Today)' : ' (Yesterday — late)'}</option>)}
          </select>
          {errors.reportDate && <p className="text-xs text-red-500 mt-1">{errors.reportDate}</p>}
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Reported By</label>
          <select value={form.submittedBy} onChange={e => handleReporterChange(e.target.value)}
            className={`w-full px-3 py-2 text-sm border rounded-lg outline-none focus:border-blue-500 bg-white ${errors.submittedBy ? 'border-red-400' : 'border-slate-300'}`}>
            <option value="">— Select —</option>
            {teamRates.filter(t => (workOrder.assignedTeam || []).includes(t.id))
              .map(t => <option key={t.id} value={t.id}>{t.name} ({t.position})</option>)}
          </select>
          {errors.submittedBy && <p className="text-xs text-red-500 mt-1">{errors.submittedBy}</p>}
        </div>
      </div>

      {/* Leave Toggle */}
      <button type="button"
        onClick={() => setForm(p => ({ ...p, isLeaveAbsent: !p.isLeaveAbsent }))}
        className={`flex items-center gap-3 w-full px-4 py-2.5 rounded-xl border-2 transition-all ${form.isLeaveAbsent ? 'border-orange-400 bg-orange-50 text-orange-700' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}>
        <Coffee size={16} className={form.isLeaveAbsent ? 'text-orange-500' : 'text-slate-400'} />
        <div className="text-left flex-1">
          <p className="text-sm font-semibold">Leave / Absent</p>
          <p className="text-xs opacity-70">Toggle ON if on leave or absent today</p>
        </div>
        <div className={`w-9 h-5 rounded-full transition-colors flex-shrink-0 ${form.isLeaveAbsent ? 'bg-orange-400' : 'bg-slate-300'}`}>
          <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${form.isLeaveAbsent ? 'translate-x-4' : 'translate-x-0'}`} />
        </div>
      </button>

      {form.isLeaveAbsent ? (
        <div className="bg-orange-50 border border-orange-200 rounded-lg px-4 py-3 text-sm text-orange-700 font-medium">
          Progress and Manhours will be recorded as 0 for this leave/absent day.
        </div>
      ) : (
        <>
          {/* Auto-calculated summary */}
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-3">
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Auto-Calculated Values</p>
            <div className="grid grid-cols-3 gap-2">
              <div className="text-center">
                <p className="text-base font-bold text-blue-700">{newCumulProgress.toFixed(1)}%</p>
                <p className="text-[10px] text-slate-500">Cumulative Progress</p>
              </div>
              <div className="text-center">
                <p className="text-base font-bold text-slate-700">{newCumulSpentMH.toFixed(1)}</p>
                <p className="text-[10px] text-slate-500">Cumulative Spent MH</p>
              </div>
              <div className={`text-center rounded-lg p-1 ${balanceMH < 0 ? 'bg-red-100' : balanceMH < workOrder.totalPlannedMH * 0.1 ? 'bg-yellow-100' : 'bg-green-100'}`}>
                <p className={`text-base font-bold ${balanceMH < 0 ? 'text-red-700' : balanceMH < workOrder.totalPlannedMH * 0.1 ? 'text-yellow-700' : 'text-green-700'}`}>{balanceMH.toFixed(1)}</p>
                <p className="text-[10px] text-slate-500">Balance MH<span className="block text-[9px] opacity-60">{workOrder.totalPlannedMH} − {newCumulSpentMH.toFixed(1)}</span></p>
              </div>
            </div>
            {balanceMH < 0 && (
              <div className="mt-2 flex items-center gap-2 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-1.5 border border-red-200">
                <AlertTriangle size={12} /> Over-budget by {Math.abs(balanceMH).toFixed(1)} MH
              </div>
            )}
          </div>

          {/* Activity Progress Table */}
          <div>
            <p className="text-xs font-semibold text-slate-600 mb-2 flex items-center gap-1.5">
              <ListChecks size={13} /> Activity Progress (fill in today's values per item)
            </p>
            <div className="rounded-xl border border-cyan-300 overflow-hidden">
              <div className="bg-cyan-400 px-3 py-1.5">
                <p className="text-xs font-bold text-white">Work Progress Report</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-cyan-300 text-slate-700">
                      <th className="px-2 py-1.5 text-left font-semibold border-r border-cyan-400 w-6">#</th>
                      <th className="px-2 py-1.5 text-left font-semibold border-r border-cyan-400 min-w-[130px]">Activity Name</th>
                      <th className="px-2 py-1.5 text-right font-semibold border-r border-cyan-400 w-16">Total MH</th>
                      <th className="px-2 py-1.5 text-left font-semibold border-r border-cyan-400 w-24">Assign Eng.</th>
                      <th className="px-2 py-1.5 text-right font-semibold border-r border-cyan-400 w-20 bg-yellow-100">Today Spent MH</th>
                      <th className="px-2 py-1.5 text-right font-semibold border-r border-cyan-400 w-16">Prev. Progress</th>
                      <th className="px-2 py-1.5 text-right font-semibold border-r border-cyan-400 w-20 bg-yellow-100">Today Progress%</th>
                      <th className="px-2 py-1.5 text-right font-semibold border-r border-cyan-400 w-20">Progress Upto</th>
                      <th className="px-2 py-1.5 text-left font-semibold min-w-[100px]">Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {actRows.length === 0 ? (
                      <tr><td colSpan={9} className="px-3 py-4 text-center text-slate-400">No activity rows. Please assign activities in MHE.</td></tr>
                    ) : actRows.map((row, i) => {
                      const progressUpto = Math.min((row.prevProgress || 0) + (parseFloat(row.todayProgress) || 0), 100)
                      return (
                        <tr key={row.id || i} className="border-t border-cyan-200 bg-cyan-50">
                          <td className="px-2 py-1 text-slate-400 border-r border-cyan-200">{i + 1}</td>
                          <td className="px-2 py-1 font-medium text-slate-800 border-r border-cyan-200">{row.activityName}</td>
                          <td className="px-2 py-1 text-right tabular-nums border-r border-cyan-200">{row.totalMH}</td>
                          <td className="px-2 py-1 text-slate-600 border-r border-cyan-200 text-[10px]">{row.assignEngineer || '—'}</td>
                          <td className="px-1 py-1 border-r border-cyan-200 bg-yellow-50">
                            <input type="number" min="0" step="0.5" placeholder="0"
                              value={row.spentMHToday}
                              onChange={e => updateRow(i, 'spentMHToday', e.target.value)}
                              className="px-2 py-1 text-xs border border-yellow-300 rounded w-full text-right outline-none focus:border-yellow-500 bg-white" />
                          </td>
                          <td className="px-2 py-1 text-right tabular-nums border-r border-cyan-200 text-slate-500">{row.prevProgress || 0}%</td>
                          <td className="px-1 py-1 border-r border-cyan-200 bg-yellow-50">
                            <input type="number" min="0" max="100" step="0.5" placeholder="0"
                              value={row.todayProgress}
                              onChange={e => updateRow(i, 'todayProgress', e.target.value)}
                              className="px-2 py-1 text-xs border border-yellow-300 rounded w-full text-right outline-none focus:border-yellow-500 bg-white" />
                          </td>
                          <td className="px-2 py-1 text-right tabular-nums border-r border-cyan-200 font-semibold text-blue-700">{progressUpto.toFixed(1)}%</td>
                          <td className="px-1 py-1">
                            <input type="text" placeholder="remark…"
                              value={row.note}
                              onChange={e => updateRow(i, 'note', e.target.value)}
                              className="px-2 py-1 text-xs border border-slate-200 rounded w-full outline-none focus:border-blue-400 bg-white" />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}

      {/* General Notes */}
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1">General Notes / Activities</label>
        <textarea rows={2} value={form.notes}
          onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
          placeholder="Overall notes, issues, or remarks for today…"
          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg outline-none resize-none focus:border-blue-500" />
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
  const actRows  = dr.activityRows || []

  return (
    <div className="px-5 py-4 space-y-4 max-h-[85vh] overflow-y-auto">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-400">Work No.</p>
          <p className="font-bold text-[#0f2035]">{dr.requestWorkNo}</p>
          <p className="text-xs text-slate-500">{dr.reportDate}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <DRStatusBadge status={dr.isLeaveAbsent ? 'Leave' : (dr.drStatus || 'Submitted')} />
          <p className="text-xs text-slate-500">{reporter?.name || dr.submittedBy}</p>
        </div>
      </div>

      {dr.isLeaveAbsent && (
        <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-lg px-4 py-3 text-sm text-orange-700">
          <Coffee size={16} /> Engineer was on Leave / Absent this day.
        </div>
      )}

      {/* Review note if any */}
      {dr.reviewNote && (
        <div className={`flex items-start gap-2 rounded-lg px-4 py-3 border text-sm ${
          dr.drStatus === 'Accepted' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          <MessageSquare size={14} className="flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-[10px] uppercase tracking-wide mb-0.5">ppeLead Review Note</p>
            <p>{dr.reviewNote}</p>
          </div>
        </div>
      )}

      {/* KPI summary */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: 'Today Progress', value: `${dr.progressToday}%`, cls: 'text-slate-800' },
          { label: 'Cumul. Progress', value: `${dr.cumulativeProgress}%`, cls: 'text-blue-700' },
          { label: 'Today Spent MH', value: dr.spentMHToday, cls: 'text-slate-800' },
          { label: 'Cumul. Spent MH', value: dr.cumulativeSpentMH, cls: 'text-slate-800' },
        ].map(c => (
          <div key={c.label} className="bg-slate-50 rounded-lg border border-slate-200 p-2 text-center">
            <p className={`text-lg font-bold ${c.cls}`}>{c.value}</p>
            <p className="text-[10px] text-slate-500">{c.label}</p>
          </div>
        ))}
      </div>

      <div className={`rounded-lg border p-3 text-center ${dr.balanceMH < 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
        <p className="text-[10px] text-slate-500 mb-1">Balance MH = {workOrder?.totalPlannedMH ?? '?'} − {dr.cumulativeSpentMH}</p>
        <p className={`text-2xl font-bold ${dr.balanceMH < 0 ? 'text-red-700' : 'text-green-700'}`}>{dr.balanceMH}</p>
      </div>

      {/* Activity rows table */}
      {actRows.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1.5"><ListChecks size={12} /> Activity Progress</p>
          <div className="rounded-xl border border-cyan-300 overflow-hidden">
            <div className="bg-cyan-400 px-3 py-1.5"><p className="text-xs font-bold text-white">Work Progress Report</p></div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-cyan-300 text-slate-700">
                    {['#','Activity Name','Total MH','Assign Eng.','Today Spent MH','Prev. Progress','Today Progress%','Progress Upto','Note'].map(h => (
                      <th key={h} className="px-2 py-1.5 text-left font-semibold border-r border-cyan-400 last:border-r-0 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {actRows.map((row, i) => {
                    const upto = Math.min((row.prevProgress || 0) + (parseFloat(row.todayProgress) || 0), 100)
                    return (
                      <tr key={i} className="border-t border-cyan-200 bg-cyan-50">
                        <td className="px-2 py-1 border-r border-cyan-200 text-slate-400">{i+1}</td>
                        <td className="px-2 py-1 border-r border-cyan-200 font-medium">{row.activityName}</td>
                        <td className="px-2 py-1 border-r border-cyan-200 text-right tabular-nums">{row.totalMH}</td>
                        <td className="px-2 py-1 border-r border-cyan-200 text-[10px]">{row.assignEngineer || '—'}</td>
                        <td className="px-2 py-1 border-r border-cyan-200 text-right tabular-nums bg-yellow-50 font-semibold">{row.spentMHToday || 0}</td>
                        <td className="px-2 py-1 border-r border-cyan-200 text-right tabular-nums text-slate-500">{row.prevProgress || 0}%</td>
                        <td className="px-2 py-1 border-r border-cyan-200 text-right tabular-nums bg-yellow-50 font-semibold">{row.todayProgress || 0}%</td>
                        <td className="px-2 py-1 border-r border-cyan-200 text-right tabular-nums font-bold text-blue-700">{upto.toFixed(1)}%</td>
                        <td className="px-2 py-1 text-slate-500">{row.note || '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {dr.notes && (
        <div>
          <p className="text-xs text-slate-400 font-medium mb-1">General Notes</p>
          <p className="text-sm text-slate-700 bg-slate-50 rounded-lg p-3 border border-slate-200">{dr.notes}</p>
        </div>
      )}

      <div className="flex justify-end pt-2 border-t border-slate-100">
        <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg">Close</button>
      </div>
    </div>
  )
}

// ── ppeLead Review Modal ──────────────────────────────────────────────────────

function ReviewModal({ dr, teamRates, workOrder, onReview, onClose }) {
  const [note, setNote]     = useState(dr.reviewNote || '')
  const [action, setAction] = useState(null) // 'accept' | 'reject'
  const reporter = teamRates.find(t => t.id === dr.submittedBy)
  const actRows  = dr.activityRows || []

  const handleSubmit = () => {
    if (!action) return
    onReview({
      drStatus:   action === 'accept' ? 'Accepted' : 'Needs Correction',
      reviewNote: note.trim(),
    })
  }

  return (
    <div className="px-5 py-4 space-y-4 max-h-[85vh] overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-400">Work No.</p>
          <p className="font-bold text-[#0f2035]">{dr.requestWorkNo}</p>
          <p className="text-xs text-slate-500">{dr.reportDate} — {reporter?.name || dr.submittedBy}</p>
        </div>
        <DRStatusBadge status={dr.drStatus || 'Submitted'} />
      </div>

      {/* KPI summary */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Today Progress', value: `${dr.progressToday}%` },
          { label: 'Today Spent MH', value: dr.spentMHToday },
          { label: 'Balance MH',     value: dr.balanceMH },
        ].map(c => (
          <div key={c.label} className="bg-slate-50 rounded-lg border border-slate-200 p-2 text-center">
            <p className="text-lg font-bold text-slate-800">{c.value}</p>
            <p className="text-[10px] text-slate-500">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Activity rows */}
      {actRows.length > 0 && (
        <div className="rounded-xl border border-cyan-300 overflow-hidden">
          <div className="bg-cyan-400 px-3 py-1.5"><p className="text-xs font-bold text-white">Work Progress Report</p></div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-cyan-300 text-slate-700">
                  {['#','Activity Name','Total MH','Today Spent MH','Prev %','Today %','Upto %','Note'].map(h => (
                    <th key={h} className="px-2 py-1.5 font-semibold border-r border-cyan-400 last:border-r-0 whitespace-nowrap text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {actRows.map((row, i) => {
                  const upto = Math.min((row.prevProgress||0)+(parseFloat(row.todayProgress)||0),100)
                  return (
                    <tr key={i} className="border-t border-cyan-200 bg-cyan-50">
                      <td className="px-2 py-1 border-r border-cyan-200 text-slate-400">{i+1}</td>
                      <td className="px-2 py-1 border-r border-cyan-200 font-medium">{row.activityName}</td>
                      <td className="px-2 py-1 border-r border-cyan-200 text-right tabular-nums">{row.totalMH}</td>
                      <td className="px-2 py-1 border-r border-cyan-200 text-right tabular-nums bg-yellow-50 font-semibold">{row.spentMHToday||0}</td>
                      <td className="px-2 py-1 border-r border-cyan-200 text-right tabular-nums text-slate-500">{row.prevProgress||0}%</td>
                      <td className="px-2 py-1 border-r border-cyan-200 text-right tabular-nums bg-yellow-50 font-semibold">{row.todayProgress||0}%</td>
                      <td className="px-2 py-1 border-r border-cyan-200 text-right tabular-nums font-bold text-blue-700">{upto.toFixed(1)}%</td>
                      <td className="px-2 py-1 text-slate-500">{row.note||'—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {dr.notes && (
        <div className="bg-slate-50 rounded-lg border border-slate-200 p-3 text-sm text-slate-700">
          <p className="text-[10px] font-semibold text-slate-400 uppercase mb-1">General Notes</p>
          {dr.notes}
        </div>
      )}

      {/* Review action */}
      <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-3">
        <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">ppeLead Review</p>
        <div className="flex gap-3">
          <button onClick={() => setAction('accept')}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border-2 text-sm font-semibold transition-all ${
              action === 'accept' ? 'border-green-500 bg-green-50 text-green-700' : 'border-slate-200 text-slate-600 hover:border-green-300'
            }`}>
            <ThumbsUp size={15} /> Accept
          </button>
          <button onClick={() => setAction('reject')}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border-2 text-sm font-semibold transition-all ${
              action === 'reject' ? 'border-red-500 bg-red-50 text-red-700' : 'border-slate-200 text-slate-600 hover:border-red-300'
            }`}>
            <RotateCcw size={15} /> Require Correction
          </button>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Review Note {action === 'reject' && <span className="text-red-500">*</span>}</label>
          <textarea rows={3} value={note} onChange={e => setNote(e.target.value)}
            placeholder="Add feedback or instructions for the team member…"
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg outline-none resize-none focus:border-blue-500" />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
        <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg">Cancel</button>
        <button onClick={handleSubmit} disabled={!action}
          className={`px-4 py-2 text-sm font-medium text-white rounded-lg flex items-center gap-2 transition-colors disabled:opacity-40 ${
            action === 'accept' ? 'bg-green-600 hover:bg-green-700' : action === 'reject' ? 'bg-red-600 hover:bg-red-700' : 'bg-slate-400'
          }`}>
          <CheckCircle size={15} /> Submit Review
        </button>
      </div>
    </div>
  )
}

// ── Main Daily Report Page ────────────────────────────────────────────────────

export default function DailyReport() {
  const { workOrders, dailyReports, addDailyReport, updateDailyReport, teamRates, currentRole } = useApp()

  const [activeTab, setActiveTab]     = useState('reports') // 'reports' | 'logsheet'
  const [search, setSearch]           = useState('')
  const [filterWO, setFilterWO]       = useState('All')
  const [activeModal, setActiveModal] = useState(null)

  const canSubmit  = ['ppeTeam', 'ppeLead', 'ppeManager', 'ppeAdmin', 'MasterAdmin'].includes(currentRole)
  const canReview  = ['ppeLead', 'ppeManager', 'ppeAdmin', 'MasterAdmin'].includes(currentRole)
  const canLogSheet= ['ppeLead', 'ppeManager', 'ppeAdmin', 'MasterAdmin', 'GM/MD'].includes(currentRole)

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

  // Log sheet rows: flatten activityRows per DR
  const logSheetRows = useMemo(() => {
    const rows = []
    dailyReports
      .sort((a, b) => b.reportDate.localeCompare(a.reportDate))
      .forEach(dr => {
        const reporter = teamRates.find(t => t.id === dr.submittedBy)
        if (dr.isLeaveAbsent) {
          rows.push({
            date: dr.reportDate, reporter: reporter?.name || dr.submittedBy,
            rqwNo: dr.requestWorkNo, activityName: '— Leave / Absent —',
            spentMH: 0, balanceMH: dr.balanceMH,
            todayProgress: 0, prevProgress: 0, progressUpto: 0,
            drStatus: 'Leave',
          })
        } else {
          const actRows = dr.activityRows || []
          if (actRows.length === 0) {
            rows.push({
              date: dr.reportDate, reporter: reporter?.name || dr.submittedBy,
              rqwNo: dr.requestWorkNo, activityName: '—',
              spentMH: dr.spentMHToday, balanceMH: dr.balanceMH,
              todayProgress: dr.progressToday, prevProgress: 0,
              progressUpto: dr.cumulativeProgress, drStatus: dr.drStatus || 'Submitted',
            })
          } else {
            actRows.forEach(row => {
              const upto = Math.min((row.prevProgress||0)+(parseFloat(row.todayProgress)||0),100)
              rows.push({
                date: dr.reportDate, reporter: reporter?.name || dr.submittedBy,
                rqwNo: dr.requestWorkNo, activityName: row.activityName,
                spentMH: parseFloat(row.spentMHToday)||0, balanceMH: dr.balanceMH,
                todayProgress: parseFloat(row.todayProgress)||0,
                prevProgress: row.prevProgress||0, progressUpto: upto,
                drStatus: dr.drStatus || 'Submitted',
              })
            })
          }
        }
      })
    return rows
  }, [dailyReports, teamRates])

  const openModal = (type, data = null) => setActiveModal({ type, data })
  const closeModal = () => setActiveModal(null)

  const totalReports  = dailyReports.length
  const leaveReports  = dailyReports.filter(d => d.isLeaveAbsent).length
  const totalSpentMH  = dailyReports.filter(d => !d.isLeaveAbsent).reduce((s, d) => s + d.spentMHToday, 0)
  const pendingReview = dailyReports.filter(d => ['Submitted','Resubmitted'].includes(d.drStatus)).length

  const getWorkOrder  = (woId) => workOrders.find(w => w.id === woId)
  const getDrReporter = (dr)   => teamRates.find(t => t.id === dr.submittedBy)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Daily Report</h2>
          <p className="text-xs text-slate-500 mt-0.5">Submit daily progress — ppeLead reviews and accepts each report</p>
        </div>
        {canSubmit && ongoingWOs.length > 0 && (
          <button
            onClick={() => {
              if (ongoingWOs.length === 1) {
                openModal('form', { wo: ongoingWOs[0] })
              } else {
                openModal('submit')
              }
            }}
            className="flex items-center gap-2 px-4 py-2 bg-[#0f2035] text-white text-sm font-medium rounded-lg hover:bg-[#162d4a] transition-colors">
            <Plus size={16} /> Submit Daily Report
          </button>
        )}
      </div>

      {ongoingWOs.length === 0 && canSubmit && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle size={16} className="text-yellow-600 flex-shrink-0" />
          <p className="text-sm text-yellow-800">No ongoing work orders. Daily reports can only be submitted for <strong>Ongoing</strong> work orders.</p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total Reports',    value: totalReports,                cls: 'text-slate-800' },
          { label: 'Active Projects',  value: ongoingWOs.length,           cls: 'text-blue-600' },
          { label: 'Total Spent MH',   value: totalSpentMH.toFixed(1),     cls: 'text-slate-700' },
          { label: 'Pending Review',   value: pendingReview,               cls: pendingReview > 0 ? 'text-orange-600' : 'text-green-600' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-slate-200 shadow-sm px-4 py-3">
            <p className={`text-2xl font-bold ${s.cls}`}>{s.value}</p>
            <p className="text-xs text-slate-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs — only show when there are multiple tabs */}
      {canLogSheet && (
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
          {[
            { id: 'reports',  label: 'Daily Reports', icon: ClipboardList },
            { id: 'logsheet', label: 'Log Sheet',     icon: ListChecks },
          ].map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === t.id ? 'bg-white text-[#0f2035] shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}>
              <t.icon size={14} /> {t.label}
              {t.id === 'reports' && pendingReview > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-[10px] font-bold bg-orange-500 text-white rounded-full">{pendingReview}</span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* ── Daily Reports tab ── */}
      {activeTab === 'reports' && (
        <>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-4 py-3 flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="text" placeholder="Search work no. or date…" value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg outline-none focus:border-blue-500" />
            </div>
            <select value={filterWO} onChange={e => setFilterWO(e.target.value)}
              className="px-3 py-2 text-sm border border-slate-300 rounded-lg outline-none focus:border-blue-500 bg-white">
              <option value="All">All Work Orders</option>
              {workOrders.map(wo => <option key={wo.id} value={wo.id}>{wo.requestWorkNo}</option>)}
            </select>
            <span className="text-xs text-slate-400">{displayed.length} records</span>
          </div>

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
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Balance MH</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {displayed.length === 0 ? (
                    <tr><td colSpan={9} className="px-4 py-10 text-center text-slate-400 text-sm">No daily reports found.</td></tr>
                  ) : displayed.map(dr => {
                    const reporter = getDrReporter(dr)
                    const drSt = dr.isLeaveAbsent ? 'Leave' : (dr.drStatus || 'Submitted')
                    const needsReview = ['Submitted','Resubmitted'].includes(drSt)
                    return (
                      <tr key={dr.id} className={`hover:bg-slate-50 transition-colors ${dr.isLeaveAbsent ? 'bg-orange-50/40' : needsReview ? 'bg-blue-50/30' : ''}`}>
                        <td className="px-4 py-3 text-slate-700 text-xs">
                          <span className="flex items-center gap-1"><CalendarDays size={12} />{dr.reportDate}</span>
                        </td>
                        <td className="px-4 py-3 font-semibold text-[#0f2035]">{dr.requestWorkNo}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-[#0f2035] text-white flex items-center justify-center text-[9px] font-bold flex-shrink-0">
                              {reporter?.name?.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase()||'?'}
                            </div>
                            <span className="text-xs text-slate-700">{reporter?.name || dr.submittedBy}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-slate-600">{dr.isLeaveAbsent ? '—' : `${dr.progressToday}%`}</td>
                        <td className="px-4 py-3 text-right tabular-nums"><span className="font-medium text-blue-700">{dr.cumulativeProgress}%</span></td>
                        <td className="px-4 py-3 text-right tabular-nums text-slate-600">{dr.isLeaveAbsent ? '—' : dr.spentMHToday}</td>
                        <td className={`px-4 py-3 text-right font-bold tabular-nums ${dr.balanceMH < 0 ? 'text-red-600' : dr.balanceMH < 30 ? 'text-yellow-600' : 'text-green-700'}`}>{dr.balanceMH}</td>
                        <td className="px-4 py-3"><DRStatusBadge status={drSt} /></td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1.5">
                            {canReview && needsReview && (
                              <button onClick={() => openModal('review', dr)} title="Review Report"
                                className="px-2.5 py-1 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors flex items-center gap-1">
                                <ThumbsUp size={12} /> Review
                              </button>
                            )}
                            {canSubmit && ['Needs Correction','Not Submitted'].includes(drSt) && (
                              <button onClick={() => openModal('edit', dr)} title="Edit / Resubmit"
                                className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                                <Pencil size={15} />
                              </button>
                            )}
                            {canSubmit && drSt === 'Submitted' && !canReview && (
                              <button onClick={() => openModal('edit', dr)} title="Edit"
                                className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                                <Pencil size={15} />
                              </button>
                            )}
                            <button onClick={() => openModal('detail', dr)} title="View Details"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
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
        </>
      )}

      {/* ── Log Sheet tab ── */}
      {activeTab === 'logsheet' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
            <ListChecks size={15} className="text-slate-500" />
            <p className="text-sm font-semibold text-slate-700">Table list Daily Report under each of ppeTeam</p>
            <span className="ml-auto text-xs text-slate-400">{logSheetRows.length} rows</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-cyan-400 text-white">
                  {['Date','ppeTeam','RQW No.','Activity Name','Today Spent MH','Balance MH','Today Progress','Previously Progress','Progress Upto Date','Status'].map(h => (
                    <th key={h} className="px-3 py-2 text-left font-semibold border-r border-cyan-500 last:border-r-0 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logSheetRows.length === 0 ? (
                  <tr><td colSpan={10} className="px-4 py-8 text-center text-slate-400">No report data yet.</td></tr>
                ) : logSheetRows.map((row, i) => (
                  <tr key={i} className={`border-t border-cyan-100 ${row.drStatus === 'Leave' ? 'bg-orange-50' : i % 2 === 0 ? 'bg-cyan-50' : 'bg-white'}`}>
                    <td className="px-3 py-2 border-r border-cyan-100 whitespace-nowrap">{row.date}</td>
                    <td className="px-3 py-2 border-r border-cyan-100 font-medium">{row.reporter}</td>
                    <td className="px-3 py-2 border-r border-cyan-100 font-semibold text-[#0f2035]">{row.rqwNo}</td>
                    <td className="px-3 py-2 border-r border-cyan-100">{row.activityName}</td>
                    <td className="px-3 py-2 border-r border-cyan-100 text-right tabular-nums bg-yellow-50 font-semibold">{row.spentMH}</td>
                    <td className={`px-3 py-2 border-r border-cyan-100 text-right tabular-nums font-semibold ${row.balanceMH < 0 ? 'text-red-600' : 'text-green-700'}`}>{row.balanceMH}</td>
                    <td className="px-3 py-2 border-r border-cyan-100 text-right tabular-nums bg-yellow-50 font-semibold">{row.todayProgress}%</td>
                    <td className="px-3 py-2 border-r border-cyan-100 text-right tabular-nums text-slate-500">{row.prevProgress}%</td>
                    <td className="px-3 py-2 border-r border-cyan-100 text-right tabular-nums font-bold text-blue-700">{typeof row.progressUpto === 'number' ? row.progressUpto.toFixed(1) : row.progressUpto}%</td>
                    <td className="px-3 py-2"><DRStatusBadge status={row.drStatus} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Modals ── */}
      <Modal isOpen={activeModal?.type === 'submit'} onClose={closeModal}
        title="Submit Daily Report" size="lg">
        <WorkOrderPicker workOrders={ongoingWOs} onSelect={wo => openModal('form', { wo })} onClose={closeModal} />
      </Modal>

      <Modal isOpen={activeModal?.type === 'form'} onClose={closeModal}
        title={`Daily Report — ${activeModal?.data?.wo?.requestWorkNo || ''}`} size="xl">
        {activeModal?.data?.wo && (
          <DailyReportForm workOrder={activeModal.data.wo} teamRates={teamRates}
            existingReports={dailyReports.filter(d => d.workOrderId === activeModal.data.wo.id)}
            editTarget={null} onClose={closeModal}
            onSave={data => { addDailyReport(data); closeModal() }} />
        )}
      </Modal>

      <Modal isOpen={activeModal?.type === 'edit'} onClose={closeModal}
        title={`Edit Daily Report — ${activeModal?.data?.reportDate || ''}`} size="xl">
        {activeModal?.data && (() => {
          const wo = getWorkOrder(activeModal.data.workOrderId)
          return wo ? (
            <DailyReportForm workOrder={wo} teamRates={teamRates}
              existingReports={dailyReports.filter(d => d.workOrderId === wo.id)}
              editTarget={activeModal.data} onClose={closeModal}
              onSave={data => { updateDailyReport(activeModal.data.id, { ...data, drStatus: 'Resubmitted' }); closeModal() }} />
          ) : null
        })()}
      </Modal>

      <Modal isOpen={activeModal?.type === 'review'} onClose={closeModal}
        title={`Review Report — ${activeModal?.data?.requestWorkNo || ''} / ${activeModal?.data?.reportDate || ''}`} size="xl">
        {activeModal?.data && (
          <ReviewModal dr={activeModal.data} teamRates={teamRates}
            workOrder={getWorkOrder(activeModal.data.workOrderId)}
            onClose={closeModal}
            onReview={data => { updateDailyReport(activeModal.data.id, data); closeModal() }} />
        )}
      </Modal>

      <Modal isOpen={activeModal?.type === 'detail'} onClose={closeModal}
        title={`Daily Report Detail — ${activeModal?.data?.reportDate || ''}`} size="xl">
        {activeModal?.data && (
          <DRDetailModal dr={activeModal.data} teamRates={teamRates}
            workOrder={getWorkOrder(activeModal.data.workOrderId)} onClose={closeModal} />
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
