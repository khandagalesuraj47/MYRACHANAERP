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

  // Check if a task is assigned to a user (combining server data + optimistic overrides)
  const isTaskAssigned = (userId: string, taskTypeId: string): boolean => {
    const key = `${userId}::${taskTypeId}`
    if (overrideAssignments.has(key)) {
      return overrideAssignments.get(key)!
    }
    const member = members.find((m) => m.userId === userId)
    return member?.assignedTasks?.some((t) => t.taskTypeId === taskTypeId) ?? false
  }

  // Filtered members list (by Site and Search Query)
  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
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
    const currentlyAssigned = isTaskAssigned(member.userId, task.id)
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

  // Sites lookup map for quick name resolution
  const sitesMap = useMemo(() => {
    const map = new Map<string, Site>()
    sites.forEach((s) => map.set(s.id, s))
    return map
  }, [sites])

  return (
    <div className="space-y-4">
      {/* Top Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-slate-800 bg-slate-900/60">
        <div className="flex flex-wrap items-center gap-3">
          {/* Site Filter Dropdown */}
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-blue-400 shrink-0" />
            <select
              value={selectedSiteId}
              onChange={(e) => setSelectedSiteId(e.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
            >
              <option value="ALL">All Operational Sites ({sites.length})</option>
              {sites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.name} ({site.code})
                </option>
              ))}
            </select>
          </div>

          {/* Search Box */}
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search employee (e.g. Shubham)..."
              className="w-full rounded-lg border border-slate-700 bg-slate-950 pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
            />
          </div>
        </div>

        {/* Real-time Notice / Stats */}
        <div className="flex items-center gap-3">
          {statusNotice ? (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-800/80 text-emerald-300 font-mono text-[11px] animate-in fade-in">
              <Sparkles className="h-3 w-3 text-emerald-400" />
              <span>{statusNotice}</span>
            </div>
          ) : (
            <div className="text-[11px] font-mono text-slate-400 flex items-center gap-3">
              <span>Employees: <strong className="text-white">{filteredMembers.length}</strong></span>
              <span>•</span>
              <span>Tasks: <strong className="text-white">{taskTypes.length}</strong></span>
            </div>
          )}
        </div>
      </div>

      {/* TBAC Matrix Table Container */}
      <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950 shadow-xl">
        <table className="w-full border-collapse text-left text-xs">
          {/* Table Header: Employee + Dynamic Task Type Columns */}
          <thead>
            <tr className="border-b border-slate-800 bg-slate-900/90 sticky top-0 z-20">
              <th className="p-3.5 font-mono text-[11px] font-bold text-slate-300 uppercase tracking-wider min-w-[240px] sticky left-0 z-30 bg-slate-900/95 backdrop-blur border-r border-slate-800">
                Employee / Operating Site
              </th>
              {taskTypes.map((task) => {
                const IconComp = getTaskIcon(task.icon, task.module)
                return (
                  <th
                    key={task.id}
                    className="p-3 font-mono text-[11px] font-semibold text-slate-300 text-center min-w-[130px] border-r border-slate-800/80 last:border-r-0 hover:bg-slate-800/40 transition-colors"
                  >
                    <div className="flex flex-col items-center gap-1">
                      <div className="p-1 rounded bg-slate-800 border border-slate-700 text-blue-400">
                        <IconComp className="h-3.5 w-3.5" />
                      </div>
                      <span className="text-[11px] font-bold text-white tracking-tight">
                        {task.name}
                      </span>
                      <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-slate-800/80 text-slate-400 uppercase">
                        {task.module}
                      </span>
                    </div>
                  </th>
                )
              })}
            </tr>
          </thead>

          {/* Table Body: Employees with Interactive Matrix Checkbox Cells */}
          <tbody className="divide-y divide-slate-800/60">
            {filteredMembers.length > 0 ? (
              filteredMembers.map((member) => {
                const assignedSite = member.siteId ? sitesMap.get(member.siteId) : null
                const empName =
                  member.profile?.fullName || member.profile?.email?.split('@')[0] || 'Unknown'
                const empEmail = member.profile?.email || 'No email'

                return (
                  <tr
                    key={member.id}
                    className="hover:bg-slate-900/40 transition-colors group"
                  >
                    {/* Sticky Employee Details Column */}
                    <td className="p-3.5 sticky left-0 z-10 bg-slate-950 group-hover:bg-slate-900/90 transition-colors border-r border-slate-800">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-950/80 border border-blue-800/70 font-mono text-xs font-bold text-blue-300">
                          {empName.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="space-y-0.5 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-xs truncate">
                              {empName}
                            </span>
                            {member.role === 'ADMIN' && (
                              <span className="font-mono text-[9px] px-1 rounded bg-amber-950/80 border border-amber-800 text-amber-300 uppercase">
                                ADMIN
                              </span>
                            )}
                            {!member.isActive && (
                              <span className="font-mono text-[9px] px-1 rounded bg-rose-950/80 border border-rose-800 text-rose-300 uppercase">
                                INACTIVE
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] font-mono text-slate-400 truncate">
                            {empEmail}
                          </p>
                          <div className="flex items-center gap-1 text-[10px] font-mono text-slate-400">
                            <MapPin className="h-3 w-3 text-amber-400 shrink-0" />
                            <span className="truncate">
                              {assignedSite ? `${assignedSite.name} (${assignedSite.code})` : 'No Site Assigned'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Dynamic Task Checkbox Cells */}
                    {taskTypes.map((task) => {
                      const key = `${member.userId}::${task.id}`
                      const isAssigned = isTaskAssigned(member.userId, task.id)
                      const isUpdating = updatingKey === key

                      return (
                        <td
                          key={task.id}
                          onClick={() => !isUpdating && handleToggleCell(member, task)}
                          className={`p-3 text-center border-r border-slate-800/60 last:border-r-0 cursor-pointer select-none transition-all ${
                            isAssigned
                              ? 'bg-emerald-950/20 hover:bg-emerald-950/35'
                              : 'hover:bg-slate-800/30'
                          }`}
                        >
                          <div className="flex items-center justify-center">
                            {isUpdating ? (
                              <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
                            ) : (
                              <div
                                className={`flex h-5 w-5 items-center justify-center rounded-md border transition-all ${
                                  isAssigned
                                    ? 'border-emerald-500 bg-emerald-600 text-white shadow-sm shadow-emerald-500/30'
                                    : 'border-slate-700 bg-slate-900 group-hover:border-slate-600'
                                }`}
                              >
                                {isAssigned && <Check className="h-3.5 w-3.5 stroke-[3]" />}
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

      {/* Legend & Instructions */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] font-mono text-slate-400 pt-1">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="h-3.5 w-3.5 rounded bg-emerald-600 border border-emerald-500 flex items-center justify-center text-white">
              <Check className="h-2.5 w-2.5 stroke-[3]" />
            </div>
            <span>Authorized to Execute</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-3.5 w-3.5 rounded bg-slate-900 border border-slate-700" />
            <span>Unauthorized</span>
          </div>
        </div>

        <div className="text-slate-400">
          Click any cell to toggle real-time operational task authorization.
        </div>
      </div>
    </div>
  )
}
