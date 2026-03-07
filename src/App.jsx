import React from 'react'
import { Routes, Route } from 'react-router-dom'
import { AppProvider } from './context/AppContext'
import Layout from './components/layout/Layout'
import Dashboard from './pages/Dashboard'
import UnitRates from './pages/UnitRates'
import TeamRates from './pages/TeamRates'
import RFQ from './pages/RFQ'
import WorkOrders from './pages/WorkOrders'
import DailyReport from './pages/DailyReport'
import ReportSummary from './pages/ReportSummary'

export default function App() {
  return (
    <AppProvider>
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
    </AppProvider>
  )
}
