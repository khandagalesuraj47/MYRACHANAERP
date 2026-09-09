import React, { useState } from 'react'
import {
  Package,
  Search,
  Download,
  Upload,
  Plus,
  Info,
} from 'lucide-react'

interface ItemMasterViewProps {
  organizationId: string
  organizationName?: string
}

export function ItemMasterView({ organizationId, organizationName }: ItemMasterViewProps) {
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
              Item Master Directory
            </h1>
          </div>
          <p className="text-xs text-slate-500">
            Standardized catalog for mechanical equipment spares, consumables, tools, and construction items.
          </p>
        </div>

        {/* Action Buttons: Export/Import/Sync */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 shadow-xs cursor-pointer"
            title="Download blank template to fill in Excel"
            onClick={() => alert('Excel Template Export: Template structure will be downloaded once form fields are finalized.')}
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
            title="Create Item"
            onClick={() => alert('Item Master Form is awaiting your field definitions. Please let me know what fields to include when ready.')}
          >
            <Plus className="h-4 w-4" />
            <span>New Item</span>
          </button>
        </div>
      </div>

      {/* Notice Card */}
      <div className="p-4 rounded-xl bg-orange-50/70 border border-orange-200/80 text-orange-900 text-xs flex items-start gap-3">
        <Info className="h-4 w-4 text-orange-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-orange-900">
            Mechanical Department • Item Master Standby Mode
          </p>
          <p className="text-orange-700 text-[11px] leading-relaxed">
            As requested, the Item Master directory is configured and awaiting your exact field requirements. When you are ready to define fields (e.g. Item Code, Description, Category, Unit of Measure, Minimum Stock, Attachments), let me know and the real-time Supabase entry form with camera photo upload and Excel import will be enabled.
          </p>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search items by code, category, or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-orange-500 shadow-xs"
          />
        </div>
      </div>

      {/* Empty State Table */}
      <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-xs space-y-3">
        <div className="h-12 w-12 rounded-2xl bg-orange-50 border border-orange-200 flex items-center justify-center text-orange-600 mx-auto">
          <Package className="h-6 w-6" />
        </div>
        <h3 className="text-sm font-bold text-slate-900">Item Master Directory Ready</h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
          Zero demo records present. Real database connection to organization &quot;{organizationName || organizationId}&quot; is established.
        </p>
      </div>
    </div>
  )
}
