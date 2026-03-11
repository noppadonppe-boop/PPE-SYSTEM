import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  type User as FirebaseUser,
} from 'firebase/auth'
import {
  doc, getDoc, setDoc, updateDoc, increment,
  collection, serverTimestamp, runTransaction,
  Timestamp,
} from 'firebase/firestore'
import { auth, db } from './firebaseAuth'
import type { UserProfile, ActivityLog } from '../types/auth'

// ─── Constants ────────────────────────────────────────────────────────────────
const APP_NAME       = 'PPE System'
const ROOT_DOC       = 'root'
const SESSION_KEY    = 'ppe_session_expires'
const SESSION_MS     = 60 * 60 * 1000 // 1 hour

const userDocRef  = (uid: string) => doc(db, APP_NAME, ROOT_DOC, 'users', uid)
const metaDocRef  = ()            => doc(db, APP_NAME, ROOT_DOC, 'appMeta', 'config')
const logColRef   = ()            => collection(db, APP_NAME, ROOT_DOC, 'activityLogs')

// ─── Session helpers ──────────────────────────────────────────────────────────
export function setSessionExpiry(): void {
  localStorage.setItem(SESSION_KEY, String(Date.now() + SESSION_MS))
}

export function isSessionExpired(): boolean {
  const exp = localStorage.getItem(SESSION_KEY)
  if (!exp) return true
  return Date.now() > Number(exp)
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY)
}

export function getRemainingMinutes(): number {
  const exp = localStorage.getItem(SESSION_KEY)
  if (!exp) return 0
  const ms = Number(exp) - Date.now()
  return ms <= 0 ? 0 : Math.ceil(ms / 60000)
}

// ─── Activity log (non-blocking) ─────────────────────────────────────────────
function logActivity(entry: Omit<ActivityLog, 'timestamp'>): void {
  setDoc(doc(logColRef()), { ...entry, timestamp: serverTimestamp() }).catch(() => {})
}

// ─── Fetch user profile ───────────────────────────────────────────────────────
export async function fetchUserProfile(uid: string): Promise<UserProfile | null> {
  try {
    const snap = await getDoc(userDocRef(uid))
    if (!snap.exists()) return null
    return snap.data() as UserProfile
  } catch {
    return null
  }
}

// ─── Create user profile in Firestore ────────────────────────────────────────
async function createUserProfile(
  firebaseUser: FirebaseUser,
  extra: { firstName: string; lastName: string; position: string }
): Promise<UserProfile> {
  const isFirstUser = await runTransaction(db, async (tx) => {
    const metaRef = metaDocRef()
    const metaSnap = await tx.get(metaRef)
    if (!metaSnap.exists() || !metaSnap.data().firstUserRegistered) {
      tx.set(metaRef, {
        firstUserRegistered: true,
        totalUsers: 1,
        createdAt: serverTimestamp(),
      })
      return true
    }
    tx.update(metaRef, { totalUsers: increment(1) })
    return false
  })

  const profile: UserProfile = {
    uid:              firebaseUser.uid,
    email:            firebaseUser.email ?? '',
    firstName:        extra.firstName,
    lastName:         extra.lastName,
    position:         extra.position,
    role:             isFirstUser ? ['MasterAdmin', 'ppeAdmin'] : ['Staff'],
    status:           isFirstUser ? 'approved' : 'pending',
    assignedProjects: [],
    createdAt:        Timestamp.now(),
    photoURL:         firebaseUser.photoURL ?? undefined,
    isFirstUser,
  }

  await setDoc(userDocRef(firebaseUser.uid), profile)
  return profile
}

// ─── Login with Email/Password ────────────────────────────────────────────────
export async function loginWithEmail(email: string, password: string): Promise<UserProfile> {
  // CRITICAL: set session expiry IMMEDIATELY before any awaits
  const cred = await signInWithEmailAndPassword(auth, email, password)
  setSessionExpiry()

  const profile = await fetchUserProfile(cred.user.uid)
  if (!profile) throw new Error('profile-not-found')

  logActivity({ uid: cred.user.uid, email, action: 'LOGIN' })
  return profile
}

// ─── Login with Google ────────────────────────────────────────────────────────
export async function loginWithGoogle(): Promise<UserProfile> {
  const provider = new GoogleAuthProvider()
  const cred = await signInWithPopup(auth, provider)
  setSessionExpiry() // CRITICAL: set immediately after sign-in

  let profile = await fetchUserProfile(cred.user.uid)

  if (!profile) {
    // New Google user — auto-create profile
    const nameParts = (cred.user.displayName ?? '').split(' ')
    profile = await createUserProfile(cred.user, {
      firstName: nameParts[0] ?? '',
      lastName:  nameParts.slice(1).join(' ') ?? '',
      position:  '',
    })
    logActivity({ uid: cred.user.uid, email: cred.user.email ?? '', action: 'REGISTER', meta: { method: 'google' } })
  } else {
    logActivity({ uid: cred.user.uid, email: cred.user.email ?? '', action: 'LOGIN', meta: { method: 'google' } })
  }

  return profile
}

// ─── Register with Email/Password ────────────────────────────────────────────
export async function registerWithEmail(
  email: string,
  password: string,
  firstName: string,
  lastName: string,
  position: string
): Promise<UserProfile> {
  const cred = await createUserWithEmailAndPassword(auth, email, password)
  setSessionExpiry() // CRITICAL: set immediately after sign-in

  const profile = await createUserProfile(cred.user, { firstName, lastName, position })
  logActivity({ uid: cred.user.uid, email, action: 'REGISTER', meta: { method: 'email' } })
  return profile
}

// ─── Logout ───────────────────────────────────────────────────────────────────
export async function logout(): Promise<void> {
  clearSession()
  await signOut(auth)
}

// ─── Admin: update user status/role ───────────────────────────────────────────
export async function updateUserStatus(
  targetUid: string,
  status: 'approved' | 'rejected'
): Promise<void> {
  await updateDoc(userDocRef(targetUid), { status })
}

export async function updateUserRoles(
  targetUid: string,
  roles: UserProfile['role']
): Promise<void> {
  await updateDoc(userDocRef(targetUid), { role: roles })
}
