import React from 'react'
import { Routes, Route } from 'react-router-dom'
import { AppProvider, useApp } from './context/AppContext'
import Layout from './components/layout/Layout'
import Dashboard from './pages/Dashboard'
import UnitRates from './pages/UnitRates'
import TeamRates from './pages/TeamRates'
import RFQ from './pages/RFQ'
import WorkOrders from './pages/WorkOrders'
import DailyReport from './pages/DailyReport'
import ReportSummary from './pages/ReportSummary'

// ─── Loading / error gate ─────────────────────────────────────────────────────
function AppRoutes() {
  const { loading, dbError } = useApp()

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f2035] flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin" />
        <p className="text-white/80 text-sm font-medium">Connecting to database…</p>
      </div>
    )
  }

  if (dbError) {
    return (
      <div className="min-h-screen bg-[#0f2035] flex flex-col items-center justify-center gap-4 px-6">
        <div className="bg-red-500/20 border border-red-400/40 rounded-xl px-6 py-5 max-w-md text-center">
          <p className="text-red-300 font-bold text-base mb-1">Database Connection Error</p>
          <p className="text-red-200/80 text-sm">{dbError}</p>
          <p className="text-white/50 text-xs mt-3">Check your Firebase console — make sure Firestore rules allow read/write.</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-sm rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <Layout>
      <Routes>
        <Route path="/"                   element={<Dashboard />} />
        <Route path="/master/unit-rates"  element={<UnitRates />} />
        <Route path="/master/team-rates"  element={<TeamRates />} />
        <Route path="/rfq"                element={<RFQ />} />
        <Route path="/work-orders"        element={<WorkOrders />} />
        <Route path="/daily-report"       element={<DailyReport />} />
        <Route path="/report-summary"     element={<ReportSummary />} />
      </Routes>
    </Layout>
  )
}

export default function App() {
  return (
    <AppProvider>
      <AppRoutes />
    </AppProvider>
  )
}
