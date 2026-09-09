/**
 * Core Multi-Tenant Database Foundation Types
 *
 * Entity Hierarchy:
 * Organization
 *    └── Organization Members (Users with Roles: ADMIN, USER)
 *           └── Profiles (auth.users extension)
 */

export type UserRole = 'ADMIN' | 'USER'

export interface Organization {
  id: string
  name: string
  slug: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface Profile {
  id: string
  email: string | null
  fullName: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface OrganizationMember {
  id: string
  organizationId: string
  userId: string
  role: UserRole
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface UserSessionContext {
  user: Profile | null
  organization: Organization | null
  role: UserRole | null
}


