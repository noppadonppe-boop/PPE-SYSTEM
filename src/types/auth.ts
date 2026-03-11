import { Timestamp } from 'firebase/firestore'

export const USER_ROLES = [
  'Staff',
  'ppeTeam',
  'ppeLeader',
  'ppeManager',
  'Requestors',
  'Eng',
  'SenEng',
  'Arch',
  'SenArch',
  'ppeAdmin',
  'MasterAdmin',
] as const

export type UserRole = typeof USER_ROLES[number]

export interface UserProfile {
  uid: string
  email: string
  firstName: string
  lastName: string
  position: string
  role: UserRole[]
  status: 'pending' | 'approved' | 'rejected'
  assignedProjects: string[]
  createdAt: Timestamp
  photoURL?: string
  isFirstUser: boolean
}

export interface AppMetaConfig {
  firstUserRegistered: boolean
  totalUsers: number
  createdAt: Timestamp
}

export interface ActivityLog {
  uid: string
  email: string
  action: 'REGISTER' | 'LOGIN' | 'LOGOUT' | 'APPROVE' | 'REJECT'
  timestamp: Timestamp
  meta?: Record<string, unknown>
}
