import React, { useState, useEffect, useCallback } from 'react'
import {
  Users,
  Search,
  Shield,
  Briefcase,
  MapPin,
  CheckCircle,
  Settings2,
  RefreshCw,
  AlertCircle,
  UserPlus,
  Layers,
  ShieldCheck,
  Clock,
  KeyRound,
} from 'lucide-react'
import type {
  EnhancedMember,
  Role,
  Department,
  Site,
  TaskType,
} from '../../../types/rbac'
import { PeopleRepository, type PasswordResetRequest } from '../../../repositories/admin/people-repository'
import { UserDetailDrawer } from './user-detail-drawer'
import { CreateUserModal } from './create-user-modal'
import { TaskMatrixView } from './task-matrix-view'
import { ApprovalModal } from './approval-modal'
import { IssueTempPasswordModal } from './issue-temp-password-modal'

interface PeopleDirectoryProps {
  organizationId: string
  organizationName: string
}

export function PeopleDirectory({ organizationId, organizationName }: PeopleDirectoryProps) {
  const [members, setMembers] = useState<EnhancedMember[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [sites, setSites] = useState<Site[]>([])
  const [taskTypes, setTaskTypes] = useState<TaskType[]>([])
  const [passwordRequests, setPasswordRequests] = useState<PasswordResetRequest[]>([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('ALL')
  const [departmentFilter, setDepartmentFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')

  // Selected member for detail drawer
  const [selectedMember, setSelectedMember] = useState<EnhancedMember | null>(null)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [viewMode, setViewMode] = useState<'DIRECTORY' | 'MATRIX'>('DIRECTORY')
  const [approvingMember, setApprovingMember] = useState<EnhancedMember | null>(null)
  const [issuingRequest, setIssuingRequest] = useState<PasswordResetRequest | null>(null)
  const [issuingTargetUser, setIssuingTargetUser] = useState<{ userId: string; email: string; name?: string } | null>(null)


  const loadData = useCallback(async () => {
    if (!organizationId) return
    setLoading(true)
    setError(null)

    try {
      const [membersData, rolesData, deptsData, sitesData, tasksData, requestsData] = await Promise.all([
        PeopleRepository.getMembers(organizationId),
        PeopleRepository.getRoles(organizationId),
        PeopleRepository.getDepartments(organizationId),
        PeopleRepository.getSites(organizationId),
        PeopleRepository.getTaskTypes(organizationId),
        PeopleRepository.getPasswordResetRequests(organizationId),
      ])

      setMembers(membersData)
      setRoles(rolesData)
      setDepartments(deptsData)
      setSites(sitesData)
      setTaskTypes(tasksData)
      setPasswordRequests(requestsData.filter((r) => r.status === 'PENDING'))
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load organization members.'
      console.error('[PeopleDirectory] Error loading data:', err)
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [organizationId])

  useEffect(() => {
    if (!organizationId) return
    queueMicrotask(() => {
      void loadData()
    })
  }, [organizationId, loadData])

  const handleToggleStatus = async (member: EnhancedMember) => {
    const nextStatus = !member.isActive
    // Optimistic UI update
    setMembers((prev) =>
      prev.map((m) => (m.id === member.id ? { ...m, isActive: nextStatus } : m))
    )

    const ok = await PeopleRepository.toggleMemberStatus(member.id, nextStatus)
    if (!ok) {
      // Revert if failed
      setMembers((prev) =>
        prev.map((m) => (m.id === member.id ? { ...m, isActive: member.isActive } : m))
      )
    }
  }

  // Filtered members list
  const filteredMembers = members.filter((m) => {
    const nameMatch = (m.profile?.fullName || '').toLowerCase().includes(searchQuery.toLowerCase())
    const emailMatch = (m.profile?.email || '').toLowerCase().includes(searchQuery.toLowerCase())
    const codeMatch = (m.employeeCode || '').toLowerCase().includes(searchQuery.toLowerCase())
    const matchesSearch = !searchQuery || nameMatch || emailMatch || codeMatch

    const matchesRole =
      roleFilter === 'ALL' ||
      m.role === roleFilter ||
      (m.customRoleId && roles.find((r) => r.id === m.customRoleId)?.code === roleFilter)

    const matchesDept =
      departmentFilter === 'ALL' || m.departmentId === departmentFilter

    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'ACTIVE' && m.isActive) ||
      (statusFilter === 'INACTIVE' && !m.isActive)

    return matchesSearch && matchesRole && matchesDept && matchesStatus
  })

  return (
    <div className="space-y-6">
      {/* Top Banner & Action Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="text-left space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-blue-400 uppercase tracking-widest bg-blue-950/70 border border-blue-800/60 px-2 py-0.5 rounded">
              Command Center
            </span>
            <h1 className="text-xl font-bold text-white tracking-tight">
              People & Responsibilities
            </h1>
          </div>
          <p className="text-xs text-slate-400">
            Enterprise Task-Based Access Control (TBAC) for {organizationName}. Assign operational duties directly to team members.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 px-3.5 py-2 text-xs font-semibold text-white transition-colors cursor-pointer shadow-md shadow-blue-600/20"
          >
            <UserPlus className="h-3.5 w-3.5" />
            <span>+ Create User</span>
          </button>
          <button
            type="button"
            onClick={loadData}
            title="Refresh Personnel Directory"
            className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Sync</span>
          </button>
        </div>
      </div>

      {/* Error alert */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-900/60 text-rose-300 text-xs flex items-center gap-3">
          <AlertCircle className="h-5 w-5 shrink-0 text-rose-400" />
          <div className="text-left">
            <p className="font-semibold">Unable to load personnel</p>
            <p className="text-rose-400/80">{error}</p>
          </div>
        </div>
      )}

      {/* Pending Approvals Queue Banner */}
      {members.some((m) => !m.isActive) && (
        <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-800/80 text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-900/60 text-amber-400 shrink-0">
              <Clock className="h-5 w-5" />
            </div>
            <div className="text-left space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-sm">
                  Pending Self-Registrations ({members.filter((m) => !m.isActive).length})
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-900 text-amber-300 font-bold uppercase">
                  Authorization Required
                </span>
              </div>
              <p className="text-[11px] text-amber-300/80">
                New user accounts have registered and require Administrator approval, strict site assignment, and initial task allocations.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              const pending = members.find((m) => !m.isActive)
              if (pending) setApprovingMember(pending)
            }}
            className="flex items-center gap-1.5 self-start sm:self-auto rounded-lg bg-emerald-600 hover:bg-emerald-500 px-3.5 py-2 text-xs font-bold text-white transition-colors cursor-pointer shadow-md shadow-emerald-600/20 shrink-0"
          >
            <ShieldCheck className="h-4 w-4" />
            <span>Review & Authorize ({members.filter((m) => !m.isActive).length})</span>
          </button>
        </div>
      )}

      {/* Pending Temporary Password Requests Banner */}
      {passwordRequests.length > 0 && (
        <div className="p-4 rounded-xl bg-purple-950/40 border border-purple-800/80 text-purple-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-900/60 text-purple-400 shrink-0">
              <KeyRound className="h-5 w-5" />
            </div>
            <div className="text-left space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-sm">
                  Pending Temporary Password Requests ({passwordRequests.length})
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-900 text-purple-300 font-bold uppercase">
                  Helpline 7770002696
                </span>
              </div>
              <p className="text-[11px] text-purple-300/80">
                Employees have requested a temporary password. Issue a temporary password to allow them to sign in and set their permanent credentials.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {passwordRequests.map((req) => (
              <button
                key={req.id}
                type="button"
                onClick={() => setIssuingRequest(req)}
                className="flex items-center gap-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 px-3 py-1.5 text-xs font-bold text-white transition-colors cursor-pointer shadow-md shadow-purple-600/20 shrink-0"
              >
                <KeyRound className="h-3.5 w-3.5" />
                <span>Issue for {req.email}</span>
              </button>
            ))}
          </div>
        </div>
      )}


      {/* View Mode Switcher (Directory List vs Task Matrix Grid) */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2 bg-slate-900/80 border border-slate-800 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setViewMode('DIRECTORY')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              viewMode === 'DIRECTORY'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            <span>Personnel Directory</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('MATRIX')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              viewMode === 'MATRIX'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Task Matrix (TBAC Grid)</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-950 border border-emerald-800 text-emerald-400">
              Site-Wise
            </span>
          </button>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-slate-400">
          <span>Total Personnel: <strong className="text-white">{members.length}</strong></span>
        </div>
      </div>

      {viewMode === 'MATRIX' ? (
        <TaskMatrixView
          organizationId={organizationId}
          members={members}
          sites={sites}
          taskTypes={taskTypes}
          onRefresh={loadData}
        />
      ) : (
        <div className="space-y-4">
          {/* Filter and Search Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search by name, email, code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg bg-slate-950 border border-slate-800 pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:border-blue-500 focus:outline-none"
          />
        </div>

        {/* Role Filter */}
        <div className="relative">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-slate-200 focus:border-blue-500 focus:outline-none"
          >
            <option value="ALL">All Roles</option>
            <option value="ADMIN">ADMIN</option>
            <option value="PROJECT_MANAGER">Project Manager</option>
            <option value="SITE_SUPERVISOR">Site Supervisor</option>
            <option value="STORE_KEEPER">Store Keeper</option>
            <option value="OPERATOR">Operator</option>
            <option value="USER">Standard User</option>
          </select>
        </div>

        {/* Department Filter */}
        <div className="relative">
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-slate-200 focus:border-blue-500 focus:outline-none"
          >
            <option value="ALL">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-slate-200 focus:border-blue-500 focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active Only</option>
            <option value="INACTIVE">Inactive Only</option>
          </select>
        </div>
      </div>

      {/* Personnel High-Density Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-950/70 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="border-b border-slate-800 bg-slate-900/90 font-mono text-[11px] text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3.5 font-semibold">Personnel</th>
                <th className="px-4 py-3.5 font-semibold">Role & Title</th>
                <th className="px-4 py-3.5 font-semibold">Site / Dept</th>
                <th className="px-4 py-3.5 font-semibold">Operational Duties</th>
                <th className="px-4 py-3.5 font-semibold text-center">Status</th>
                <th className="px-4 py-3.5 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="h-6 w-6 rounded-full border-2 border-blue-500/20 border-t-blue-500 animate-spin" />
                      <span className="font-mono text-xs">Querying personnel records...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Users className="h-8 w-8 text-slate-600" />
                      <p className="text-sm font-medium text-slate-400">No personnel found</p>
                      <p className="text-xs text-slate-500">
                        {searchQuery ? 'Try adjusting your search criteria.' : 'No members currently match the selected filters.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredMembers.map((member) => {
                  const roleName = roles.find((r) => r.id === member.customRoleId)?.name || member.role
                  const deptName = departments.find((d) => d.id === member.departmentId)?.name
                  const siteName = sites.find((s) => s.id === member.siteId)?.name
                  const initials = (member.profile?.fullName || member.profile?.email || 'U')
                    .slice(0, 2)
                    .toUpperCase()

                  return (
                    <tr
                      key={member.id}
                      className="hover:bg-slate-900/50 transition-colors group"
                    >
                      {/* Column 1: Personnel */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-lg bg-blue-950 border border-blue-800/80 flex items-center justify-center text-blue-400 font-bold text-xs shrink-0">
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-white truncate group-hover:text-blue-400 transition-colors">
                              {member.profile?.fullName || 'Unnamed Personnel'}
                            </p>
                            <p className="text-[11px] text-slate-400 font-mono truncate">
                              {member.profile?.email || member.userId}
                            </p>
                            {member.employeeCode && (
                              <span className="inline-block font-mono text-[9px] text-slate-400 bg-slate-900 border border-slate-800 px-1 py-0.2 rounded mt-0.5">
                                {member.employeeCode}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Column 2: Role & Title */}
                      <td className="px-4 py-3.5">
                        <div className="space-y-1">
                          <span
                            className={`inline-flex items-center gap-1 font-mono text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${
                              member.role === 'ADMIN'
                                ? 'bg-amber-950/60 border-amber-800/80 text-amber-300'
                                : 'bg-slate-800 border-slate-700 text-slate-300'
                            }`}
                          >
                            <Shield className="h-2.5 w-2.5" />
                            <span>{roleName}</span>
                          </span>
                          {member.designation && (
                            <p className="text-[11px] text-slate-400 truncate">
                              {member.designation}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Column 3: Site / Dept */}
                      <td className="px-4 py-3.5">
                        <div className="space-y-0.5 text-[11px]">
                          {siteName ? (
                            <div className="flex items-center gap-1.5 text-slate-300">
                              <MapPin className="h-3 w-3 text-blue-400 shrink-0" />
                              <span className="truncate">{siteName}</span>
                            </div>
                          ) : (
                            <span className="text-slate-500 italic">Global / HO</span>
                          )}
                          {deptName && (
                            <div className="flex items-center gap-1.5 text-slate-400">
                              <Briefcase className="h-3 w-3 text-slate-500 shrink-0" />
                              <span className="truncate">{deptName}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Column 4: Assigned Operational Duties (TBAC) */}
                      <td className="px-4 py-3.5">
                        {member.role === 'ADMIN' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-800/60 px-2 py-0.5 rounded">
                            <CheckCircle className="h-3 w-3" />
                            All Operations Authorized
                          </span>
                        ) : member.assignedTasks.length > 0 ? (
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {member.assignedTasks.slice(0, 3).map((task) => (
                              <span
                                key={task.taskTypeId}
                                className="inline-flex items-center gap-1 text-[10px] font-mono bg-blue-950/50 border border-blue-800/50 text-blue-300 px-1.5 py-0.5 rounded truncate"
                                title={task.name}
                              >
                                {task.name}
                              </span>
                            ))}
                            {member.assignedTasks.length > 3 && (
                              <span className="text-[10px] font-mono text-slate-400 bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded">
                                +{member.assignedTasks.length - 3} more
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[11px] font-mono text-slate-500 italic">
                            No tasks assigned
                          </span>
                        )}
                      </td>

                      {/* Column 5: Status */}
                      <td className="px-4 py-3.5 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(member)}
                          className="inline-flex items-center gap-1.5 cursor-pointer group/status"
                          title="Click to toggle member status"
                        >
                          <span
                            className={`h-2 w-2 rounded-full shrink-0 ${
                              member.isActive ? 'bg-emerald-500' : 'bg-rose-500'
                            }`}
                          />
                          <span
                            className={`font-mono text-[11px] font-medium ${
                              member.isActive ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            {member.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </button>
                      </td>

                      {/* Column 6: Actions */}
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Check for pending password reset request for this user */}
                          {(() => {
                            const pendingReq = passwordRequests.find(
                              (r) =>
                                r.userId === member.userId ||
                                (member.profile?.email &&
                                  r.email.toLowerCase() === member.profile.email.toLowerCase())
                            )
                            if (pendingReq) {
                              return (
                                <button
                                  type="button"
                                  onClick={() => setIssuingRequest(pendingReq)}
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-purple-700 bg-purple-950/90 px-2.5 py-1.5 text-[11px] font-bold text-purple-300 hover:bg-purple-600 hover:text-white transition-colors cursor-pointer shadow-sm shadow-purple-700/30"
                                >
                                  <KeyRound className="h-3.5 w-3.5" />
                                  <span>Issue Temp Pass</span>
                                </button>
                              )
                            }
                            return (
                              <button
                                type="button"
                                onClick={() =>
                                  setIssuingTargetUser({
                                    userId: member.userId,
                                    email: member.profile?.email || member.userId,
                                    name: member.profile?.fullName || '',
                                  })
                                }
                                title="Issue / Reset temporary password for this user"
                                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-2 py-1.5 text-[11px] font-medium text-slate-400 hover:text-purple-300 hover:bg-slate-800 hover:border-purple-800 transition-colors cursor-pointer"
                              >
                                <KeyRound className="h-3.5 w-3.5" />
                                <span className="hidden xl:inline">Temp Pass</span>
                              </button>
                            )
                          })()}

                          {!member.isActive && (
                            <button
                              type="button"
                              onClick={() => setApprovingMember(member)}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-700 bg-emerald-950/80 px-2.5 py-1.5 text-[11px] font-bold text-emerald-300 hover:bg-emerald-600 hover:text-white transition-colors cursor-pointer shadow-sm shadow-emerald-700/20"
                            >
                              <ShieldCheck className="h-3.5 w-3.5" />
                              <span>Authorize</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setSelectedMember(member)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-[11px] font-medium text-slate-300 hover:bg-blue-600 hover:text-white hover:border-blue-500 transition-colors cursor-pointer"
                          >
                            <Settings2 className="h-3.5 w-3.5" />
                            <span>Configure</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )}

      {/* User Detail & Task Responsibility Drawer */}
      {selectedMember && (
        <UserDetailDrawer
          key={selectedMember.id}
          member={selectedMember}
          roles={roles}
          departments={departments}
          sites={sites}
          taskTypes={taskTypes}
          organizationId={organizationId}
          onClose={() => setSelectedMember(null)}
          onSaveSuccess={() => {
            setSelectedMember(null)
            loadData()
          }}
        />
      )}

      {/* Approve Pending Registration Modal */}
      {approvingMember && (
        <ApprovalModal
          key={approvingMember.id}
          isOpen={!!approvingMember}
          member={approvingMember}
          organizationId={organizationId}
          sites={sites}
          roles={roles}
          departments={departments}
          taskTypes={taskTypes}
          onClose={() => setApprovingMember(null)}
          onSuccess={() => {
            setApprovingMember(null)
            loadData()
          }}
        />
      )}

      {/* Create New User Modal */}
      {isCreateModalOpen && (
        <CreateUserModal
          organizationId={organizationId}
          roles={roles}
          departments={departments}
          sites={sites}
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={() => {
            setIsCreateModalOpen(false)
            loadData()
          }}
        />
      )}

      {/* Issue Temporary Password Modal */}
      {(issuingRequest || issuingTargetUser) && (
        <IssueTempPasswordModal
          isOpen={!!(issuingRequest || issuingTargetUser)}
          request={issuingRequest}
          targetUser={issuingTargetUser}
          onClose={() => {
            setIssuingRequest(null)
            setIssuingTargetUser(null)
          }}
          onSuccess={() => {
            setIssuingRequest(null)
            setIssuingTargetUser(null)
            loadData()
          }}
        />
      )}
    </div>
  )
}
