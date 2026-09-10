import React from 'react'

export type StatusVariant =
  | 'APPROVED'
  | 'PENDING_APPROVAL'
  | 'PENDING_VERIFICATION'
  | 'PENDING'
  | 'REJECTED'
  | 'ACTIVE'
  | 'INACTIVE'
  | 'COMPLETED'
  | 'ON_HOLD'
  | string

interface StatusBadgeProps {
  status: StatusVariant
  label?: string
  className?: string
  size?: 'sm' | 'md'
}

export function StatusBadge({
  status,
  label,
  className = '',
  size = 'sm',
}: StatusBadgeProps) {
  const norm = (status || '').toUpperCase()

  let colorClasses = 'bg-slate-100 text-slate-700 border-slate-200'

  if (['APPROVED', 'ACTIVE', 'COMPLETED', 'SUCCESS'].includes(norm)) {
    colorClasses = 'bg-emerald-50 text-emerald-700 border-emerald-200'
  } else if (['PENDING_APPROVAL', 'IN_REVIEW', 'FORWARDED'].includes(norm)) {
    colorClasses = 'bg-blue-50 text-blue-700 border-blue-200'
  } else if (['PENDING_VERIFICATION', 'PENDING', 'PLANNING', 'AWAITING'].includes(norm)) {
    colorClasses = 'bg-amber-50 text-amber-700 border-amber-200'
  } else if (['REJECTED', 'INACTIVE', 'CANCELLED', 'ERROR', 'FAILED'].includes(norm)) {
    colorClasses = 'bg-rose-50 text-rose-700 border-rose-200'
  }

  const displayText = label || status?.replace(/_/g, ' ') || 'UNKNOWN'

  const sizeClasses =
    size === 'md'
      ? 'px-2.5 py-1 text-xs font-semibold'
      : 'px-2 py-0.5 text-[10px] font-bold font-mono tracking-wider'

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full border uppercase select-none transition-colors ${sizeClasses} ${colorClasses} ${className}`}
    >
      {displayText}
    </span>
  )
}
