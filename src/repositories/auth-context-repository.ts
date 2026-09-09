import { supabase } from '../lib/supabase'
import type { Organization, Profile, OrganizationMember, UserRole } from '../types/foundation'

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
  role?: UserRole
  errorMessage?: string
}

interface RpcContextPayload {
  status: UserResolutionStatus
  userId?: string
  email?: string
  role?: UserRole
  errorMessage?: string
  profile?: {
    id: string
    email: string | null
    fullName: string | null
    isActive: boolean
    createdAt?: string
    updatedAt?: string
  }
  membership?: {
    id: string
    organizationId: string
    userId: string
    role: UserRole
    isActive: boolean
    createdAt?: string
    updatedAt?: string
  }
  organization?: {
    id: string
    name: string
    slug: string
    isActive: boolean
    createdAt?: string
    updatedAt?: string
  }
}

/**
 * Universal User Context Resolver
 * Resolves session, profile, active organization, and role from PostgreSQL & Supabase Auth.
 * Zero hardcoded email addresses, UUIDs, or roles.
 */
export class AuthContextRepository {
  static async getCurrentUserContext(): Promise<UserContextResult> {
    try {
      // 1. Authenticate user session
      const { data: authData, error: authError } = await supabase.auth.getUser()
      if (authError || !authData.user) {
        console.log('[AuthDiagnostic] 1. Authenticated User: None (Unauthenticated session)')
        return { status: 'UNAUTHENTICATED' }
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
              isActive: payload.organization.isActive,
              createdAt: payload.organization.createdAt ?? '',
              updatedAt: payload.organization.updatedAt ?? '',
            }

            const membership: OrganizationMember = {
              id: payload.membership.id,
              organizationId: payload.membership.organizationId,
              userId: payload.membership.userId,
              role: payload.membership.role,
              isActive: payload.membership.isActive,
              createdAt: payload.membership.createdAt ?? '',
              updatedAt: payload.membership.updatedAt ?? '',
            }

            const profile: Profile = {
              id: payload.profile?.id ?? userId,
              email: payload.profile?.email ?? email ?? null,
              fullName: payload.profile?.fullName ?? null,
              isActive: payload.profile?.isActive ?? true,
              createdAt: payload.profile?.createdAt ?? '',
              updatedAt: payload.profile?.updatedAt ?? '',
            }

            console.log('[AuthDiagnostic] 5. Final Resolved Role:', membership.role)
            console.log('[AuthDiagnostic] 6. Final Resolved Organization:', organization.name)

            return {
              status: 'SUCCESS',
              userId,
              email,
              role: membership.role,
              profile,
              membership,
              organization,
            }
          } else if (payload.status && payload.status !== 'SUCCESS') {
            console.warn('[AuthDiagnostic] RPC returned non-success status:', payload.status, payload.errorMessage)
            return {
              status: payload.status,
              userId,
              email,
              errorMessage: payload.errorMessage,
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
        .select('id, email, full_name, is_active, created_at, updated_at')
        .eq('id', userId)
        .maybeSingle()

      console.log('[AuthDiagnostic] 2. Profile Result:', { data: profileData, error: profileError })

      const profile: Profile = profileData
        ? {
            id: profileData.id,
            email: profileData.email,
            fullName: profileData.full_name,
            isActive: profileData.is_active,
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
          errorMessage: 'Your user profile has been deactivated. Please contact your organization administrator.',
        }
      }

      // Step B: Fetch active membership in organization_members
      const { data: memberData, error: memberError } = await supabase
        .from('organization_members')
        .select('id, organization_id, user_id, role, is_active, created_at, updated_at')
        .eq('user_id', userId)
        .eq('is_active', true)
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
          errorMessage: `Database error querying organization membership: ${memberError.message} (${memberError.code || 'unknown'})`,
        }
      }

      if (!memberData) {
        console.warn('[AuthDiagnostic] No active organization membership row found for user ID:', userId)
        return {
          status: 'NO_MEMBERSHIP',
          userId,
          email,
          profile,
          errorMessage: 'Your account is not assigned to an active organization. Please contact your administrator.',
        }
      }

      const membership: OrganizationMember = {
        id: memberData.id,
        organizationId: memberData.organization_id,
        userId: memberData.user_id,
        role: memberData.role as UserRole,
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
          errorMessage: 'Your organization account is currently inactive. Please contact support.',
        }
      }

      console.log('[AuthDiagnostic] 5. Final Resolved Role:', membership.role)
      console.log('[AuthDiagnostic] 6. Final Resolved Organization:', organization.name)

      return {
        status: 'SUCCESS',
        userId,
        email,
        profile,
        organization,
        membership,
        role: membership.role,
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to query user authorization.'
      console.error('[AuthDiagnostic] Unexpected error resolving user context:', err)
      return {
        status: 'ERROR',
        errorMessage: msg,
      }
    }
  }
}