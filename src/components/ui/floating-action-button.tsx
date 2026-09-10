import React from 'react'
import { Plus } from 'lucide-react'

interface FloatingActionButtonProps {
  label?: string
  icon?: React.ElementType | React.ReactNode
  onClick: () => void
  disabled?: boolean
  className?: string
}

export function FloatingActionButton({
  label,
  icon = Plus,
  onClick,
  disabled = false,
  className = '',
}: FloatingActionButtonProps) {
  const handleClick = () => {
    try {
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(10)
      }
    } catch {
      // Haptics fallback
    }
    onClick()
  }

  const renderIcon = () => {
    if (!icon) return null
    if (React.isValidElement(icon)) return icon
    const Comp = icon as React.ElementType
    return <Comp className="h-5 w-5 shrink-0 stroke-[2.5]" />
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className={`fixed bottom-[calc(env(safe-area-inset-bottom,0px)+72px)] right-4 sm:right-6 z-30 flex items-center justify-center gap-2 rounded-full bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs shadow-lg shadow-blue-600/30 transition-all cursor-pointer min-h-[48px] px-4 py-3 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {renderIcon()}
      {label && <span className="tracking-wide pr-1">{label}</span>}
    </button>
  )
}
