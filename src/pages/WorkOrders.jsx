import React, { useState, useMemo } from 'react'
import {
  Plus, Pencil, Eye, Search, CalendarDays,
  CheckCircle, PlayCircle, AlertTriangle, Rocket,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import Modal from '../components/ui/Modal'
import StatusBadge from '../components/ui/StatusBadge'

function formatIDR(v) {
  if (!v && v !== 0) return '—'
  return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 }).format(v)
}

// ── Schedule Set Modal (ppeLead / ppeManager / ppeAdmin) ─────────────────────

function ScheduleModal({ wo, onSave, onClose }) {
  const [planStart,  setPlanStart]  = useState(wo.planStart  || '')
  const [planFinish, setPlanFinish] = useState(wo.planFinish || '')
  const [errors, setErrors] = useState({})

  const validate = () => {
    const e = {}
    if (!planStart)  e.planStart  = 'Start date required'
    if (!planFinish) e.planFinish = 'Finish date required'
    if (planStart && planFinish && planFinish < planStart) e.planFinish = 'Finish must be after Start'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  return (
    <div className="px-6 py-5 space-y-4">
      <div className="bg-slate-50 rounded-lg border border-slate-200 p-4 space-y-1">
        <p className="text-xs text-slate-500 font-medium">Work Order</p>
        <p className="font-bold text-[#0f2035]">{wo.requestWorkNo}</p>
        <p className="text-sm text-slate-600">{wo.client}</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Plan Start Date</label>
          <input type="date" value={planStart} onChange={e => setPlanStart(e.target.value)}
            className={`w-full px-3 py-2 text-sm border rounded-lg outline-none transition-colors ${errors.planStart ? 'border-red-400 bg-red-50' : 'border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-200'}`} />
          {errors.planStart && <p className="text-xs text-red-500 mt-1">{errors.planStart}</p>}
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Plan Finish Date</label>
          <input type="date" value={planFinish} onChange={e => setPlanFinish(e.target.value)}
            className={`w-full px-3 py-2 text-sm border rounded-lg outline-none transition-colors ${errors.planFinish ? 'border-red-400 bg-red-50' : 'border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-200'}`} />
          {errors.planFinish && <p className="text-xs text-red-500 mt-1">{errors.planFinish}</p>}
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
        <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg">Cancel</button>
        <button onClick={() => validate() && onSave({ planStart, planFinish, status: 'Ongoing' })}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-2">
          <PlayCircle size={15} /> Set Schedule & Start
        </button>
      </div>
    </div>
  )
}

// ── Detail Modal ─────────────────────────────────────────────────────────────

function WODetailModal({ wo, dailyReports, teamRates, onClose }) {
  const woDrs = dailyReports.filter(d => d.workOrderId === wo.id)
    .sort((a, b) => b.reportDate.localeCompare(a.reportDate))

  const latestDr       = woDrs[0]
  const cumulativeProgress = latestDr?.cumulativeProgress ?? 0
  const cumulativeSpentMH  = latestDr?.cumulativeSpentMH  ?? 0
  const balanceMH          = wo.totalPlannedMH - cumulativeSpentMH

  const assignedMembers = (wo.assignedTeam || [])
    .map(id => teamRates.find(t => t.id === id)).filter(Boolean)

  return (
    <div className="px-6 py-5 space-y-5">
      {/* Header info */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        {[
          ['Work No.',    wo.requestWorkNo],
          ['Client',      wo.client],
          ['Plan Start',  wo.planStart  || '—'],
          ['Plan Finish', wo.planFinish || '—'],
          ['Status',      wo.status],
          ['Planned MH',  `${wo.totalPlannedMH} MH`],
        ].map(([k, v]) => (
          <div key={k}>
            <p className="text-xs text-slate-400 font-medium">{k}</p>
            <p className="font-semibold text-slate-800">{v}</p>
          </div>
        ))}
      </div>

      {/* Progress summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-blue-50 rounded-xl border border-blue-200 p-3 text-center">
          <p className="text-xl font-bold text-blue-700">{cumulativeProgress}%</p>
          <p className="text-[10px] text-slate-500">Overall Progress</p>
        </div>
        <div className="bg-slate-50 rounded-xl border border-slate-200 p-3 text-center">
          <p className="text-xl font-bold text-slate-700">{cumulativeSpentMH}</p>
          <p className="text-[10px] text-slate-500">Spent MH</p>
        </div>
        <div className={`rounded-xl border p-3 text-center ${balanceMH < 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
          <p className={`text-xl font-bold ${balanceMH < 0 ? 'text-red-700' : 'text-green-700'}`}>{balanceMH}</p>
          <p className="text-[10px] text-slate-500">Balance MH</p>
        </div>
      </div>

      {/* Progress bar */}
      <div>
        <div className="flex justify-between text-xs text-slate-500 mb-1">
          <span>Progress</span><span>{cumulativeProgress}%</span>
        </div>
        <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
          <div className="h-full bg-blue-500 rounded-full transition-all"
            style={{ width: `${Math.min(cumulativeProgress, 100)}%` }} />
        </div>
      </div>

      {/* Assigned Team */}
      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Assigned Team</p>
        <div className="flex flex-wrap gap-2">
          {assignedMembers.map(m => (
            <div key={m.id} className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5">
              <div className="w-6 h-6 rounded-full bg-[#0f2035] text-white flex items-center justify-center text-[9px] font-bold">
                {m.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <span className="text-xs font-medium text-slate-700">{m.name}</span>
            </div>
          ))}
          {assignedMembers.length === 0 && <p className="text-xs text-slate-400">No team assigned.</p>}
        </div>
      </div>

      {/* Recent Daily Reports */}
      {woDrs.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Recent Daily Reports</p>
          <div className="rounded-lg border border-slate-200 overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-3 py-2 text-left text-slate-500 font-semibold">Date</th>
                  <th className="px-3 py-2 text-right text-slate-500 font-semibold">Today %</th>
                  <th className="px-3 py-2 text-right text-slate-500 font-semibold">Cumul %</th>
                  <th className="px-3 py-2 text-right text-slate-500 font-semibold">Spent MH</th>
                  <th className="px-3 py-2 text-right text-slate-500 font-semibold">Balance MH</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {woDrs.slice(0, 5).map(dr => (
                  <tr key={dr.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2 text-slate-700">{dr.reportDate}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{dr.progressToday}%</td>
                    <td className="px-3 py-2 text-right tabular-nums">{dr.cumulativeProgress}%</td>
                    <td className="px-3 py-2 text-right tabular-nums">{dr.spentMHToday}</td>
                    <td className={`px-3 py-2 text-right font-semibold tabular-nums ${dr.balanceMH < 0 ? 'text-red-600' : 'text-green-700'}`}>
                      {dr.balanceMH}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="flex justify-end pt-2 border-t border-slate-100">
        <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg">Close</button>
      </div>
    </div>
  )
}

// ── Work Progress Report Modal ───────────────────────────────────────────────

function WorkProgressModal({ wo, onClose }) {
  const activityRows = wo.mheRows || wo.wbsItems || []

  return (
    <div className="px-6 py-5 space-y-4 max-h-[80vh] overflow-y-auto">
      {/* Header info */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-slate-50 rounded-xl border border-slate-200 p-3 text-center">
          <p className="text-lg font-bold text-[#0f2035]">{wo.requestWorkNo}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">Work No.</p>
        </div>
        <div className="bg-slate-50 rounded-xl border border-slate-200 p-3 text-center">
          <p className="text-lg font-bold text-[#0f2035]">{wo.totalPlannedMH || 0} MH</p>
          <p className="text-[10px] text-slate-500 mt-0.5">Total Planned MH</p>
        </div>
        <div className="bg-blue-50 rounded-xl border border-blue-200 p-3 text-center">
          <p className="text-lg font-bold text-blue-700">{wo.planStart || '—'} → {wo.planFinish || '—'}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">Schedule</p>
        </div>
      </div>

      {/* Work Progress Report Table */}
      <div className="rounded-xl border border-cyan-300 overflow-hidden">
        <div className="bg-cyan-400 px-4 py-2">
          <p className="text-sm font-bold text-white">Work Progress Report</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-cyan-300">
                {['Item','Activity Name','Total Manhour','Assign Engineer','Today Progress','Previously Progress','Progress Upto Date','Note'].map(h => (
                  <th key={h} className="px-3 py-2 text-left font-semibold text-slate-700 whitespace-nowrap border-r border-cyan-400 last:border-r-0">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {activityRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-6 text-center text-slate-400">No activity rows found in Manhour Estimate.</td>
                </tr>
              ) : activityRows.map((row, i) => (
                <tr key={row.id || i} className="border-t border-cyan-200 bg-cyan-50 hover:bg-cyan-100 transition-colors">
                  <td className="px-3 py-2 text-slate-500 border-r border-cyan-200">{i + 1}</td>
                  <td className="px-3 py-2 font-medium text-slate-800 border-r border-cyan-200 whitespace-nowrap">{row.activityName || row.task || '—'}</td>
                  <td className="px-3 py-2 text-right tabular-nums border-r border-cyan-200">{row.totalMH || 0}</td>
                  <td className="px-3 py-2 border-r border-cyan-200">{row.assignEngineer || '—'}</td>
                  <td className="px-3 py-2 text-right border-r border-cyan-200">—</td>
                  <td className="px-3 py-2 text-right border-r border-cyan-200">—</td>
                  <td className="px-3 py-2 text-right border-r border-cyan-200">—</td>
                  <td className="px-3 py-2">—</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex justify-end pt-2 border-t border-slate-100">
        <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg">Close</button>
      </div>
    </div>
  )
}

// ── Main WorkOrders Page ──────────────────────────────────────────────────────

export default function WorkOrders() {
  const { rfqs, workOrders, addWorkOrder, updateWorkOrder, dailyReports, teamRates, currentRole } = useApp()

  const [search, setSearch]             = useState('')
  const [filterStatus, setFilterStatus] = useState('All')
  const [activeModal, setActiveModal]   = useState(null) // { type, wo }

  const canActivate = ['ppeLead', 'ppeManager', 'ppeAdmin', 'GM/MD'].includes(currentRole)

  // Approved RFQs (either 'Approved' or 'Approved to Process') that don't yet have a WO
  const existingRfqIds = useMemo(() => new Set(workOrders.map(w => w.rfqId)), [workOrders])

  const pendingWOs = useMemo(() =>
    rfqs.filter(r =>
      ['Approved', 'Approved to Process'].includes(r.status) &&
      !existingRfqIds.has(r.id)
    ),
  [rfqs, existingRfqIds])

  const displayed = useMemo(() => {
    let list = [...workOrders]
    if (filterStatus !== 'All') list = list.filter(w => w.status === filterStatus)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(w =>
        w.requestWorkNo.toLowerCase().includes(q) ||
        w.client.toLowerCase().includes(q)
      )
    }
    return list.sort((a, b) => (b.planStart || '').localeCompare(a.planStart || ''))
  }, [workOrders, search, filterStatus])

  // Stats
  const stats = {
    total:     workOrders.length,
    ongoing:   workOrders.filter(w => w.status === 'Ongoing').length,
    completed: workOrders.filter(w => w.status === 'Completed').length,
    pending:   pendingWOs.length,
  }

  const getLatestDr = (woId) => {
    const drs = dailyReports.filter(d => d.workOrderId === woId)
      .sort((a, b) => b.reportDate.localeCompare(a.reportDate))
    return drs[0] || null
  }

  const openModal = (type, wo) => setActiveModal({ type, wo })
  const closeModal = () => setActiveModal(null)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Work Execution</h2>
          <p className="text-xs text-slate-500 mt-0.5">Modal C — Work list, scheduling, and progress tracking</p>
        </div>
      </div>

      {/* Approved RFQs awaiting WO creation — visible to activators only */}
      {pendingWOs.length > 0 && canActivate && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={16} className="text-yellow-600" />
            <p className="text-sm font-semibold text-yellow-800">
              {pendingWOs.length} Approved RFQ{pendingWOs.length > 1 ? 's' : ''} ready to activate for Work Execution
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {pendingWOs.map(rfq => (
              <button key={rfq.id}
                onClick={() => {
                  const newWo = {
                    rfqId:          rfq.id,
                    requestWorkNo:  rfq.requestWorkNo,
                    client:         rfq.client,
                    planStart:      '',
                    planFinish:     '',
                    status:         'Pending Schedule',
                    assignedTeam:   rfq.assignedEngineers || [],
                    totalPlannedMH: rfq.totalPlannedMH || 0,
                    mheRows:        rfq.mheRows        || [],
                    wbsItems:       rfq.wbsItems       || [],
                    mheNo:          rfq.mheNo          || '',
                    totalCost:      rfq.totalCost      || 0,
                  }
                  addWorkOrder(newWo)
                }}
                className="flex items-center gap-2 px-3 py-1.5 bg-yellow-600 hover:bg-yellow-700 text-white text-xs font-semibold rounded-lg transition-colors">
                <Plus size={13} /> Activate WO: {rfq.requestWorkNo}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total Work Orders', value: stats.total,     cls: 'text-slate-800' },
          { label: 'Ongoing',           value: stats.ongoing,   cls: 'text-blue-600' },
          { label: 'Completed',         value: stats.completed, cls: 'text-green-600' },
          { label: 'Pending Schedule',  value: stats.pending,   cls: 'text-yellow-600' },
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
          <input type="text" placeholder="Search work no. or client…"
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200" />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="px-3 py-2 text-sm border border-slate-300 rounded-lg outline-none focus:border-blue-500 bg-white">
          {['All', 'Pending Schedule', 'Ongoing', 'Completed'].map(s => <option key={s}>{s}</option>)}
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
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Plan Start</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Plan Finish</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Planned MH</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Progress</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Balance MH</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayed.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-slate-400 text-sm">
                    No work orders found. Approve an RFQ first to generate work orders.
                  </td>
                </tr>
              ) : displayed.map(wo => {
                const latestDr = getLatestDr(wo.id)
                const cumProgress = latestDr?.cumulativeProgress ?? 0
                const cumSpentMH  = latestDr?.cumulativeSpentMH  ?? 0
                const balanceMH   = wo.totalPlannedMH - cumSpentMH

                return (
                  <tr key={wo.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-semibold text-[#0f2035]">{wo.requestWorkNo}</td>
                    <td className="px-4 py-3 text-slate-700 max-w-[140px] truncate">{wo.client}</td>
                    <td className="px-4 py-3 text-slate-600 text-xs">
                      {wo.planStart ? <span className="flex items-center gap-1"><CalendarDays size={12} />{wo.planStart}</span> : <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-xs">
                      {wo.planFinish ? <span className="flex items-center gap-1"><CalendarDays size={12} />{wo.planFinish}</span> : <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-700">{wo.totalPlannedMH} MH</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2 min-w-[90px]">
                        <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(cumProgress, 100)}%` }} />
                        </div>
                        <span className="text-xs tabular-nums text-slate-600 w-9 text-right">{cumProgress}%</span>
                      </div>
                    </td>
                    <td className={`px-4 py-3 text-right font-semibold tabular-nums text-sm ${balanceMH < 0 ? 'text-red-600' : balanceMH < wo.totalPlannedMH * 0.1 ? 'text-yellow-600' : 'text-green-700'}`}>
                      {balanceMH}
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={wo.status} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        {canActivate && wo.status === 'Pending Schedule' && (
                          <button onClick={() => openModal('schedule', wo)}
                            className="px-3 py-1.5 text-xs font-semibold text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors flex items-center gap-1">
                            <Rocket size={12} /> Start Work
                          </button>
                        )}
                        {canActivate && wo.status === 'Ongoing' && (
                          <button onClick={() => openModal('schedule', wo)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" title="Edit Schedule">
                            <Pencil size={15} />
                          </button>
                        )}
                        {canActivate && wo.status === 'Ongoing' && (
                          <button onClick={() => updateWorkOrder(wo.id, { status: 'Completed' })}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-green-600 hover:bg-green-50 transition-colors" title="Mark Complete">
                            <CheckCircle size={15} />
                          </button>
                        )}
                        <button onClick={() => openModal('progress', wo)}
                          title="Work Progress Report"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 transition-colors">
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

      {/* Schedule / Start Work Modal */}
      <Modal isOpen={activeModal?.type === 'schedule'} onClose={closeModal}
        title={`Start Work — ${activeModal?.wo?.requestWorkNo || ''}`} size="sm">
        {activeModal?.wo && (
          <ScheduleModal wo={activeModal.wo} onClose={closeModal}
            onSave={(data) => { updateWorkOrder(activeModal.wo.id, data); closeModal() }} />
        )}
      </Modal>

      {/* Work Progress Report Modal */}
      <Modal isOpen={activeModal?.type === 'progress'} onClose={closeModal}
        title={`Work Progress Report — ${activeModal?.wo?.requestWorkNo || ''}`} size="xl">
        {activeModal?.wo && (
          <WorkProgressModal wo={activeModal.wo} onClose={closeModal} />
        )}
      </Modal>

      {/* Detail Modal */}
      <Modal isOpen={activeModal?.type === 'detail'} onClose={closeModal}
        title={`Work Order Details — ${activeModal?.wo?.requestWorkNo || ''}`} size="lg">
        {activeModal?.wo && (
          <WODetailModal
            wo={activeModal.wo}
            dailyReports={dailyReports}
            teamRates={teamRates}
            onClose={closeModal}
          />
        )}
      </Modal>
    </div>
  )
}
