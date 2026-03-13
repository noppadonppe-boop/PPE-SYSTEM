import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth'
import { doc, onSnapshot } from 'firebase/firestore'
import { auth, db } from '../firebase/firebaseAuth'
import {
  fetchUserProfile,
  logout,
  updateOwnProfile,
} from '../firebase/authService'
import type { UserProfile } from '../types/auth'

const APP_NAME = 'PPE System'
const ROOT_DOC = 'root'

// ─── Context shape ────────────────────────────────────────────────────────────
interface AuthContextValue {
  firebaseUser: FirebaseUser | null
  userProfile: UserProfile | null
  loading: boolean
  refreshProfile: () => Promise<void>
  updateProfile: (data: { firstName?: string; lastName?: string; position?: string; photoURL?: string }) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

// ─── Provider ─────────────────────────────────────────────────────────────────
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null)
  const [userProfile,  setUserProfile]  = useState<UserProfile | null>(null)
  const [loading,      setLoading]      = useState(true)

  const profileUidRef    = useRef<string | null>(null)
  const profileUnsubRef  = useRef<(() => void) | null>(null)

  // Force-refetch profile from Firestore (used by pages after sign-in)
  const refreshProfile = useCallback(async () => {
    const user = auth.currentUser
    if (!user) { setUserProfile(null); return }
    const profile = await fetchUserProfile(user.uid)
    setUserProfile(profile)
    profileUidRef.current = profile?.uid ?? null
  }, [])

  // Update own profile in Firestore then refresh local state
  const updateProfile = useCallback(async (
    data: { firstName?: string; lastName?: string; position?: string; photoURL?: string }
  ) => {
    const user = auth.currentUser
    if (!user) return
    await updateOwnProfile(user.uid, data)
    // Real-time listener will pick up the change automatically
  }, [])

  // ── Subscribe to real-time profile updates ────────────────────────────────
  const subscribeProfile = useCallback((uid: string) => {
    // Unsubscribe any previous listener
    if (profileUnsubRef.current) {
      profileUnsubRef.current()
      profileUnsubRef.current = null
    }

    const ref = doc(db, APP_NAME, ROOT_DOC, 'users', uid)
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        setUserProfile(snap.data() as UserProfile)
      } else {
        setUserProfile(null)
      }
    }, () => {
      // Silently ignore listener errors
    })
    profileUnsubRef.current = unsub
  }, [])

  // ── onAuthStateChanged listener ───────────────────────────────────────────
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user)

      if (!user) {
        setUserProfile(null)
        setLoading(false)
        profileUidRef.current = null
        if (profileUnsubRef.current) {
          profileUnsubRef.current()
          profileUnsubRef.current = null
        }
        return
      }

      // Start real-time profile listener
      subscribeProfile(user.uid)
      profileUidRef.current = user.uid

      // Initial fetch to set profile quickly (listener may lag on cold start)
      const profile = await fetchUserProfile(user.uid)
      if (profile) setUserProfile(profile)
      setLoading(false)
    })

    return () => {
      unsub()
      if (profileUnsubRef.current) profileUnsubRef.current()
    }
  }, [subscribeProfile])

  const value: AuthContextValue = {
    firebaseUser,
    userProfile,
    loading,
    refreshProfile,
    updateProfile,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
