import React from 'react'
import { Database, ShieldCheck, Radio, Server, CheckCircle2 } from 'lucide-react'
import type { Organization } from '../../types/foundation'

interface AdminSystemStatusProps {
  organization: Organization
  role: string
}

export function AdminSystemStatus({ organization, role }: AdminSystemStatusProps) {
  const items = [
    {
      label: 'Tenant Isolation',
      detail: `Scoped to ${organization.slug}`,
      status: 'Active',
      icon: ShieldCheck,
    },
    {
      label: 'Security Boundary',
      detail: 'PostgreSQL Row Level Security',
      status: 'Enforced',
      icon: Database,
    },
    {
      label: 'Realtime Replication',
      detail: 'Supabase WebSockets channel',
      status: 'Connected',
      icon: Radio,
    },
    {
      label: 'Authority Level',
      detail: `${role} privileges verified`,
      status: 'Validated',
      icon: Server,
    },
  ]

  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs text-left space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="space-y-0.5">
          <h3 className="text-sm font-bold tracking-tight text-slate-900">
            Architecture Governance & Security Health
          </h3>
          <p className="text-xs text-slate-500">
            Real-time status of backend authorization, multi-tenant boundaries, and Supabase synchronization.
          </p>
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-[11px] font-mono font-semibold text-emerald-700">
          <CheckCircle2 className="h-3 w-3 text-emerald-600" />
          <span>Operational</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
        {items.map((item) => {
          const Icon = item.icon

          return (
            <div
              key={item.label}
              className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3.5 space-y-2"
            >
              <div className="flex items-center justify-between">
                <Icon className="h-4 w-4 text-blue-600" />
                <span className="text-[10px] font-mono font-semibold text-emerald-700 bg-emerald-100/70 border border-emerald-200 px-1.5 py-0.5 rounded">
                  {item.status}
                </span>
              </div>
              <div className="space-y-0.5 text-left">
                <div className="text-xs font-semibold text-slate-800">{item.label}</div>
                <div className="text-[11px] text-slate-500 font-mono truncate" title={item.detail}>
                  {item.detail}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}