import React from 'react'
import {
  LayoutDashboard,
  Layers,
  Users,
  Settings,
} from 'lucide-react'

export interface MobileNavTab {
  id: string
  label: string
  icon: React.ElementType
  badge?: number
}

interface MobileBottomNavProps {
  activeTab: string
  onSelectTab: (tabId: string) => void
  pendingApprovalsCount?: number
}

export function MobileBottomNav({
  activeTab,
  onSelectTab,
  pendingApprovalsCount = 0,
}: MobileBottomNavProps) {
  const tabs: MobileNavTab[] = [
    {
      id: 'dashboard',
      label: 'Home',
      icon: LayoutDashboard,
    },
    {
      id: 'operations',
      label: 'Operations',
      icon: Layers,
    },
    {
      id: 'people',
      label: 'Personnel',
      icon: Users,
      badge: pendingApprovalsCount,
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
    },
  ]

  const handleTabClick = (tabId: string) => {
    // Android subtle haptic feedback
    try {
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(10)
      }
    } catch {
      // Haptics fallback
    }
    onSelectTab(tabId)
  }

  return (
    <nav
      aria-label="Mobile Navigation Bar"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 border-t border-slate-800/80 backdrop-blur-xl pb-[max(env(safe-area-inset-bottom,0px),6px)] pt-1.5 px-3 select-none transition-all"
    >
      <div className="flex items-center justify-around max-w-lg mx-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive =
            activeTab === tab.id ||
            (tab.id === 'operations' &&
              ['diesel-requisition', 'item-master', 'asset-master', 'vendor-master', 'projects'].includes(
                activeTab
              ))

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabClick(tab.id)}
              className="flex-1 flex flex-col items-center justify-center py-1 group cursor-pointer relative min-h-[50px]"
            >
              {/* Material 3 Active Pill Indicator */}
              <div
                className={`relative flex items-center justify-center px-4 py-1 rounded-full transition-all duration-200 ${
                  isActive
                    ? 'bg-blue-600/25 text-blue-400'
                    : 'text-slate-400 group-hover:text-slate-200 group-active:scale-95'
                }`}
              >
                <Icon
                  className={`h-5 w-5 transition-transform ${
                    isActive ? 'scale-105 stroke-[2.2]' : 'stroke-[1.8]'
                  }`}
                />

                {/* Badge Notification */}
                {tab.badge && tab.badge > 0 ? (
                  <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold font-mono text-slate-950 shadow-sm animate-pulse">
                    {tab.badge > 99 ? '99+' : tab.badge}
                  </span>
                ) : null}
              </div>

              {/* Label */}
              <span
                className={`text-[10px] font-medium tracking-tight mt-0.5 transition-colors ${
                  isActive ? 'text-blue-400 font-bold' : 'text-slate-400'
                }`}
              >
                {tab.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
