import React from 'react';
import { 
  MessageSquare, 
  Send, 
  BarChart3, 
  Settings, 
  ChevronDown,
  RotateCcw
} from 'lucide-react';
import { Business } from '../types';

interface SidebarProps {
  businesses: Business[];
  currentBusiness: Business | null;
  onSelectBusiness: (id: string) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onResetData: () => void;
  onOpenConnectionModal: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  businesses,
  currentBusiness,
  onSelectBusiness,
  activeTab,
  setActiveTab,
  onResetData,
  onOpenConnectionModal,
}) => {
  const [dropdownOpen, setDropdownOpen] = React.useState(false);

  const navItems = [
    { id: 'reviews', label: 'Recensioni', icon: MessageSquare },
    { id: 'requests', label: 'Richieste', icon: Send },
    { id: 'stats', label: 'Statistiche', icon: BarChart3 },
    { id: 'settings', label: 'Impostazioni', icon: Settings },
  ];

  return (
    <>
      {/* Desktop Sidebar (220px wide, white, right border) */}
      <aside className="hidden md:flex flex-col w-[220px] bg-white border-r border-[#E5E7E3] shrink-0 select-none">
        {/* App Name Top */}
        <div className="px-5 py-5 border-b border-[#E5E7E3]">
          <h1 className="font-semibold text-base text-[#1C2321] tracking-tight">
            ReviewDesk
          </h1>
        </div>

        {/* Business Selector & Connection Status */}
        <div className="p-3 border-b border-[#E5E7E3] space-y-2">
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="w-full flex items-center justify-between p-2 rounded-[6px] hover:bg-[#F6F7F5] transition text-left"
            >
              <div className="min-w-0 pr-1">
                <p className="font-medium text-xs text-[#1C2321] truncate">
                  {currentBusiness?.name || 'Seleziona attività'}
                </p>
                <p className="text-[11px] text-[#667069] truncate">
                  {currentBusiness?.location}
                </p>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-[#667069] transition-transform shrink-0 ${dropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {dropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#E5E7E3] rounded-[6px] dropdown-shadow z-50 overflow-hidden">
                {businesses.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => {
                      onSelectBusiness(b.id);
                      setDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 hover:bg-[#F6F7F5] transition flex items-center justify-between text-xs ${
                      b.id === currentBusiness?.id ? 'text-[#1F5F4A] font-medium bg-[#E8F0EC]/50' : 'text-[#1C2321]'
                    }`}
                  >
                    <div>
                      <p className="font-medium">{b.name}</p>
                      <p className="text-[11px] text-[#667069]">{b.location}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Connection status line */}
          <div className="px-2 py-1 flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${currentBusiness?.isConnected ? 'bg-[#1F5F4A]' : 'bg-[#B3382C]'}`}></span>
              <span className="text-[#667069]">
                {currentBusiness?.isConnected ? 'Profilo connesso' : 'Non connesso'}
              </span>
            </div>
            <button
              onClick={onOpenConnectionModal}
              className="text-[#1F5F4A] hover:underline font-medium"
            >
              Gestisci
            </button>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 p-2 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-[6px] text-xs font-medium transition ${
                  isActive
                    ? 'bg-[#E8F0EC] text-[#1F5F4A]'
                    : 'text-[#667069] hover:bg-[#F6F7F5] hover:text-[#1C2321]'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-[#1F5F4A]' : 'text-[#667069]'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Footer actions */}
        <div className="p-3 border-t border-[#E5E7E3] space-y-2">
          <button
            onClick={onResetData}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-[6px] hover:bg-[#F6F7F5] text-[#667069] hover:text-[#1C2321] text-[11px] transition"
          >
            <RotateCcw className="w-3 h-3" />
            Ripristina demo
          </button>
          <div className="text-[10px] text-[#667069] text-center">
            Google Business Profile
          </div>
        </div>
      </aside>

      {/* Mobile Top Header & Bottom Bar */}
      <div className="md:hidden flex flex-col w-full">
        <header className="bg-white border-b border-[#E5E7E3] px-4 py-3 sticky top-0 z-40 flex items-center justify-between">
          <span className="font-semibold text-sm text-[#1C2321]">ReviewDesk</span>
          <select
            value={currentBusiness?.id}
            onChange={(e) => onSelectBusiness(e.target.value)}
            className="input-field text-xs py-1 px-2"
          >
            {businesses.map((b) => (
              <option key={b.id} value={b.id}>{b.name} ({b.location})</option>
            ))}
          </select>
        </header>

        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E5E7E3] z-40 flex items-center justify-around py-2 px-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-[6px] transition ${
                  isActive ? 'text-[#1F5F4A] bg-[#E8F0EC]' : 'text-[#667069]'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-[10px] font-medium">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </>
  );
};
