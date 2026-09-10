import React, { useState } from 'react'
import {
  X,
  Shield,
  CheckCircle2,
  AlertCircle,
  Briefcase,
  Building,
  Save,
  Fuel,
  Package,
  ShoppingCart,
  Wrench,
  Cpu,
  Truck,
  Boxes,
} from 'lucide-react'
import type {
  EnhancedMember,
  Role,
  Department,
  Site,
  TaskType,
  UserTaskAssignment,
} from '../../../types/rbac'
import { PeopleRepository } from '../../../repositories/admin/people-repository'

interface UserDetailDrawerProps {
  member: EnhancedMember
  roles: Role[]
  departments: Department[]
  sites: Site[]
  taskTypes: TaskType[]
  organizationId: string
  onClose: () => void
  onSaveSuccess: () => void
}

const MODULE_ICONS: Record<string, React.ElementType> = {
  FUEL: Fuel,
  INVENTORY: Package,
  PROCUREMENT: ShoppingCart,
  FLEET: Wrench,
  OPERATIONS: Cpu,
  LOGISTICS: Truck,
  DEFAULT: Boxes,
}

export function UserDetailDrawer({
  member,
  roles,
  departments,
  sites,
  taskTypes,
  organizationId,
  onClose,
  onSaveSuccess,
}: UserDetailDrawerProps) {
  const [role, setRole] = useState(member.role || 'USER')
  const [customRoleId, setCustomRoleId] = useState(member.customRoleId || '')
  const [departmentId, setDepartmentId] = useState(member.departmentId || '')
  const [siteId, setSiteId] = useState(member.siteId || '')
  const [designation, setDesignation] = useState(member.designation || '')
  const [employeeCode, setEmployeeCode] = useState(member.employeeCode || '')
  const [phone, setPhone] = useState(member.phone || '')
  const [isActive, setIsActive] = useState(member.isActive ?? true)

  // Map of taskTypeId -> UserTaskAssignment initialized from member
  const [selectedTasks, setSelectedTasks] = useState<Map<string, UserTaskAssignment>>(() => {
    const map = new Map<string, UserTaskAssignment>()
    member.assignedTasks.forEach((t) => {
      map.set(t.taskTypeId, { ...t })
    })
    return map
  })
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const handleToggleTask = (task: TaskType) => {
    const map = new Map(selectedTasks)
    if (map.has(task.id)) {
      map.delete(task.id)
    } else {
      map.set(task.id, {
        taskTypeId: task.id,
        code: task.code,
        name: task.name,
        module: task.module,
        icon: task.icon,
        canInitiate: true,
        canExecute: true,
        canApprove: true,
      })
    }
    setSelectedTasks(map)
  }

  const handleSubPermissionToggle = async (
    taskTypeId: string,
    field: 'canInitiate' | 'canExecute' | 'canApprove'
  ) => {
    const map = new Map(selectedTasks)
    const existing = map.get(taskTypeId)
    if (existing) {
      const nextVal = !existing[field]
      map.set(taskTypeId, {
        ...existing,
        [field]: nextVal,
      })
      setSelectedTasks(map)

      // Live persist to database immediately
      const label = field === 'canInitiate' ? 'Initiate' : field === 'canExecute' ? 'Execute' : 'Approval'
      try {
        const res = await PeopleRepository.updateUserTaskSubPermission(
          organizationId,
          member.userId,
          taskTypeId,
          field,
          nextVal
        )
        if (res.success) {
          setFeedback({
            type: 'success',
            message: `Real-time updated: ${existing.name} • ${label} is now ${nextVal ? 'ALLOWED' : 'REVOKED'}.`,
          })
          setTimeout(() => setFeedback(null), 3000)
        } else {
          setFeedback({
            type: 'error',
            message: `Failed to update ${label}: ${res.error || 'Server error'}`,
          })
        }
      } catch (err: unknown) {
        console.error('[UserDetailDrawer] Real-time sub-permission update error:', err)
      }
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setFeedback(null)

    const tasksPayload = Array.from(selectedTasks.values()).map((t) => ({
      taskTypeId: t.taskTypeId,
      code: t.code,
      name: t.name,
      module: t.module,
      icon: t.icon,
      canInitiate: t.canInitiate,
      canExecute: t.canExecute,
      canApprove: t.canApprove,
    }))

    const result = await PeopleRepository.saveMemberAssignments({
      memberId: member.id,
      userId: member.userId,
      organizationId,
      role,
      customRoleId: customRoleId || null,
      departmentId: departmentId || null,
      siteId: siteId || null,
      designation: designation || null,
      employeeCode: employeeCode || null,
      phone: phone || null,
      isActive,
      tasks: tasksPayload,
    })

    setSaving(false)

    if (result.success) {
      setFeedback({ type: 'success', message: 'Employee responsibilities and profile updated successfully.' })
      setTimeout(() => {
        onSaveSuccess()
      }, 800)
    } else {
      setFeedback({ type: 'error', message: result.error || 'Failed to save changes.' })
    }
  }

  // Group task types by module
  const tasksByModule = taskTypes.reduce((acc, task) => {
    const mod = task.module || 'OPERATIONS'
    if (!acc[mod]) acc[mod] = []
    acc[mod].push(task)
    return acc
  }, {} as Record<string, TaskType[]>)

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs transition-opacity flex justify-end">
      <div className="relative w-full max-w-2xl bg-white border-l border-slate-200 shadow-2xl flex flex-col h-full overflow-hidden text-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 font-bold text-sm">
              {(member.profile?.fullName || member.profile?.email || 'U').slice(0, 2).toUpperCase()}
            </div>
            <div className="text-left">
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                {member.profile?.fullName || 'Unnamed Personnel'}
              </h2>
              <p className="text-xs text-slate-500 font-mono">
                {member.profile?.email || member.userId}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`mx-6 mt-4 p-3 rounded-lg flex items-center gap-2 text-xs ${
              feedback.type === 'success'
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border border-rose-200 text-rose-800'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* Scrollable Form Body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-6 text-left">
          {/* Section 1: Role & Organization Placement */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-blue-700 font-bold">
              <Briefcase className="h-4 w-4 text-blue-600" />
              <span>Role & Organizational Assignment</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Primary Role */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Primary Access Role
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-none transition-colors"
                >
                  <option value="USER">USER (Standard Member)</option>
                  <option value="ADMIN">ADMIN (Full Access)</option>
                </select>
              </div>

              {/* Functional Designation / Custom Role */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Functional Role
                </label>
                <select
                  value={customRoleId}
                  onChange={(e) => setCustomRoleId(e.target.value)}
                  className="w-full rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-none transition-colors"
                >
                  <option value="">-- Assign Functional Role --</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Department */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Department
                </label>
                <div className="relative">
                  <select
                    value={departmentId}
                    onChange={(e) => setDepartmentId(e.target.value)}
                    className="w-full rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-none transition-colors"
                  >
                    <option value="">-- No Department Assigned --</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Site / Yard Allocation */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Project Site / Location
                </label>
                <div className="relative">
                  <select
                    value={siteId}
                    onChange={(e) => setSiteId(e.target.value)}
                    className="w-full rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-none transition-colors"
                  >
                    <option value="">-- Head Office / All Sites --</option>
                    {sites.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Employee Details */}
          <div className="space-y-4 pt-2 border-t border-slate-100">
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-slate-500 font-bold">
              <Building className="h-4 w-4 text-slate-400" />
              <span>Employee Information</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-slate-600">
                  Employee Code
                </label>
                <input
                  type="text"
                  placeholder="e.g. EMP-104"
                  value={employeeCode}
                  onChange={(e) => setEmployeeCode(e.target.value)}
                  className="w-full rounded-lg bg-slate-50 border border-slate-200 px-3 py-1.5 text-xs text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-none transition-colors"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-slate-600">
                  Designation / Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Site Supervisor"
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  className="w-full rounded-lg bg-slate-50 border border-slate-200 px-3 py-1.5 text-xs text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-none transition-colors"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-slate-600">
                  Contact Phone
                </label>
                <input
                  type="text"
                  placeholder="+91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-lg bg-slate-50 border border-slate-200 px-3 py-1.5 text-xs text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-none transition-colors"
                />
              </div>
            </div>

            {/* Membership Active Toggle */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <div>
                <p className="text-xs font-bold text-slate-900">Membership Status</p>
                <p className="text-[11px] text-slate-500">
                  Allow or revoke login access to this organization workspace.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsActive(!isActive)}
                className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  isActive ? 'bg-emerald-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    isActive ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Section 3: Task-Based Access Control (TBAC) */}
          <div className="space-y-4 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-emerald-700 font-bold">
                <Shield className="h-4 w-4 text-emerald-600" />
                <span>Task Responsibilities (TBAC)</span>
              </div>
              <span className="text-[11px] font-mono text-slate-500">
                {selectedTasks.size} / {taskTypes.length} assigned
              </span>
            </div>

            <p className="text-xs text-slate-500">
              Check specific operational workflows this employee is authorized to perform. For example, give a user access to <span className="text-slate-800 font-semibold">Diesel Issue</span> without granting full administrative permissions.
            </p>

            <div className="space-y-4">
              {Object.entries(tasksByModule).map(([modName, tasks]) => {
                const ModIcon = MODULE_ICONS[modName] || MODULE_ICONS.DEFAULT

                return (
                  <div key={modName} className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
                    <div className="flex items-center gap-2 px-3.5 py-2 bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-800">
                      <ModIcon className="h-3.5 w-3.5 text-blue-600" />
                      <span className="tracking-wide">{modName}</span>
                    </div>

                    <div className="divide-y divide-slate-100">
                      {tasks.map((task) => {
                        const isAssigned = selectedTasks.has(task.id)
                        const assignment = selectedTasks.get(task.id)

                        return (
                          <div
                            key={task.id}
                            className={`p-3.5 transition-colors ${
                              isAssigned ? 'bg-blue-50/40' : 'hover:bg-slate-50'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <label className="flex items-center gap-3 cursor-pointer select-none">
                                <input
                                  type="checkbox"
                                  checked={isAssigned}
                                  onChange={() => handleToggleTask(task)}
                                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                />
                                <div>
                                  <p className="text-xs font-bold text-slate-900">
                                    {task.name}
                                  </p>
                                  <p className="text-[11px] text-slate-400 font-mono">
                                    {task.code}
                                  </p>
                                </div>
                              </label>

                              <span
                                className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                                  task.defaultPriority === 'CRITICAL'
                                    ? 'bg-rose-50 border-rose-200 text-rose-700'
                                    : 'bg-slate-100 border-slate-200 text-slate-600'
                                }`}
                              >
                                {task.defaultPriority}
                              </span>
                            </div>

                            {/* Detailed Sub-Permissions (Initiate, Execute, Approve) */}
                            {isAssigned && assignment && (
                              <div className="mt-2.5 ml-7 flex flex-wrap items-center gap-3 text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                                <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 hover:text-slate-900 font-medium">
                                  <input
                                    type="checkbox"
                                    checked={assignment.canInitiate}
                                    onChange={() =>
                                      handleSubPermissionToggle(task.id, 'canInitiate')
                                    }
                                    className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600"
                                  />
                                  <span>Initiate / Create</span>
                                </label>

                                <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 hover:text-slate-900 font-medium">
                                  <input
                                    type="checkbox"
                                    checked={assignment.canExecute}
                                    onChange={() =>
                                      handleSubPermissionToggle(task.id, 'canExecute')
                                    }
                                    className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600"
                                  />
                                  <span>Execute / Log</span>
                                </label>

                                <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 hover:text-slate-900 font-medium">
                                  <input
                                    type="checkbox"
                                    checked={assignment.canApprove}
                                    onChange={() =>
                                      handleSubPermissionToggle(task.id, 'canApprove')
                                    }
                                    className="h-3.5 w-3.5 rounded border-slate-300 text-emerald-600"
                                  />
                                  <span className="text-emerald-700 font-bold">Approve</span>
                                </label>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 pb-2 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 transition-colors cursor-pointer shadow-2xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-xs font-semibold text-white transition-colors cursor-pointer shadow-xs"
            >
              <Save className="h-4 w-4" />
              <span>{saving ? 'Saving...' : 'Save Responsibilities'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
