import { db } from './config'
import {
  doc, setDoc, collection, writeBatch,
} from 'firebase/firestore'

// ─── Mock data (same as AppContext initial state) ─────────────────────────────

const UNIT_RATES = [
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

const TEAM_RATES = [
  { id: 'tr-1', name: 'Ahmad Fauzi', position: 'Senior Engineer', ratePerHour: 85000 },
  { id: 'tr-2', name: 'Budi Santoso', position: 'Engineer', ratePerHour: 65000 },
  { id: 'tr-3', name: 'Citra Dewi', position: 'Junior Engineer', ratePerHour: 45000 },
  { id: 'tr-4', name: 'Dian Purnama', position: 'Senior Engineer', ratePerHour: 80000 },
  { id: 'tr-5', name: 'Eko Prasetyo', position: 'Lead Engineer', ratePerHour: 110000 },
  { id: 'tr-6', name: 'Fitri Handayani', position: 'Engineer', ratePerHour: 60000 },
]

const RFQS = [
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

const WORK_ORDERS = [
  {
    id: 'wo-001',
    rfqId: 'rfq-003',
    requestWorkNo: 'RWN-2024-003',
    client: 'PT Medco Energi',
    status: 'Ongoing',
    planStart: '2024-04-01',
    planFinish: '2024-06-30',
    assignedTeam: ['tr-5', 'tr-1'],
    totalPlannedMH: 300,
  },
]

const DAILY_REPORTS = [
  {
    id: 'dr-001',
    workOrderId: 'wo-001',
    requestWorkNo: 'RWN-2024-003',
    reportDate: '2024-04-01',
    submittedBy: 'ppeTeam',
    progressToday: 5,
    cumulativeProgress: 5,
    spentMHToday: 16,
    cumulativeSpentMH: 16,
    balanceMH: 284,
    isLeaveAbsent: false,
    notes: 'Mobilization and site preparation.',
  },
  {
    id: 'dr-002',
    workOrderId: 'wo-001',
    requestWorkNo: 'RWN-2024-003',
    reportDate: '2024-04-02',
    submittedBy: 'ppeTeam',
    progressToday: 8,
    cumulativeProgress: 13,
    spentMHToday: 24,
    cumulativeSpentMH: 40,
    balanceMH: 260,
    isLeaveAbsent: false,
    notes: 'Steel erection started, 3 columns done.',
  },
]

// ─── Seed Function ────────────────────────────────────────────────────────────
// Structure: "PPE System" (collection) > "root" (document) >
//   unitRates / teamRates / rfqs / workOrders / dailyReports (subcollections)

const ROOT_COL = 'PPE System'
const ROOT_DOC = 'root'

async function seedCollection(subcollectionName, items) {
  const batch = writeBatch(db)
  const colRef = collection(db, ROOT_COL, ROOT_DOC, subcollectionName)
  items.forEach(item => {
    const docRef = doc(colRef, item.id)
    batch.set(docRef, item)
  })
  await batch.commit()
  console.log(`✅ Seeded ${items.length} docs into ${subcollectionName}`)
}

export async function seedFirestore() {
  try {
    console.log('🌱 Starting Firestore seed...')

    // Ensure root document exists
    await setDoc(doc(db, ROOT_COL, ROOT_DOC), {
      _info: 'PPE Engineering Management ERP root document',
      _seededAt: new Date().toISOString(),
    }, { merge: true })

    await seedCollection('unitRates', UNIT_RATES)
    await seedCollection('teamRates', TEAM_RATES)
    await seedCollection('rfqs', RFQS)
    await seedCollection('workOrders', WORK_ORDERS)
    await seedCollection('dailyReports', DAILY_REPORTS)

    console.log('🎉 Firestore seed complete!')
    return true
  } catch (err) {
    console.error('❌ Seed failed:', err)
    throw err
  }
}
