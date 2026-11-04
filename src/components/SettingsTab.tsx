import React, { useState, useEffect } from 'react';
import { Business } from '../types';
import { auth, getAuthToken } from '../lib/firebase';
import { 
  AlertTriangle, 
  RefreshCw, 
  ExternalLink, 
  CheckCircle2, 
  Eye, 
  EyeOff, 
  Database, 
  Trash2, 
  AlertCircle,
  Bell,
  Mail,
  LayoutDashboard,
  Clock,
  Sparkles,
  ShieldAlert,
  Send,
  Smartphone
} from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';

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
  const [formData, setFormData] = useState<Business>({
    ...business,
    notifyNegativeReviews: business.notifyNegativeReviews ?? true,
    notifyEmailEnabled: business.notifyEmailEnabled ?? true,
    notifyEmailAddress: business.notifyEmailAddress || auth.currentUser?.email || '',
    notifyDashboardEnabled: business.notifyDashboardEnabled ?? true,
    notifyResponseTargetHours: business.notifyResponseTargetHours || 12,
    notifyAutoDraft: business.notifyAutoDraft ?? true,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  
  const [previewDraft, setPreviewDraft] = useState<string | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<{ type: 'success' | 'error', msg: string } | null>(null);

  const [isTestingNotification, setIsTestingNotification] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    sentToEmail?: string;
    targetHours?: number;
    sample?: any;
  } | null>(null);

  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    setFormData({
      ...business,
      notifyNegativeReviews: business.notifyNegativeReviews ?? true,
      notifyEmailEnabled: business.notifyEmailEnabled ?? true,
      notifyEmailAddress: business.notifyEmailAddress || auth.currentUser?.email || '',
      notifyDashboardEnabled: business.notifyDashboardEnabled ?? true,
      notifyResponseTargetHours: business.notifyResponseTargetHours || 12,
      notifyAutoDraft: business.notifyAutoDraft ?? true,
    });
    setPreviewDraft(null);
    setPreviewError(null);
    setSyncStatus(null);
    setSaveError(null);
    setTestResult(null);
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
          force: true // MODIFICATO: invia force:true
        })
      });

      const data = await res.json().catch(() => ({ success: false, message: 'Errore risposta server' }));

      if (!res.ok || data.success === false) {
        // const isKeyMissing = data.message?.toLowerCase().includes('chiave api') || data.message?.toLowerCase().includes('maps api key'); // MODIFICATO: rimosso
        setSyncStatus({ 
          type: 'error', 
          msg: data.message || 'Errore durante la sincronizzazione.'
        });
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

  const handleTestNotification = async () => {
    setIsTestingNotification(true);
    setTestResult(null);
    try {
      const token = await getAuthToken();
      const res = await fetch('/api/notifications/test-negative-alert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          businessId: business.id,
          email: formData.notifyEmailAddress || auth.currentUser?.email
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Errore durante la simulazione.');
      setTestResult(data);
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Impossibile completare la simulazione.'
      });
    } finally {
      setIsTestingNotification(false);
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
                <h3 className="font-semibold text-xs text-[#1C2321] uppercase tracking-wide">Sincronizzazione recensioni Google</h3>
              </div>
              <p className="text-[11px] text-[#667069] mt-0.5">Configura gli identificativi per recuperare automaticamente le recensioni.</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium ${formData.isConnected ? 'bg-[#E8F0EC] text-[#1F5F4A]' : 'bg-[#B3382C]/10 text-[#B3382C]'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${formData.isConnected ? 'bg-[#1F5F4A]' : 'bg-[#B3382C]'}`}></span>
                {formData.isConnected ? 'Sincronizzazione Attiva' : 'Sincronizzazione Disattivata'}
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
                <span className="text-[11px] text-[#667069]">Incolla il link della tua scheda Google: il Place ID viene rilevato da solo</span>
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

            {/* MODIFICATO: rimosso campo Chiave API Google Maps */}
          </div>
        </div>

        {/* Notifiche & Risposta Rapida (Recensioni 1-2 Stelle) */}
        <div className="panel-card p-5 space-y-5 border border-[#B3382C]/20 bg-white">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E5E7E3] pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1 rounded bg-[#B3382C]/10 text-[#B3382C]">
                  <ShieldAlert className="w-4 h-4" />
                </span>
                <h3 className="font-semibold text-xs text-[#1C2321] uppercase tracking-wide">
                  Avvisi & Notifiche Recensioni Negative (1 e 2 Stelle)
                </h3>
                <span className="bg-[#B3382C]/10 text-[#B3382C] text-[10px] font-semibold px-2 py-0.5 rounded-full">
                  Risposta Rapida
                </span>
              </div>
              <p className="text-[11px] text-[#667069] mt-1">
                Attiva avvisi tempestivi via email o nella dashboard per ogni nuova recensione critica, per rispondere tempestivamente e proteggere la reputazione dell'attività.
              </p>
            </div>

            {/* Master Toggle */}
            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input 
                type="checkbox"
                checked={formData.notifyNegativeReviews ?? true}
                onChange={(e) => handleChange('notifyNegativeReviews', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-[#E5E7E3] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#1F5F4A]"></div>
              <span className="ml-2 text-xs font-medium text-[#1C2321]">
                {formData.notifyNegativeReviews ?? true ? 'Attive' : 'Disattive'}
              </span>
            </label>
          </div>

          {(formData.notifyNegativeReviews ?? true) ? (
            <div className="space-y-4 pt-1">
              {/* Canali di notifica */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Opzione Notifiche Email */}
                <div className={`p-4 rounded-[6px] border transition-all ${
                  formData.notifyEmailEnabled ?? true 
                    ? 'border-[#1F5F4A]/30 bg-[#F6F8F7]' 
                    : 'border-[#E5E7E3] bg-[#FAFAFA] opacity-75'
                }`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-[#1F5F4A]" />
                      <span className="text-xs font-semibold text-[#1C2321]">Notifiche via Email</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox"
                        checked={formData.notifyEmailEnabled ?? true}
                        onChange={(e) => handleChange('notifyEmailEnabled', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-[#E5E7E3] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#1F5F4A]"></div>
                    </label>
                  </div>
                  <p className="text-[11px] text-[#667069] mt-1.5 mb-3">
                    Invia un'email immediata con il testo del cliente, la valutazione e una bozza diplomatica consigliata.
                  </p>

                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-[#1C2321] block">
                      Indirizzo email di ricezione avvisi
                    </label>
                    <input 
                      type="email"
                      value={formData.notifyEmailAddress || ''}
                      onChange={(e) => handleChange('notifyEmailAddress', e.target.value)}
                      placeholder={auth.currentUser?.email || 'nome@attivita.com'}
                      disabled={!(formData.notifyEmailEnabled ?? true)}
                      className="input-field w-full text-xs bg-white disabled:opacity-50"
                    />
                    <span className="text-[10px] text-[#667069] block">
                      Default: email account ({auth.currentUser?.email || 'account'})
                    </span>
                  </div>
                </div>

                {/* Opzione Notifiche Dashboard */}
                <div className={`p-4 rounded-[6px] border transition-all ${
                  formData.notifyDashboardEnabled ?? true 
                    ? 'border-[#1F5F4A]/30 bg-[#F6F8F7]' 
                    : 'border-[#E5E7E3] bg-[#FAFAFA] opacity-75'
                }`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <LayoutDashboard className="w-4 h-4 text-[#1F5F4A]" />
                      <span className="text-xs font-semibold text-[#1C2321]">Notifiche nella Dashboard</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox"
                        checked={formData.notifyDashboardEnabled ?? true}
                        onChange={(e) => handleChange('notifyDashboardEnabled', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-[#E5E7E3] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#1F5F4A]"></div>
                    </label>
                  </div>
                  <p className="text-[11px] text-[#667069] mt-1.5 mb-3">
                    Mostra alert visivi ad alta priorità nella scheda Recensioni e badge sulla barra laterale.
                  </p>

                  <div className="p-2.5 rounded bg-white border border-[#E5E7E3] text-[11px] text-[#1C2321] space-y-1">
                    <div className="flex items-center gap-1.5 text-[#B3382C] font-medium">
                      <span className="w-2 h-2 rounded-full bg-[#B3382C] animate-pulse"></span>
                      Avviso visivo critico in tempo reale
                    </div>
                    <p className="text-[10px] text-[#667069]">
                      Mette in risalto le recensioni 1-2 stelle finché non ricevono una risposta pubblicata.
                    </p>
                  </div>
                </div>
              </div>

              {/* Tempo target di risposta rapida & Bozza IA automatica */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#667069]" />
                    <label className="text-xs font-medium text-[#1C2321]">
                      Obiettivo di tempo per la risposta rapida
                    </label>
                  </div>
                  <select 
                    value={formData.notifyResponseTargetHours || 12}
                    onChange={(e) => handleChange('notifyResponseTargetHours', Number(e.target.value))}
                    className="input-field w-full text-xs cursor-pointer"
                  >
                    <option value={2}>Entro 2 ore (Massima urgenza — ideale per locali e bar)</option>
                    <option value={6}>Entro 6 ore (Rapido — consigliato per negozi e servizi)</option>
                    <option value={12}>Entro 12 ore (Entro la giornata)</option>
                    <option value={24}>Entro 24 ore (Standard professionale)</option>
                  </select>
                  <span className="text-[10px] text-[#667069] block">
                    Una risposta entro 24 ore rassicura il cliente e limita i danni di immagine.
                  </span>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#1F5F4A]" />
                    <label className="text-xs font-medium text-[#1C2321]">
                      Generazione automatica bozza diplomatica
                    </label>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded bg-[#F6F8F7] border border-[#E5E7E3] min-h-[42px]">
                    <div className="pr-2">
                      <p className="text-xs font-medium text-[#1C2321]">Pre-genera bozza IA al rilevamento</p>
                      <p className="text-[10px] text-[#667069]">Prepara subito la bozza per rispondere con 1 clic</p>
                    </div>
                    <input 
                      type="checkbox"
                      checked={formData.notifyAutoDraft ?? true}
                      onChange={(e) => handleChange('notifyAutoDraft', e.target.checked)}
                      className="rounded border-[#667069] text-[#1F5F4A] focus:ring-[#1F5F4A] w-4 h-4 cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* Simulatore di Test Notifiche */}
              <div className="p-3.5 rounded-[6px] bg-[#F6F8F7] border border-[#E5E7E3] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <p className="text-xs font-semibold text-[#1C2321] flex items-center gap-1.5">
                    <Bell className="w-3.5 h-3.5 text-[#1F5F4A]" />
                    Verifica configurazione notifiche
                  </p>
                  <p className="text-[11px] text-[#667069]">
                    Simula la ricezione di una recensione negativa (1 stella) per testare l'avviso e l'anteprima della bozza.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleTestNotification}
                  disabled={isTestingNotification}
                  className="btn-secondary px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 shrink-0 self-start sm:self-auto disabled:opacity-50"
                >
                  <Send className={`w-3.5 h-3.5 ${isTestingNotification ? 'animate-spin' : ''}`} />
                  {isTestingNotification ? 'Invio in corso...' : 'Invia test di notifica'}
                </button>
              </div>

              {testResult && (
                <div className={`p-3 rounded-[6px] border text-xs space-y-2 ${
                  testResult.success 
                    ? 'bg-[#E8F0EC] border-[#1F5F4A]/30 text-[#1C2321]' 
                    : 'bg-[#B3382C]/10 border-[#B3382C]/30 text-[#B3382C]'
                }`}>
                  <div className="flex items-center gap-2 font-medium">
                    {testResult.success ? <CheckCircle2 className="w-4 h-4 text-[#1F5F4A]" /> : <AlertCircle className="w-4 h-4" />}
                    <span>{testResult.message}</span>
                  </div>
                  {testResult.sample && (
                    <div className="p-2.5 bg-white rounded border border-[#E5E7E3] text-[11px] space-y-1.5 mt-1">
                      <div className="flex items-center justify-between font-medium">
                        <span className="text-[#B3382C]">★☆☆☆☆ (1 Stella) • {testResult.sample.author}</span>
                        <span className="text-[#667069]">Obiettivo: entro {testResult.targetHours}h</span>
                      </div>
                      <p className="italic text-[#667069]">"{testResult.sample.text}"</p>
                      <div className="pt-1.5 border-t border-[#E5E7E3]">
                        <span className="font-semibold text-[#1F5F4A] block text-[11px]">Bozza diplomatica pre-generata:</span>
                        <p className="text-[#1C2321] mt-0.5">{testResult.sample.draftReply}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="p-3 bg-[#FAFAFA] rounded border border-dashed border-[#E5E7E3] text-center text-xs text-[#667069]">
              Le notifiche per recensioni negative sono disattivate. Abilita l'interruttore sopra per ricevere avvisi tempestivi per le valutazioni da 1 e 2 stelle.
            </div>
          )}
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

      <div className="panel-card p-5 space-y-4 border border-[#1F5F4A]/20 bg-[#F6F8F7]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded bg-[#1F5F4A]/10 text-[#1F5F4A]">
                <Smartphone className="w-4 h-4" />
              </span>
              <h3 className="font-semibold text-xs text-[#1C2321] uppercase tracking-wide">
                Applicazione Web Installabile (PWA)
              </h3>
              <span className="bg-[#E8F0EC] text-[#1F5F4A] text-[10px] font-semibold px-2 py-0.5 rounded-full">
                Abilitata
              </span>
            </div>
            <p className="text-[11px] text-[#667069]">
              ReviewDesk può essere installata come app nativa sul tuo smartphone (iOS e Android) o sul computer (Chrome, Edge), con avvio rapido a tutto schermo e supporto offline.
            </p>
          </div>
          <div className="shrink-0">
            <PWAInstallButton variant="primary" />
          </div>
        </div>
      </div>

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
