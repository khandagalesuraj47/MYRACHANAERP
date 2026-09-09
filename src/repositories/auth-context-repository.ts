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

/**
 * Universal User Context Resolver
 * Resolves session, profile, active organization, and role from PostgreSQL & Supabase Auth.
 * Zero hardcoded email addresses, UUIDs, or roles.
 */
export class AuthContextRepository {
  static async getCurrentUserContext(): Promise<UserContextResult> {
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser()
      if (authError || !authData.user) {
        return { status: 'UNAUTHENTICATED' }
      }

      const userId = authData.user.id
      const email = authData.user.email ?? undefined

      // 1. Fetch profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, email, full_name, is_active, created_at, updated_at')
        .eq('id', userId)
        .maybeSingle()

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

      // 2. Fetch active membership in organization_members
      const { data: memberData, error: memberError } = await supabase
        .from('organization_members')
        .select('id, organization_id, user_id, role, is_active, created_at, updated_at')
        .eq('user_id', userId)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle()

      if (memberError || !memberData) {
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

      // 3. Fetch Organization
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('id, name, slug, is_active, created_at, updated_at')
        .eq('id', membership.organizationId)
        .maybeSingle()

      if (orgError || !orgData) {
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
      return {
        status: 'ERROR',
        errorMessage: msg,
      }
    }
  }
}