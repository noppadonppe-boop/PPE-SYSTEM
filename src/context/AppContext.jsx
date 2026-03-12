import React, { createContext, useContext, useState, useEffect } from 'react'
import {
  collection, doc, onSnapshot,
  setDoc, updateDoc, deleteDoc,
} from 'firebase/firestore'
import { db } from '../firebase/config'
import { seedFirestore } from '../firebase/seed'

// ─── Firestore path helpers ───────────────────────────────────────────────────
const ROOT_COL = 'PPE System'
const ROOT_DOC = 'root'
const subCol = (name) => collection(db, ROOT_COL, ROOT_DOC, name)
const subDocRef = (name, id) => doc(db, ROOT_COL, ROOT_DOC, name, id)

// ─── ROLES ───────────────────────────────────────────────────────────────────

export const ROLES = [
  { id: 'Requestor', label: 'Requestor' },
  { id: 'ppeLead',    label: 'ppeLead' },
  { id: 'ppeManager', label: 'ppeManager' },
  { id: 'ppeTeam',    label: 'ppeTeam' },
  { id: 'ppeAdmin',   label: 'ppeAdmin' },
  { id: 'GM/MD',      label: 'GM/MD' },
]

// ─── CONTEXT ─────────────────────────────────────────────────────────────────

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [currentRole, setCurrentRole] = useState('ppeManager')

  // Live data from Firestore
  const [unitRates,    setUnitRates]    = useState([])
  const [teamRates,    setTeamRates]    = useState([])
  const [rfqs,         setRfqs]         = useState([])
  const [workOrders,   setWorkOrders]   = useState([])
  const [dailyReports, setDailyReports] = useState([])

  // Loading / error state
  const [loading, setLoading] = useState(true)
  const [dbError, setDbError] = useState(null)

  // ── Real-time listeners ─────────────────────────────────────────────────
  useEffect(() => {
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
          // If collection is empty / not found, still mark as loaded
          markLoaded()
          // Only set error if it's a real permission/network issue
          if (err.code !== 'permission-denied') setDbError(err.message)
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
  }, [])

  // ── Auto-seed: if Firestore collections come back empty, seed them ───────
  useEffect(() => {
    if (loading) return
    if (
      unitRates.length === 0 &&
      teamRates.length === 0 &&
      rfqs.length === 0
    ) {
      console.log('Collections empty — seeding initial data...')
      seedFirestore().catch(console.error)
    }
  }, [loading]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Unit Rate CRUD ──────────────────────────────────────────────────────
  const addUnitRate = async (data) => {
    const id = `ur-${Date.now()}`
    await setDoc(subDocRef('unitRates', id), { id, ...data })
  }
  const updateUnitRate = async (id, data) => {
    await updateDoc(subDocRef('unitRates', id), data)
  }
  const deleteUnitRate = async (id) => {
    await deleteDoc(subDocRef('unitRates', id))
  }

  // ── Team Rate CRUD ──────────────────────────────────────────────────────
  const addTeamRate = async (data) => {
    const id = `tr-${Date.now()}`
    await setDoc(subDocRef('teamRates', id), { id, ...data })
  }
  const updateTeamRate = async (id, data) => {
    await updateDoc(subDocRef('teamRates', id), data)
  }
  const deleteTeamRate = async (id) => {
    await deleteDoc(subDocRef('teamRates', id))
  }

  // ── RFQ CRUD ────────────────────────────────────────────────────────────
  const addRfq = async (data) => {
    const id = `rfq-${Date.now()}`
    await setDoc(subDocRef('rfqs', id), {
      id,
      wbsItems: [],
      costItems: [],
      assignedEngineers: [],
      totalPlannedMH: 0,
      totalCost: 0,
      approvalNote: '',
      ...data,
    })
  }
  const updateRfq = async (id, data) => {
    await updateDoc(subDocRef('rfqs', id), data)
  }
  const deleteRfq = async (id) => {
    await deleteDoc(subDocRef('rfqs', id))
  }

  // ── Work Order CRUD ─────────────────────────────────────────────────────
  const addWorkOrder = async (data) => {
    const id = `wo-${Date.now()}`
    await setDoc(subDocRef('workOrders', id), { id, ...data })
  }
  const updateWorkOrder = async (id, data) => {
    await updateDoc(subDocRef('workOrders', id), data)
  }

  // ── Daily Report CRUD ───────────────────────────────────────────────────
  const addDailyReport = async (data) => {
    const id = `dr-${Date.now()}`
    await setDoc(subDocRef('dailyReports', id), { id, ...data })
  }
  const updateDailyReport = async (id, data) => {
    await updateDoc(subDocRef('dailyReports', id), data)
  }

  // ── Derived helpers ─────────────────────────────────────────────────────
  const getTeamMemberById = (id) => teamRates.find(t => t.id === id)

  const getNotifications = () => {
    const notes = []

    rfqs.forEach(rfq => {
      if (rfq.status === 'Pending Lead' && (currentRole === 'ppeLead' || currentRole === 'ppeAdmin')) {
        notes.push({
          id: `n-${rfq.id}-lead`,
          title: 'Manhour Plan Required',
          message: `${rfq.requestWorkNo} — ${rfq.client}`,
          detail: rfq.urgency === 'Urgent' ? 'Urgent priority — action needed immediately' : 'Awaiting your WBS & engineer assignment',
          link: '/rfq', type: 'action',
          priority: rfq.urgency === 'Urgent' ? 'high' : 'medium', module: 'RFQ',
        })
      }
      if (rfq.status === 'Pending Manager' && (currentRole === 'ppeManager' || currentRole === 'ppeAdmin')) {
        notes.push({
          id: `n-${rfq.id}-manager`,
          title: 'Cost Estimate Required',
          message: `${rfq.requestWorkNo} — ${rfq.client}`,
          detail: `${rfq.totalPlannedMH} MH planned — ready for cost estimation`,
          link: '/rfq', type: 'action',
          priority: rfq.urgency === 'Urgent' ? 'high' : 'medium', module: 'RFQ',
        })
      }
      if (rfq.status === 'Pending Approval' && (currentRole === 'Requestor' || currentRole === 'GM/MD')) {
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
      if (['ppeLead', 'ppeManager', 'ppeAdmin'].includes(currentRole)) {
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
      if (wo.status === 'Pending Schedule' && ['ppeLead', 'ppeManager', 'ppeAdmin'].includes(currentRole)) {
        notes.push({
          id: `n-${wo.id}-schedule`,
          title: 'Schedule Not Set',
          message: `${wo.requestWorkNo} — ${wo.client}`,
          detail: 'Work order is approved but start/finish dates are missing',
          link: '/work-orders', type: 'action', priority: 'medium', module: 'Work Order',
        })
      }
      if (wo.status === 'Ongoing' && ['ppeTeam', 'ppeLead'].includes(currentRole)) {
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
      if (wo.status === 'Ongoing' && ['ppeManager', 'ppeAdmin'].includes(currentRole)) {
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

  const value = {
    currentRole, setCurrentRole,
    unitRates, addUnitRate, updateUnitRate, deleteUnitRate,
    teamRates, addTeamRate, updateTeamRate, deleteTeamRate,
    rfqs, addRfq, updateRfq, deleteRfq,
    workOrders, addWorkOrder, updateWorkOrder,
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
