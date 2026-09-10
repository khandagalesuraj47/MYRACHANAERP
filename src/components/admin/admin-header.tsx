import React, { useState } from 'react'
import {
  Menu,
  LogOut,
  User,
  ShieldCheck,
  ChevronDown,
  Download,
  Settings,
  Radio,
} from 'lucide-react'
import type { Profile, Organization } from '../../types/foundation'

interface AdminHeaderProps {
  profile: Profile
  organization: Organization
  onOpenMobileMenu: () => void
  onSignOut: () => void
  onOpenSettings?: () => void
  pageTitle?: string
}

export function AdminHeader({
  profile,
  organization,
  onOpenMobileMenu,
  onSignOut,
  onOpenSettings,
  pageTitle = 'Overview',
}: AdminHeaderProps) {
  const [showUserDropdown, setShowUserDropdown] = useState(false)

  return (
    <header className="sticky top-0 z-30 flex h-14 sm:h-16 w-full items-center justify-between border-b border-slate-800 bg-slate-950/95 px-3 sm:px-6 backdrop-blur-md select-none">
      {/* Left section: mobile toggle + page breadcrumb */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          aria-label="Open navigation drawer"
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-800 bg-slate-900 text-slate-400 hover:text-white md:hidden cursor-pointer"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2 text-left">
          <span className="hidden sm:inline-block text-[10px] font-mono uppercase tracking-widest text-blue-400 font-bold bg-blue-950/80 border border-blue-800/60 px-2 py-0.5 rounded">
            ADMIN
          </span>
          <h1 className="text-sm sm:text-base font-bold tracking-tight text-white truncate max-w-[180px] sm:max-w-none">
            {pageTitle}
          </h1>
        </div>
      </div>

      {/* Right section: realtime indicator + organization/user badge + logout */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Realtime sync pulse */}
        <div className="hidden sm:flex items-center gap-1.5 rounded-full bg-emerald-950/80 border border-emerald-800/80 px-2.5 py-0.5 text-[10px] font-mono text-emerald-400 font-semibold">
          <Radio className="h-3 w-3 animate-pulse text-emerald-400" />
          <span>Live Sync</span>
        </div>

        {/* User Account / Organization Menu */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowUserDropdown(!showUserDropdown)}
            className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900 p-1.5 pr-2 sm:pr-3 text-left hover:bg-slate-850 transition-colors cursor-pointer shadow-sm"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-950 border border-blue-800/80 text-blue-400 text-xs font-bold">
              {profile.fullName ? profile.fullName.charAt(0).toUpperCase() : <User className="h-3.5 w-3.5" />}
            </div>
            <div className="hidden sm:flex flex-col text-left">
              <span className="text-xs font-semibold text-white truncate max-w-[120px]">
                {profile.fullName || profile.email?.split('@')[0] || 'Admin'}
              </span>
              <span className="text-[10px] font-mono text-slate-400 truncate max-w-[120px]">
                {organization.name}
              </span>
            </div>
            <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
          </button>

          {/* Dropdown Menu */}
          {showUserDropdown && (
            <div
              className="absolute right-0 mt-2 w-60 rounded-2xl border border-slate-800 bg-slate-900 p-2 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-100 text-slate-200"
              onMouseLeave={() => setShowUserDropdown(false)}
            >
              <div className="px-3 py-2 border-b border-slate-800/80 mb-1">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
                  <ShieldCheck className="h-3.5 w-3.5 text-blue-400" />
                  <span>Administrator Session</span>
                </div>
                <div className="text-[11px] font-mono text-slate-400 truncate mt-0.5">
                  {profile.email}
                </div>
              </div>

              {onOpenSettings && (
                <button
                  type="button"
                  onClick={() => {
                    setShowUserDropdown(false)
                    onOpenSettings()
                  }}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
                >
                  <Settings className="h-4 w-4 text-blue-400" />
                  <span>Settings & App Updates</span>
                </button>
              )}

              <a
                href="https://gmhvckxqfarpkfpvuspj.supabase.co/storage/v1/object/public/apk-releases/myrachana-erp.apk"
                download="myrachana-erp.apk"
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
              >
                <Download className="h-4 w-4 text-emerald-400" />
                <span>Download Android APK</span>
              </a>

              <div className="border-t border-slate-800/80 my-1" />

              <button
                type="button"
                onClick={onSignOut}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-rose-400 hover:bg-rose-950/40 hover:text-rose-300 transition-colors cursor-pointer"
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