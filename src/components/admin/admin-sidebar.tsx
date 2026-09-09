import React from 'react'
import {
  LayoutDashboard,
  Cpu,
  Fuel,
  Boxes,
  ShoppingCart,
  Users,
  ShieldAlert,
  SlidersHorizontal,
  History,
  ChevronLeft,
  ChevronRight,
  FolderKanban,
  Package,
} from 'lucide-react'

interface NavItem {
  name: string
  icon: React.ElementType
  id: string
  active?: boolean
  badge?: string
}

interface NavSection {
  title: string
  items: NavItem[]
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: 'COMMAND CENTER',
    items: [
      { name: 'Dashboard', icon: LayoutDashboard, id: 'dashboard' },
      { name: 'Projects & Sites', icon: FolderKanban, id: 'projects' },
      { name: 'People & Directory', icon: Users, id: 'people' },
    ],
  },
  {
    title: 'MECHANICAL DEPARTMENT',
    items: [
      { name: 'Item Master', icon: Package, id: 'item-master' },
      { name: 'Asset Master', icon: Cpu, id: 'asset-master' },
      { name: 'Diesel Requisition', icon: Fuel, id: 'diesel-requisition' },
    ],
  },
  {
    title: 'OPERATIONS',
    items: [
      { name: 'Fuel & Diesel Logs', icon: Fuel, id: 'fuel' },
      { name: 'Machines & Equipment', icon: Cpu, id: 'fleet' },
      { name: 'Inventory & Materials', icon: Boxes, id: 'inventory' },
      { name: 'Purchase & POs', icon: ShoppingCart, id: 'purchase' },
    ],
  },
  {
    title: 'GOVERNANCE & CONFIG',
    items: [
      { name: 'Dynamic Forms', icon: SlidersHorizontal, id: 'forms' },
      { name: 'Approval Workflows', icon: ShieldAlert, id: 'workflows' },
      { name: 'Audit Logs', icon: History, id: 'audit-logs' },
    ],
  },
]

interface AdminSidebarProps {
  organizationName: string
  isCollapsed: boolean
  onToggleCollapse: () => void
  activeModule: string
  onSelectModule: (id: string) => void
}

export function AdminSidebar({
  organizationName,
  isCollapsed,
  onToggleCollapse,
  activeModule,
  onSelectModule,
}: AdminSidebarProps) {
  return (
    <aside
      className={`relative flex flex-col border-r border-slate-200 bg-white text-slate-700 transition-all duration-300 ease-in-out select-none shrink-0 ${
        isCollapsed ? 'w-18' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="flex h-16 items-center justify-between border-b border-slate-200 px-4">
        {!isCollapsed ? (
          <div className="flex flex-col overflow-hidden text-left">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] font-bold tracking-widest text-blue-700 uppercase bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">
                ERP
              </span>
              <span className="text-xs font-extrabold tracking-tight text-slate-900 truncate">
                MY RACHANA
              </span>
            </div>
            <span
              className="text-[11px] font-medium text-slate-500 truncate mt-0.5"
              title={organizationName}
            >
              {organizationName}
            </span>
          </div>
        ) : (
          <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 border border-blue-200 text-blue-700 font-mono text-xs font-bold">
            MR
          </div>
        )}

        {/* Collapse toggle button */}
        <button
          type="button"
          onClick={onToggleCollapse}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="hidden md:flex h-6 w-6 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
        >
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6 scrollbar-thin scrollbar-thumb-slate-200">
        {NAV_SECTIONS.map((section) => (
          <div key={section.title} className="space-y-1">
            {!isCollapsed && (
              <div className="px-2.5 mb-1.5 text-[10px] font-mono font-semibold tracking-wider text-slate-400 uppercase text-left">
                {section.title}
              </div>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon
                const isActive = activeModule === item.id

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onSelectModule(item.id)}
                    title={isCollapsed ? item.name : undefined}
                    className={`group relative flex w-full items-center rounded-lg px-2.5 py-2 text-xs font-medium transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-blue-50 text-blue-700 border border-blue-200/80 font-semibold shadow-xs'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <Icon
                      className={`h-4 w-4 shrink-0 transition-colors ${
                        isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'
                      }`}
                    />
                    {!isCollapsed && (
                      <span className="ml-3 truncate text-left flex-1">{item.name}</span>
                    )}

                    {!isCollapsed && item.badge && (
                      <span className="ml-auto rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-mono text-slate-600 border border-slate-200">
                        {item.badge}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer / Tenant pill */}
      <div className="border-t border-slate-200 p-3 bg-slate-50/50">
        {!isCollapsed ? (
          <div className="flex items-center gap-2 rounded-lg bg-white border border-slate-200/80 px-2.5 py-2 text-[11px] text-slate-600 shadow-xs">
            <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
            <span className="truncate text-left font-mono">Tenant Active</span>
          </div>
        ) : (
          <div className="flex justify-center py-1">
            <span className="h-2 w-2 rounded-full bg-emerald-500" title="Tenant Active" />
          </div>
        )}
      </div>
    </aside>
  )
}