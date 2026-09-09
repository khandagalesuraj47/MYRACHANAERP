import React, { useState } from 'react'
import {
  Menu,
  Bell,
  LogOut,
  User,
  ShieldCheck,
  ChevronDown,
  Download,
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
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200/90 bg-white/95 px-4 md:px-6 backdrop-blur-md">
      {/* Left section: mobile toggle + page breadcrumb */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          aria-label="Open mobile navigation"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 md:hidden cursor-pointer"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2 text-left">
          <span className="text-xs font-mono text-slate-400">Admin</span>
          <span className="text-xs text-slate-300">/</span>
          <h1 className="text-sm font-bold tracking-tight text-slate-900">{pageTitle}</h1>
        </div>
      </div>

      {/* Right section: realtime indicator + organization/user badge + logout */}
      <div className="flex items-center gap-3">
        {/* Realtime sync pulse */}
        <div className="hidden sm:flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 text-[11px] font-mono text-emerald-700 font-medium">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-600" />
          </span>
          <span>Live Sync</span>
        </div>

        {/* Android APK Download Button */}
        <a
          href="https://gmhvckxqfarpkfpvuspj.supabase.co/storage/v1/object/public/apk-releases/myrachana-erp.apk"
          download="myrachana-erp.apk"
          target="_blank"
          rel="noopener noreferrer"
          className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-100/80 hover:bg-slate-200/80 px-2.5 py-1.5 text-xs font-mono font-medium text-slate-700 hover:text-slate-900 transition-colors cursor-pointer"
          title="Download Android APK"
        >
          <Download className="h-3.5 w-3.5" />
          <span>Download APK</span>
        </a>

        {/* Notifications Icon */}
        <button
          type="button"
          aria-label="Notifications"
          className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-blue-600" />
        </button>

        {/* User Account / Organization Menu */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowUserDropdown(!showUserDropdown)}
            className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-white p-1.5 pr-2.5 text-left hover:bg-slate-50 transition-colors cursor-pointer shadow-xs"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded bg-blue-50 border border-blue-200 text-blue-600 text-xs font-bold">
              {profile.fullName ? profile.fullName.charAt(0).toUpperCase() : <User className="h-3.5 w-3.5" />}
            </div>
            <div className="hidden lg:flex flex-col text-left">
              <span className="text-xs font-semibold text-slate-900 truncate max-w-[130px]">
                {profile.fullName || profile.email?.split('@')[0] || 'Administrator'}
              </span>
              <span className="text-[10px] font-mono text-slate-500 truncate max-w-[130px]">
                {organization.name}
              </span>
            </div>
            <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
          </button>

          {/* Dropdown Menu */}
          {showUserDropdown && (
            <div
              className="absolute right-0 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-2 shadow-xl z-50 animate-in fade-in zoom-in-95 duration-100 text-slate-800"
              onMouseLeave={() => setShowUserDropdown(false)}
            >
              <div className="px-2.5 py-2 border-b border-slate-100 mb-1">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900">
                  <ShieldCheck className="h-3.5 w-3.5 text-blue-600" />
                  <span>Administrator Access</span>
                </div>
                <div className="text-[11px] font-mono text-slate-500 truncate mt-0.5">
                  {profile.email}
                </div>
              </div>

              <div className="px-2.5 py-1.5 text-[10px] font-mono text-slate-500">
                Tenant: <span className="text-slate-800 font-sans font-medium">{organization.name}</span>
              </div>

              <button
                type="button"
                onClick={onSignOut}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition-colors cursor-pointer mt-1"
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