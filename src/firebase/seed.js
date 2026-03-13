import { db } from './config'
import {
  doc, setDoc, collection, writeBatch,
} from 'firebase/firestore'

// ─── Mock data (same as AppContext initial state) ─────────────────────────────

const UNIT_RATES = []
const TEAM_RATES = []
const RFQS = []
const WORK_ORDERS = []
const DAILY_REPORTS = []

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
