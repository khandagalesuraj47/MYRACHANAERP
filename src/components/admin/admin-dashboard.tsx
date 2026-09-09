import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { AdminLayout } from './admin-layout'
import { AdminHero } from './admin-hero'
import { AdminKpiGrid } from './admin-kpi-grid'
import { AdminSystemStatus } from './admin-system-status'
import { AdminRepository, type OrganizationStats } from '../../repositories/admin/admin-repository'
import { useAuth } from '../../context/auth-context'
import { supabase } from '../../lib/supabase'
import { Layers } from 'lucide-react'
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
      pageTitle={activeModule === 'dashboard' ? 'Overview' : activeModule.toUpperCase()}
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
      ) : (
        /* Future ERP Modules Placeholder */
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-12 text-center space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-950/60 border border-blue-800/60 text-blue-400">
            <Layers className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-white capitalize">
              {activeModule.replace('-', ' ')} Module
            </h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              This operational domain is architected and prepared for step-by-step implementation. Database schema and workflows will connect incrementally.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setActiveModule('dashboard')}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-800 hover:bg-slate-750 px-4 py-2 text-xs font-medium text-slate-200 transition-colors cursor-pointer"
          >
            Back to Dashboard
          </button>
        </div>
      )}
    </AdminLayout>
  )
}

export default AdminDashboard