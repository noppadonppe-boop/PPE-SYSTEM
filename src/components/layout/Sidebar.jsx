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
import { useAuth } from '../../context/AuthContext'
import { logout } from '../../firebase/authService'
import UserAvatar from '../ui/UserAvatar'

const NAV_ITEMS = [
  {
    id: 'dashboard',
    label: 'Executive Dashboard',
    icon: LayoutDashboard,
    path: '/dashboard',
    roles: ['ppeLead', 'ppeManager', 'ppeTeam', 'ppeAdmin', 'MasterAdmin', 'GM/MD'],
  },
  {
    id: 'master',
    label: 'Master Data',
    icon: Database,
    roles: ['ppeLead', 'ppeManager', 'ppeAdmin', 'ppeTeam', 'MasterAdmin'],
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
        roles: ['ppeLead', 'ppeManager', 'ppeAdmin', 'MasterAdmin'],
      },
    ],
  },
  {
    id: 'rfq',
    label: 'RFQ & Estimation',
    icon: FileText,
    path: '/rfq',
    roles: null,
  },
  {
    id: 'work-orders',
    label: 'Work Execution',
    icon: ClipboardList,
    path: '/work-orders',
    roles: ['ppeLead', 'ppeManager', 'ppeAdmin', 'ppeTeam', 'MasterAdmin'],
  },
  {
    id: 'daily-report',
    label: 'Daily Report',
    icon: BookOpen,
    path: '/daily-report',
    roles: ['ppeLead', 'ppeManager', 'ppeAdmin', 'ppeTeam', 'MasterAdmin'],
  },
  {
    id: 'report-summary',
    label: 'Report Summary',
    icon: BarChart3,
    path: '/report-summary',
    roles: ['ppeLead', 'ppeManager', 'ppeAdmin', 'MasterAdmin'],
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
  const { userProfile } = useAuth()
  const navigate = useNavigate()
  const [openGroups, setOpenGroups] = useState({ master: true })

  const toggleGroup = (id) => {
    setOpenGroups(prev => ({ ...prev, [id]: !prev[id] }))
  }

  // Union of all user roles
  const userRoles = userProfile?.role ?? []
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
      <div className="flex items-center gap-3 px-5 py-4 border-b border-white/10">
        <div className="w-9 h-9 rounded-lg bg-blue-500 flex items-center justify-center flex-shrink-0">
          <HardHat size={20} className="text-white" />
        </div>
        <div>
          <p className="text-white font-bold text-sm leading-tight">PPE Engineering</p>
          <p className="text-blue-300 text-xs">Management ERP</p>
        </div>
      </div>

      {/* User Profile Card */}
      {userProfile && (
        <div className="mx-3 mt-3 mb-1 bg-white/8 border border-white/15 rounded-xl p-3">
          <div className="flex items-center gap-3">
            <UserAvatar
              photoURL={userProfile.photoURL}
              name={`${userProfile.firstName} ${userProfile.lastName}`}
              size={44}
              textSize="text-base"
              className="border-2 border-blue-400/50 shadow"
            />
            <div className="min-w-0 flex-1">
              <p className="text-white text-sm font-semibold truncate font-sarabun leading-tight">
                {userProfile.firstName} {userProfile.lastName}
              </p>
              <p className="text-blue-200/70 text-[10px] truncate font-sarabun mt-0.5">
                {userProfile.position || userProfile.email}
              </p>
              {/* Roles badges */}
              <div className="flex flex-wrap gap-1 mt-1.5">
                {(userProfile.role ?? []).slice(0, 3).map(r => (
                  <span key={r} className="inline-block bg-blue-500/30 text-blue-200 text-[9px] font-bold px-1.5 py-0.5 rounded-full border border-blue-400/30">
                    {r}
                  </span>
                ))}
                {(userProfile.role ?? []).length > 3 && (
                  <span className="inline-block bg-white/10 text-slate-300 text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                    +{(userProfile.role ?? []).length - 3}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 py-3 overflow-y-auto scrollbar-thin">
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

      {/* Logout footer */}
      <div className="px-3 py-3 border-t border-white/10">
        <button onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors text-sm font-medium">
          <LogOut size={16} />
          ออกจากระบบ
        </button>
      </div>
    </aside>
  )
}
