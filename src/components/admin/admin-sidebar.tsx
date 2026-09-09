import React from 'react'
import {
  LayoutDashboard,
  FolderKanban,
  MapPin,
  Cpu,
  Truck,
  Wrench,
  Fuel,
  Boxes,
  ShoppingCart,
  Building2,
  Package,
  Users,
  CalendarCheck,
  Receipt,
  CreditCard,
  Calculator,
  FileBarChart,
  UserCheck,
  ShieldAlert,
  SlidersHorizontal,
  History,
  Settings,
  ChevronLeft,
  ChevronRight,
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
    title: 'OVERVIEW',
    items: [
      { name: 'Dashboard', icon: LayoutDashboard, id: 'dashboard', active: true },
    ],
  },
  {
    title: 'OPERATIONS',
    items: [
      { name: 'Projects', icon: FolderKanban, id: 'projects', badge: 'Soon' },
      { name: 'Sites', icon: MapPin, id: 'sites', badge: 'Soon' },
      { name: 'Machines & Equipment', icon: Cpu, id: 'machines', badge: 'Soon' },
      { name: 'Vehicles', icon: Truck, id: 'vehicles', badge: 'Soon' },
      { name: 'Maintenance', icon: Wrench, id: 'maintenance', badge: 'Soon' },
      { name: 'Fuel', icon: Fuel, id: 'fuel', badge: 'Soon' },
      { name: 'Inventory', icon: Boxes, id: 'inventory', badge: 'Soon' },
      { name: 'Purchase', icon: ShoppingCart, id: 'purchase', badge: 'Soon' },
      { name: 'Vendors', icon: Building2, id: 'vendors', badge: 'Soon' },
      { name: 'Material', icon: Package, id: 'material', badge: 'Soon' },
      { name: 'Workforce', icon: Users, id: 'workforce', badge: 'Soon' },
      { name: 'Daily Operations', icon: CalendarCheck, id: 'daily-operations', badge: 'Soon' },
    ],
  },
  {
    title: 'FINANCE',
    items: [
      { name: 'Expenses', icon: Receipt, id: 'expenses', badge: 'Soon' },
      { name: 'Payments', icon: CreditCard, id: 'payments', badge: 'Soon' },
      { name: 'Costing', icon: Calculator, id: 'costing', badge: 'Soon' },
      { name: 'Reports', icon: FileBarChart, id: 'reports', badge: 'Soon' },
    ],
  },
  {
    title: 'ADMINISTRATION',
    items: [
      { name: 'Users', icon: UserCheck, id: 'users', badge: 'Soon' },
      { name: 'Roles & Permissions', icon: ShieldAlert, id: 'roles', badge: 'Soon' },
      { name: 'Organization', icon: SlidersHorizontal, id: 'organization', badge: 'Soon' },
      { name: 'Audit Logs', icon: History, id: 'audit-logs', badge: 'Soon' },
      { name: 'Settings', icon: Settings, id: 'settings', badge: 'Soon' },
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
      className={`relative flex flex-col border-r border-slate-800 bg-slate-950 text-slate-300 transition-all duration-300 ease-in-out select-none shrink-0 ${
        isCollapsed ? 'w-18' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="flex h-16 items-center justify-between border-b border-slate-800/80 px-4">
        {!isCollapsed ? (
          <div className="flex flex-col overflow-hidden text-left">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] font-bold tracking-widest text-blue-400 uppercase bg-blue-950/80 border border-blue-800/60 px-1.5 py-0.5 rounded">
                ERP
              </span>
              <span className="text-xs font-extrabold tracking-tight text-white truncate">
                MY RACHANA
              </span>
            </div>
            <span
              className="text-[11px] font-medium text-slate-400 truncate mt-0.5"
              title={organizationName}
            >
              {organizationName}
            </span>
          </div>
        ) : (
          <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-lg bg-blue-950 border border-blue-800 text-blue-400 font-mono text-xs font-bold">
            MR
          </div>
        )}

        {/* Collapse toggle button */}
        <button
          type="button"
          onClick={onToggleCollapse}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="hidden md:flex h-6 w-6 items-center justify-center rounded-md text-slate-400 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
        >
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6 scrollbar-thin scrollbar-thumb-slate-800">
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
                        ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30'
                        : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                    }`}
                  >
                    <Icon
                      className={`h-4 w-4 shrink-0 transition-colors ${
                        isActive ? 'text-blue-400' : 'text-slate-400 group-hover:text-slate-200'
                      }`}
                    />
                    {!isCollapsed && (
                      <span className="ml-3 truncate text-left flex-1">{item.name}</span>
                    )}

                    {!isCollapsed && item.badge && (
                      <span className="ml-auto rounded bg-slate-900 px-1.5 py-0.5 text-[9px] font-mono text-slate-400 border border-slate-800">
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
      <div className="border-t border-slate-800/80 p-3">
        {!isCollapsed ? (
          <div className="flex items-center gap-2 rounded-lg bg-slate-900/80 border border-slate-800/80 px-2.5 py-2 text-[11px] text-slate-400">
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