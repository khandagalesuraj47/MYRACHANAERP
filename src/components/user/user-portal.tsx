import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2, User, LogOut, CheckCircle2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { UserContextResult } from '../../repositories/auth-context-repository'

interface UserPortalProps {
  context: UserContextResult
}

export function UserPortal({ context }: UserPortalProps) {
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  const organizationName = context.organization?.name || 'Organization Workspace'
  const userFullName = context.profile?.fullName || context.email?.split('@')[0] || 'Member'

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans antialiased select-none">
      {/* Top Header */}
      <header className="flex h-16 w-full items-center justify-between border-b border-slate-800 bg-slate-950/90 px-6 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <span className="font-mono text-[10px] font-bold tracking-widest text-blue-400 uppercase bg-blue-950/80 border border-blue-800/60 px-2 py-0.5 rounded">
            USER PORTAL
          </span>
          <span className="text-sm font-extrabold text-white">MY RACHANA ERP</span>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 rounded-lg bg-slate-900 border border-slate-800 px-3 py-1.5 text-xs text-slate-300">
            <User className="h-3.5 w-3.5 text-blue-400" />
            <span className="font-medium">{userFullName}</span>
          </div>

          <button
            type="button"
            onClick={handleSignOut}
            className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-medium text-rose-400 hover:bg-rose-950/40 hover:text-rose-300 transition-colors cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-xl rounded-2xl border border-slate-800 bg-slate-900/60 p-8 shadow-2xl space-y-6 text-left">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-400 bg-emerald-950/80 border border-emerald-800/60 px-2.5 py-0.5 rounded-full">
                <CheckCircle2 className="h-3 w-3" />
                ACTIVE MEMBER
              </span>
              <span className="text-slate-600">•</span>
              <span className="inline-flex items-center gap-1 text-[11px] font-mono text-slate-400">
                <Building2 className="h-3 w-3 text-slate-500" />
                {organizationName}
              </span>
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-white">
              Welcome, {userFullName}
            </h1>
            <p className="text-xs text-slate-400 leading-relaxed">
              You are signed in to the operations workspace for <strong className="text-slate-200">{organizationName}</strong>. Assigned operational modules and task workflows will be made accessible here by your organization administrator.
            </p>
          </div>

          {/* Account Details Box */}
          <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-2.5 text-xs font-mono">
            <div className="text-slate-400 flex items-center justify-between">
              <span>Account Identity:</span>
              <span className="text-white font-medium">{context.email}</span>
            </div>
            <div className="text-slate-400 flex items-center justify-between">
              <span>Access Role:</span>
              <span className="text-blue-400 font-semibold">{context.role}</span>
            </div>
            <div className="text-slate-400 flex items-center justify-between">
              <span>Assigned Site:</span>
              <span className="text-amber-400 font-semibold">
                {context.assignedSite ? `${context.assignedSite.name} (${context.assignedSite.code})` : 'Unassigned'}
              </span>
            </div>
            <div className="text-slate-400 flex items-center justify-between">
              <span>Site Access Scope:</span>
              <span className="text-emerald-400 font-semibold">Strict Single-Site Lock (Other Sites Blocked)</span>
            </div>
            <div className="text-slate-400 flex items-center justify-between">
              <span>Tenant Status:</span>
              <span className="text-emerald-400 font-semibold">Verified & Active</span>
            </div>
          </div>

          {/* TBAC: My Operational Responsibilities */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-emerald-400">
                My Operational Tasks (TBAC)
              </h3>
              <span className="text-[11px] font-mono text-slate-400">
                {context.assignedTasks?.length || 0} active
              </span>
            </div>

            {context.assignedTasks && context.assignedTasks.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {context.assignedTasks.map((task) => (
                  <div
                    key={task.taskTypeId || task.code}
                    className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/80 hover:border-blue-500/50 hover:bg-slate-900/60 transition-all space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-white truncate">
                        {task.name}
                      </span>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-blue-950/80 border border-blue-800/80 text-blue-300 uppercase">
                        {task.module}
                      </span>
                    </div>
                    <p className="text-[11px] font-mono text-slate-400">
                      Code: {task.code}
                    </p>
                    <div className="flex items-center gap-2 pt-1 text-[10px] font-mono text-emerald-400">
                      {task.canInitiate && <span>• Can Initiate</span>}
                      {task.canExecute && <span>• Can Execute</span>}
                      {task.canApprove && <span className="text-amber-400">• Can Approve</span>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-slate-800/80 bg-slate-950/50 p-6 text-center space-y-1">
                <p className="text-xs font-medium text-slate-300">
                  No Operational Responsibilities Assigned
                </p>
                <p className="text-[11px] text-slate-500">
                  Your administrator has not yet assigned any specific operational duties (e.g. Diesel Issue, Material Receipt). Please contact your site manager.
                </p>
              </div>
            )}
          </div>

          {/* Notice box */}
          <div className="p-3.5 rounded-lg bg-blue-950/30 border border-blue-900/40 text-blue-300 text-xs leading-relaxed">
            <span className="font-semibold">Standard User Portal Notice:</span>
            <p className="mt-0.5 text-slate-400 text-[11px]">
              Administrative configuration and organization-level governance tools are restricted to organization administrators. If you require administrator privileges, please contact your account manager.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}