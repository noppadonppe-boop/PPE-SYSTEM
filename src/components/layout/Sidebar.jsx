import React, { useState } from 'react'
import { NavLink } from 'react-router-dom'
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
} from 'lucide-react'
import { useApp } from '../../context/AppContext'

const NAV_ITEMS = [
  {
    id: 'dashboard',
    label: 'Executive Dashboard',
    icon: LayoutDashboard,
    path: '/',
    roles: ['Requestor', 'ppeLead', 'ppeManager', 'ppeTeam', 'ppeAdmin', 'GM/MD'],
  },
  {
    id: 'master',
    label: 'Master Data',
    icon: Database,
    roles: ['ppeLead', 'ppeManager', 'ppeTeam', 'ppeAdmin', 'GM/MD'],
    children: [
      {
        id: 'unit-rates',
        label: 'Unit Rate Manhour',
        path: '/master/unit-rates',
        roles: ['ppeLead', 'ppeManager', 'ppeTeam', 'ppeAdmin', 'GM/MD'],
      },
      {
        id: 'team-rates',
        label: 'Team Hourly Rate',
        path: '/master/team-rates',
        roles: ['ppeLead', 'ppeManager', 'ppeAdmin'],
      },
    ],
  },
  {
    id: 'rfq',
    label: 'RFQ & Estimation',
    icon: FileText,
    path: '/rfq',
    roles: ['Requestor', 'ppeLead', 'ppeManager', 'ppeAdmin', 'GM/MD'],
  },
  {
    id: 'work-orders',
    label: 'Work Execution',
    icon: ClipboardList,
    path: '/work-orders',
    roles: ['ppeLead', 'ppeManager', 'ppeTeam', 'ppeAdmin', 'GM/MD'],
  },
  {
    id: 'daily-report',
    label: 'Daily Report',
    icon: BookOpen,
    path: '/daily-report',
    roles: ['ppeLead', 'ppeManager', 'ppeTeam', 'ppeAdmin', 'GM/MD'],
  },
  {
    id: 'report-summary',
    label: 'Report Summary',
    icon: BarChart3,
    path: '/report-summary',
    roles: ['ppeLead', 'ppeManager', 'ppeAdmin', 'GM/MD'],
  },
]

export default function Sidebar() {
  const { currentRole } = useApp()
  const [openGroups, setOpenGroups] = useState({ master: true })

  const toggleGroup = (id) => {
    setOpenGroups(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const isVisible = (roles) => roles.includes(currentRole)

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
              end={item.path === '/'}
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

      {/* Footer */}
      <div className="px-4 py-3 border-t border-white/10">
        <p className="text-slate-500 text-xs text-center">v1.0.0 © 2024 PPE Eng.</p>
      </div>
    </aside>
  )
}
