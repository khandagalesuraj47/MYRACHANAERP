import React, { useState } from 'react'
import {
  AlertTriangle,
  X,
  Trash2,
  UserX,
  Loader2,
  ShieldAlert,
} from 'lucide-react'
import type { EnhancedMember } from '../../../types/rbac'
import { PeopleRepository } from '../../../repositories/admin/people-repository'

interface DeleteMemberModalProps {
  isOpen: boolean
  member: EnhancedMember | null
  organizationId: string
  onClose: () => void
  onSuccess: () => void
}

export function DeleteMemberModal({
  isOpen,
  member,
  organizationId,
  onClose,
  onSuccess,
}: DeleteMemberModalProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen || !member) return null

  const empName = member.profile?.fullName || member.profile?.email || 'Unnamed Employee'
  const empEmail = member.profile?.email || member.userId

  const handleDelete = async () => {
    setIsDeleting(true)
    setError(null)

    const res = await PeopleRepository.deleteMember(organizationId, member.id)

    if (res.success) {
      setIsDeleting(false)
      onSuccess()
      onClose()
    } else {
      setError(res.error || 'Failed to delete user.')
      setIsDeleting(false)
    }
  }

  const handleDeactivateInstead = async () => {
    setIsDeleting(true)
    setError(null)

    const ok = await PeopleRepository.toggleMemberStatus(member.id, false)
    setIsDeleting(false)

    if (ok) {
      onSuccess()
      onClose()
    } else {
      setError('Failed to deactivate member.')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in select-none">
      <div className="w-full max-w-md rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden text-slate-800 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-rose-100 bg-rose-50/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-rose-100 text-rose-600 border border-rose-200">
              <Trash2 className="h-4 w-4" />
            </div>
            <div className="text-left">
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                Delete Personnel Account
              </h2>
              <p className="text-[11px] text-rose-600 font-mono font-medium">
                Irreversible Action
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="rounded-lg p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 text-left">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2.5">
              <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Member Card */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block font-medium">
              Target Personnel
            </span>
            <p className="text-sm font-bold text-slate-900">{empName}</p>
            <p className="text-xs font-mono text-slate-600">{empEmail}</p>
            {member.employeeCode && (
              <span className="inline-block font-mono text-[10px] bg-white border border-slate-200 px-1.5 py-0.5 rounded text-slate-600 mt-1">
                Employee Code: {member.employeeCode}
              </span>
            )}
          </div>

          {/* Warning notice */}
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-rose-700">
              <ShieldAlert className="h-4 w-4 text-rose-600 shrink-0" />
              <span>Permanent Supabase Deletion</span>
            </div>
            <p className="text-[11px] text-rose-800 leading-relaxed">
              This action will completely remove this user from Supabase Authentication (<code className="font-mono text-rose-950 font-semibold">auth.users</code>), directory memberships, and task assignments.
            </p>
            <p className="text-[11px] text-amber-800 font-semibold pt-1">
              • If you only want to revoke access without deleting history, click "Deactivate Instead".
            </p>
          </div>

          {/* Action buttons */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              {member.isActive && (
                <button
                  type="button"
                  onClick={handleDeactivateInstead}
                  disabled={isDeleting}
                  className="flex-1 py-2.5 rounded-lg border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <UserX className="h-3.5 w-3.5" />
                  <span>Deactivate Instead</span>
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="w-full py-2.5 rounded-lg bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold text-xs transition-colors cursor-pointer shadow-md shadow-rose-600/20 flex items-center justify-center gap-2"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Deleting Permanently...</span>
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  <span>Permanently Delete From Supabase</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

