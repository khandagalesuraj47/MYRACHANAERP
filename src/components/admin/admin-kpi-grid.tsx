import React from 'react'
import { Users, UserCheck, ShieldCheck, Activity, AlertCircle, RefreshCw } from 'lucide-react'
import type { OrganizationStats } from '../../repositories/admin/admin-repository'

interface AdminKpiGridProps {
  stats: OrganizationStats | null
  loading: boolean
  error: string | null
  onRetry: () => void
}

export function AdminKpiGrid({ stats, loading, error, onRetry }: AdminKpiGridProps) {
  if (error) {
    return (
      <div className="rounded-2xl border border-rose-900/50 bg-rose-950/20 p-6 text-left">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-rose-300">Unable to load organization metrics</h3>
            <p className="text-xs text-rose-400/90">{error}</p>
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center gap-1.5 mt-2 rounded-lg bg-rose-900/40 border border-rose-800 px-3 py-1.5 text-xs font-medium text-rose-200 hover:bg-rose-900 transition-colors cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Retry Query</span>
            </button>
          </div>
        </div>
      </div>
    )
  }

  const cards = [
    {
      title: 'Total Members',
      value: stats ? stats.totalUsers : 0,
      description: 'Enrolled organization accounts',
      icon: Users,
      color: 'blue',
    },
    {
      title: 'Active Members',
      value: stats ? stats.activeUsers : 0,
      description: 'Active access credentials',
      icon: UserCheck,
      color: 'emerald',
    },
    {
      title: 'Administrators',
      value: stats ? stats.adminCount : 0,
      description: 'Full governance authority',
      icon: ShieldCheck,
      color: 'amber',
    },
    {
      title: 'Tenant Status',
      value: stats?.isOrganizationActive ? 'Operational' : 'Suspended',
      description: 'RLS & Database health',
      icon: Activity,
      color: 'indigo',
      isText: true,
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon

        return (
          <div
            key={card.title}
            className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 shadow-lg text-left transition-all hover:border-slate-700/80"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">{card.title}</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800/80 border border-slate-700/60 text-slate-300">
                <Icon className="h-4 w-4" />
              </div>
            </div>

            <div className="mt-4">
              {loading ? (
                <div className="h-8 w-16 animate-pulse rounded bg-slate-800" />
              ) : (
                <div className={`text-2xl font-extrabold tracking-tight ${card.isText ? 'text-emerald-400 text-xl font-mono' : 'text-white font-mono'}`}>
                  {card.value}
                </div>
              )}
              <p className="mt-1 text-[11px] text-slate-400">{card.description}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}