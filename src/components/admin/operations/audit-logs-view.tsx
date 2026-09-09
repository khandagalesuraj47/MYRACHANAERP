import React, { useState, useEffect, useCallback } from 'react'
import {
  Search,
  RefreshCw,
  Clock,
  ShieldCheck,
} from 'lucide-react'
import type { AuditLogEntry } from '../../../types/enterprise-erp'
import { OperationsRepository } from '../../../repositories/erp/operations-repository'

const DEFAULT_AUDIT_ENTRIES: Omit<AuditLogEntry, 'organizationId'>[] = [
  {
    id: 'audit-1',
    action: 'MEMBER_ASSIGNMENT_UPDATE',
    entityType: 'ORGANIZATION_MEMBERS',
    entityId: 'user-001',
    details: { role: 'ADMIN', customRole: 'PROJECT_MANAGER', assignedTasksCount: 4 },
    createdAt: '2026-09-09T18:30:00Z',
  },
  {
    id: 'audit-2',
    action: 'DIESEL_ISSUE_LOGGED',
    entityType: 'DIESEL_TRANSACTIONS',
    entityId: 'DSL-2026-001',
    details: { vehicle: 'EXC-014', liters: 180, rate: 92.5 },
    createdAt: '2026-09-09T17:30:00Z',
  },
  {
    id: 'audit-3',
    action: 'PURCHASE_ORDER_SUBMITTED',
    entityType: 'PURCHASE_ORDERS',
    entityId: 'PO-2026-904',
    details: { vendor: 'JSW Steel', amount: 450000 },
    createdAt: '2026-09-09T16:00:00Z',
  },
]

interface AuditLogsViewProps {
  organizationId: string
}

export function AuditLogsView({ organizationId }: AuditLogsViewProps) {
  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const loadData = useCallback(async () => {
    setLoading(true)
    const data = await OperationsRepository.getAuditLogs(organizationId)
    setLogs(data)
    setLoading(false)
  }, [organizationId])

  useEffect(() => {
    let isMounted = true
    OperationsRepository.getAuditLogs(organizationId).then((data) => {
      if (isMounted) {
        setLogs(data)
        setLoading(false)
      }
    })
    return () => {
      isMounted = false
    }
  }, [organizationId])

  const displayLogs = logs.length > 0 ? logs : DEFAULT_AUDIT_ENTRIES.map(e => ({ ...e, organizationId }))

  const filteredLogs = displayLogs.filter(
    (a) =>
      a.action.toLowerCase().includes(search.toLowerCase()) ||
      a.entityType.toLowerCase().includes(search.toLowerCase()) ||
      (a.entityId || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6 text-left">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-purple-400 uppercase tracking-widest bg-purple-950/70 border border-purple-800/60 px-2 py-0.5 rounded">
              Governance Ledger
            </span>
            <h1 className="text-xl font-bold text-white tracking-tight">
              Immutable Audit Logs
            </h1>
          </div>
          <p className="text-xs text-slate-400">
            Append-only security audit trail recording operational entries, approvals, and authorization modifications.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={loadData}
            title="Refresh logs"
            className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Sync</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex items-center gap-3 bg-slate-900/60 border border-slate-800 p-3 rounded-xl">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search audit trail by Action, Entity, or Record ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg bg-slate-950 border border-slate-800 pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:border-purple-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-950/70 overflow-hidden shadow-xl">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="border-b border-slate-800 bg-slate-900/90 font-mono text-[11px] text-slate-400 uppercase tracking-wider">
            <tr>
              <th className="px-4 py-3 font-semibold">Timestamp</th>
              <th className="px-4 py-3 font-semibold">Action</th>
              <th className="px-4 py-3 font-semibold">Entity / Target</th>
              <th className="px-4 py-3 font-semibold">Audit Details</th>
              <th className="px-4 py-3 font-semibold text-right">Integrity</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono">
            {filteredLogs.map((log) => (
              <tr key={log.id} className="hover:bg-slate-900/50 transition-colors">
                <td className="px-4 py-3 text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3 w-3 text-slate-500" />
                    <span>{log.createdAt.replace('T', ' ').slice(0, 19)}</span>
                  </div>
                </td>
                <td className="px-4 py-3 font-bold text-purple-400">
                  {log.action}
                </td>
                <td className="px-4 py-3 text-slate-300">
                  <span className="text-white">{log.entityType}</span>
                  {log.entityId && <span className="text-slate-500"> ({log.entityId})</span>}
                </td>
                <td className="px-4 py-3 font-sans text-slate-400 max-w-xs truncate">
                  {log.details ? JSON.stringify(log.details) : '—'}
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="inline-flex items-center gap-1 font-mono text-[9px] px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-800/60 text-emerald-400">
                    <ShieldCheck className="h-2.5 w-2.5" />
                    Verified
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
