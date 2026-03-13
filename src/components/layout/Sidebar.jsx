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
  PanelLeftClose,
  PanelLeftOpen,
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

export default function Sidebar({ collapsed, onToggle }) {
  const { userProfile } = useAuth()
  const navigate = useNavigate()
  const [openGroups, setOpenGroups] = useState({ master: true })

  const toggleGroup = (id) => {
    setOpenGroups(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const userRoles = userProfile?.role ?? []
  const isVisible = (roles) => {
    if (!roles) return true
    return roles.some(r => userRoles.includes(r))
  }

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  const fullName = userProfile ? `${userProfile.firstName} ${userProfile.lastName}` : ''

  return (
    <aside
      className={`min-h-screen bg-[#0f2035] flex flex-col flex-shrink-0 transition-all duration-300 ease-in-out ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Brand + Toggle */}
      <div className={`flex items-center border-b border-white/10 flex-shrink-0 ${collapsed ? 'justify-center px-2 py-4' : 'gap-3 px-4 py-4'}`}>
        {!collapsed && (
          <div className="w-9 h-9 rounded-lg bg-blue-500 flex items-center justify-center flex-shrink-0">
            <HardHat size={20} className="text-white" />
          </div>
        )}
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold text-sm leading-tight">PPE Engineering</p>
            <p className="text-blue-300 text-xs">Management ERP</p>
          </div>
        )}
        <button
          onClick={onToggle}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors flex-shrink-0"
        >
          {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        </button>
      </div>

      {/* User Profile Card */}
      {userProfile && (
        <div className={`mx-2 mt-3 mb-1 bg-white/8 border border-white/15 rounded-xl flex-shrink-0 ${collapsed ? 'p-1.5 flex justify-center' : 'p-3'}`}>
          {collapsed ? (
            <div title={fullName}>
              <UserAvatar
                photoURL={userProfile.photoURL}
                name={fullName}
                size={36}
                textSize="text-sm"
                className="border-2 border-blue-400/50"
              />
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <UserAvatar
                photoURL={userProfile.photoURL}
                name={fullName}
                size={44}
                textSize="text-base"
                className="border-2 border-blue-400/50 shadow"
              />
              <div className="min-w-0 flex-1">
                <p className="text-white text-sm font-semibold truncate font-sarabun leading-tight">
                  {fullName}
                </p>
                <p className="text-blue-200/70 text-[10px] truncate font-sarabun mt-0.5">
                  {userProfile.position || userProfile.email}
                </p>
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
          )}
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 py-3 overflow-y-auto scrollbar-thin overflow-x-hidden">
        {NAV_ITEMS.map(item => {
          if (!isVisible(item.roles)) return null

          if (item.children) {
            const visibleChildren = item.children.filter(c => isVisible(c.roles))
            if (visibleChildren.length === 0) return null
            const Icon = item.icon
            const isOpen = openGroups[item.id]

            if (collapsed) {
              return (
                <div key={item.id} className="relative group">
                  <button
                    onClick={() => toggleGroup(item.id)}
                    className="w-full flex items-center justify-center py-2.5 text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
                    title={item.label}
                  >
                    <Icon size={20} />
                  </button>
                  {/* Tooltip flyout */}
                  <div className="absolute left-full top-0 ml-2 z-50 hidden group-hover:flex flex-col bg-[#162d4a] border border-white/10 rounded-xl shadow-xl py-1 min-w-[180px]">
                    <p className="px-3 py-1.5 text-[10px] font-bold text-blue-300 uppercase tracking-wider border-b border-white/10">{item.label}</p>
                    {visibleChildren.map(child => (
                      <NavLink
                        key={child.id}
                        to={child.path}
                        className={({ isActive }) =>
                          `block px-3 py-2 text-xs font-medium transition-colors ${
                            isActive ? 'text-white bg-blue-600' : 'text-slate-300 hover:text-white hover:bg-white/5'
                          }`
                        }
                      >
                        {child.label}
                      </NavLink>
                    ))}
                  </div>
                </div>
              )
            }

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
          if (collapsed) {
            return (
              <div key={item.id} className="relative group">
                <NavLink
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center justify-center py-2.5 transition-colors ${
                      isActive ? 'bg-blue-600 text-white border-r-2 border-blue-400' : 'text-slate-300 hover:text-white hover:bg-white/5'
                    }`
                  }
                  title={item.label}
                >
                  <Icon size={20} />
                </NavLink>
                {/* Tooltip */}
                <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 z-50 hidden group-hover:block bg-[#162d4a] border border-white/10 text-white text-xs font-medium px-3 py-1.5 rounded-lg shadow-xl whitespace-nowrap pointer-events-none">
                  {item.label}
                </div>
              </div>
            )
          }

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
      <div className={`border-t border-white/10 flex-shrink-0 ${collapsed ? 'p-2' : 'px-3 py-3'}`}>
        {collapsed ? (
          <div className="relative group">
            <button
              onClick={handleLogout}
              title="ออกจากระบบ"
              className="w-full flex items-center justify-center p-2.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
            >
              <LogOut size={18} />
            </button>
            <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 z-50 hidden group-hover:block bg-[#162d4a] border border-white/10 text-white text-xs font-medium px-3 py-1.5 rounded-lg shadow-xl whitespace-nowrap pointer-events-none">
              ออกจากระบบ
            </div>
          </div>
        ) : (
          <button onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors text-sm font-medium">
            <LogOut size={16} />
            ออกจากระบบ
          </button>
        )}
      </div>
    </aside>
  )
}
