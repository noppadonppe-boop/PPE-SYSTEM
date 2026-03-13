import React, { useState, useMemo } from 'react'
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { CalendarDays, TrendingUp, Clock, AlertTriangle, Coffee, ChevronDown, ChevronUp } from 'lucide-react'
import { useApp } from '../context/AppContext'
import StatusBadge from '../components/ui/StatusBadge'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const NAVY = '#0f2035'
const BLUE = '#3b82f6'
const GREEN = '#22c55e'
const ORANGE = '#f97316'
const RED = '#ef4444'

// ─── Per-WO Summary Card ──────────────────────────────────────────────────────

function WOSummaryCard({ wo, reports, teamRates }) {
  const [expanded, setExpanded] = useState(false)

  const woDrs = useMemo(() =>
    [...reports]
      .filter(d => d.workOrderId === wo.id)
      .sort((a, b) => a.reportDate.localeCompare(b.reportDate)),
    [reports, wo.id]
  )

  // Total spent MH across ALL team members for this WO
  const cumSpentMH = woDrs
    .filter(d => !d.isLeaveAbsent)
    .reduce((s, d) => s + (d.spentMHToday || 0), 0)

  // Overall progress = average of latest cumulativeProgress per reporter
  const latestPerUser = new Map()
  woDrs.forEach(d => {
    if (!latestPerUser.has(d.submittedBy) || d.reportDate > latestPerUser.get(d.submittedBy).reportDate) {
      latestPerUser.set(d.submittedBy, d)
    }
  })
  const userLatest = Array.from(latestPerUser.values())
  const cumProgress = userLatest.length > 0
    ? Math.round(userLatest.reduce((s, d) => s + (d.cumulativeProgress || 0), 0) / userLatest.length)
    : 0

  const balanceMH      = wo.totalPlannedMH - cumSpentMH
  const efficiency     = cumSpentMH > 0 ? ((cumProgress / 100) * wo.totalPlannedMH / cumSpentMH * 100).toFixed(1) : '—'
  const leaveCount     = woDrs.filter(d => d.isLeaveAbsent).length

  // Build chart series: cumulative progress & balance MH over dates
  const chartData = woDrs.map(d => ({
    date:     d.reportDate.slice(5), // MM-DD
    progress: d.cumulativeProgress,
    balance:  d.balanceMH,
    spent:    d.spentMHToday,
  }))

  const assignedMembers = (wo.assignedTeam || [])
    .map(id => teamRates.find(t => t.id === id)).filter(Boolean)

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Card header */}
      <div className="px-5 py-4 flex items-start justify-between gap-4 border-b border-slate-100">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h3 className="font-bold text-[#0f2035] text-base">{wo.requestWorkNo}</h3>
            <StatusBadge status={wo.status} />
            {balanceMH < 0 && (
              <span className="flex items-center gap-1 text-[10px] font-semibold text-red-600 bg-red-100 px-2 py-0.5 rounded-full">
                <AlertTriangle size={10} /> Over Budget
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500 mt-0.5">{wo.client}</p>
        </div>
        <button onClick={() => setExpanded(e => !e)}
          className="flex-shrink-0 p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors">
          {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-5 divide-x divide-slate-100 border-b border-slate-100">
        {[
          { label: 'Planned MH',   value: `${wo.totalPlannedMH}`,         cls: 'text-slate-800' },
          { label: 'Spent MH',     value: `${cumSpentMH}`,                cls: 'text-slate-700' },
          { label: 'Balance MH',   value: `${balanceMH}`,                 cls: balanceMH < 0 ? 'text-red-600' : 'text-green-600' },
          { label: 'Progress',     value: `${cumProgress}%`,              cls: 'text-blue-600' },
          { label: 'Efficiency',   value: efficiency === '—' ? '—' : `${efficiency}%`, cls: 'text-slate-700' },
        ].map(k => (
          <div key={k.label} className="px-4 py-3 text-center">
            <p className={`text-lg font-bold ${k.cls}`}>{k.value}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div className="px-5 py-3 border-b border-slate-100">
        <div className="flex justify-between text-xs text-slate-500 mb-1.5">
          <span>Overall Progress</span>
          <span className="font-semibold">{cumProgress}%</span>
        </div>
        <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${cumProgress >= 100 ? 'bg-green-500' : 'bg-blue-500'}`}
            style={{ width: `${Math.min(cumProgress, 100)}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-slate-400 mt-1">
          {wo.planStart && <span><CalendarDays size={9} className="inline mr-0.5" />{wo.planStart}</span>}
          {wo.planFinish && <span><CalendarDays size={9} className="inline mr-0.5" />{wo.planFinish}</span>}
        </div>
      </div>

      {/* Expand: charts + detail table */}
      {expanded && (
        <div className="px-5 py-5 space-y-6">
          {/* Assigned team */}
          <div className="flex flex-wrap gap-2">
            {assignedMembers.map(m => (
              <div key={m.id} className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
                <div className="w-6 h-6 rounded-full bg-[#0f2035] text-white flex items-center justify-center text-[9px] font-bold">
                  {m.name.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase()}
                </div>
                <span className="text-xs font-medium text-slate-700">{m.name}</span>
                <span className="text-[10px] text-slate-400">{m.position}</span>
              </div>
            ))}
            {leaveCount > 0 && (
              <span className="flex items-center gap-1 text-xs text-orange-600 bg-orange-50 border border-orange-200 px-2.5 py-1.5 rounded-lg">
                <Coffee size={12} /> {leaveCount} leave day{leaveCount > 1 ? 's' : ''}
              </span>
            )}
          </div>

          {/* Charts: only if we have data */}
          {chartData.length > 0 && (
            <div className="grid grid-cols-2 gap-6">
              {/* Progress over time */}
              <div>
                <p className="text-xs font-semibold text-slate-600 mb-3">Cumulative Progress (%)</p>
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
                    <defs>
                      <linearGradient id={`progressGrad-${wo.id}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={BLUE} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={BLUE} stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                    <Tooltip
                      contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e2e8f0' }}
                      formatter={v => [`${v}%`, 'Progress']}
                    />
                    <Area type="monotone" dataKey="progress" stroke={BLUE} strokeWidth={2}
                      fill={`url(#progressGrad-${wo.id})`} dot={{ r: 3, fill: BLUE }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Balance MH over time */}
              <div>
                <p className="text-xs font-semibold text-slate-600 mb-3">Balance Manhours</p>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                    <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
                    <Tooltip
                      contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e2e8f0' }}
                      formatter={v => [v, 'Balance MH']}
                    />
                    <Line type="monotone" dataKey="balance" stroke={GREEN} strokeWidth={2}
                      dot={({ cx, cy, payload }) => (
                        <circle key={`dot-${payload.date}`} cx={cx} cy={cy} r={3}
                          fill={payload.balance < 0 ? RED : GREEN} />
                      )}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Daily report table */}
          <div>
            <p className="text-xs font-semibold text-slate-600 mb-2">Daily Report Log</p>
            <div className="rounded-lg border border-slate-200 overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-2 text-left text-slate-500 font-semibold">Date</th>
                    <th className="px-3 py-2 text-right text-slate-500 font-semibold">Today %</th>
                    <th className="px-3 py-2 text-right text-slate-500 font-semibold">Cumul %</th>
                    <th className="px-3 py-2 text-right text-slate-500 font-semibold">Spent MH</th>
                    <th className="px-3 py-2 text-right text-slate-500 font-semibold">Cumul MH</th>
                    <th className="px-3 py-2 text-right text-slate-500 font-semibold">Balance MH</th>
                    <th className="px-3 py-2 text-left text-slate-500 font-semibold">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[...woDrs].reverse().map(dr => (
                    <tr key={dr.id} className={`hover:bg-slate-50 ${dr.isLeaveAbsent ? 'bg-orange-50/50' : ''}`}>
                      <td className="px-3 py-2 text-slate-700">{dr.reportDate}</td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {dr.isLeaveAbsent ? <span className="text-orange-500">Leave</span> : `${dr.progressToday}%`}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums font-medium text-blue-700">{dr.cumulativeProgress}%</td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {dr.isLeaveAbsent ? '—' : dr.spentMHToday}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{dr.cumulativeSpentMH}</td>
                      <td className={`px-3 py-2 text-right font-bold tabular-nums ${dr.balanceMH < 0 ? 'text-red-600' : 'text-green-700'}`}>
                        {dr.balanceMH}
                      </td>
                      <td className="px-3 py-2 text-slate-500 max-w-[200px] truncate">{dr.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main Report Summary Page (Modal F) ──────────────────────────────────────

export default function ReportSummary() {
  const { workOrders, dailyReports, teamRates } = useApp()

  const [filterStatus, setFilterStatus] = useState('All')

  const filteredWOs = useMemo(() => {
    let list = [...workOrders]
    if (filterStatus !== 'All') list = list.filter(w => w.status === filterStatus)
    return list.sort((a, b) => (b.planStart || '').localeCompare(a.planStart || ''))
  }, [workOrders, filterStatus])

  // Aggregate stats
  const totalPlannedMH   = workOrders.reduce((s, w) => s + w.totalPlannedMH, 0)
  const totalSpentMH     = dailyReports.filter(d => !d.isLeaveAbsent)
                            .reduce((s, d) => s + d.spentMHToday, 0)
  const totalBalanceMH   = totalPlannedMH - totalSpentMH
  const avgProgress      = workOrders.length > 0
    ? (() => {
        const vals = workOrders.map(wo => {
          const drs = dailyReports.filter(d => d.workOrderId === wo.id)
          if (drs.length === 0) return 0

          const latestPerUser = new Map()
          drs.forEach(r => {
            if (!latestPerUser.has(r.submittedBy) || r.reportDate > latestPerUser.get(r.submittedBy).reportDate) {
              latestPerUser.set(r.submittedBy, r)
            }
          })
          const userLatest = Array.from(latestPerUser.values())
          if (userLatest.length === 0) return 0
          return userLatest.reduce((s, r) => s + (r.cumulativeProgress || 0), 0) / userLatest.length
        })
        return (vals.reduce((s, v) => s + v, 0) / vals.length).toFixed(1)
      })()
    : 0

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Report Summary</h2>
          <p className="text-xs text-slate-500 mt-0.5">Modal F — Per-project progress, MH burn-down, and daily log</p>
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="px-3 py-2 text-sm border border-slate-300 rounded-lg outline-none focus:border-blue-500 bg-white">
          {['All', 'Ongoing', 'Completed', 'Pending Schedule'].map(s => <option key={s}>{s}</option>)}
        </select>
      </div>

      {/* Aggregate KPIs */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total Planned MH',   value: totalPlannedMH,            cls: 'text-slate-800' },
          { label: 'Total Spent MH',     value: totalSpentMH.toFixed(1),   cls: 'text-slate-700' },
          { label: 'Total Balance MH',   value: totalBalanceMH.toFixed(1), cls: totalBalanceMH < 0 ? 'text-red-600' : 'text-green-600' },
          { label: 'Avg Progress',       value: `${avgProgress}%`,         cls: 'text-blue-600' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-slate-200 shadow-sm px-4 py-3">
            <p className={`text-2xl font-bold ${s.cls}`}>{s.value}</p>
            <p className="text-xs text-slate-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Per-WO Cards */}
      {filteredWOs.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-4 py-12 text-center text-slate-400 text-sm">
          No work orders match the selected filter.
        </div>
      ) : (
        <div className="space-y-4">
          {filteredWOs.map(wo => (
            <WOSummaryCard key={wo.id} wo={wo} reports={dailyReports} teamRates={teamRates} />
          ))}
        </div>
      )}
    </div>
  )
}
