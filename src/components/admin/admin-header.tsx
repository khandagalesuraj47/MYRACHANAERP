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
    <header className="sticky top-0 z-30 flex h-14 sm:h-16 w-full items-center justify-between border-b border-slate-200 bg-white/95 px-3 sm:px-6 backdrop-blur-md select-none shadow-xs">
      {/* Left section: mobile toggle + page breadcrumb */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          aria-label="Open navigation drawer"
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 hover:text-slate-900 md:hidden cursor-pointer"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2 text-left">
          <span className="hidden sm:inline-block text-[10px] font-mono uppercase tracking-widest text-blue-700 font-bold bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
            ADMIN
          </span>
          <h1 className="text-sm sm:text-base font-bold tracking-tight text-slate-900 truncate max-w-[180px] sm:max-w-none">
            {pageTitle}
          </h1>
        </div>
      </div>

      {/* Right section: realtime indicator + organization/user badge + logout */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Realtime sync pulse */}
        <div className="hidden sm:flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-mono text-emerald-700 font-semibold">
          <Radio className="h-3 w-3 animate-pulse text-emerald-600" />
          <span>Live Sync</span>
        </div>

        {/* User Account / Organization Menu */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowUserDropdown(!showUserDropdown)}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-1.5 pr-2 sm:pr-3 text-left hover:bg-slate-50 transition-colors cursor-pointer shadow-2xs"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold">
              {profile.fullName ? profile.fullName.charAt(0).toUpperCase() : <User className="h-3.5 w-3.5" />}
            </div>
            <div className="hidden sm:flex flex-col text-left">
              <span className="text-xs font-semibold text-slate-900 truncate max-w-[120px]">
                {profile.fullName || profile.email?.split('@')[0] || 'Admin'}
              </span>
              <span className="text-[10px] font-mono text-slate-500 truncate max-w-[120px]">
                {organization.name}
              </span>
            </div>
            <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
          </button>

          {/* Dropdown Menu */}
          {showUserDropdown && (
            <div
              className="absolute right-0 mt-2 w-60 rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-100 text-slate-800"
              onMouseLeave={() => setShowUserDropdown(false)}
            >
              <div className="px-3 py-2 border-b border-slate-100 mb-1">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900">
                  <ShieldCheck className="h-3.5 w-3.5 text-blue-600" />
                  <span>Administrator Session</span>
                </div>
                <div className="text-[11px] font-mono text-slate-500 truncate mt-0.5">
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
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
                >
                  <Settings className="h-4 w-4 text-blue-600" />
                  <span>Settings & App Updates</span>
                </button>
              )}

              <a
                href="https://gmhvckxqfarpkfpvuspj.supabase.co/storage/v1/object/public/apk-releases/myrachana-erp.apk"
                download="myrachana-erp.apk"
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
              >
                <Download className="h-4 w-4 text-emerald-600" />
                <span>Download Android APK</span>
              </a>

              <div className="border-t border-slate-100 my-1" />

              <button
                type="button"
                onClick={onSignOut}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition-colors cursor-pointer"
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