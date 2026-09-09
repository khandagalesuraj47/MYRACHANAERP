import React, { useState } from 'react'
import {
  ShieldCheck,
  Search,
  CheckCircle,
  Calendar,
  Mail,
} from 'lucide-react'
import type { EnhancedMember } from '../../../types/rbac'

interface PendingApprovalsViewProps {
  pendingMembers: EnhancedMember[]
  onAuthorize: (member: EnhancedMember) => void
  onRefresh: () => void
}

export function PendingApprovalsView({
  pendingMembers,
  onAuthorize,
}: PendingApprovalsViewProps) {
  const [searchQuery, setSearchQuery] = useState('')

  const filtered = pendingMembers.filter((m) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    const name = (m.profile?.fullName || '').toLowerCase()
    const email = (m.profile?.email || '').toLowerCase()
    const code = (m.employeeCode || '').toLowerCase()
    return name.includes(q) || email.includes(q) || code.includes(q)
  })

  return (
    <div className="space-y-4">
      {/* Header card */}
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="text-left space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-amber-400 uppercase tracking-widest bg-amber-950/80 border border-amber-800/80 px-2 py-0.5 rounded">
              Authorization Queue
            </span>
            <h2 className="text-base font-bold text-white tracking-tight">
              Self-Registration Approvals ({pendingMembers.length})
            </h2>
          </div>
          <p className="text-xs text-slate-400">
            Employees who registered an account from the login screen. Every account must be assigned an operational site and granted duties before they can access the ERP.
          </p>
        </div>

        <div className="relative sm:w-64 shrink-0">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search pending applicants..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none transition-colors"
          />
        </div>
      </div>

      {/* Main Content */}
      {filtered.length === 0 ? (
        <div className="p-12 rounded-xl border border-slate-800 bg-slate-950/60 text-center space-y-3">
          <div className="h-12 w-12 rounded-full bg-emerald-950/80 border border-emerald-800/80 flex items-center justify-center text-emerald-400 mx-auto">
            <CheckCircle className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-white">No Pending Registrations</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {searchQuery
                ? 'No pending registrations matched your search query.'
                : 'All self-registered personnel accounts have been reviewed and approved.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-800 bg-slate-950 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="border-b border-slate-800 bg-slate-900/90 font-mono text-[11px] text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3.5 font-semibold">Applicant</th>
                  <th className="px-4 py-3.5 font-semibold">Contact Email</th>
                  <th className="px-4 py-3.5 font-semibold">Registration Date</th>
                  <th className="px-4 py-3.5 font-semibold text-center">Status</th>
                  <th className="px-4 py-3.5 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filtered.map((member) => {
                  const name = member.profile?.fullName || 'Unnamed Applicant'
                  const email = member.profile?.email || member.userId
                  const initials = name.slice(0, 2).toUpperCase()

                  return (
                    <tr key={member.id} className="hover:bg-slate-900/50 transition-colors">
                      {/* Column 1: Applicant */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-lg bg-amber-950/80 border border-amber-800/80 flex items-center justify-center text-amber-300 font-bold text-xs shrink-0">
                            {initials}
                          </div>
                          <div>
                            <p className="font-semibold text-white">{name}</p>
                            {member.employeeCode && (
                              <span className="font-mono text-[10px] text-slate-400">
                                Code: {member.employeeCode}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Column 2: Contact Email */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-300">
                          <Mail className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                          <span>{email}</span>
                        </div>
                      </td>

                      {/* Column 3: Registration Date */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono">
                          <Calendar className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                          <span>
                            {member.createdAt ? new Date(member.createdAt).toLocaleDateString() : 'Recent'}
                          </span>
                        </div>
                      </td>

                      {/* Column 4: Status */}
                      <td className="px-4 py-3.5 text-center">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-950/70 border border-amber-800/80 text-amber-300 font-mono text-[10px] font-bold uppercase">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                          Pending Site Lock
                        </span>
                      </td>

                      {/* Column 5: Action */}
                      <td className="px-4 py-3.5 text-right">
                        <button
                          type="button"
                          onClick={() => onAuthorize(member)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 text-xs font-bold text-white transition-colors cursor-pointer shadow-md shadow-emerald-600/20"
                        >
                          <ShieldCheck className="h-3.5 w-3.5" />
                          <span>Review & Authorize</span>
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
