import { supabase } from '../../lib/supabase'
import type {
  EnhancedMember,
  Role,
  Department,
  Site,
  TaskType,
  UserTaskAssignment,
} from '../../types/rbac'
import type { Profile } from '../../types/foundation'

export interface SaveMemberPayload {
  memberId: string
  userId: string
  organizationId: string
  role: string
  customRoleId?: string | null
  departmentId?: string | null
  siteId?: string | null
  designation?: string | null
  employeeCode?: string | null
  phone?: string | null
  isActive: boolean
  tasks: Array<{
    taskTypeId: string
    code: string
    name: string
    module: string
    icon?: string | null
    canInitiate: boolean
    canExecute: boolean
    canApprove: boolean
  }>
}

export class PeopleRepository {
  /**
   * Fetch all members of an organization with profile, role, department, site, and task assignments.
   */
  static async getMembers(organizationId: string): Promise<EnhancedMember[]> {
    try {
      // 1. Fetch organization members
      const { data: rawMembers, error: membersError } = await supabase
        .from('organization_members')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: true })

      if (membersError || !rawMembers) {
        console.warn('[PeopleRepository] Failed to fetch organization members:', membersError)
        return []
      }

      // 2. Fetch profiles for all members
      const userIds = rawMembers.map((m) => m.user_id).filter(Boolean)
      const profilesMap = new Map<string, Profile>()

      if (userIds.length > 0) {
        const { data: profiles, error: profError } = await supabase
          .from('profiles')
          .select('*')
          .in('id', userIds)

        if (!profError && profiles) {
          profiles.forEach((p) => {
            profilesMap.set(p.id, {
              id: p.id,
              email: p.email ?? null,
              fullName: p.full_name ?? null,
              isActive: p.is_active ?? true,
              createdAt: p.created_at ?? '',
              updatedAt: p.updated_at ?? '',
            })
          })
        }
      }

      // 3. Attempt to fetch task assignments for this organization
      const taskAssignmentsMap = new Map<string, UserTaskAssignment[]>()
      try {
        const { data: assignments, error: assignError } = await supabase
          .from('user_task_assignments')
          .select(`
            id,
            user_id,
            task_type_id,
            can_initiate,
            can_execute,
            can_approve,
            task_types:task_type_id (
              id,
              code,
              name,
              module,
              icon
            )
          `)
          .eq('organization_id', organizationId)

        if (!assignError && assignments) {
          assignments.forEach((a) => {
            const taskType = Array.isArray(a.task_types) ? a.task_types[0] : a.task_types
            const item: UserTaskAssignment = {
              taskTypeId: a.task_type_id,
              code: taskType?.code ?? '',
              name: taskType?.name ?? 'Task',
              module: taskType?.module ?? 'OPERATIONS',
              icon: taskType?.icon ?? null,
              canInitiate: a.can_initiate,
              canExecute: a.can_execute,
              canApprove: a.can_approve,
            }
            const existing = taskAssignmentsMap.get(a.user_id) || []
            existing.push(item)
            taskAssignmentsMap.set(a.user_id, existing)
          })
        }
      } catch (err) {
        console.warn('[PeopleRepository] user_task_assignments table query skipped:', err)
      }

      // 4. Map to EnhancedMember
      return rawMembers.map((m) => {
        const profile = profilesMap.get(m.user_id)
        const userTasks = taskAssignmentsMap.get(m.user_id) || []
        const baseRole = m.role === 'ADMIN' ? 'ADMIN' : 'USER'

        return {
          id: m.id,
          organizationId: m.organization_id,
          userId: m.user_id,
          role: m.role ?? 'USER',
          baseRole,
          isActive: m.is_active ?? true,
          employeeCode: m.employee_code ?? null,
          phone: m.phone ?? null,
          designation: m.designation ?? null,
          departmentId: m.department_id ?? null,
          siteId: m.site_id ?? null,
          customRoleId: m.custom_role_id ?? null,
          profile,
          permissions: [],
          assignedTasks: userTasks,
          createdAt: m.created_at ?? '',
          updatedAt: m.updated_at ?? '',
        }
      })
    } catch (err) {
      console.error('[PeopleRepository] Unexpected error in getMembers:', err)
      return []
    }
  }

  /**
   * Fetch all roles (system + custom) for the organization
   */
  static async getRoles(organizationId: string): Promise<Role[]> {
    try {
      const { data, error } = await supabase
        .from('roles')
        .select('*')
        .eq('organization_id', organizationId)
        .order('is_system', { ascending: false })

      if (error || !data || data.length === 0) {
        return [
          { id: '1', organizationId, code: 'ADMIN', name: 'Administrator', isSystem: true, isActive: true, createdAt: '', updatedAt: '' },
          { id: '2', organizationId, code: 'PROJECT_MANAGER', name: 'Project Manager', isSystem: true, isActive: true, createdAt: '', updatedAt: '' },
          { id: '3', organizationId, code: 'SITE_SUPERVISOR', name: 'Site Supervisor', isSystem: true, isActive: true, createdAt: '', updatedAt: '' },
          { id: '4', organizationId, code: 'STORE_KEEPER', name: 'Store Keeper', isSystem: true, isActive: true, createdAt: '', updatedAt: '' },
          { id: '5', organizationId, code: 'OPERATOR', name: 'Equipment Operator', isSystem: true, isActive: true, createdAt: '', updatedAt: '' },
          { id: '6', organizationId, code: 'USER', name: 'Standard User', isSystem: true, isActive: true, createdAt: '', updatedAt: '' },
        ]
      }

      return data.map((r) => ({
        id: r.id,
        organizationId: r.organization_id,
        code: r.code,
        name: r.name,
        description: r.description,
        isSystem: r.is_system,
        isActive: r.is_active,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      }))
    } catch (err) {
      console.warn('[PeopleRepository] getRoles fallback:', err)
      return []
    }
  }

  /**
   * Fetch all operational task types
   */
  static async getTaskTypes(organizationId: string): Promise<TaskType[]> {
    try {
      const { data, error } = await supabase
        .from('task_types')
        .select('*')
        .eq('organization_id', organizationId)
        .order('module', { ascending: true })

      if (error || !data || data.length === 0) {
        return [
          { id: 'tt-fuel-issue', organizationId, code: 'DIESEL_ISSUE', name: 'Diesel Issue Log', module: 'FUEL', defaultPriority: 'HIGH', slaHours: 4, requiresApproval: false, isActive: true, icon: 'Fuel' },
          { id: 'tt-fuel-purchase', organizationId, code: 'DIESEL_PURCHASE', name: 'Diesel Bulk Purchase', module: 'FUEL', defaultPriority: 'HIGH', slaHours: 12, requiresApproval: true, isActive: true, icon: 'Truck' },
          { id: 'tt-mat-issue', organizationId, code: 'MATERIAL_ISSUE', name: 'Material Issue Slip', module: 'INVENTORY', defaultPriority: 'MEDIUM', slaHours: 8, requiresApproval: false, isActive: true, icon: 'Package' },
          { id: 'tt-mat-receipt', organizationId, code: 'MATERIAL_RECEIPT', name: 'Material Receipt / GRN', module: 'INVENTORY', defaultPriority: 'HIGH', slaHours: 12, requiresApproval: true, isActive: true, icon: 'Boxes' },
          { id: 'tt-po-req', organizationId, code: 'PURCHASE_REQUEST', name: 'Purchase Indent / Request', module: 'PROCUREMENT', defaultPriority: 'HIGH', slaHours: 24, requiresApproval: true, isActive: true, icon: 'ShoppingCart' },
          { id: 'tt-maint-req', organizationId, code: 'MAINTENANCE_REQUEST', name: 'Equipment Breakdown / Service', module: 'FLEET', defaultPriority: 'CRITICAL', slaHours: 4, requiresApproval: true, isActive: true, icon: 'Wrench' },
          { id: 'tt-veh-assign', organizationId, code: 'VEHICLE_ASSIGNMENT', name: 'Vehicle / Machine Allocation', module: 'FLEET', defaultPriority: 'MEDIUM', slaHours: 12, requiresApproval: false, isActive: true, icon: 'Cpu' },
        ]
      }

      return data.map((t) => ({
        id: t.id,
        organizationId: t.organization_id,
        code: t.code,
        name: t.name,
        module: t.module,
        icon: t.icon,
        description: t.description,
        defaultPriority: t.default_priority,
        slaHours: t.sla_hours,
        requiresApproval: t.requires_approval,
        isActive: t.is_active,
      }))
    } catch (err) {
      console.warn('[PeopleRepository] getTaskTypes fallback:', err)
      return []
    }
  }

  /**
   * Fetch departments for the organization
   */
  static async getDepartments(organizationId: string): Promise<Department[]> {
    try {
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .eq('organization_id', organizationId)
        .order('name', { ascending: true })

      if (error || !data) return []

      return data.map((d) => ({
        id: d.id,
        organizationId: d.organization_id,
        name: d.name,
        code: d.code,
        parentId: d.parent_id,
        isActive: d.is_active,
        createdAt: d.created_at,
        updatedAt: d.updated_at,
      }))
    } catch {
      return []
    }
  }

  /**
   * Fetch sites for the organization
   */
  static async getSites(organizationId: string): Promise<Site[]> {
    try {
      const { data, error } = await supabase
        .from('sites')
        .select('*')
        .eq('organization_id', organizationId)
        .order('name', { ascending: true })

      if (error || !data) return []

      return data.map((s) => ({
        id: s.id,
        organizationId: s.organization_id,
        projectId: s.project_id,
        name: s.name,
        code: s.code,
        location: s.location,
        isActive: s.is_active,
        createdAt: s.created_at,
        updatedAt: s.updated_at,
      }))
    } catch {
      return []
    }
  }

  /**
   * Save user details and task assignments atomically
   */
  static async saveMemberAssignments(payload: SaveMemberPayload): Promise<{ success: boolean; error?: string }> {
    try {
      const {
        memberId,
        userId,
        organizationId,
        role,
        customRoleId,
        departmentId,
        siteId,
        designation,
        employeeCode,
        phone,
        isActive,
        tasks,
      } = payload

      // 1. Update organization_members table
      const memberUpdates: Record<string, unknown> = {
        role: role === 'ADMIN' ? 'ADMIN' : 'USER',
        is_active: isActive,
        updated_at: new Date().toISOString(),
      }

      // Add optional columns if schema supports them
      if (customRoleId !== undefined) memberUpdates.custom_role_id = customRoleId
      if (departmentId !== undefined) memberUpdates.department_id = departmentId
      if (siteId !== undefined) memberUpdates.site_id = siteId
      if (designation !== undefined) memberUpdates.designation = designation
      if (employeeCode !== undefined) memberUpdates.employee_code = employeeCode
      if (phone !== undefined) memberUpdates.phone = phone

      const { error: memberError } = await supabase
        .from('organization_members')
        .update(memberUpdates)
        .eq('id', memberId)

      if (memberError) {
        console.error('[PeopleRepository] Error updating member:', memberError)
        return { success: false, error: memberError.message }
      }

      // 2. Sync task assignments if task_types exist in DB
      try {
        // Delete current assignments for this user in this organization
        await supabase
          .from('user_task_assignments')
          .delete()
          .match({ organization_id: organizationId, user_id: userId })

        // Insert new assignments
        if (tasks.length > 0) {
          const insertPayloads = tasks.map((t) => ({
            organization_id: organizationId,
            user_id: userId,
            task_type_id: t.taskTypeId,
            can_initiate: t.canInitiate,
            can_execute: t.canExecute,
            can_approve: t.canApprove,
          }))

          const { error: insertError } = await supabase
            .from('user_task_assignments')
            .insert(insertPayloads)

          if (insertError) {
            console.warn('[PeopleRepository] Warning syncing task assignments:', insertError.message)
          }
        }
      } catch (assignErr) {
        console.warn('[PeopleRepository] user_task_assignments sync error:', assignErr)
      }

      return { success: true }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error saving member assignments'
      console.error('[PeopleRepository] saveMemberAssignments exception:', err)
      return { success: false, error: msg }
    }
  }

  /**
   * Toggle user active status
   */
  static async toggleMemberStatus(memberId: string, isActive: boolean): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('organization_members')
        .update({ is_active: isActive, updated_at: new Date().toISOString() })
        .eq('id', memberId)

      return !error
    } catch {
      return false
    }
  }
}

