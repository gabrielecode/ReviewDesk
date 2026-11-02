import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { ConnectionModal } from './components/ConnectionModal';
import { ReviewsTab } from './components/ReviewsTab';
import { RequestsTab } from './components/RequestsTab';
import { StatsTab } from './components/StatsTab';
import { SettingsTab } from './components/SettingsTab';
import { Footer } from './components/Footer';
import { Business, Review, RequestItem } from './types';
import { getAppData, saveAppData, resetAppData } from './storage';

export default function App() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [currentBusinessId, setCurrentBusinessId] = useState<string>('osteria-demo');
  const [reviews, setReviews] = useState<Review[]>([]);
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [activeTab, setActiveTab] = useState<string>('reviews');
  const [isConnectionModalOpen, setIsConnectionModalOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  const currentBusiness = businesses.find(b => b.id === currentBusinessId) || null;

  const loadData = () => {
    const data = getAppData();
    setBusinesses(data.businesses);
    setReviews(data.reviews);
    setRequests(data.requests);
    if (data.businesses.length > 0 && !currentBusinessId) {
      setCurrentBusinessId(data.businesses[0].id);
    }
  };

  useEffect(() => {
    loadData();
    setLoading(false);
  }, []);

  const handleUpdateBusiness = (updated: Partial<Business>) => {
    if (!currentBusinessId) return;
    const data = getAppData();
    const updatedBusinesses = data.businesses.map(b => b.id === currentBusinessId ? { ...b, ...updated } : b);
    const newData = { ...data, businesses: updatedBusinesses };
    saveAppData(newData);
    setBusinesses(updatedBusinesses);
  };

  const handleResetData = () => {
    if (!currentBusinessId) return;
    const currentBiz = businesses.find(b => b.id === currentBusinessId);
    if (!confirm(`Vuoi ripristinare i dati demo iniziali per ${currentBiz?.name || 'questa attività'}?`)) return;

    const freshData = resetAppData();
    setBusinesses(freshData.businesses);
    setReviews(freshData.reviews);
    setRequests(freshData.requests);
    alert('Dati demo ripristinati con successo!');
  };

  const handleRefreshReviews = () => {
    const data = getAppData();
    setReviews(data.reviews);
  };

  const handleRefreshRequests = () => {
    const data = getAppData();
    setRequests(data.requests);
  };

  const currentReviews = reviews.filter(r => r.businessId === currentBusinessId);
  const currentRequests = requests.filter(r => r.businessId === currentBusinessId);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-100">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500 flex items-center justify-center text-slate-950 font-black text-2xl animate-pulse shadow-lg shadow-amber-500/20">
            R
          </div>
          <p className="text-sm font-medium text-slate-400">Caricamento ReviewDesk...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row font-sans selection:bg-amber-500 selection:text-slate-950">
      <Sidebar
        businesses={businesses}
        currentBusiness={currentBusiness}
        onSelectBusiness={(id) => setCurrentBusinessId(id)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onResetData={handleResetData}
        onOpenConnectionModal={() => setIsConnectionModalOpen(true)}
      />

      <main className="flex-1 flex flex-col min-w-0 pb-24 md:pb-0 overflow-y-auto">
        <div className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto space-y-6">
          {activeTab === 'reviews' && currentBusiness && (
            <ReviewsTab
              business={currentBusiness}
              reviews={currentReviews}
              onRefreshReviews={handleRefreshReviews}
            />
          )}

          {activeTab === 'requests' && currentBusiness && (
            <RequestsTab
              business={currentBusiness}
              requests={currentRequests}
              onRefreshRequests={handleRefreshRequests}
              onUpdateBusiness={handleUpdateBusiness}
            />
          )}

          {activeTab === 'stats' && currentBusiness && (
            <StatsTab
              business={currentBusiness}
              reviews={currentReviews}
            />
          )}

          {activeTab === 'settings' && currentBusiness && (
            <SettingsTab
              business={currentBusiness}
              onUpdateBusiness={handleUpdateBusiness}
            />
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
    </div>
  );
}
