import React from 'react'
import { AlertTriangle, X, RefreshCw } from 'lucide-react'

/**
 * ConflictWarning — shown when another user saves the document you are editing.
 * Props:
 *   - conflictUser: string — name of the user who saved
 *   - onReload: () => void — reload fresh data from Firestore and clear conflict
 *   - onDismiss: () => void — dismiss warning (user keeps their own edits)
 */
export default function ConflictWarning({ conflictUser, onReload, onDismiss }) {
  if (!conflictUser) return null

  return (
    <div className="mx-0 mb-3 bg-amber-50 border border-amber-300 rounded-xl p-4">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
          <AlertTriangle size={16} className="text-amber-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-amber-800 font-sarabun">ตรวจพบการแก้ไขพร้อมกัน</p>
          <p className="text-xs text-amber-700 mt-0.5 font-sarabun">
            <span className="font-semibold">{conflictUser}</span> ได้บันทึกเอกสารนี้ในขณะที่คุณกำลังแก้ไข
            ข้อมูลล่าสุดอาจแตกต่างจากที่คุณเห็นอยู่
          </p>
          <div className="flex items-center gap-2 mt-2.5">
            <button
              onClick={onReload}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg transition-colors font-sarabun"
            >
              <RefreshCw size={11} />
              โหลดข้อมูลล่าสุด
            </button>
            <button
              onClick={onDismiss}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-amber-300 text-amber-700 text-xs font-semibold rounded-lg hover:bg-amber-100 transition-colors font-sarabun"
            >
              <X size={11} />
              ปิดการแจ้งเตือน
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * LockIndicator — shows who is currently editing a document (displayed in the list/table row).
 * Props:
 *   - editingBy: { uid, name } | null
 *   - myUid: string
 */
export function LockIndicator({ editingBy, myUid }) {
  if (!editingBy || editingBy.uid === myUid) return null
  return (
    <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
      {editingBy.name ?? 'คนอื่น'} กำลังแก้ไข
    </span>
  )
}
