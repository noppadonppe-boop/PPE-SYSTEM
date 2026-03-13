import React, { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AppProvider, useApp } from './context/AppContext'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout from './components/layout/Layout'
import ProtectedRoute from './components/auth/ProtectedRoute'

// Eager — auth pages (small, always needed)
import LoginPage           from './pages/auth/LoginPage'
import RegisterPage        from './pages/auth/RegisterPage'
import PendingApprovalPage from './pages/auth/PendingApprovalPage'
import AdminPanel          from './pages/auth/AdminPanel'

// Lazy — app pages (load only when authenticated)
const Dashboard    = lazy(() => import('./pages/Dashboard'))
const UnitRates    = lazy(() => import('./pages/UnitRates'))
const TeamRates    = lazy(() => import('./pages/TeamRates'))
const RFQ          = lazy(() => import('./pages/RFQ'))
const WorkOrders   = lazy(() => import('./pages/WorkOrders'))
const DailyReport  = lazy(() => import('./pages/DailyReport'))
const ReportSummary = lazy(() => import('./pages/ReportSummary'))

// Redirect index to /dashboard for PPE roles, /rfq for Requestor-only
function HomeRedirect() {
  const { userHasRole } = useApp()
  const canSeeDashboard = userHasRole(['ppeLead', 'ppeManager', 'ppeTeam', 'ppeAdmin', 'MasterAdmin', 'GM/MD'])
  return <Navigate to={canSeeDashboard ? '/dashboard' : '/rfq'} replace />
}

// ─── DB loading / error gate (inside AppProvider) ────────────────────────────
function AppRoutes() {
  const { loading, dbError } = useApp()
  const { firebaseUser, loading: authLoading } = useAuth()

  // Wait for auth to finish initialising first
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0f2035] flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin" />
        <p className="text-white/80 text-sm font-medium font-sarabun">กำลังตรวจสอบสิทธิ์…</p>
      </div>
    )
  }

  // Only show DB loading spinner when user is logged in (otherwise go to login page)
  if (loading && firebaseUser) {
    return (
      <div className="min-h-screen bg-[#0f2035] flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin" />
        <p className="text-white/80 text-sm font-medium font-sarabun">กำลังเชื่อมต่อฐานข้อมูล…</p>
      </div>
    )
  }

  // Only show DB error when user is logged in (not a permissions issue from being unauthenticated)
  if (dbError && firebaseUser) {
    return (
      <div className="min-h-screen bg-[#0f2035] flex flex-col items-center justify-center gap-4 px-6">
        <div className="bg-red-500/20 border border-red-400/40 rounded-xl px-6 py-5 max-w-md text-center">
          <p className="text-red-300 font-bold text-base mb-1">Database Connection Error</p>
          <p className="text-red-200/80 text-sm">{dbError}</p>
          <p className="text-white/50 text-xs mt-3">ตรวจสอบ Firebase Console — ตั้งค่า Firestore Rules ให้ถูกต้อง</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-sm rounded-lg transition-colors"
          >
            ลองใหม่
          </button>
        </div>
      </div>
    )
  }

  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0f2035] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    }>
      <Routes>
        {/* ── Public auth routes ── */}
        <Route path="/login"    element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/pending"  element={<PendingApprovalPage />} />

        {/* ── Protected: approved users ── */}
        <Route path="/" element={
          <ProtectedRoute requireApproved>
            <Layout />
          </ProtectedRoute>
        }>
          <Route index                      element={<HomeRedirect />} />
          <Route path="dashboard"           element={
            <ProtectedRoute requireApproved requireRoles={['ppeLead', 'ppeManager', 'ppeTeam', 'ppeAdmin', 'MasterAdmin', 'GM/MD']}>
              <Dashboard />
            </ProtectedRoute>
          } />
          <Route path="master/unit-rates"   element={<UnitRates />} />
          <Route path="master/team-rates"   element={<TeamRates />} />
          <Route path="rfq"                 element={<RFQ />} />
          <Route path="work-orders"         element={<WorkOrders />} />
          <Route path="daily-report"        element={<DailyReport />} />
          <Route path="report-summary"      element={<ReportSummary />} />

          {/* ── Admin only ── */}
          <Route path="admin" element={
            <ProtectedRoute requireApproved requireRoles={['ppeAdmin', 'MasterAdmin']}>
              <AdminPanel />
            </ProtectedRoute>
          } />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <AppRoutes />
      </AppProvider>
    </AuthProvider>
  )
}
