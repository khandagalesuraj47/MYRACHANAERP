import type { Organization, Profile, UserRole } from './foundation'

export type SystemRoleCode =
  | 'MASTER_ADMIN'
  | 'ADMIN'
  | 'PROJECT_MANAGER'
  | 'SITE_SUPERVISOR'
  | 'STORE_KEEPER'
  | 'OPERATOR'
  | 'USER'

export interface Department {
  id: string
  organizationId: string
  name: string
  code: string
  parentId?: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface Project {
  id: string
  organizationId: string
  name: string
  code: string
  description?: string | null
  status: 'PLANNING' | 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'ARCHIVED'
  startDate?: string | null
  endDate?: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface Site {
  id: string
  organizationId: string
  projectId?: string | null
  name: string
  code: string
  location?: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface Role {
  id: string
  organizationId: string
  code: string
  name: string
  description?: string | null
  isSystem: boolean
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface Permission {
  id: string
  code: string
  module: string
  action: string
  name: string
  description?: string | null
}

export interface UserPermissionOverride {
  id: string
  organizationId: string
  userId: string
  permissionId: string
  overrideType: 'ALLOW' | 'DENY'
  reason?: string | null
  grantedBy?: string | null
}

export interface TaskType {
  id: string
  organizationId: string
  code: string
  name: string
  module: string
  icon?: string | null
  description?: string | null
  defaultPriority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  slaHours: number
  requiresApproval: boolean
  isActive: boolean
}

export interface UserTaskAssignment {
  taskTypeId: string
  code: string
  name: string
  module: string
  icon?: string | null
  canInitiate: boolean
  canExecute: boolean
  canApprove: boolean
}

export interface EnhancedMember {
  id: string
  organizationId: string
  userId: string
  role: string
  baseRole: UserRole
  isActive: boolean
  employeeCode?: string | null
  phone?: string | null
  designation?: string | null
  departmentId?: string | null
  siteId?: string | null
  customRoleId?: string | null
  profile?: Profile
  organization?: Organization
  department?: Department | null
  site?: Site | null
  customRole?: Role | null
  permissions: string[]
  assignedTasks: UserTaskAssignment[]
  createdAt: string
  updatedAt: string
}

