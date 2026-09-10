import React, { useState } from 'react';
import { 
  Search, 
  LayoutDashboard, 
  FolderKanban, 
  Users, 
  Settings, 
  LogOut,
  Hash,
  ChevronDown,
  ChevronRight,
  Inbox,
  Calendar,
  Activity,
  CreditCard,
  Globe,
  Terminal,
  Blocks,
  PanelLeftClose,
  PanelLeftOpen,
  Command,
  X
} from 'lucide-react';

export type NavItemData = {
  id: string;
  title: string;
  icon: React.ElementType;
  badge?: number | string;
  shortcut?: string;
  children?: NavItemData[];
};

export type NavGroupData = {
  heading?: string;
  items: NavItemData[];
};

const mockNavGroups: NavGroupData[] = [
  {
    items: [
      { id: 'search', title: 'Search', icon: Search, shortcut: '⌘K' },
      { id: 'home', title: 'Home', icon: LayoutDashboard },
      { id: 'inbox', title: 'Inbox', icon: Inbox, badge: 12 },
      { id: 'analytics', title: 'Analytics', icon: Activity },
    ]
  },
  {
    heading: 'Workspace',
    items: [
      { 
        id: 'projects', 
        title: 'Projects', 
        icon: FolderKanban,
        children: [
          { id: 'p-active', title: 'Active', icon: Hash },
          { id: 'p-archived', title: 'Archived', icon: Hash },
        ]
      },
      { id: 'calendar', title: 'Calendar', icon: Calendar },
      { 
        id: 'team', 
        title: 'Team', 
        icon: Users,
        children: [
          { id: 't-design', title: 'Designers', icon: Hash },
          { id: 't-eng', title: 'Engineering', icon: Hash },
          { id: 't-product', title: 'Product', icon: Hash },
        ]
      },
      { 
        id: 'customers', 
        title: 'Customers', 
        icon: Globe,
        children: [
          { id: 'c-enterprise', title: 'Enterprise', icon: Hash },
          { id: 'c-smb', title: 'SMB', icon: Hash },
        ]
      },
      { id: 'finance', title: 'Finance', icon: CreditCard },
    ]
  },
  {
    heading: 'Developers',
    items: [
      { id: 'api', title: 'API Keys', icon: Terminal },
      { id: 'webhooks', title: 'Webhooks', icon: Blocks },
    ]
  }
];

const mockBottomItems: NavItemData[] = [
  { id: 'settings', title: 'Settings', icon: Settings, shortcut: '⌘,' },
  { id: 'logout', title: 'Log out', icon: LogOut },
];

export function WorkspaceSwitcher({ 
  selected, 
  onSelect,
  workspaces = ['Acme Corp', 'Personal Workspace', 'Client Sandbox'],
  subtitle = 'Pro Plan',
  avatarChar
}: { 
  selected?: string; 
  onSelect?: (ws: string) => void;
  workspaces?: string[];
  subtitle?: string;
  avatarChar?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [internalSelected, setInternalSelected] = useState('Acme Corp');
  
  const current = selected || internalSelected;
  const handleSelect = onSelect || setInternalSelected;
  const char = avatarChar || current.charAt(0);

  return (
    <div className="relative">
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between px-2 py-2 mb-4 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer transition-colors select-none group border border-transparent hover:border-slate-200"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-[6px] bg-blue-600 text-white flex items-center justify-center font-bold text-[13px] shadow-xs shrink-0">
            {char}
          </div>
          <div className="flex flex-col overflow-hidden min-w-0">
            <span className="text-[13px] font-bold leading-none mb-1 text-slate-900 truncate">{current}</span>
            <span className="text-[11px] text-slate-500 leading-none truncate">{subtitle}</span>
          </div>
        </div>
        <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors shrink-0" strokeWidth={1.5} />
      </div>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute top-[52px] left-0 w-full bg-white border border-slate-200 rounded-lg shadow-xl z-50 py-1 flex flex-col gap-0.5 animate-in fade-in zoom-in-95 duration-100">
            {workspaces.map(ws => (
              <div 
                key={ws}
                onClick={() => { handleSelect(ws); setIsOpen(false); }}
                className={`px-3 py-2 mx-1 text-[13px] rounded-md cursor-pointer transition-colors ${current === ws ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-700 hover:bg-slate-50'}`}
              >
                {ws}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function NavItem({ 
  item, 
  activeId, 
  onSelect,
  level = 0
}: { 
  item: NavItemData; 
  activeId: string; 
  onSelect: (id: string) => void;
  level?: number;
}) {
  const isActive = activeId === item.id;
  const hasChildren = !!item.children;
  const [isOpen, setIsOpen] = useState(false);

  const handleClick = () => {
    if (hasChildren) {
      setIsOpen(!isOpen);
    } else {
      onSelect(item.id);
    }
  };

  return (
    <div className="flex flex-col w-full">
      <div 
        className={`group flex items-center justify-between px-2.5 py-[7px] rounded-[6px] cursor-pointer transition-all duration-200 select-none
          ${isActive 
            ? 'bg-blue-50 text-blue-700 font-bold border border-blue-200/60 shadow-xs' 
            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 font-medium'
          }
        `}
        style={{ paddingLeft: `${level * 12 + 10}px` }}
        onClick={handleClick}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <item.icon 
            className={`w-[16px] h-[16px] transition-colors shrink-0
              ${isActive ? 'text-blue-600' : 'text-slate-500 group-hover:text-slate-800'}
            `} 
            strokeWidth={isActive ? 2 : 1.75} 
          />
          <span className="text-[13px] tracking-tight truncate">
            {item.title}
          </span>
        </div>
        
        <div className="flex items-center gap-2 shrink-0">
          {item.shortcut && (
             <kbd className="hidden group-hover:inline-flex items-center justify-center h-5 px-1.5 text-[10px] font-medium font-mono text-slate-400 bg-white border border-slate-200 rounded-[4px] shadow-xs">
               {item.shortcut}
             </kbd>
          )}
          {item.badge !== undefined && (
            <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[10px] font-bold rounded-full bg-blue-100 text-blue-700">
              {item.badge}
            </span>
          )}
          {hasChildren && (
            <ChevronRight 
              className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`} 
              strokeWidth={2}
            />
          )}
        </div>
      </div>

      {hasChildren && (
        <div 
          className={`grid transition-[grid-template-rows,opacity] duration-300 ease-in-out ${
            isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
          }`}
        >
          <div className="overflow-hidden min-h-0 relative flex flex-col gap-0.5 mt-0.5">
            <div 
              className="absolute top-0 bottom-0 border-l border-slate-200"
              style={{ left: `${level * 12 + 17.5}px` }}
            />
            {item.children!.map(child => (
              <NavItem 
                key={child.id} 
                item={child} 
                activeId={activeId} 
                onSelect={onSelect} 
                level={level + 1} 
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function SidebarNav({ 
  className = '',
  activeId,
  onSelect,
  activeWorkspace,
  onWorkspaceSelect,
  navGroups = mockNavGroups,
  bottomItems = mockBottomItems,
  workspaceSubtitle,
  avatarChar,
  workspaces
}: { 
  className?: string;
  activeId?: string;
  onSelect?: (id: string) => void;
  activeWorkspace?: string;
  onWorkspaceSelect?: (ws: string) => void;
  navGroups?: NavGroupData[];
  bottomItems?: NavItemData[];
  workspaceSubtitle?: string;
  avatarChar?: string;
  workspaces?: string[];
}) {
  const [internalId, setInternalId] = useState('home');
  const currentId = activeId !== undefined ? activeId : internalId;
  const handleSelect = onSelect || setInternalId;

  return (
    <div className={`flex flex-col w-[260px] h-full bg-white border-r border-slate-200/90 p-3 font-sans ${className}`}>
      <WorkspaceSwitcher 
        selected={activeWorkspace} 
        onSelect={onWorkspaceSelect} 
        subtitle={workspaceSubtitle}
        avatarChar={avatarChar}
        workspaces={workspaces}
      />

      <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] flex flex-col gap-4 mt-2">
        {navGroups.map((group, idx) => (
          <div key={idx} className="flex flex-col gap-0.5">
            {group.heading && (
              <span className="px-2.5 mb-1 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                {group.heading}
              </span>
            )}
            {group.items.map(item => (
              <NavItem 
                key={item.id} 
                item={item} 
                activeId={currentId} 
                onSelect={handleSelect} 
              />
            ))}
          </div>
        ))}
      </div>

      <div className="mt-auto pt-4 border-t border-slate-200/90 flex flex-col gap-0.5">
        {bottomItems.map(item => (
          <NavItem 
            key={item.id} 
            item={item} 
            activeId={currentId} 
            onSelect={handleSelect} 
          />
        ))}
      </div>
    </div>
  );
}

const allItems = [...mockNavGroups.flatMap(g => g.items), ...mockBottomItems];
const flattenItems = (items: NavItemData[]): NavItemData[] => {
  return items.reduce((acc, item) => {
    acc.push(item);
    if (item.children) acc.push(...flattenItems(item.children));
    return acc;
  }, [] as NavItemData[]);
};
const flatMockData = flattenItems(allItems);

export default function SidebarNavPreview() {
  const [isOpen, setIsOpen] = useState(true);
  const [activeId, setActiveId] = useState('home');
  const [activeWorkspace, setActiveWorkspace] = useState('Acme Corp');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const activeItem = flatMockData.find(i => i.id === activeId);
  const activeTitle = activeItem ? activeItem.title : 'Dashboard';

  const handleSelect = (id: string) => {
    if (id === 'search') {
      setIsSearchOpen(true);
      return;
    }
    setActiveId(id);
  };

  return (
    <div className="flex flex-col items-center justify-center w-full min-h-[700px] bg-slate-50 p-4 md:p-8">
      <div className="relative w-full max-w-5xl h-[700px] bg-white rounded-2xl border border-slate-200 flex overflow-hidden shadow-sm">
        <div 
          className={`h-full transition-all duration-300 ease-in-out shrink-0 overflow-hidden bg-white border-r border-slate-200 ${
            isOpen ? 'w-[260px] opacity-100' : 'w-0 opacity-0 border-none'
          }`}
        >
          <SidebarNav 
            className="w-[260px] border-none bg-transparent" 
            activeId={activeId}
            onSelect={handleSelect}
            activeWorkspace={activeWorkspace}
            onWorkspaceSelect={setActiveWorkspace}
          />
        </div>
        
        <div className="flex-1 bg-slate-50/60 flex flex-col min-w-0 transition-all duration-300">
           <div className="h-14 border-b border-slate-200 flex items-center px-4 justify-between bg-white shrink-0">
             <div className="flex items-center gap-3">
               <button 
                 onClick={() => setIsOpen(!isOpen)}
                 className="p-1.5 rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"
               >
                 {isOpen ? <PanelLeftClose className="w-[18px] h-[18px]" strokeWidth={1.5} /> : <PanelLeftOpen className="w-[18px] h-[18px]" strokeWidth={1.5} />}
               </button>
               <div className="flex items-center gap-2 text-sm text-slate-500">
                 <span className="truncate">{activeWorkspace}</span>
                 <span>/</span>
                 <span className="font-semibold text-slate-900 truncate">{activeTitle}</span>
               </div>
             </div>
             
             <div className="flex items-center gap-3">
               <div className="w-64 h-8 bg-slate-100 rounded-md hidden md:block" />
               <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold">
                 R
               </div>
             </div>
           </div>

           <div className="p-6 md:p-8 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
             <div className="flex items-center justify-between mb-8">
               <div className="w-48 h-8 bg-slate-100 rounded-md" />
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
               <div className="h-32 bg-white rounded-xl border border-slate-200 shadow-xs" />
               <div className="h-32 bg-white rounded-xl border border-slate-200 shadow-xs" />
             </div>

             <div className="w-full bg-white rounded-xl border border-slate-200 shadow-xs p-6">
                <div className="w-1/3 h-5 bg-slate-100 rounded-md mb-6" />
                <div className="w-full h-[1px] bg-slate-200 mb-6" />
                
                <div className="flex flex-col gap-4">
                  <div className="w-full h-12 bg-slate-100 rounded-lg" />
                  <div className="w-full h-12 bg-slate-100 rounded-lg" />
                </div>
             </div>
           </div>
        </div>

        {isSearchOpen && (
          <div className="absolute inset-0 z-50 flex items-start justify-center pt-[15vh] bg-slate-900/30 backdrop-blur-xs px-4">
            <div className="absolute inset-0" onClick={() => setIsSearchOpen(false)} />
            <div className="relative w-full max-w-xl bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center px-4 border-b border-slate-200">
                <Search className="w-[18px] h-[18px] text-slate-400 mr-3 shrink-0" strokeWidth={1.5} />
                <input 
                  autoFocus
                  className="flex-1 bg-transparent py-4 outline-none text-[14px] text-slate-900 placeholder:text-slate-400"
                  placeholder="Search projects, sites, items, tasks..."
                />
                <kbd 
                  onClick={() => setIsSearchOpen(false)}
                  className="hidden sm:inline-flex items-center justify-center h-5 px-1.5 ml-2 text-[10px] font-medium font-mono text-slate-500 bg-slate-100 border border-slate-200 rounded-[4px] cursor-pointer hover:bg-slate-200 transition-colors"
                >
                  ESC
                </kbd>
                <button 
                  onClick={() => setIsSearchOpen(false)}
                  className="ml-3 p-1 rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                >
                  <X className="w-[18px] h-[18px]" strokeWidth={1.5} />
                </button>
              </div>
              <div className="p-2 py-8 flex flex-col items-center justify-center">
                 <Command className="w-6 h-6 text-slate-300 mb-2" strokeWidth={1.5} />
                 <p className="text-[13px] text-slate-500 font-medium">Type a command or search module...</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

