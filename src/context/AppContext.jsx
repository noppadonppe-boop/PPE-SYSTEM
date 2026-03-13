import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import {
  collection, doc, onSnapshot,
  setDoc, updateDoc, deleteDoc, serverTimestamp,
} from 'firebase/firestore'
import { db } from '../firebase/config'
import { useAuth } from './AuthContext'

// ─── Firestore path helpers ───────────────────────────────────────────────────
const ROOT_COL = 'PPE System'
const ROOT_DOC = 'root'
const subCol = (name) => collection(db, ROOT_COL, ROOT_DOC, name)
const subDocRef = (name, id) => doc(db, ROOT_COL, ROOT_DOC, name, id)

// Firestore: no undefined, no invalid nested entities, no base64/binary strings > 900 KB
const FIRESTORE_STRING_MAX = 900_000 // ~900 KB safety limit (Firestore doc max is 1 MB)

function firestoreSafe(obj) {
  if (obj === undefined) return undefined
  if (obj === null) return null
  if (typeof obj === 'number' && (Number.isNaN(obj) || !Number.isFinite(obj))) return null
  if (typeof obj === 'boolean') return obj
  if (typeof obj === 'number') return obj
  if (typeof obj === 'string') {
    // Strip base64 data URLs or any oversized string to prevent exceeding doc size limit
    if (obj.startsWith('data:') || obj.length > FIRESTORE_STRING_MAX) return ''
    return obj
  }
  if (obj instanceof Date) return obj.toISOString()
  if (Array.isArray(obj)) {
    const out = []
    for (const item of obj) {
      const v = firestoreSafe(item)
      if (v !== undefined) out.push(v)
    }
    return out
  }
  if (typeof obj === 'object' && obj !== null && !(obj instanceof Date)) {
    const out = {}
    for (const [k, v] of Object.entries(obj)) {
      if (v === undefined) continue
      const safe = firestoreSafe(v)
      if (safe !== undefined) out[k] = safe
    }
    return out
  }
  return undefined
}


// ─── CONTEXT ─────────────────────────────────────────────────────────────────

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const { firebaseUser, loading: authLoading, userProfile } = useAuth()

  // Duplicate-save guard: track in-flight doc saves by key
  const savingRef = useRef(new Set())

  const guardedUpdate = useCallback(async (key, fn) => {
    if (savingRef.current.has(key)) return // Already saving — ignore
    savingRef.current.add(key)
    try {
      await fn()
    } finally {
      savingRef.current.delete(key)
    }
  }, [])

  // Live data from Firestore
  const [unitRates,    setUnitRates]    = useState([])
  const [teamRates,    setTeamRates]    = useState([])
  const [rfqs,         setRfqs]         = useState([])
  const [workOrders,   setWorkOrders]   = useState([])
  const [dailyReports, setDailyReports] = useState([])

  // Loading / error state — start as true, resolve after auth + data ready
  const [loading, setLoading] = useState(true)
  const [dbError, setDbError] = useState(null)

  // ── Real-time listeners — only open AFTER auth is confirmed ────────────
  useEffect(() => {
    // Still waiting for auth to initialise
    if (authLoading) return

    // No user logged in → clear data, mark as loaded (not an error)
    if (!firebaseUser) {
      setUnitRates([])
      setTeamRates([])
      setRfqs([])
      setWorkOrders([])
      setDailyReports([])
      setDbError(null)
      setLoading(false)
      return
    }

    // User is authenticated — open Firestore listeners
    setLoading(true)
    setDbError(null)
    let resolved = 0
    const total = 5
    const markLoaded = () => { resolved++; if (resolved >= total) setLoading(false) }

    const snap = (colName, setter) =>
      onSnapshot(
        subCol(colName),
        (snapshot) => {
          setter(snapshot.docs.map(d => ({ id: d.id, ...d.data() })))
          markLoaded()
        },
        (err) => {
          console.error(`Firestore [${colName}] error:`, err)
          markLoaded()
          setDbError(`[${colName}] ${err.message}`)
        }
      )

    const unsubs = [
      snap('unitRates',    setUnitRates),
      snap('teamRates',    setTeamRates),
      snap('rfqs',         setRfqs),
      snap('workOrders',   setWorkOrders),
      snap('dailyReports', setDailyReports),
    ]

    return () => unsubs.forEach(u => u())
  }, [firebaseUser, authLoading])

  // Merge safe payload with Firestore sentinel fields (serverTimestamp can't go through firestoreSafe)
  const safeMerge = (data, extra = {}) => {
    const safe = firestoreSafe(data)
    return safe ? { ...safe, ...extra } : null
  }

  // ── Unit Rate CRUD ──────────────────────────────────────────────────────
  const addUnitRate = async (data) => {
    const id = `ur-${Date.now()}`
    await guardedUpdate(`add-ur-${id}`, async () => {
      const payload = firestoreSafe({ id, ...data })
      if (payload) await setDoc(subDocRef('unitRates', id), payload)
    })
  }
  const updateUnitRate = async (id, data) => {
    await guardedUpdate(`upd-ur-${id}`, async () => {
      const payload = safeMerge(data, { editingBy: null, updatedAt: serverTimestamp() })
      if (payload) await updateDoc(subDocRef('unitRates', id), payload)
    })
  }
  const deleteUnitRate = async (id) => {
    await deleteDoc(subDocRef('unitRates', id))
  }

  // ── Team Rate CRUD ──────────────────────────────────────────────────────
  const addTeamRate = async (data) => {
    const id = `tr-${Date.now()}`
    await guardedUpdate(`add-tr-${id}`, async () => {
      const payload = firestoreSafe({ id, ...data })
      if (payload) await setDoc(subDocRef('teamRates', id), payload)
    })
  }
  const updateTeamRate = async (id, data) => {
    await guardedUpdate(`upd-tr-${id}`, async () => {
      const payload = safeMerge(data, { editingBy: null, updatedAt: serverTimestamp() })
      if (payload) await updateDoc(subDocRef('teamRates', id), payload)
    })
  }
  const deleteTeamRate = async (id) => {
    await deleteDoc(subDocRef('teamRates', id))
  }

  // ── RFQ CRUD ────────────────────────────────────────────────────────────
  const addRfq = async (data) => {
    const id = `rfq-${Date.now()}`
    await guardedUpdate(`add-rfq-${id}`, async () => {
      const raw = {
        id,
        wbsItems: [],
        costItems: [],
        assignedEngineers: [],
        totalPlannedMH: 0,
        totalCost: 0,
        approvalNote: '',
        ...data,
      }
      const payload = firestoreSafe(raw)
      if (!payload) return
      await setDoc(subDocRef('rfqs', id), payload)
    })
  }
  const updateRfq = async (id, data) => {
    await guardedUpdate(`upd-rfq-${id}`, async () => {
      const payload = safeMerge(data, { editingBy: null, updatedAt: serverTimestamp() })
      if (payload) await updateDoc(subDocRef('rfqs', id), payload)
    })
  }
  const deleteRfq = async (id) => {
    await deleteDoc(subDocRef('rfqs', id))
  }

  // ── Work Order CRUD ─────────────────────────────────────────────────────
  const addWorkOrder = async (data) => {
    const id = `wo-${Date.now()}`
    await guardedUpdate(`add-wo-${id}`, async () => {
      const payload = firestoreSafe({ id, ...data })
      if (payload) await setDoc(subDocRef('workOrders', id), payload)
    })
  }
  const updateWorkOrder = async (id, data) => {
    await guardedUpdate(`upd-wo-${id}`, async () => {
      const payload = safeMerge(data, { editingBy: null, updatedAt: serverTimestamp() })
      if (payload) await updateDoc(subDocRef('workOrders', id), payload)
    })
  }
  const deleteWorkOrder = async (id) => {
    await deleteDoc(subDocRef('workOrders', id))
  }

  // ── Daily Report CRUD ───────────────────────────────────────────────────
  const addDailyReport = async (data) => {
    const id = `dr-${Date.now()}`
    await guardedUpdate(`add-dr-${id}`, async () => {
      const payload = firestoreSafe({ id, ...data })
      if (payload) await setDoc(subDocRef('dailyReports', id), payload)
    })
  }
  const updateDailyReport = async (id, data) => {
    await guardedUpdate(`upd-dr-${id}`, async () => {
      const payload = safeMerge(data, { editingBy: null, updatedAt: serverTimestamp() })
      if (payload) await updateDoc(subDocRef('dailyReports', id), payload)
    })
  }

  // ── Derived helpers ─────────────────────────────────────────────────────
  const getTeamMemberById = (id) => teamRates.find(t => t.id === id)

  const getNotifications = () => {
    // Use all actual user roles (union) — no single role simulator
    const userRoles = userProfile?.role ?? []
    const hasRole = (roles) => roles.some(r => userRoles.includes(r))

    const notes = []

    rfqs.forEach(rfq => {
      if (rfq.status === 'Pending Lead' && hasRole(['ppeLead', 'ppeAdmin', 'MasterAdmin'])) {
        notes.push({
          id: `n-${rfq.id}-lead`,
          title: 'Manhour Plan Required',
          message: `${rfq.requestWorkNo} — ${rfq.client}`,
          detail: rfq.urgency === 'Urgent' ? 'Urgent priority — action needed immediately' : 'Awaiting your WBS & engineer assignment',
          link: '/rfq', type: 'action',
          priority: rfq.urgency === 'Urgent' ? 'high' : 'medium', module: 'RFQ',
        })
      }
      if (rfq.status === 'Pending Manager' && hasRole(['ppeManager', 'ppeAdmin', 'MasterAdmin'])) {
        notes.push({
          id: `n-${rfq.id}-manager`,
          title: 'Cost Estimate Required',
          message: `${rfq.requestWorkNo} — ${rfq.client}`,
          detail: `${rfq.totalPlannedMH} MH planned — ready for cost estimation`,
          link: '/rfq', type: 'action',
          priority: rfq.urgency === 'Urgent' ? 'high' : 'medium', module: 'RFQ',
        })
      }
      if (rfq.status === 'Pending Approval' && hasRole(['Requestor', 'GM/MD', 'ppeAdmin', 'MasterAdmin'])) {
        notes.push({
          id: `n-${rfq.id}-approval`,
          title: 'Approval Required',
          message: `${rfq.requestWorkNo} — ${rfq.client}`,
          detail: `Cost estimate ฿${rfq.totalCost > 0 ? new Intl.NumberFormat('th-TH').format(rfq.totalCost) : '—'} awaiting sign-off`,
          link: '/rfq', type: 'approval', priority: 'high', module: 'RFQ',
        })
      }
    })

    const existingRfqIds = new Set(workOrders.map(w => w.rfqId))
    rfqs.filter(r => r.status === 'Approved' && !existingRfqIds.has(r.id)).forEach(rfq => {
      if (hasRole(['ppeLead', 'ppeManager', 'ppeAdmin', 'MasterAdmin'])) {
        notes.push({
          id: `n-${rfq.id}-wo`,
          title: 'Work Order Not Created',
          message: `${rfq.requestWorkNo} — ${rfq.client}`,
          detail: 'RFQ approved but no work order exists yet',
          link: '/work-orders', type: 'warning', priority: 'high', module: 'Work Order',
        })
      }
    })

    workOrders.forEach(wo => {
      if (wo.status === 'Pending Schedule' && hasRole(['ppeLead', 'ppeManager', 'ppeAdmin', 'MasterAdmin'])) {
        notes.push({
          id: `n-${wo.id}-schedule`,
          title: 'Schedule Not Set',
          message: `${wo.requestWorkNo} — ${wo.client}`,
          detail: 'Work order is approved but start/finish dates are missing',
          link: '/work-orders', type: 'action', priority: 'medium', module: 'Work Order',
        })
      }
      if (wo.status === 'Ongoing' && hasRole(['ppeTeam', 'ppeLead', 'ppeAdmin', 'MasterAdmin'])) {
        const today = new Date().toISOString().split('T')[0]
        const hasReportToday = dailyReports.filter(d => d.workOrderId === wo.id).some(d => d.reportDate === today)
        if (!hasReportToday) {
          notes.push({
            id: `n-${wo.id}-dr`,
            title: 'Daily Report Pending',
            message: `${wo.requestWorkNo} — ${wo.client}`,
            detail: 'No daily report submitted for today yet',
            link: '/daily-report', type: 'info', priority: 'medium', module: 'Daily Report',
          })
        }
      }
      if (wo.status === 'Ongoing' && hasRole(['ppeManager', 'ppeAdmin', 'MasterAdmin'])) {
        const latestDr = [...dailyReports]
          .filter(d => d.workOrderId === wo.id)
          .sort((a, b) => b.reportDate.localeCompare(a.reportDate))[0]
        if (latestDr && latestDr.balanceMH < 0) {
          notes.push({
            id: `n-${wo.id}-overbudget`,
            title: 'Over Budget — Manhours Exceeded',
            message: `${wo.requestWorkNo} — ${wo.client}`,
            detail: `Balance MH: ${latestDr.balanceMH} (${Math.abs(latestDr.balanceMH)} MH over planned)`,
            link: '/report-summary', type: 'alert', priority: 'high', module: 'Work Order',
          })
        }
      }
    })

    const priorityOrder = { high: 0, medium: 1, low: 2 }
    return notes.sort((a, b) => (priorityOrder[a.priority] ?? 2) - (priorityOrder[b.priority] ?? 2))
  }

  // ── Role helpers (multi-role union) ────────────────────────────────────
  // userRoles = all roles the logged-in user has
  const userRoles = userProfile?.role ?? []

  // userHasRole(roles) = true if user has AT LEAST ONE of the given roles
  const userHasRole = useCallback((roles) => {
    if (!roles || roles.length === 0) return true
    return roles.some(r => userRoles.includes(r))
  }, [userRoles])

  // currentRole — highest-priority single role for backward compat with pages
  // Priority order (highest first)
  const ROLE_PRIORITY = ['MasterAdmin', 'ppeAdmin', 'GM/MD', 'ppeManager', 'ppeLead', 'ppeTeam', 'Requestor']
  const currentRole = ROLE_PRIORITY.find(r => userRoles.includes(r)) ?? userRoles[0] ?? 'Requestor'

  const value = {
    currentRole,
    userRoles,
    userHasRole,
    unitRates, addUnitRate, updateUnitRate, deleteUnitRate,
    teamRates, addTeamRate, updateTeamRate, deleteTeamRate,
    rfqs, addRfq, updateRfq, deleteRfq,
    workOrders, addWorkOrder, updateWorkOrder, deleteWorkOrder,
    dailyReports, addDailyReport, updateDailyReport,
    getTeamMemberById,
    getNotifications,
    loading,
    dbError,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export const useApp = () => {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
