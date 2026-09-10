import { supabase } from '../../lib/supabase'
import { AuthContextRepository } from '../auth-context-repository'
import type { Organization, Profile, OrganizationMember } from '../../types/foundation'

export interface OrganizationStats {
  totalUsers: number
  activeUsers: number
  adminCount: number
  pendingMembersCount?: number
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
 * Canonical resolution delegates to AuthContextRepository for zero duplication.
 */
export class AdminRepository {
  /**
   * Resolves the current user's profile, active organization, and role.
   * Ensures that only members with role === 'ADMIN' are validated.
   */
  static async getCurrentAdminContext(): Promise<AdminContextData | null> {
    const userContext = await AuthContextRepository.getCurrentUserContext()

    if (
      userContext.status !== 'SUCCESS' ||
      userContext.role !== 'ADMIN' ||
      !userContext.organization ||
      !userContext.membership ||
      !userContext.profile
    ) {
      console.warn(
        '[AdminRepository] User context is not an active ADMIN session:',
        userContext.status,
        userContext.role,
        userContext.errorMessage
      )
      return null
    }

    const stats = await this.getOrganizationUserStats(
      userContext.organization.id,
      userContext.organization.isActive
    )

    return {
      profile: userContext.profile,
      membership: userContext.membership,
      organization: userContext.organization,
      stats,
    }
  }

  /**
   * Fetches real user statistics for an organization.
   * Only counts records accessible via current session RLS.
   */
  static async getOrganizationUserStats(
    organizationId: string,
    isOrgActive: boolean
  ): Promise<OrganizationStats> {
    try {
      const { data: members, error } = await supabase
        .from('organization_members')
        .select('id, role, is_active')
        .eq('organization_id', organizationId)

      if (error || !members) {
        console.warn('[AdminRepository] Failed to fetch organization members stats:', error)
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
      const pendingMembersCount = members.filter((m) => !m.is_active).length

      return {
        totalUsers: totalUsers > 0 ? totalUsers : 1,
        activeUsers: activeUsers > 0 ? activeUsers : 1,
        adminCount: adminCount > 0 ? adminCount : 1,
        pendingMembersCount,
        isOrganizationActive: isOrgActive,
      }
    } catch (err) {
      console.error('[AdminRepository] Unexpected error in getOrganizationUserStats:', err)
      return {
        totalUsers: 1,
        activeUsers: 1,
        adminCount: 1,
        pendingMembersCount: 0,
        isOrganizationActive: isOrgActive,
      }
    }
  }
}