import React from 'react';
import { 
  MessageSquare, 
  Send, 
  BarChart3, 
  Settings, 
  Store, 
  CheckCircle2, 
  AlertCircle, 
  RotateCcw,
  ShieldCheck,
  ChevronDown
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
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-72 bg-slate-900 text-slate-100 border-r border-slate-800 shrink-0">
        {/* App Brand */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-400 flex items-center justify-center shadow-lg shadow-amber-500/20 text-slate-950 font-black text-xl">
              R
            </div>
            <div>
              <h1 className="font-bold text-lg tracking-tight text-white flex items-center gap-1.5">
                ReviewDesk
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-medium border border-amber-500/30">
                  Ticino
                </span>
              </h1>
              <p className="text-xs text-slate-400">Google Reviews Assistant</p>
            </div>
          </div>
        </div>

        {/* Business Selector */}
        <div className="p-4 border-b border-slate-800 bg-slate-950/40">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">
            Attività Attiva
          </label>
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 transition text-left"
            >
              <div className="flex items-center gap-3 min-w-0">
                <Store className="w-5 h-5 text-amber-400 shrink-0" />
                <div className="min-w-0">
                  <p className="font-semibold text-sm text-white truncate">
                    {currentBusiness?.name || 'Seleziona attività'}
                  </p>
                  <p className="text-xs text-slate-400 truncate">
                    {currentBusiness?.category} ({currentBusiness?.location})
                  </p>
                </div>
              </div>
              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {dropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden">
                {businesses.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => {
                      onSelectBusiness(b.id);
                      setDropdownOpen(false);
                    }}
                    className={`w-full text-left p-3 hover:bg-slate-700/80 transition flex items-center justify-between ${
                      b.id === currentBusiness?.id ? 'bg-amber-500/10 text-amber-400 font-medium' : 'text-slate-200'
                    }`}
                  >
                    <div>
                      <p className="text-sm font-semibold">{b.name}</p>
                      <p className="text-xs text-slate-400">{b.location}</p>
                    </div>
                    {b.id === currentBusiness?.id && (
                      <div className="w-2 h-2 rounded-full bg-amber-400"></div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Connection Status Badge */}
          <div className="mt-3 flex items-center justify-between bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
            <div className="flex items-center gap-2">
              {currentBusiness?.isConnected ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="text-xs font-medium text-emerald-300">Profilo Connesso (demo)</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="text-xs font-medium text-amber-300">Non connesso</span>
                </>
              )}
            </div>
            <button
              onClick={onOpenConnectionModal}
              className="text-xs text-amber-400 hover:text-amber-300 underline font-medium"
            >
              Gestisci
            </button>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition ${
                  isActive
                    ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20 font-semibold'
                    : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-slate-950' : 'text-slate-400'}`} />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Footer actions inside sidebar */}
        <div className="p-4 border-t border-slate-800 space-y-3">
          <button
            onClick={onResetData}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium transition border border-slate-700"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Ripristina dati demo
          </button>
          <div className="flex items-center gap-2 text-[11px] text-slate-500 px-1">
            <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
            <span>Google Business Profile (Simulato)</span>
          </div>
        </div>
      </aside>

      {/* Mobile Bottom Navigation & Top Header */}
      <div className="md:hidden flex flex-col w-full">
        {/* Mobile Top Bar */}
        <header className="bg-slate-900 border-b border-slate-800 p-4 sticky top-0 z-40 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center text-slate-950 font-black">
              R
            </div>
            <div>
              <span className="font-bold text-white text-base">ReviewDesk</span>
              <span className="text-[10px] ml-1.5 px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400">Ticino</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={currentBusiness?.id}
              onChange={(e) => onSelectBusiness(e.target.value)}
              className="bg-slate-800 text-white text-xs py-1.5 px-2.5 rounded-lg border border-slate-700 font-medium"
            >
              {businesses.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        </header>

        {/* Mobile Bottom Bar */}
        <nav className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 z-40 flex items-center justify-around py-2 px-2 shadow-2xl">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex flex-col items-center gap-1 py-1 px-3 rounded-lg transition ${
                  isActive ? 'text-amber-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-amber-400' : 'text-slate-400'}`} />
                <span className="text-[10px]">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </>
  );
};
