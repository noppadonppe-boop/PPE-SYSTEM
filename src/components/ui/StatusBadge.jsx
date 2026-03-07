import React from 'react'

const STATUS_MAP = {
  'Pending Lead':     'bg-yellow-100 text-yellow-700 border-yellow-200',
  'Pending Manager':  'bg-yellow-100 text-yellow-700 border-yellow-200',
  'Pending Approval': 'bg-yellow-100 text-yellow-700 border-yellow-200',
  'Approved':         'bg-green-100 text-green-700 border-green-200',
  'Ongoing':          'bg-blue-100 text-blue-700 border-blue-200',
  'Completed':        'bg-green-100 text-green-700 border-green-200',
  'Cancelled':        'bg-red-100 text-red-700 border-red-200',
  'Rejected':         'bg-red-100 text-red-700 border-red-200',
  'Lost':             'bg-red-100 text-red-700 border-red-200',
}

export default function StatusBadge({ status, className = '' }) {
  const cls = STATUS_MAP[status] || 'bg-slate-100 text-slate-600 border-slate-200'
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cls} ${className}`}>
      {status}
    </span>
  )
}
