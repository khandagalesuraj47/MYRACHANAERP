import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Building2,
  CheckCircle2,
  Layers,
  Settings,
  Fuel,
  Package,
  Cpu,
  ShieldCheck,
  MapPin,
  ChevronRight,
  PhoneCall,
  Clock,
  LayoutDashboard,
  LogOut,
  ArrowRight,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { realtimeManager } from '../../lib/realtime-manager'
import type { UserContextResult } from '../../repositories/auth-context-repository'
import type { UserTaskAssignment } from '../../types/rbac'
import { UnifiedDashboardLayout } from '../layout/unified-dashboard-layout'
import { type NavGroupData, type NavItemData } from '../ui/dashboard-sidebar'
import { AppSettingsView } from '../common/app-settings-view'
import { DieselRequisitionView } from '../admin/mechanical/diesel-requisition-view'
import { ItemMasterView } from '../admin/mechanical/item-master-view'
import { AssetMasterView } from '../admin/mechanical/asset-master-view'
import { VendorMasterView } from '../admin/mechanical/vendor-master-view'
import { useAuth } from '../../context/auth-context'

interface UserPortalProps {
  context: UserContextResult
}

export function UserPortal({ context }: UserPortalProps) {
  const navigate = useNavigate()
  const { refreshContext } = useAuth()
  const [activeModule, setActiveModule] = useState<string>('dashboard')
  const [liveTasksOverride, setLiveTasksOverride] = useState<UserTaskAssignment[] | null>(null)

  const ALLOWED_CORE_TASKS = ['ITEM_MASTER', 'ASSET_MASTER', 'VENDOR_MASTER', 'DIESEL_REQUISITION']
  const assignedTasks = (liveTasksOverride ?? context.assignedTasks ?? []).filter(
    (t) => !t.code || ALLOWED_CORE_TASKS.includes(t.code)
  )

  // 100% Silent Background Synchronization - Zero UI interruption or flickering
  const manualSyncTasks = useCallback(async () => {
    if (!context.userId) return
    try {
      const { data, error } = await supabase
        .from('user_task_assignments')
        .select(`
          task_type_id,
          can_initiate,
          can_execute,
          can_approve,
          task_types (
            id,
            code,
            name,
            module,
            icon
          )
        `)
        .eq('user_id', context.userId)

      if (!error && data) {
        const freshTasks: UserTaskAssignment[] = data.map((item: any) => {
          const tt = Array.isArray(item.task_types) ? item.task_types[0] : item.task_types
          return {
            taskTypeId: item.task_type_id,
            code: tt?.code || '',
            name: tt?.name || 'Task',
            module: tt?.module || 'OPERATIONS',
            icon: tt?.icon || null,
            canInitiate: item.can_initiate,
            canExecute: item.can_execute,
            canApprove: item.can_approve,
          }
        })
        setLiveTasksOverride(freshTasks)
      }
    } catch (err) {
      console.error('[UserPortal] Background sync error:', err)
    }
  }, [context.userId])

  // 24x7 Silent Real-Time Listener (Runs 100% in background without showing technical clutter)
  useEffect(() => {
    if (!context.userId) return

    void manualSyncTasks()

    const unsubHeartbeat = realtimeManager.registerListener(() => {
      void manualSyncTasks()
    })

    const unsubTasks = realtimeManager.subscribe(
      `user-tasks-${context.userId}`,
      'user_task_assignments',
      () => {
        void manualSyncTasks()
      },
      `user_id=eq.${context.userId}`
    )

    const unsubMember = realtimeManager.subscribe(
      `user-member-${context.userId}`,
      'organization_members',
      async () => {
        await refreshContext(false)
        void manualSyncTasks()
      },
      `user_id=eq.${context.userId}`
    )

    return () => {
      unsubHeartbeat()
      unsubTasks()
      unsubMember()
    }
  }, [context.userId, manualSyncTasks, refreshContext])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  const organizationName = context.organization?.name || 'MY RACHANA ERP'
  const organizationId = context.organization?.id || context.membership?.organizationId || ''
  const userFullName = context.profile?.fullName || context.email?.split('@')[0] || 'Member'
  const siteName = context.assignedSite ? context.assignedSite.name : 'Unassigned Site'
  const siteSubtitle = context.assignedSite ? `${context.assignedSite.name} (${context.assignedSite.code})` : 'Site Member'

  const getTaskIcon = (code: string) => {
    switch (code) {
      case 'DIESEL_REQUISITION':
        return Fuel
      case 'ITEM_MASTER':
        return Package
      case 'ASSET_MASTER':
        return Cpu
      case 'VENDOR_MASTER':
        return Building2
      default:
        return Layers
    }
  }

  // Sidebar navigation structure - EXACT same architecture as Admin!
  const navGroups: NavGroupData[] = [
    {
      items: [
        { id: 'dashboard', title: 'My Overview', icon: LayoutDashboard },
      ],
    },
    ...(assignedTasks.length > 0
      ? [
          {
            heading: 'Assigned Operations',
            items: assignedTasks.map((task) => ({
              id: task.code,
              title: task.name,
              icon: getTaskIcon(task.code),
            })),
          },
        ]
      : []),
    {
      heading: 'Site Security',
      items: [
        { id: 'profile', title: 'Site Lock & Identity', icon: MapPin },
      ],
    },
  ]

  const bottomItems: NavItemData[] = [
    { id: 'settings', title: 'Settings & Updates', icon: Settings },
    { id: 'logout', title: 'Log Out', icon: LogOut },
  ]

  const searchItems = [
    { id: 'dashboard', title: 'My Overview & Dashboard', category: 'Home' },
    ...assignedTasks.map((t) => ({
      id: t.code,
      title: t.name,
      category: 'Operations',
    })),
    { id: 'profile', title: 'Site Lock & Enterprise Identity', category: 'Security' },
    { id: 'settings', title: 'App Settings & Version Updates', category: 'System' },
  ]

  const getPageTitle = () => {
    if (activeModule === 'dashboard') return 'My Overview'
    if (activeModule === 'DIESEL_REQUISITION') return 'Diesel Requisition'
    if (activeModule === 'ITEM_MASTER') return 'Item Master'
    if (activeModule === 'ASSET_MASTER') return 'Asset Master'
    if (activeModule === 'VENDOR_MASTER') return 'Vendor Master'
    if (activeModule === 'profile') return 'Site Lock & Identity'
    if (activeModule === 'settings') return 'Settings & Updates'
    return 'Dashboard'
  }

  return (
    <UnifiedDashboardLayout
      organizationName={organizationName}
      subtitle={siteSubtitle}
      avatarChar={userFullName.charAt(0).toUpperCase()}
      userFullName={userFullName}
      userRole={context.role || 'Site Member'}
      pageTitle={getPageTitle()}
      activeModule={activeModule}
      onSelectModule={setActiveModule}
      onSignOut={handleSignOut}
      navGroups={navGroups}
      bottomItems={bottomItems}
      searchItems={searchItems}
    >
      {/* 1. Module: Diesel Requisition */}
      {activeModule === 'DIESEL_REQUISITION' ? (
        <div className="space-y-4">
          <DieselRequisitionView
            organizationId={organizationId}
            organizationName={organizationName}
          />
        </div>
      ) : activeModule === 'ITEM_MASTER' ? (
        /* 2. Module: Item Master */
        <div className="space-y-4">
          <ItemMasterView
            organizationId={organizationId}
            organizationName={organizationName}
          />
        </div>
      ) : activeModule === 'ASSET_MASTER' ? (
        /* 3. Module: Asset Master */
        <div className="space-y-4">
          <AssetMasterView
            organizationId={organizationId}
            organizationName={organizationName}
          />
        </div>
      ) : activeModule === 'VENDOR_MASTER' ? (
        /* 4. Module: Vendor Master */
        <div className="space-y-4">
          <VendorMasterView
            organizationId={organizationId}
            organizationName={organizationName}
          />
        </div>
      ) : activeModule === 'settings' ? (
        /* 5. Module: Settings */
        <AppSettingsView />
      ) : activeModule === 'profile' ? (
        /* 6. Module: Site Lock & Identity */
        <div className="w-full max-w-2xl mx-auto rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-6 text-left">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                <CheckCircle2 className="h-3.5 w-3.5" />
                VERIFIED ACTIVE
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-xs font-medium text-slate-500">{organizationName}</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Site Security & Enterprise Lock
            </h1>
            <p className="text-xs text-slate-500 leading-relaxed">
              Your account is isolated to your assigned civil work package under enterprise single-site security rules.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Account Identity:</span>
              <span className="font-semibold text-slate-900">{context.email}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Full Name:</span>
              <span className="font-semibold text-slate-900">{userFullName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Assigned Role:</span>
              <span className="font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
                {context.role || 'Member'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Operating Site:</span>
              <span className="font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                {context.assignedSite
                  ? `${context.assignedSite.name} (${context.assignedSite.code})`
                  : 'Unassigned'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Location:</span>
              <span className="font-medium text-slate-700">
                {context.assignedSite?.location || 'Operational Field Area'}
              </span>
            </div>
          </div>
        </div>
      ) : (
        /* 7. Default: My Overview (Clean Operational Dashboard) */
        <div className="space-y-6 text-left">
          {/* Quick Action Tiles (Clean Light Cards) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900">
                Quick Action Modules
              </h2>
              <span className="text-xs text-slate-400">
                Direct One-Tap Access
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
              {/* 1. Diesel Tile */}
              <button
                type="button"
                onClick={() => {
                  if (assignedTasks.some((t) => t.code === 'DIESEL_REQUISITION')) {
                    setActiveModule('DIESEL_REQUISITION')
                  }
                }}
                disabled={!assignedTasks.some((t) => t.code === 'DIESEL_REQUISITION')}
                className={`p-4 rounded-2xl border text-left transition-all flex flex-col justify-between h-32 cursor-pointer ${
                  assignedTasks.some((t) => t.code === 'DIESEL_REQUISITION')
                    ? 'bg-white border-amber-200 hover:border-amber-400 hover:shadow-sm shadow-2xs group'
                    : 'bg-slate-50/80 border-slate-200 opacity-50 cursor-not-allowed'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 group-hover:scale-105 transition-transform">
                    <Fuel className="h-5 w-5" />
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                    FUEL
                  </span>
                </div>
                <div>
                  <p className="font-bold text-sm text-slate-900 group-hover:text-amber-700 transition-colors">
                    Diesel Indent
                  </p>
                  <p className="text-[11px] text-slate-400">Bowsers & Slips</p>
                </div>
              </button>

              {/* 2. Item Master Tile */}
              <button
                type="button"
                onClick={() => {
                  if (assignedTasks.some((t) => t.code === 'ITEM_MASTER')) {
                    setActiveModule('ITEM_MASTER')
                  }
                }}
                disabled={!assignedTasks.some((t) => t.code === 'ITEM_MASTER')}
                className={`p-4 rounded-2xl border text-left transition-all flex flex-col justify-between h-32 cursor-pointer ${
                  assignedTasks.some((t) => t.code === 'ITEM_MASTER')
                    ? 'bg-white border-blue-200 hover:border-blue-400 hover:shadow-sm shadow-2xs group'
                    : 'bg-slate-50/80 border-slate-200 opacity-50 cursor-not-allowed'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 group-hover:scale-105 transition-transform">
                    <Package className="h-5 w-5" />
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                    STORE
                  </span>
                </div>
                <div>
                  <p className="font-bold text-sm text-slate-900 group-hover:text-blue-700 transition-colors">
                    Item Master
                  </p>
                  <p className="text-[11px] text-slate-400">Materials & Spares</p>
                </div>
              </button>

              {/* 3. Asset Master Tile */}
              <button
                type="button"
                onClick={() => {
                  if (assignedTasks.some((t) => t.code === 'ASSET_MASTER')) {
                    setActiveModule('ASSET_MASTER')
                  }
                }}
                disabled={!assignedTasks.some((t) => t.code === 'ASSET_MASTER')}
                className={`p-4 rounded-2xl border text-left transition-all flex flex-col justify-between h-32 cursor-pointer ${
                  assignedTasks.some((t) => t.code === 'ASSET_MASTER')
                    ? 'bg-white border-emerald-200 hover:border-emerald-400 hover:shadow-sm shadow-2xs group'
                    : 'bg-slate-50/80 border-slate-200 opacity-50 cursor-not-allowed'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 group-hover:scale-105 transition-transform">
                    <Cpu className="h-5 w-5" />
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    FLEET
                  </span>
                </div>
                <div>
                  <p className="font-bold text-sm text-slate-900 group-hover:text-emerald-700 transition-colors">
                    Asset Master
                  </p>
                  <p className="text-[11px] text-slate-400">Machinery & Plant</p>
                </div>
              </button>

              {/* 4. Vendor Master Tile */}
              <button
                type="button"
                onClick={() => {
                  if (assignedTasks.some((t) => t.code === 'VENDOR_MASTER')) {
                    setActiveModule('VENDOR_MASTER')
                  }
                }}
                disabled={!assignedTasks.some((t) => t.code === 'VENDOR_MASTER')}
                className={`p-4 rounded-2xl border text-left transition-all flex flex-col justify-between h-32 cursor-pointer ${
                  assignedTasks.some((t) => t.code === 'VENDOR_MASTER')
                    ? 'bg-white border-purple-200 hover:border-purple-400 hover:shadow-sm shadow-2xs group'
                    : 'bg-slate-50/80 border-slate-200 opacity-50 cursor-not-allowed'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="p-2.5 rounded-xl bg-purple-50 text-purple-600 border border-purple-200 group-hover:scale-105 transition-transform">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                    VENDORS
                  </span>
                </div>
                <div>
                  <p className="font-bold text-sm text-slate-900 group-hover:text-purple-700 transition-colors">
                    Vendor Master
                  </p>
                  <p className="text-[11px] text-slate-400">Suppliers & Hiring</p>
                </div>
              </button>
            </div>
          </div>

          {/* Assigned Operations List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span>Operational Responsibilities</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-50 border border-blue-200 text-blue-700">
                  {assignedTasks.length} Active
                </span>
              </h2>
            </div>

            {assignedTasks && assignedTasks.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {assignedTasks.map((task) => {
                  const isDiesel = task.code === 'DIESEL_REQUISITION'
                  const isItem = task.code === 'ITEM_MASTER'
                  const isAsset = task.code === 'ASSET_MASTER'
                  const isVendor = task.code === 'VENDOR_MASTER'

                  return (
                    <div
                      key={task.taskTypeId || task.code}
                      className="flex flex-col justify-between p-5 rounded-2xl border border-slate-200 bg-white hover:border-blue-300 hover:shadow-sm transition-all space-y-4 shadow-xs group"
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div
                              className={`p-2.5 rounded-xl border ${
                                isDiesel
                                  ? 'bg-amber-50 border-amber-200 text-amber-600'
                                  : isItem
                                  ? 'bg-blue-50 border-blue-200 text-blue-600'
                                  : isAsset
                                  ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
                                  : 'bg-purple-50 border-purple-200 text-purple-600'
                              }`}
                            >
                              {isDiesel ? (
                                <Fuel className="h-5 w-5" />
                              ) : isItem ? (
                                <Package className="h-5 w-5" />
                              ) : isAsset ? (
                                <Cpu className="h-5 w-5" />
                              ) : (
                                <Building2 className="h-5 w-5" />
                              )}
                            </div>
                            <div>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                {task.module || 'OPERATIONS'}
                              </span>
                              <h3 className="font-bold text-base text-slate-900 group-hover:text-blue-600 transition-colors">
                                {task.name}
                              </h3>
                            </div>
                          </div>
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                            {task.code}
                          </span>
                        </div>

                        <p className="text-xs text-slate-500 leading-relaxed">
                          {isDiesel
                            ? `Create diesel requisitions, approve bowser allocations, issue gate slips, and track fuel consumption at ${siteName}.`
                            : isItem
                            ? `Access and manage the centralized materials catalog, store inventory, and consumables.`
                            : isAsset
                            ? `Monitor and configure machinery, excavator units, tipper fleets, and construction equipment.`
                            : isVendor
                            ? `Directory of verified diesel suppliers, vehicle hiring vendors, and site contractors.`
                            : `Execute assigned field transactions and operational approvals.`}
                        </p>
                      </div>

                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-600">
                          {task.canInitiate && <span>• Initiate</span>}
                          {task.canExecute && <span>• Execute</span>}
                          {task.canApprove && <span className="text-amber-600">• Approve</span>}
                        </div>

                        <button
                          type="button"
                          onClick={() => setActiveModule(task.code)}
                          className="flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white transition-all cursor-pointer shadow-xs"
                        >
                          <span>Open Module</span>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              /* Clean Light Onboarding Box when awaiting tasks */
              <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 space-y-6 shadow-xs text-left">
                <div className="space-y-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 border border-emerald-200 text-emerald-700">
                    <CheckCircle2 className="h-4 w-4" />
                    Registration Approved & Site Locked
                  </span>
                  <h3 className="text-lg font-bold text-slate-900">
                    Awaiting Operational Task Allocation
                  </h3>
                  <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">
                    Your account has been verified by the administrator and locked to <strong className="text-slate-800">{siteName}</strong>. Your project manager will assign your site responsibilities (Diesel Indents, Store Management, etc.). Once assigned, they will appear here instantly.
                  </p>
                </div>

                {/* 3-Step Verification Timeline */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                  <div className="p-4 rounded-xl bg-slate-50 border border-emerald-200 space-y-1">
                    <div className="flex items-center gap-2 text-emerald-700 text-xs font-bold">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Step 1: Account Created</span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Credentials stored and security verified in database.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-emerald-200 space-y-1">
                    <div className="flex items-center gap-2 text-emerald-700 text-xs font-bold">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Step 2: Admin Site Lock</span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Bounded to <strong className="text-slate-700">{siteName}</strong> with single-site isolation.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-amber-200 space-y-1">
                    <div className="flex items-center gap-2 text-amber-700 text-xs font-bold">
                      <Clock className="h-4 w-4" />
                      <span>Step 3: Task Assignment</span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Admin is assigning your module responsibilities.
                    </p>
                  </div>
                </div>

                {/* Helpline Notice */}
                <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-100 text-blue-700 shrink-0">
                      <PhoneCall className="h-4 w-4" />
                    </div>
                    <div className="space-y-0.5">
                      <p className="font-bold text-slate-900">Need Immediate Site Access?</p>
                      <p className="text-slate-500 text-[11px]">
                        Contact your site administrator to allocate your modules.
                      </p>
                    </div>
                  </div>

                  <a
                    href="tel:7770002696"
                    className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors shrink-0"
                  >
                    <PhoneCall className="h-3.5 w-3.5" />
                    <span>Call Admin: 7770002696</span>
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </UnifiedDashboardLayout>
  )
}