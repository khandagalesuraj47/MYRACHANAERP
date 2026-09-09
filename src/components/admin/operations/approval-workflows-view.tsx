import React, { useState, useEffect, useCallback } from 'react'
import {
  Search,
  RefreshCw,
  ArrowRight,
} from 'lucide-react'
import type { WorkflowDefinition } from '../../../types/enterprise-erp'
import { OperationsRepository } from '../../../repositories/erp/operations-repository'

interface ApprovalWorkflowsViewProps {
  organizationId: string
}

export function ApprovalWorkflowsView({ organizationId }: ApprovalWorkflowsViewProps) {
  const [workflows, setWorkflows] = useState<WorkflowDefinition[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const loadData = useCallback(async () => {
    setLoading(true)
    const data = await OperationsRepository.getWorkflows(organizationId)
    setWorkflows(data)
    setLoading(false)
  }, [organizationId])

  useEffect(() => {
    let isMounted = true
    OperationsRepository.getWorkflows(organizationId).then((data) => {
      if (isMounted) {
        setWorkflows(data)
        setLoading(false)
      }
    })
    return () => {
      isMounted = false
    }
  }, [organizationId])

  const defaultWorkflows: WorkflowDefinition[] = [
    {
      id: 'wf-po',
      organizationId,
      code: 'WF-PURCHASE-01',
      name: 'Purchase Order Tiered Approval',
      module: 'PROCUREMENT',
      isActive: true,
      stages: [
        { id: 's1', workflowId: 'wf-po', stageOrder: 1, name: 'Site Supervisor Endorsement', approverRole: 'SITE_SUPERVISOR', minAmount: 0, maxAmount: 50000, slaHours: 12 },
        { id: 's2', workflowId: 'wf-po', stageOrder: 2, name: 'Project Manager Approval', approverRole: 'PROJECT_MANAGER', minAmount: 50000, maxAmount: 500000, slaHours: 24 },
        { id: 's3', workflowId: 'wf-po', stageOrder: 3, name: 'Executive Director / Admin Sign-off', approverRole: 'ADMIN', minAmount: 500000, maxAmount: null, slaHours: 48 },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'wf-dsl',
      organizationId,
      code: 'WF-DIESEL-01',
      name: 'Bulk Tanker Fuel Purchase Sign-off',
      module: 'FUEL',
      isActive: true,
      stages: [
        { id: 'd1', workflowId: 'wf-dsl', stageOrder: 1, name: 'Store Keeper Dip Verification', approverRole: 'STORE_KEEPER', minAmount: 0, maxAmount: 100000, slaHours: 4 },
        { id: 'd2', workflowId: 'wf-dsl', stageOrder: 2, name: 'Site In-Charge Financial Clearance', approverRole: 'ADMIN', minAmount: 100000, maxAmount: null, slaHours: 12 },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ]

  const displayList = workflows.length > 0 ? workflows : defaultWorkflows

  const filteredList = displayList.filter(
    (w) =>
      w.code.toLowerCase().includes(search.toLowerCase()) ||
      w.name.toLowerCase().includes(search.toLowerCase()) ||
      w.module.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6 text-left">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-rose-400 uppercase tracking-widest bg-rose-950/70 border border-rose-800/60 px-2 py-0.5 rounded">
              Governance & Delegation
            </span>
            <h1 className="text-xl font-bold text-white tracking-tight">
              Configurable Approval Workflows
            </h1>
          </div>
          <p className="text-xs text-slate-400">
            Tiered approval stages, monetary authorization thresholds, SLA timers, and automatic escalation rules.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={loadData}
            title="Refresh workflows"
            className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Sync</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex items-center gap-3 bg-slate-900/60 border border-slate-800 p-3 rounded-xl">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search workflows by Code, Name, or Module..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg bg-slate-950 border border-slate-800 pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:border-rose-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Workflows List */}
      <div className="space-y-4">
        {filteredList.map((wf) => (
          <div
            key={wf.id}
            className="rounded-xl border border-slate-800 bg-slate-950/70 p-5 space-y-4 hover:border-slate-700 transition-all text-xs"
          >
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="font-mono text-[10px] font-bold text-rose-400 bg-rose-950/80 border border-rose-800/80 px-2 py-0.5 rounded">
                  {wf.code}
                </span>
                <h4 className="text-sm font-bold text-white pt-1">{wf.name}</h4>
                <p className="text-[11px] text-slate-400 font-mono">Module: {wf.module}</p>
              </div>
              <span className="font-mono text-[10px] px-2 py-0.5 rounded border border-emerald-800/80 bg-emerald-950/60 text-emerald-300 font-semibold">
                ACTIVE
              </span>
            </div>

            {/* Visual Stage Progression Pipeline */}
            <div className="pt-3 border-t border-slate-800/80 space-y-2">
              <p className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                Multi-Level Approval Pipeline:
              </p>
              <div className="flex flex-wrap items-center gap-2">
                {(wf.stages || []).map((stage, idx) => (
                  <React.Fragment key={stage.id}>
                    <div className="rounded-lg border border-slate-800 bg-slate-900/90 p-3 space-y-1 min-w-[200px]">
                      <div className="flex items-center justify-between text-[10px] font-mono">
                        <span className="text-rose-400 font-bold">Stage {stage.stageOrder}</span>
                        <span className="text-slate-500">{stage.slaHours}h SLA</span>
                      </div>
                      <p className="font-semibold text-white">{stage.name}</p>
                      <p className="text-[11px] font-mono text-slate-400">
                        Approver: <span className="text-blue-400 font-medium">{stage.approverRole}</span>
                      </p>
                      <p className="text-[10px] font-mono text-emerald-400">
                        {stage.minAmount ? `> ₹${stage.minAmount.toLocaleString()}` : 'Base'}{' '}
                        {stage.maxAmount ? `to ₹${stage.maxAmount.toLocaleString()}` : 'and above'}
                      </p>
                    </div>
                    {idx < (wf.stages || []).length - 1 && (
                      <ArrowRight className="h-4 w-4 text-slate-600 shrink-0" />
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
