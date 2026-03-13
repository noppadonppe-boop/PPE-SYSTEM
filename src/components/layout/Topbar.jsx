import React, { useState, useRef, useEffect, useMemo } from 'react'
import {
  Bell, X, AlertTriangle,
  Info, CheckCircle, AlertCircle, Clock,
  ArrowRight, CheckCheck, LogOut, UserCog, Camera,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import { useAuth } from '../../context/AuthContext'
import { logout } from '../../firebase/authService'
import UserAvatar from '../ui/UserAvatar'

// ─── Notification type config ─────────────────────────────────────────────────
const TYPE_CONFIG = {
  alert:    { icon: AlertTriangle,  iconCls: 'text-red-500',    dot: 'bg-red-500',    bg: 'bg-red-50' },
  approval: { icon: CheckCircle,    iconCls: 'text-green-600',  dot: 'bg-green-500',  bg: 'bg-green-50' },
  action:   { icon: Clock,          iconCls: 'text-yellow-500', dot: 'bg-yellow-400', bg: 'bg-yellow-50' },
  warning:  { icon: AlertCircle,    iconCls: 'text-orange-500', dot: 'bg-orange-400', bg: 'bg-orange-50' },
  info:     { icon: Info,           iconCls: 'text-blue-500',   dot: 'bg-blue-400',   bg: 'bg-blue-50' },
}

const MODULE_COLORS = {
  'RFQ':          'bg-purple-100 text-purple-700',
  'Work Order':   'bg-blue-100 text-blue-700',
  'Daily Report': 'bg-teal-100 text-teal-700',
}

// ─── Single notification item ─────────────────────────────────────────────────
function NotifItem({ n, onNavigate, onDismiss }) {
  const cfg = TYPE_CONFIG[n.type] || TYPE_CONFIG.info
  const Icon = cfg.icon

  return (
    <li className={`group relative border-b border-slate-100 last:border-0 ${n.priority === 'high' ? cfg.bg : 'bg-white'}`}>
      <div className="flex items-start gap-3 px-4 py-3">
        <div className="flex-shrink-0 mt-1 flex flex-col items-center gap-1">
          <div className={`w-2 h-2 rounded-full ${n.priority === 'high' ? cfg.dot : 'bg-slate-300'}`} />
        </div>
        <div className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center ${cfg.bg} border border-current border-opacity-20`}>
          <Icon size={14} className={cfg.iconCls} />
        </div>
        <button onClick={() => onNavigate(n.link)} className="flex-1 min-w-0 text-left">
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs font-bold text-slate-800 leading-tight">{n.title}</p>
            {n.module && (
              <span className={`flex-shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-full ${MODULE_COLORS[n.module] || 'bg-slate-100 text-slate-600'}`}>
                {n.module}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-600 mt-0.5 font-medium truncate">{n.message}</p>
          {n.detail && <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">{n.detail}</p>}
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDismiss(n.id) }}
          className="flex-shrink-0 opacity-0 group-hover:opacity-100 p-0.5 rounded text-slate-400 hover:text-slate-600 transition-all"
          title="Dismiss"
        >
          <X size={12} />
        </button>
      </div>
      <button
        onClick={() => onNavigate(n.link)}
        className="absolute right-8 bottom-2.5 opacity-0 group-hover:opacity-100 flex items-center gap-1 text-[10px] text-blue-500 font-semibold transition-all"
      >
        Go <ArrowRight size={10} />
      </button>
    </li>
  )
}

// ─── Update Profile Modal ─────────────────────────────────────────────────────
function UpdateProfileModal({ onClose }) {
  const { userProfile, updateProfile } = useAuth()
  const [form, setForm] = useState({
    firstName: userProfile?.firstName ?? '',
    lastName:  userProfile?.lastName  ?? '',
    position:  userProfile?.position  ?? '',
    photoURL:  userProfile?.photoURL  ?? '',
  })
  const [busy, setBusy]     = useState(false)
  const [saved, setSaved]   = useState(false)

  const POSITIONS = [
    'Manager', 'Leader', 'GM/MD', 'Senior Architect', 'Architect',
    'Senior Civil Engineer', 'Civil Engineer', 'Draft Man', 'Document Control',
  ]

  async function handleSave(e) {
    e.preventDefault()
    setBusy(true)
    try {
      await updateProfile({
        firstName: form.firstName.trim(),
        lastName:  form.lastName.trim(),
        position:  form.position,
        photoURL:  form.photoURL.trim(),
      })
      setSaved(true)
      setTimeout(() => { setSaved(false); onClose() }, 1200)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 mx-4">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <UserCog size={18} className="text-[#0f2035]" />
            <h2 className="text-base font-bold text-slate-800 font-sarabun">แก้ไขโปรไฟล์</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Avatar preview */}
        <div className="flex justify-center mb-5">
          <div className="relative">
            <UserAvatar
              photoURL={form.photoURL}
              name={`${form.firstName} ${form.lastName}`}
              size={80}
              textSize="text-2xl"
              className="border-4 border-white shadow-lg"
            />
            <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-[#0f2035] rounded-full flex items-center justify-center shadow">
              <Camera size={12} className="text-white" />
            </div>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1 font-sarabun">URL รูปโปรไฟล์</label>
            <input
              type="url" value={form.photoURL}
              onChange={e => setForm(p => ({ ...p, photoURL: e.target.value }))}
              placeholder="https://..."
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200 font-sarabun"
            />
            <p className="text-[10px] text-slate-400 mt-1 font-sarabun">รูปจาก Google จะอัพเดทอัตโนมัติเมื่อ Login</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1 font-sarabun">ชื่อ</label>
              <input required type="text" value={form.firstName}
                onChange={e => setForm(p => ({ ...p, firstName: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200 font-sarabun"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1 font-sarabun">นามสกุล</label>
              <input required type="text" value={form.lastName}
                onChange={e => setForm(p => ({ ...p, lastName: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200 font-sarabun"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1 font-sarabun">ตำแหน่ง</label>
            <select value={form.position}
              onChange={e => setForm(p => ({ ...p, position: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200 font-sarabun bg-white"
            >
              <option value="">— เลือกตำแหน่ง —</option>
              {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 border border-slate-300 text-slate-600 text-sm font-semibold rounded-lg hover:bg-slate-50 transition-colors font-sarabun">
              ยกเลิก
            </button>
            <button type="submit" disabled={busy || saved}
              className={`flex-1 py-2.5 text-white text-sm font-semibold rounded-lg transition-colors font-sarabun flex items-center justify-center gap-2 ${
                saved ? 'bg-green-500' : 'bg-[#0f2035] hover:bg-[#162d4a] disabled:opacity-60'
              }`}>
              {busy ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> :
               saved ? <><CheckCircle size={15} /> บันทึกแล้ว!</> :
               'บันทึก'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Main Topbar ──────────────────────────────────────────────────────────────
export default function Topbar({ pageTitle }) {
  const { getNotifications } = useApp()
  const { userProfile }      = useAuth()
  const [notifOpen,    setNotifOpen]    = useState(false)
  const [profileOpen,  setProfileOpen]  = useState(false)
  const [showEditProfile, setShowEditProfile] = useState(false)
  const [dismissed,    setDismissed]    = useState(new Set())
  const [filterType,   setFilterType]   = useState('All')
  const notifRef   = useRef(null)
  const profileRef = useRef(null)
  const navigate   = useNavigate()

  const allNotifications = useMemo(() => getNotifications(), [getNotifications, userProfile?.role])

  const notifications = useMemo(() =>
    allNotifications.filter(n => !dismissed.has(n.id)),
  [allNotifications, dismissed])

  const filtered = useMemo(() => {
    if (filterType === 'All') return notifications
    return notifications.filter(n => n.module === filterType)
  }, [notifications, filterType])

  const highCount = notifications.filter(n => n.priority === 'high').length

  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current   && !notifRef.current.contains(e.target))   setNotifOpen(false)
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleNavigate  = (link) => { navigate(link); setNotifOpen(false) }
  const handleDismiss   = (id)   => setDismissed(prev => new Set([...prev, id]))
  const handleDismissAll = ()    => setDismissed(new Set(allNotifications.map(n => n.id)))

  const modules = useMemo(() => {
    const seen = new Set()
    notifications.forEach(n => n.module && seen.add(n.module))
    return ['All', ...seen]
  }, [notifications])

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  const rolesDisplay = (userProfile?.role ?? []).slice(0, 2).join(', ')

  return (
    <>
      <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 flex-shrink-0 shadow-sm">
        {/* Page Title */}
        <h1 className="text-lg font-semibold text-slate-800">{pageTitle}</h1>

        <div className="flex items-center gap-3">

          {/* ── Notification Bell ─────────────────────────────────────────── */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setNotifOpen(v => !v)}
              className={`relative p-2 rounded-lg transition-colors ${
                notifOpen
                  ? 'text-slate-800 bg-slate-100'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
              }`}
            >
              <Bell size={20} />
              {notifications.length > 0 && (
                <span className={`absolute top-0.5 right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full text-white text-[10px] font-bold ${
                  highCount > 0 ? 'bg-red-500' : 'bg-slate-400'
                }`}>
                  {notifications.length > 9 ? '9+' : notifications.length}
                </span>
              )}
            </button>

            {notifOpen && (
              <div className="absolute right-0 top-12 w-[360px] bg-white border border-slate-200 rounded-xl shadow-2xl z-50 flex flex-col overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 bg-[#0f2035]">
                  <div className="flex items-center gap-2">
                    <Bell size={14} className="text-slate-300" />
                    <span className="font-semibold text-sm text-white">Notifications</span>
                    {notifications.length > 0 && (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                        highCount > 0 ? 'bg-red-500 text-white' : 'bg-slate-600 text-slate-200'
                      }`}>
                        {notifications.length}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {notifications.length > 0 && (
                      <button
                        onClick={handleDismissAll}
                        className="flex items-center gap-1 text-[10px] text-slate-300 hover:text-white transition-colors font-medium"
                        title="Mark all as read"
                      >
                        <CheckCheck size={12} /> Mark all read
                      </button>
                    )}
                    <button onClick={() => setNotifOpen(false)} className="text-slate-400 hover:text-white transition-colors ml-1">
                      <X size={14} />
                    </button>
                  </div>
                </div>

                {modules.length > 2 && (
                  <div className="flex gap-1 px-3 py-2 bg-slate-50 border-b border-slate-100 overflow-x-auto">
                    {modules.map(m => (
                      <button key={m}
                        onClick={() => setFilterType(m)}
                        className={`flex-shrink-0 text-[10px] font-semibold px-2.5 py-1 rounded-full transition-colors ${
                          filterType === m
                            ? 'bg-[#0f2035] text-white'
                            : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        {m}
                        {m !== 'All' && (
                          <span className="ml-1 opacity-70">({notifications.filter(n => n.module === m).length})</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}

                {filtered.length === 0 ? (
                  <div className="px-6 py-10 flex flex-col items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
                      <CheckCircle size={22} className="text-green-400" />
                    </div>
                    <p className="text-sm font-semibold text-slate-600">All clear!</p>
                    <p className="text-xs text-slate-400 text-center">
                      {filterType !== 'All'
                        ? `No ${filterType} notifications.`
                        : 'No pending actions for your roles.'}
                    </p>
                  </div>
                ) : (
                  <ul className="max-h-[360px] overflow-y-auto">
                    {filtered.map(n => (
                      <NotifItem key={n.id} n={n} onNavigate={handleNavigate} onDismiss={handleDismiss} />
                    ))}
                  </ul>
                )}

                <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
                  <p className="text-[10px] text-slate-400 font-sarabun">
                    Roles: <span className="font-semibold text-slate-600">{(userProfile?.role ?? []).join(', ') || '—'}</span>
                  </p>
                  {dismissed.size > 0 && (
                    <button onClick={() => setDismissed(new Set())}
                      className="text-[10px] text-blue-500 hover:text-blue-700 font-semibold transition-colors">
                      Restore ({dismissed.size})
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ── User Avatar + Profile Dropdown ───────────────────────────── */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setProfileOpen(v => !v)}
              className={`flex items-center gap-2 pl-1 pr-3 py-1 rounded-xl transition-colors ${
                profileOpen ? 'bg-slate-100' : 'hover:bg-slate-100'
              }`}
            >
              <UserAvatar
                photoURL={userProfile?.photoURL}
                name={`${userProfile?.firstName ?? ''} ${userProfile?.lastName ?? ''}`}
                size={32}
                textSize="text-sm"
                className="border-2 border-white shadow-sm ring-2 ring-slate-200"
              />
              <div className="text-left hidden sm:block">
                <p className="text-xs font-semibold text-slate-800 leading-tight font-sarabun">
                  {userProfile?.firstName} {userProfile?.lastName}
                </p>
                <p className="text-[10px] text-slate-400 truncate max-w-[100px] font-sarabun">{rolesDisplay || '—'}</p>
              </div>
            </button>

            {profileOpen && (
              <div className="absolute right-0 top-12 w-56 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden">
                {/* Profile header */}
                <div className="px-4 py-3 bg-[#0f2035] flex items-center gap-3">
                  <UserAvatar
                    photoURL={userProfile?.photoURL}
                    name={`${userProfile?.firstName ?? ''} ${userProfile?.lastName ?? ''}`}
                    size={36}
                    textSize="text-sm"
                    className="border-2 border-white/30"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate font-sarabun">
                      {userProfile?.firstName} {userProfile?.lastName}
                    </p>
                    <p className="text-[10px] text-slate-300 truncate font-sarabun">{userProfile?.position || userProfile?.email}</p>
                  </div>
                </div>

                <div className="py-1">
                  <button
                    onClick={() => { setProfileOpen(false); setShowEditProfile(true) }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors font-sarabun"
                  >
                    <UserCog size={15} className="text-slate-400" />
                    แก้ไขโปรไฟล์
                  </button>
                  <div className="border-t border-slate-100 my-1" />
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors font-sarabun"
                  >
                    <LogOut size={15} />
                    ออกจากระบบ
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      </header>

      {showEditProfile && (
        <UpdateProfileModal onClose={() => setShowEditProfile(false)} />
      )}
    </>
  )
}
