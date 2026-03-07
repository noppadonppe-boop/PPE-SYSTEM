import React, { createContext, useContext, useState } from 'react'

// ─── MOCK DATA ──────────────────────────────────────────────────────────────

const INITIAL_UNIT_RATES = [
  { id: 'ur-1', category: 'Mechanical', task: 'Pipe Spool Fabrication', unit: 'inch-dia', min: 2.5, max: 6.0, avg: 4.0 },
  { id: 'ur-2', category: 'Mechanical', task: 'Equipment Installation', unit: 'unit', min: 8.0, max: 24.0, avg: 16.0 },
  { id: 'ur-3', category: 'Mechanical', task: 'Valve Installation', unit: 'unit', min: 1.5, max: 4.0, avg: 2.5 },
  { id: 'ur-4', category: 'Civil', task: 'Concrete Pouring', unit: 'm³', min: 3.0, max: 8.0, avg: 5.5 },
  { id: 'ur-5', category: 'Civil', task: 'Structural Steel Erection', unit: 'ton', min: 12.0, max: 28.0, avg: 20.0 },
  { id: 'ur-6', category: 'Electrical', task: 'Cable Pulling', unit: 'm', min: 0.1, max: 0.3, avg: 0.2 },
  { id: 'ur-7', category: 'Electrical', task: 'Panel Installation', unit: 'unit', min: 6.0, max: 16.0, avg: 11.0 },
  { id: 'ur-8', category: 'Instrumentation', task: 'Instrument Installation', unit: 'unit', min: 3.0, max: 8.0, avg: 5.5 },
  { id: 'ur-9', category: 'Instrumentation', task: 'Loop Check & Calibration', unit: 'loop', min: 2.0, max: 5.0, avg: 3.5 },
  { id: 'ur-10', category: 'Insulation', task: 'Pipe Insulation', unit: 'm²', min: 1.0, max: 2.5, avg: 1.8 },
]

const INITIAL_TEAM_RATES = [
  { id: 'tr-1', name: 'Ahmad Fauzi', position: 'Senior Engineer', ratePerHour: 85000 },
  { id: 'tr-2', name: 'Budi Santoso', position: 'Engineer', ratePerHour: 65000 },
  { id: 'tr-3', name: 'Citra Dewi', position: 'Junior Engineer', ratePerHour: 45000 },
  { id: 'tr-4', name: 'Dian Purnama', position: 'Senior Engineer', ratePerHour: 80000 },
  { id: 'tr-5', name: 'Eko Prasetyo', position: 'Lead Engineer', ratePerHour: 110000 },
  { id: 'tr-6', name: 'Fitri Handayani', position: 'Engineer', ratePerHour: 60000 },
]

const INITIAL_RFQS = [
  {
    id: 'rfq-001',
    requestWorkNo: 'RWN-2024-001',
    client: 'CMG Internal',
    type: 'CMG',
    urgency: 'High',
    details: 'Compressor skid mechanical installation at Train 2 area.',
    status: 'Pending Lead',
    submittedBy: 'Requestor',
    submittedAt: '2024-03-01',
    wbsItems: [],
    costItems: [],
    assignedEngineers: [],
    totalPlannedMH: 0,
    totalCost: 0,
    approvalNote: '',
  },
  {
    id: 'rfq-002',
    requestWorkNo: 'RWN-2024-002',
    client: 'PT Pertamina Gas',
    type: 'External',
    urgency: 'Normal',
    details: 'Instrumentation loop check for new metering station.',
    status: 'Pending Manager',
    submittedBy: 'Requestor',
    submittedAt: '2024-03-05',
    wbsItems: [
      { id: 'wbs-1', task: 'Loop Check & Calibration', unit: 'loop', qty: 24, difficulty: 'avg', unitMH: 3.5, totalMH: 84 },
      { id: 'wbs-2', task: 'Instrument Installation', unit: 'unit', qty: 12, difficulty: 'max', unitMH: 8.0, totalMH: 96 },
    ],
    costItems: [],
    assignedEngineers: ['tr-1', 'tr-2'],
    totalPlannedMH: 180,
    totalCost: 0,
    approvalNote: '',
  },
  {
    id: 'rfq-003',
    requestWorkNo: 'RWN-2024-003',
    client: 'PT Medco Energi',
    type: 'External',
    urgency: 'Urgent',
    details: 'Structural steel erection for new flare stack foundation.',
    status: 'Pending Approval',
    submittedBy: 'Requestor',
    submittedAt: '2024-02-20',
    wbsItems: [
      { id: 'wbs-3', task: 'Structural Steel Erection', unit: 'ton', qty: 15, difficulty: 'avg', unitMH: 20.0, totalMH: 300 },
    ],
    costItems: [
      { id: 'ci-1', type: 'Direct', description: 'Materials', amount: 45000000 },
      { id: 'ci-2', type: 'Indirect', description: 'Mobilization', amount: 8000000 },
    ],
    assignedEngineers: ['tr-5', 'tr-1'],
    totalPlannedMH: 300,
    totalCost: 79500000,
    approvalNote: '',
  },
]

const INITIAL_WORK_ORDERS = [
  {
    id: 'wo-001',
    rfqId: 'rfq-003',
    requestWorkNo: 'RWN-2024-003',
    client: 'PT Medco Energi',
    planStart: '2024-03-10',
    planFinish: '2024-04-10',
    status: 'Ongoing',
    assignedTeam: ['tr-5', 'tr-1'],
    totalPlannedMH: 300,
  },
]

const INITIAL_DAILY_REPORTS = [
  {
    id: 'dr-001',
    workOrderId: 'wo-001',
    requestWorkNo: 'RWN-2024-003',
    reportDate: '2024-03-10',
    submittedBy: 'tr-5',
    progressToday: 10,
    cumulativeProgress: 10,
    spentMHToday: 16,
    cumulativeSpentMH: 16,
    balanceMH: 284,
    isLeaveAbsent: false,
    notes: 'Mobilization and site preparation completed.',
  },
  {
    id: 'dr-002',
    workOrderId: 'wo-001',
    requestWorkNo: 'RWN-2024-003',
    reportDate: '2024-03-11',
    submittedBy: 'tr-1',
    progressToday: 8,
    cumulativeProgress: 18,
    spentMHToday: 14,
    cumulativeSpentMH: 30,
    balanceMH: 270,
    isLeaveAbsent: false,
    notes: 'Foundation bolt installation commenced.',
  },
]

// ─── ROLES ──────────────────────────────────────────────────────────────────

export const ROLES = [
  { id: 'Requestor', label: 'Requestor' },
  { id: 'ppeLead', label: 'PPE Lead' },
  { id: 'ppeManager', label: 'PPE Manager' },
  { id: 'ppeTeam', label: 'PPE Team' },
  { id: 'ppeAdmin', label: 'PPE Admin' },
  { id: 'GM/MD', label: 'GM / MD' },
]

// ─── CONTEXT ─────────────────────────────────────────────────────────────────

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [currentRole, setCurrentRole] = useState('ppeManager')
  const [unitRates, setUnitRates]     = useState(INITIAL_UNIT_RATES)
  const [teamRates, setTeamRates]     = useState(INITIAL_TEAM_RATES)
  const [rfqs, setRfqs]               = useState(INITIAL_RFQS)
  const [workOrders, setWorkOrders]   = useState(INITIAL_WORK_ORDERS)
  const [dailyReports, setDailyReports] = useState(INITIAL_DAILY_REPORTS)

  // ── Unit Rate CRUD ─────────────────────────────────────────────────────
  const addUnitRate = (data) => {
    setUnitRates(prev => [...prev, { id: `ur-${Date.now()}`, ...data }])
  }
  const updateUnitRate = (id, data) => {
    setUnitRates(prev => prev.map(r => r.id === id ? { ...r, ...data } : r))
  }
  const deleteUnitRate = (id) => {
    setUnitRates(prev => prev.filter(r => r.id !== id))
  }

  // ── Team Rate CRUD ─────────────────────────────────────────────────────
  const addTeamRate = (data) => {
    setTeamRates(prev => [...prev, { id: `tr-${Date.now()}`, ...data }])
  }
  const updateTeamRate = (id, data) => {
    setTeamRates(prev => prev.map(r => r.id === id ? { ...r, ...data } : r))
  }
  const deleteTeamRate = (id) => {
    setTeamRates(prev => prev.filter(r => r.id !== id))
  }

  // ── RFQ CRUD ────────────────────────────────────────────────────────────
  const addRfq = (data) => {
    setRfqs(prev => [...prev, {
      id: `rfq-${Date.now()}`,
      wbsItems: [],
      costItems: [],
      assignedEngineers: [],
      totalPlannedMH: 0,
      totalCost: 0,
      approvalNote: '',
      ...data,
    }])
  }
  const updateRfq = (id, data) => {
    setRfqs(prev => prev.map(r => r.id === id ? { ...r, ...data } : r))
  }

  // ── Work Order CRUD ────────────────────────────────────────────────────
  const addWorkOrder = (data) => {
    setWorkOrders(prev => [...prev, { id: `wo-${Date.now()}`, ...data }])
  }
  const updateWorkOrder = (id, data) => {
    setWorkOrders(prev => prev.map(w => w.id === id ? { ...w, ...data } : w))
  }

  // ── Daily Report CRUD ──────────────────────────────────────────────────
  const addDailyReport = (data) => {
    setDailyReports(prev => [...prev, { id: `dr-${Date.now()}`, ...data }])
  }
  const updateDailyReport = (id, data) => {
    setDailyReports(prev => prev.map(d => d.id === id ? { ...d, ...data } : d))
  }

  // ── Derived helpers ────────────────────────────────────────────────────
  const getTeamMemberById = (id) => teamRates.find(t => t.id === id)

  const getNotifications = () => {
    const notes = []

    // ── RFQ workflow notifications ────────────────────────────────────────
    rfqs.forEach(rfq => {
      // ppeLead / ppeAdmin: RFQ waiting for manhour plan
      if (rfq.status === 'Pending Lead' && (currentRole === 'ppeLead' || currentRole === 'ppeAdmin')) {
        notes.push({
          id: `n-${rfq.id}-lead`,
          title: 'Manhour Plan Required',
          message: `${rfq.requestWorkNo} — ${rfq.client}`,
          detail: rfq.urgency === 'Urgent' ? 'Urgent priority — action needed immediately' : 'Awaiting your WBS & engineer assignment',
          link: '/rfq',
          type: 'action',
          priority: rfq.urgency === 'Urgent' ? 'high' : 'medium',
          module: 'RFQ',
        })
      }

      // ppeManager / ppeAdmin: RFQ waiting for cost estimate
      if (rfq.status === 'Pending Manager' && (currentRole === 'ppeManager' || currentRole === 'ppeAdmin')) {
        notes.push({
          id: `n-${rfq.id}-manager`,
          title: 'Cost Estimate Required',
          message: `${rfq.requestWorkNo} — ${rfq.client}`,
          detail: `${rfq.totalPlannedMH} MH planned — ready for cost estimation`,
          link: '/rfq',
          type: 'action',
          priority: rfq.urgency === 'Urgent' ? 'high' : 'medium',
          module: 'RFQ',
        })
      }

      // Requestor / GM/MD: RFQ pending approval
      if (rfq.status === 'Pending Approval' && (currentRole === 'Requestor' || currentRole === 'GM/MD')) {
        notes.push({
          id: `n-${rfq.id}-approval`,
          title: 'Approval Required',
          message: `${rfq.requestWorkNo} — ${rfq.client}`,
          detail: `Cost estimate ฿${rfq.totalCost > 0 ? new Intl.NumberFormat('th-TH').format(rfq.totalCost) : '—'} awaiting sign-off`,
          link: '/rfq',
          type: 'approval',
          priority: 'high',
          module: 'RFQ',
        })
      }
    })

    // ── Work Order notifications ────────────────────────────────────────
    // Approved RFQs without a work order yet
    const existingRfqIds = new Set(workOrders.map(w => w.rfqId))
    rfqs.filter(r => r.status === 'Approved' && !existingRfqIds.has(r.id)).forEach(rfq => {
      if (['ppeLead', 'ppeManager', 'ppeAdmin'].includes(currentRole)) {
        notes.push({
          id: `n-${rfq.id}-wo`,
          title: 'Work Order Not Created',
          message: `${rfq.requestWorkNo} — ${rfq.client}`,
          detail: 'RFQ approved but no work order exists yet',
          link: '/work-orders',
          type: 'warning',
          priority: 'high',
          module: 'Work Order',
        })
      }
    })

    workOrders.forEach(wo => {
      // ppeLead / ppeManager / ppeAdmin: WO needs schedule
      if (wo.status === 'Pending Schedule' && ['ppeLead', 'ppeManager', 'ppeAdmin'].includes(currentRole)) {
        notes.push({
          id: `n-${wo.id}-schedule`,
          title: 'Schedule Not Set',
          message: `${wo.requestWorkNo} — ${wo.client}`,
          detail: 'Work order is approved but start/finish dates are missing',
          link: '/work-orders',
          type: 'action',
          priority: 'medium',
          module: 'Work Order',
        })
      }

      // ppeTeam / ppeLead: Ongoing WO — daily report reminder
      if (wo.status === 'Ongoing' && ['ppeTeam', 'ppeLead'].includes(currentRole)) {
        // Only alert if today has no report yet (check by seeing if latest report is from today)
        const today = new Date().toISOString().split('T')[0]
        const woDrs = dailyReports.filter(d => d.workOrderId === wo.id)
        const hasReportToday = woDrs.some(d => d.reportDate === today)
        if (!hasReportToday) {
          notes.push({
            id: `n-${wo.id}-dr`,
            title: 'Daily Report Pending',
            message: `${wo.requestWorkNo} — ${wo.client}`,
            detail: 'No daily report submitted for today yet',
            link: '/daily-report',
            type: 'info',
            priority: 'medium',
            module: 'Daily Report',
          })
        }
      }

      // ppeManager / ppeAdmin: Over-budget alert
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
            link: '/report-summary',
            type: 'alert',
            priority: 'high',
            module: 'Work Order',
          })
        }
      }
    })

    // Sort: high priority first, then by module
    const priorityOrder = { high: 0, medium: 1, low: 2 }
    return notes.sort((a, b) => (priorityOrder[a.priority] ?? 2) - (priorityOrder[b.priority] ?? 2))
  }

  const value = {
    currentRole, setCurrentRole,
    unitRates, addUnitRate, updateUnitRate, deleteUnitRate,
    teamRates, addTeamRate, updateTeamRate, deleteTeamRate,
    rfqs, addRfq, updateRfq,
    workOrders, addWorkOrder, updateWorkOrder,
    dailyReports, addDailyReport, updateDailyReport,
    getTeamMemberById,
    getNotifications,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export const useApp = () => {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
