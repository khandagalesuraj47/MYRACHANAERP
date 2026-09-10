import React, { useState } from 'react'
import {
  KeyRound,
  PhoneCall,
  Search,
  CheckCircle,
  Clock,
  UserPlus,
  Mail,
} from 'lucide-react'
import type { PasswordResetRequest } from '../../../repositories/admin/people-repository'
import type { EnhancedMember } from '../../../types/rbac'

interface TempPassRequestsViewProps {
  requests: PasswordResetRequest[]
  members: EnhancedMember[]
  onIssueRequest: (request: PasswordResetRequest) => void
  onDirectIssue: (user: { userId: string; email: string; name?: string }) => void
  onRefresh: () => void
}

export function TempPassRequestsView({
  requests,
  members,
  onIssueRequest,
  onDirectIssue,
}: TempPassRequestsViewProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [isDirectModalOpen, setIsDirectModalOpen] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState<string>('')

  const filtered = requests.filter((r) => {
    if (!searchQuery.trim()) return true
    return r.email.toLowerCase().includes(searchQuery.toLowerCase())
  })

  const handleStartDirectIssue = () => {
    if (!selectedUserId) return
    const member = members.find((m) => m.userId === selectedUserId)
    if (!member) return

    onDirectIssue({
      userId: member.userId,
      email: member.profile?.email || member.userId,
      name: member.profile?.fullName || '',
    })
    setIsDirectModalOpen(false)
    setSelectedUserId('')
  }

  return (
    <div className="space-y-4">
      {/* Top Banner with Helpline Details */}
      <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200 text-blue-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-100 text-blue-700 border border-blue-200 shrink-0">
            <PhoneCall className="h-5 w-5" />
          </div>
          <div className="text-left space-y-0.5">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900">
                Admin Password Reset Helpline
              </h2>
              <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-700 border border-blue-200 uppercase">
                Direct Hotline
              </span>
            </div>
            <p className="text-xs text-slate-600">
              Employees call the administrator helpline at{' '}
              <a
                href="tel:7770002696"
                className="font-bold text-blue-700 underline hover:text-blue-800 font-mono"
              >
                7770002696
              </a>{' '}
              to request their temporary login password.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setIsDirectModalOpen(true)}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 px-3.5 py-2 text-xs font-bold text-white transition-colors cursor-pointer shadow-md shadow-blue-600/20"
          >
            <UserPlus className="h-3.5 w-3.5" />
            <span>+ Direct Issue to Any Staff</span>
          </button>
        </div>
      </div>

      {/* Direct User Picker Modal */}
      {isDirectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl bg-white border border-slate-200 shadow-2xl p-6 space-y-4 text-left">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-900">Direct Issue Temporary Password</h3>
              <p className="text-xs text-slate-500">
                Select an employee who called the administrator helpline to assign a temporary password.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700">
                Select Employee Account
              </label>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:bg-white focus:border-blue-600 focus:outline-none transition-colors"
              >
                <option value="">-- Choose Employee --</option>
                {members.map((m) => (
                  <option key={m.userId} value={m.userId}>
                    {m.profile?.fullName ? `${m.profile.fullName} (${m.profile?.email || m.userId})` : m.profile?.email || m.userId}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsDirectModalOpen(false)
                  setSelectedUserId('')
                }}
                className="px-3.5 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!selectedUserId}
                onClick={handleStartDirectIssue}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold transition-colors cursor-pointer shadow-md shadow-blue-600/20"
              >
                Continue to Issue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Requests Filter & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="text-left">
          <span className="text-xs font-bold text-slate-900">
            Pending Password Requests ({requests.length})
          </span>
        </div>

        <div className="relative sm:w-64">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search request email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:border-blue-600 focus:outline-none transition-colors"
          />
        </div>
      </div>

      {/* Main Table or Empty State */}
      {filtered.length === 0 ? (
        <div className="p-12 rounded-xl border border-slate-200 bg-white text-center space-y-3 shadow-sm">
          <div className="h-12 w-12 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 mx-auto">
            <CheckCircle className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-900">No Pending Password Requests</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {searchQuery
                ? 'No password requests matched your search criteria.'
                : 'All employee password reset requests have been addressed.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsDirectModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 px-3.5 py-1.5 text-xs font-bold text-white transition-colors cursor-pointer shadow-sm"
          >
            <UserPlus className="h-3.5 w-3.5" />
            <span>Direct Issue Temp Pass</span>
          </button>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="border-b border-slate-200 bg-slate-50 font-mono text-[11px] text-slate-600 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3.5 font-semibold">Requester Email</th>
                  <th className="px-4 py-3.5 font-semibold">Requested At</th>
                  <th className="px-4 py-3.5 font-semibold text-center">Status</th>
                  <th className="px-4 py-3.5 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                    {/* Column 1: Requester Email */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 font-bold text-xs shrink-0">
                          <Mail className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 font-mono">{req.email}</p>
                          <span className="font-mono text-[10px] text-slate-400">
                            Request ID: {req.id.slice(0, 8)}...
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Column 2: Requested At */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-500">
                        <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span>{new Date(req.requestedAt).toLocaleString()}</span>
                      </div>
                    </td>

                    {/* Column 3: Status */}
                    <td className="px-4 py-3.5 text-center">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 font-mono text-[10px] font-bold uppercase">
                        <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
                        Awaiting Admin Action
                      </span>
                    </td>

                    {/* Column 4: Action */}
                    <td className="px-4 py-3.5 text-right">
                      <button
                        type="button"
                        onClick={() => onIssueRequest(req)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 px-3.5 py-1.5 text-xs font-bold text-white transition-colors cursor-pointer shadow-sm"
                      >
                        <KeyRound className="h-3.5 w-3.5" />
                        <span>Issue Temporary Password</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
