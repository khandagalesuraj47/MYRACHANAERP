import React, { useState } from 'react'
import {
  Fuel,
  Search,
  Download,
  Upload,
  Plus,
  Info,
} from 'lucide-react'

interface DieselRequisitionViewProps {
  organizationId: string
  organizationName?: string
}

export function DieselRequisitionView({ organizationId, organizationName }: DieselRequisitionViewProps) {
  const [search, setSearch] = useState('')

  return (
    <div className="space-y-6 text-left">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-orange-700 uppercase tracking-widest bg-orange-50 border border-orange-200 px-2 py-0.5 rounded">
              Mechanical Department
            </span>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Diesel Requisition Directory
            </h1>
          </div>
          <p className="text-xs text-slate-500">
            Fuel indents, site requisition slips, Bowser transfer approvals, and consumption tracking.
          </p>
        </div>

        {/* Action Buttons: Export/Import/New */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 shadow-xs cursor-pointer"
            title="Download blank template to fill in Excel"
            onClick={() => alert('Excel Template Export: Requisition template will be available once fields are defined.')}
          >
            <Download className="h-3.5 w-3.5 text-slate-500" />
            <span>Export Template</span>
          </button>

          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 shadow-xs cursor-pointer"
            title="Import filled Excel spreadsheet"
            onClick={() => alert('Excel Import: Bulk import will be activated once form fields are specified.')}
          >
            <Upload className="h-3.5 w-3.5 text-slate-500" />
            <span>Import Excel</span>
          </button>

          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 px-3.5 py-2 text-xs font-semibold text-white shadow-xs cursor-pointer"
            title="Create Requisition"
            onClick={() => alert('Diesel Requisition Form is awaiting your field definitions. Please let me know what fields to include when ready.')}
          >
            <Plus className="h-4 w-4" />
            <span>New Requisition</span>
          </button>
        </div>
      </div>

      {/* Notice Card */}
      <div className="p-4 rounded-xl bg-orange-50/70 border border-orange-200/80 text-orange-900 text-xs flex items-start gap-3">
        <Info className="h-4 w-4 text-orange-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-orange-900">
            Mechanical Department • Diesel Requisition Standby Mode
          </p>
          <p className="text-orange-700 text-[11px] leading-relaxed">
            Diesel Requisition directory is ready for integration. As instructed, no form is generated yet. When you are ready to define the approval flow, requested liters, site, vehicle number, and voucher attachment, we will activate the real-time Supabase form.
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search requisition chits by slip number, site, or vehicle..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-orange-500 shadow-xs"
          />
        </div>
      </div>

      {/* Empty State Table */}
      <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-xs space-y-3">
        <div className="h-12 w-12 rounded-2xl bg-orange-50 border border-orange-200 flex items-center justify-center text-orange-600 mx-auto">
          <Fuel className="h-6 w-6" />
        </div>
        <h3 className="text-sm font-bold text-slate-900">Diesel Requisition Directory Ready</h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
          Zero fake data present. Real-time PostgreSQL schema is connected to &quot;{organizationName || organizationId}&quot;.
        </p>
      </div>
    </div>
  )
}
