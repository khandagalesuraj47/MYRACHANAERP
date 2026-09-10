import React, { useState, useMemo } from 'react'
import {
  Search,
  Check,
  MapPin,
  Loader2,
  Sparkles,
  Fuel,
  Truck,
  Package,
  Boxes,
  ShoppingCart,
  Wrench,
  Cpu,
  Briefcase,
  Layers,
} from 'lucide-react'
import type { EnhancedMember, Site, TaskType } from '../../../types/rbac'
import { PeopleRepository } from '../../../repositories/admin/people-repository'

interface TaskMatrixViewProps {
  organizationId: string
  members: EnhancedMember[]
  sites: Site[]
  taskTypes: TaskType[]
  onRefresh?: () => void
}

// Icon helper for dynamic tasks
function getTaskIcon(iconName?: string | null, module?: string) {
  const name = (iconName || '').toLowerCase()
  if (name.includes('fuel')) return Fuel
  if (name.includes('truck')) return Truck
  if (name.includes('wrench')) return Wrench
  if (name.includes('package')) return Package
  if (name.includes('box')) return Boxes
  if (name.includes('cart')) return ShoppingCart
  if (name.includes('briefcase')) return Briefcase
  if (name.includes('cpu')) return Cpu

  // Fallback by module
  if (module === 'FUEL') return Fuel
  if (module === 'FLEET') return Wrench
  if (module === 'INVENTORY') return Package
  if (module === 'PROCUREMENT') return Briefcase
  return Layers
}

export function TaskMatrixView({
  organizationId,
  members,
  sites,
  taskTypes,
  onRefresh,
}: TaskMatrixViewProps) {
  const [selectedSiteId, setSelectedSiteId] = useState<string>('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [updatingKey, setUpdatingKey] = useState<string | null>(null)
  const [statusNotice, setStatusNotice] = useState<string | null>(null)

  // Local optimistic overrides for task assignments: key `${userId}::${taskTypeId}`
  const [overrideAssignments, setOverrideAssignments] = useState<Map<string, boolean>>(new Map())
  // Local optimistic overrides for sub-permissions: key `${userId}::${taskTypeId}::${field}`
  const [subPermissionOverrides, setSubPermissionOverrides] = useState<Map<string, boolean>>(new Map())

  // Check if a task is assigned to a user (combining server data + optimistic overrides)
  const isTaskAssigned = (userId: string, task: TaskType): boolean => {
    const key = `${userId}::${task.id}`
    if (overrideAssignments.has(key)) {
      return overrideAssignments.get(key)!
    }
    const member = members.find((m) => m.userId === userId)
    return (
      member?.assignedTasks?.some(
        (t) => t.taskTypeId === task.id || (t.code && t.code === task.code)
      ) ?? false
    )
  }

  // Check sub-permission status (Initiate, Execute, Approve)
  const getSubPermission = (
    userId: string,
    task: TaskType,
    field: 'canInitiate' | 'canExecute' | 'canApprove'
  ): boolean => {
    const key = `${userId}::${task.id}::${field}`
    if (subPermissionOverrides.has(key)) {
      return subPermissionOverrides.get(key)!
    }
    const member = members.find((m) => m.userId === userId)
    const assignment = member?.assignedTasks?.find(
      (t) => t.taskTypeId === task.id || (t.code && t.code === task.code)
    )
    if (!assignment) return false
    return !!assignment[field]
  }

  // Handle individual sub-permission toggle (Initiate, Execute, Approve) in real-time
  const handleToggleSubPermission = async (
    e: React.MouseEvent,
    member: EnhancedMember,
    task: TaskType,
    field: 'canInitiate' | 'canExecute' | 'canApprove'
  ) => {
    e.stopPropagation()
    const key = `${member.userId}::${task.id}::${field}`
    const currentVal = getSubPermission(member.userId, task, field)
    const nextVal = !currentVal

    // Optimistic UI update
    setSubPermissionOverrides((prev) => {
      const copy = new Map(prev)
      copy.set(key, nextVal)
      return copy
    })

    // If the task wasn't marked assigned, mark it assigned optimistically
    const cellKey = `${member.userId}::${task.id}`
    if (!isTaskAssigned(member.userId, task)) {
      setOverrideAssignments((prev) => {
        const copy = new Map(prev)
        copy.set(cellKey, true)
        return copy
      })
    }

    setUpdatingKey(key)
    const empName = member.profile?.fullName || member.profile?.email?.split('@')[0] || 'Employee'
    const label = field === 'canInitiate' ? 'Initiate' : field === 'canExecute' ? 'Execute' : 'Approval'

    try {
      const res = await PeopleRepository.updateUserTaskSubPermission(
        organizationId,
        member.userId,
        task.id,
        field,
        nextVal
      )

      if (!res.success) {
        setSubPermissionOverrides((prev) => {
          const copy = new Map(prev)
          copy.set(key, currentVal)
          return copy
        })
        setStatusNotice(`Error: ${res.error || 'Failed to update'}`)
      } else {
        setStatusNotice(`Live Updated: ${empName} • ${task.name} → ${label}: ${nextVal ? 'ALLOWED' : 'REVOKED'}`)
      }
    } catch {
      setSubPermissionOverrides((prev) => {
        const copy = new Map(prev)
        copy.set(key, currentVal)
        return copy
      })
      setStatusNotice(`Failed to update ${label}`)
    } finally {
      setUpdatingKey(null)
      if (onRefresh) onRefresh()
      setTimeout(() => setStatusNotice(null), 3000)
    }
  }

  // Filtered members list (by Site and Search Query) - ONLY APPROVED / ACTIVE USERS
  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      // 0. Only APPROVED (active) personnel appear in the Task Matrix! Pending self-registrations do not.
      if (!m.isActive) {
        return false
      }

      // 1. Site Filter
      if (selectedSiteId !== 'ALL' && m.siteId !== selectedSiteId) {
        return false
      }

      // 2. Search Query (Name, Email, Code)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const name = (m.profile?.fullName || '').toLowerCase()
        const email = (m.profile?.email || '').toLowerCase()
        const code = (m.employeeCode || '').toLowerCase()
        if (!name.includes(q) && !email.includes(q) && !code.includes(q)) {
          return false
        }
      }

      return true
    })
  }, [members, selectedSiteId, searchQuery])

  // Handle cell checkbox toggle
  const handleToggleCell = async (member: EnhancedMember, task: TaskType) => {
    const key = `${member.userId}::${task.id}`
    const currentlyAssigned = isTaskAssigned(member.userId, task)
    const nextState = !currentlyAssigned

    // Optimistic UI update
    setOverrideAssignments((prev) => {
      const copy = new Map(prev)
      copy.set(key, nextState)
      return copy
    })

    setUpdatingKey(key)
    const empName = member.profile?.fullName || member.profile?.email?.split('@')[0] || 'Employee'

    try {
      const res = await PeopleRepository.toggleUserTaskPermission(
        organizationId,
        member.userId,
        task.id,
        nextState
      )

      if (!res.success) {
        // Revert on error
        setOverrideAssignments((prev) => {
          const copy = new Map(prev)
          copy.set(key, currentlyAssigned)
          return copy
        })
        setStatusNotice(`Error updating permission: ${res.error || 'Server rejected'}`)
      } else {
        setStatusNotice(
          nextState
            ? `Assigned "${task.name}" to ${empName}`
            : `Revoked "${task.name}" from ${empName}`
        )
      }
    } catch {
      // Revert on error
      setOverrideAssignments((prev) => {
        const copy = new Map(prev)
        copy.set(key, currentlyAssigned)
        return copy
      })
      setStatusNotice(`Failed to update ${task.name}`)
    } finally {
      setUpdatingKey(null)
      if (onRefresh) onRefresh()
      setTimeout(() => setStatusNotice(null), 3000)
    }
  }

  // Filter to strictly the 4 Core Tasks
  const coreTasks = useMemo(() => {
    const allowed = ['ITEM_MASTER', 'ASSET_MASTER', 'VENDOR_MASTER', 'DIESEL_REQUISITION']
    return taskTypes.filter((t) => allowed.includes(t.code))
  }, [taskTypes])

  // Sites lookup map for quick name resolution
  const sitesMap = useMemo(() => {
    const map = new Map<string, Site>()
    sites.forEach((s) => map.set(s.id, s))
    return map
  }, [sites])

  return (
    <div className="space-y-4">
      {/* Top Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          {/* Site Filter Dropdown */}
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-blue-600 shrink-0" />
            <select
              value={selectedSiteId}
              onChange={(e) => setSelectedSiteId(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-none transition-colors shadow-2xs"
            >
              <option value="ALL">All Operational Sites ({sites.length})</option>
              {sites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.name} ({site.code})
                </option>
              ))}
            </select>
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search personnel by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none transition-colors w-60 shadow-2xs"
            />
          </div>
        </div>

        {/* Live Status Notice Toast */}
        <div className="flex items-center gap-2 text-xs">
          {statusNotice && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 font-mono text-[11px] animate-in fade-in duration-200">
              <Sparkles className="h-3.5 w-3.5 text-blue-600 shrink-0" />
              <span>{statusNotice}</span>
            </div>
          )}
          <span className="font-mono text-[11px] text-slate-600 bg-slate-100 px-2 py-1 rounded border border-slate-200">
            {filteredMembers.length} Staff • {coreTasks.length} Core Tasks
          </span>
        </div>
      </div>

      {/* High-Density TBAC Responsibility Matrix Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto max-h-[600px] scrollbar-thin scrollbar-thumb-slate-200">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 sticky top-0 z-20">
                <th className="p-3.5 font-mono text-[11px] font-bold text-slate-600 uppercase tracking-wider min-w-[240px] sticky left-0 z-30 bg-slate-50 border-r border-slate-200">
                  Employee / Operating Site
                </th>
                {coreTasks.map((task) => {
                  const IconComp = getTaskIcon(task.icon, task.module)
                  return (
                    <th
                      key={task.id}
                      className="p-3 font-mono text-[11px] font-semibold text-slate-600 text-center min-w-[130px] border-r border-slate-200 last:border-r-0 hover:bg-slate-100/60 transition-colors"
                    >
                      <div className="flex flex-col items-center gap-1">
                        <div className="p-1 rounded bg-blue-50 border border-blue-200 text-blue-600">
                          <IconComp className="h-3.5 w-3.5" />
                        </div>
                        <span className="text-[11px] font-bold text-slate-900 tracking-tight">
                          {task.name}
                        </span>
                        <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-slate-100 text-slate-500 uppercase">
                          {task.module}
                        </span>
                      </div>
                    </th>
                  )
                })}
              </tr>
            </thead>

          {/* Table Body: Employees with Interactive Matrix Checkbox Cells */}
          <tbody className="divide-y divide-slate-100">
            {filteredMembers.length > 0 ? (
              filteredMembers.map((member) => {
                const assignedSite = member.siteId ? sitesMap.get(member.siteId) : null
                const empName =
                  member.profile?.fullName || member.profile?.email?.split('@')[0] || 'Unknown'
                const empEmail = member.profile?.email || 'No email'

                return (
                  <tr
                    key={member.id}
                    className="hover:bg-slate-50/80 transition-colors group"
                  >
                    {/* Sticky Employee Details Column */}
                    <td className="p-3.5 sticky left-0 z-10 bg-white group-hover:bg-slate-50 transition-colors border-r border-slate-200">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 border border-blue-200 font-mono text-xs font-bold text-blue-700">
                          {empName.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="space-y-0.5 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-xs truncate">
                              {empName}
                            </span>
                            {member.role === 'ADMIN' && (
                              <span className="font-mono text-[9px] px-1 rounded bg-amber-50 border border-amber-200 text-amber-800 uppercase">
                                ADMIN
                              </span>
                            )}
                            {!member.isActive && (
                              <span className="font-mono text-[9px] px-1 rounded bg-rose-50 border border-rose-200 text-rose-800 uppercase">
                                INACTIVE
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] font-mono text-slate-500 truncate">
                            {empEmail}
                          </p>
                          <div className="flex items-center gap-1 text-[10px] font-mono text-slate-600">
                            <MapPin className="h-3 w-3 text-amber-600 shrink-0" />
                            <span className="truncate">
                              {assignedSite ? `${assignedSite.name} (${assignedSite.code})` : 'No Site Assigned'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Dynamic Task Checkbox Cells with Granular Sub-Permissions */}
                    {coreTasks.map((task) => {
                      const key = `${member.userId}::${task.id}`
                      const isAssigned = isTaskAssigned(member.userId, task)
                      const isUpdating = updatingKey === key
                      const canInit = getSubPermission(member.userId, task, 'canInitiate')
                      const canExec = getSubPermission(member.userId, task, 'canExecute')
                      const canAppr = getSubPermission(member.userId, task, 'canApprove')

                      return (
                        <td
                          key={task.id}
                          className={`p-2.5 text-center border-r border-slate-100 last:border-r-0 select-none transition-all ${
                            isAssigned
                              ? 'bg-emerald-50/40 hover:bg-emerald-50/70'
                              : 'hover:bg-slate-100/50'
                          }`}
                        >
                          <div className="flex flex-col items-center justify-center gap-1.5">
                            {/* Main Task Assignment Checkbox */}
                            <button
                              type="button"
                              onClick={() => !isUpdating && handleToggleCell(member, task)}
                              title={isAssigned ? `Revoke ${task.name}` : `Assign ${task.name}`}
                              className="cursor-pointer focus:outline-none"
                            >
                              {isUpdating ? (
                                <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                              ) : (
                                <div
                                  className={`flex h-5 w-5 items-center justify-center rounded-md border transition-all ${
                                    isAssigned
                                      ? 'border-emerald-500 bg-emerald-600 text-white shadow-xs hover:bg-emerald-700'
                                      : 'border-slate-300 bg-slate-50 hover:border-slate-400'
                                  }`}
                                >
                                  {isAssigned && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                                </div>
                              )}
                            </button>

                            {/* Granular Sub-Permission Pills: [I] [E] [A] */}
                            {isAssigned && (
                              <div className="flex items-center gap-1 mt-0.5">
                                <button
                                  type="button"
                                  onClick={(e) => handleToggleSubPermission(e, member, task, 'canInitiate')}
                                  title={`Initiate: ${canInit ? 'ALLOWED' : 'DISABLED'} (Click to toggle)`}
                                  className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold tracking-tight transition-all cursor-pointer ${
                                    canInit
                                      ? 'bg-blue-600 text-white shadow-2xs hover:bg-blue-700 ring-1 ring-blue-600/30'
                                      : 'bg-slate-100 text-slate-400 border border-slate-200 hover:bg-slate-200'
                                  }`}
                                >
                                  I
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => handleToggleSubPermission(e, member, task, 'canExecute')}
                                  title={`Execute: ${canExec ? 'ALLOWED' : 'DISABLED'} (Click to toggle)`}
                                  className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold tracking-tight transition-all cursor-pointer ${
                                    canExec
                                      ? 'bg-emerald-600 text-white shadow-2xs hover:bg-emerald-700 ring-1 ring-emerald-600/30'
                                      : 'bg-slate-100 text-slate-400 border border-slate-200 hover:bg-slate-200'
                                  }`}
                                >
                                  E
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => handleToggleSubPermission(e, member, task, 'canApprove')}
                                  title={`Approval: ${canAppr ? 'ALLOWED' : 'DISABLED'} (Click to toggle)`}
                                  className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold tracking-tight transition-all cursor-pointer ${
                                    canAppr
                                      ? 'bg-purple-600 text-white shadow-2xs hover:bg-purple-700 ring-1 ring-purple-600/30'
                                      : 'bg-slate-100 text-slate-400 border border-slate-200 hover:bg-slate-200'
                                  }`}
                                >
                                  A
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                )
              })
            ) : (
              <tr>
                <td
                  colSpan={taskTypes.length + 1}
                  className="p-8 text-center text-slate-500 text-xs font-mono"
                >
                  No employees found matching the selected site or search query.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </div>

      {/* Legend & Instructions */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] font-mono text-slate-500 pt-1">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-1.5">
            <div className="h-3.5 w-3.5 rounded bg-emerald-600 border border-emerald-500 flex items-center justify-center text-white">
              <Check className="h-2.5 w-2.5 stroke-[3]" />
            </div>
            <span>Authorized</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-blue-600 text-white">I</span>
            <span>Initiate</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-600 text-white">E</span>
            <span>Execute</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-purple-600 text-white">A</span>
            <span>Approval</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-3.5 w-3.5 rounded bg-slate-100 border border-slate-300" />
            <span>Unauthorized / Disabled</span>
          </div>
        </div>

        <div className="text-slate-500">
          Click checkbox or [I] [E] [A] pills to toggle permissions in real-time.
        </div>
      </div>
    </div>
  )
}
