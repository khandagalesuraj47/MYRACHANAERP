import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { AdminLayout } from './admin-layout'
import { AdminHero } from './admin-hero'
import { AdminKpiGrid } from './admin-kpi-grid'
import { AdminSystemStatus } from './admin-system-status'
import { AdminRepository, type AdminContextData, type OrganizationStats } from '../../repositories/admin/admin-repository'
import { supabase } from '../../lib/supabase'
import { Loader2, AlertCircle, RefreshCw, Layers } from 'lucide-react'

export function AdminDashboard() {
  const navigate = useNavigate()
  const [context, setContext] = useState<AdminContextData | null>(null)
  const [stats, setStats] = useState<OrganizationStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeModule, setActiveModule] = useState('dashboard')

  // Data fetching logic
  const loadAdminContext = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const data = await AdminRepository.getCurrentAdminContext()
      if (!data) {
        setError('Unauthorized or inactive administrator account. Please check your credentials.')
        return
      }

      // Security verify: ensure role is ADMIN
      if (data.membership.role !== 'ADMIN') {
        setError('Forbidden: This dashboard is restricted to organization administrators.')
        return
      }

      setContext(data)
      setStats(data.stats)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to query organization database.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial load
  useEffect(() => {
    let isMounted = true

    AdminRepository.getCurrentAdminContext().then((data) => {
      if (!isMounted) return

      if (!data) {
        setError('Unauthorized or inactive administrator account. Please check your credentials.')
        setLoading(false)
        return
      }

      if (data.membership.role !== 'ADMIN') {
        setError('Forbidden: This dashboard is restricted to organization administrators.')
        setLoading(false)
        return
      }

      setContext(data)
      setStats(data.stats)
      setLoading(false)
    }).catch((err: unknown) => {
      if (!isMounted) return
      const msg = err instanceof Error ? err.message : 'Failed to query organization database.'
      setError(msg)
      setLoading(false)
    })

    return () => {
      isMounted = false
    }
  }, [])


  // Supabase Realtime channel subscription for live sync
  useEffect(() => {
    if (!context?.organization.id) return

    const orgId = context.organization.id

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
          // Re-query stats smoothly when membership changes
          const updatedStats = await AdminRepository.getOrganizationUserStats(orgId, context.organization.isActive)
          setStats(updatedStats)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'organizations',
          filter: `id=eq.${orgId}`,
        },
        (payload) => {
          if (payload.new) {
            setContext((prev) =>
              prev
                ? {
                    ...prev,
                    organization: {
                      ...prev.organization,
                      name: (payload.new as { name?: string }).name ?? prev.organization.name,
                      isActive: (payload.new as { is_active?: boolean }).is_active ?? prev.organization.isActive,
                    },
                  }
                : null
            )
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [context?.organization.id, context?.organization.isActive])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  // Loading Screen
  if (loading && !context) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-slate-950 text-slate-100 font-sans">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <div className="space-y-1 text-center">
            <h2 className="text-sm font-semibold text-white">Connecting to MY RACHANA ERP...</h2>
            <p className="text-xs text-slate-400 font-mono">Verifying multi-tenant administrator authority</p>
          </div>
        </div>
      </div>
    )
  }

  // Fatal Error Screen (Forbidden / Network / Unconfigured)
  if (error && !context) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-950 p-6 text-slate-100 font-sans">
        <div className="w-full max-w-md rounded-2xl border border-rose-900/60 bg-slate-900 p-8 shadow-2xl space-y-5 text-left">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-950/80 border border-rose-800 text-rose-400">
              <AlertCircle className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Access Verification Failed</h2>
              <span className="text-[10px] font-mono text-rose-400">SECURITY BOUNDARY ENFORCED</span>
            </div>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed font-mono bg-slate-950 p-3 rounded-lg border border-slate-800">
            {error}
          </p>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={loadAdminContext}
              className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-500 py-2.5 px-4 text-xs font-medium text-white transition-colors cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Retry Session</span>
            </button>

            <button
              type="button"
              onClick={handleSignOut}
              className="flex-1 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-750 py-2.5 px-4 text-xs font-medium text-slate-300 transition-colors cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!context) return null

  return (
    <AdminLayout
      profile={context.profile}
      organization={context.organization}
      onSignOut={handleSignOut}
      activeModule={activeModule}
      onSelectModule={setActiveModule}
      pageTitle={activeModule === 'dashboard' ? 'Overview' : activeModule.toUpperCase()}
    >
      {activeModule === 'dashboard' ? (
        <>
          {/* Hero Welcome banner */}
          <AdminHero
            fullName={context.profile.fullName}
            organizationName={context.organization.name}
            role={context.membership.role}
          />

          {/* KPI metrics */}
          <AdminKpiGrid
            stats={stats}
            loading={loading}
            error={error}
            onRetry={loadAdminContext}
          />

          {/* Architecture and Security Governance */}
          <AdminSystemStatus
            organization={context.organization}
            role={context.membership.role}
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
            className="inline-flex items-center gap-2 rounded-lg bg-slate-800 hover:bg-slate-700 px-4 py-2 text-xs font-medium text-slate-200 transition-colors cursor-pointer"
          >
            Back to Dashboard
          </button>
        </div>
      )}
    </AdminLayout>
  )
}

export default AdminDashboard