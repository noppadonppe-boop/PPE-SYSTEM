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

const userDocRef  = (uid: string) => doc(db, APP_NAME, ROOT_DOC, 'users', uid)
const metaDocRef  = ()            => doc(db, APP_NAME, ROOT_DOC, 'appMeta', 'config')
const logColRef   = ()            => collection(db, APP_NAME, ROOT_DOC, 'activityLogs')

// ─── Session helpers (no expiry — session persists until explicit logout) ─────
export function setSessionExpiry(): void {
  // No-op: session no longer expires automatically
}

export function isSessionExpired(): boolean {
  return false // Session never expires; logout is manual only
}

export function clearSession(): void {
  // No-op: nothing to clear
}

export function getRemainingMinutes(): number {
  return Infinity // Session has no time limit
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
    role:             isFirstUser ? ['MasterAdmin', 'ppeAdmin'] : ['Requestor'],
    status:           isFirstUser ? 'approved' : 'pending',
    assignedProjects: [],
    createdAt:        Timestamp.now(),
    photoURL:         firebaseUser.photoURL ?? undefined,
    isFirstUser,
  }

  await setDoc(userDocRef(firebaseUser.uid), profile)
  return profile
}

// ─── Update profile photo and name on each login ─────────────────────────────
async function syncProfileOnLogin(
  uid: string,
  updates: { photoURL?: string | null; firstName?: string; lastName?: string }
): Promise<void> {
  try {
    const patch: Record<string, unknown> = {}
    if (updates.photoURL !== undefined) patch.photoURL = updates.photoURL ?? ''
    if (updates.firstName) patch.firstName = updates.firstName
    if (updates.lastName !== undefined) patch.lastName = updates.lastName
    if (Object.keys(patch).length > 0) {
      await updateDoc(userDocRef(uid), patch)
    }
  } catch {
    // non-blocking
  }
}

// ─── Login with Email/Password ────────────────────────────────────────────────
export async function loginWithEmail(email: string, password: string): Promise<UserProfile> {
  // CRITICAL: set session expiry IMMEDIATELY before any awaits
  const cred = await signInWithEmailAndPassword(auth, email, password)
  setSessionExpiry()

  const profile = await fetchUserProfile(cred.user.uid)
  if (!profile) throw new Error('profile-not-found')

  // Sync photoURL from Firebase Auth on every login
  await syncProfileOnLogin(cred.user.uid, { photoURL: cred.user.photoURL })

  logActivity({ uid: cred.user.uid, email, action: 'LOGIN' })
  return { ...profile, photoURL: cred.user.photoURL ?? profile.photoURL }
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
    // Sync latest name + photo from Google on every login
    const nameParts = (cred.user.displayName ?? '').split(' ')
    const firstName = nameParts[0] || profile.firstName
    const lastName  = nameParts.slice(1).join(' ') || profile.lastName
    await syncProfileOnLogin(cred.user.uid, {
      photoURL: cred.user.photoURL,
      firstName,
      lastName,
    })
    profile = { ...profile, photoURL: cred.user.photoURL ?? profile.photoURL, firstName, lastName }
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

export async function updateUserPosition(
  targetUid: string,
  position: string
): Promise<void> {
  await updateDoc(userDocRef(targetUid), { position })
}

// ─── Self: update own profile (name, position, photoURL) ─────────────────────
export async function updateOwnProfile(
  uid: string,
  data: { firstName?: string; lastName?: string; position?: string; photoURL?: string }
): Promise<void> {
  const patch: Record<string, unknown> = {}
  if (data.firstName  !== undefined) patch.firstName  = data.firstName
  if (data.lastName   !== undefined) patch.lastName   = data.lastName
  if (data.position   !== undefined) patch.position   = data.position
  if (data.photoURL   !== undefined) patch.photoURL   = data.photoURL
  if (Object.keys(patch).length > 0) {
    await updateDoc(userDocRef(uid), patch)
  }
}
