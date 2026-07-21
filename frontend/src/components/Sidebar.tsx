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
  UserCheck,
  ShieldCheck,
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
      label: 'Multi-Calendar', 
      icon: CalendarIcon,
      badge: hasCalendarConflict ? 'Conflict Alert' : undefined,
      badgeColor: 'bg-rose-600 text-white'
    },
    { id: 'properties' as ActivePage, label: 'Property List', icon: Building2 },
    { id: 'property-detail' as ActivePage, label: 'Property Knowledge & WiFi', icon: ShieldCheck, subtext: 'Villa Yasmine' },
    { 
      id: 'inbox' as ActivePage, 
      label: 'Guest Inbox', 
      icon: MessageSquare,
      badge: unreadMessagesCount > 0 ? `${unreadMessagesCount} Unread` : undefined,
      badgeColor: 'bg-amber-600 text-white'
    },
    { 
      id: 'conversation-thread' as ActivePage, 
      label: 'Live Guest Chat', 
      icon: UserCheck, 
      subtext: 'Sarah Jenkins' 
    },
    { 
      id: 'tickets' as ActivePage, 
      label: 'Maintenance Board', 
      icon: CheckSquare,
      badge: openTicketsCount > 0 ? `${openTicketsCount} Open` : undefined,
      badgeColor: 'bg-[#0F3D5E] text-white'
    },
    { id: 'settings' as ActivePage, label: 'Settings & Team', icon: Settings },
  ];

  return (
    <aside className="w-72 bg-white border-r-2 border-[#EBE6DD] flex flex-col h-screen sticky top-0 z-30 shrink-0 select-none shadow-sm">
      {/* Brand Header */}
      <div className="p-5 border-b-2 border-[#EBE6DD] flex items-center justify-between bg-[#FAF8F5]">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-[#0F3D5E] flex items-center justify-center text-white shadow-md">
            <Palmtree className="w-6 h-6 text-[#E8A838]" />
          </div>
          <div>
            <h1 className="font-extrabold text-lg text-[#111827] tracking-tight leading-none flex items-center gap-1.5">
              Vayca <span className="text-xs font-bold tracking-wider text-[#D96B43] bg-[#FDF4F0] px-2 py-0.5 rounded-lg border border-[#FBE6DC]">TN</span>
            </h1>
            <p className="text-xs text-[#655E59] mt-1 font-semibold">Tunisia Property OS</p>
          </div>
        </div>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 p-3.5 space-y-1.5 overflow-y-auto">
        <div className="px-3 py-2 text-xs font-bold text-[#655E59] uppercase tracking-wider">
          Main Operations Menu
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-bold transition-all group min-h-[46px] ${
                isActive
                  ? 'bg-[#0F3D5E] text-white shadow-md'
                  : 'text-[#292524] hover:bg-[#FAF8F5] hover:text-[#0F3D5E]'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-5 h-5 shrink-0 transition-colors ${
                  isActive ? 'text-[#E8A838]' : 'text-[#655E59] group-hover:text-[#0F3D5E]'
                }`} />
                <div className="text-left">
                  <div className="leading-snug">{item.label}</div>
                  {item.subtext && (
                    <div className={`text-xs ${isActive ? 'text-white/80' : 'text-[#655E59]'}`}>
                      {item.subtext}
                    </div>
                  )}
                </div>
              </div>

              {item.badge && (
                <span className={`px-2.5 py-1 rounded-full text-xs font-bold shrink-0 ${item.badgeColor}`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Alert Notification Card */}
      {hasCalendarConflict && (
        <div className="p-3.5 mx-3 mb-3 rounded-xl bg-rose-50 border-2 border-rose-200 text-rose-900 text-xs">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-extrabold text-xs">Double-Booking Overlap!</div>
              <p className="text-xs text-rose-800 mt-0.5 leading-snug">Villa Yasmine has a 1-day conflict on Jul 25.</p>
              <button 
                onClick={() => onNavigate('calendar')}
                className="mt-1.5 text-xs font-extrabold text-rose-900 underline hover:text-rose-950 block"
              >
                Click to Resolve Conflict &rarr;
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Profile Footer */}
      <div className="p-3.5 border-t-2 border-[#EBE6DD] bg-[#FAF8F5]">
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-[#EBE6DD] shadow-xs">
          <div className="flex items-center gap-3 overflow-hidden">
            <img 
              src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80" 
              alt="Youssef Ben Salem" 
              className="w-9 h-9 rounded-full object-cover border border-[#EBE6DD] shrink-0"
            />
            <div className="truncate">
              <div className="font-bold text-xs text-[#111827] truncate">Youssef B. Salem</div>
              <div className="text-xs text-[#655E59] truncate font-medium">Hammamet Prestige</div>
            </div>
          </div>
          <button 
            onClick={onLogout}
            title="Log out of app"
            className="p-2 rounded-lg text-[#655E59] hover:text-rose-600 hover:bg-rose-50 transition-colors shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
