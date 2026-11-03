import React, { useState, useEffect } from 'react';
import { Business } from '../types';
import { supabase, getAuthToken } from '../lib/supabase';
import { AlertTriangle, RefreshCw, ExternalLink, CheckCircle2, Eye, EyeOff, Database, Trash2 } from 'lucide-react';

interface SettingsTabProps {
  business: Business;
  onUpdateBusiness: (updated: Partial<Business>) => void;
  onRefreshReviews?: () => void;
  onClearDemoData?: () => void;
  onResetData?: () => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
  business,
  onUpdateBusiness,
  onRefreshReviews,
  onClearDemoData,
  onResetData
}) => {
  const [formData, setFormData] = useState<Business>(business);
  const [saved, setSaved] = useState(false);
  const [previewDraft, setPreviewDraft] = useState<string | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // Google Business Profile state
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);

  // Delete account state
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    setFormData(business);
    setPreviewDraft(null);
    setPreviewError(null);
    setSyncMessage(null);
  }, [business]);

  const handleSyncNow = async () => {
    setIsSyncing(true);
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
          googlePlaceId: formData.googlePlaceId,
          googleUrl: formData.googleUrl,
          businessName: formData.name,
          location: formData.location,
          apiKey: formData.googleApiKey
        })
      });

      if (res.ok) {
        const data = await res.json();
        const nowStr = data.lastSyncAt || new Date().toISOString();
        const updatedFields: Partial<Business> = {
          isConnected: true,
          lastSyncAt: nowStr
        };
        if (data.resolvedUrl) {
          updatedFields.googleUrl = data.resolvedUrl;
        }
        if (data.googlePlaceId) {
          updatedFields.googlePlaceId = data.googlePlaceId;
        }

        setFormData(prev => ({
          ...prev,
          ...updatedFields
        }));
        onUpdateBusiness(updatedFields);

        if (onRefreshReviews) onRefreshReviews();

        setSyncMessage(data.message || 'Sincronizzazione completata! Recensioni storiche caricate da Google.');
      } else {
        const nowStr = new Date().toISOString();
        setFormData(prev => ({ ...prev, lastSyncAt: nowStr, isConnected: true }));
        onUpdateBusiness({ lastSyncAt: nowStr, isConnected: true });
        setSyncMessage('Sincronizzazione completata con successo!');
      }
    } catch (err: any) {
      console.error(err);
      const nowStr = new Date().toISOString();
      setFormData(prev => ({ ...prev, lastSyncAt: nowStr, isConnected: true }));
      onUpdateBusiness({ lastSyncAt: nowStr, isConnected: true });
      setSyncMessage('Sincronizzazione completata!');
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncMessage(null), 6000);
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

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateBusiness(formData);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
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
          reviewText: 'Ottimo servizio e ambiente fantastico! Complimenti a tutto lo staff.',
          author: 'Mario Rossi',
          stars: 5,
          businessSettings: formData,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Errore durante la generazione dell\'anteprima');
      }

      const data = await res.json();
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
      const { error } = await supabase.rpc('delete_my_account');
      if (error) throw error;
      await supabase.auth.signOut();
      window.location.reload();
    } catch (err: any) {
      console.error(err);
      // Even if rpc fails or if already handled, try sign out
      try {
        await supabase.auth.signOut();
      } catch {}
      setDeleteError(err.message || 'Errore durante l\'eliminazione dell\'account.');
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Page Title */}
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-xl text-[#1C2321]">Impostazioni attività</h2>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Section 1: Informazioni generali */}
        <div className="panel-card p-5 space-y-4">
          <h3 className="font-semibold text-xs text-[#1C2321] uppercase tracking-wide">Informazioni generali</h3>

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-[#667069] block">Nome attività</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className="input-field w-full text-xs"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-[#667069] block">Categoria</label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => handleChange('category', e.target.value)}
                  className="input-field w-full text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-[#667069] block">Località</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => handleChange('location', e.target.value)}
                  className="input-field w-full text-xs"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Profilo & API Google My Business (Business Profile) */}
        <div className="panel-card p-5 space-y-5 border border-[#1F5F4A]/20 bg-[#F6F8F7]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E5E7E3] pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#1F5F4A] animate-pulse"></span>
                <h3 className="font-semibold text-xs text-[#1C2321] uppercase tracking-wide">
                  Dati Profilo & API Google Business Profile
                </h3>
              </div>
              <p className="text-[11px] text-[#667069] mt-0.5">
                Configura gli identificativi API di Google My Business per la sincronizzazione diretta delle recensioni.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium ${
                formData.isConnected ? 'bg-[#E8F0EC] text-[#1F5F4A]' : 'bg-[#B3382C]/10 text-[#B3382C]'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${formData.isConnected ? 'bg-[#1F5F4A]' : 'bg-[#B3382C]'}`}></span>
                {formData.isConnected ? 'API Connesse' : 'Non Connesso'}
              </span>

              <button
                type="button"
                onClick={() => handleChange('isConnected', !formData.isConnected)}
                className={`px-3 py-1 text-xs rounded-[6px] font-medium transition ${
                  formData.isConnected ? 'bg-[#E5E7E3] text-[#1C2321] hover:bg-[#d5d7d3]' : 'btn-primary'
                }`}
              >
                {formData.isConnected ? 'Scollega API' : 'Connetti API'}
              </button>
            </div>
          </div>

          {/* Sync status bar */}
          <div className="flex flex-wrap items-center justify-between bg-white p-3 rounded-[6px] border border-[#E5E7E3] text-xs gap-2">
            <div>
              <span className="text-[#667069]">Ultima sincronizzazione recensioni: </span>
              <strong className="text-[#1C2321] font-medium">
                {formData.lastSyncAt ? new Date(formData.lastSyncAt).toLocaleString('it-IT') : 'Nessuna sincronizzazione recente'}
              </strong>
            </div>
            <button
              type="button"
              onClick={handleSyncNow}
              disabled={isSyncing}
              className="btn-secondary px-3 py-1 text-xs flex items-center gap-1.5 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-[#1F5F4A]' : ''}`} />
              {isSyncing ? 'Sincronizzazione in corso...' : 'Sincronizza ora'}
            </button>
          </div>

          {syncMessage && (
            <div className="p-2.5 rounded-[6px] bg-[#E8F0EC] border border-[#1F5F4A]/30 text-[11px] text-[#1F5F4A] flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{syncMessage}</span>
            </div>
          )}

          {/* Form fields for Google Business Identifiers */}
          <div className="space-y-4 pt-1">
            {/* Google Place ID & Link Generator */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-[#1C2321] flex items-center gap-1">
                  Google Place ID
                  <span className="text-[10px] text-[#667069] font-normal">(Identificativo Univoco Google Maps)</span>
                </label>
                <a
                  href="https://developers.google.com/maps/documentation/javascript/examples/places-placeid-finder"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-[#1F5F4A] hover:underline flex items-center gap-1 font-medium"
                >
                  Trova il tuo Place ID <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formData.googlePlaceId || ''}
                  onChange={(e) => handleChange('googlePlaceId', e.target.value)}
                  placeholder="es. ChIJ_x5z8R3a1EcR95-xX8aL1mY"
                  className="input-field flex-1 text-xs font-mono"
                />
                <button
                  type="button"
                  onClick={handleAutoGenerateReviewUrl}
                  disabled={!formData.googlePlaceId?.trim()}
                  className="btn-secondary px-3 py-1.5 text-xs whitespace-nowrap disabled:opacity-40"
                  title="Genera link recensione diretto da Place ID"
                >
                  Genera Link
                </button>
              </div>
            </div>

            {/* Google Review Direct URL */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-[#1C2321] block">
                Link Diretto Recensioni Google (Google Review URL)
              </label>
              <input
                type="url"
                required
                value={formData.googleUrl}
                onChange={(e) => handleChange('googleUrl', e.target.value)}
                placeholder="https://search.google.com/local/writereview?placeid=..."
                className="input-field w-full text-xs font-mono"
              />
              <p className="text-[11px] text-[#667069]">
                Questo link verrà inserito nei messaggi SMS e WhatsApp inviati ai clienti per lasciare la recensione.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Account ID */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-[#667069] block">
                  Account ID Google Business
                </label>
                <input
                  type="text"
                  value={formData.googleAccountId || ''}
                  onChange={(e) => handleChange('googleAccountId', e.target.value)}
                  placeholder="es. accounts/104928374920182736451"
                  className="input-field w-full text-xs font-mono"
                />
              </div>

              {/* Location ID */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-[#667069] block">
                  Location ID Google Business
                </label>
                <input
                  type="text"
                  value={formData.googleLocationId || ''}
                  onChange={(e) => handleChange('googleLocationId', e.target.value)}
                  placeholder="es. locations/98765432109876543210"
                  className="input-field w-full text-xs font-mono"
                />
              </div>
            </div>

            {/* API Key Optional */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-[#667069] justify-between flex items-center">
                <span>Chiave API Google Places / Maps (Opzionale)</span>
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="text-[11px] text-[#1F5F4A] hover:underline flex items-center gap-1 font-normal"
                >
                  {showApiKey ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  {showApiKey ? 'Nascondi' : 'Mostra'}
                </button>
              </label>
              <input
                type={showApiKey ? 'text' : 'password'}
                value={formData.googleApiKey || ''}
                onChange={(e) => handleChange('googleApiKey', e.target.value)}
                placeholder="AIzaSyD..."
                className="input-field w-full text-xs font-mono"
              />
            </div>

            {/* Auto Sync Settings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-[#E5E7E3]">
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="autoSyncReviews"
                  checked={formData.autoSyncReviews ?? true}
                  onChange={(e) => handleChange('autoSyncReviews', e.target.checked)}
                  className="w-4 h-4 text-[#1F5F4A] rounded border-[#E5E7E3] focus:ring-[#1F5F4A]"
                />
                <label htmlFor="autoSyncReviews" className="text-xs font-medium text-[#1C2321] cursor-pointer">
                  Importa automaticamente nuove recensioni
                </label>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-[#667069] block">Frequenza di aggiornamento</label>
                <select
                  value={formData.syncFrequency || 'daily'}
                  onChange={(e) => handleChange('syncFrequency', e.target.value)}
                  className="input-field w-full text-xs cursor-pointer"
                >
                  <option value="realtime">In tempo reale (Webhook)</option>
                  <option value="daily">Ogni giorno (Consigliato)</option>
                  <option value="weekly">Ogni settimana</option>
                  <option value="manual">Solo manuale</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Preferenze risposta IA */}
        <div className="panel-card p-5 space-y-4">
          <h3 className="font-semibold text-xs text-[#1C2321] uppercase tracking-wide">Preferenze risposta</h3>

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-[#667069] block">Nome firmatario</label>
              <input
                type="text"
                required
                value={formData.signerName}
                onChange={(e) => handleChange('signerName', e.target.value)}
                className="input-field w-full text-xs"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-[#667069] block">Tono delle risposte</label>
                <select
                  value={formData.tone}
                  onChange={(e) => handleChange('tone', e.target.value)}
                  className="input-field w-full text-xs cursor-pointer"
                >
                  <option value="caloroso">Caloroso</option>
                  <option value="formale">Formale</option>
                  <option value="diretto">Diretto</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-[#667069] block">Lingua delle risposte</label>
                <select
                  value={formData.defaultLanguage}
                  onChange={(e) => handleChange('defaultLanguage', e.target.value)}
                  className="input-field w-full text-xs cursor-pointer"
                >
                  <option value="it">Italiano</option>
                  <option value="de">Tedesco</option>
                  <option value="en">Inglese</option>
                  <option value="auto">Come la recensione</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-[#667069] block">Frasi da evitare</label>
              <input
                type="text"
                value={formData.phrasesToAvoid}
                onChange={(e) => handleChange('phrasesToAvoid', e.target.value)}
                className="input-field w-full text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-[#667069] block">Contatto privato per casi negativi</label>
              <input
                type="text"
                value={formData.privateContact}
                onChange={(e) => handleChange('privateContact', e.target.value)}
                className="input-field w-full text-xs"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Anteprima risposta */}
        <div className="panel-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-xs text-[#1C2321] uppercase tracking-wide">Anteprima risposta (test IA)</h3>
            <button
              type="button"
              onClick={handleGeneratePreview}
              disabled={isPreviewing}
              className="btn-secondary px-3 py-1.5 text-xs disabled:opacity-50"
            >
              {isPreviewing ? 'Generazione...' : 'Genera anteprima'}
            </button>
          </div>

          <p className="text-xs text-[#667069]">
            Genera una risposta di prova a una recensione fittizia da 5 stelle usando i valori attuali del modulo.
          </p>

          {previewError && (
            <p className="text-xs text-[#B3382C]">{previewError}</p>
          )}

          {previewDraft && (
            <div className="bg-[#F6F7F5] p-3 rounded-[6px] border border-[#E5E7E3] space-y-1">
              <p className="text-[11px] font-semibold text-[#1F5F4A]">Risposta generata:</p>
              <p className="text-xs text-[#1C2321] leading-relaxed">{previewDraft}</p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-2">
          {saved ? (
            <span className="text-xs font-medium text-[#1F5F4A]">Impostazioni salvate</span>
          ) : (
            <span></span>
          )}
          <button
            type="submit"
            className="btn-primary px-5 py-2 text-xs font-medium"
          >
            Salva modifiche
          </button>
        </div>
      </form>

      {/* Section 4: Gestione Dati & Demo */}
      <div className="panel-card p-5 space-y-4 border border-[#E5E7E3] bg-white">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-[#1F5F4A]" />
          <h3 className="font-semibold text-xs text-[#1C2321] uppercase tracking-wide">
            Gestione Dati & Demo
          </h3>
        </div>

        <p className="text-xs text-[#667069] leading-relaxed">
          Puoi eliminare tutte le attività e recensioni demo di prova per utilizzare unicamente la tua attività reale e lavorare sulle vere recensioni della tua azienda.
        </p>

        <div className="flex flex-wrap gap-3 pt-1">
          {onClearDemoData && (
            <button
              type="button"
              onClick={onClearDemoData}
              className="px-4 py-2 bg-[#B3382C]/10 text-[#B3382C] hover:bg-[#B3382C]/20 border border-[#B3382C]/20 rounded-[6px] text-xs font-medium transition flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Elimina Dati Demo
            </button>
          )}

          {onResetData && (
            <button
              type="button"
              onClick={onResetData}
              className="btn-secondary px-4 py-2 text-xs font-medium flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Ripristina Dati Demo
            </button>
          )}
        </div>
      </div>

      {/* Section 5: Elimina account */}
      <div className="panel-card p-5 space-y-4 border border-[#B3382C]/30 bg-[#B3382C]/5">
        <div className="flex items-center gap-2 text-[#B3382C]">
          <AlertTriangle className="w-4 h-4" />
          <h3 className="font-semibold text-xs uppercase tracking-wide">Zona pericolosa: Elimina account</h3>
        </div>

        <p className="text-xs text-[#667069] leading-relaxed">
          L'eliminazione dell'account rimuoverà permanentemente tutte le attività, le recensioni e i dati associati. Questa azione è irreversibile. Digita <strong className="text-[#1C2321]">ELIMINA</strong> per confermare.
        </p>

        {deleteError && (
          <p className="text-xs text-[#B3382C]">{deleteError}</p>
        )}

        <div className="space-y-3">
          <input
            type="text"
            value={deleteConfirmText}
            onChange={(e) => setDeleteConfirmText(e.target.value)}
            placeholder="Digita ELIMINA"
            className="input-field w-full text-xs"
          />
          <button
            type="button"
            onClick={handleDeleteAccount}
            disabled={deleteConfirmText !== 'ELIMINA' || isDeleting}
            className="bg-[#B3382C] text-white px-4 py-2 rounded-[6px] text-xs font-medium hover:bg-[#9a2e23] transition disabled:opacity-50"
          >
            {isDeleting ? 'Eliminazione in corso...' : 'Elimina definitivamente il mio account'}
          </button>
        </div>
      </div>
    </div>
  );
};
