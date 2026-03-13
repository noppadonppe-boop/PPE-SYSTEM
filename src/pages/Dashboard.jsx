import React, { useMemo, useEffect, useState } from 'react'
import {
  BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import {
  BarChart3, Clock, CheckCircle, AlertTriangle,
  TrendingUp, FileText, Users, Layers,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { collection, onSnapshot } from 'firebase/firestore'
import { db as authDb } from '../firebase/firebaseAuth'
import StatusBadge from '../components/ui/StatusBadge'
import UserAvatar from '../components/ui/UserAvatar'

// ─── Color tokens ────────────────────────────────────────────────────────────
const NAVY   = '#0f2035'
const BLUE   = '#3b82f6'
const GREEN  = '#22c55e'
const YELLOW = '#eab308'
const RED    = '#ef4444'
const PURPLE = '#a855f7'
const SLATE  = '#94a3b8'

// ─── Custom tooltip ───────────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label, suffix = '' }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg px-3 py-2 text-xs">
      {label && <p className="font-semibold text-slate-600 mb-1">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="font-medium">
          {p.name}: <span className="text-slate-800">{p.value}{suffix}</span>
        </p>
      ))}
    </div>
  )
}

// ─── Donut label ──────────────────────────────────────────────────────────────
function DonutLabel({ cx, cy, total }) {
  return (
    <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central">
      <tspan x={cx} dy="-6" fontSize={22} fontWeight={700} fill={NAVY}>{total}</tspan>
      <tspan x={cx} dy={20} fontSize={10} fill={SLATE}>Total</tspan>
    </text>
  )
}

// ─── Executive Dashboard ──────────────────────────────────────────────────────
export default function Dashboard() {
  const { rfqs, workOrders, dailyReports, teamRates, currentRole, userRoles } = useApp()

  // ── Load approved ppeTeam users from auth database ───────────────────────────
  const [ppeTeamUsers, setPpeTeamUsers] = useState([])

  useEffect(() => {
    const ref = collection(authDb, 'PPE System', 'root', 'users')
    const unsub = onSnapshot(ref, snap => {
      const users = snap.docs.map(d => d.data())
      setPpeTeamUsers(
        users
          .filter(u => u.status === 'approved')
          .filter(u => Array.isArray(u.role) && u.role.includes('ppeTeam'))
          .map(u => ({
            id: u.uid,
            name: `${u.firstName} ${u.lastName}`.trim(),
            position: u.position || '',
            photoURL: u.photoURL || '',
            assignedProjects: Array.isArray(u.assignedProjects) ? u.assignedProjects : [],
          }))
      )
    })
    return unsub
  }, [])

  // ── KPI derivations ────────────────────────────────────────────────────────
  const activeProjects   = workOrders.filter(w => w.status === 'Ongoing').length
  const pendingApprovals = rfqs.filter(r =>
    ['Pending Lead', 'Pending Manager', 'Pending Approval'].includes(r.status)
  ).length
  const totalPlannedMH   = workOrders.reduce((s, w) => s + (w.totalPlannedMH || 0), 0)
  const totalSpentMH     = dailyReports.filter(d => !d.isLeaveAbsent)
                            .reduce((s, d) => s + (d.spentMHToday || 0), 0)
  const mhUtilPct        = totalPlannedMH > 0 ? ((totalSpentMH / totalPlannedMH) * 100).toFixed(1) : 0
  const totalCostEstimate= rfqs.reduce((s, r) => s + (r.totalCost || 0), 0)

  // ── Chart 1: RFQ Pipeline (stacked bar by status) ──────────────────────────
  const rfqPipelineData = useMemo(() => {
    const groups = {}
    rfqs.forEach(r => {
      const month = r.submittedAt?.slice(0, 7) || 'Unknown'
      if (!groups[month]) groups[month] = { month, 'Pending': 0, 'Approved': 0, 'Cancelled': 0 }
      if (['Pending Lead','Pending Manager','Pending Approval'].includes(r.status)) groups[month]['Pending']++
      else if (r.status === 'Approved') groups[month]['Approved']++
      else if (['Cancelled','Rejected','Lost'].includes(r.status)) groups[month]['Cancelled']++
    })
    return Object.values(groups).sort((a, b) => a.month.localeCompare(b.month))
  }, [rfqs])

  // ── Chart 2: MH Utilisation per Work Order ────────────────────────────────
  const mhBarData = useMemo(() =>
    workOrders.map(wo => {
      const woDrs = dailyReports.filter(d => d.workOrderId === wo.id)
        .sort((a, b) => b.reportDate.localeCompare(a.reportDate))
      const spent = woDrs[0]?.cumulativeSpentMH ?? 0
      return {
        name:    wo.requestWorkNo.replace('RWN-', ''),
        Planned: wo.totalPlannedMH,
        Spent:   spent,
        Balance: wo.totalPlannedMH - spent,
      }
    }),
  [workOrders, dailyReports])

  // ── Chart 3: RFQ Status Donut ─────────────────────────────────────────────
  const statusCounts = useMemo(() => {
    const c = { 'In Progress': 0, 'Approved': 0, 'Cancelled': 0 }
    rfqs.forEach(r => {
      if (['Pending Lead','Pending Manager','Pending Approval'].includes(r.status)) c['In Progress']++
      else if (r.status === 'Approved') c['Approved']++
      else if (['Cancelled','Rejected','Lost'].includes(r.status)) c['Cancelled']++
    })
    return Object.entries(c).map(([name, value]) => ({ name, value })).filter(d => d.value > 0)
  }, [rfqs])

  const DONUT_COLORS = { 'In Progress': YELLOW, 'Approved': GREEN, 'Cancelled': RED }

  // ── Chart 4: Daily MH trend (last 10 reports across all WOs) ─────────────
  const mhTrendData = useMemo(() => {
    return [...dailyReports]
      .filter(d => !d.isLeaveAbsent)
      .sort((a, b) => a.reportDate.localeCompare(b.reportDate))
      .slice(-10)
      .map(d => ({
        date:  d.reportDate.slice(5),
        MH:    d.spentMHToday,
        Cumul: d.cumulativeSpentMH,
      }))
  }, [dailyReports])

  // ── Team workload: count active assignments ───────────────────────────────
  const teamWorkload = useMemo(() => {
    return ppeTeamUsers.map(u => {
      const activeCount = workOrders.filter(wo =>
        wo.status === 'Ongoing' && Array.isArray(wo.assignedTeam) && wo.assignedTeam.includes(u.id)
      ).length
      return {
        id: u.id,
        name: u.name,
        shortName: u.name.split(' ')[0],
        projects: activeCount,
        position: u.position,
        photoURL: u.photoURL,
      }
    }).filter(t => t.projects > 0)
  }, [ppeTeamUsers, workOrders])

  const formatIDR = (v) =>
    new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', notation: 'compact', maximumFractionDigits: 1 }).format(v)

  const kpis = [
    { label: 'Active Projects',   value: activeProjects,        sub: `${workOrders.length} total WOs`,      icon: Layers,    bg: 'bg-blue-50',    fg: 'text-blue-600',   bar: 'bg-blue-500' },
    { label: 'Pending Approvals', value: pendingApprovals,       sub: `${rfqs.length} total RFQs`,           icon: AlertTriangle, bg: 'bg-yellow-50', fg: 'text-yellow-600', bar: 'bg-yellow-400' },
    { label: 'MH Utilisation',    value: `${mhUtilPct}%`,        sub: `${totalSpentMH} of ${totalPlannedMH} MH`, icon: Clock, bg: 'bg-slate-50',  fg: 'text-slate-600',  bar: 'bg-slate-500' },
    { label: 'Cost Estimates',    value: formatIDR(totalCostEstimate), sub: `across ${rfqs.filter(r=>r.totalCost>0).length} RFQs`, icon: TrendingUp, bg: 'bg-green-50', fg: 'text-green-600', bar: 'bg-green-500' },
  ]

  return (
    <div className="space-y-5">
      {/* Welcome strip */}
      <div className="bg-[#0f2035] rounded-xl px-5 py-4 flex items-center justify-between">
        <div>
          <h2 className="text-white font-bold text-base">PPE Engineering Management ERP</h2>
          <p className="text-slate-300 text-xs mt-0.5">Executive Dashboard — Live project intelligence</p>
        </div>
        <div className="text-right">
          <p className="text-slate-300 text-xs">Roles</p>
          <p className="text-white font-semibold text-sm">{(userRoles ?? [currentRole]).join(', ')}</p>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map(kpi => {
          const Icon = kpi.icon
          return (
            <div key={kpi.label} className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex items-start gap-3 overflow-hidden relative">
              <div className={`w-10 h-10 rounded-xl ${kpi.bg} flex items-center justify-center flex-shrink-0`}>
                <Icon size={18} className={kpi.fg} />
              </div>
              <div className="min-w-0">
                <p className="text-xl font-bold text-slate-800 leading-tight">{kpi.value}</p>
                <p className="text-xs font-semibold text-slate-600">{kpi.label}</p>
                <p className="text-[10px] text-slate-400 mt-0.5 truncate">{kpi.sub}</p>
              </div>
              <div className={`absolute bottom-0 left-0 right-0 h-0.5 ${kpi.bar}`} />
            </div>
          )
        })}
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-3 gap-4">
        {/* RFQ Pipeline bar */}
        <div className="col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">RFQ Pipeline by Month</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={rfqPipelineData} margin={{ top: 4, right: 8, bottom: 0, left: -20 }} barSize={20}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} allowDecimals={false} />
              <Tooltip content={<ChartTooltip />} />
              <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="Pending"   fill={YELLOW} radius={[3,3,0,0]} />
              <Bar dataKey="Approved"  fill={GREEN}  radius={[3,3,0,0]} />
              <Bar dataKey="Cancelled" fill={RED}    radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Status donut */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">RFQ Status Distribution</h3>
          {statusCounts.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie
                    data={statusCounts}
                    cx="50%" cy="50%"
                    innerRadius={48} outerRadius={72}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {statusCounts.map((entry) => (
                      <Cell key={entry.name} fill={DONUT_COLORS[entry.name] || SLATE} />
                    ))}
                    <DonutLabel cx="50%" cy="50%" total={rfqs.length} />
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap justify-center gap-3 mt-2">
                {statusCounts.map(s => (
                  <div key={s.name} className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: DONUT_COLORS[s.name] || SLATE }} />
                    <span className="text-[10px] text-slate-600 font-medium">{s.name} ({s.value})</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-40 text-slate-400 text-xs">No RFQ data</div>
          )}
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-2 gap-4">
        {/* MH utilisation bar chart per WO */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Manhour Utilisation per Work Order</h3>
          {mhBarData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={mhBarData} margin={{ top: 4, right: 8, bottom: 0, left: -20 }} barSize={18}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <Tooltip content={<ChartTooltip />} />
                <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="Planned" fill={SLATE}  radius={[3,3,0,0]} />
                <Bar dataKey="Spent"   fill={NAVY}   radius={[3,3,0,0]} />
                <Bar dataKey="Balance" fill={GREEN}  radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-40 text-slate-400 text-xs">No work order data</div>
          )}
        </div>

        {/* Daily MH trend */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Daily Manhour Trend (last 10 reports)</h3>
          {mhTrendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={mhTrendData} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="mhGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={NAVY} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={NAVY} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <Tooltip content={<ChartTooltip />} />
                <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="MH"    stroke={NAVY}  strokeWidth={2} fill="url(#mhGrad)" dot={{ r: 3, fill: NAVY }} />
                <Area type="monotone" dataKey="Cumul" stroke={BLUE}  strokeWidth={1.5} fill="none" strokeDasharray="4 3" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-40 text-slate-400 text-xs">No daily report data</div>
          )}
        </div>
      </div>

      {/* Bottom row: Recent RFQ + Team workload */}
      <div className="grid grid-cols-3 gap-4">
        {/* Recent RFQ table */}
        <div className="col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Recent RFQ Activity</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-400 uppercase tracking-wider border-b border-slate-100">
                  <th className="pb-2 pr-4 font-semibold">Work No.</th>
                  <th className="pb-2 pr-4 font-semibold">Client</th>
                  <th className="pb-2 pr-4 font-semibold">Urgency</th>
                  <th className="pb-2 pr-4 font-semibold">Planned MH</th>
                  <th className="pb-2 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {[...rfqs].sort((a,b) => b.submittedAt?.localeCompare(a.submittedAt)).slice(0, 5).map(rfq => (
                  <tr key={rfq.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 pr-4 font-semibold text-[#0f2035]">{rfq.requestWorkNo}</td>
                    <td className="py-2.5 pr-4 text-slate-600 text-xs max-w-[120px] truncate">{rfq.client}</td>
                    <td className="py-2.5 pr-4">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        rfq.urgency === 'Urgent' ? 'bg-red-100 text-red-700'
                          : rfq.urgency === 'High' ? 'bg-orange-100 text-orange-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}>{rfq.urgency}</span>
                    </td>
                    <td className="py-2.5 pr-4 text-slate-600 text-xs tabular-nums">
                      {rfq.totalPlannedMH > 0 ? `${rfq.totalPlannedMH} MH` : '—'}
                    </td>
                    <td className="py-2.5"><StatusBadge status={rfq.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Team workload */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
            <Users size={15} /> Team Workload
          </h3>
          {teamWorkload.length > 0 ? (
            <div className="space-y-3">
              {teamWorkload.map(t => (
                <div key={t.id} className="flex items-center gap-3">
                  <UserAvatar
                    photoURL={t.photoURL}
                    name={t.name}
                    size={28}
                    textSize="text-[10px]"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-700 truncate">{t.shortName}</p>
                    <p className="text-[10px] text-slate-400">{t.position}</p>
                  </div>
                  <span className="flex-shrink-0 text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                    {t.projects} active
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-24 text-slate-400 text-xs">
              No active team assignments
            </div>
          )}
          <div className="mt-4 pt-4 border-t border-slate-100">
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">Total engineers</span>
              <span className="font-semibold text-slate-700">{ppeTeamUsers.length}</span>
            </div>
            <div className="flex justify-between text-xs mt-1">
              <span className="text-slate-500">Currently active</span>
              <span className="font-semibold text-blue-600">{teamWorkload.length}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
