import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import type { UserRole } from '../../types/auth'

interface Props {
  children: React.ReactNode
  requireApproved?: boolean
  requireRoles?: UserRole[]
}

export default function ProtectedRoute({
  children,
  requireApproved = true,
  requireRoles,
}: Props) {
  const { firebaseUser, userProfile, loading } = useAuth()
  const location = useLocation()

  // 1. Still initialising
  if (loading) return <AuthSpinner />

  // 2. No firebase session → login
  if (!firebaseUser) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // 3. Firebase user exists but profile not fetched yet
  if (!userProfile) return <AuthSpinner />

  // 4. Pending → pending page
  if (requireApproved && userProfile.status === 'pending') {
    return <Navigate to="/pending" replace />
  }

  // 5. Rejected → login
  if (requireApproved && userProfile.status === 'rejected') {
    return <Navigate to="/login" replace />
  }

  // 6. Role whitelist check
  if (requireRoles && requireRoles.length > 0) {
    const hasRole = requireRoles.some(r => userProfile.role.includes(r))
    if (!hasRole) return <Navigate to="/" replace />
  }

  return <>{children}</>
}

function AuthSpinner() {
  return (
    <div className="min-h-screen bg-[#0f2035] flex flex-col items-center justify-center gap-4">
      <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin" />
      <p className="text-white/70 text-sm font-medium font-sarabun">กำลังตรวจสอบสิทธิ์...</p>
    </div>
  )
}
