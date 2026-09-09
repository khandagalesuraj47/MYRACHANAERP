import React, { useState } from 'react'
import {
  ShieldCheck,
  Search,
  CheckCircle,
  Calendar,
  Mail,
  Trash2,
  AlertTriangle,
  Loader2,
  Phone,
} from 'lucide-react'
import type { EnhancedMember } from '../../../types/rbac'
import { PeopleRepository } from '../../../repositories/admin/people-repository'

interface PendingApprovalsViewProps {
  pendingMembers: EnhancedMember[]
  onAuthorize: (member: EnhancedMember) => void
  onRefresh: () => void
}

export function PendingApprovalsView({
  pendingMembers,
  onAuthorize,
  onRefresh,
}: PendingApprovalsViewProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [deletingMember, setDeletingMember] = useState<EnhancedMember | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const filtered = pendingMembers.filter((m) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    const name = (m.profile?.fullName || '').toLowerCase()
    const email = (m.profile?.email || m.userId).toLowerCase()
    const code = (m.employeeCode || '').toLowerCase()
    return name.includes(q) || email.includes(q) || code.includes(q)
  })

  const handleConfirmDelete = async () => {
    if (!deletingMember) return
    setIsDeleting(true)
    setActionError(null)

    try {
      const res = await PeopleRepository.deleteMember(
        deletingMember.organizationId,
        deletingMember.id
      )

      if (!res.success) {
        setActionError(res.error || 'Failed to delete registration.')
        setIsDeleting(false)
        return
      }

      setDeletingMember(null)
      setIsDeleting(false)
      onRefresh()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error deleting member'
      setActionError(msg)
      setIsDeleting(false)
    }
  }

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
            Employees who registered an account from the login screen. You can review and assign mandatory site permissions or permanently reject/delete the request.
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

      {actionError && (
        <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs text-left">
          {actionError}
        </div>
      )}

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
                : 'All self-registered personnel accounts have been reviewed and authorized.'}
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Mobile Card Layout (Auto-fit on all small phone screens) */}
          <div className="block sm:hidden space-y-3">
            {filtered.map((member) => {
              const name = member.profile?.fullName || member.profile?.email?.split('@')[0] || 'Applicant'
              const email = member.profile?.email || member.userId
              const initials = name.slice(0, 2).toUpperCase()
              const regDate = member.createdAt ? new Date(member.createdAt).toLocaleDateString() : 'Recent'

              return (
                <div
                  key={member.id}
                  className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-3 text-left shadow-lg"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-amber-950/80 border border-amber-800/80 flex items-center justify-center text-amber-300 font-bold text-xs shrink-0">
                        {initials}
                      </div>
                      <div className="space-y-0.5">
                        <p className="font-bold text-white text-sm leading-tight">{name}</p>
                        <p className="font-mono text-xs text-blue-400 flex items-center gap-1 truncate max-w-[200px]">
                          <Mail className="h-3 w-3 shrink-0 text-slate-500" />
                          {email}
                        </p>
                      </div>
                    </div>
                    <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-950/80 border border-amber-800/80 text-amber-300 font-mono text-[9px] font-bold uppercase">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                      Pending
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-400 border-t border-slate-800/60 pt-2">
                    <div className="flex items-center gap-1 truncate">
                      <Calendar className="h-3 w-3 text-slate-500 shrink-0" />
                      <span>{regDate}</span>
                    </div>
                    {member.phone ? (
                      <div className="flex items-center gap-1 truncate">
                        <Phone className="h-3 w-3 text-slate-500 shrink-0" />
                        <span>{member.phone}</span>
                      </div>
                    ) : (
                      <span className="text-slate-500">Site Unlocked</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 pt-1 border-t border-slate-800/80">
                    <button
                      type="button"
                      onClick={() => setDeletingMember(member)}
                      className="flex-1 flex items-center justify-center gap-1 rounded-lg border border-rose-900/60 bg-rose-950/30 hover:bg-rose-950/60 text-rose-300 py-2 text-xs font-semibold transition-colors cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-rose-400" />
                      <span>Reject</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onAuthorize(member)}
                      className="flex-2 flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white py-2 text-xs font-bold transition-colors cursor-pointer shadow-md shadow-emerald-600/20"
                    >
                      <ShieldCheck className="h-4 w-4" />
                      <span>Review & Authorize</span>
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Desktop Table Layout (hidden on mobile) */}
          <div className="hidden sm:block rounded-xl border border-slate-800 bg-slate-950 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="border-b border-slate-800 bg-slate-900/90 font-mono text-[11px] text-slate-400 uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3.5 font-semibold">Applicant</th>
                    <th className="px-4 py-3.5 font-semibold">Contact Email</th>
                    <th className="px-4 py-3.5 font-semibold">Registration Date</th>
                    <th className="px-4 py-3.5 font-semibold text-center">Status</th>
                    <th className="px-4 py-3.5 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filtered.map((member) => {
                    const name = member.profile?.fullName || member.profile?.email?.split('@')[0] || 'Applicant'
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

                        {/* Column 5: Actions */}
                        <td className="px-4 py-3.5 text-right">
                          <div className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setDeletingMember(member)}
                              className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-950/40 hover:text-rose-300 transition-colors cursor-pointer"
                              title="Reject & Delete Registration"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onAuthorize(member)}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 text-xs font-bold text-white transition-colors cursor-pointer shadow-md shadow-emerald-600/20"
                            >
                              <ShieldCheck className="h-3.5 w-3.5" />
                              <span>Review & Authorize</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Delete Confirmation Modal Layer */}
      {deletingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl border border-rose-700/80 bg-slate-900 p-6 shadow-2xl text-left space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-rose-950 text-rose-400 border border-rose-800">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">
                  Reject & Permanently Delete Registration?
                </h3>
                <p className="text-xs text-rose-300/80">
                  This will remove the account from Supabase authentication and database.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300 space-y-1">
              <div>Applicant: <strong className="text-white">{deletingMember.profile?.fullName || 'Applicant'}</strong></div>
              <div>Email: <strong className="text-blue-400">{deletingMember.profile?.email || deletingMember.userId}</strong></div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeletingMember(null)}
                className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-750 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="flex items-center gap-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white px-4 py-2 text-xs font-bold transition-colors cursor-pointer shadow-lg shadow-rose-600/20"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Confirm Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
