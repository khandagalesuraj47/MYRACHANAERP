import React, { useState } from 'react'
import {
  Menu,
  Bell,
  LogOut,
  User,
  ShieldCheck,
  ChevronDown,
} from 'lucide-react'
import type { Profile, Organization } from '../../types/foundation'

interface AdminHeaderProps {
  profile: Profile
  organization: Organization
  onOpenMobileMenu: () => void
  onSignOut: () => void
  pageTitle?: string
}

export function AdminHeader({
  profile,
  organization,
  onOpenMobileMenu,
  onSignOut,
  pageTitle = 'Overview',
}: AdminHeaderProps) {
  const [showUserDropdown, setShowUserDropdown] = useState(false)

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-800/80 bg-slate-950/90 px-4 md:px-6 backdrop-blur-md">
      {/* Left section: mobile toggle + page breadcrumb */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          aria-label="Open mobile navigation"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-800 text-slate-400 hover:bg-slate-900 hover:text-white md:hidden cursor-pointer"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2 text-left">
          <span className="text-xs font-mono text-slate-400">Admin</span>
          <span className="text-xs text-slate-400">/</span>
          <h1 className="text-sm font-semibold tracking-tight text-white">{pageTitle}</h1>
        </div>
      </div>

      {/* Right section: realtime indicator + organization/user badge + logout */}
      <div className="flex items-center gap-3">
        {/* Realtime sync pulse */}
        <div className="hidden sm:flex items-center gap-1.5 rounded-full bg-slate-900 border border-slate-800 px-2.5 py-1 text-[11px] font-mono text-emerald-400">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          <span>Live Sync</span>
        </div>

        {/* Notifications Icon (clean placeholder) */}
        <button
          type="button"
          aria-label="Notifications"
          className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-slate-800 text-slate-400 hover:bg-slate-900 hover:text-white transition-colors cursor-pointer"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-blue-500" />
        </button>

        {/* User Account / Organization Menu */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowUserDropdown(!showUserDropdown)}
            className="flex items-center gap-2.5 rounded-lg border border-slate-800 bg-slate-900/60 p-1.5 pr-2.5 text-left hover:bg-slate-900 transition-colors cursor-pointer"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded bg-blue-600/20 border border-blue-500/30 text-blue-400 text-xs font-bold">
              {profile.fullName ? profile.fullName.charAt(0).toUpperCase() : <User className="h-3.5 w-3.5" />}
            </div>
            <div className="hidden lg:flex flex-col text-left">
              <span className="text-xs font-semibold text-white truncate max-w-[130px]">
                {profile.fullName || profile.email?.split('@')[0] || 'Administrator'}
              </span>
              <span className="text-[10px] font-mono text-slate-400 truncate max-w-[130px]">
                {organization.name}
              </span>
            </div>
            <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
          </button>

          {/* Dropdown Menu */}
          {showUserDropdown && (
            <div
              className="absolute right-0 mt-2 w-56 rounded-xl border border-slate-800 bg-slate-900 p-2 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-100"
              onMouseLeave={() => setShowUserDropdown(false)}
            >
              <div className="px-2.5 py-2 border-b border-slate-800/80 mb-1">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
                  <ShieldCheck className="h-3.5 w-3.5 text-blue-400" />
                  <span>Administrator Access</span>
                </div>
                <div className="text-[11px] font-mono text-slate-400 truncate mt-0.5">
                  {profile.email}
                </div>
              </div>

              <div className="px-2.5 py-1.5 text-[10px] font-mono text-slate-400">
                Tenant: <span className="text-slate-300 font-sans font-medium">{organization.name}</span>
              </div>

              <button
                type="button"
                onClick={onSignOut}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-rose-400 hover:bg-rose-950/40 hover:text-rose-300 transition-colors cursor-pointer mt-1"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}