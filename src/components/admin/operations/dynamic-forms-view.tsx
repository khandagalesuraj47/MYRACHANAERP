import React, { useState, useEffect, useCallback } from 'react'
import {
  Search,
  RefreshCw,
  SlidersHorizontal,
} from 'lucide-react'
import type { DynamicForm } from '../../../types/enterprise-erp'
import { OperationsRepository } from '../../../repositories/erp/operations-repository'

interface DynamicFormsViewProps {
  organizationId: string
}

export function DynamicFormsView({ organizationId }: DynamicFormsViewProps) {
  const [forms, setForms] = useState<DynamicForm[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const loadData = useCallback(async () => {
    setLoading(true)
    const data = await OperationsRepository.getForms(organizationId)
    setForms(data)
    setLoading(false)
  }, [organizationId])

  useEffect(() => {
    let isMounted = true
    OperationsRepository.getForms(organizationId).then((data) => {
      if (isMounted) {
        setForms(data)
        setLoading(false)
      }
    })
    return () => {
      isMounted = false
    }
  }, [organizationId])

  const defaultTemplates = [
    { code: 'FORM-DSL-01', name: 'Field Diesel Dispensing Log', module: 'FUEL', version: 1, fields: 6 },
    { code: 'FORM-GRN-01', name: 'Material Good Receipt Note (GRN)', module: 'INVENTORY', version: 1, fields: 7 },
    { code: 'FORM-PO-01', name: 'Emergency Site Purchase Indent', module: 'PROCUREMENT', version: 1, fields: 5 },
    { code: 'FORM-MNT-01', name: 'Equipment Breakdown Service Report', module: 'FLEET', version: 2, fields: 8 },
  ]

  const displayForms = forms.length > 0 ? forms : defaultTemplates.map((t, idx) => ({
    id: `template-${idx}`,
    organizationId,
    code: t.code,
    name: t.name,
    module: t.module,
    status: 'PUBLISHED' as const,
    currentVersion: t.version,
    isActive: true,
    fields: Array(t.fields).fill(null),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }))

  const filteredForms = displayForms.filter(
    (f) =>
      f.code.toLowerCase().includes(search.toLowerCase()) ||
      f.name.toLowerCase().includes(search.toLowerCase()) ||
      f.module.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6 text-left">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-teal-400 uppercase tracking-widest bg-teal-950/70 border border-teal-800/60 px-2 py-0.5 rounded">
              Configuration Engine
            </span>
            <h1 className="text-xl font-bold text-white tracking-tight">
              Dynamic Forms & Versioning
            </h1>
          </div>
          <p className="text-xs text-slate-400">
            Configure dynamic field entry forms, validation rules, custom input schemas, and field versions.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={loadData}
            title="Refresh forms"
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
            placeholder="Search forms by Code, Name, or Module..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg bg-slate-950 border border-slate-800 pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:border-teal-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Forms Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {filteredForms.map((form) => (
          <div
            key={form.id}
            className="rounded-xl border border-slate-800 bg-slate-950/70 p-5 space-y-4 hover:border-slate-700 transition-all text-xs"
          >
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <span className="font-mono text-[10px] font-bold text-teal-400 bg-teal-950/80 border border-teal-800/80 px-2 py-0.5 rounded">
                  {form.code}
                </span>
                <h4 className="text-sm font-bold text-white pt-1">{form.name}</h4>
                <p className="text-[11px] text-slate-400 font-mono">Module: {form.module}</p>
              </div>
              <span className="font-mono text-[10px] px-2 py-0.5 rounded border border-emerald-800/80 bg-emerald-950/60 text-emerald-300 font-semibold">
                v{form.currentVersion} • PUBLISHED
              </span>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-800/80 text-[11px] font-mono text-slate-400">
              <div className="flex items-center gap-1.5">
                <SlidersHorizontal className="h-3.5 w-3.5 text-teal-400" />
                <span>{form.fields?.length || 5} Configured Fields</span>
              </div>
              <span className="text-slate-500">Immutable Snapshot</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
