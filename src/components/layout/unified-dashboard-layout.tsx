import React, { useState } from 'react'
import {
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Command,
  X,
  LogOut,
  User,
  Shield,
  Layers,
  MapPin,
  Settings,
} from 'lucide-react'
import {
  SidebarNav,
  type NavGroupData,
  type NavItemData,
} from '../ui/dashboard-sidebar'

export interface UnifiedDashboardLayoutProps {
  organizationName: string
  subtitle?: string
  avatarChar?: string
  userFullName: string
  userRole?: string
  pageTitle: string
  activeModule: string
  onSelectModule: (id: string) => void
  onSignOut: () => void
  navGroups: NavGroupData[]
  bottomItems: NavItemData[]
  children: React.ReactNode
  searchItems?: { id: string; title: string; category: string }[]
}

export function UnifiedDashboardLayout({
  organizationName,
  subtitle = 'Enterprise Workspace',
  avatarChar,
  userFullName,
  userRole,
  pageTitle,
  activeModule,
  onSelectModule,
  onSignOut,
  navGroups,
  bottomItems,
  children,
  searchItems = [],
}: UnifiedDashboardLayoutProps) {
  const [isOpen, setIsOpen] = useState(true)
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const handleNavSelect = (id: string) => {
    if (id === 'search') {
      setIsSearchOpen(true)
      return
    }
    if (id === 'logout') {
      onSignOut()
      return
    }
    onSelectModule(id)
    setIsMobileOpen(false)
  }

  const filteredSearchItems = searchQuery.trim()
    ? searchItems.filter(
        (item) =>
          item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.category.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : searchItems

  return (
    <div className="flex h-[100dvh] w-full max-w-[100vw] overflow-hidden bg-slate-50 text-slate-900 font-sans select-none antialiased">
      {/* Desktop Persistent Collapsible Sidebar */}
      <div
        className={`hidden md:flex h-full transition-all duration-300 ease-in-out shrink-0 overflow-hidden bg-white border-r border-slate-200 ${
          isOpen ? 'w-[260px] opacity-100' : 'w-0 opacity-0 border-none'
        }`}
      >
        <SidebarNav
          className="w-[260px] border-none bg-transparent"
          activeId={activeModule}
          onSelect={handleNavSelect}
          activeWorkspace={organizationName}
          workspaceSubtitle={subtitle}
          avatarChar={avatarChar || organizationName.charAt(0)}
          navGroups={navGroups}
          bottomItems={bottomItems}
        />
      </div>

      {/* Mobile Drawer Backdrop & Sidebar */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileOpen(false)}
          />
          <div className="relative flex w-72 max-w-[85vw] flex-col bg-white border-r border-slate-200 shadow-2xl z-50 animate-in slide-in-from-left duration-200">
            <SidebarNav
              className="w-full border-none bg-transparent"
              activeId={activeModule}
              onSelect={handleNavSelect}
              activeWorkspace={organizationName}
              workspaceSubtitle={subtitle}
              avatarChar={avatarChar || organizationName.charAt(0)}
              navGroups={navGroups}
              bottomItems={bottomItems}
            />
          </div>
        </div>
      )}

      {/* Main Content Column */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Clean Light Top Header */}
        <header className="h-14 sm:h-16 border-b border-slate-200/90 bg-white flex items-center px-3 sm:px-6 justify-between shrink-0 shadow-xs z-20">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {/* Desktop toggle */}
            <button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              className="hidden md:flex p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors cursor-pointer"
              title={isOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            >
              {isOpen ? (
                <PanelLeftClose className="w-5 h-5" strokeWidth={1.75} />
              ) : (
                <PanelLeftOpen className="w-5 h-5" strokeWidth={1.75} />
              )}
            </button>

            {/* Mobile hamburger toggle */}
            <button
              type="button"
              onClick={() => setIsMobileOpen(true)}
              className="flex md:hidden p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors cursor-pointer"
              title="Open menu"
            >
              <PanelLeftOpen className="w-5 h-5" strokeWidth={1.75} />
            </button>

            {/* Breadcrumb path */}
            <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-slate-500 min-w-0">
              <span className="font-medium text-slate-600 truncate max-w-[120px] sm:max-w-[200px]">
                {organizationName}
              </span>
              <span>/</span>
              <span className="font-bold text-slate-900 truncate">
                {pageTitle}
              </span>
            </div>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Quick Search trigger */}
            <button
              type="button"
              onClick={() => setIsSearchOpen(true)}
              className="hidden sm:flex items-center gap-2.5 h-9 w-44 md:w-60 px-3 rounded-lg bg-slate-100/80 hover:bg-slate-100 border border-slate-200/80 text-xs text-slate-400 cursor-pointer transition-all"
            >
              <Search className="w-4 h-4 text-slate-400 shrink-0" strokeWidth={1.75} />
              <span className="truncate">Search modules...</span>
              <kbd className="ml-auto hidden md:inline-flex items-center justify-center h-5 px-1.5 text-[10px] font-mono text-slate-400 bg-white border border-slate-200 rounded shadow-2xs">
                ⌘K
              </kbd>
            </button>

            {/* Mobile search icon button */}
            <button
              type="button"
              onClick={() => setIsSearchOpen(true)}
              className="flex sm:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100"
            >
              <Search className="w-4 h-4" />
            </button>

            {/* User Profile Capsule */}
            <div className="flex items-center gap-2.5 pl-1">
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shadow-xs shrink-0">
                {userFullName ? userFullName.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="hidden lg:flex flex-col text-left">
                <span className="text-xs font-bold text-slate-900 leading-tight truncate max-w-[120px]">
                  {userFullName}
                </span>
                <span className="text-[10px] font-medium text-blue-600 leading-tight">
                  {userRole || 'Member'}
                </span>
              </div>
            </div>

            {/* Sign Out Button */}
            <button
              type="button"
              onClick={onSignOut}
              className="flex items-center gap-1.5 p-2 sm:px-2.5 sm:py-1.5 rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 text-xs font-semibold transition-colors cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </header>

        {/* Scrollable Workspace Body */}
        <main className="flex-1 overflow-y-auto bg-slate-50/60 p-3 sm:p-6 md:p-8 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-300">
          <div className="max-w-7xl mx-auto w-full">
            {children}
          </div>
        </main>
      </div>

      {/* Global Search Dialog Modal */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] sm:pt-[15vh] bg-slate-900/30 backdrop-blur-xs px-4">
          <div className="fixed inset-0" onClick={() => setIsSearchOpen(false)} />
          <div className="relative w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center px-4 border-b border-slate-200">
              <Search className="w-5 h-5 text-slate-400 mr-3 shrink-0" strokeWidth={1.75} />
              <input
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent py-3.5 outline-none text-sm text-slate-900 placeholder:text-slate-400"
                placeholder="Search modules, sites, tasks..."
              />
              <kbd
                onClick={() => setIsSearchOpen(false)}
                className="hidden sm:inline-flex items-center justify-center h-5 px-1.5 ml-2 text-[10px] font-medium font-mono text-slate-500 bg-slate-100 border border-slate-200 rounded cursor-pointer hover:bg-slate-200"
              >
                ESC
              </kbd>
              <button
                type="button"
                onClick={() => setIsSearchOpen(false)}
                className="ml-2 p-1.5 rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto p-2">
              {filteredSearchItems.length > 0 ? (
                filteredSearchItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onSelectModule(item.id)
                      setIsSearchOpen(false)
                    }}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left text-xs hover:bg-blue-50 text-slate-700 hover:text-blue-700 transition-colors cursor-pointer group"
                  >
                    <span className="font-semibold">{item.title}</span>
                    <span className="text-[10px] font-mono text-slate-400 group-hover:text-blue-500 uppercase">
                      {item.category}
                    </span>
                  </button>
                ))
              ) : (
                <div className="p-6 flex flex-col items-center justify-center text-center">
                  <Command className="w-6 h-6 text-slate-300 mb-1.5" strokeWidth={1.5} />
                  <p className="text-xs text-slate-500 font-medium">No modules found matching "{searchQuery}"</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

