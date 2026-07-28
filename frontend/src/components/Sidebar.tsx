import React from 'react';
import { 
  LayoutDashboard, 
  Calendar as CalendarIcon, 
  Building2, 
  MessageSquare, 
  CheckSquare, 
  Settings, 
  LogOut, 
  Palmtree, 
  AlertTriangle
} from 'lucide-react';

export type ActivePage = 
  | 'login' 
  | 'dashboard' 
  | 'calendar' 
  | 'property-detail' 
  | 'properties' 
  | 'inbox' 
  | 'conversation-thread' 
  | 'tickets' 
  | 'settings';

interface SidebarProps {
  activePage: ActivePage;
  onNavigate: (page: ActivePage) => void;
  onLogout: () => void;
  unreadMessagesCount: number;
  openTicketsCount: number;
  hasCalendarConflict: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activePage,
  onNavigate,
  onLogout,
  unreadMessagesCount,
  openTicketsCount,
  hasCalendarConflict
}) => {
  const navItems = [
    { id: 'dashboard' as ActivePage, label: 'Dashboard', icon: LayoutDashboard },
    { 
      id: 'calendar' as ActivePage, 
      label: 'Calendar',
      icon: CalendarIcon,
      badge: hasCalendarConflict ? 'Conflict' : undefined,
      badgeColor: 'bg-rose-500 text-white'
    },
    { 
      id: 'inbox' as ActivePage, 
      label: 'Messages',
      icon: MessageSquare,
      badge: unreadMessagesCount > 0 ? `${unreadMessagesCount}` : undefined,
      badgeColor: 'bg-amber-500 text-white'
    },
    { 
      id: 'tickets' as ActivePage, 
      label: 'Maintenance',
      icon: CheckSquare,
      badge: openTicketsCount > 0 ? `${openTicketsCount}` : undefined,
      badgeColor: 'bg-[#0F3D5E] text-white'
    },
    { id: 'properties' as ActivePage, label: 'Properties', icon: Building2 },
    { id: 'settings' as ActivePage, label: 'Settings', icon: Settings },
  ];

  return (
    <>
    <aside className="hidden w-64 bg-white border-r border-[#EBE6DD] md:flex flex-col h-screen sticky top-0 z-30 shrink-0 select-none shadow-[2px_0_12px_rgba(28,27,24,0.02)]">
      {/* Brand Header */}
      <div className="p-5 border-b border-[#EBE6DD] flex items-center justify-between bg-[#FAF8F5]/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#0F3D5E] flex items-center justify-center text-white shadow-[0_2px_8px_rgba(15,61,94,0.25)]">
            <Palmtree className="w-5 h-5 text-[#E8A838]" />
          </div>
          <div>
            <h1 className="font-bold text-base text-[#1C1B18] tracking-tight leading-none flex items-center gap-1.5">
              Vayca <span className="text-[10px] font-semibold tracking-wider text-[#D96B43] bg-[#FDF4F0] px-1.5 py-0.5 rounded border border-[#FBE6DC]">TN</span>
            </h1>
            <p className="text-[11px] text-[#78716C] mt-1 font-medium">Tunisia Property Ops</p>
          </div>
        </div>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <div className="px-3 py-1.5 text-[11px] font-semibold text-[#78716C] uppercase tracking-wider">
          Operations
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all group ${
                isActive
                  ? 'bg-[#0F3D5E] text-white shadow-[0_2px_8px_rgba(15,61,94,0.18)] font-semibold'
                  : 'text-[#3B3735] hover:bg-[#FAF8F5] hover:text-[#0F3D5E]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon className={`w-4 h-4 transition-colors ${
                  isActive ? 'text-[#E8A838]' : 'text-[#78716C] group-hover:text-[#0F3D5E]'
                }`} />
                <div className="text-left">{item.label}</div>
              </div>

              {item.badge && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${item.badgeColor}`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="mx-3 mb-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[10px] font-semibold text-amber-800">
        Prototype data - integrations are not connected
      </div>

      {/* Alert Notification Card */}
      {hasCalendarConflict && (
        <div className="p-3 mx-3 mb-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-[11px]">Booking Overlap Alert</div>
              <p className="text-[10px] text-rose-700 mt-0.5">Villa Yasmine has a 1-day conflict on Jul 25.</p>
              <button 
                onClick={() => onNavigate('calendar')}
                className="mt-1 text-[10px] font-bold text-rose-800 underline hover:text-rose-900"
              >
                Resolve in Calendar &rarr;
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Profile Footer */}
      <div className="p-3 border-t border-[#EBE6DD] bg-[#FAF8F5]/70">
        <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-[#EBE6DD] shadow-sm">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <img 
              src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80" 
              alt="Youssef Ben Salem" 
              className="w-8 h-8 rounded-full object-cover border border-[#EBE6DD]"
            />
            <div className="truncate">
              <div className="font-semibold text-xs text-[#1C1B18] truncate">Youssef B. Salem</div>
              <div className="text-[10px] text-[#78716C] truncate">Hammamet Prestige</div>
            </div>
          </div>
          <button 
            onClick={onLogout}
            title="Log out"
            className="p-1.5 rounded-lg text-[#78716C] hover:text-rose-600 hover:bg-rose-50 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
    <nav
      aria-label="Mobile navigation"
      className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-6 border-t border-[#EBE6DD] bg-white/95 px-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-8px_30px_rgba(28,27,24,0.08)] backdrop-blur md:hidden"
    >
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = activePage === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onNavigate(item.id)}
            aria-current={isActive ? 'page' : undefined}
            className={`relative flex min-w-0 flex-col items-center gap-1 rounded-lg px-0.5 py-1.5 text-[8px] font-semibold tracking-tight transition-colors ${
              isActive ? 'bg-[#F0F6FA] text-[#0F3D5E]' : 'text-[#78716C]'
            }`}
          >
            <Icon className={`h-4 w-4 ${isActive ? 'text-[#0F3D5E]' : 'text-[#78716C]'}`} />
            <span className="whitespace-nowrap">{item.label}</span>
            {item.badge && (
              <span className={`absolute right-1 top-0 h-2 w-2 rounded-full ${item.badgeColor.split(' ')[0]}`} />
            )}
          </button>
        );
      })}
    </nav>
    </>
  );
};
