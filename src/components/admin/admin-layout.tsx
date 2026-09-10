import React from 'react'
import {
  LayoutDashboard,
  FolderKanban,
  Users,
  Fuel,
  Package,
  Cpu,
  Building2,
  Settings,
  LogOut,
} from 'lucide-react'
import { UnifiedDashboardLayout } from '../layout/unified-dashboard-layout'
import type { Profile, Organization } from '../../types/foundation'
import type { NavGroupData, NavItemData } from '../ui/dashboard-sidebar'

interface AdminLayoutProps {
  profile: Profile
  organization: Organization
  children: React.ReactNode
  onSignOut: () => void
  activeModule: string
  onSelectModule: (id: string) => void
  pageTitle?: string
  pendingApprovalsCount?: number
}

export function AdminLayout({
  profile,
  organization,
  children,
  onSignOut,
  activeModule,
  onSelectModule,
  pageTitle = 'Overview',
  pendingApprovalsCount = 0,
}: AdminLayoutProps) {
  const navGroups: NavGroupData[] = [
    {
      items: [
        { id: 'dashboard', title: 'Overview', icon: LayoutDashboard },
      ],
    },
    {
      heading: 'Command Center',
      items: [
        { id: 'projects', title: 'Projects & Sites', icon: FolderKanban },
        {
          id: 'people',
          title: 'People & Directory',
          icon: Users,
          badge: pendingApprovalsCount > 0 ? pendingApprovalsCount : undefined,
        },
      ],
    },
    {
      heading: 'Mechanical Department',
      items: [
        { id: 'diesel-requisition', title: 'Diesel Requisition', icon: Fuel },
        { id: 'item-master', title: 'Item Master', icon: Package },
        { id: 'asset-master', title: 'Asset Master', icon: Cpu },
        { id: 'vendor-master', title: 'Vendor Master', icon: Building2 },
      ],
    },
  ]

  const bottomItems: NavItemData[] = [
    { id: 'settings', title: 'Settings & Updates', icon: Settings },
    { id: 'logout', title: 'Log Out', icon: LogOut },
  ]

  const searchItems = [
    { id: 'dashboard', title: 'Overview & Metrics', category: 'Dashboard' },
    { id: 'projects', title: 'Projects & Sites Management', category: 'Operations' },
    { id: 'people', title: 'Personnel & TBAC Matrix', category: 'Directory' },
    { id: 'diesel-requisition', title: 'Diesel Requisitions & Indents', category: 'Mechanical' },
    { id: 'item-master', title: 'Item Master Catalog', category: 'Mechanical' },
    { id: 'asset-master', title: 'Asset Master Directory', category: 'Mechanical' },
    { id: 'vendor-master', title: 'Vendor Master Directory', category: 'Mechanical' },
    { id: 'settings', title: 'Settings & App Updates', category: 'System' },
  ]

  return (
    <UnifiedDashboardLayout
      organizationName={organization.name}
      subtitle="Enterprise Management"
      avatarChar={organization.name.charAt(0)}
      userFullName={profile.fullName || 'Administrator'}
      userRole="ADMIN"
      pageTitle={pageTitle}
      activeModule={activeModule}
      onSelectModule={onSelectModule}
      onSignOut={onSignOut}
      navGroups={navGroups}
      bottomItems={bottomItems}
      searchItems={searchItems}
    >
      {children}
    </UnifiedDashboardLayout>
  )
}