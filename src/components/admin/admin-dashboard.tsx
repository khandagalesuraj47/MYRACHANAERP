import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { AdminLayout } from './admin-layout'
import { AdminHero } from './admin-hero'
import { AdminKpiGrid } from './admin-kpi-grid'
import { AdminSystemStatus } from './admin-system-status'
import { PeopleDirectory } from './people/people-directory'
import { FuelDieselView } from './operations/fuel-diesel-view'
import { FleetMachineryView } from './operations/fleet-machinery-view'
import { InventoryMaterialsView } from './operations/inventory-materials-view'
import { ProcurementView } from './operations/procurement-view'
import { DynamicFormsView } from './operations/dynamic-forms-view'
import { ApprovalWorkflowsView } from './operations/approval-workflows-view'
import { AuditLogsView } from './operations/audit-logs-view'
import { AdminRepository, type OrganizationStats } from '../../repositories/admin/admin-repository'
import { useAuth } from '../../context/auth-context'
import { supabase } from '../../lib/supabase'
import type { Profile, Organization } from '../../types/foundation'

export function AdminDashboard() {
  const navigate = useNavigate()
  const { context: authCtx, signOut } = useAuth()
  const [stats, setStats] = useState<OrganizationStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)
  const [statsError, setStatsError] = useState<string | null>(null)
  const [activeModule, setActiveModule] = useState('dashboard')

  // Canonical profile, organization, and role resolved by AuthProvider & guaranteed by AdminRoute
  const profile: Profile = authCtx?.profile ?? {
    id: authCtx?.userId ?? '',
    email: authCtx?.email ?? null,
    fullName: authCtx?.profile?.fullName ?? 'Administrator',
    isActive: true,
    createdAt: '',
    updatedAt: '',
  }

  const organization: Organization = authCtx?.organization ?? {
    id: authCtx?.membership?.organizationId ?? '',
    name: authCtx?.organization?.name ?? 'Rachana Construction Limited',
    slug: authCtx?.organization?.slug ?? 'rachana-construction-limited',
    isActive: true,
    createdAt: '',
    updatedAt: '',
  }

  const role = authCtx?.role ?? 'ADMIN'

  // Fetch real organization member statistics asynchronously
  const loadStats = useCallback(async () => {
    if (!organization.id) return
    setStatsLoading(true)
    setStatsError(null)

    try {
      const data = await AdminRepository.getOrganizationUserStats(
        organization.id,
        organization.isActive
      )
      setStats(data)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to query organization statistics.'
      console.warn('[AdminDashboard] Stats fetch warning:', msg)
      setStatsError(msg)
    } finally {
      setStatsLoading(false)
    }
  }, [organization.id, organization.isActive])

  useEffect(() => {
    let isMounted = true
    if (!organization.id) return

    AdminRepository.getOrganizationUserStats(
      organization.id,
      organization.isActive
    ).then((data) => {
      if (isMounted) {
        setStats(data)
        setStatsLoading(false)
      }
    }).catch((err: unknown) => {
      if (isMounted) {
        const msg = err instanceof Error ? err.message : 'Failed to query organization statistics.'
        console.warn('[AdminDashboard] Stats fetch warning:', msg)
        setStatsError(msg)
        setStatsLoading(false)
      }
    })

    return () => {
      isMounted = false
    }
  }, [organization.id, organization.isActive])

  // Supabase Realtime channel subscription for live sync on membership changes
  useEffect(() => {
    if (!organization.id) return

    const orgId = organization.id

    const channel = supabase
      .channel(`admin-org-${orgId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'organization_members',
          filter: `organization_id=eq.${orgId}`,
        },
        async () => {
          const updatedStats = await AdminRepository.getOrganizationUserStats(
            orgId,
            organization.isActive
          )
          setStats(updatedStats)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [organization.id, organization.isActive])

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <AdminLayout
      profile={profile}
      organization={organization}
      onSignOut={handleSignOut}
      activeModule={activeModule}
      onSelectModule={setActiveModule}
      pageTitle={
        activeModule === 'dashboard'
          ? 'Overview'
          : activeModule === 'people'
          ? 'People & Access'
          : activeModule === 'fuel'
          ? 'Fuel & Diesel Logs'
          : activeModule === 'fleet' || activeModule === 'machines'
          ? 'Machinery & Fleet'
          : activeModule === 'inventory' || activeModule === 'material'
          ? 'Inventory & Materials'
          : activeModule === 'purchase'
          ? 'Procurement & POs'
          : activeModule === 'forms'
          ? 'Dynamic Forms'
          : activeModule === 'workflows'
          ? 'Approval Workflows'
          : activeModule === 'audit-logs'
          ? 'Audit Logs'
          : activeModule.toUpperCase()
      }
    >
      {activeModule === 'dashboard' ? (
        <>
          {/* Hero Welcome banner */}
          <AdminHero
            fullName={profile.fullName}
            organizationName={organization.name}
            role={role}
          />

          {/* KPI metrics */}
          <AdminKpiGrid
            stats={stats}
            loading={statsLoading}
            error={statsError}
            onRetry={loadStats}
          />

          {/* Architecture and Security Governance */}
          <AdminSystemStatus
            organization={organization}
            role={role}
          />
        </>
      ) : activeModule === 'people' ? (
        <PeopleDirectory
          organizationId={organization.id}
          organizationName={organization.name}
        />
      ) : activeModule === 'fuel' ? (
        <FuelDieselView organizationId={organization.id} />
      ) : activeModule === 'fleet' || activeModule === 'machines' ? (
        <FleetMachineryView organizationId={organization.id} />
      ) : activeModule === 'inventory' || activeModule === 'material' ? (
        <InventoryMaterialsView organizationId={organization.id} />
      ) : activeModule === 'purchase' ? (
        <ProcurementView organizationId={organization.id} />
      ) : activeModule === 'forms' ? (
        <DynamicFormsView organizationId={organization.id} />
      ) : activeModule === 'workflows' ? (
        <ApprovalWorkflowsView organizationId={organization.id} />
      ) : activeModule === 'audit-logs' ? (
        <AuditLogsView organizationId={organization.id} />
      ) : (
        <PeopleDirectory
          organizationId={organization.id}
          organizationName={organization.name}
        />
      )}
    </AdminLayout>
  )
}

export default AdminDashboard