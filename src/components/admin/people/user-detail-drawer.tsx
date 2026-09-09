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

  const handleSubPermissionToggle = (
    taskTypeId: string,
    field: 'canInitiate' | 'canExecute' | 'canApprove'
  ) => {
    const map = new Map(selectedTasks)
    const existing = map.get(taskTypeId)
    if (existing) {
      map.set(taskTypeId, {
        ...existing,
        [field]: !existing[field],
      })
      setSelectedTasks(map)
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
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-xs transition-opacity flex justify-end">
      <div className="relative w-full max-w-2xl bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col h-full overflow-hidden text-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold text-sm">
              {(member.profile?.fullName || member.profile?.email || 'U').slice(0, 2).toUpperCase()}
            </div>
            <div className="text-left">
              <h2 className="text-sm font-bold text-white tracking-tight">
                {member.profile?.fullName || 'Unnamed Personnel'}
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                {member.profile?.email || member.userId}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`mx-6 mt-4 p-3 rounded-lg flex items-center gap-2 text-xs ${
              feedback.type === 'success'
                ? 'bg-emerald-950/60 border border-emerald-800/80 text-emerald-300'
                : 'bg-rose-950/60 border border-rose-800/80 text-rose-300'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* Scrollable Form Body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-6 text-left">
          {/* Section 1: Role & Organization Placement */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-blue-400">
              <Briefcase className="h-4 w-4" />
              <span>Role & Organizational Assignment</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Primary Role */}
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-300">
                  Primary Access Role
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-slate-200 focus:border-blue-500 focus:outline-none"
                >
                  <option value="USER">USER (Standard Member)</option>
                  <option value="ADMIN">ADMIN (Full Access)</option>
                </select>
              </div>

              {/* Functional Designation / Custom Role */}
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-300">
                  Functional Role
                </label>
                <select
                  value={customRoleId}
                  onChange={(e) => setCustomRoleId(e.target.value)}
                  className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-slate-200 focus:border-blue-500 focus:outline-none"
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
                <label className="block text-xs font-medium text-slate-300">
                  Department
                </label>
                <div className="relative">
                  <select
                    value={departmentId}
                    onChange={(e) => setDepartmentId(e.target.value)}
                    className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-slate-200 focus:border-blue-500 focus:outline-none"
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
                <label className="block text-xs font-medium text-slate-300">
                  Project Site / Location
                </label>
                <div className="relative">
                  <select
                    value={siteId}
                    onChange={(e) => setSiteId(e.target.value)}
                    className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-slate-200 focus:border-blue-500 focus:outline-none"
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
          <div className="space-y-4 pt-2 border-t border-slate-800/80">
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-slate-400">
              <Building className="h-4 w-4" />
              <span>Employee Information</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-slate-400">
                  Employee Code
                </label>
                <input
                  type="text"
                  placeholder="e.g. EMP-104"
                  value={employeeCode}
                  onChange={(e) => setEmployeeCode(e.target.value)}
                  className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-1.5 text-xs text-slate-200 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-slate-400">
                  Designation / Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Site Supervisor"
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-1.5 text-xs text-slate-200 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-slate-400">
                  Contact Phone
                </label>
                <input
                  type="text"
                  placeholder="+91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-1.5 text-xs text-slate-200 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Membership Active Toggle */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950/60 border border-slate-800">
              <div>
                <p className="text-xs font-medium text-white">Membership Status</p>
                <p className="text-[11px] text-slate-400">
                  Allow or revoke login access to this organization workspace.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsActive(!isActive)}
                className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  isActive ? 'bg-emerald-600' : 'bg-slate-700'
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
          <div className="space-y-4 pt-2 border-t border-slate-800/80">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-emerald-400">
                <Shield className="h-4 w-4" />
                <span>Task Responsibilities (TBAC)</span>
              </div>
              <span className="text-[11px] font-mono text-slate-400">
                {selectedTasks.size} / {taskTypes.length} assigned
              </span>
            </div>

            <p className="text-xs text-slate-400">
              Check specific operational workflows this employee is authorized to perform. For example, give a user access to <span className="text-slate-200 font-medium">Diesel Issue</span> without granting full administrative permissions.
            </p>

            <div className="space-y-4">
              {Object.entries(tasksByModule).map(([modName, tasks]) => {
                const ModIcon = MODULE_ICONS[modName] || MODULE_ICONS.DEFAULT

                return (
                  <div key={modName} className="rounded-xl border border-slate-800 bg-slate-950/50 overflow-hidden">
                    <div className="flex items-center gap-2 px-3.5 py-2 bg-slate-900/90 border-b border-slate-800/70 text-xs font-semibold text-slate-300">
                      <ModIcon className="h-3.5 w-3.5 text-blue-400" />
                      <span className="tracking-wide">{modName}</span>
                    </div>

                    <div className="divide-y divide-slate-800/60">
                      {tasks.map((task) => {
                        const isAssigned = selectedTasks.has(task.id)
                        const assignment = selectedTasks.get(task.id)

                        return (
                          <div
                            key={task.id}
                            className={`p-3 transition-colors ${
                              isAssigned ? 'bg-blue-950/15' : 'hover:bg-slate-900/40'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <label className="flex items-center gap-3 cursor-pointer select-none">
                                <input
                                  type="checkbox"
                                  checked={isAssigned}
                                  onChange={() => handleToggleTask(task)}
                                  className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-blue-500 focus:ring-offset-slate-950"
                                />
                                <div>
                                  <p className="text-xs font-semibold text-white">
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
                                    ? 'bg-rose-950/60 border-rose-800 text-rose-300'
                                    : 'bg-slate-800 border-slate-700 text-slate-300'
                                }`}
                              >
                                {task.defaultPriority}
                              </span>
                            </div>

                            {/* Detailed Sub-Permissions (Initiate, Execute, Approve) */}
                            {isAssigned && assignment && (
                              <div className="mt-2.5 ml-7 flex flex-wrap items-center gap-3 text-xs bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                                <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 hover:text-white">
                                  <input
                                    type="checkbox"
                                    checked={assignment.canInitiate}
                                    onChange={() =>
                                      handleSubPermissionToggle(task.id, 'canInitiate')
                                    }
                                    className="h-3.5 w-3.5 rounded border-slate-700 bg-slate-950 text-blue-500"
                                  />
                                  <span>Initiate / Create</span>
                                </label>

                                <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 hover:text-white">
                                  <input
                                    type="checkbox"
                                    checked={assignment.canExecute}
                                    onChange={() =>
                                      handleSubPermissionToggle(task.id, 'canExecute')
                                    }
                                    className="h-3.5 w-3.5 rounded border-slate-700 bg-slate-950 text-blue-500"
                                  />
                                  <span>Execute / Log</span>
                                </label>

                                <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 hover:text-white">
                                  <input
                                    type="checkbox"
                                    checked={assignment.canApprove}
                                    onChange={() =>
                                      handleSubPermissionToggle(task.id, 'canApprove')
                                    }
                                    className="h-3.5 w-3.5 rounded border-slate-700 bg-slate-950 text-emerald-500"
                                  />
                                  <span className="text-emerald-400 font-medium">Approve</span>
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
          <div className="pt-4 pb-2 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-750 text-xs font-medium text-slate-300 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-xs font-semibold text-white transition-colors cursor-pointer shadow-lg shadow-blue-600/20"
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
