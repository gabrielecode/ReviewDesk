import React, { useState, useEffect } from 'react';
import { X, ExternalLink, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { Business } from '../types';
import { getAuthToken } from '../lib/supabase';

interface ConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  business: Business | null;
  onUpdateBusiness: (updated: Partial<Business>) => void | Promise<void>;
  onNavigateToSettings?: () => void;
  onRefreshReviews?: () => void | Promise<void>;
  onImportReviews?: (imported: any[], businessId: string, updatedFields?: Partial<Business>) => void | Promise<void>;
}

export const ConnectionModal: React.FC<ConnectionModalProps> = ({
  isOpen,
  onClose,
  business,
  onUpdateBusiness,
  onRefreshReviews,
  onImportReviews
}) => {
  if (!isOpen || !business) return null;

  const [placeId, setPlaceId] = useState(business.googlePlaceId || '');
  const [reviewUrl, setReviewUrl] = useState(business.googleUrl || '');
  const [accountId, setAccountId] = useState(business.googleAccountId || '');
  const [locationId, setLocationId] = useState(business.googleLocationId || '');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<{ type: 'success' | 'error', msg: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setPlaceId(business.googlePlaceId || '');
    setReviewUrl(business.googleUrl || '');
    setAccountId(business.googleAccountId || '');
    setLocationId(business.googleLocationId || '');
    setSyncStatus(null);
  }, [business, isOpen]);

  const handleToggleConnection = async () => {
    try {
      await onUpdateBusiness({
        isConnected: !business.isConnected,
        googlePlaceId: placeId,
        googleUrl: reviewUrl,
        googleAccountId: accountId,
        googleLocationId: locationId,
      });
    } catch (err: any) {
      setSyncStatus({ type: 'error', msg: err.message || 'Errore durante l\'aggiornamento.' });
    }
  };

  const handleSaveModal = async () => {
    setIsSaving(true);
    setSyncStatus(null);
    try {
      await onUpdateBusiness({
        googlePlaceId: placeId,
        googleUrl: reviewUrl,
        googleAccountId: accountId,
        googleLocationId: locationId
      });
      onClose();
    } catch (err: any) {
      setSyncStatus({ type: 'error', msg: err.message || 'Errore nel salvataggio.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSyncNow = async () => {
    setIsSyncing(true);
    setSyncStatus(null);

    try {
      const token = await getAuthToken();
      const res = await fetch('/api/sync-google-reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          businessId: business.id,
          googlePlaceId: placeId,
          googleUrl: reviewUrl,
          businessName: business.name,
          location: business.location,
          apiKey: business.googleApiKey
        })
      });

      const data = await res.json().catch(() => ({ success: false, message: 'Errore risposta server' }));

      if (!res.ok || data.success === false) {
        setSyncStatus({ type: 'error', msg: data.message || 'Errore durante la sincronizzazione.' });
        return;
      }

      if (onImportReviews) {
        await onImportReviews(data.reviews || [], business.id, {
          isConnected: true,
          lastSyncAt: data.lastSyncAt,
          googlePlaceId: data.googlePlaceId,
          googleUrl: data.resolvedUrl
        });
      }
      
      if (data.resolvedUrl) setReviewUrl(data.resolvedUrl);
      if (data.googlePlaceId) setPlaceId(data.googlePlaceId);
      if (onRefreshReviews) await onRefreshReviews();

      setSyncStatus({ type: 'success', msg: data.message || 'Sincronizzazione completata.' });
    } catch (err: any) {
      console.error(err);
      setSyncStatus({ type: 'error', msg: `Errore di rete: ${err.message}` });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white border border-[#E5E7E3] rounded-[8px] w-full max-w-lg overflow-hidden shadow-lg p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-[#E5E7E3] pb-3">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${business.isConnected ? 'bg-[#1F5F4A]' : 'bg-[#B3382C]'}`}></span>
            <h3 className="font-semibold text-sm text-[#1C2321]">Integrazione Google Business Profile</h3>
          </div>
          <button onClick={onClose} className="text-[#667069] hover:text-[#1C2321] p-1 rounded-[6px] hover:bg-[#F6F7F5] transition"><X className="w-4 h-4" /></button>
        </div>

        <div className="p-3 rounded-[6px] bg-[#F6F7F5] border border-[#E5E7E3] flex items-center justify-between text-xs">
          <div><p className="font-medium text-[#1C2321]">{business.name}</p><p className="text-[11px] text-[#667069]">{business.location}</p></div>
          <span className={`px-2.5 py-1 rounded-full text-[11px] font-medium ${business.isConnected ? 'bg-[#E8F0EC] text-[#1F5F4A]' : 'bg-[#B3382C]/10 text-[#B3382C]'}`}>{business.isConnected ? 'Profilo Connesso' : 'Non Connesso'}</span>
        </div>

        {syncStatus && (
          <div className={`p-2.5 rounded-[6px] border text-[11px] flex items-center gap-2 ${syncStatus.type === 'error' ? 'bg-[#B3382C]/10 border-[#B3382C]/30 text-[#B3382C]' : 'bg-[#E8F0EC] border-[#1F5F4A]/30 text-[#1F5F4A]'}`}>
            {syncStatus.type === 'error' ? <AlertCircle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
            <span>{syncStatus.msg}</span>
          </div>
        )}

        <div className="space-y-3 text-xs">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="font-medium text-[#1C2321]">Google Place ID</label>
              <a href="https://developers.google.com/maps/documentation/javascript/examples/places-placeid-finder" target="_blank" rel="noreferrer" className="text-[11px] text-[#1F5F4A] hover:underline flex items-center gap-0.5">Trova Place ID <ExternalLink className="w-3 h-3" /></a>
            </div>
            <input type="text" value={placeId} onChange={(e) => setPlaceId(e.target.value)} placeholder="es. ChIJ..." className="input-field w-full text-xs font-mono" />
          </div>

          <div className="space-y-1">
            <label className="font-medium text-[#1C2321]">Link Diretto Recensioni Google</label>
            <input type="url" value={reviewUrl} onChange={(e) => setReviewUrl(e.target.value)} placeholder="https://..." className="input-field w-full text-xs font-mono" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><label className="font-medium text-[#667069]">Account ID</label><input type="text" value={accountId} onChange={(e) => setAccountId(e.target.value)} className="input-field w-full text-xs font-mono" /></div>
            <div className="space-y-1"><label className="font-medium text-[#667069]">Location ID</label><input type="text" value={locationId} onChange={(e) => setLocationId(e.target.value)} className="input-field w-full text-xs font-mono" /></div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-3 border-t border-[#E5E7E3]">
          <button type="button" onClick={handleSyncNow} disabled={isSyncing} className="btn-secondary px-3 py-1.5 text-xs flex items-center gap-1.5 w-full sm:w-auto"><RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-[#1F5F4A]' : ''}`} />{isSyncing ? 'Sincronizzando...' : 'Sincronizza Ora'}</button>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button onClick={handleToggleConnection} className={`px-3 py-1.5 text-xs rounded-[6px] font-medium transition ${business.isConnected ? 'bg-[#B3382C]/10 text-[#B3382C] hover:bg-[#B3382C]/20' : 'btn-primary'}`}>{business.isConnected ? 'Scollega' : 'Connetti'}</button>
            <button onClick={handleSaveModal} disabled={isSaving} className="btn-primary px-4 py-1.5 text-xs font-medium disabled:opacity-50">{isSaving ? 'Salvataggio...' : 'Salva e Chiudi'}</button>
          </div>
        </div>
      </div>
    </div>
  );
};
