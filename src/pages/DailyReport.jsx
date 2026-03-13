import React, { useState, useMemo, useEffect } from 'react'
import {
  Plus, Eye, Search, CalendarDays, AlertTriangle,
  Coffee, CheckCircle, Pencil, ThumbsUp, RotateCcw,
  MessageSquare, ClipboardList, ListChecks, ChevronLeft, ChevronRight, Trash2,
  ClipboardCheck, UserCheck, XCircle,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import { collection, onSnapshot } from 'firebase/firestore'
import { db as authDb } from '../firebase/firebaseAuth'
import Modal from '../components/ui/Modal'
import StatusBadge from '../components/ui/StatusBadge'
import ConfirmDialog from '../components/ui/ConfirmDialog'

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

// ppeTeamUsers: [{ id: uid, name: 'First Last', position: '...' }]
function DailyReportForm({ workOrder, teamRates, ppeTeamUsers, existingReports, editTarget, currentUserUid, onSave, onClose }) {
  const today     = new Date().toISOString().split('T')[0]
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]

  const allMheRows = workOrder.mheRows || workOrder.wbsItems || []

  // Reporter is always the current logged-in user (auto, not selectable)
  const reporterUid = editTarget?.submittedBy ?? currentUserUid ?? ''
  const reporterEntry = ppeTeamUsers.find(u => u.id === reporterUid)
  const reporterName  = reporterEntry?.name ?? ''

  // Get prior reports scoped to same WO + same submittedBy
  const getPriorReports = (uid) =>
    existingReports
      .filter(d => d.submittedBy === uid && (editTarget ? d.id !== editTarget.id : true))
      .sort((a, b) => a.reportDate.localeCompare(b.reportDate))

  // Get latest prevProgress per activity from prior reports
  const getActivityPrevProgress = (uid, activityName) => {
    const prior = getPriorReports(uid)
    for (let i = prior.length - 1; i >= 0; i--) {
      const rows = prior[i].activityRows || []
      const match = rows.find(r => r.activityName === activityName)
      if (match !== undefined) {
        return Math.min(
          (match.prevProgress || 0) + (parseFloat(match.todayProgress) || 0),
          100
        )
      }
    }
    return 0
  }

  const initActivityRows = (uid, existingRows) => {
    if (existingRows && existingRows.length > 0) return existingRows

    // Resolve reporter name for matching assignEngineer
    const userEntry   = ppeTeamUsers.find(u => u.id === uid)
    const legacyEntry = teamRates.find(t => t.id === uid)
    const rName       = userEntry?.name || legacyEntry?.name || ''

    // Filter only rows assigned to this user (or unassigned rows)
    const myRows = uid
      ? allMheRows.filter(r =>
          !r.assignEngineer ||
          r.assignEngineer === rName ||
          r.assignEngineer === uid
        )
      : allMheRows

    return myRows.map(r => ({
      id:             r.id || r.activityName || Math.random().toString(36).slice(2),
      activityName:   r.activityName || r.task || '',
      totalMH:        r.totalMH || 0,
      assignEngineer: r.assignEngineer || '',
      prevProgress:   uid ? getActivityPrevProgress(uid, r.activityName || r.task || '') : 0,
      todayProgress:  '',
      spentMHToday:   '',
      note:           '',
    }))
  }

  const [form, setForm] = useState({
    reportDate:    editTarget?.reportDate    ?? today,
    isLeaveAbsent: editTarget?.isLeaveAbsent ?? false,
    notes:         editTarget?.notes         ?? '',
  })
  const [actRows, setActRows] = useState(() =>
    initActivityRows(reporterUid, editTarget?.activityRows ?? null)
  )
  const [errors, setErrors] = useState({})

  // Prior reports of THIS reporter only (for personal cumulative tracking)
  const priorReports       = getPriorReports(reporterUid)
  const priorCumulSpentMH  = priorReports.reduce((s, d) => s + (d.isLeaveAbsent ? 0 : d.spentMHToday), 0)
  const priorCumulProgress = priorReports.length > 0 ? priorReports[priorReports.length - 1].cumulativeProgress : 0

  // Aggregate totals from THIS reporter's activity rows
  const totalSpentToday    = form.isLeaveAbsent ? 0 : actRows.reduce((s, r) => s + (parseFloat(r.spentMHToday) || 0), 0)
  const totalProgressToday = form.isLeaveAbsent ? 0 : actRows.reduce((s, r) => s + (parseFloat(r.todayProgress) || 0), 0)
  const newCumulSpentMH    = priorCumulSpentMH + totalSpentToday
  const newCumulProgress   = Math.min(priorCumulProgress + totalProgressToday, 100)

  // Balance MH = WO total − ALL users' spent MH for this WO (whole team, not just this reporter)
  const allPriorSpentMH = existingReports
    .filter(d => editTarget ? d.id !== editTarget.id : true)
    .filter(d => !d.isLeaveAbsent)
    .reduce((s, d) => s + (d.spentMHToday || 0), 0)
  const balanceMH = workOrder.totalPlannedMH - (allPriorSpentMH + totalSpentToday)

  const updateRow = (idx, field, val) =>
    setActRows(rows => rows.map((r, i) => i === idx ? { ...r, [field]: val } : r))

  const allowedDates = [today, yesterday]

  const validate = () => {
    const e = {}
    if (!form.reportDate) e.reportDate = 'Date required'
    if (!reporterUid) e.reporter = 'Cannot resolve current user'

    // Prevent duplicate daily report for the same date by the same user on this WO
    const hasSameDayReport = existingReports.some(d =>
      d.submittedBy === reporterUid &&
      d.reportDate === form.reportDate &&
      (!editTarget || d.id !== editTarget.id)
    )
    if (hasSameDayReport) {
      e.reportDate = 'Daily report for this date has already been submitted.'
    }

    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSave = () => {
    if (!validate()) return
    onSave({
      workOrderId:        workOrder.id,
      requestWorkNo:      workOrder.requestWorkNo,
      reportDate:         form.reportDate,
      submittedBy:        reporterUid,
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

      {/* Date & Reporter (auto) */}
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
          <div className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 text-slate-700 font-medium flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-[#0f2035] text-white flex items-center justify-center text-[9px] font-bold flex-shrink-0">
              {reporterName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?'}
            </div>
            <span className="truncate">{reporterName || reporterUid || '—'}</span>
          </div>
          {errors.reporter && <p className="text-xs text-red-500 mt-1">{errors.reporter}</p>}
        </div>
      </div>

      {/* Leave Toggle — per user */}
      <button type="button"
        onClick={() => setForm(p => ({ ...p, isLeaveAbsent: !p.isLeaveAbsent }))}
        className={`flex items-center gap-3 w-full px-4 py-2.5 rounded-xl border-2 transition-all ${form.isLeaveAbsent ? 'border-orange-400 bg-orange-50 text-orange-700' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}>
        <Coffee size={16} className={form.isLeaveAbsent ? 'text-orange-500' : 'text-slate-400'} />
        <div className="text-left flex-1">
          <p className="text-sm font-semibold">Leave / Absent</p>
          <p className="text-xs opacity-70">
            {reporterName ? `Toggle ON if ${reporterName} is on leave or absent today` : 'Toggle ON if on leave or absent today'}
          </p>
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
                <p className="text-[10px] text-slate-500">Balance MH<span className="block text-[9px] opacity-60">{workOrder.totalPlannedMH} − {(allPriorSpentMH + totalSpentToday).toFixed(1)} (all team)</span></p>
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
                      const prevProgress = row.prevProgress || 0
                      const todayVal     = parseFloat(row.todayProgress) || 0
                      const progressUpto = Math.min(prevProgress + todayVal, 100)
                      const maxToday     = Math.max(0, 100 - prevProgress)
                      const reachedMax   = prevProgress >= 100 || maxToday === 0

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
                          <td className="px-2 py-1 text-right tabular-nums border-r border-cyan-200 text-slate-500">{prevProgress}%</td>
                          <td className="px-1 py-1 border-r border-cyan-200 bg-yellow-50">
                            <input
                              type="number"
                              min="0"
                              max={maxToday}
                              step="0.5"
                              placeholder={reachedMax ? 'max 100%' : '0'}
                              value={row.todayProgress}
                              disabled={reachedMax}
                              onChange={e => {
                                const raw = e.target.value
                                const num = parseFloat(raw)
                                if (Number.isNaN(num)) {
                                  updateRow(i, 'todayProgress', raw)
                                  return
                                }
                                const clamped = Math.max(0, Math.min(num, maxToday))
                                updateRow(i, 'todayProgress', clamped.toString())
                              }}
                              className={`px-2 py-1 text-xs border rounded w-full text-right outline-none bg-white ${
                                reachedMax
                                  ? 'border-slate-200 text-slate-400 bg-slate-50 cursor-not-allowed'
                                  : 'border-yellow-300 focus:border-yellow-500'
                              }`}
                            />
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

function DRDetailModal({ dr: initialDr, allDrs = [], teamRates, ppeTeamUsers, workOrder, onClose }) {
  // Sort allDrs by date ascending so prev = older, next = newer
  const sortedDrs = useMemo(() =>
    [...allDrs].sort((a, b) => a.reportDate.localeCompare(b.reportDate)),
  [allDrs])

  const [currentIndex, setCurrentIndex] = useState(() => {
    const idx = sortedDrs.findIndex(d => d.id === initialDr.id)
    return idx >= 0 ? idx : 0
  })

  const dr = sortedDrs[currentIndex] || initialDr
  const hasPrev = currentIndex > 0
  const hasNext = currentIndex < sortedDrs.length - 1

  const resolveReporter = (id) => {
    const user = (ppeTeamUsers || []).find(u => u.id === id)
    if (user) return user.name
    return teamRates.find(t => t.id === id)?.name || id
  }
  const actRows  = dr.activityRows || []

  return (
    <div className="px-5 py-4 space-y-4 max-h-[85vh] overflow-y-auto">
      {/* Header row with navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentIndex(i => i - 1)}
            disabled={!hasPrev}
            title="Previous day"
            className={`p-1.5 rounded-lg border transition-colors ${hasPrev ? 'border-slate-300 text-slate-600 hover:bg-slate-100' : 'border-slate-100 text-slate-300 cursor-not-allowed'}`}>
            <ChevronLeft size={15} />
          </button>
          <div>
            <p className="text-xs text-slate-400">Work No.</p>
            <p className="font-bold text-[#0f2035]">{dr.requestWorkNo}</p>
            <p className="text-xs text-slate-500">{dr.reportDate}</p>
          </div>
          <button
            onClick={() => setCurrentIndex(i => i + 1)}
            disabled={!hasNext}
            title="Next day"
            className={`p-1.5 rounded-lg border transition-colors ${hasNext ? 'border-slate-300 text-slate-600 hover:bg-slate-100' : 'border-slate-100 text-slate-300 cursor-not-allowed'}`}>
            <ChevronRight size={15} />
          </button>
        </div>
        <div className="flex flex-col items-end gap-1">
          {sortedDrs.length > 1 && (
            <p className="text-[10px] text-slate-400">{currentIndex + 1} / {sortedDrs.length} days</p>
          )}
          <DRStatusBadge status={dr.isLeaveAbsent ? 'Leave' : (dr.drStatus || 'Submitted')} />
          <p className="text-xs text-slate-500">{resolveReporter(dr.submittedBy)}</p>
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

function ReviewModal({ dr, teamRates, ppeTeamUsers, workOrder, onReview, onClose }) {
  const [note, setNote]     = useState(dr.reviewNote || '')
  const [action, setAction] = useState(null) // 'accept' | 'reject'
  const resolveReporter = (id) => {
    const user = (ppeTeamUsers || []).find(u => u.id === id)
    if (user) return user.name
    return teamRates.find(t => t.id === id)?.name || id
  }
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
          <p className="text-xs text-slate-500">{dr.reportDate} — {resolveReporter(dr.submittedBy)}</p>
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
  const { workOrders, dailyReports, addDailyReport, updateDailyReport, deleteDailyReport, teamRates, userHasRole, userRoles } = useApp()
  const { firebaseUser, userProfile: authProfile } = useAuth()

  const [activeTab, setActiveTab]     = useState('reports') // 'reports' | 'approve' | 'logsheet'
  const [search, setSearch]           = useState('')
  const [filterWO, setFilterWO]       = useState('All')
  const [activeModal, setActiveModal] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [ppeTeamUsers, setPpeTeamUsers] = useState([]) // { id: uid, name, position }

  // Load all approved users for name resolution (not just ppeTeam)
  useEffect(() => {
    const ref = collection(authDb, 'PPE System', 'root', 'users')
    const unsub = onSnapshot(ref, snap => {
      const users = snap.docs.map(d => d.data())
      setPpeTeamUsers(
        users
          .filter(u => u.status === 'approved')
          .map(u => ({ id: u.uid, name: `${u.firstName} ${u.lastName}`.trim(), position: u.position || '' }))
          .sort((a, b) => a.name.localeCompare(b.name))
      )
    })
    return unsub
  }, [])

  const canSubmit  = userHasRole(['ppeTeam', 'ppeLead', 'ppeManager', 'ppeAdmin', 'MasterAdmin'])
  const canReview  = userHasRole(['ppeLead', 'ppeManager', 'ppeAdmin', 'MasterAdmin'])
  const canLogSheet= userHasRole(['ppeLead', 'ppeManager', 'ppeAdmin', 'MasterAdmin', 'GM/MD'])
  const canDelete  = userHasRole(['ppeAdmin', 'MasterAdmin'])

  // ppeTeam-only: see only own reports
  const isPpeTeamOnly = userRoles.length > 0 && userRoles.every(r => r === 'ppeTeam')
  const myUid         = firebaseUser?.uid ?? ''
  const myFullName    = authProfile
    ? `${authProfile.firstName} ${authProfile.lastName}`.trim()
    : ''

  // Resolve reporter display name: check ppeTeamUsers first, then teamRates (legacy)
  const getReporterName = (submittedBy) => {
    if (!submittedBy) return '—'
    const user = ppeTeamUsers.find(u => u.id === submittedBy)
    if (user) return user.name
    const legacy = teamRates.find(t => t.id === submittedBy)
    return legacy?.name || submittedBy
  }

  // For ppeTeam: only show reports where submittedBy matches their UID or name (legacy)
  const visibleReports = useMemo(() => {
    if (!isPpeTeamOnly) return dailyReports
    return dailyReports.filter(dr => {
      if (myUid && dr.submittedBy === myUid) return true
      // Legacy fallback: submittedBy was teamRates ID, match by name
      const legacy = teamRates.find(t => t.id === dr.submittedBy)
      return legacy?.name === myFullName
    })
  }, [dailyReports, isPpeTeamOnly, myUid, myFullName, teamRates])

  // ppeTeam only sees Ongoing WOs they are assigned to
  const ongoingWOs = workOrders.filter(w => {
    if (w.status !== 'Ongoing') return false
    if (!isPpeTeamOnly) return true
    const rows = w.mheRows || w.wbsItems || []
    const assignedByName = rows.some(r => r.assignEngineer && r.assignEngineer === myFullName)
    const assignedByUid  = myUid && Array.isArray(w.assignedTeam) && w.assignedTeam.includes(myUid)
    return assignedByName || assignedByUid
  })

  // For each workOrderId+submittedBy pair:
  // - Show the latest ACCEPTED report (confirmed data) as the main row
  // - If no accepted report exists, fallback to latest by date
  // - Track if there's a newer pending report after the latest accepted (for badge)
  const latestReports = useMemo(() => {
    const acceptedMap = new Map() // latest Accepted per key
    const anyMap      = new Map() // latest by date per key (any status)
    const pendingMap  = new Map() // latest pending (Submitted/Resubmitted) per key

    visibleReports.forEach(dr => {
      const key = `${dr.workOrderId}__${dr.submittedBy}`

      // Track latest by date (any status)
      const existingAny = anyMap.get(key)
      if (!existingAny || dr.reportDate > existingAny.reportDate) {
        anyMap.set(key, dr)
      }

      // Track latest Accepted
      if (dr.drStatus === 'Accepted') {
        const existingAcc = acceptedMap.get(key)
        if (!existingAcc || dr.reportDate > existingAcc.reportDate) {
          acceptedMap.set(key, dr)
        }
      }

      // Track latest pending
      if (['Submitted', 'Resubmitted'].includes(dr.drStatus)) {
        const existingPending = pendingMap.get(key)
        if (!existingPending || dr.reportDate > existingPending.reportDate) {
          pendingMap.set(key, dr)
        }
      }
    })

    // Build result: prefer latest Accepted; attach hasPending flag if newer pending exists
    const result = []
    anyMap.forEach((_, key) => {
      const accepted = acceptedMap.get(key)
      const pending  = pendingMap.get(key)
      const any      = anyMap.get(key)

      if (accepted) {
        // Has accepted report — use it; mark hasPending if there's a newer pending one
        const hasPending = pending && pending.reportDate > accepted.reportDate
        result.push({ ...accepted, hasPending: hasPending ? pending : null })
      } else {
        // No accepted yet — show latest (pending/submitted)
        result.push({ ...any, hasPending: null })
      }
    })
    return result
  }, [visibleReports])

  const displayed = useMemo(() => {
    let list = [...latestReports]
    if (filterWO !== 'All') list = list.filter(d => d.workOrderId === filterWO)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(d =>
        d.requestWorkNo.toLowerCase().includes(q) ||
        d.reportDate.includes(q)
      )
    }
    return list.sort((a, b) => b.reportDate.localeCompare(a.reportDate))
  }, [latestReports, search, filterWO])

  // Log sheet rows: flatten activityRows per DR
  const logSheetRows = useMemo(() => {
    const rows = []
    visibleReports
      .sort((a, b) => b.reportDate.localeCompare(a.reportDate))
      .forEach(dr => {
        const reporterName = getReporterName(dr.submittedBy)
        if (dr.isLeaveAbsent) {
          rows.push({
            date: dr.reportDate, reporter: reporterName,
            rqwNo: dr.requestWorkNo, activityName: '— Leave / Absent —',
            spentMH: 0, balanceMH: dr.balanceMH,
            todayProgress: 0, prevProgress: 0, progressUpto: 0,
            drStatus: 'Leave',
          })
        } else {
          const actRows = dr.activityRows || []
          if (actRows.length === 0) {
            rows.push({
              date: dr.reportDate, reporter: reporterName,
              rqwNo: dr.requestWorkNo, activityName: '—',
              spentMH: dr.spentMHToday, balanceMH: dr.balanceMH,
              todayProgress: dr.progressToday, prevProgress: 0,
              progressUpto: dr.cumulativeProgress, drStatus: dr.drStatus || 'Submitted',
            })
          } else {
            actRows.forEach(row => {
              const upto = Math.min((row.prevProgress||0)+(parseFloat(row.todayProgress)||0),100)
              rows.push({
                date: dr.reportDate, reporter: reporterName,
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
  }, [visibleReports, ppeTeamUsers, teamRates])

  const openModal = (type, data = null) => setActiveModal({ type, data })
  const closeModal = () => setActiveModal(null)

  const totalReports  = visibleReports.length
  const leaveReports  = visibleReports.filter(d => d.isLeaveAbsent).length
  const totalSpentMH  = visibleReports.filter(d => !d.isLeaveAbsent).reduce((s, d) => s + d.spentMHToday, 0)
  const pendingReview = visibleReports.filter(d => ['Submitted','Resubmitted'].includes(d.drStatus)).length

  const getWorkOrder  = (woId) => workOrders.find(w => w.id === woId)

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

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        {[
          { id: 'reports',  label: 'Daily Reports',    icon: ClipboardList, show: true },
          { id: 'approve',  label: 'Pending Approval', icon: ClipboardCheck, show: canReview },
          { id: 'logsheet', label: 'Log Sheet',        icon: ListChecks,    show: canLogSheet },
        ].filter(t => t.show).map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === t.id ? 'bg-white text-[#0f2035] shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}>
            <t.icon size={14} /> {t.label}
            {t.id === 'approve' && pendingReview > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-[10px] font-bold bg-red-500 text-white rounded-full animate-pulse">{pendingReview}</span>
            )}
            {t.id === 'reports' && pendingReview > 0 && !canReview && (
              <span className="ml-1 px-1.5 py-0.5 text-[10px] font-bold bg-orange-500 text-white rounded-full">{pendingReview}</span>
            )}
          </button>
        ))}
      </div>

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
                    <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Work No.</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Reported By</th>
                    <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Today %</th>
                    <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Cumul %</th>
                    <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Spent MH</th>
                    <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Balance MH</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {displayed.length === 0 ? (
                    <tr><td colSpan={9} className="px-4 py-8 text-center text-slate-400 text-sm">No daily reports found.</td></tr>
                  ) : displayed.map(dr => {
                    const reporterName = getReporterName(dr.submittedBy)
                    const drSt = dr.isLeaveAbsent ? 'Leave' : (dr.drStatus || 'Submitted')
                    const needsReview = ['Submitted','Resubmitted'].includes(drSt)
                    // hasPending = newer pending report exists after the latest accepted
                    const pendingDr = dr.hasPending || null
                    return (
                      <tr key={dr.id}
                        onClick={() => openModal('detail', dr)}
                        className={`cursor-pointer hover:bg-blue-50/50 transition-colors ${dr.isLeaveAbsent ? 'bg-orange-50/40' : needsReview ? 'bg-blue-50/30' : ''}`}>
                        <td className="px-4 py-1.5 text-slate-700 text-xs">
                          <span className="flex items-center gap-1"><CalendarDays size={12} />{dr.reportDate}</span>
                        </td>
                        <td className="px-4 py-1.5 font-semibold text-[#0f2035]">{dr.requestWorkNo}</td>
                        <td className="px-4 py-1.5">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-[#0f2035] text-white flex items-center justify-center text-[9px] font-bold flex-shrink-0">
                              {reporterName.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase()||'?'}
                            </div>
                            <span className="text-xs text-slate-700">{reporterName}</span>
                          </div>
                        </td>
                        <td className="px-4 py-1.5 text-right tabular-nums text-slate-600">{dr.isLeaveAbsent ? '—' : `${dr.progressToday}%`}</td>
                        <td className="px-4 py-1.5 text-right tabular-nums"><span className="font-medium text-blue-700">{dr.cumulativeProgress}%</span></td>
                        <td className="px-4 py-1.5 text-right tabular-nums text-slate-600">{dr.isLeaveAbsent ? '—' : dr.spentMHToday}</td>
                        <td className={`px-4 py-1.5 text-right font-bold tabular-nums ${dr.balanceMH < 0 ? 'text-red-600' : dr.balanceMH < 30 ? 'text-yellow-600' : 'text-green-700'}`}>{dr.balanceMH}</td>
                        <td className="px-4 py-1.5">
                          <div className="flex flex-col gap-1">
                            <DRStatusBadge status={drSt} />
                            {pendingDr && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-orange-100 text-orange-600 border border-orange-200 whitespace-nowrap">
                                <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse flex-shrink-0" />
                                {pendingDr.reportDate} รอ Approve
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-1.5" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            {canReview && needsReview && (
                              <button onClick={() => openModal('review', dr)} title="Review Report"
                                className="px-2.5 py-1 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors flex items-center gap-1">
                                <ThumbsUp size={12} /> Review
                              </button>
                            )}
                            {/* Show edit button based on the pending report if exists, else current dr */}
                            {canSubmit && pendingDr && ['Needs Correction','Not Submitted','Submitted','Resubmitted'].includes(pendingDr.drStatus) && (
                              <button onClick={() => openModal('edit', pendingDr)} title="Edit pending report"
                                className="p-1.5 rounded-lg text-orange-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                                <Pencil size={15} />
                              </button>
                            )}
                            {canSubmit && !pendingDr && ['Needs Correction','Not Submitted'].includes(drSt) && (
                              <button onClick={() => openModal('edit', dr)} title="Edit / Resubmit"
                                className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                                <Pencil size={15} />
                              </button>
                            )}
                            {canSubmit && !pendingDr && drSt === 'Submitted' && !canReview && (
                              <button onClick={() => openModal('edit', dr)} title="Edit"
                                className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                                <Pencil size={15} />
                              </button>
                            )}
                            {canDelete && (
                              <button onClick={() => setDeleteTarget(dr)} title="Delete Report"
                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                                <Trash2 size={15} />
                              </button>
                            )}
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

      {/* ── Pending Review tab ── */}
      {activeTab === 'approve' && canReview && (
        <div className="space-y-3">
          {pendingReview === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-6 py-12 flex flex-col items-center gap-3">
              <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center">
                <CheckCircle size={28} className="text-green-500" />
              </div>
              <p className="text-sm font-semibold text-slate-600">All caught up!</p>
              <p className="text-xs text-slate-400">No daily reports pending approval.</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-4 py-3 bg-[#0f2035] flex items-center gap-3">
                <ClipboardCheck size={15} className="text-blue-300" />
                <p className="text-sm font-semibold text-white">Pending Review</p>
                <span className="ml-1 px-2 py-0.5 text-[10px] font-bold bg-red-500 text-white rounded-full animate-pulse">{pendingReview}</span>
                <p className="text-xs text-slate-400 ml-auto">Click a row to review</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Work No.</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Reported By</th>
                      <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Today %</th>
                      <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Spent MH</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Review</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {visibleReports
                      .filter(dr => ['Submitted', 'Resubmitted'].includes(dr.drStatus))
                      .sort((a, b) => a.reportDate.localeCompare(b.reportDate))
                      .map(dr => {
                        const reporterName = getReporterName(dr.submittedBy)
                        const drSt = dr.drStatus || 'Submitted'
                        return (
                          <tr key={dr.id}
                            onClick={() => openModal('review', dr)}
                            className="cursor-pointer hover:bg-blue-50/50 transition-colors bg-blue-50/20">
                            <td className="px-4 py-1.5 text-slate-700 text-xs">
                              <span className="flex items-center gap-1"><CalendarDays size={12} />{dr.reportDate}</span>
                            </td>
                            <td className="px-4 py-1.5 font-semibold text-[#0f2035]">{dr.requestWorkNo}</td>
                            <td className="px-4 py-1.5">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-[#0f2035] text-white flex items-center justify-center text-[9px] font-bold flex-shrink-0">
                                  {reporterName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?'}
                                </div>
                                <span className="text-xs text-slate-700">{reporterName}</span>
                              </div>
                            </td>
                            <td className="px-4 py-1.5 text-right tabular-nums text-slate-600">{dr.isLeaveAbsent ? '—' : `${dr.progressToday}%`}</td>
                            <td className="px-4 py-1.5 text-right tabular-nums text-slate-600">{dr.isLeaveAbsent ? '—' : dr.spentMHToday}</td>
                            <td className="px-4 py-1.5"><DRStatusBadge status={drSt} /></td>
                            <td className="px-4 py-1.5" onClick={e => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => openModal('review', dr)}
                                  title="Review"
                                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors">
                                  <ThumbsUp size={12} /> Review
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
          )}
        </div>
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
          <DailyReportForm workOrder={activeModal.data.wo} teamRates={teamRates} ppeTeamUsers={ppeTeamUsers}
            existingReports={dailyReports.filter(d => d.workOrderId === activeModal.data.wo.id)}
            editTarget={null} currentUserUid={myUid} onClose={closeModal}
            onSave={data => { addDailyReport(data); closeModal() }} />
        )}
      </Modal>

      <Modal isOpen={activeModal?.type === 'edit'} onClose={closeModal}
        title={`Edit Daily Report — ${activeModal?.data?.reportDate || ''}`} size="xl">
        {activeModal?.data && (() => {
          const wo = getWorkOrder(activeModal.data.workOrderId)
          return wo ? (
            <DailyReportForm workOrder={wo} teamRates={teamRates} ppeTeamUsers={ppeTeamUsers}
              existingReports={dailyReports.filter(d => d.workOrderId === wo.id)}
              editTarget={activeModal.data} currentUserUid={myUid} onClose={closeModal}
              onSave={data => { updateDailyReport(activeModal.data.id, { ...data, drStatus: 'Resubmitted' }); closeModal() }} />
          ) : null
        })()}
      </Modal>

      <Modal isOpen={activeModal?.type === 'review'} onClose={closeModal}
        title={`Review Report — ${activeModal?.data?.requestWorkNo || ''} / ${activeModal?.data?.reportDate || ''}`} size="xl">
        {activeModal?.data && (
          <ReviewModal dr={activeModal.data} teamRates={teamRates} ppeTeamUsers={ppeTeamUsers}
            workOrder={getWorkOrder(activeModal.data.workOrderId)}
            onClose={closeModal}
            onReview={data => { updateDailyReport(activeModal.data.id, data); closeModal() }} />
        )}
      </Modal>

      <Modal isOpen={activeModal?.type === 'detail'} onClose={closeModal}
        title={`Daily Report — ${activeModal?.data?.requestWorkNo || ''}`} size="xl">
        {activeModal?.data && (
          <DRDetailModal
            dr={activeModal.data}
            allDrs={visibleReports.filter(d =>
              d.workOrderId === activeModal.data.workOrderId &&
              d.submittedBy === activeModal.data.submittedBy
            )}
            teamRates={teamRates}
            ppeTeamUsers={ppeTeamUsers}
            workOrder={getWorkOrder(activeModal.data.workOrderId)}
            onClose={closeModal} />
        )}
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => { deleteDailyReport(deleteTarget.id); setDeleteTarget(null) }}
        title="Delete Daily Report"
        message={`Are you sure you want to delete the report for "${deleteTarget?.requestWorkNo}" on ${deleteTarget?.reportDate}? This action cannot be undone.`}
      />
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
