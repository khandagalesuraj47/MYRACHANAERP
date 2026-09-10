import React from 'react'

interface KPICardProps {
  title: string
  value: string | number
  caption?: string
  icon?: React.ElementType
  iconColorClass?: string
  iconBgClass?: string
  onClick?: () => void
  loading?: boolean
}

export function KPICard({
  title,
  value,
  caption,
  icon: Icon,
  iconColorClass = 'text-blue-600',
  iconBgClass = 'bg-blue-50 border-blue-200',
  onClick,
  loading = false,
}: KPICardProps) {
  const isClickable = Boolean(onClick)

  return (
    <div
      onClick={onClick}
      className={`rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-5 shadow-xs text-left transition-all ${
        isClickable
          ? 'cursor-pointer hover:border-slate-300 hover:shadow-sm active:scale-[0.99]'
          : ''
      }`}
    >
      <div className="flex items-center justify-between text-slate-500 text-xs font-medium gap-2">
        <span className="truncate">{title}</span>
        {Icon && (
          <div
            className={`flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg border shrink-0 ${iconBgClass} ${iconColorClass}`}
          >
            <Icon className="h-4 w-4" />
          </div>
        )}
      </div>

      <div className="mt-2 sm:mt-3">
        <div className="text-xl sm:text-2xl font-bold font-mono text-slate-900 truncate">
          {loading ? '...' : value}
        </div>
        {caption && (
          <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5 truncate">
            {caption}
          </p>
        )}
      </div>
    </div>
  )
}
