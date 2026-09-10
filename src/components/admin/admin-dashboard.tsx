import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FolderKanban,
  Users,
  Package,
  Cpu,
  Fuel,
  ArrowRight,
  Building2,
  MapPin,
} from 'lucide-react'
import { AdminLayout } from './admin-layout'
import { AdminHero } from './admin-hero'
import { PeopleDirectory } from './people/people-directory'
import { ProjectsSitesView } from './operations/projects-sites-view'
import { ItemMasterView } from './mechanical/item-master-view'
import { AssetMasterView } from './mechanical/asset-master-view'
import { VendorMasterView } from './mechanical/vendor-master-view'
import { DieselRequisitionView } from './mechanical/diesel-requisition-view'
import { AppSettingsView } from '../common/app-settings-view'
import { ProjectsRepository } from '../../repositories/erp/projects-repository'
import { AdminRepository, type OrganizationStats } from '../../repositories/admin/admin-repository'
import { useAuth } from '../../context/auth-context'
import { realtimeManager } from '../../lib/realtime-manager'
import type { Profile, Organization } from '../../types/foundation'

export function AdminDashboard() {
  const navigate = useNavigate()
  const { context: authCtx, signOut } = useAuth()
  const [stats, setStats] = useState<OrganizationStats | null>(null)
  const [projectCounts, setProjectCounts] = useState({ projects: 0, sites: 0 })
  const [loading, setLoading] = useState(true)
  const [activeModule, setActiveModule] = useState('dashboard')

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

  const fetchOverviewData = useCallback(async () => {
    if (!organization.id) return
    try {
      const [memberStats, projectsWithSites] = await Promise.all([
        AdminRepository.getOrganizationUserStats(organization.id, organization.isActive),
        ProjectsRepository.getProjectsWithSites(organization.id),
      ])
      setStats(memberStats)
      const sitesTotal = projectsWithSites.reduce((acc, p) => acc + p.sites.length, 0)
      setProjectCounts({
        projects: projectsWithSites.length,
        sites: sitesTotal,
      })
    } catch (err) {
      console.warn('[AdminDashboard] Data fetch warning:', err)
    } finally {
      setLoading(false)
    }
  }, [organization.id, organization.isActive])

  useEffect(() => {
    if (!organization.id) return

    // Initial fetch
    void fetchOverviewData()

    // 24x7 Realtime Sync & Heartbeat
    const unsubHeartbeat = realtimeManager.registerListener(() => {
      void fetchOverviewData()
    })

    const unsubMembers = realtimeManager.subscribe(
      `admin-overview-members-${organization.id}`,
      'organization_members',
      () => {
        void fetchOverviewData()
      }
    )

    const unsubSites = realtimeManager.subscribe(
      `admin-overview-sites-${organization.id}`,
      'sites',
      () => {
        void fetchOverviewData()
      }
    )

    const unsubProjects = realtimeManager.subscribe(
      `admin-overview-projects-${organization.id}`,
      'projects',
      () => {
        void fetchOverviewData()
      }
    )

    return () => {
      unsubHeartbeat()
      unsubMembers()
      unsubSites()
      unsubProjects()
    }
  }, [organization.id, fetchOverviewData])

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
      pendingApprovalsCount={stats?.pendingMembersCount || 0}
      pageTitle={
        activeModule === 'dashboard'
          ? 'Overview'
          : activeModule === 'projects'
          ? 'Projects & Sites'
          : activeModule === 'people'
          ? 'People & Directory'
          : activeModule === 'item-master'
          ? 'Item Master (Mechanical)'
          : activeModule === 'asset-master'
          ? 'Asset Master (Mechanical)'
          : activeModule === 'vendor-master'
          ? 'Vendor Master (Mechanical)'
          : activeModule === 'diesel-requisition'
          ? 'Diesel Requisition (Mechanical)'
          : activeModule === 'settings'
          ? 'Settings & Updates'
          : 'Overview'
      }
    >
      {activeModule === 'dashboard' ? (
        <div className="space-y-6 text-left">
          {/* Welcome banner */}
          <AdminHero
            fullName={profile.fullName}
            organizationName={organization.name}
            role={role}
          />

          {/* Clean Metric Cards - Light Theme */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <button
              type="button"
              onClick={() => setActiveModule('projects')}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs text-left transition-all hover:border-blue-400 hover:shadow-sm cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Total Projects</span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg border bg-blue-50 border-blue-200 text-blue-600">
                  <FolderKanban className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-bold font-mono text-slate-900">
                  {loading ? '...' : projectCounts.projects}
                </div>
                <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Civil contract packages</span>
                  <ArrowRight className="h-3 w-3 text-slate-400 group-hover:text-blue-600 transition-colors" />
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setActiveModule('projects')}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs text-left transition-all hover:border-emerald-400 hover:shadow-sm cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Operational Sites</span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg border bg-emerald-50 border-emerald-200 text-emerald-600">
                  <MapPin className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-bold font-mono text-slate-900">
                  {loading ? '...' : projectCounts.sites}
                </div>
                <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Active field locations</span>
                  <ArrowRight className="h-3 w-3 text-slate-400 group-hover:text-emerald-600 transition-colors" />
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setActiveModule('people')}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs text-left transition-all hover:border-indigo-400 hover:shadow-sm cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Team Personnel</span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg border bg-indigo-50 border-indigo-200 text-indigo-600">
                  <Users className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-bold font-mono text-slate-900">
                  {loading ? '...' : stats?.totalUsers || 1}
                </div>
                <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Registered accounts & staff</span>
                  <ArrowRight className="h-3 w-3 text-slate-400 group-hover:text-indigo-600 transition-colors" />
                </div>
              </div>
            </button>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs text-left">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Company Tenant</span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg border bg-slate-50 border-slate-200 text-slate-600">
                  <Building2 className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-sm font-bold text-slate-900 truncate">
                  {organization.name}
                </div>
                <p className="mt-1 text-[11px] text-emerald-600 font-medium">Verified Active Tenant</p>
              </div>
            </div>
          </div>

          {/* Quick Department Sections */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
            {/* Command Center Quick Access */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="space-y-0.5">
                  <span className="font-mono text-[10px] font-bold text-blue-700 uppercase bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
                    Command Center
                  </span>
                  <h3 className="text-sm font-bold text-slate-900 pt-1">
                    Projects, Sites & Personnel
                  </h3>
                </div>
              </div>

              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setActiveModule('projects')}
                  className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-200/80 bg-slate-50/70 hover:bg-slate-100/70 hover:border-slate-300 transition-all text-left cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center">
                      <FolderKanban className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                        Projects & Sites Management
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Create projects like VTR Project and add multiple sites (Walshind, Kharegaon)
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-blue-600 transition-colors shrink-0" />
                </button>

                <button
                  type="button"
                  onClick={() => setActiveModule('people')}
                  className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-200/80 bg-slate-50/70 hover:bg-slate-100/70 hover:border-slate-300 transition-all text-left cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center">
                      <Users className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                        People & Directory
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Manage members, 1-click site assignments and operational responsibilities
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-indigo-600 transition-colors shrink-0" />
                </button>
              </div>
            </div>

            {/* Mechanical Department Quick Access */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="space-y-0.5">
                  <span className="font-mono text-[10px] font-bold text-amber-700 uppercase bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                    Mechanical Department
                  </span>
                  <h3 className="text-sm font-bold text-slate-900 pt-1">
                    Equipment, Assets, Vendors & Fuel
                  </h3>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setActiveModule('diesel-requisition')}
                  className="p-3 rounded-xl border border-slate-200/80 bg-slate-50/70 hover:bg-amber-50 hover:border-amber-300 transition-all text-left cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-amber-100 border border-amber-200 text-amber-600 flex items-center justify-center shrink-0">
                      <Fuel className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 group-hover:text-amber-700 transition-colors truncate">
                        Diesel Requisition
                      </p>
                      <p className="text-[10px] text-slate-500 truncate">
                        Site fuel indents & approvals
                      </p>
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveModule('item-master')}
                  className="p-3 rounded-xl border border-slate-200/80 bg-slate-50/70 hover:bg-blue-50 hover:border-blue-300 transition-all text-left cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-blue-100 border border-blue-200 text-blue-600 flex items-center justify-center shrink-0">
                      <Package className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 group-hover:text-blue-700 transition-colors truncate">
                        Item Master
                      </p>
                      <p className="text-[10px] text-slate-500 truncate">
                        Parts, spares & items catalog
                      </p>
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveModule('asset-master')}
                  className="p-3 rounded-xl border border-slate-200/80 bg-slate-50/70 hover:bg-emerald-50 hover:border-emerald-300 transition-all text-left cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-emerald-100 border border-emerald-200 text-emerald-600 flex items-center justify-center shrink-0">
                      <Cpu className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 group-hover:text-emerald-700 transition-colors truncate">
                        Asset Master
                      </p>
                      <p className="text-[10px] text-slate-500 truncate">
                        Plant, machinery & vehicles
                      </p>
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveModule('vendor-master')}
                  className="p-3 rounded-xl border border-slate-200/80 bg-slate-50/70 hover:bg-purple-50 hover:border-purple-300 transition-all text-left cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-purple-100 border border-purple-200 text-purple-600 flex items-center justify-center shrink-0">
                      <Building2 className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 group-hover:text-purple-700 transition-colors truncate">
                        Vendor Master
                      </p>
                      <p className="text-[10px] text-slate-500 truncate">
                        Suppliers, pumps & contractors
                      </p>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : activeModule === 'projects' ? (
        <ProjectsSitesView
          organizationId={organization.id}
          organizationName={organization.name}
        />
      ) : activeModule === 'people' ? (
        <PeopleDirectory
          organizationId={organization.id}
          organizationName={organization.name}
        />
      ) : activeModule === 'item-master' ? (
        <ItemMasterView
          organizationId={organization.id}
          organizationName={organization.name}
        />
      ) : activeModule === 'asset-master' ? (
        <AssetMasterView
          organizationId={organization.id}
          organizationName={organization.name}
        />
      ) : activeModule === 'vendor-master' ? (
        <VendorMasterView
          organizationId={organization.id}
          organizationName={organization.name}
        />
      ) : activeModule === 'diesel-requisition' ? (
        <DieselRequisitionView
          organizationId={organization.id}
          organizationName={organization.name}
        />
      ) : activeModule === 'settings' ? (
        <AppSettingsView />
      ) : (
        <ProjectsSitesView
          organizationId={organization.id}
          organizationName={organization.name}
        />
      )}
    </AdminLayout>
  )
}

export default AdminDashboard