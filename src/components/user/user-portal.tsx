import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Building2,
  User,
  LogOut,
  CheckCircle2,
  Radio,
  Layers,
  Settings,
  Fuel,
  Package,
  Cpu,
  ArrowLeft,
  ShieldCheck,
  MapPin,
  ChevronRight,
  PhoneCall,
  RefreshCw,
  Clock,
  Sparkles,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { UserContextResult } from '../../repositories/auth-context-repository'
import type { UserTaskAssignment } from '../../types/rbac'
import { AppSettingsView } from '../common/app-settings-view'
import { DieselRequisitionView } from '../admin/mechanical/diesel-requisition-view'
import { ItemMasterView } from '../admin/mechanical/item-master-view'
import { AssetMasterView } from '../admin/mechanical/asset-master-view'
import { VendorMasterView } from '../admin/mechanical/vendor-master-view'
import { useAuth } from '../../context/auth-context'

interface UserPortalProps {
  context: UserContextResult
}

type UserPortalTab = 'TASKS' | 'PROFILE' | 'SETTINGS'

export function UserPortal({ context }: UserPortalProps) {
  const navigate = useNavigate()
  const { refreshContext } = useAuth()
  const [currentTab, setCurrentTab] = useState<UserPortalTab>('TASKS')
  const [activeTaskCode, setActiveTaskCode] = useState<string | null>(null)
  const [liveTasksOverride, setLiveTasksOverride] = useState<UserTaskAssignment[] | null>(null)
  const [isLiveConnected, setIsLiveConnected] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)

  const ALLOWED_CORE_TASKS = ['ITEM_MASTER', 'ASSET_MASTER', 'VENDOR_MASTER', 'DIESEL_REQUISITION']
  const assignedTasks = (liveTasksOverride ?? context.assignedTasks ?? []).filter(
    (t) => !t.code || ALLOWED_CORE_TASKS.includes(t.code)
  )

  const manualSyncTasks = async () => {
    if (!context.userId) return
    setIsSyncing(true)
    try {
      await refreshContext()
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
      console.error('[UserPortal] manualSyncTasks error:', err)
    } finally {
      setIsSyncing(false)
    }
  }

  // Real-time Supabase subscriptions on user_task_assignments AND organization_members
  useEffect(() => {
    if (!context.userId) return

    const channelName = `user-portal-live-${context.userId}`
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_task_assignments',
          filter: `user_id=eq.${context.userId}`,
        },
        async () => {
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
            console.error('[UserPortal] Realtime tasks sync error:', err)
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'organization_members',
          filter: `user_id=eq.${context.userId}`,
        },
        async () => {
          // If membership details (site, role, is_active) change, refresh context
          await refreshContext()
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsLiveConnected(true)
        }
      })

    return () => {
      channel.unsubscribe()
    }
  }, [context.userId, refreshContext])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  const organizationName = context.organization?.name || 'MY RACHANA ERP'
  const organizationId = context.organization?.id || context.membership?.organizationId || ''
  const userFullName = context.profile?.fullName || context.email?.split('@')[0] || 'Member'

  const getTaskIcon = (code: string) => {
    switch (code) {
      case 'DIESEL_REQUISITION':
        return <Fuel className="h-5 w-5 text-amber-400" />
      case 'ITEM_MASTER':
        return <Package className="h-5 w-5 text-blue-400" />
      case 'ASSET_MASTER':
        return <Cpu className="h-5 w-5 text-emerald-400" />
      case 'VENDOR_MASTER':
        return <Building2 className="h-5 w-5 text-purple-400" />
      default:
        return <Layers className="h-5 w-5 text-blue-400" />
    }
  }

  return (
    <div className="min-h-[100dvh] w-full max-w-[100vw] overflow-x-hidden bg-slate-950 text-slate-100 flex flex-col font-sans antialiased select-none">
      {/* Top Header */}
      <header className="sticky top-0 z-30 flex h-14 sm:h-16 w-full items-center justify-between border-b border-slate-800 bg-slate-950/90 px-3 sm:px-6 backdrop-blur-md">
        <div className="flex items-center gap-2 sm:gap-3">
          {activeTaskCode ? (
            <button
              type="button"
              onClick={() => setActiveTaskCode(null)}
              className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-slate-300 hover:text-white cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back</span>
            </button>
          ) : (
            <span className="font-mono text-[10px] font-bold tracking-widest text-blue-400 uppercase bg-blue-950/80 border border-blue-800/60 px-2 py-0.5 rounded">
              OPERATIONS
            </span>
          )}
          <span className="text-xs sm:text-sm font-extrabold text-white truncate max-w-[150px] sm:max-w-none">
            {activeTaskCode
              ? assignedTasks.find((t) => t.code === activeTaskCode)?.name || 'Operational Task'
              : 'MY RACHANA ERP'}
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {isLiveConnected && (
            <span className="hidden sm:inline-flex items-center gap-1 font-mono text-[10px] text-emerald-400 bg-emerald-950/80 border border-emerald-800 px-2 py-0.5 rounded-full">
              <Radio className="h-2.5 w-2.5 animate-pulse" />
              LIVE SYNC
            </span>
          )}

          <div className="hidden md:flex items-center gap-2 rounded-lg bg-slate-900 border border-slate-800 px-3 py-1.5 text-xs text-slate-300">
            <User className="h-3.5 w-3.5 text-blue-400" />
            <span className="font-medium">{userFullName}</span>
          </div>

          <button
            type="button"
            onClick={handleSignOut}
            className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-rose-400 hover:bg-rose-950/40 hover:text-rose-300 transition-colors cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </header>

      {/* Navigation Sub-bar (Visible on desktop when not actively inside an operational module) */}
      {!activeTaskCode && (
        <div className="hidden md:flex border-b border-slate-800/80 bg-slate-900/50 px-3 sm:px-6 py-2 items-center justify-between gap-2 overflow-x-auto">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={() => setCurrentTab('TASKS')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                currentTab === 'TASKS'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              <span>My Tasks</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-950 text-blue-300">
                {assignedTasks.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setCurrentTab('PROFILE')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                currentTab === 'PROFILE'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <MapPin className="h-3.5 w-3.5" />
              <span>Site Lock</span>
            </button>

            <button
              type="button"
              onClick={() => setCurrentTab('SETTINGS')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                currentTab === 'SETTINGS'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Settings className="h-3.5 w-3.5" />
              <span>Settings & Updates</span>
            </button>
          </div>

          <span className="hidden sm:block text-[11px] font-mono text-slate-400 truncate">
            {context.assignedSite ? context.assignedSite.name : organizationName}
          </span>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 w-full p-3 sm:p-6 overflow-y-auto pb-24 md:pb-6">
        {activeTaskCode === 'DIESEL_REQUISITION' ? (
          <div className="max-w-7xl mx-auto space-y-4">
            <DieselRequisitionView
              organizationId={organizationId}
              organizationName={organizationName}
            />
          </div>
        ) : activeTaskCode === 'ITEM_MASTER' ? (
          <div className="max-w-7xl mx-auto space-y-4">
            <ItemMasterView
              organizationId={organizationId}
              organizationName={organizationName}
            />
          </div>
        ) : activeTaskCode === 'ASSET_MASTER' ? (
          <div className="max-w-7xl mx-auto space-y-4">
            <AssetMasterView
              organizationId={organizationId}
              organizationName={organizationName}
            />
          </div>
        ) : activeTaskCode === 'VENDOR_MASTER' ? (
          <div className="max-w-7xl mx-auto space-y-4">
            <VendorMasterView
              organizationId={organizationId}
              organizationName={organizationName}
            />
          </div>
        ) : currentTab === 'SETTINGS' ? (
          <AppSettingsView />
        ) : currentTab === 'PROFILE' ? (
          <div className="w-full max-w-xl mx-auto rounded-2xl border border-slate-800 bg-slate-900/60 p-5 sm:p-8 shadow-2xl space-y-6 text-left">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-400 bg-emerald-950/80 border border-emerald-800/60 px-2.5 py-0.5 rounded-full">
                  <CheckCircle2 className="h-3 w-3" />
                  AUTHENTICATED
                </span>
                <span className="text-slate-600">•</span>
                <span className="inline-flex items-center gap-1 text-[11px] font-mono text-slate-400">
                  <Building2 className="h-3 w-3 text-slate-500" />
                  {organizationName}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                Site Security & Identity Lock
              </h1>
              <p className="text-xs text-slate-400 leading-relaxed">
                Your account is bounded to a mandatory operational site under enterprise single-site security rules.
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-2.5 text-xs font-mono">
              <div className="text-slate-400 flex items-center justify-between">
                <span>Account Identity:</span>
                <span className="text-white font-medium">{context.email}</span>
              </div>
              <div className="text-slate-400 flex items-center justify-between">
                <span>Full Name:</span>
                <span className="text-slate-200 font-medium">{userFullName}</span>
              </div>
              <div className="text-slate-400 flex items-center justify-between">
                <span>Access Role:</span>
                <span className="text-blue-400 font-semibold">{context.role}</span>
              </div>
              <div className="text-slate-400 flex items-center justify-between">
                <span>Assigned Site:</span>
                <span className="text-amber-400 font-semibold">
                  {context.assignedSite
                    ? `${context.assignedSite.name} (${context.assignedSite.code})`
                    : 'Unassigned'}
                </span>
              </div>
              <div className="text-slate-400 flex items-center justify-between">
                <span>Site Access Scope:</span>
                <span className="text-emerald-400 font-semibold">Strict Single-Site Lock</span>
              </div>
            </div>
          </div>
        ) : (
          /* TAB: TASKS (User-Wise Dedicated Operational Dashboard) */
          <div className="w-full max-w-5xl mx-auto space-y-6 text-left">
            {/* 1. Welcome & Site Hero Banner */}
            <div className="rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900/90 to-slate-950 p-5 sm:p-7 shadow-2xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-400 bg-emerald-950/80 border border-emerald-800/60 px-2.5 py-0.5 rounded-full font-bold">
                      <ShieldCheck className="h-3 w-3" />
                      AUTHORIZED PERSONNEL
                    </span>
                    <span className="text-slate-600">•</span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-mono text-amber-400 bg-amber-950/60 border border-amber-800/50 px-2.5 py-0.5 rounded-full">
                      <MapPin className="h-3 w-3" />
                      {context.assignedSite ? `${context.assignedSite.name} (${context.assignedSite.code})` : 'Strict Site Lock'}
                    </span>
                  </div>
                  <h1 className="text-xl sm:text-3xl font-extrabold tracking-tight text-white">
                    Welcome, {userFullName}
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-2xl">
                    Operational Control Center for <strong className="text-slate-200">{context.assignedSite?.name || organizationName}</strong>. All site actions and logs are synced in real time to the centralized database.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={manualSyncTasks}
                  disabled={isSyncing}
                  className="flex items-center gap-2 self-start sm:self-center px-4 py-2 rounded-xl bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700 text-xs font-semibold text-slate-200 hover:text-white transition-all cursor-pointer shadow-md disabled:opacity-50"
                >
                  <RefreshCw className={`h-3.5 w-3.5 text-blue-400 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>{isSyncing ? 'Syncing...' : 'Sync Permissions'}</span>
                </button>
              </div>

              {/* 2. Key Operational Metrics Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-1">
                  <div className="flex items-center justify-between text-slate-400 text-xs">
                    <span>Operating Site</span>
                    <MapPin className="h-3.5 w-3.5 text-amber-400" />
                  </div>
                  <p className="text-sm font-bold text-white truncate">
                    {context.assignedSite ? context.assignedSite.name : 'Unassigned'}
                  </p>
                  <span className="text-[10px] font-mono text-amber-400/90 block truncate">
                    {context.assignedSite?.location || 'Single-Site Lock Active'}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-1">
                  <div className="flex items-center justify-between text-slate-400 text-xs">
                    <span>Real-time Connection</span>
                    <Radio className="h-3.5 w-3.5 text-emerald-400 animate-pulse" />
                  </div>
                  <p className="text-sm font-bold text-emerald-400">
                    Live Sync Active
                  </p>
                  <span className="text-[10px] font-mono text-slate-400 block">
                    Instant TBAC updates
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-1">
                  <div className="flex items-center justify-between text-slate-400 text-xs">
                    <span>Assigned Modules</span>
                    <Layers className="h-3.5 w-3.5 text-blue-400" />
                  </div>
                  <p className="text-sm font-bold text-white">
                    {assignedTasks.length} Active Responsibilities
                  </p>
                  <span className="text-[10px] font-mono text-blue-400/90 block">
                    {assignedTasks.length > 0 ? 'Full operational scope' : 'Awaiting admin allocation'}
                  </span>
                </div>
              </div>
            </div>

            {/* 3. Operational Responsibilities Grid */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
                <div className="space-y-0.5">
                  <h2 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>Assigned Operational Responsibilities</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-950 border border-blue-800 text-blue-400">
                      {assignedTasks.length} Active
                    </span>
                  </h2>
                  <p className="text-xs text-slate-400">
                    Select a module below to execute and manage field operations.
                  </p>
                </div>
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
                        className="flex flex-col justify-between p-5 rounded-2xl border border-slate-800 bg-slate-900/60 hover:border-blue-500/70 hover:bg-slate-900/90 transition-all space-y-4 shadow-xl group"
                      >
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div
                                className={`p-3 rounded-xl border ${
                                  isDiesel
                                    ? 'bg-amber-950/60 border-amber-800/80 text-amber-400'
                                    : isItem
                                    ? 'bg-blue-950/60 border-blue-800/80 text-blue-400'
                                    : isAsset
                                    ? 'bg-emerald-950/60 border-emerald-800/80 text-emerald-400'
                                    : 'bg-purple-950/60 border-purple-800/80 text-purple-400'
                                }`}
                              >
                                {getTaskIcon(task.code)}
                              </div>
                              <div>
                                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                                  {task.module || 'OPERATIONS'}
                                </span>
                                <h3 className="font-extrabold text-base text-white group-hover:text-blue-400 transition-colors">
                                  {task.name}
                                </h3>
                              </div>
                            </div>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300">
                              {task.code}
                            </span>
                          </div>

                          <p className="text-xs text-slate-400 leading-relaxed">
                            {isDiesel
                              ? `Create diesel requisitions, approve bowser allocations, issue gate slips, and track fuel consumption at ${context.assignedSite?.name || 'your site'}.`
                              : isItem
                              ? `Access and manage the centralized materials catalog, store inventory, and consumables.`
                              : isAsset
                              ? `Monitor and configure machinery, excavator units, tipper fleets, and construction equipment.`
                              : isVendor
                              ? `Directory of verified diesel suppliers, vehicle hiring vendors, and site contractors.`
                              : `Execute assigned field transactions and operational approvals.`}
                          </p>
                        </div>

                        <div className="pt-3 border-t border-slate-800/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-2 text-[10px] font-mono text-emerald-400">
                            {task.canInitiate && <span>• Initiate</span>}
                            {task.canExecute && <span>• Execute</span>}
                            {task.canApprove && <span className="text-amber-400">• Approve</span>}
                          </div>

                          <button
                            type="button"
                            onClick={() => setActiveTaskCode(task.code)}
                            className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white transition-all cursor-pointer shadow-md shadow-blue-600/20 group-hover:scale-[1.02]"
                          >
                            <span>Open Module</span>
                            <ChevronRight className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                /* Onboarding State: When user is approved & site-locked but awaiting tasks in TBAC Matrix */
                <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 sm:p-8 space-y-6 shadow-xl text-left">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-950 border border-emerald-700 text-emerald-400">
                          <CheckCircle2 className="h-4 w-4" />
                          Registration Approved & Site Assigned
                        </span>
                      </div>
                      <h3 className="text-lg sm:text-xl font-bold text-white">
                        Awaiting Task Assignment in TBAC Matrix
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-400 max-w-2xl leading-relaxed">
                        Your account has been officially approved by the administrator and locked to <strong className="text-amber-400">{context.assignedSite?.name || 'your site'}</strong>. Your company administrator is now assigning your operational tasks (such as Diesel Requisition, Store Management, etc.) from the Admin Task Matrix.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={manualSyncTasks}
                      disabled={isSyncing}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white transition-all cursor-pointer shadow-lg shadow-blue-600/20 shrink-0"
                    >
                      <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                      <span>{isSyncing ? 'Checking...' : 'Check For Assigned Tasks'}</span>
                    </button>
                  </div>

                  {/* 3-Step Verification Timeline */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                    <div className="p-4 rounded-xl bg-slate-950/80 border border-emerald-800/40 space-y-1.5">
                      <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold font-mono">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Step 1: Account Created</span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Self-registration credentials and password successfully stored in Supabase.
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-950/80 border border-emerald-800/40 space-y-1.5">
                      <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold font-mono">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Step 2: Admin Site Lock</span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Assigned to <strong className="text-amber-300">{context.assignedSite?.name || 'Operating Site'}</strong> with strict single-site data isolation.
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-950/80 border border-amber-800/50 space-y-1.5">
                      <div className="flex items-center gap-2 text-amber-400 text-xs font-bold font-mono">
                        <Clock className="h-4 w-4 animate-pulse" />
                        <span>Step 3: Task Assignment</span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Admin will tick your operational modules in TBAC Task Matrix. Once ticked, they appear here instantly.
                      </p>
                    </div>
                  </div>

                  {/* Admin Helpline Notice */}
                  <div className="p-4 rounded-xl bg-blue-950/30 border border-blue-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-blue-900/60 text-blue-400 shrink-0">
                        <PhoneCall className="h-4 w-4" />
                      </div>
                      <div className="space-y-0.5">
                        <p className="font-bold text-white">Need Immediate Operational Access?</p>
                        <p className="text-slate-400 text-[11px]">
                          Contact your administrator or site manager to allocate your tasks.
                        </p>
                      </div>
                    </div>

                    <a
                      href="tel:7770002696"
                      className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-blue-600/90 hover:bg-blue-600 text-white font-bold text-xs transition-colors shrink-0"
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
      </main>

      {/* Material 3 Mobile Bottom Navigation */}
      {!activeTaskCode && (
        <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-slate-950/95 backdrop-blur-xl border-t border-slate-800/80 px-4 py-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-2xl flex items-center justify-around">
          <button
            type="button"
            onClick={() => {
              if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10)
              setCurrentTab('TASKS')
            }}
            className={`relative flex flex-col items-center justify-center py-1 px-3 min-w-[72px] rounded-2xl transition-all cursor-pointer ${
              currentTab === 'TASKS'
                ? 'text-blue-400 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {currentTab === 'TASKS' && (
              <span className="absolute inset-0 bg-blue-500/15 rounded-2xl -z-10" />
            )}
            <div className="relative">
              <Layers className={`h-5 w-5 transition-transform ${currentTab === 'TASKS' ? 'scale-110' : ''}`} />
              {assignedTasks.length > 0 && (
                <span className="absolute -top-1.5 -right-2 px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-blue-600 text-white shadow-sm">
                  {assignedTasks.length}
                </span>
              )}
            </div>
            <span className="text-[11px] font-medium tracking-tight mt-1">My Tasks</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10)
              setCurrentTab('PROFILE')
            }}
            className={`relative flex flex-col items-center justify-center py-1 px-3 min-w-[72px] rounded-2xl transition-all cursor-pointer ${
              currentTab === 'PROFILE'
                ? 'text-blue-400 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {currentTab === 'PROFILE' && (
              <span className="absolute inset-0 bg-blue-500/15 rounded-2xl -z-10" />
            )}
            <MapPin className={`h-5 w-5 transition-transform ${currentTab === 'PROFILE' ? 'scale-110' : ''}`} />
            <span className="text-[11px] font-medium tracking-tight mt-1">Site Lock</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10)
              setCurrentTab('SETTINGS')
            }}
            className={`relative flex flex-col items-center justify-center py-1 px-3 min-w-[72px] rounded-2xl transition-all cursor-pointer ${
              currentTab === 'SETTINGS'
                ? 'text-blue-400 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {currentTab === 'SETTINGS' && (
              <span className="absolute inset-0 bg-blue-500/15 rounded-2xl -z-10" />
            )}
            <Settings className={`h-5 w-5 transition-transform ${currentTab === 'SETTINGS' ? 'scale-110' : ''}`} />
            <span className="text-[11px] font-medium tracking-tight mt-1">Settings</span>
          </button>
        </nav>
      )}
    </div>
  )
}