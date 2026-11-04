import React from 'react';
import { 
  MessageSquare, 
  Send, 
  BarChart3, 
  Settings, 
  ChevronDown,
  RotateCcw,
  Globe,
  Plus,
  LogOut,
  Users,
  Shield,
  Trash2
} from 'lucide-react';
import { Business } from '../types';
import { PWAInstallButton } from './PWAInstallButton';

interface SidebarProps {
  businesses: Business[];
  currentBusiness: Business | null;
  onSelectBusiness: (id: string) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onResetData: () => void;
  onClearDemoData?: () => void;
  onOpenConnectionModal: () => void;
  userEmail?: string;
  onSignOut: () => void;
  onAddBusiness: () => void;
  criticalReviewsCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  businesses,
  currentBusiness,
  onSelectBusiness,
  activeTab,
  setActiveTab,
  onResetData,
  onClearDemoData,
  onOpenConnectionModal,
  userEmail,
  onSignOut,
  onAddBusiness,
  criticalReviewsCount,
}) => {
  const [dropdownOpen, setDropdownOpen] = React.useState(false);

  const isAdmin = userEmail ? (
    ['gestsocialgabriele@gmail.com', 'info@sititicino.ch', 'admin@reviewdesk.ch'].includes(userEmail.toLowerCase().trim()) ||
    userEmail.toLowerCase().includes('admin') ||
    userEmail.toLowerCase().includes('sititicino')
  ) : true; // Show by default or for admins

  const navItems = [
    { id: 'landing', label: 'Sito Pubblico', icon: Globe },
    { 
      id: 'reviews', 
      label: 'Recensioni', 
      icon: MessageSquare, 
      criticalBadge: criticalReviewsCount && criticalReviewsCount > 0 ? criticalReviewsCount : undefined 
    },
    { id: 'requests', label: 'Richieste', icon: Send },
    { id: 'stats', label: 'Statistiche', icon: BarChart3 },
    { id: 'settings', label: 'Impostazioni', icon: Settings },
    ...(isAdmin ? [{ id: 'admin_access', label: 'Gestione Accessi', icon: Users, badge: 'Admin' }] : [])
  ];

  return (
    <>
      {/* Desktop Sidebar (220px wide, white, right border) */}
      <aside className="hidden md:flex flex-col w-[220px] bg-white border-r border-[#E5E7E3] shrink-0 select-none">
        {/* App Name Top */}
        <div className="px-5 py-4 border-b border-[#E5E7E3]">
          <button 
            onClick={() => setActiveTab('landing')}
            className="w-full text-left group flex items-center justify-between"
            title="Torna alla home page"
          >
            <div>
              <h1 className="font-semibold text-base text-[#1C2321] group-hover:text-[#1F5F4A] tracking-tight transition flex items-center gap-1.5">
                ReviewDesk
              </h1>
              <span className="text-[11px] text-[#667069] group-hover:underline">← Torna alla home</span>
            </div>
          </button>
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
                  {currentBusiness?.location || 'Nessuna località'}
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
                    <div className="truncate">
                      <p className="font-medium truncate">{b.name}</p>
                      <p className="text-[11px] text-[#667069] truncate">{b.location}</p>
                    </div>
                  </button>
                ))}
                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    onAddBusiness();
                  }}
                  className="w-full text-left px-3 py-2.5 hover:bg-[#F6F7F5] transition flex items-center gap-1.5 text-xs text-[#1F5F4A] font-medium border-t border-[#E5E7E3]"
                >
                  <Plus className="w-3.5 h-3.5" /> Aggiungi attività
                </button>
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
                className={`w-full flex items-center justify-between px-3 py-2 rounded-[6px] text-xs font-medium transition ${
                  isActive
                    ? 'bg-[#E8F0EC] text-[#1F5F4A]'
                    : 'text-[#667069] hover:bg-[#F6F7F5] hover:text-[#1C2321]'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#1F5F4A]' : 'text-[#667069]'}`} />
                  <span className="truncate">{item.label}</span>
                </div>
                {item.criticalBadge ? (
                  <span 
                    className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-[#B3382C] text-white animate-pulse shrink-0" 
                    title={`${item.criticalBadge} recensioni critiche (1-2★) in attesa di risposta`}
                  >
                    {item.criticalBadge}
                  </span>
                ) : item.badge ? (
                  <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#1F5F4A]/10 text-[#1F5F4A] shrink-0">
                    {item.badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </nav>

        {/* Footer actions & User info */}
        <div className="p-3 border-t border-[#E5E7E3] space-y-2">
          {userEmail && (
            <div className="px-2 py-1 text-[11px] text-[#667069] truncate" title={userEmail}>
              <span className="font-medium text-[#1C2321] block truncate">{userEmail}</span>
            </div>
          )}
          <PWAInstallButton variant="sidebar" />
          {onClearDemoData && (
            <button
              onClick={onClearDemoData}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-[6px] hover:bg-[#B3382C]/10 text-[#B3382C] text-[11px] transition font-medium"
            >
              <Trash2 className="w-3 h-3" />
              Elimina dati demo
            </button>
          )}
          <button
            onClick={onResetData}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-[6px] hover:bg-[#F6F7F5] text-[#667069] hover:text-[#1C2321] text-[11px] transition"
          >
            <RotateCcw className="w-3 h-3" />
            Ripristina demo
          </button>
          <button
            onClick={onSignOut}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-[6px] hover:bg-[#B3382C]/10 text-[#B3382C] text-[11px] font-medium transition"
          >
            <LogOut className="w-3 h-3" />
            Esci
          </button>
        </div>
      </aside>

      {/* Mobile Top Header & Bottom Bar */}
      <div className="md:hidden flex flex-col w-full">
        <header className="bg-white border-b border-[#E5E7E3] px-4 py-3 sticky top-0 z-40 flex items-center justify-between">
          <button 
            onClick={() => setActiveTab('landing')}
            className="font-semibold text-sm text-[#1F5F4A] flex items-center gap-1 hover:underline"
          >
            ← Home
          </button>
          <div className="flex items-center gap-2">
            <PWAInstallButton variant="compact" />
            <select
              value={currentBusiness?.id || ''}
              onChange={(e) => {
                if (e.target.value === 'add-new') {
                  onAddBusiness();
                } else {
                  onSelectBusiness(e.target.value);
                }
              }}
              className="input-field text-xs py-1 px-2"
            >
              {businesses.map((b) => (
                <option key={b.id} value={b.id}>{b.name} ({b.location})</option>
              ))}
              <option value="add-new">+ Aggiungi attività</option>
            </select>
            <button
              onClick={onSignOut}
              className="text-xs text-[#B3382C] font-medium p-1"
              title="Esci"
            >
              Esci
            </button>
          </div>
        </header>

        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E5E7E3] z-40 flex items-center justify-around py-2 px-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`relative flex flex-col items-center gap-0.5 py-1 px-2 rounded-[6px] transition ${
                  isActive ? 'text-[#1F5F4A] bg-[#E8F0EC]' : 'text-[#667069]'
                }`}
              >
                <div className="relative">
                  <Icon className="w-4 h-4" />
                  {item.criticalBadge && (
                    <span className="absolute -top-1 -right-2 px-1 py-0.2 rounded-full text-[9px] font-bold bg-[#B3382C] text-white">
                      {item.criticalBadge}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-medium">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </>
  );
};
