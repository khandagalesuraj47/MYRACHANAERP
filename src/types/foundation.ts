/**
 * Core Multi-Company / Multi-Tenant Organizational Foundation
 *
 * Hierarchy:
 * Platform
 *  └── Company
 *        └── Business Unit
 *              └── Department
 *                    └── Project
 *                          └── Site
 *                                └── Location
 */

export interface Company {
  id: string
  code: string
  name: string
  createdAt?: string
  updatedAt?: string
}

export interface BusinessUnit {
  id: string
  companyId: string
  code: string
  name: string
}

export interface Department {
  id: string
  companyId: string
  code: string
  name: string
}

export interface Project {
  id: string
  companyId: string
  businessUnitId?: string
  code: string
  name: string
}

export interface Site {
  id: string
  companyId: string
  projectId: string
  code: string
  name: string
  locationCity?: string
}

export interface Location {
  id: string
  companyId: string
  siteId: string
  code: string
  name: string
  type: string
}

export interface UserProfile {
  id: string
  email: string
  fullName: string
  activeCompanyId: string
  role: string
}

