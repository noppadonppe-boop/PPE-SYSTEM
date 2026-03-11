import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth'
import { auth } from '../firebase/firebaseAuth'
import {
  fetchUserProfile,
  isSessionExpired,
  clearSession,
  getRemainingMinutes,
  logout,
} from '../firebase/authService'
import type { UserProfile } from '../types/auth'

// ─── Context shape ────────────────────────────────────────────────────────────
interface AuthContextValue {
  firebaseUser: FirebaseUser | null
  userProfile: UserProfile | null
  loading: boolean
  sessionMinutesLeft: number
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

// ─── Provider ─────────────────────────────────────────────────────────────────
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser,      setFirebaseUser]      = useState<FirebaseUser | null>(null)
  const [userProfile,       setUserProfile]       = useState<UserProfile | null>(null)
  const [loading,           setLoading]           = useState(true)
  const [sessionMinutesLeft, setSessionMinutesLeft] = useState(0)

  const profileUidRef = useRef<string | null>(null)

  // Force-refetch profile from Firestore (used by pages after sign-in)
  const refreshProfile = useCallback(async () => {
    const user = auth.currentUser
    if (!user) { setUserProfile(null); return }
    const profile = await fetchUserProfile(user.uid)
    setUserProfile(profile)
    profileUidRef.current = profile?.uid ?? null
  }, [])

  // ── onAuthStateChanged listener ───────────────────────────────────────────
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user)

      if (!user) {
        setUserProfile(null)
        setLoading(false)
        profileUidRef.current = null
        return
      }

      // Check session expiry — DO NOT force-logout here (race condition risk)
      // Just clear profile; page-level guards will redirect
      if (isSessionExpired()) {
        clearSession()
        setUserProfile(null)
        setLoading(false)
        return
      }

      // Silently fetch profile — never throw from here
      const profile = await fetchUserProfile(user.uid)
      setUserProfile(profile)
      profileUidRef.current = profile?.uid ?? null
      setLoading(false)
    })

    return () => unsub()
  }, [])

  // ── Session countdown (every 60 s) ────────────────────────────────────────
  useEffect(() => {
    const tick = () => {
      if (!auth.currentUser) return
      const mins = getRemainingMinutes()
      setSessionMinutesLeft(mins)
      if (mins <= 0 && auth.currentUser) {
        // Session expired — log out silently
        logout().catch(() => {})
      }
    }
    tick()
    const id = setInterval(tick, 60_000)
    return () => clearInterval(id)
  }, [firebaseUser])

  const value: AuthContextValue = {
    firebaseUser,
    userProfile,
    loading,
    sessionMinutesLeft,
    refreshProfile,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
