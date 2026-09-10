import React, { useEffect } from 'react'
import { X } from 'lucide-react'

interface NativeBottomSheetProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  subtitle?: string
  children: React.ReactNode
  footer?: React.ReactNode
  icon?: React.ReactNode
  maxHeightClass?: string
}

export function NativeBottomSheet({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  icon,
  maxHeightClass = 'max-h-[92dvh]',
}: NativeBottomSheetProps) {
  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200 select-none">
      {/* Backdrop overlay */}
      <div
        className="fixed inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet / Dialog Surface */}
      <div
        className={`relative z-10 w-full max-w-2xl bg-slate-900 border-t md:border border-slate-800 rounded-t-[28px] md:rounded-2xl shadow-2xl overflow-hidden flex flex-col ${maxHeightClass} animate-in slide-in-from-bottom md:slide-in-from-bottom-0 md:zoom-in-95 duration-250`}
      >
        {/* Android Drag Handle (Mobile only) */}
        <div className="md:hidden flex justify-center pt-2.5 pb-1">
          <div className="h-1.5 w-12 rounded-full bg-slate-700/80" />
        </div>

        {/* Top App Bar inside Sheet */}
        {(title || icon) && (
          <div className="flex items-center justify-between border-b border-slate-800/80 px-4 sm:px-6 py-3 bg-slate-950/60">
            <div className="flex items-center gap-3">
              {icon && <div className="shrink-0">{icon}</div>}
              <div className="text-left">
                {title && (
                  <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
                    {title}
                  </h2>
                )}
                {subtitle && (
                  <p className="text-[11px] sm:text-xs text-slate-400">
                    {subtitle}
                  </p>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
              aria-label="Close sheet"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}

        {/* Scrollable Body Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 text-left overscroll-contain">
          {children}
        </div>

        {/* Sticky Thumb-Zone Footer Action Bar */}
        {footer && (
          <div className="sticky bottom-0 z-20 border-t border-slate-800/90 bg-slate-950/95 backdrop-blur-md px-4 sm:px-6 py-3 pb-[max(env(safe-area-inset-bottom,0px),12px)]">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
