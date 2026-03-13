/**
 * useDocumentLock — optimistic locking for concurrent edit protection.
 *
 * How it works:
 * - When a user opens an edit form, call `acquireLock(docId)`.
 *   This writes `editingBy: { uid, name, acquiredAt }` to the Firestore document.
 * - While the lock is held, a real-time listener watches the document.
 *   If another user saves (removing or replacing the lock), `conflictDetected` becomes true.
 * - Call `releaseLock(docId)` when closing the form (clears the `editingBy` field).
 * - `isLockedByOther(doc)` returns true+info if someone else currently holds the lock.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { doc, onSnapshot, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase/config'
import { useAuth } from '../context/AuthContext'

const ROOT_COL = 'PPE System'
const ROOT_DOC = 'root'
const LOCK_TTL_MS = 5 * 60 * 1000 // 5 minutes — stale lock expiry

export function useDocumentLock(collectionName) {
  const { userProfile, firebaseUser } = useAuth()
  const [lockState, setLockState] = useState({
    lockedDocId: null,
    conflictDetected: false,
    conflictUser: null,
  })

  const listenerRef  = useRef(null)
  const lockDocIdRef = useRef(null)

  // Check if a document is locked by someone other than the current user
  const isLockedByOther = useCallback((docData) => {
    if (!docData?.editingBy) return { locked: false }
    const lock = docData.editingBy
    if (lock.uid === firebaseUser?.uid) return { locked: false }

    // Check TTL — if stale lock, treat as unlocked
    if (lock.acquiredAt) {
      const acquiredMs = lock.acquiredAt?.toMillis?.() ?? (lock.acquiredAt?.seconds * 1000)
      if (acquiredMs && Date.now() - acquiredMs > LOCK_TTL_MS) {
        return { locked: false }
      }
    }

    return { locked: true, lockedBy: lock.name ?? lock.uid, lockedAt: lock.acquiredAt }
  }, [firebaseUser?.uid])

  // Acquire lock on a document
  const acquireLock = useCallback(async (docId) => {
    if (!firebaseUser || !docId) return

    // Release previous lock if different doc
    if (lockDocIdRef.current && lockDocIdRef.current !== docId) {
      await releaseLock(lockDocIdRef.current)
    }

    lockDocIdRef.current = docId
    const ref = doc(db, ROOT_COL, ROOT_DOC, collectionName, docId)

    try {
      await updateDoc(ref, {
        editingBy: {
          uid:        firebaseUser.uid,
          name:       `${userProfile?.firstName ?? ''} ${userProfile?.lastName ?? ''}`.trim() || firebaseUser.email,
          acquiredAt: serverTimestamp(),
        },
      })
    } catch {
      // Document might not exist yet — ok
    }

    // Watch for conflicts: if editingBy changes to someone else, flag conflict
    if (listenerRef.current) listenerRef.current()
    listenerRef.current = onSnapshot(ref, (snap) => {
      if (!snap.exists()) return
      const data = snap.data()
      const lock = data?.editingBy
      if (lock && lock.uid !== firebaseUser.uid) {
        setLockState({
          lockedDocId: docId,
          conflictDetected: true,
          conflictUser: lock.name ?? lock.uid,
        })
      }
    })

    setLockState({ lockedDocId: docId, conflictDetected: false, conflictUser: null })
  }, [firebaseUser, userProfile, collectionName])

  // Release lock on a document
  const releaseLock = useCallback(async (docId) => {
    if (!docId) return
    if (listenerRef.current) {
      listenerRef.current()
      listenerRef.current = null
    }
    lockDocIdRef.current = null
    setLockState({ lockedDocId: null, conflictDetected: false, conflictUser: null })

    const ref = doc(db, ROOT_COL, ROOT_DOC, collectionName, docId)
    try {
      await updateDoc(ref, { editingBy: null })
    } catch {
      // OK if doc doesn't exist
    }
  }, [collectionName])

  // Clear conflict flag (user acknowledged)
  const clearConflict = useCallback(() => {
    setLockState(s => ({ ...s, conflictDetected: false, conflictUser: null }))
  }, [])

  // Auto-release on unmount
  useEffect(() => {
    return () => {
      if (lockDocIdRef.current) {
        releaseLock(lockDocIdRef.current).catch(() => {})
      }
      if (listenerRef.current) {
        listenerRef.current()
      }
    }
  }, [releaseLock])

  return {
    acquireLock,
    releaseLock,
    clearConflict,
    isLockedByOther,
    lockedDocId:       lockState.lockedDocId,
    conflictDetected:  lockState.conflictDetected,
    conflictUser:      lockState.conflictUser,
  }
}
