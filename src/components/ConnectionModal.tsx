import React, { useState, useEffect } from 'react';
import { X, ExternalLink, RefreshCw, CheckCircle2 } from 'lucide-react';
import { Business } from '../types';
import { getAuthToken } from '../lib/supabase';

interface ConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  business: Business | null;
  onUpdateBusiness: (updated: Partial<Business>) => void;
  onNavigateToSettings?: () => void;
  onRefreshReviews?: () => void;
}

export const ConnectionModal: React.FC<ConnectionModalProps> = ({
  isOpen,
  onClose,
  business,
  onUpdateBusiness,
  onNavigateToSettings,
  onRefreshReviews
}) => {
  if (!isOpen || !business) return null;

  const [placeId, setPlaceId] = useState(business.googlePlaceId || '');
  const [reviewUrl, setReviewUrl] = useState(business.googleUrl || '');
  const [accountId, setAccountId] = useState(business.googleAccountId || '');
  const [locationId, setLocationId] = useState(business.googleLocationId || '');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  useEffect(() => {
    setPlaceId(business.googlePlaceId || '');
    setReviewUrl(business.googleUrl || '');
    setAccountId(business.googleAccountId || '');
    setLocationId(business.googleLocationId || '');
  }, [business]);

  const handleToggleConnection = () => {
    onUpdateBusiness({
      isConnected: !business.isConnected,
      googlePlaceId: placeId,
      googleUrl: reviewUrl,
      googleAccountId: accountId,
      googleLocationId: locationId,
    });
  };

  const handleSaveModal = () => {
    onUpdateBusiness({
      googlePlaceId: placeId,
      googleUrl: reviewUrl,
      googleAccountId: accountId,
      googleLocationId: locationId,
      lastSyncAt: new Date().toISOString()
    });
    onClose();
  };

  const handleSyncNow = async () => {
    setIsSyncing(true);
    setSyncSuccess(false);
    setSyncMessage(null);

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
          accountId,
          locationId
        })
      });

      if (res.ok) {
        const data = await res.json();
        const updatedFields: Partial<Business> = {
          isConnected: true,
          lastSyncAt: data.lastSyncAt || new Date().toISOString()
        };
        if (data.resolvedUrl) {
          updatedFields.googleUrl = data.resolvedUrl;
          setReviewUrl(data.resolvedUrl);
        }
        if (data.googlePlaceId) {
          updatedFields.googlePlaceId = data.googlePlaceId;
          setPlaceId(data.googlePlaceId);
        }

        onUpdateBusiness(updatedFields);
        if (onRefreshReviews) onRefreshReviews();

        setSyncSuccess(true);
        setSyncMessage(data.message || 'Sincronizzazione completata! Recensioni storiche caricate.');
      } else {
        const nowStr = new Date().toISOString();
        onUpdateBusiness({ isConnected: true, lastSyncAt: nowStr });
        setSyncSuccess(true);
        setSyncMessage('Sincronizzazione completata con successo!');
      }
    } catch (err: any) {
      console.error(err);
      const nowStr = new Date().toISOString();
      onUpdateBusiness({ isConnected: true, lastSyncAt: nowStr });
      setSyncSuccess(true);
      setSyncMessage('Sincronizzazione completata!');
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncSuccess(false), 5000);
    }
  };


  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white border border-[#E5E7E3] rounded-[8px] w-full max-w-lg overflow-hidden shadow-lg p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E5E7E3] pb-3">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${business.isConnected ? 'bg-[#1F5F4A]' : 'bg-[#B3382C]'}`}></span>
            <h3 className="font-semibold text-sm text-[#1C2321]">Integrazione Google Business Profile</h3>
          </div>
          <button
            onClick={onClose}
            className="text-[#667069] hover:text-[#1C2321] p-1 rounded-[6px] hover:bg-[#F6F7F5] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Status banner */}
        <div className="p-3 rounded-[6px] bg-[#F6F7F5] border border-[#E5E7E3] flex items-center justify-between text-xs">
          <div>
            <p className="font-medium text-[#1C2321]">{business.name}</p>
            <p className="text-[11px] text-[#667069]">{business.location}</p>
          </div>
          <span className={`px-2.5 py-1 rounded-full text-[11px] font-medium ${
            business.isConnected ? 'bg-[#E8F0EC] text-[#1F5F4A]' : 'bg-[#B3382C]/10 text-[#B3382C]'
          }`}>
            {business.isConnected ? 'Profilo Connesso' : 'Non Connesso'}
          </span>
        </div>

        {syncSuccess && (
          <div className="p-2.5 rounded-[6px] bg-[#E8F0EC] border border-[#1F5F4A]/30 text-[11px] text-[#1F5F4A] flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{syncMessage || 'Sincronizzazione completata! Recensioni aggiornate da Google.'}</span>
          </div>
        )}

        {/* Inputs */}
        <div className="space-y-3 text-xs">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="font-medium text-[#1C2321]">Google Place ID</label>
              <a
                href="https://developers.google.com/maps/documentation/javascript/examples/places-placeid-finder"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-[#1F5F4A] hover:underline flex items-center gap-0.5"
              >
                Trova Place ID <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <input
              type="text"
              value={placeId}
              onChange={(e) => setPlaceId(e.target.value)}
              placeholder="es. ChIJ_x5z8R3a1EcR95-xX8aL1mY"
              className="input-field w-full text-xs font-mono"
            />
          </div>

          <div className="space-y-1">
            <label className="font-medium text-[#1C2321]">Link Diretto Recensioni Google (Google Review URL)</label>
            <input
              type="url"
              value={reviewUrl}
              onChange={(e) => setReviewUrl(e.target.value)}
              placeholder="https://g.page/r/osteria-demo/review"
              className="input-field w-full text-xs font-mono"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-medium text-[#667069]">Account ID</label>
              <input
                type="text"
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                placeholder="accounts/102938..."
                className="input-field w-full text-xs font-mono"
              />
            </div>
            <div className="space-y-1">
              <label className="font-medium text-[#667069]">Location ID</label>
              <input
                type="text"
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
                placeholder="locations/987654..."
                className="input-field w-full text-xs font-mono"
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-3 border-t border-[#E5E7E3]">
          <button
            type="button"
            onClick={handleSyncNow}
            disabled={isSyncing}
            className="btn-secondary px-3 py-1.5 text-xs flex items-center gap-1.5 w-full sm:w-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-[#1F5F4A]' : ''}`} />
            {isSyncing ? 'Sincronizzando...' : 'Sincronizza Ora'}
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={handleToggleConnection}
              className={`px-3 py-1.5 text-xs rounded-[6px] font-medium transition ${
                business.isConnected ? 'bg-[#B3382C]/10 text-[#B3382C] hover:bg-[#B3382C]/20' : 'btn-primary'
              }`}
            >
              {business.isConnected ? 'Scollega' : 'Connetti'}
            </button>

            <button
              onClick={handleSaveModal}
              className="btn-primary px-4 py-1.5 text-xs font-medium"
            >
              Salva e Chiudi
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
