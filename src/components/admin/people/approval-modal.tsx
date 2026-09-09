import React, { useState, useEffect } from 'react'
import {
  X,
  ShieldCheck,
  MapPin,
  AlertCircle,
  Check,
  Loader2,
  Trash2,
  Calendar,
  Phone,
  User,
  Mail,
  AlertTriangle,
} from 'lucide-react'
import type { EnhancedMember, Site, Role, Department, TaskType } from '../../../types/rbac'
import { PeopleRepository } from '../../../repositories/admin/people-repository'
import { supabase } from '../../../lib/supabase'

interface ApprovalModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  member: EnhancedMember | null
  organizationId: string
  sites: Site[]
  roles: Role[]
  departments: Department[]
  taskTypes: TaskType[]
}

export function ApprovalModal({
  isOpen,
  onClose,
  onSuccess,
  member,
  organizationId,
  sites,
  roles,
  departments,
  taskTypes,
}: ApprovalModalProps) {
  const [selectedSiteId, setSelectedSiteId] = useState<string>(member?.siteId || '')
  const [selectedRole, setSelectedRole] = useState<'ADMIN' | 'USER'>(
    member?.baseRole === 'ADMIN' ? 'ADMIN' : 'USER'
  )
  const [selectedCustomRoleId, setSelectedCustomRoleId] = useState<string>(member?.customRoleId || '')
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>(member?.departmentId || '')
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(() => {
    const s = new Set<string>()
    if (member?.assignedTasks) {
      member.assignedTasks.forEach((t) => s.add(t.taskTypeId))
    }
    return s
  })

  // Direct fetch of profile details to guarantee 100% accuracy
  const [fetchedProfile, setFetchedProfile] = useState<{
    fullName: string | null
    email: string | null
    phone: string | null
  } | null>(null)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Direct profile verification on mount if profile info looks missing
  useEffect(() => {
    if (!member?.userId) return
    let isMounted = true

    async function resolveLiveProfile() {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('full_name, email')
          .eq('id', member!.userId)
          .maybeSingle()

        if (!error && data && isMounted) {
          setFetchedProfile({
            fullName: data.full_name || null,
            email: data.email || null,
            phone: member!.phone || null,
          })
        }
      } catch (err) {
        console.warn('[ApprovalModal] Profile direct fetch error:', err)
      }
    }

    resolveLiveProfile()
    return () => {
      isMounted = false
    }
  }, [member?.userId, member?.phone])

  if (!isOpen || !member) return null

  const handleToggleTask = (taskTypeId: string) => {
    setSelectedTasks((prev) => {
      const next = new Set(prev)
      if (next.has(taskTypeId)) {
        next.delete(taskTypeId)
      } else {
        next.add(taskTypeId)
      }
      return next
    })
  }

  const handleSelectAllTasks = () => {
    setSelectedTasks(new Set(taskTypes.map((t) => t.id)))
  }

  const handleClearAllTasks = () => {
    setSelectedTasks(new Set())
  }

  const handleApprove = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    if (!selectedSiteId) {
      setErrorMessage('Please assign a mandatory site. Every user must have a strict single-site lock.')
      return
    }

    setIsSubmitting(true)

    try {
      const res = await PeopleRepository.approveMember({
        organizationId,
        memberId: member.id,
        siteId: selectedSiteId,
        role: selectedRole,
        customRoleId: selectedCustomRoleId || null,
        departmentId: selectedDepartmentId || null,
        taskTypeIds: Array.from(selectedTasks),
      })

      if (!res.success) {
        setErrorMessage(res.error || 'Failed to approve registration.')
        return
      }

      onSuccess()
      onClose()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Approval submission failed.'
      setErrorMessage(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteRequest = async () => {
    setErrorMessage(null)
    setIsDeleting(true)

    try {
      const res = await PeopleRepository.deleteMember(organizationId, member.id)
      if (!res.success) {
        setErrorMessage(res.error || 'Failed to delete registration request.')
        setIsDeleting(false)
        setShowDeleteConfirm(false)
        return
      }

      onSuccess()
      onClose()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete registration request.'
      setErrorMessage(msg)
      setIsDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  // Resolved identity
  const memberName =
    fetchedProfile?.fullName ||
    member.profile?.fullName ||
    member.profile?.email?.split('@')[0] ||
    'Applicant'

  const memberEmail =
    fetchedProfile?.email ||
    member.profile?.email ||
    (member.userId.includes('@') ? member.userId : 'Email not confirmed')

  const memberPhone = member.phone || fetchedProfile?.phone || 'Not provided'
  const memberDate = member.createdAt ? new Date(member.createdAt).toLocaleString() : 'Recent'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden flex flex-col max-h-[92dvh] sm:max-h-[88vh]">
        {/* Sticky Header */}
        <div className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-800 px-4 py-3.5 sm:px-6 sm:py-4 bg-slate-950/95 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-950/80 border border-emerald-800/80 text-emerald-400">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="text-left">
              <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
                Review & Authorize Applicant
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-400">
                Verify identity, enforce strict single-site assignment, and grant operational duties.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <form onSubmit={handleApprove} className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5 space-y-4 sm:space-y-5 text-left">
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* User Details Summary Card */}
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/80 space-y-2.5 text-xs font-mono">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-800/80 pb-2">
              <span className="text-slate-400 flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-blue-400" />
                Applicant Full Name:
              </span>
              <span className="text-white font-bold text-sm">{memberName}</span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-800/80 pb-2">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-blue-400" />
                Email Address:
              </span>
              <span className="text-blue-400 font-semibold">{memberEmail}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Phone className="h-3 w-3 text-slate-500" />
                  Phone:
                </span>
                <span className="text-slate-300">{memberPhone}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Calendar className="h-3 w-3 text-slate-500" />
                  Registered At:
                </span>
                <span className="text-slate-300">{memberDate}</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-slate-800/60 text-[11px]">
              <span className="text-slate-400">Current Status:</span>
              <span className="inline-flex items-center gap-1.5 text-amber-400 font-bold uppercase tracking-wider">
                <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                Pending Authorization
              </span>
            </div>
          </div>

          {/* Mandatory Site Lock Selection */}
          <div className="space-y-1.5">
            <label className="flex items-center justify-between text-xs font-semibold text-slate-200">
              <span className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-blue-400" />
                Assigned Site (Strict Single-Site Lock) *
              </span>
              <span className="text-[10px] font-mono text-emerald-400 font-normal">
                Mandatory Security Rule
              </span>
            </label>
            <select
              value={selectedSiteId}
              onChange={(e) => setSelectedSiteId(e.target.value)}
              required
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
            >
              <option value="" disabled>
                -- Select Mandatory Site --
              </option>
              {sites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.name} ({site.code}) {site.location ? `- ${site.location}` : ''}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-400 leading-normal">
              Single-Site Lock: Once assigned, this employee will only be permitted to view, log, and issue fuel/materials within this specific site.
            </p>
          </div>

          {/* Role & Department Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-200">
                System Access Role *
              </label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as 'ADMIN' | 'USER')}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-xs text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
              >
                <option value="USER">Standard User (Site Operations)</option>
                <option value="ADMIN">System Administrator (Full Privileges)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-200">
                Operational Role
              </label>
              <select
                value={selectedCustomRoleId}
                onChange={(e) => setSelectedCustomRoleId(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-xs text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
              >
                <option value="">-- General Site Staff --</option>
                {roles.filter((r) => r.code !== 'ADMIN').map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-200">
                Department (Optional)
              </label>
              <select
                value={selectedDepartmentId}
                onChange={(e) => setSelectedDepartmentId(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-xs text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
              >
                <option value="">-- None / General --</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Initial Task-Based Access Control (TBAC) Authorizations */}
          <div className="space-y-2.5 pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Initial Operational Task Permissions
                </h3>
                <p className="text-[11px] text-slate-400">
                  Select which operational workflows this user is authorized to execute.
                </p>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-mono">
                <button
                  type="button"
                  onClick={handleSelectAllTasks}
                  className="text-blue-400 hover:text-blue-300 transition-colors cursor-pointer"
                >
                  Select All
                </button>
                <span className="text-slate-600">|</span>
                <button
                  type="button"
                  onClick={handleClearAllTasks}
                  className="text-slate-400 hover:text-slate-300 transition-colors cursor-pointer"
                >
                  Clear
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {taskTypes.map((task) => {
                const isChecked = selectedTasks.has(task.id)
                return (
                  <label
                    key={task.id}
                    onClick={() => handleToggleTask(task.id)}
                    className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer select-none ${
                      isChecked
                        ? 'border-emerald-700/60 bg-emerald-950/20'
                        : 'border-slate-800 bg-slate-950 hover:border-slate-700'
                    }`}
                  >
                    <div
                      className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                        isChecked
                          ? 'border-emerald-500 bg-emerald-600 text-white'
                          : 'border-slate-600 bg-slate-900'
                      }`}
                    >
                      {isChecked && <Check className="h-3 w-3 stroke-[3]" />}
                    </div>
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-white">
                          {task.name}
                        </span>
                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 uppercase">
                          {task.module}
                        </span>
                      </div>
                      {task.description && (
                        <p className="text-[11px] text-slate-400 leading-tight">
                          {task.description}
                        </p>
                      )}
                    </div>
                  </label>
                )
              })}
            </div>
          </div>

          {/* Sticky Modal Footer Actions */}
          <div className="sticky bottom-0 z-20 -mx-4 -mb-4 sm:-mx-6 sm:-mb-5 p-4 sm:p-5 bg-slate-950/95 border-t border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Left: Reject & Delete Button */}
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={isSubmitting || isDeleting}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-rose-800/80 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 px-3.5 py-2.5 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5 text-rose-400" />
              <span>Reject & Delete Request</span>
            </button>

            {/* Right: Cancel & Approve */}
            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting || isDeleting}
                className="flex-1 sm:flex-none rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-xs font-medium text-slate-300 hover:bg-slate-750 transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || isDeleting || !selectedSiteId}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 px-5 py-2.5 text-xs font-bold text-white transition-all cursor-pointer shadow-lg shadow-emerald-600/20"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Authorizing...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-4 w-4" />
                    <span>Approve & Authorize User</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>

        {/* Delete Confirmation Modal Layer */}
        {showDeleteConfirm && (
          <div className="absolute inset-0 z-30 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in">
            <div className="w-full max-w-md rounded-2xl border border-rose-700/80 bg-slate-900 p-6 shadow-2xl text-left space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-rose-950 text-rose-400 border border-rose-800">
                  <AlertTriangle className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Permanently Delete Registration?
                  </h3>
                  <p className="text-xs text-rose-300/80">
                    This action cannot be undone.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300 space-y-1">
                <div>Applicant: <strong className="text-white">{memberName}</strong></div>
                <div>Email: <strong className="text-blue-400">{memberEmail}</strong></div>
                <p className="text-[11px] text-slate-400 pt-1">
                  This user account will be completely removed from Supabase authentication, profiles, and organization records.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setShowDeleteConfirm(false)}
                  className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-750 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleDeleteRequest}
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
                      <span>Confirm Permanent Deletion</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
