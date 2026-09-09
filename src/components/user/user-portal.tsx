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

  const ALLOWED_CORE_TASKS = ['ITEM_MASTER', 'ASSET_MASTER', 'VENDOR_MASTER', 'DIESEL_REQUISITION']
  const assignedTasks = (liveTasksOverride ?? context.assignedTasks ?? []).filter(
    (t) => !t.code || ALLOWED_CORE_TASKS.includes(t.code)
  )

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

      {/* Navigation Sub-bar (Visible when not actively inside an operational module) */}
      {!activeTaskCode && (
        <div className="border-b border-slate-800/80 bg-slate-900/50 px-3 sm:px-6 py-2 flex items-center justify-between gap-2 overflow-x-auto">
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
      <main className="flex-1 w-full p-3 sm:p-6 overflow-y-auto">
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
          /* TAB: TASKS */
          <div className="w-full max-w-4xl mx-auto space-y-6 text-left">
            {/* Welcome banner */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 sm:p-8 shadow-2xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-400 bg-emerald-950/80 border border-emerald-800/60 px-2.5 py-0.5 rounded-full">
                      <ShieldCheck className="h-3 w-3" />
                      AUTHORIZED
                    </span>
                    <span className="text-slate-600">•</span>
                    <span className="font-mono text-xs text-amber-400">
                      {context.assignedSite ? context.assignedSite.name : 'Site Lock Active'}
                    </span>
                  </div>
                  <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                    Welcome, {userFullName}
                  </h1>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Select any assigned operational responsibility below to execute transactions for <strong className="text-slate-200">{context.assignedSite?.name || organizationName}</strong>.
                  </p>
                </div>
              </div>

              {/* Tasks Grid */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                  <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-400">
                    Assigned Operational Responsibilities ({assignedTasks.length})
                  </h2>
                  <span className="text-[11px] font-mono text-slate-400">
                    Tap to Launch
                  </span>
                </div>

                {assignedTasks && assignedTasks.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {assignedTasks.map((task) => (
                      <button
                        type="button"
                        key={task.taskTypeId || task.code}
                        onClick={() => setActiveTaskCode(task.code)}
                        className="flex flex-col text-left p-4 rounded-xl border border-slate-800 bg-slate-950/90 hover:border-blue-500 hover:bg-slate-900 transition-all space-y-3 group cursor-pointer shadow-lg"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 group-hover:border-blue-500/50">
                              {getTaskIcon(task.code)}
                            </div>
                            <div>
                              <h3 className="font-bold text-sm text-white group-hover:text-blue-400 transition-colors">
                                {task.name}
                              </h3>
                              <span className="text-[10px] font-mono text-slate-400">
                                Code: {task.code}
                              </span>
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-slate-500 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all" />
                        </div>

                        <div className="flex items-center gap-2 pt-2 border-t border-slate-800/60 text-[10px] font-mono text-emerald-400">
                          {task.canInitiate && <span>• Initiate</span>}
                          {task.canExecute && <span>• Execute</span>}
                          {task.canApprove && <span className="text-amber-400">• Approve</span>}
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-slate-800/80 bg-slate-950/50 p-8 text-center space-y-2">
                    <p className="text-sm font-semibold text-slate-200">
                      No Operational Responsibilities Assigned
                    </p>
                    <p className="text-xs text-slate-400 max-w-md mx-auto">
                      Your administrator has authorized your account but not yet assigned specific tasks. Please contact your site manager or company administrator.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}