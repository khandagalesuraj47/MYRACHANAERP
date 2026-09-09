import React, { useState } from 'react'
import {
  X,
  ShieldCheck,
  MapPin,
  AlertCircle,
  Check,
  Loader2,
} from 'lucide-react'
import type { EnhancedMember, Site, Role, Department, TaskType } from '../../../types/rbac'
import { PeopleRepository } from '../../../repositories/admin/people-repository'

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

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

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

  const memberName = member.profile?.fullName || member.profile?.email?.split('@')[0] || 'Unregistered User'
  const memberEmail = member.profile?.email || 'No email'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4 bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-950/80 border border-emerald-800/80 text-emerald-400">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Authorize Registration Request
              </h2>
              <p className="text-xs text-slate-400">
                Verify account identity, configure strict site assignment, and assign operational task roles.
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

        {/* Modal Body */}
        <form onSubmit={handleApprove} className="flex-1 overflow-y-auto p-6 space-y-5 text-left">
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* User Details Summary */}
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/70 space-y-2 text-xs font-mono">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Applicant Name:</span>
              <span className="text-white font-bold">{memberName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Email Address:</span>
              <span className="text-blue-400 font-medium">{memberEmail}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Current Status:</span>
              <span className="text-amber-400 font-bold uppercase tracking-wider">Pending Admin Approval</span>
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

          {/* Modal Footer Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-xs font-medium text-slate-300 hover:bg-slate-750 transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !selectedSiteId}
              className="flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 px-5 py-2.5 text-xs font-bold text-white transition-all cursor-pointer shadow-lg shadow-emerald-600/20"
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
        </form>
      </div>
    </div>
  )
}
