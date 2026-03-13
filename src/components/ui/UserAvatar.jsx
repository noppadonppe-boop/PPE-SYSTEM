import React, { useState } from 'react'

/**
 * UserAvatar — แสดงรูปโปรไฟล์จาก photoURL หรือ fallback ตัวอักษร
 * Props:
 *   - photoURL: string | undefined
 *   - name: string  (ใช้สร้าง fallback initials)
 *   - size: number  (px, default 32)
 *   - className: string (extra classes บน wrapper)
 *   - textSize: string  (tailwind text size สำหรับ initials)
 */
export default function UserAvatar({ photoURL, name = '', size = 32, className = '', textSize = 'text-xs' }) {
  const [imgError, setImgError] = useState(false)

  const initial = name?.trim()?.[0]?.toUpperCase() ?? '?'

  const sizeStyle = { width: size, height: size, minWidth: size, minHeight: size }

  if (photoURL && !imgError) {
    return (
      <img
        src={photoURL}
        alt={name}
        referrerPolicy="no-referrer"
        crossOrigin="anonymous"
        onError={() => setImgError(true)}
        style={sizeStyle}
        className={`rounded-full object-cover flex-shrink-0 ${className}`}
      />
    )
  }

  return (
    <div
      style={sizeStyle}
      className={`rounded-full bg-blue-500 flex items-center justify-center text-white font-bold flex-shrink-0 select-none ${textSize} ${className}`}
    >
      {initial}
    </div>
  )
}
