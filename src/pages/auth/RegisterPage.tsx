import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { UserPlus, Mail, Lock, Eye, EyeOff, User, Briefcase, AlertCircle, CheckCircle } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { registerWithEmail, loginWithGoogle } from '../../firebase/authService'

const FIREBASE_MSG: Record<string, string> = {
  'auth/email-already-in-use': 'อีเมลนี้ถูกใช้งานแล้ว',
  'auth/weak-password':        'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร',
  'auth/invalid-email':        'รูปแบบอีเมลไม่ถูกต้อง',
  'auth/popup-closed-by-user': 'ปิดหน้าต่าง Google ก่อนเสร็จสิ้น',
}

function errMsg(code: string) {
  return FIREBASE_MSG[code] ?? `เกิดข้อผิดพลาด (${code})`
}

const POSITIONS = [
  'Manager',
  'Leader',
  'GM/MD',
  'Senior Architect',
  'Architect',
  'Senior Civil Engineer',
  'Civil Engineer',
  'Draft Man',
  'Document Control',
]

export default function RegisterPage() {
  const { firebaseUser, userProfile, loading, refreshProfile } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', password: '', confirm: '', position: '',
  })
  const [showPw,  setShowPw]  = useState(false)
  const [error,   setError]   = useState('')
  const [busy,    setBusy]    = useState(false)

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }))

  useEffect(() => {
    if (loading || !firebaseUser || !userProfile) return
    if (userProfile.status === 'pending')  { navigate('/pending',   { replace: true }); return }
    if (userProfile.status === 'approved') { navigate('/dashboard', { replace: true }); return }
  }, [userProfile, loading, firebaseUser, navigate])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (form.password !== form.confirm) { setError('รหัสผ่านไม่ตรงกัน'); return }
    if (form.password.length < 6)       { setError('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร'); return }
    setBusy(true)
    try {
      await registerWithEmail(form.email, form.password, form.firstName, form.lastName, form.position)
      await refreshProfile()
    } catch (err: any) {
      setError(errMsg(err.code ?? err.message))
    } finally {
      setBusy(false)
    }
  }

  async function handleGoogle() {
    setError(''); setBusy(true)
    try {
      await loginWithGoogle()
      await refreshProfile()
    } catch (err: any) {
      setError(errMsg(err.code ?? err.message))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Header */}
        <div className="bg-[#0f2035] rounded-2xl px-8 py-6 mb-4 text-center shadow-xl">
          <div className="w-14 h-14 bg-white/10 rounded-xl flex items-center justify-center mx-auto mb-3">
            <UserPlus size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white font-sarabun">สมัครสมาชิก</h1>
          <p className="text-slate-400 text-sm mt-1 font-sarabun">สร้างบัญชีเพื่อเข้าใช้งาน PPE System</p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl shadow-lg px-8 py-7 space-y-4">

          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700 font-sarabun">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1 font-sarabun">ชื่อ</label>
                <div className="relative">
                  <User size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input required type="text" value={form.firstName} onChange={set('firstName')}
                    placeholder="ชื่อ"
                    className="w-full pl-8 pr-2 py-2.5 text-sm border border-slate-300 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200 font-sarabun" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1 font-sarabun">นามสกุล</label>
                <input required type="text" value={form.lastName} onChange={set('lastName')}
                  placeholder="นามสกุล"
                  className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200 font-sarabun" />
              </div>
            </div>

            {/* Position */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1 font-sarabun">ตำแหน่ง</label>
              <div className="relative">
                <Briefcase size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <select required value={form.position} onChange={set('position')}
                  className="w-full pl-8 pr-3 py-2.5 text-sm border border-slate-300 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200 font-sarabun bg-white appearance-none">
                  <option value="">— เลือกตำแหน่ง —</option>
                  {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1 font-sarabun">อีเมล</label>
              <div className="relative">
                <Mail size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input required type="email" value={form.email} onChange={set('email')}
                  placeholder="you@example.com"
                  className="w-full pl-8 pr-3 py-2.5 text-sm border border-slate-300 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200 font-sarabun" />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1 font-sarabun">รหัสผ่าน</label>
              <div className="relative">
                <Lock size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type={showPw ? 'text' : 'password'} required value={form.password} onChange={set('password')}
                  placeholder="อย่างน้อย 6 ตัวอักษร"
                  className="w-full pl-8 pr-10 py-2.5 text-sm border border-slate-300 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200 font-sarabun" />
                <button type="button" onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showPw ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
              </div>
            </div>

            {/* Confirm */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1 font-sarabun">ยืนยันรหัสผ่าน</label>
              <div className="relative">
                <Lock size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type={showPw ? 'text' : 'password'} required value={form.confirm} onChange={set('confirm')}
                  placeholder="••••••••"
                  className="w-full pl-8 pr-3 py-2.5 text-sm border border-slate-300 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200 font-sarabun" />
                {form.confirm && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {form.password === form.confirm
                      ? <CheckCircle size={13} className="text-green-500" />
                      : <AlertCircle size={13} className="text-red-400" />
                    }
                  </div>
                )}
              </div>
            </div>

            <button type="submit" disabled={busy}
              className="w-full py-2.5 bg-[#0f2035] hover:bg-[#162d4a] text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-60 font-sarabun flex items-center justify-center gap-2">
              {busy ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <UserPlus size={15} />}
              สมัครสมาชิก
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-xs text-slate-400 font-sarabun">หรือ</span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          <button onClick={handleGoogle} disabled={busy}
            className="w-full py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-semibold rounded-lg transition-colors disabled:opacity-60 font-sarabun flex items-center justify-center gap-2 shadow-sm">
            <GoogleIcon />
            สมัครด้วย Google
          </button>

          <p className="text-center text-xs text-slate-500 font-sarabun">
            มีบัญชีอยู่แล้ว?{' '}
            <Link to="/login" className="text-blue-600 font-semibold hover:underline">เข้าสู่ระบบ</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  )
}
