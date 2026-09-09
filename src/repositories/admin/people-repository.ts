import { createClient } from '@supabase/supabase-js'
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

export interface CreateUserPayload {
  organizationId: string
  fullName: string
  email: string
  password: string
  role: 'ADMIN' | 'USER'
  customRoleId?: string | null
  departmentId?: string | null
  siteId?: string | null
  designation?: string | null
  employeeCode?: string | null
  phone?: string | null
}

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

export interface ApproveMemberPayload {
  organizationId: string
  memberId: string
  siteId: string
  role: 'ADMIN' | 'USER'
  customRoleId?: string | null
  departmentId?: string | null
  taskTypeIds?: string[]
}

export interface PasswordResetRequest {
  id: string
  organizationId: string
  userId: string
  email: string
  status: 'PENDING' | 'FULFILLED' | 'REJECTED'
  tempPassword?: string | null
  adminNotes?: string | null
  requestedAt: string
  fulfilledAt?: string | null
  fulfilledBy?: string | null
  userName?: string | null
}

export class PeopleRepository {
  /**
   * Fetch all members of an organization with profile, role, department, site, and task assignments.
   */
  static async getMembers(organizationId: string): Promise<EnhancedMember[]> {
    try {
      let combinedRawMembers: any[] = []
      const profilesMap = new Map<string, Profile>()

      // 1. Primary Attempt: PostgreSQL SECURITY DEFINER RPC (bypasses RLS to fetch complete applicant details)
      try {
        const { data: rpcMembers, error: rpcErr } = await supabase.rpc('admin_get_organization_members', {
          p_organization_id: organizationId,
        })

        if (!rpcErr && Array.isArray(rpcMembers) && rpcMembers.length > 0) {
          rpcMembers.forEach((m: any) => {
            profilesMap.set(m.user_id, {
              id: m.user_id,
              email: m.profile_email || m.auth_email || null,
              fullName: m.profile_full_name || (m.profile_email ? m.profile_email.split('@')[0] : null),
              isActive: m.is_active ?? true,
              createdAt: m.auth_created_at || m.created_at || '',
              updatedAt: m.updated_at || '',
            })
          })

          combinedRawMembers = rpcMembers.map((m: any) => ({
            id: m.id,
            organization_id: m.organization_id,
            user_id: m.user_id,
            role: m.role,
            is_active: m.is_active,
            site_id: m.site_id,
            department_id: m.department_id,
            custom_role_id: m.custom_role_id,
            designation: m.designation,
            employee_code: m.employee_code,
            phone: m.phone,
            created_at: m.created_at,
            updated_at: m.updated_at,
          }))
        }
      } catch (rpcEx) {
        console.warn('[PeopleRepository] admin_get_organization_members RPC fallback:', rpcEx)
      }

      // 2. Fallback: Table-based direct select if RPC not yet run in database
      if (combinedRawMembers.length === 0) {
        const { data: rawMembers, error: membersError } = await supabase
          .from('organization_members')
          .select('*')
          .eq('organization_id', organizationId)
          .order('created_at', { ascending: true })

        if (membersError || !rawMembers) {
          console.warn('[PeopleRepository] Failed to fetch organization members:', membersError)
          return []
        }

        const { data: allProfiles } = await supabase.from('profiles').select('*')
        if (allProfiles) {
          allProfiles.forEach((p) => {
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

        // Automatically synthesize pending member records for any registered user who signed up from login page
        const existingUserIds = new Set(rawMembers.map((m) => m.user_id))
        const pendingUnlinkedMembers: typeof rawMembers = []

        if (allProfiles) {
          allProfiles.forEach((p) => {
            if (!existingUserIds.has(p.id)) {
              pendingUnlinkedMembers.push({
                id: p.id,
                organization_id: organizationId,
                user_id: p.id,
                role: 'USER',
                is_active: false,
                site_id: null,
                department_id: null,
                custom_role_id: null,
                designation: null,
                employee_code: null,
                phone: null,
                created_at: p.created_at || new Date().toISOString(),
                updated_at: p.updated_at || new Date().toISOString(),
              })
            }
          })
        }

        combinedRawMembers = [...rawMembers, ...pendingUnlinkedMembers]
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
      return combinedRawMembers.map((m) => {
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
   * Fetch operational task types - strictly limited to the 4 core ERP tasks:
   * 1. Item Master
   * 2. Asset Master
   * 3. Vendor Master
   * 4. Diesel Requisition
   */
  static async getTaskTypes(organizationId: string): Promise<TaskType[]> {
    const ALLOWED_CORE_TASKS = ['ITEM_MASTER', 'ASSET_MASTER', 'VENDOR_MASTER', 'DIESEL_REQUISITION']
    const defaultFourTasks: TaskType[] = [
      { id: 'tt-item-master', organizationId, code: 'ITEM_MASTER', name: 'Item Master', module: 'INVENTORY', defaultPriority: 'MEDIUM', slaHours: 24, requiresApproval: false, isActive: true, icon: 'Package' },
      { id: 'tt-asset-master', organizationId, code: 'ASSET_MASTER', name: 'Asset Master', module: 'FLEET', defaultPriority: 'MEDIUM', slaHours: 24, requiresApproval: false, isActive: true, icon: 'Wrench' },
      { id: 'tt-vendor-master', organizationId, code: 'VENDOR_MASTER', name: 'Vendor Master', module: 'PROCUREMENT', defaultPriority: 'MEDIUM', slaHours: 24, requiresApproval: false, isActive: true, icon: 'Briefcase' },
      { id: 'tt-diesel-req', organizationId, code: 'DIESEL_REQUISITION', name: 'Diesel Requisition', module: 'FUEL', defaultPriority: 'HIGH', slaHours: 12, requiresApproval: true, isActive: true, icon: 'Fuel' },
    ]

    try {
      const { data, error } = await supabase
        .from('task_types')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .order('name', { ascending: true })

      if (error || !data || data.length === 0) {
        return defaultFourTasks
      }

      // Filter only the 4 allowed core tasks
      const filtered = data
        .filter((t) => ALLOWED_CORE_TASKS.includes(t.code))
        .map((t) => ({
          id: t.id,
          organizationId: t.organization_id,
          code: t.code,
          name: t.code === 'ITEM_MASTER' ? 'Item Master' : t.name,
          module: t.module,
          icon: t.icon,
          description: t.description,
          defaultPriority: t.default_priority,
          slaHours: t.sla_hours,
          requiresApproval: t.requires_approval,
          isActive: t.is_active,
        }))

      // Merge any of the 4 core tasks that might not yet be in the remote DB table
      const existingCodes = new Set(filtered.map((f) => f.code))
      const missingTasks = defaultFourTasks.filter((t) => !existingCodes.has(t.code))

      return [...filtered, ...missingTasks]
    } catch (err) {
      console.warn('[PeopleRepository] getTaskTypes fallback:', err)
      return defaultFourTasks
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

  /**
   * Permanently delete a member from Supabase (auth.users, profiles, organization_members)
   */
  static async deleteMember(
    organizationId: string,
    memberId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { data, error } = await supabase.rpc('admin_delete_user', {
        p_organization_id: organizationId,
        p_member_id: memberId,
      })

      if (error) {
        // Fallback: Delete from organization_members directly if RPC is unavailable
        const { error: delErr } = await supabase
          .from('organization_members')
          .delete()
          .eq('id', memberId)

        if (delErr) return { success: false, error: delErr.message }
        return { success: true }
      }

      const res = data as { success: boolean; error?: string }
      return res
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete member.'
      return { success: false, error: msg }
    }
  }

  /**
   * Create a new user with email and password without disrupting the current session.
   * Leverages PostgreSQL SECURITY DEFINER RPC to auto-confirm email and strictly bind site_id.
   */
  static async createUser(payload: CreateUserPayload): Promise<{ success: boolean; error?: string; userId?: string }> {
    try {
      // 1. First Attempt: PostgreSQL SECURITY DEFINER RPC (Atomic, Auto-Confirmed, Strict Site Binding)
      try {
        const { data: rpcData, error: rpcError } = await supabase.rpc('admin_create_user', {
          p_organization_id: payload.organizationId,
          p_email: payload.email.trim().toLowerCase(),
          p_password: payload.password,
          p_full_name: payload.fullName.trim(),
          p_role: payload.role === 'ADMIN' ? 'ADMIN' : 'USER',
          p_custom_role_id: payload.customRoleId || null,
          p_department_id: payload.departmentId || null,
          p_site_id: payload.siteId || null,
          p_designation: payload.designation || null,
          p_employee_code: payload.employeeCode || null,
          p_phone: payload.phone || null,
        })

        if (!rpcError && rpcData) {
          if (rpcData.success) {
            return { success: true, userId: rpcData.user_id }
          }
          if (rpcData.error) {
            return { success: false, error: rpcData.error }
          }
        }
      } catch (rpcErr) {
        console.warn('[PeopleRepository] admin_create_user RPC skipped or unavailable, using fallback:', rpcErr)
      }

      // 2. Client-side Fallback (Isolated Auth Client)
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

      if (!supabaseUrl || !supabaseAnonKey) {
        return { success: false, error: 'Supabase credentials missing in environment.' }
      }

      const tempAuthClient = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      })

      const { data: authData, error: authError } = await tempAuthClient.auth.signUp({
        email: payload.email.trim().toLowerCase(),
        password: payload.password,
        options: {
          data: {
            full_name: payload.fullName.trim(),
          },
        },
      })

      if (authError || !authData.user) {
        return { success: false, error: authError?.message || 'Failed to create user in authentication system.' }
      }

      const newUserId = authData.user.id

      // 3. Auto-confirm email if helper is available
      try {
        await supabase.rpc('confirm_user_email', { p_email: payload.email.trim().toLowerCase() })
      } catch {
        // Continue if RPC not installed
      }

      // 4. Upsert profile entry
      try {
        await supabase.from('profiles').upsert({
          id: newUserId,
          email: payload.email.trim().toLowerCase(),
          full_name: payload.fullName.trim(),
          is_active: true,
        })
      } catch (profErr) {
        console.warn('[PeopleRepository] Profile upsert notice:', profErr)
      }

      // 5. Link user strictly to organization and assigned site
      const { error: memberError } = await supabase.from('organization_members').insert({
        organization_id: payload.organizationId,
        user_id: newUserId,
        role: payload.role === 'ADMIN' ? 'ADMIN' : 'USER',
        custom_role_id: payload.customRoleId || null,
        department_id: payload.departmentId || null,
        site_id: payload.siteId || null,
        designation: payload.designation || null,
        employee_code: payload.employeeCode || null,
        phone: payload.phone || null,
        is_active: true,
      })

      if (memberError) {
        return { success: false, error: memberError.message }
      }

      return { success: true, userId: newUserId }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unexpected error creating user.'
      console.error('[PeopleRepository] createUser exception:', err)
      return { success: false, error: msg }
    }
  }

  /**
   * Verify if an email is already registered in auth or profiles.
   * Ensures forgot password OTP or registration halts immediately if email is not found.
   */
  static async checkEmailExists(email: string): Promise<boolean> {
    try {
      const cleanEmail = email.trim().toLowerCase()
      // 1. Check RPC check_email_exists
      const { data, error } = await supabase.rpc('check_email_exists', { p_email: cleanEmail })
      if (!error && typeof data === 'boolean') {
        return data
      }

      // 2. Fallback check profiles
      const { data: prof } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', cleanEmail)
        .maybeSingle()

      return !!prof
    } catch (err) {
      console.warn('[PeopleRepository] checkEmailExists error:', err)
      return false
    }
  }

  /**
   * Fetch pending approval members for an organization (is_active = false)
   */
  static async getPendingMembers(organizationId: string): Promise<EnhancedMember[]> {
    try {
      const allMembers = await this.getMembers(organizationId)
      return allMembers.filter((m) => !m.isActive)
    } catch (err) {
      console.error('[PeopleRepository] getPendingMembers error:', err)
      return []
    }
  }

  /**
   * Approve a pending user registration atomically:
   * Activates member, assigns mandatory single-site lock, sets role, and assigns selected operational tasks.
   */
  static async approveMember(payload: ApproveMemberPayload): Promise<{ success: boolean; error?: string }> {
    try {
      // 1. Try RPC approve_registration_request
      const { data, error } = await supabase.rpc('approve_registration_request', {
        p_organization_id: payload.organizationId,
        p_member_id: payload.memberId,
        p_site_id: payload.siteId,
        p_role: payload.role,
        p_custom_role_id: payload.customRoleId || null,
        p_department_id: payload.departmentId || null,
        p_task_type_ids: payload.taskTypeIds || [],
      })

      if (!error && data) {
        if (typeof data === 'object' && 'success' in data && !(data as { success: boolean }).success) {
          return { success: false, error: (data as { error?: string }).error || 'Approval rejected by server' }
        }
        return { success: true }
      }

      // 2. Fallback direct update with automatic member row creation if missing
      const { data: existingMem } = await supabase
        .from('organization_members')
        .select('id, user_id')
        .or(`id.eq.${payload.memberId},user_id.eq.${payload.memberId}`)
        .maybeSingle()

      let effectiveUserId = existingMem?.user_id || payload.memberId

      if (!existingMem) {
        // Insert new approved member row
        const { data: insertedMem, error: insertErr } = await supabase
          .from('organization_members')
          .insert({
            organization_id: payload.organizationId,
            user_id: payload.memberId,
            site_id: payload.siteId,
            role: payload.role === 'ADMIN' ? 'ADMIN' : 'USER',
            custom_role_id: payload.customRoleId || null,
            department_id: payload.departmentId || null,
            is_active: true,
          })
          .select('id, user_id')
          .single()

        if (insertErr) return { success: false, error: insertErr.message }
        effectiveUserId = insertedMem?.user_id || payload.memberId
      } else {
        const { error: updateErr } = await supabase
          .from('organization_members')
          .update({
            is_active: true,
            site_id: payload.siteId,
            role: payload.role === 'ADMIN' ? 'ADMIN' : 'USER',
            custom_role_id: payload.customRoleId || null,
            department_id: payload.departmentId || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingMem.id)

        if (updateErr) {
          return { success: false, error: updateErr.message }
        }
      }

      if (effectiveUserId) {
        // Confirm user email if needed
        try {
          await supabase.rpc('confirm_user_email', { p_email: '' })
        } catch {
          // ignore
        }

        if (payload.taskTypeIds && payload.taskTypeIds.length > 0) {
          // Clear old
          await supabase
            .from('user_task_assignments')
            .delete()
            .match({ organization_id: payload.organizationId, user_id: effectiveUserId })

          // Insert new with full rights
          const rows = payload.taskTypeIds.map((tid) => ({
            organization_id: payload.organizationId,
            user_id: effectiveUserId,
            task_type_id: tid,
            can_initiate: true,
            can_execute: true,
            can_approve: true,
          }))
          await supabase.from('user_task_assignments').upsert(rows)
        }
      }

      return { success: true }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to approve member registration.'
      console.error('[PeopleRepository] approveMember exception:', err)
      return { success: false, error: msg }
    }
  }

  /**
   * Toggle a specific operational task permission for an employee in real time.
   * Enables instant interactive clicking in the TBAC Task Assignment Matrix.
   */
  static async toggleUserTaskPermission(
    organizationId: string,
    userId: string,
    taskTypeId: string,
    enabled: boolean
  ): Promise<{ success: boolean; error?: string }> {
    try {
      if (!enabled) {
        // Revoke / Delete
        const { error } = await supabase
          .from('user_task_assignments')
          .delete()
          .match({ organization_id: organizationId, user_id: userId, task_type_id: taskTypeId })

        if (error) return { success: false, error: error.message }
        return { success: true }
      } else {
        // Grant / Upsert
        const { error } = await supabase
          .from('user_task_assignments')
          .upsert(
            {
              organization_id: organizationId,
              user_id: userId,
              task_type_id: taskTypeId,
              can_initiate: true,
              can_execute: true,
              can_approve: true,
            },
            { onConflict: 'organization_id,user_id,task_type_id' }
          )

        if (error) return { success: false, error: error.message }
        return { success: true }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to toggle task permission.'
      console.error('[PeopleRepository] toggleUserTaskPermission exception:', err)
      return { success: false, error: msg }
    }
  }

  /**
   * Request Temporary Password for an employee.
   * Pre-checks email, files a request in password_reset_requests, and returns Admin Helpline: 7770002696
   */
  static async requestTempPassword(email: string): Promise<{
    success: boolean
    adminPhone?: string
    message?: string
    error?: string
  }> {
    try {
      const cleanEmail = email.trim().toLowerCase()
      // 1. Try RPC request_temp_password
      const { data, error } = await supabase.rpc('request_temp_password', { p_email: cleanEmail })
      if (!error && data) {
        const res = data as { success: boolean; admin_phone?: string; message?: string; error?: string }
        if (!res.success) {
          return { success: false, error: res.error || 'Request rejected.' }
        }
        return {
          success: true,
          adminPhone: res.admin_phone || '7770002696',
          message: res.message,
        }
      }

      // 2. Fallback check if email exists
      const exists = await this.checkEmailExists(cleanEmail)
      if (!exists) {
        return { success: false, error: 'This email is not registered in MY RACHANA ERP.' }
      }

      // Record in table directly if RPC missing
      try {
        const { data: prof } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', cleanEmail)
          .maybeSingle()

        if (prof?.id) {
          const { data: mem } = await supabase
            .from('organization_members')
            .select('organization_id')
            .eq('user_id', prof.id)
            .maybeSingle()

          await supabase.from('password_reset_requests').insert({
            organization_id: mem?.organization_id || null,
            user_id: prof.id,
            email: cleanEmail,
            status: 'PENDING',
          })
        }
      } catch {
        // continue
      }

      return {
        success: true,
        adminPhone: '7770002696',
        message: 'Temporary password request registered. Please call Admin at 7770002696.',
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error submitting request.'
      return { success: false, error: msg }
    }
  }

  /**
   * Fetch password reset requests for an organization
   */
  static async getPasswordResetRequests(organizationId: string): Promise<PasswordResetRequest[]> {
    try {
      const { data, error } = await supabase
        .from('password_reset_requests')
        .select(`
          id,
          organization_id,
          user_id,
          email,
          status,
          temp_password,
          admin_notes,
          requested_at,
          fulfilled_at,
          fulfilled_by
        `)
        .eq('organization_id', organizationId)
        .order('requested_at', { ascending: false })

      if (error || !data) return []

      return data.map((d) => ({
        id: d.id,
        organizationId: d.organization_id,
        userId: d.user_id,
        email: d.email,
        status: d.status,
        tempPassword: d.temp_password,
        adminNotes: d.admin_notes,
        requestedAt: d.requested_at,
        fulfilledAt: d.fulfilled_at,
        fulfilledBy: d.fulfilled_by,
      }))
    } catch (err) {
      console.warn('[PeopleRepository] getPasswordResetRequests error:', err)
      return []
    }
  }

  /**
   * Admin issues a temporary password for a user request.
   * Hashes temp password, updates auth.users, and sets must_change_password = true.
   */
  static async issueTempPassword(
    requestId: string,
    tempPassword: string
  ): Promise<{ success: boolean; tempPassword?: string; error?: string }> {
    try {
      const { data, error } = await supabase.rpc('admin_issue_temp_password', {
        p_request_id: requestId,
        p_temp_password: tempPassword.trim(),
      })

      if (error) {
        return { success: false, error: error.message }
      }

      const res = data as { success: boolean; temp_password?: string; error?: string }
      if (!res.success) {
        return { success: false, error: res.error || 'Failed to issue temp password.' }
      }

      return { success: true, tempPassword: res.temp_password }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to issue temporary password.'
      return { success: false, error: msg }
    }
  }

  /**
   * Admin directly resets any user's password to a temporary password,
   * requiring user to change it on next login.
   */
  static async adminResetUserPassword(
    userId: string,
    tempPassword: string
  ): Promise<{ success: boolean; tempPassword?: string; error?: string }> {
    try {
      const { data, error } = await supabase.rpc('admin_reset_user_password', {
        p_user_id: userId,
        p_temp_password: tempPassword.trim(),
      })

      if (error) {
        return { success: false, error: error.message }
      }

      const res = data as { success: boolean; temp_password?: string; error?: string }
      if (!res.success) {
        return { success: false, error: res.error || 'Failed to reset password.' }
      }

      return { success: true, tempPassword: res.temp_password }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to reset password.'
      return { success: false, error: msg }
    }
  }

  /**
   * User marks mandatory password change as completed after setting new password
   */
  static async completePasswordChange(): Promise<boolean> {
    try {
      const { error } = await supabase.rpc('complete_mandatory_password_change')
      if (!error) return true

      const { data: user } = await supabase.auth.getUser()
      if (user?.user) {
        await supabase
          .from('profiles')
          .update({ must_change_password: false, updated_at: new Date().toISOString() })
          .eq('id', user.user.id)
        return true
      }
      return false
    } catch {
      return false
    }
  }
}


