import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { ConnectionModal } from './components/ConnectionModal';
import { ReviewsTab } from './components/ReviewsTab';
import { RequestsTab } from './components/RequestsTab';
import { StatsTab } from './components/StatsTab';
import { SettingsTab } from './components/SettingsTab';
import { AdminAccessTab } from './components/AdminAccessTab';
import { Footer } from './components/Footer';
import { LandingPage } from './components/LandingPage';
import { AuthScreen } from './components/AuthScreen';
import { Business, Review, RequestItem } from './types';
import { getAppData, saveAppData, resetAppData, createBusinessInDb, loadDemoDataToDb } from './storage';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import { MessageSquare, Plus, RefreshCw, AlertCircle, Sparkles } from 'lucide-react';

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [authView, setAuthView] = useState<'login' | 'register' | 'forgot' | 'recovery'>('login');

  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [currentBusinessId, setCurrentBusinessId] = useState<string>('');
  const [reviews, setReviews] = useState<Review[]>([]);
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [activeTab, setActiveTab] = useState<string>('reviews');
  const [isConnectionModalOpen, setIsConnectionModalOpen] = useState<boolean>(false);
  
  const [dataLoading, setDataLoading] = useState<boolean>(false);
  const [dataError, setDataError] = useState<string | null>(null);

  // New business form state for empty state or modal
  const [showAddBusinessModal, setShowAddBusinessModal] = useState<boolean>(false);
  const [newBizName, setNewBizName] = useState<string>('');
  const [newBizCategory, setNewBizCategory] = useState<string>('');
  const [newBizLocation, setNewBizLocation] = useState<string>('');
  const [newBizSigner, setNewBizSigner] = useState<string>('');
  const [isSubmittingBiz, setIsSubmittingBiz] = useState<boolean>(false);

  const currentBusiness = businesses.find(b => b.id === currentBusinessId) || businesses[0] || null;

  useEffect(() => {
    try {
      supabase.auth.getSession().then(({ data }) => {
        setSession(data?.session || null);
        setAuthLoading(false);
      }).catch((err) => {
        console.error('Session error:', err);
        setAuthLoading(false);
      });

      const authStateRes = supabase.auth.onAuthStateChange((event, session) => {
        setSession(session);
        if (event === 'PASSWORD_RECOVERY') {
          setAuthView('recovery');
        }
        setAuthLoading(false);
      });

      const subscription = authStateRes?.data?.subscription;

      return () => {
        subscription?.unsubscribe();
      };
    } catch (err) {
      console.error('Auth setup error:', err);
      setAuthLoading(false);
    }
  }, []);

  const loadData = async () => {
    if (!session?.user?.id) return;
    setDataLoading(true);
    setDataError(null);
    try {
      const data = await getAppData(session.user.id);
      setBusinesses(data.businesses);
      setReviews(data.reviews);
      setRequests(data.requests);
      if (data.businesses.length > 0) {
        if (!currentBusinessId || !data.businesses.some(b => b.id === currentBusinessId)) {
          setCurrentBusinessId(data.businesses[0].id);
        }
      }
    } catch (err: any) {
      console.error(err);
      setDataError(err.message || 'Errore di connessione a Supabase.');
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    if (session?.user?.id) {
      loadData();
    }
  }, [session?.user?.id]);

  const handleUpdateBusiness = async (updated: Partial<Business>) => {
    if (!currentBusiness || !session?.user?.id) return;
    const updatedBusinesses = businesses.map(b => b.id === currentBusiness.id ? { ...b, ...updated } : b);
    setBusinesses(updatedBusinesses);
    try {
      await saveAppData(session.user.id, { businesses: updatedBusinesses, reviews, requests });
    } catch (err) {
      console.error('Failed to save business update:', err);
    }
  };

  const handleResetData = async () => {
    if (!session?.user?.id) return;
    if (!confirm('Ripristinare i dati demo? Verranno sostituiti i dati correnti.')) return;

    setDataLoading(true);
    try {
      const freshData = await resetAppData(session.user.id);
      setBusinesses(freshData.businesses);
      setReviews(freshData.reviews);
      setRequests(freshData.requests);
      if (freshData.businesses.length > 0) {
        setCurrentBusinessId(freshData.businesses[0].id);
      }
      alert('Dati demo ripristinati con successo!');
    } catch (err: any) {
      alert('Errore durante il ripristino: ' + (err.message || err));
    } finally {
      setDataLoading(false);
    }
  };

  const handleLoadDemoData = async () => {
    if (!session?.user?.id) return;
    setDataLoading(true);
    try {
      const data = await loadDemoDataToDb(session.user.id);
      setBusinesses(data.businesses);
      setReviews(data.reviews);
      setRequests(data.requests);
      if (data.businesses.length > 0) {
        setCurrentBusinessId(data.businesses[0].id);
      }
    } catch (err: any) {
      alert('Errore nel caricamento dati demo: ' + (err.message || err));
    } finally {
      setDataLoading(false);
    }
  };

  const handleCreateBusinessSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user?.id || !newBizName.trim()) return;

    setIsSubmittingBiz(true);
    try {
      const created = await createBusinessInDb(session.user.id, {
        name: newBizName,
        category: newBizCategory || 'Attività',
        location: newBizLocation || 'Città',
        signerName: newBizSigner || 'Staff',
      });
      const updatedBusinesses = [...businesses, created];
      setBusinesses(updatedBusinesses);
      setCurrentBusinessId(created.id);
      setNewBizName('');
      setNewBizCategory('');
      setNewBizLocation('');
      setNewBizSigner('');
      setShowAddBusinessModal(false);
    } catch (err: any) {
      alert('Errore durante la creazione dell\'attività: ' + (err.message || err));
    } finally {
      setIsSubmittingBiz(false);
    }
  };

  const handleRefreshReviews = async () => {
    if (!session?.user?.id) return;
    const data = await getAppData(session.user.id);
    setReviews(data.reviews);
  };

  const handleRefreshRequests = async () => {
    if (!session?.user?.id) return;
    const data = await getAppData(session.user.id);
    setRequests(data.requests);
  };

  const currentReviews = reviews.filter(r => r.businessId === currentBusiness?.id);
  const currentRequests = requests.filter(r => r.businessId === currentBusiness?.id);

  if (activeTab === 'landing') {
    return <LandingPage onOpenDashboard={() => setActiveTab('reviews')} />;
  }

  // If Supabase is not configured
  if (!isSupabaseConfigured) {
    return (
      <div className="min-h-screen bg-[#F6F7F5] flex items-center justify-center p-4 font-sans text-[#1C2321]">
        <div className="max-w-md w-full panel-card p-8 space-y-4 text-center bg-white shadow-sm">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#B3382C]/10 text-[#B3382C] mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h1 className="text-lg font-bold text-[#1C2321]">Configurazione Supabase Mancante</h1>
          <p className="text-xs text-[#667069] leading-relaxed">
            Per utilizzare ReviewDesk è necessario configurare le variabili d'ambiente <code className="bg-[#F6F7F5] px-1 py-0.5 rounded font-mono text-[11px]">VITE_SUPABASE_URL</code> e <code className="bg-[#F6F7F5] px-1 py-0.5 rounded font-mono text-[11px]">VITE_SUPABASE_ANON_KEY</code> nel file <code className="bg-[#F6F7F5] px-1 py-0.5 rounded font-mono text-[11px]">.env</code> o nelle impostazioni di Vercel.
          </p>
        </div>
      </div>
    );
  }

  // Loading initial session state without flashing login
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#F6F7F5] flex items-center justify-center font-sans text-[#1C2321]">
        <p className="text-xs text-[#667069]">Caricamento sessione in corso...</p>
      </div>
    );
  }

  // Without session, show AuthScreen
  if (!session) {
    return <AuthScreen initialView={authView} />;
  }

  if (dataLoading && businesses.length === 0) {
    return (
      <div className="min-h-screen bg-[#F6F7F5] flex items-center justify-center font-sans text-[#1C2321]">
        <div className="text-center space-y-2">
          <RefreshCw className="w-6 h-6 animate-spin text-[#1F5F4A] mx-auto" />
          <p className="text-xs text-[#667069]">Caricamento dati da Supabase...</p>
        </div>
      </div>
    );
  }

  if (dataError) {
    return (
      <div className="min-h-screen bg-[#F6F7F5] flex items-center justify-center p-4 font-sans text-[#1C2321]">
        <div className="max-w-md w-full panel-card p-6 space-y-4 text-center bg-white">
          <AlertCircle className="w-8 h-8 text-[#B3382C] mx-auto" />
          <h2 className="font-semibold text-sm text-[#1C2321]">Errore di caricamento</h2>
          <p className="text-xs text-[#667069]">{dataError}</p>
          <button
            onClick={loadData}
            className="btn-primary px-4 py-2 text-xs w-full"
          >
            Riprova
          </button>
        </div>
      </div>
    );
  }

  // Primo accesso senza attività (Empty state)
  if (businesses.length === 0) {
    return (
      <div className="min-h-screen bg-[#F6F7F5] flex items-center justify-center p-4 font-sans text-[#1C2321]">
        <div className="max-w-lg w-full panel-card p-8 space-y-6 bg-white shadow-sm">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#E8F0EC] text-[#1F5F4A]">
              <Sparkles className="w-6 h-6" />
            </div>
            <h1 className="text-lg font-bold text-[#1C2321]">Benvenuto in ReviewDesk</h1>
            <p className="text-xs text-[#667069]">
              Non hai ancora configurato alcuna attività. Crea la tua prima attività o carica i dati demo per iniziare subito.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleLoadDemoData}
              className="btn-secondary flex-1 py-2.5 text-xs font-medium flex items-center justify-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Carica dati demo
            </button>
          </div>

          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-[#E5E7E3]"></div>
            <span className="flex-shrink mx-4 text-[11px] text-[#667069] uppercase font-medium">oppure crea nuova</span>
            <div className="flex-grow border-t border-[#E5E7E3]"></div>
          </div>

          <form onSubmit={handleCreateBusinessSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-[#667069] block">Nome attività</label>
              <input
                type="text"
                required
                value={newBizName}
                onChange={(e) => setNewBizName(e.target.value)}
                placeholder="es. Osteria Centrale"
                className="input-field w-full text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-[#667069] block">Tipo / Categoria</label>
                <input
                  type="text"
                  required
                  value={newBizCategory}
                  onChange={(e) => setNewBizCategory(e.target.value)}
                  placeholder="es. Ristorante"
                  className="input-field w-full text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-[#667069] block">Città / Località</label>
                <input
                  type="text"
                  required
                  value={newBizLocation}
                  onChange={(e) => setNewBizLocation(e.target.value)}
                  placeholder="es. Lugano"
                  className="input-field w-full text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-[#667069] block">Nome firmatario risposte</label>
              <input
                type="text"
                required
                value={newBizSigner}
                onChange={(e) => setNewBizSigner(e.target.value)}
                placeholder="es. Chef Marco"
                className="input-field w-full text-xs"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmittingBiz}
              className="btn-primary w-full py-2.5 text-xs font-medium disabled:opacity-50"
            >
              {isSubmittingBiz ? 'Creazione in corso...' : 'Crea la tua attività'}
            </button>
          </form>

          <div className="text-center pt-2">
            <button
              onClick={() => supabase.auth.signOut()}
              className="text-xs text-[#B3382C] font-medium hover:underline"
            >
              Esci dall'account
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F7F5] text-[#1C2321] flex flex-col md:flex-row font-sans">
      <Sidebar
        businesses={businesses}
        currentBusiness={currentBusiness}
        onSelectBusiness={(id) => setCurrentBusinessId(id)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onResetData={handleResetData}
        onOpenConnectionModal={() => setIsConnectionModalOpen(true)}
        userEmail={session.user.email}
        onSignOut={() => supabase.auth.signOut()}
        onAddBusiness={() => setShowAddBusinessModal(true)}
      />

      <main className="flex-1 flex flex-col min-w-0 pb-16 md:pb-0 overflow-y-auto">
        <div className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto space-y-6">
          {activeTab === 'reviews' && currentBusiness && (
            <ReviewsTab
              key={currentBusiness.id}
              business={currentBusiness}
              reviews={currentReviews}
              onRefreshReviews={handleRefreshReviews}
            />
          )}

          {activeTab === 'requests' && currentBusiness && (
            <RequestsTab
              key={currentBusiness.id}
              business={currentBusiness}
              requests={currentRequests}
              onRefreshRequests={handleRefreshRequests}
              onUpdateBusiness={handleUpdateBusiness}
            />
          )}

          {activeTab === 'stats' && currentBusiness && (
            <StatsTab
              key={currentBusiness.id}
              business={currentBusiness}
              reviews={currentReviews}
            />
          )}

          {activeTab === 'settings' && currentBusiness && (
            <SettingsTab
              key={currentBusiness.id}
              business={currentBusiness}
              onUpdateBusiness={handleUpdateBusiness}
            />
          )}

          {activeTab === 'admin_access' && (
            <AdminAccessTab userEmail={session?.user?.email || ''} />
          )}
        </div>

        <Footer />
      </main>

      <ConnectionModal
        isOpen={isConnectionModalOpen}
        onClose={() => setIsConnectionModalOpen(false)}
        business={currentBusiness}
        onUpdateBusiness={handleUpdateBusiness}
      />

      {/* Add Business Modal */}
      {showAddBusinessModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[8px] max-w-md w-full p-6 space-y-4 shadow-lg">
            <h3 className="font-semibold text-sm text-[#1C2321]">Aggiungi nuova attività</h3>
            <form onSubmit={handleCreateBusinessSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-[#667069] block">Nome attività</label>
                <input
                  type="text"
                  required
                  value={newBizName}
                  onChange={(e) => setNewBizName(e.target.value)}
                  placeholder="es. Bar Centrale"
                  className="input-field w-full text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-[#667069] block">Categoria</label>
                  <input
                    type="text"
                    required
                    value={newBizCategory}
                    onChange={(e) => setNewBizCategory(e.target.value)}
                    placeholder="es. Bar & Caffè"
                    className="input-field w-full text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-[#667069] block">Località</label>
                  <input
                    type="text"
                    required
                    value={newBizLocation}
                    onChange={(e) => setNewBizLocation(e.target.value)}
                    placeholder="es. Lugano"
                    className="input-field w-full text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-[#667069] block">Firmatario risposte</label>
                <input
                  type="text"
                  required
                  value={newBizSigner}
                  onChange={(e) => setNewBizSigner(e.target.value)}
                  placeholder="es. Direzione"
                  className="input-field w-full text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddBusinessModal(false)}
                  className="btn-secondary px-3 py-1.5 text-xs"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingBiz}
                  className="btn-primary px-4 py-1.5 text-xs"
                >
                  {isSubmittingBiz ? 'Creazione...' : 'Crea'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
