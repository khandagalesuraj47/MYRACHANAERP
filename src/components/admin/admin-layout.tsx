import React, { useState } from 'react'
import { AdminSidebar } from './admin-sidebar'
import { AdminHeader } from './admin-header'
import type { Profile, Organization } from '../../types/foundation'

interface AdminLayoutProps {
  profile: Profile
  organization: Organization
  children: React.ReactNode
  onSignOut: () => void
  activeModule: string
  onSelectModule: (id: string) => void
  pageTitle?: string
}

export function AdminLayout({
  profile,
  organization,
  children,
  onSignOut,
  activeModule,
  onSelectModule,
  pageTitle,
}: AdminLayoutProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 font-sans antialiased text-slate-900">
      {/* Desktop Persistent Sidebar */}
      <div className="hidden md:flex h-full">
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
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setIsMobileOpen(false)}
          />
          <div className="relative flex w-64 max-w-[80vw] flex-col bg-white shadow-2xl z-50">
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
      <div className="flex flex-1 flex-col overflow-hidden">
        <AdminHeader
          profile={profile}
          organization={organization}
          onOpenMobileMenu={() => setIsMobileOpen(true)}
          onSignOut={onSignOut}
          pageTitle={pageTitle}
        />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6">
          <div className="mx-auto max-w-7xl space-y-6">{children}</div>
        </main>
      </div>
    </div>
  )
}