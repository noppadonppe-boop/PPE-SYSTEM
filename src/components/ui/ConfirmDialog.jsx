import React from 'react'
import { Trash2, AlertTriangle } from 'lucide-react'
import Modal from './Modal'

export default function ConfirmDialog({
  isOpen, onClose, onConfirm,
  title, message,
  confirmLabel = 'Delete',
  confirmVariant = 'danger', // 'danger' | 'warning' | 'primary'
}) {
  const variants = {
    danger:  { btn: 'bg-red-600 hover:bg-red-700 text-white',    icon: <Trash2 size={22} className="text-red-500" /> },
    warning: { btn: 'bg-yellow-500 hover:bg-yellow-600 text-white', icon: <AlertTriangle size={22} className="text-yellow-500" /> },
    primary: { btn: 'bg-blue-600 hover:bg-blue-700 text-white',  icon: <AlertTriangle size={22} className="text-blue-500" /> },
  }
  const v = variants[confirmVariant] || variants.danger

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <div className="px-6 pt-2 pb-6 space-y-5">
        {/* Icon + message */}
        <div className="flex flex-col items-center text-center gap-3 py-2">
          <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
            {v.icon}
          </div>
          <p className="text-sm text-slate-600 leading-relaxed">{message}</p>
        </div>

        {/* Actions */}
        <div className="flex gap-2.5">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => { onConfirm(); onClose() }}
            className={`flex-1 px-4 py-2.5 text-sm font-semibold rounded-xl transition-colors ${v.btn}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  )
}
