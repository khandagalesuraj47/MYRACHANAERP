import React, { useState } from 'react'
import { AdminSidebar } from './admin-sidebar'
import { AdminHeader } from './admin-header'
import { MobileBottomNav } from '../common/mobile-bottom-nav'
import type { Profile, Organization } from '../../types/foundation'
import { Fuel, Package, Cpu, Building2, FolderKanban } from 'lucide-react'

interface AdminLayoutProps {
  profile: Profile
  organization: Organization
  children: React.ReactNode
  onSignOut: () => void
  activeModule: string
  onSelectModule: (id: string) => void
  pageTitle?: string
  pendingApprovalsCount?: number
}

export function AdminLayout({
  profile,
  organization,
  children,
  onSignOut,
  activeModule,
  onSelectModule,
  pageTitle,
  pendingApprovalsCount = 0,
}: AdminLayoutProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  const isOperationsModule = [
    'operations',
    'diesel-requisition',
    'item-master',
    'asset-master',
    'vendor-master',
    'projects',
  ].includes(activeModule)

  const operationsChips = [
    { id: 'diesel-requisition', label: 'Diesel Requisition', icon: Fuel },
    { id: 'item-master', label: 'Item Master', icon: Package },
    { id: 'asset-master', label: 'Asset Master', icon: Cpu },
    { id: 'vendor-master', label: 'Vendor Master', icon: Building2 },
    { id: 'projects', label: 'Projects & Sites', icon: FolderKanban },
  ]

  const handleMobileTabSelect = (tabId: string) => {
    if (tabId === 'operations') {
      // Default to diesel-requisition if clicking operations tab
      if (!isOperationsModule) {
        onSelectModule('diesel-requisition')
      }
    } else {
      onSelectModule(tabId)
    }
  }

  return (
    <div className="flex h-[100dvh] w-full max-w-[100vw] overflow-hidden bg-slate-950 font-sans antialiased text-slate-100 select-none">
      {/* Desktop Persistent Sidebar (hidden on mobile) */}
      <div className="hidden md:flex h-full shrink-0">
        <AdminSidebar
          organizationName={organization.name}
          isCollapsed={isCollapsed}
          onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
          activeModule={activeModule}
          onSelectModule={onSelectModule}
        />
      </div>

      {/* Mobile Drawer Backdrop & Sidebar */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm"
            onClick={() => setIsMobileOpen(false)}
          />
          <div className="relative flex w-68 max-w-[85vw] flex-col bg-slate-900 border-r border-slate-800 shadow-2xl z-50">
            <AdminSidebar
              organizationName={organization.name}
              isCollapsed={false}
              onToggleCollapse={() => setIsMobileOpen(false)}
              activeModule={activeModule}
              onSelectModule={(id) => {
                onSelectModule(id)
                setIsMobileOpen(false)
              }}
            />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden w-full">
        <AdminHeader
          profile={profile}
          organization={organization}
          onOpenMobileMenu={() => setIsMobileOpen(true)}
          onSignOut={onSignOut}
          onOpenSettings={() => onSelectModule('settings')}
          pageTitle={pageTitle}
        />

        {/* Mobile Operations Sub-Navigation Chips (Material 3 Horizontal Filter) */}
        {isOperationsModule && (
          <div className="md:hidden border-b border-slate-800/90 bg-slate-900/60 px-3 py-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {operationsChips.map((chip) => {
              const Icon = chip.icon
              const isSelected = activeModule === chip.id
              return (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => onSelectModule(chip.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold tracking-tight whitespace-nowrap transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <span>{chip.label}</span>
                </button>
              )
            })}
          </div>
        )}

        {/* Primary Screen Scroll Container */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-6 lg:p-8 space-y-6 pb-24 md:pb-8 w-full max-w-[100vw] overscroll-y-contain">
          <div className="mx-auto max-w-7xl space-y-6">{children}</div>
        </main>

        {/* Material 3 Android Mobile Bottom Navigation Bar */}
        <MobileBottomNav
          activeTab={activeModule}
          onSelectTab={handleMobileTabSelect}
          pendingApprovalsCount={pendingApprovalsCount}
        />
      </div>
    </div>
  )
}