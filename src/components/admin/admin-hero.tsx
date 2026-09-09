import React from 'react'
import { Building2, Calendar, ShieldCheck } from 'lucide-react'

interface AdminHeroProps {
  fullName: string | null
  organizationName: string
  role: string
}

export function AdminHero({ fullName, organizationName, role }: AdminHeroProps) {
  // Dynamically generate appropriate greeting
  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 17) return 'Good afternoon'
    return 'Good evening'
  }

  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })

  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs text-left">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-[11px] font-mono font-semibold">
              <ShieldCheck className="h-3 w-3" />
              {role} CONSOLE
            </span>
            <span className="text-slate-300">•</span>
            <span className="inline-flex items-center gap-1 text-[11px] font-mono text-slate-500">
              <Building2 className="h-3 w-3 text-slate-400" />
              {organizationName}
            </span>
          </div>

          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            {getGreeting()}, {fullName || 'Administrator'}
          </h2>

          <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">
            Welcome to the MY RACHANA ERP management console. Monitor live organization status, team memberships, and heavy civil operations.
          </p>
        </div>

        {/* Date / Operational Status pill */}
        <div className="flex items-center gap-2 rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-2 shrink-0 self-start md:self-auto">
          <Calendar className="h-4 w-4 text-slate-500" />
          <div className="flex flex-col text-left">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Operational Date</span>
            <span className="text-xs font-semibold text-slate-800 font-mono">{currentDate}</span>
          </div>
        </div>
      </div>
    </div>
  )
}