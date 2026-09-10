import { supabase } from '../lib/supabase'
import type { Organization, Profile, OrganizationMember, UserRole } from '../types/foundation'
import type { UserTaskAssignment } from '../types/rbac'

export type UserResolutionStatus =
  | 'UNAUTHENTICATED'
  | 'NO_MEMBERSHIP'
  | 'ORGANIZATION_INACTIVE'
  | 'USER_INACTIVE'
  | 'SUCCESS'
  | 'ERROR'

export interface UserContextResult {
  status: UserResolutionStatus
  userId?: string
  email?: string
  profile?: Profile
  organization?: Organization
  membership?: OrganizationMember
  role?: string
  baseRole?: UserRole
  assignedSite?: { id: string; name: string; code: string; location?: string }
  mustChangePassword?: boolean
  permissions?: string[]
  assignedTasks?: UserTaskAssignment[]
  errorMessage?: string
}

interface RpcContextPayload {
  status: UserResolutionStatus
  userId?: string
  user_id?: string
  email?: string
  role?: string
  baseRole?: UserRole
  base_role?: UserRole
  errorMessage?: string
  error_message?: string
  permissions?: string[]
  assignedTasks?: UserTaskAssignment[]
  assigned_tasks?: UserTaskAssignment[]
  assignedSite?: { id: string; name: string; code: string; location?: string }
  assigned_site?: { id: string; name: string; code: string; location?: string }
  profile?: {
    id: string
    email?: string | null
    fullName?: string | null
    full_name?: string | null
    isActive?: boolean
    is_active?: boolean
    createdAt?: string
    created_at?: string
    updatedAt?: string
    updated_at?: string
  }
  membership?: {
    id: string
    organizationId?: string
    organization_id?: string
    userId?: string
    user_id?: string
    role: string
    baseRole?: UserRole
    base_role?: UserRole
    employeeCode?: string | null
    designation?: string | null
    phone?: string | null
    departmentId?: string | null
    siteId?: string | null
    site_id?: string | null
    isActive?: boolean
    is_active?: boolean
    createdAt?: string
    created_at?: string
    updatedAt?: string
    updated_at?: string
  }
  organization?: {
    id: string
    name: string
    slug: string
    isActive?: boolean
    is_active?: boolean
    createdAt?: string
    created_at?: string
    updatedAt?: string
    updated_at?: string
  }
}

/**
 * Universal User Context Resolver
 * Resolves session, profile, active organization, role, permissions, and assigned tasks
 * from PostgreSQL & Supabase Auth.
 * Zero hardcoded email addresses, UUIDs, or roles.
 */
export class AuthContextRepository {
  static async getCurrentUserContext(): Promise<UserContextResult> {
    try {
      // 1. Authenticate user session
      const { data: authData, error: authError } = await supabase.auth.getUser()
      if (authError || !authData.user) {
        console.log('[AuthDiagnostic] 1. Authenticated User: None (Unauthenticated session)')
        return {
          status: 'UNAUTHENTICATED',
          permissions: [],
          assignedTasks: [],
        }
      }

      const userId = authData.user.id
      const email = authData.user.email ?? undefined

      console.log('[AuthDiagnostic] 1. Authenticated User:', { id: userId, email })

      // 2. High-performance attempt: Try server-side atomic RPC if available
      try {
        const { data: rpcData, error: rpcError } = await supabase.rpc('get_current_user_context')
        if (!rpcError && rpcData) {
          const payload = rpcData as unknown as RpcContextPayload
          console.log('[AuthDiagnostic] Atomic RPC Resolution:', payload)

          if (payload.status === 'SUCCESS' && payload.organization && payload.membership) {
            const organization: Organization = {
              id: payload.organization.id,
              name: payload.organization.name,
              slug: payload.organization.slug,
              isActive: payload.organization.isActive ?? payload.organization.is_active ?? true,
              createdAt: payload.organization.createdAt ?? payload.organization.created_at ?? '',
              updatedAt: payload.organization.updatedAt ?? payload.organization.updated_at ?? '',
            }

            const rawRole = payload.role ?? payload.membership.role ?? 'USER'
            const baseRole: UserRole =
              payload.baseRole ?? payload.base_role ?? payload.membership.baseRole ?? payload.membership.base_role ?? (rawRole === 'MASTER_ADMIN' || rawRole === 'ADMIN' ? 'ADMIN' : 'USER')

            const membership: OrganizationMember = {
              id: payload.membership.id,
              organizationId: payload.membership.organizationId ?? payload.membership.organization_id ?? '',
              userId: payload.membership.userId ?? payload.membership.user_id ?? userId,
              role: baseRole,
              isActive: payload.membership.isActive ?? payload.membership.is_active ?? true,
              createdAt: payload.membership.createdAt ?? payload.membership.created_at ?? '',
              updatedAt: payload.membership.updatedAt ?? payload.membership.updated_at ?? '',
            }

            const profile: Profile = {
              id: payload.profile?.id ?? userId,
              email: payload.profile?.email ?? email ?? null,
              fullName: payload.profile?.fullName ?? payload.profile?.full_name ?? null,
              isActive: payload.profile?.isActive ?? payload.profile?.is_active ?? true,
              createdAt: payload.profile?.createdAt ?? payload.profile?.created_at ?? '',
              updatedAt: payload.profile?.updatedAt ?? payload.profile?.updated_at ?? '',
            }

            const permissions = payload.permissions ?? []
            const assignedTasks = payload.assignedTasks ?? payload.assigned_tasks ?? []

            // Resolve assignedSite
            let assignedSite: { id: string; name: string; code: string; location?: string } | undefined = undefined
            if (payload.assignedSite || (payload as unknown as { assigned_site?: { id: string; name: string; code: string; location?: string } }).assigned_site) {
              const s = (payload.assignedSite || (payload as unknown as { assigned_site?: { id: string; name: string; code: string; location?: string } }).assigned_site)!
              assignedSite = {
                id: s.id,
                name: s.name,
                code: s.code,
                location: s.location,
              }
            } else {
              const targetSiteId =
                payload.membership.siteId ??
                payload.membership.site_id ??
                (payload as unknown as { siteId?: string; site_id?: string }).siteId ??
                (payload as unknown as { siteId?: string; site_id?: string }).site_id

              if (targetSiteId) {
                try {
                  const { data: siteData } = await supabase
                    .from('sites')
                    .select('id, name, code, location')
                    .eq('id', targetSiteId)
                    .maybeSingle()
                  if (siteData) {
                    assignedSite = {
                      id: siteData.id,
                      name: siteData.name,
                      code: siteData.code,
                      location: siteData.location,
                    }
                  }
                } catch (siteErr) {
                  console.warn('[AuthDiagnostic] Failed to fetch site in RPC block:', siteErr)
                }
              }

              // Double fallback: check organization_members directly if still undefined
              if (!assignedSite && userId) {
                try {
                  const { data: omData } = await supabase
                    .from('organization_members')
                    .select('site_id')
                    .eq('user_id', userId)
                    .limit(1)
                    .maybeSingle()
                  if (omData?.site_id) {
                    const { data: siteData } = await supabase
                      .from('sites')
                      .select('id, name, code, location')
                      .eq('id', omData.site_id)
                      .maybeSingle()
                    if (siteData) {
                      assignedSite = {
                        id: siteData.id,
                        name: siteData.name,
                        code: siteData.code,
                        location: siteData.location,
                      }
                    }
                  }
                } catch {
                  // ignore
                }
              }
            }

            console.log('[AuthDiagnostic] 5. Final Resolved Role:', rawRole, 'Base Role:', baseRole)
            console.log('[AuthDiagnostic] 6. Final Resolved Organization:', organization.name)
            console.log('[AuthDiagnostic] 7. Assigned Site:', assignedSite?.name || 'None', 'Permissions Count:', permissions.length, 'Tasks Count:', assignedTasks.length)

            return {
              status: 'SUCCESS',
              userId,
              email,
              role: rawRole,
              baseRole,
              profile,
              membership,
              organization,
              assignedSite,
              permissions,
              assignedTasks,
            }
          } else if (payload.status && payload.status !== 'SUCCESS') {
            console.warn('[AuthDiagnostic] RPC returned non-success status:', payload.status, payload.errorMessage)
            return {
              status: payload.status,
              userId,
              email,
              permissions: [],
              assignedTasks: [],
              errorMessage: payload.errorMessage ?? payload.error_message,
            }
          }
        }
      } catch (rpcErr) {
        console.debug('[AuthDiagnostic] RPC not available or failed, falling back to direct table queries:', rpcErr)
      }

      // 3. Fallback: Sequential RLS direct table queries
      // Step A: Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, email, full_name, is_active, must_change_password, created_at, updated_at')
        .eq('id', userId)
        .maybeSingle()

      console.log('[AuthDiagnostic] 2. Profile Result:', { data: profileData, error: profileError })

      const profile: Profile = profileData
        ? {
            id: profileData.id,
            email: profileData.email,
            fullName: profileData.full_name,
            isActive: profileData.is_active,
            mustChangePassword: profileData.must_change_password ?? false,
            createdAt: profileData.created_at,
            updatedAt: profileData.updated_at,
          }
        : {
            id: userId,
            email: email ?? null,
            fullName: authData.user.user_metadata?.full_name ?? authData.user.user_metadata?.name ?? null,
            isActive: true,
            createdAt: authData.user.created_at,
            updatedAt: authData.user.updated_at ?? authData.user.created_at,
          }

      if (!profile.isActive) {
        return {
          status: 'USER_INACTIVE',
          userId,
          email,
          profile,
          permissions: [],
          assignedTasks: [],
          errorMessage: 'Your user profile has been deactivated. Please contact your organization administrator.',
        }
      }

      // Step B: Fetch membership in organization_members
      const { data: memberData, error: memberError } = await supabase
        .from('organization_members')
        .select('id, organization_id, user_id, role, site_id, is_active, created_at, updated_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      console.log('[AuthDiagnostic] 3. Membership Result:', { data: memberData, error: memberError })

      if (memberError) {
        console.error('[AuthDiagnostic] Database error querying organization_members:', memberError)
        return {
          status: 'ERROR',
          userId,
          email,
          profile,
          permissions: [],
          assignedTasks: [],
          errorMessage: `Database error querying organization membership: ${memberError.message} (${memberError.code || 'unknown'})`,
        }
      }

      if (!memberData) {
        console.warn('[AuthDiagnostic] No organization membership row found for user ID:', userId)
        return {
          status: 'NO_MEMBERSHIP',
          userId,
          email,
          profile,
          permissions: [],
          assignedTasks: [],
          errorMessage: 'Your account is not assigned to an active organization. Please contact your administrator.',
        }
      }

      // Check if user is pending administrator approval or inactive
      if (memberData.is_active === false) {
        console.warn('[AuthDiagnostic] User account is pending administrator approval:', userId)
        return {
          status: 'USER_INACTIVE',
          userId,
          email,
          profile,
          permissions: [],
          assignedTasks: [],
          errorMessage: 'Your registration is currently pending Administrator approval and site assignment. Please contact your company administrator.',
        }
      }

      const rawRole = memberData.role as string
      const baseRole: UserRole = rawRole === 'ADMIN' ? 'ADMIN' : 'USER'

      const membership: OrganizationMember = {
        id: memberData.id,
        organizationId: memberData.organization_id,
        userId: memberData.user_id,
        role: baseRole,
        isActive: memberData.is_active,
        createdAt: memberData.created_at,
        updatedAt: memberData.updated_at,
      }

      // Step C: Fetch Organization details
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('id, name, slug, is_active, created_at, updated_at')
        .eq('id', membership.organizationId)
        .maybeSingle()

      console.log('[AuthDiagnostic] 4. Organization Result:', { data: orgData, error: orgError })

      if (orgError) {
        console.error('[AuthDiagnostic] Database error querying organizations:', orgError)
        return {
          status: 'ERROR',
          userId,
          email,
          profile,
          membership,
          permissions: [],
          assignedTasks: [],
          errorMessage: `Database error querying organization details: ${orgError.message} (${orgError.code || 'unknown'})`,
        }
      }

      if (!orgData) {
        console.warn('[AuthDiagnostic] Organization record not found for ID:', membership.organizationId)
        return {
          status: 'NO_MEMBERSHIP',
          userId,
          email,
          profile,
          membership,
          permissions: [],
          assignedTasks: [],
          errorMessage: 'The organization assigned to your account could not be found.',
        }
      }

      const organization: Organization = {
        id: orgData.id,
        name: orgData.name,
        slug: orgData.slug,
        isActive: orgData.is_active,
        createdAt: orgData.created_at,
        updatedAt: orgData.updated_at,
      }

      if (!organization.isActive) {
        return {
          status: 'ORGANIZATION_INACTIVE',
          userId,
          email,
          profile,
          organization,
          membership,
          permissions: [],
          assignedTasks: [],
          errorMessage: 'Your organization account is currently inactive. Please contact support.',
        }
      }

      // Step D: Try fetching user tasks if table exists
      let assignedTasks: UserTaskAssignment[] = []
      try {
        const { data: tasksData } = await supabase
          .from('user_task_assignments')
          .select(`
            task_type_id,
            can_initiate,
            can_execute,
            can_approve,
            task_types (
              id,
              code,
              name,
              module,
              icon
            )
          `)
          .eq('user_id', userId)
          .eq('organization_id', organization.id)

        if (tasksData && tasksData.length > 0) {
          assignedTasks = tasksData
            .filter((t: unknown) => (t as { task_types?: { code?: string } }).task_types?.code)
            .map((t: unknown) => {
              const item = t as {
                task_type_id: string
                can_initiate: boolean
                can_execute: boolean
                can_approve: boolean
                task_types: {
                  code: string
                  name: string
                  module: string
                  icon?: string | null
                }
              }
              return {
                taskTypeId: item.task_type_id,
                code: item.task_types.code,
                name: item.task_types.name,
                module: item.task_types.module,
                icon: item.task_types.icon,
                canInitiate: item.can_initiate,
                canExecute: item.can_execute,
                canApprove: item.can_approve,
              }
            })
        }
      } catch (tasksErr) {
        console.debug('[AuthDiagnostic] user_task_assignments query skipped or failed:', tasksErr)
      }

      // Step E: Fetch assigned site details if site_id is present
      let assignedSite: { id: string; name: string; code: string; location?: string } | undefined = undefined
      if (memberData.site_id) {
        try {
          const { data: siteData } = await supabase
            .from('sites')
            .select('id, name, code, location')
            .eq('id', memberData.site_id)
            .maybeSingle()
          if (siteData) {
            assignedSite = {
              id: siteData.id,
              name: siteData.name,
              code: siteData.code,
              location: siteData.location,
            }
          }
        } catch {
          // ignore
        }
      }

      return {
        status: 'SUCCESS',
        userId,
        email,
        profile,
        organization,
        membership,
        role: rawRole,
        baseRole,
        assignedSite,
        mustChangePassword: profile.mustChangePassword ?? false,
        permissions: [],
        assignedTasks,
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to query user authorization.'
      console.error('[AuthDiagnostic] Unexpected error resolving user context:', err)
      return {
        status: 'ERROR',
        permissions: [],
        assignedTasks: [],
        errorMessage: msg,
      }
    }
  }
}