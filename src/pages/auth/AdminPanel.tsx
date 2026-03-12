import React, { useEffect, useState } from 'react'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '../../firebase/firebaseAuth'
import { updateUserStatus, updateUserRoles, updateUserPosition } from '../../firebase/authService'
import { useAuth } from '../../context/AuthContext'
import { USER_ROLES, type UserProfile, type UserRole } from '../../types/auth'
import {
  Shield, CheckCircle, XCircle, Clock, Users,
  ChevronDown, Search, RefreshCw,
} from 'lucide-react'

const APP_NAME = 'PPE System'
const ROOT_DOC = 'root'

const POSITIONS = [
  'Manager',
  'Leader',
  'GM/MD',
  'Senior Architect',
  'Architect',
  'Senior Civil Engineer',
  'Civil Engineer',
  'Draft Man',
  'Document Control',
]

const ROLE_LABELS: Record<string, string> = {
  'Requestor':   'Requestor',
  'ppeLead':     'ppeLead',
  'ppeManager':  'ppeManager',
  'ppeTeam':     'ppeTeam',
  'ppeAdmin':    'ppeAdmin',
  'MasterAdmin': 'MasterAdmin',
  'GM/MD':       'GM/MD',
}

const STATUS_CONFIG = {
  approved: { label: 'อนุมัติแล้ว', cls: 'bg-green-100 text-green-700' },
  pending:  { label: 'รอการอนุมัติ', cls: 'bg-yellow-100 text-yellow-700' },
  rejected: { label: 'ถูกปฏิเสธ',   cls: 'bg-red-100 text-red-700' },
}

export default function AdminPanel() {
  const { userProfile: me } = useAuth()
  const [users,   setUsers]   = useState<UserProfile[]>([])
  const [search,  setSearch]  = useState('')
  const [filter,  setFilter]  = useState<'all' | 'pending' | 'approved' | 'rejected'>('all')
  const [busy,    setBusy]    = useState<Record<string, boolean>>({})

  // Real-time user list
  useEffect(() => {
    const ref = collection(db, APP_NAME, ROOT_DOC, 'users')
    return onSnapshot(ref, snap => {
      setUsers(snap.docs.map(d => d.data() as UserProfile))
    })
  }, [])

  const displayed = users
    .filter(u => filter === 'all' || u.status === filter)
    .filter(u => {
      const q = search.toLowerCase()
      return (
        u.email.toLowerCase().includes(q) ||
        `${u.firstName} ${u.lastName}`.toLowerCase().includes(q) ||
        u.position.toLowerCase().includes(q)
      )
    })
    .sort((a, b) => {
      // Pending first
      if (a.status === 'pending' && b.status !== 'pending') return -1
      if (b.status === 'pending' && a.status !== 'pending') return 1
      return a.email.localeCompare(b.email)
    })

  const stats = {
    total:    users.length,
    pending:  users.filter(u => u.status === 'pending').length,
    approved: users.filter(u => u.status === 'approved').length,
    rejected: users.filter(u => u.status === 'rejected').length,
  }

  async function handleStatus(uid: string, status: 'approved' | 'rejected') {
    setBusy(p => ({ ...p, [uid]: true }))
    try { await updateUserStatus(uid, status) }
    finally { setBusy(p => ({ ...p, [uid]: false })) }
  }

  async function handleRoleToggle(user: UserProfile, role: UserRole) {
    const current = user.role ?? []
    const next = current.includes(role)
      ? current.filter(r => r !== role)
      : [...current, role]
    setBusy(p => ({ ...p, [`role-${user.uid}`]: true }))
    try { await updateUserRoles(user.uid, next) }
    finally { setBusy(p => ({ ...p, [`role-${user.uid}`]: false })) }
  }

  async function handlePositionChange(uid: string, position: string) {
    setBusy(p => ({ ...p, [`pos-${uid}`]: true }))
    try { await updateUserPosition(uid, position) }
    finally { setBusy(p => ({ ...p, [`pos-${uid}`]: false })) }
  }

  return (
    <div className="space-y-5">

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'ทั้งหมด',       value: stats.total,    icon: Users,       cls: 'bg-slate-50  text-slate-600' },
          { label: 'รอการอนุมัติ',   value: stats.pending,  icon: Clock,       cls: 'bg-yellow-50 text-yellow-600' },
          { label: 'อนุมัติแล้ว',   value: stats.approved, icon: CheckCircle, cls: 'bg-green-50  text-green-600' },
          { label: 'ถูกปฏิเสธ',     value: stats.rejected, icon: XCircle,     cls: 'bg-red-50    text-red-600' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${s.cls}`}>
              <s.icon size={18} />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{s.value}</p>
              <p className="text-xs text-slate-500 font-sarabun">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filter + Search */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Shield size={16} className="text-[#0f2035]" />
            <span className="font-semibold text-sm text-slate-700 font-sarabun">จัดการผู้ใช้งาน</span>
          </div>
          <div className="flex items-center gap-2">
            {/* Status filter tabs */}
            {(['all', 'pending', 'approved', 'rejected'] as const).map(f => (
              <button key={f}
                onClick={() => setFilter(f)}
                className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-colors font-sarabun ${
                  filter === f
                    ? 'bg-[#0f2035] text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {f === 'all' ? 'ทั้งหมด' : STATUS_CONFIG[f].label}
                {f !== 'all' && <span className="ml-1 opacity-70">({stats[f]})</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Search */}
        <div className="px-4 py-3 border-b border-slate-100">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="ค้นหาชื่อ, อีเมล, ตำแหน่ง..."
              className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 font-sarabun"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {displayed.length === 0 ? (
            <div className="px-4 py-12 text-center text-slate-400 text-sm font-sarabun">
              ไม่พบข้อมูลผู้ใช้
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {['ผู้ใช้งาน', 'ตำแหน่ง', 'สถานะ', 'บทบาท', 'การดำเนินการ'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider font-sarabun">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayed.map(u => (
                  <UserRow
                    key={u.uid}
                    user={u}
                    isMe={me?.uid === u.uid}
                    busy={!!busy[u.uid]}
                    roleBusy={!!busy[`role-${u.uid}`]}
                    posBusy={!!busy[`pos-${u.uid}`]}
                    onApprove={() => handleStatus(u.uid, 'approved')}
                    onReject={() => handleStatus(u.uid, 'rejected')}
                    onRoleToggle={(role) => handleRoleToggle(u, role)}
                    onPositionChange={(pos) => handlePositionChange(u.uid, pos)}
                  />
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── User row sub-component ───────────────────────────────────────────────────
function UserRow({
  user, isMe, busy, roleBusy, posBusy, onApprove, onReject, onRoleToggle, onPositionChange,
}: {
  user: UserProfile
  isMe: boolean
  busy: boolean
  roleBusy: boolean
  posBusy: boolean
  onApprove: () => void
  onReject: () => void
  onRoleToggle: (role: UserRole) => void
  onPositionChange: (pos: string) => void
}) {
  const [roleOpen, setRoleOpen] = useState(false)
  const sc = STATUS_CONFIG[user.status]

  return (
    <tr className={`hover:bg-slate-50 transition-colors ${user.status === 'pending' ? 'bg-yellow-50/40' : ''}`}>
      {/* User info */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#0f2035] text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
            {user.firstName?.[0]?.toUpperCase() ?? user.email[0].toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800 font-sarabun">
              {user.firstName} {user.lastName}
              {isMe && <span className="ml-1.5 text-[9px] px-1.5 py-0.5 bg-blue-100 text-blue-600 rounded-full font-bold">คุณ</span>}
              {user.isFirstUser && <span className="ml-1.5 text-[9px] px-1.5 py-0.5 bg-purple-100 text-purple-600 rounded-full font-bold">First User</span>}
            </p>
            <p className="text-xs text-slate-400">{user.email}</p>
          </div>
        </div>
      </td>

      {/* Position */}
      <td className="px-4 py-3">
        <select
          value={user.position || ''}
          onChange={e => onPositionChange(e.target.value)}
          disabled={posBusy}
          className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 outline-none focus:border-blue-400 bg-white font-sarabun disabled:opacity-50 min-w-[160px] cursor-pointer hover:border-slate-300"
        >
          <option value="">— เลือกตำแหน่ง —</option>
          {POSITIONS.map(p => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </td>

      {/* Status badge */}
      <td className="px-4 py-3">
        <span className={`px-2.5 py-1 rounded-full text-xs font-bold font-sarabun ${sc.cls}`}>
          {sc.label}
        </span>
      </td>

      {/* Roles — multi-select dropdown */}
      <td className="px-4 py-3">
        <div className="relative">
          <button
            onClick={() => setRoleOpen(v => !v)}
            disabled={roleBusy || isMe}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50 font-sarabun"
          >
            {roleBusy
              ? <RefreshCw size={11} className="animate-spin text-slate-400" />
              : null
            }
            <span className="max-w-[140px] truncate">
              {(user.role ?? []).length === 0 ? 'ไม่มีบทบาท' : (user.role ?? []).map(r => ROLE_LABELS[r] ?? r).join(', ')}
            </span>
            <ChevronDown size={11} className="text-slate-400 flex-shrink-0" />
          </button>

          {roleOpen && !isMe && (
            <div className="absolute left-0 top-9 w-52 bg-white border border-slate-200 rounded-xl shadow-xl z-20 py-1 max-h-64 overflow-y-auto">
              {USER_ROLES.map(role => {
                const active = (user.role ?? []).includes(role)
                return (
                  <button key={role}
                    onClick={() => { onRoleToggle(role); }}
                    className="w-full flex items-center justify-between px-3 py-2 text-xs hover:bg-slate-50 transition-colors font-sarabun"
                  >
                    <span className={active ? 'font-bold text-blue-700' : 'text-slate-700'}>{ROLE_LABELS[role] ?? role}</span>
                    {active && <CheckCircle size={12} className="text-blue-500 flex-shrink-0" />}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </td>

      {/* Actions */}
      <td className="px-4 py-3">
        {isMe ? (
          <span className="text-xs text-slate-400 font-sarabun">—</span>
        ) : (
          <div className="flex items-center gap-2">
            {user.status !== 'approved' && (
              <button onClick={onApprove} disabled={busy}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-60 font-sarabun">
                {busy ? <RefreshCw size={11} className="animate-spin" /> : <CheckCircle size={11} />}
                อนุมัติ
              </button>
            )}
            {user.status !== 'rejected' && (
              <button onClick={onReject} disabled={busy}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-60 font-sarabun">
                {busy ? <RefreshCw size={11} className="animate-spin" /> : <XCircle size={11} />}
                ปฏิเสธ
              </button>
            )}
            {user.status === 'approved' && !busy && (
              <span className="text-xs text-green-600 font-sarabun">✓ อนุมัติแล้ว</span>
            )}
          </div>
        )}
      </td>
    </tr>
  )
}
