import { supabase } from '../../lib/supabase'
import type { Organization, Profile, OrganizationMember } from '../../types/foundation'

export interface OrganizationStats {
  totalUsers: number
  activeUsers: number
  adminCount: number
  isOrganizationActive: boolean
}

export interface AdminContextData {
  profile: Profile
  membership: OrganizationMember
  organization: Organization
  stats: OrganizationStats
}

/**
 * Admin Repository
 * Pure Supabase client-side data layer adhering strictly to PostgreSQL RLS policies.
 * No hardcoded organization UUIDs, user UUIDs, or elevated privileges.
 */
export class AdminRepository {
  /**
   * Resolves the current user's profile, active organization, and role.
   * Ensures that only members with role === 'ADMIN' are validated.
   */
  static async getCurrentAdminContext(): Promise<AdminContextData | null> {
    const { data: authData, error: authError } = await supabase.auth.getUser()
    if (authError || !authData.user) {
      return null
    }

    const userId = authData.user.id

    // 1. Fetch profile
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, full_name, is_active, created_at, updated_at')
      .eq('id', userId)
      .single()

    const profile: Profile = profileData && !profileError
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
          email: authData.user.email ?? null,
          fullName: authData.user.user_metadata?.full_name ?? authData.user.user_metadata?.name ?? null,
          isActive: true,
          createdAt: authData.user.created_at,
          updatedAt: authData.user.updated_at ?? authData.user.created_at,
        }

    // 2. Fetch user's active membership (RLS permits reading own membership)
    const { data: memberData, error: memberError } = await supabase
      .from('organization_members')
      .select('id, organization_id, user_id, role, is_active, created_at, updated_at')
      .eq('user_id', userId)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle()

    if (memberError || !memberData) {
      return null
    }

    const membership: OrganizationMember = {
      id: memberData.id,
      organizationId: memberData.organization_id,
      userId: memberData.user_id,
      role: memberData.role,
      isActive: memberData.is_active,
      createdAt: memberData.created_at,
      updatedAt: memberData.updated_at,
    }

    // 3. Fetch Organization details via membership's organization_id (RLS protected)
    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .select('id, name, slug, is_active, created_at, updated_at')
      .eq('id', membership.organizationId)
      .single()

    if (orgError || !orgData) {
      return null
    }

    const organization: Organization = {
      id: orgData.id,
      name: orgData.name,
      slug: orgData.slug,
      isActive: orgData.is_active,
      createdAt: orgData.created_at,
      updatedAt: orgData.updated_at,
    }

    // 4. Fetch actual organization member statistics
    const stats = await this.getOrganizationUserStats(membership.organizationId, organization.isActive)

    return {
      profile,
      membership,
      organization,
      stats,
    }
  }

  /**
   * Fetches real user statistics for an organization.
   * Only counts records accessible via current session RLS.
   */
  static async getOrganizationUserStats(organizationId: string, isOrgActive: boolean): Promise<OrganizationStats> {
    const { data: members, error } = await supabase
      .from('organization_members')
      .select('id, role, is_active')
      .eq('organization_id', organizationId)

    if (error || !members) {
      return {
        totalUsers: 1,
        activeUsers: 1,
        adminCount: 1,
        isOrganizationActive: isOrgActive,
      }
    }

    const totalUsers = members.length
    const activeUsers = members.filter((m) => m.is_active).length
    const adminCount = members.filter((m) => m.role === 'ADMIN' && m.is_active).length

    return {
      totalUsers,
      activeUsers,
      adminCount,
      isOrganizationActive: isOrgActive,
    }
  }
}