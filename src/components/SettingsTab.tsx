import React, { useState, useEffect } from 'react';
import { Business } from '../types';
import { auth, getAuthToken } from '../lib/firebase';
import { AlertTriangle, RefreshCw, ExternalLink, CheckCircle2, Eye, EyeOff, Database, Trash2, AlertCircle } from 'lucide-react';

interface SettingsTabProps {
  business: Business;
  onUpdateBusiness: (updated: Partial<Business>) => void | Promise<void>;
  onRefreshReviews?: () => void | Promise<void>;
  onImportReviews?: (imported: any[], businessId: string, updatedFields?: Partial<Business>) => void | Promise<void>;
  onClearDemoData?: () => void | Promise<void>;
  onResetData?: () => void | Promise<void>;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
  business,
  onUpdateBusiness,
  onRefreshReviews,
  onImportReviews,
  onClearDemoData,
  onResetData
}) => {
  const [formData, setFormData] = useState<Business>(business);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  
  const [previewDraft, setPreviewDraft] = useState<string | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<{ type: 'success' | 'error', msg: string } | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);

  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    setFormData(business);
    setPreviewDraft(null);
    setPreviewError(null);
    setSyncStatus(null);
    setSaveError(null);
  }, [business]);

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
          googlePlaceId: formData.googlePlaceId,
          googleUrl: formData.googleUrl,
          businessName: formData.name,
          location: formData.location,
          apiKey: formData.googleApiKey
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
      if (onRefreshReviews) await onRefreshReviews();
      
      setSyncStatus({ type: 'success', msg: data.message || 'Sincronizzazione completata.' });
    } catch (err: any) {
      console.error(err);
      setSyncStatus({ type: 'error', msg: `Errore di rete: ${err.message}` });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleAutoGenerateReviewUrl = () => {
    if (!formData.googlePlaceId?.trim()) return;
    const generatedUrl = `https://search.google.com/local/writereview?placeid=${formData.googlePlaceId.trim()}`;
    setFormData(prev => ({ ...prev, googleUrl: generatedUrl }));
  };

  const handleChange = (field: keyof Business, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveError(null);
    setSaved(false);
    try {
      await onUpdateBusiness(formData);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setSaveError(err.message || 'Errore durante il salvataggio.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleGeneratePreview = async () => {
    setIsPreviewing(true);
    setPreviewError(null);
    setPreviewDraft(null);

    try {
      const token = await getAuthToken();
      const res = await fetch('/api/draft-reply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          businessId: business.id,
          reviewText: 'Ottimo servizio e ambiente fantastico! Complimenti a tutto lo staff.',
          author: 'Mario Rossi',
          stars: 5
        }),
      });

      const data = await res.json().catch(() => ({ error: 'Errore server' }));
      if (!res.ok) throw new Error(data.error || 'Errore durante la generazione dell\'anteprima');
      
      setPreviewDraft(data.draft);
    } catch (err: any) {
      console.error(err);
      setPreviewError(err.message || 'Impossibile generare l\'anteprima.');
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'ELIMINA') return;
    setIsDeleting(true);
    setDeleteError(null);

    try {
      await auth.currentUser?.delete();
      await auth.signOut();
      window.location.reload();
    } catch (err: any) {
      console.error(err);
      setDeleteError(err.message || 'Errore durante l\'eliminazione dell\'account.');
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-xl text-[#1C2321]">Impostazioni attività</h2>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="panel-card p-5 space-y-4">
          <h3 className="font-semibold text-xs text-[#1C2321] uppercase tracking-wide">Informazioni generali</h3>
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-[#667069] block">Nome attività</label>
              <input type="text" required value={formData.name} onChange={(e) => handleChange('name', e.target.value)} className="input-field w-full text-xs" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-[#667069] block">Categoria</label>
                <input type="text" value={formData.category} onChange={(e) => handleChange('category', e.target.value)} className="input-field w-full text-xs" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-[#667069] block">Località</label>
                <input type="text" value={formData.location} onChange={(e) => handleChange('location', e.target.value)} className="input-field w-full text-xs" />
              </div>
            </div>
          </div>
        </div>

        <div className="panel-card p-5 space-y-5 border border-[#1F5F4A]/20 bg-[#F6F8F7]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E5E7E3] pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#1F5F4A]"></span>
                <h3 className="font-semibold text-xs text-[#1C2321] uppercase tracking-wide">Google Business Profile</h3>
              </div>
              <p className="text-[11px] text-[#667069] mt-0.5">Configura gli identificativi API di Google My Business per la sincronizzazione.</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium ${formData.isConnected ? 'bg-[#E8F0EC] text-[#1F5F4A]' : 'bg-[#B3382C]/10 text-[#B3382C]'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${formData.isConnected ? 'bg-[#1F5F4A]' : 'bg-[#B3382C]'}`}></span>
                {formData.isConnected ? 'API Connesse' : 'Non Connesso'}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between bg-white p-3 rounded-[6px] border border-[#E5E7E3] text-xs gap-2">
            <div>
              <span className="text-[#667069]">Ultima sincronizzazione: </span>
              <strong className="text-[#1C2321] font-medium">{formData.lastSyncAt ? new Date(formData.lastSyncAt).toLocaleString('it-IT') : 'Mai'}</strong>
            </div>
            <button type="button" onClick={handleSyncNow} disabled={isSyncing} className="btn-secondary px-3 py-1 text-xs flex items-center gap-1.5 disabled:opacity-50">
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-[#1F5F4A]' : ''}`} />
              {isSyncing ? 'In corso...' : 'Sincronizza ora'}
            </button>
          </div>

          {syncStatus && (
            <div className={`p-2.5 rounded-[6px] border text-[11px] flex items-center gap-2 ${syncStatus.type === 'error' ? 'bg-[#B3382C]/10 border-[#B3382C]/30 text-[#B3382C]' : 'bg-[#E8F0EC] border-[#1F5F4A]/30 text-[#1F5F4A]'}`}>
              {syncStatus.type === 'error' ? <AlertCircle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
              <span>{syncStatus.msg}</span>
            </div>
          )}

          <div className="space-y-4 pt-1">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-[#1C2321]">Google Place ID</label>
                <a href="https://developers.google.com/maps/documentation/javascript/examples/places-placeid-finder" target="_blank" rel="noreferrer" className="text-[11px] text-[#1F5F4A] hover:underline flex items-center gap-1">Trova Place ID <ExternalLink className="w-3 h-3" /></a>
              </div>
              <div className="flex gap-2">
                <input type="text" value={formData.googlePlaceId || ''} onChange={(e) => handleChange('googlePlaceId', e.target.value)} placeholder="ChIJ..." className="input-field flex-1 text-xs font-mono" />
                <button type="button" onClick={handleAutoGenerateReviewUrl} disabled={!formData.googlePlaceId?.trim()} className="btn-secondary px-3 py-1.5 text-xs whitespace-nowrap disabled:opacity-40">Genera Link</button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-[#1C2321] block">Link Diretto Recensioni Google</label>
              <input type="url" required value={formData.googleUrl} onChange={(e) => handleChange('googleUrl', e.target.value)} placeholder="https://..." className="input-field w-full text-xs font-mono" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-[#667069] block">Account ID</label>
                <input type="text" value={formData.googleAccountId || ''} onChange={(e) => handleChange('googleAccountId', e.target.value)} className="input-field w-full text-xs font-mono" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-[#667069] block">Location ID</label>
                <input type="text" value={formData.googleLocationId || ''} onChange={(e) => handleChange('googleLocationId', e.target.value)} className="input-field w-full text-xs font-mono" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-[#667069] justify-between flex items-center">
                <span>Chiave API Google Maps (Opzionale)</span>
                <button type="button" onClick={() => setShowApiKey(!showApiKey)} className="text-[11px] text-[#1F5F4A] hover:underline flex items-center gap-1">{showApiKey ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />} {showApiKey ? 'Nascondi' : 'Mostra'}</button>
              </label>
              <input type={showApiKey ? 'text' : 'password'} value={formData.googleApiKey || ''} onChange={(e) => handleChange('googleApiKey', e.target.value)} className="input-field w-full text-xs font-mono" />
            </div>
          </div>
        </div>

        <div className="panel-card p-5 space-y-4">
          <h3 className="font-semibold text-xs text-[#1C2321] uppercase tracking-wide">Preferenze risposta IA</h3>
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-[#667069] block">Nome firmatario</label>
              <input type="text" required value={formData.signerName} onChange={(e) => handleChange('signerName', e.target.value)} className="input-field w-full text-xs" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-[#667069] block">Tono</label>
                <select value={formData.tone} onChange={(e) => handleChange('tone', e.target.value)} className="input-field w-full text-xs cursor-pointer">
                  <option value="caloroso">Caloroso</option>
                  <option value="formale">Formale</option>
                  <option value="diretto">Diretto</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-[#667069] block">Lingua</label>
                <select value={formData.defaultLanguage} onChange={(e) => handleChange('defaultLanguage', e.target.value)} className="input-field w-full text-xs cursor-pointer">
                  <option value="it">Italiano</option>
                  <option value="de">Tedesco</option>
                  <option value="en">Inglese</option>
                  <option value="auto">Come la recensione</option>
                </select>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-[#667069] block">Contatto privato per casi negativi</label>
              <input type="text" value={formData.privateContact} onChange={(e) => handleChange('privateContact', e.target.value)} className="input-field w-full text-xs" />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 pt-2">
          {saveError && <div className="text-xs font-medium text-[#B3382C] flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" /> {saveError}</div>}
          <div className="flex items-center justify-between">
            {saved ? <span className="text-xs font-medium text-[#1F5F4A] flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Impostazioni salvate</span> : <span></span>}
            <button type="submit" disabled={isSaving} className="btn-primary px-5 py-2 text-xs font-medium disabled:opacity-50">{isSaving ? 'Salvataggio...' : 'Salva modifiche'}</button>
          </div>
        </div>
      </form>

      <div className="panel-card p-5 space-y-4 border border-[#E5E7E3] bg-white">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-[#1F5F4A]" />
          <h3 className="font-semibold text-xs text-[#1C2321] uppercase tracking-wide">Gestione Dati & Demo</h3>
        </div>
        <div className="flex flex-wrap gap-3 pt-1">
          {onClearDemoData && <button type="button" onClick={onClearDemoData} className="px-4 py-2 bg-[#B3382C]/10 text-[#B3382C] hover:bg-[#B3382C]/20 border border-[#B3382C]/20 rounded-[6px] text-xs font-medium transition flex items-center gap-1.5"><Trash2 className="w-3.5 h-3.5" /> Elimina Dati Demo</button>}
          {onResetData && <button type="button" onClick={onResetData} className="btn-secondary px-4 py-2 text-xs font-medium flex items-center gap-1.5"><RefreshCw className="w-3.5 h-3.5" /> Ripristina Dati Demo</button>}
        </div>
      </div>

      <div className="panel-card p-5 space-y-4 border border-[#B3382C]/30 bg-[#B3382C]/5">
        <div className="flex items-center gap-2 text-[#B3382C]"><AlertTriangle className="w-4 h-4" /><h3 className="font-semibold text-xs uppercase tracking-wide">Elimina account</h3></div>
        <p className="text-xs text-[#667069]">Azione irreversibile. Digita <strong className="text-[#1C2321]">ELIMINA</strong> per confermare.</p>
        <div className="space-y-3">
          <input type="text" value={deleteConfirmText} onChange={(e) => setDeleteConfirmText(e.target.value)} placeholder="Digita ELIMINA" className="input-field w-full text-xs" />
          <button type="button" onClick={handleDeleteAccount} disabled={deleteConfirmText !== 'ELIMINA' || isDeleting} className="bg-[#B3382C] text-white px-4 py-2 rounded-[6px] text-xs font-medium hover:bg-[#9a2e23] transition disabled:opacity-50">{isDeleting ? 'Eliminazione...' : 'Elimina definitivamente il mio account'}</button>
        </div>
      </div>
    </div>
  );
};
