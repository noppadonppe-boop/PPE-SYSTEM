import React, { useEffect, useRef, useState, useCallback } from 'react'
import { X, Move } from 'lucide-react'

export default function Modal({ isOpen, onClose, title, children, size = 'md', draggable = false }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    if (isOpen) document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  // Draggable state
  const [pos, setPos]       = useState({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)
  const dragStart = useRef(null)
  const modalRef  = useRef(null)

  // Reset position when modal opens
  useEffect(() => { if (isOpen) setPos({ x: 0, y: 0 }) }, [isOpen])

  const onMouseDown = useCallback((e) => {
    if (!draggable) return
    e.preventDefault()
    dragStart.current = { mx: e.clientX, my: e.clientY, px: pos.x, py: pos.y }
    setDragging(true)
  }, [draggable, pos])

  useEffect(() => {
    if (!dragging) return
    const onMove = (e) => {
      const dx = e.clientX - dragStart.current.mx
      const dy = e.clientY - dragStart.current.my
      setPos({ x: dragStart.current.px + dx, y: dragStart.current.py + dy })
    }
    const onUp = () => setDragging(false)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [dragging])

  if (!isOpen) return null

  const sizes = {
    sm:  'max-w-md',
    md:  'max-w-lg',
    lg:  'max-w-2xl',
    xl:  'max-w-4xl',
    '2xl': 'max-w-6xl',
    full: 'max-w-[95vw]',
  }

  const transform = draggable ? `translate(${pos.x}px, ${pos.y}px)` : undefined

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={draggable ? { pointerEvents: 'none' } : {}}>
      {/* Backdrop — only shown / clickable when not draggable */}
      {!draggable && (
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      )}
      {draggable && (
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" style={{ pointerEvents: 'auto' }} onClick={onClose} />
      )}
      <div
        ref={modalRef}
        style={{ transform, pointerEvents: 'auto', transition: dragging ? 'none' : 'transform 0.05s' }}
        className={`relative bg-white rounded-2xl shadow-2xl w-full ${sizes[size] || sizes.xl} flex flex-col max-h-[92vh]`}
      >
        {/* Header */}
        <div
          onMouseDown={draggable ? onMouseDown : undefined}
          className={`flex items-center justify-between px-6 py-4 border-b border-slate-200 flex-shrink-0 rounded-t-2xl ${
            draggable ? 'cursor-move select-none bg-slate-50 hover:bg-slate-100 transition-colors' : ''
          }`}
        >
          <div className="flex items-center gap-2">
            {draggable && <Move size={14} className="text-slate-400" />}
            <h2 className="text-base font-semibold text-slate-800">{title}</h2>
          </div>
          <button
            onClick={onClose}
            onMouseDown={e => e.stopPropagation()}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        {/* Body */}
        <div className="overflow-y-auto flex-1">
          {children}
        </div>
      </div>
    </div>
  )
}
