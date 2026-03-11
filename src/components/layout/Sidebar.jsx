import React, { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Database,
  FileText,
  ClipboardList,
  BookOpen,
  BarChart3,
  ChevronDown,
  ChevronRight,
  HardHat,
  Shield,
  LogOut,
} from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { useAuth } from '../../context/AuthContext'
import { logout } from '../../firebase/authService'

const NAV_ITEMS = [
  {
    id: 'dashboard',
    label: 'Executive Dashboard',
    icon: LayoutDashboard,
    path: '/dashboard',
    roles: null,
  },
  {
    id: 'master',
    label: 'Master Data',
    icon: Database,
    roles: ['ppeTeam', 'ppeLeader', 'ppeManager', 'ppeAdmin', 'MasterAdmin', 'SenEng', 'Eng'],
    children: [
      {
        id: 'unit-rates',
        label: 'Unit Rate Manhour',
        path: '/master/unit-rates',
        roles: null,
      },
      {
        id: 'team-rates',
        label: 'Team Hourly Rate',
        path: '/master/team-rates',
        roles: ['ppeLeader', 'ppeManager', 'ppeAdmin', 'MasterAdmin'],
      },
    ],
  },
  {
    id: 'rfq',
    label: 'RFQ & Estimation',
    icon: FileText,
    path: '/rfq',
    roles: ['Requestors', 'ppeLeader', 'ppeManager', 'ppeAdmin', 'MasterAdmin', 'SenEng', 'Eng'],
  },
  {
    id: 'work-orders',
    label: 'Work Execution',
    icon: ClipboardList,
    path: '/work-orders',
    roles: ['ppeTeam', 'ppeLeader', 'ppeManager', 'ppeAdmin', 'MasterAdmin'],
  },
  {
    id: 'daily-report',
    label: 'Daily Report',
    icon: BookOpen,
    path: '/daily-report',
    roles: ['ppeTeam', 'ppeLeader', 'ppeManager', 'ppeAdmin', 'MasterAdmin'],
  },
  {
    id: 'report-summary',
    label: 'Report Summary',
    icon: BarChart3,
    path: '/report-summary',
    roles: ['ppeLeader', 'ppeManager', 'ppeAdmin', 'MasterAdmin'],
  },
  {
    id: 'admin',
    label: 'Admin Panel',
    icon: Shield,
    path: '/admin',
    roles: ['ppeAdmin', 'MasterAdmin'],
  },
]

export default function Sidebar() {
  const { currentRole } = useApp()
  const { userProfile } = useAuth()
  const navigate = useNavigate()
  const [openGroups, setOpenGroups] = useState({ master: true })

  const toggleGroup = (id) => {
    setOpenGroups(prev => ({ ...prev, [id]: !prev[id] }))
  }

  // Use real auth roles when available, fall back to role simulator
  const userRoles = userProfile?.role ?? [currentRole]
  const isVisible = (roles) => {
    if (!roles) return true
    return roles.some(r => userRoles.includes(r))
  }

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <aside className="w-64 min-h-screen bg-[#0f2035] flex flex-col flex-shrink-0">
      {/* Brand */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-white/10">
        <div className="w-9 h-9 rounded-lg bg-blue-500 flex items-center justify-center flex-shrink-0">
          <HardHat size={20} className="text-white" />
        </div>
        <div>
          <p className="text-white font-bold text-sm leading-tight">PPE Engineering</p>
          <p className="text-blue-300 text-xs">Management ERP</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto scrollbar-thin">
        {NAV_ITEMS.map(item => {
          if (!isVisible(item.roles)) return null

          if (item.children) {
            const visibleChildren = item.children.filter(c => isVisible(c.roles))
            if (visibleChildren.length === 0) return null
            const Icon = item.icon
            const isOpen = openGroups[item.id]

            return (
              <div key={item.id}>
                <button
                  onClick={() => toggleGroup(item.id)}
                  className="w-full flex items-center justify-between px-4 py-2.5 text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Icon size={18} />
                    <span className="text-sm font-medium">{item.label}</span>
                  </div>
                  {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>
                {isOpen && (
                  <div className="ml-4 border-l border-white/10 pl-3">
                    {visibleChildren.map(child => (
                      <NavLink
                        key={child.id}
                        to={child.path}
                        className={({ isActive }) =>
                          `block px-3 py-2 text-xs font-medium rounded-md my-0.5 transition-colors ${
                            isActive
                              ? 'bg-blue-600 text-white'
                              : 'text-slate-400 hover:text-white hover:bg-white/5'
                          }`
                        }
                      >
                        {child.label}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            )
          }

          const Icon = item.icon
          return (
            <NavLink
              key={item.id}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white border-r-2 border-blue-400'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`
              }
            >
              <Icon size={18} />
              {item.label}
            </NavLink>
          )
        })}
      </nav>

      {/* User footer */}
      <div className="px-4 py-3 border-t border-white/10">
        {userProfile ? (
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {userProfile.firstName?.[0]?.toUpperCase() ?? userProfile.email[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-semibold truncate font-sarabun">
                {userProfile.firstName} {userProfile.lastName}
              </p>
              <p className="text-slate-400 text-[10px] truncate">
                {(userProfile.role ?? []).slice(0, 2).join(', ')}
              </p>
            </div>
            <button onClick={handleLogout} title="ออกจากระบบ"
              className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors flex-shrink-0">
              <LogOut size={14} />
            </button>
          </div>
        ) : (
          <p className="text-slate-500 text-xs text-center">v1.0.0 © 2024 PPE Eng.</p>
        )}
      </div>
    </aside>
  )
}
