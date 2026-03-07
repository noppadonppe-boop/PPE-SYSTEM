import React, { useState, useRef, useEffect, useMemo } from 'react'
import {
  Bell, ChevronDown, UserCog, X, AlertTriangle,
  Info, CheckCircle, AlertCircle, Clock, FileText,
  ArrowRight, CheckCheck,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useApp, ROLES } from '../../context/AppContext'

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
        {/* Priority dot */}
        <div className="flex-shrink-0 mt-1 flex flex-col items-center gap-1">
          <div className={`w-2 h-2 rounded-full ${n.priority === 'high' ? cfg.dot : 'bg-slate-300'}`} />
        </div>

        {/* Icon */}
        <div className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center ${cfg.bg} border border-current border-opacity-20`}>
          <Icon size={14} className={cfg.iconCls} />
        </div>

        {/* Content — clickable */}
        <button
          onClick={() => onNavigate(n.link)}
          className="flex-1 min-w-0 text-left"
        >
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

        {/* Dismiss */}
        <button
          onClick={(e) => { e.stopPropagation(); onDismiss(n.id) }}
          className="flex-shrink-0 opacity-0 group-hover:opacity-100 p-0.5 rounded text-slate-400 hover:text-slate-600 transition-all"
          title="Dismiss"
        >
          <X size={12} />
        </button>
      </div>

      {/* Navigate arrow */}
      <button
        onClick={() => onNavigate(n.link)}
        className="absolute right-8 bottom-2.5 opacity-0 group-hover:opacity-100 flex items-center gap-1 text-[10px] text-blue-500 font-semibold transition-all"
      >
        Go <ArrowRight size={10} />
      </button>
    </li>
  )
}

// ─── Main Topbar ──────────────────────────────────────────────────────────────
export default function Topbar({ pageTitle }) {
  const { currentRole, setCurrentRole, getNotifications } = useApp()
  const [roleOpen, setRoleOpen]       = useState(false)
  const [notifOpen, setNotifOpen]     = useState(false)
  const [dismissed, setDismissed]     = useState(new Set())
  const [filterType, setFilterType]   = useState('All')
  const roleRef  = useRef(null)
  const notifRef = useRef(null)
  const navigate = useNavigate()

  // Recompute when role changes — also clear dismissed list
  const allNotifications = useMemo(() => getNotifications(), [currentRole, getNotifications])

  // Clear dismissed when role changes (new role = fresh slate)
  useEffect(() => { setDismissed(new Set()) }, [currentRole])

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
      if (roleRef.current  && !roleRef.current.contains(e.target))  setRoleOpen(false)
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleNavigate = (link) => { navigate(link); setNotifOpen(false) }
  const handleDismiss  = (id)   => setDismissed(prev => new Set([...prev, id]))
  const handleDismissAll = ()   => setDismissed(new Set(allNotifications.map(n => n.id)))

  const currentRoleLabel = ROLES.find(r => r.id === currentRole)?.label || currentRole

  // Unique modules present in current notifications for filter tabs
  const modules = useMemo(() => {
    const seen = new Set()
    notifications.forEach(n => n.module && seen.add(n.module))
    return ['All', ...seen]
  }, [notifications])

  return (
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
            {/* Badge — red for high-priority, grey for info-only */}
            {notifications.length > 0 && (
              <span className={`absolute top-0.5 right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full text-white text-[10px] font-bold ${
                highCount > 0 ? 'bg-red-500' : 'bg-slate-400'
              }`}>
                {notifications.length > 9 ? '9+' : notifications.length}
              </span>
            )}
          </button>

          {/* ── Notification Panel ──────────────────────────────────────── */}
          {notifOpen && (
            <div className="absolute right-0 top-12 w-[360px] bg-white border border-slate-200 rounded-xl shadow-2xl z-50 flex flex-col overflow-hidden">

              {/* Header */}
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

              {/* Filter tabs — only show if multiple modules */}
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
                        <span className="ml-1 opacity-70">
                          ({notifications.filter(n => n.module === m).length})
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* Body */}
              {filtered.length === 0 ? (
                <div className="px-6 py-10 flex flex-col items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
                    <CheckCircle size={22} className="text-green-400" />
                  </div>
                  <p className="text-sm font-semibold text-slate-600">All clear!</p>
                  <p className="text-xs text-slate-400 text-center">
                    {filterType !== 'All'
                      ? `No ${filterType} notifications for your current role.`
                      : 'No pending actions for your current role.'}
                  </p>
                </div>
              ) : (
                <ul className="max-h-[360px] overflow-y-auto">
                  {filtered.map(n => (
                    <NotifItem
                      key={n.id}
                      n={n}
                      onNavigate={handleNavigate}
                      onDismiss={handleDismiss}
                    />
                  ))}
                </ul>
              )}

              {/* Footer */}
              <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
                <p className="text-[10px] text-slate-400">
                  Role: <span className="font-semibold text-slate-600">{currentRoleLabel}</span>
                </p>
                {dismissed.size > 0 && (
                  <button
                    onClick={() => setDismissed(new Set())}
                    className="text-[10px] text-blue-500 hover:text-blue-700 font-semibold transition-colors"
                  >
                    Restore dismissed ({dismissed.size})
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Role Simulator Dropdown ───────────────────────────────────── */}
        <div className="relative" ref={roleRef}>
          <button
            onClick={() => setRoleOpen(v => !v)}
            className="flex items-center gap-2 px-3 py-2 bg-[#0f2035] text-white rounded-lg text-sm font-medium hover:bg-[#162d4a] transition-colors"
          >
            <UserCog size={16} />
            <span className="max-w-[120px] truncate">{currentRoleLabel}</span>
            <ChevronDown size={14} className={`transition-transform ${roleOpen ? 'rotate-180' : ''}`} />
          </button>

          {roleOpen && (
            <div className="absolute right-0 top-11 w-52 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden">
              <div className="px-3 py-2 border-b border-slate-100 bg-slate-50">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Role Simulator</p>
              </div>
              <ul className="py-1">
                {ROLES.map(role => (
                  <li key={role.id}>
                    <button
                      onClick={() => { setCurrentRole(role.id); setRoleOpen(false) }}
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center justify-between ${
                        currentRole === role.id
                          ? 'bg-blue-50 text-blue-700 font-semibold'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {role.label}
                      {currentRole === role.id && (
                        <span className="w-2 h-2 rounded-full bg-blue-600 flex-shrink-0" />
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

      </div>
    </header>
  )
}
