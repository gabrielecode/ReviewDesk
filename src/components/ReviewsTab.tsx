import React, { useState, useEffect, useRef } from 'react';
import { 
  Star, 
  Search,
  RotateCcw,
  ArrowLeft,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  X
} from 'lucide-react';
import { Review, Business } from '../types';
import { updateReviewInDb } from '../storage';
import { getAuthToken } from '../lib/firebase';

interface ReviewsTabProps {
  business: Business;
  reviews: Review[];
  onRefreshReviews: () => void | Promise<void>;
  onImportReviews?: (imported: Review[], businessId: string, updatedFields?: Partial<Business>) => void | Promise<void>;
}

export const ReviewsTab: React.FC<ReviewsTabProps> = ({
  business,
  reviews,
  onRefreshReviews,
  onImportReviews
}) => {
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterStars, setFilterStars] = useState<number | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedReviewId, setSelectedReviewId] = useState<string | null>(null);
  const [draftReplyText, setDraftReplyText] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generatingReviewId, setGeneratingReviewId] = useState<string | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const [isSyncingReviews, setIsSyncingReviews] = useState<boolean>(false);
  const [syncBanner, setSyncBanner] = useState<{ type: 'success' | 'error', msg: string } | null>(null);

  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const currentDraftRef = useRef<{ id: string, text: string } | null>(null);

  const flushDraft = async () => {
    if (currentDraftRef.current && currentDraftRef.current.id) {
      try {
        await updateReviewInDb(currentDraftRef.current.id, { draftText: currentDraftRef.current.text });
      } catch (err) {
        console.error('Failed to flush draft:', err);
      }
      currentDraftRef.current = null;
    }
  };

  const handleSyncReviewsNow = async () => {
    setIsSyncingReviews(true);
    setSyncBanner(null);
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
          googlePlaceId: business.googlePlaceId,
          googleUrl: business.googleUrl,
          businessName: business.name,
          location: business.location,
          apiKey: business.googleApiKey
        })
      });

      const data = await res.json().catch(() => ({ success: false, message: 'Errore risposta server' }));

      if (!res.ok || data.success === false) {
        setSyncBanner({ type: 'error', msg: data.message || 'Errore durante la sincronizzazione.' });
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
      setSyncBanner({ type: 'success', msg: data.message || 'Sincronizzazione completata.' });
    } catch (err: any) {
      console.error('Sync error:', err);
      setSyncBanner({ type: 'error', msg: `Errore di rete: ${err.message}` });
    } finally {
      setIsSyncingReviews(false);
    }
  };

  const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 768;

  const filteredReviews = reviews.filter((r) => {
    if (filterStatus !== 'all' && r.status !== filterStatus) return false;
    if (filterStars !== 'all' && r.stars !== filterStars) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchAuthor = r.author.toLowerCase().includes(q);
      const matchText = r.text.toLowerCase().includes(q);
      if (!matchAuthor && !matchText) return false;
    }
    return true;
  });

  useEffect(() => {
    if (isDesktop && filteredReviews.length > 0 && (!selectedReviewId || !filteredReviews.some(r => r.id === selectedReviewId))) {
      setSelectedReviewId(filteredReviews[0].id);
    } else if (filteredReviews.length === 0) {
      setSelectedReviewId(null);
    }
  }, [filteredReviews.length, filterStatus, filterStars, business.id]);

  const selectedReview = reviews.find(r => r.id === selectedReviewId) || null;

  useEffect(() => {
    // Flush previous draft if any
    if (currentDraftRef.current && currentDraftRef.current.id !== selectedReviewId) {
      flushDraft();
    }

    if (selectedReview) {
      setDraftReplyText(selectedReview.draftText || selectedReview.replyText || '');
      setGenerationError(null);
    }

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [selectedReviewId]);

  const handleTextChange = (val: string) => {
    setDraftReplyText(val);
    if (!selectedReviewId) return;

    currentDraftRef.current = { id: selectedReviewId, text: val };

    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      flushDraft();
    }, 700);
  };

  const handleGenerateDraft = async (rev?: Review) => {
    const target = rev || selectedReview;
    if (!target) return;

    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    await flushDraft();

    setIsGenerating(true);
    setGeneratingReviewId(target.id);
    setGenerationError(null);

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
          reviewId: target.id,
          reviewText: target.text,
          author: target.author,
          stars: target.stars
        }),
      });

      const data = await res.json().catch(() => ({ error: 'Errore server' }));
      if (!res.ok) throw new Error(data.error || 'Errore di generazione risposta');
      
      const newDraft = data.draft;
      const newStatus = target.status === 'pubblicata' ? 'pubblicata' : 'bozza_pronta';
      
      await updateReviewInDb(target.id, { draftText: newDraft, status: newStatus });
      await onRefreshReviews();

      if (selectedReviewId === target.id) {
        setDraftReplyText(newDraft);
      }
    } catch (err: any) {
      console.error(err);
      setGenerationError(err.message || 'Impossibile generare la bozza.');
    } finally {
      setIsGenerating(false);
      setGeneratingReviewId(null);
    }
  };

  const handleApproveAndPublish = async () => {
    if (!selectedReview) return;

    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    await flushDraft();

    if (selectedReview.stars <= 2) {
      const confirmed = window.confirm('Attenzione: questa è una recensione da 1-2 stelle. Confermi di voler pubblicare la risposta?');
      if (!confirmed) return;
    }

    setIsSaving(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      await updateReviewInDb(selectedReview.id, {
        replyText: draftReplyText,
        draftText: undefined,
        status: 'pubblicata',
        replyDate: today
      });
      await onRefreshReviews();
    } catch (err: any) {
      alert(`Errore durante la pubblicazione: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDiscardOrCancel = async () => {
    if (!selectedReview) return;
    
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    currentDraftRef.current = null;

    setIsSaving(true);
    try {
      const isPublished = selectedReview.status === 'pubblicata';
      if (isPublished) {
        await updateReviewInDb(selectedReview.id, { draftText: undefined });
        setDraftReplyText(selectedReview.replyText || '');
      } else {
        await updateReviewInDb(selectedReview.id, { draftText: undefined, replyText: undefined, replyDate: undefined, status: 'da_rispondere' });
        setDraftReplyText('');
      }
      await onRefreshReviews();
    } catch (err: any) {
      alert(`Errore: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const daRispondereCount = reviews.filter(r => r.status === 'da_rispondere').length;
  const bozzaProntaCount = reviews.filter(r => r.status === 'bozza_pronta').length;
  const avgStarsVal = reviews.length > 0 ? (reviews.reduce((acc, r) => acc + r.stars, 0) / reviews.length).toFixed(1) : '0.0';
  const answeredPctVal = reviews.length > 0 ? Math.round((reviews.filter(r => r.status === 'pubblicata').length / reviews.length) * 100) : 0;

  const renderStatusIndicator = (status: Review['status']) => {
    switch (status) {
      case 'pubblicata':
        return <span className="flex items-center gap-1.5 text-[12px] text-[#1F5F4A]"><span className="w-2 h-2 rounded-full bg-[#1F5F4A]"></span> Pubblicata</span>;
      case 'bozza_pronta':
        return <span className="flex items-center gap-1.5 text-[12px] text-[#2F5D9E]"><span className="w-2 h-2 rounded-full bg-[#2F5D9E]"></span> Bozza pronta</span>;
      default:
        return <span className="flex items-center gap-1.5 text-[12px] text-[#946300]"><span className="w-2 h-2 rounded-full bg-[#946300]"></span> Da rispondere</span>;
    }
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      <div className="panel-card px-4 py-3 flex flex-wrap items-center justify-between text-xs text-[#667069] gap-2">
        <div>
          Da rispondere <strong className="text-[#1C2321]">{daRispondereCount}</strong> · 
          Bozze pronte <strong className="text-[#1C2321]">{bozzaProntaCount}</strong> · 
          Media <strong className="text-[#1C2321]">{avgStarsVal}</strong> · 
          Risposte <strong className="text-[#1C2321]">{answeredPctVal}%</strong>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleSyncReviewsNow}
            disabled={isSyncingReviews}
            className="btn-secondary px-3 py-1 text-xs font-medium flex items-center gap-1.5 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncingReviews ? 'animate-spin text-[#1F5F4A]' : ''}`} />
            {isSyncingReviews ? 'Importazione...' : 'Sincronizza Recensioni Google'}
          </button>
          <span className="text-[12px]">{filteredReviews.length} recensioni</span>
        </div>
      </div>

      {syncBanner && (
        <div className={`p-3 rounded-[6px] border flex items-center justify-between gap-2 animate-in fade-in slide-in-from-top-2 ${syncBanner.type === 'error' ? 'bg-[#B3382C]/10 border-[#B3382C]/30 text-[#B3382C]' : 'bg-[#E8F0EC] border-[#1F5F4A]/30 text-[#1F5F4A]'}`}>
          <div className="flex items-center gap-2 text-xs">
            {syncBanner.type === 'error' ? <AlertCircle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
            <span>{syncBanner.msg}</span>
          </div>
          <button onClick={() => setSyncBanner(null)} className="p-1 hover:bg-black/5 rounded"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="input-field text-xs py-1.5 px-3">
            <option value="all">Tutti gli stati</option>
            <option value="da_rispondere">Da rispondere</option>
            <option value="bozza_pronta">Bozze pronte</option>
            <option value="pubblicata">Pubblicate</option>
          </select>
          <select value={filterStars} onChange={(e) => setFilterStars(e.target.value === 'all' ? 'all' : Number(e.target.value))} className="input-field text-xs py-1.5 px-3">
            <option value="all">Tutte le stelle</option>
            {[5,4,3,2,1].map(s => <option key={s} value={s}>{s} Stell{s===1?'a':'e'}</option>)}
          </select>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-[#667069] absolute left-3 top-2.5" />
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Cerca per autore o testo..." className="input-field text-xs w-full pl-9 py-1.5" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
        <div className={`md:col-span-5 panel-card overflow-hidden ${selectedReviewId ? 'hidden md:block' : 'block'}`}>
          <div className="divide-y divide-[#E5E7E3] max-h-[calc(100vh-240px)] overflow-y-auto">
            {filteredReviews.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <p className="text-xs text-[#667069]">Nessuna recensione trovata.</p>
                <button onClick={() => { setFilterStatus('all'); setFilterStars('all'); setSearchQuery(''); }} className="text-xs text-[#1F5F4A] font-medium hover:underline">Reimposta filtri</button>
              </div>
            ) : (
              filteredReviews.map((rev) => (
                <div key={rev.id} onClick={() => setSelectedReviewId(rev.id)} className={`p-3.5 cursor-pointer transition text-left ${rev.id === selectedReviewId ? 'bg-[#E8F0EC]/60 border-l-4 border-l-[#1F5F4A]' : 'hover:bg-[#F6F7F5]'}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-xs text-[#1C2321]">{rev.author}</span>
                    <span className="text-[11px] text-[#667069]">{rev.date}</span>
                  </div>
                  <div className="flex items-center gap-1 mb-1.5">
                    {Array.from({ length: 5 }).map((_, i) => <Star key={i} className={`w-3 h-3 ${i < rev.stars ? 'fill-[#E7A100] text-[#E7A100]' : 'text-[#E5E7E3]'}`} />)}
                  </div>
                  <p className="text-xs text-[#667069] line-clamp-2 mb-2 leading-relaxed">{rev.text || '(Nessun testo)'}</p>
                  <div>{renderStatusIndicator(rev.status)}</div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className={`md:col-span-7 panel-card p-5 ${!selectedReviewId ? 'hidden md:block' : 'block'}`}>
          {selectedReview ? (
            <div className="space-y-4">
              <div className="md:hidden pb-2 border-b border-[#E5E7E3]">
                <button onClick={() => setSelectedReviewId(null)} className="flex items-center gap-1 text-xs text-[#1F5F4A] font-medium"><ArrowLeft className="w-3.5 h-3.5" /> Torna alla lista</button>
              </div>

              {selectedReview.stars <= 2 && <div className="bg-[#B3382C]/10 border border-[#B3382C]/30 px-3 py-2 rounded-[6px] text-xs text-[#B3382C] font-medium">Richiede attenzione: rileggi con cura prima di pubblicare.</div>}

              <div className="flex items-center justify-between border-b border-[#E5E7E3] pb-3">
                <div>
                  <h3 className="font-semibold text-sm text-[#1C2321]">{selectedReview.author}</h3>
                  <p className="text-xs text-[#667069]">{selectedReview.date}</p>
                </div>
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, i) => <Star key={i} className={`w-3.5 h-3.5 ${i < selectedReview.stars ? 'fill-[#E7A100] text-[#E7A100]' : 'text-[#E5E7E3]'}`} />)}
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-xs font-semibold text-[#667069] uppercase tracking-wide">Testo recensione:</p>
                <p className="text-xs text-[#1C2321] leading-relaxed bg-[#F6F7F5] p-3 rounded-[6px] border border-[#E5E7E3]">{selectedReview.text || '(Nessun testo)'}</p>
              </div>

              {selectedReview.status === 'pubblicata' && selectedReview.replyText && (
                <div className="space-y-1 bg-[#F6F7F5] p-3 rounded-[6px] border border-[#E5E7E3]">
                  <p className="text-xs font-semibold text-[#1F5F4A]">Risposta pubblicata il {selectedReview.replyDate || selectedReview.date}:</p>
                  <p className="text-xs text-[#1C2321] leading-relaxed">{selectedReview.replyText}</p>
                </div>
              )}

              <div className="space-y-2 pt-2 border-t border-[#E5E7E3]">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-[#1C2321]">{selectedReview.status === 'pubblicata' ? 'Modifica risposta pubblicata' : 'Bozza risposta'}</label>
                  <button onClick={() => handleGenerateDraft()} disabled={isGenerating} className="text-xs text-[#1F5F4A] hover:underline font-medium flex items-center gap-1 disabled:opacity-50">
                    <RotateCcw className={`w-3 h-3 ${isGenerating && generatingReviewId === selectedReview.id ? 'animate-spin' : ''}`} /> Genera risposta
                  </button>
                </div>
                {generationError && <p className="text-xs text-[#B3382C]">{generationError}</p>}
                <textarea value={draftReplyText} onChange={(e) => handleTextChange(e.target.value)} rows={4} disabled={isGenerating} placeholder="Scrivi o genera una risposta..." className="input-field w-full text-xs leading-relaxed" />
                <div className="text-[11px] text-[#667069] text-right">Firmato: {business.signerName}</div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button onClick={handleDiscardOrCancel} disabled={isSaving} className="btn-secondary px-3 py-1.5 text-xs text-[#B3382C] hover:bg-[#B3382C]/10">{selectedReview.status === 'pubblicata' ? 'Annulla modifiche' : 'Scarta'}</button>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleGenerateDraft()} disabled={isGenerating || isSaving} className="btn-secondary px-3 py-1.5 text-xs">Rigenera</button>
                  <button onClick={handleApproveAndPublish} disabled={isSaving || !draftReplyText.trim()} className="btn-primary px-4 py-1.5 text-xs disabled:opacity-50">{selectedReview.status === 'pubblicata' ? 'Aggiorna risposta pubblicata' : 'Approva e pubblica'}</button>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-xs text-[#667069]">Seleziona una recensione dalla lista a sinistra.</div>
          )}
        </div>
      </div>
    </div>
  );
};
