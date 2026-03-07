import React from 'react'
import { useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'

const PAGE_TITLES = {
  '/':                     'Executive Dashboard',
  '/master/unit-rates':    'Master Data — Unit Rate Manhour',
  '/master/team-rates':    'Master Data — Team Hourly Rate',
  '/rfq':                  'RFQ & Estimation Engine',
  '/work-orders':          'Work Execution (Modal C)',
  '/daily-report':         'Daily Report (Modal E)',
  '/report-summary':       'Daily Report Summary (Modal F)',
}

export default function Layout({ children }) {
  const { pathname } = useLocation()
  const title = PAGE_TITLES[pathname] || 'PPE Engineering ERP'

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Topbar pageTitle={title} />
        <main className="flex-1 overflow-y-auto bg-slate-100 p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
