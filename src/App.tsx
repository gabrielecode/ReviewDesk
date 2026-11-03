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
import { getAppData, saveBusiness, createBusinessInDb, getReviewsForBusinesses, getRequestsForBusinesses } from './storage';
import { auth } from './lib/firebase';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { AlertCircle, RefreshCw, Sparkles, X } from 'lucide-react';

const STORAGE_KEY = 'reviewdesk.currentBusinessId';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [authView, setAuthView] = useState<'login' | 'register' | 'forgot' | 'recovery'>('login');

  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [currentBusinessId, setCurrentBusinessId] = useState<string>(localStorage.getItem(STORAGE_KEY) || '');
  const [reviews, setReviews] = useState<Review[]>([]);
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [activeTab, setActiveTab] = useState<string>('reviews');
  const [isConnectionModalOpen, setIsConnectionModalOpen] = useState<boolean>(false);
  
  const [dataLoading, setDataLoading] = useState<boolean>(false);
  const [dataError, setDataError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [showAddBusinessModal, setShowAddBusinessModal] = useState<boolean>(false);
  const [newBizName, setNewBizName] = useState<string>('');
  const [newBizCategory, setNewBizCategory] = useState<string>('');
  const [newBizLocation, setNewBizLocation] = useState<string>('');
  const [newBizSigner, setNewBizSigner] = useState<string>('');
  const [isSubmittingBiz, setIsSubmittingBiz] = useState<boolean>(false);

  const currentBusiness = businesses.find(b => b.id === currentBusinessId) || businesses[0] || null;

  useEffect(() => {
    if (currentBusinessId) {
      localStorage.setItem(STORAGE_KEY, currentBusinessId);
    }
  }, [currentBusinessId]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch {}
    setUser(null);
  };

  const loadData = async () => {
    if (!auth.currentUser) return;
    setDataLoading(true);
    setDataError(null);
    try {
      const data = await getAppData(auth.currentUser.uid);
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
      setDataError(err.message || 'Errore di caricamento dati dal server.');
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const handleUpdateBusiness = async (updated: Partial<Business>) => {
    if (!currentBusiness || !user) return;
    const originalBusinesses = [...businesses];
    const updatedBusinesses = businesses.map(b => b.id === currentBusiness.id ? { ...b, ...updated } : b);
    setBusinesses(updatedBusinesses);
    setSaveError(null);
    
    try {
      const bizToSave = updatedBusinesses.find(b => b.id === currentBusiness.id)!;
      await saveBusiness(user.uid, bizToSave);
    } catch (err: any) {
      console.error('Failed to save business update:', err);
      setBusinesses(originalBusinesses);
      setSaveError(err.message || 'Errore nel salvataggio delle modifiche.');
      throw err;
    }
  };

  const handleImportReviews = async (_newReviews: Review[], businessId: string, updatedBusinessFields?: Partial<Business>) => {
    if (!user) return;

    if (updatedBusinessFields) {
      setBusinesses(prev => prev.map(b => b.id === businessId ? { ...b, ...updatedBusinessFields } : b));
    }

    try {
      const fetchedReviews = await getReviewsForBusinesses([businessId]);
      setReviews(prev => {
        const others = prev.filter(r => r.businessId !== businessId);
        return [...others, ...fetchedReviews];
      });
    } catch (err: any) {
      console.error('Failed to reload reviews after import:', err);
      setSaveError(err.message || 'Errore nel ricaricamento delle recensioni.');
    }
  };

  const handleCreateBusinessSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newBizName.trim()) return;

    setIsSubmittingBiz(true);
    try {
      const created = await createBusinessInDb(user.uid, {
        name: newBizName,
        category: newBizCategory || 'Attività',
        location: newBizLocation || 'Città',
        signerName: newBizSigner || 'Staff',
      });
      setBusinesses(prev => [...prev, created]);
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
    if (!user || !currentBusinessId) return;
    try {
      const fetched = await getReviewsForBusinesses([currentBusinessId]);
      setReviews(prev => {
        const others = prev.filter(r => r.businessId !== currentBusinessId);
        return [...others, ...fetched];
      });
    } catch (err: any) {
      setSaveError(err.message || 'Errore nel ricaricamento delle recensioni.');
    }
  };

  const handleRefreshRequests = async () => {
    if (!user || !currentBusinessId) return;
    try {
      const fetched = await getRequestsForBusinesses([currentBusinessId]);
      setRequests(prev => {
        const others = prev.filter(r => r.businessId !== currentBusinessId);
        return [...others, ...fetched];
      });
    } catch (err: any) {
      setSaveError(err.message || 'Errore nel ricaricamento delle richieste.');
    }
  };

  const handleResetDemoData = async () => {
    // In this version, we don't have local demo data reset, but we could implement it
    loadData();
  };

  const currentReviews = reviews.filter(r => r.businessId === currentBusiness?.id);
  const currentRequests = requests.filter(r => r.businessId === currentBusiness?.id);

  if (activeTab === 'landing') {
    return <LandingPage onOpenDashboard={() => setActiveTab('reviews')} />;
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#F6F7F5] flex items-center justify-center font-sans text-[#1C2321]">
        <p className="text-xs text-[#667069]">Caricamento sessione in corso...</p>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen initialView={authView} onAuthSuccess={(u) => setUser(u)} />;
  }

  if (dataLoading && businesses.length === 0) {
    return (
      <div className="min-h-screen bg-[#F6F7F5] flex items-center justify-center font-sans text-[#1C2321]">
        <div className="text-center space-y-2">
          <RefreshCw className="w-6 h-6 animate-spin text-[#1F5F4A] mx-auto" />
          <p className="text-xs text-[#667069]">Caricamento dati dal server...</p>
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
              Non hai ancora configurato alcuna attività. Crea la tua prima attività per iniziare.
            </p>
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

          <div className="pt-2 space-y-3 text-center">
            <button
              onClick={handleSignOut}
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
        onResetData={handleResetDemoData}
        onClearDemoData={() => loadData()}
        onOpenConnectionModal={() => setIsConnectionModalOpen(true)}
        userEmail={user.email || ''}
        onSignOut={handleSignOut}
        onAddBusiness={() => setShowAddBusinessModal(true)}
      />

      <main className="flex-1 flex flex-col min-w-0 pb-16 md:pb-0 overflow-y-auto">
        <div className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto space-y-6">
          {saveError && (
            <div className="bg-[#B3382C] text-white p-3 rounded-[6px] flex items-center justify-between shadow-sm animate-in fade-in slide-in-from-top-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                <span className="text-xs font-medium">{saveError}</span>
              </div>
              <button 
                onClick={() => setSaveError(null)}
                className="p-1 hover:bg-white/10 rounded transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {activeTab === 'reviews' && currentBusiness && (
            <ReviewsTab
              key={currentBusiness.id}
              business={currentBusiness}
              reviews={currentReviews}
              onRefreshReviews={handleRefreshReviews}
              onImportReviews={handleImportReviews}
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
              onRefreshReviews={handleRefreshReviews}
              onImportReviews={handleImportReviews}
              onClearDemoData={() => loadData()}
              onResetData={handleResetDemoData}
            />
          )}

          {activeTab === 'admin_access' && (
            <AdminAccessTab userEmail={user.email || ''} />
          )}
        </div>

        <Footer />
      </main>

      <ConnectionModal
        isOpen={isConnectionModalOpen}
        onClose={() => setIsConnectionModalOpen(false)}
        business={currentBusiness}
        onUpdateBusiness={handleUpdateBusiness}
        onRefreshReviews={handleRefreshReviews}
        onImportReviews={handleImportReviews}
        onNavigateToSettings={() => {
          setIsConnectionModalOpen(false);
          setActiveTab('settings');
        }}
      />

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
