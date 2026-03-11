import React from 'react'
import { Clock, LogOut, RefreshCw } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { logout } from '../../firebase/authService'
import { useNavigate } from 'react-router-dom'

export default function PendingApprovalPage() {
  const { userProfile, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const [refreshing, setRefreshing] = React.useState(false)

  async function handleRefresh() {
    setRefreshing(true)
    await refreshProfile()
    setRefreshing(false)
  }

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center">

        {/* Icon */}
        <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Clock size={36} className="text-yellow-500" />
        </div>

        <h1 className="text-2xl font-bold text-slate-800 font-sarabun mb-2">
          รอการอนุมัติ
        </h1>
        <p className="text-slate-500 font-sarabun mb-1">
          บัญชีของคุณกำลังรอการอนุมัติจากผู้ดูแลระบบ
        </p>

        {userProfile && (
          <div className="mt-4 bg-white rounded-xl border border-slate-200 px-6 py-4 text-left shadow-sm mb-6">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 font-sarabun">ข้อมูลบัญชี</p>
            <div className="space-y-2">
              <Row label="ชื่อ-นามสกุล" value={`${userProfile.firstName} ${userProfile.lastName}`} />
              <Row label="อีเมล"         value={userProfile.email} />
              <Row label="ตำแหน่ง"       value={userProfile.position || '—'} />
              <Row label="สถานะ"         value={
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-yellow-100 text-yellow-700 font-sarabun">
                  รอการอนุมัติ
                </span>
              } />
            </div>
          </div>
        )}

        <p className="text-xs text-slate-400 font-sarabun mb-6">
          กรุณารอผู้ดูแลระบบอนุมัติบัญชีของคุณ<br />
          หลังจากได้รับการอนุมัติ คลิก "ตรวจสอบสถานะ" เพื่อเข้าสู่ระบบ
        </p>

        <div className="flex gap-3">
          <button
            onClick={handleRefresh} disabled={refreshing}
            className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-60 font-sarabun flex items-center justify-center gap-2"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            ตรวจสอบสถานะ
          </button>
          <button
            onClick={handleLogout}
            className="flex-1 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-semibold rounded-lg transition-colors font-sarabun flex items-center justify-center gap-2"
          >
            <LogOut size={14} />
            ออกจากระบบ
          </button>
        </div>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-slate-500 font-sarabun">{label}</span>
      <span className="text-xs font-semibold text-slate-700 font-sarabun">{value}</span>
    </div>
  )
}
