import React, { useState, useEffect } from 'react';
import { 
  Star, 
  Search,
  RotateCcw,
  ArrowLeft
} from 'lucide-react';
import { Review, Business } from '../types';
import { getAppData, saveAppData } from '../storage';

interface ReviewsTabProps {
  business: Business;
  reviews: Review[];
  onRefreshReviews: () => void;
}

export const ReviewsTab: React.FC<ReviewsTabProps> = ({
  business,
  reviews,
  onRefreshReviews,
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

  const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 768;

  // Filter reviews
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

  // Default selection on desktop if none selected
  useEffect(() => {
    if (isDesktop && filteredReviews.length > 0 && (!selectedReviewId || !filteredReviews.some(r => r.id === selectedReviewId))) {
      setSelectedReviewId(filteredReviews[0].id);
    } else if (filteredReviews.length === 0) {
      setSelectedReviewId(null);
    }
  }, [filteredReviews.length, filterStatus, filterStars, business.id]);

  const selectedReview = reviews.find(r => r.id === selectedReviewId) || null;

  // Sync draft text when selected review changes
  useEffect(() => {
    if (selectedReview) {
      if (selectedReview.draftText !== undefined) {
        setDraftReplyText(selectedReview.draftText);
      } else if (selectedReview.replyText) {
        setDraftReplyText(selectedReview.replyText);
      } else {
        setDraftReplyText('');
      }
      setGenerationError(null);
    }
  }, [selectedReviewId]);

  const handleTextChange = (val: string) => {
    setDraftReplyText(val);
    if (selectedReviewId) {
      const appData = getAppData();
      const updatedReviews: Review[] = appData.reviews.map(r => r.id === selectedReviewId ? { ...r, draftText: val } : r);
      saveAppData({ ...appData, reviews: updatedReviews });
    }
  };

  const handleGenerateDraft = async (rev?: Review) => {
    const target = rev || selectedReview;
    if (!target) return;

    setIsGenerating(true);
    setGeneratingReviewId(target.id);
    setGenerationError(null);

    try {
      const res = await fetch('/api/draft-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reviewId: target.id,
          reviewText: target.text,
          author: target.author,
          stars: target.stars,
          businessSettings: business,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Errore di generazione risposta');
      }
      const data = await res.json();
      const newDraft = data.draft;

      const appData = getAppData();
      const updatedReviews: Review[] = appData.reviews.map(r => {
        if (r.id === target.id) {
          return { 
            ...r, 
            draftText: newDraft, 
            status: (r.status === 'pubblicata' ? 'pubblicata' : 'bozza_pronta') as Review['status']
          };
        }
        return r;
      });
      saveAppData({ ...appData, reviews: updatedReviews });
      onRefreshReviews();

      // If user is still viewing this review, update textarea
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

    if (selectedReview.stars <= 2) {
      const confirmed = window.confirm('Attenzione: questa è una recensione da 1-2 stelle. Confermi di voler pubblicare la risposta?');
      if (!confirmed) return;
    }

    setIsSaving(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const appData = getAppData();
      const updatedReviews: Review[] = appData.reviews.map(r => r.id === selectedReview.id ? { 
        ...r, 
        replyText: draftReplyText, 
        draftText: undefined,
        status: 'pubblicata' as const,
        replyDate: today
      } : r);
      saveAppData({ ...appData, reviews: updatedReviews });
      onRefreshReviews();
    } catch (err) {
      alert('Errore durante la pubblicazione.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDiscardOrCancel = async () => {
    if (!selectedReview) return;
    setIsSaving(true);
    try {
      const appData = getAppData();
      const isPublished = selectedReview.status === 'pubblicata' || !!selectedReview.replyText;

      const updatedReviews: Review[] = appData.reviews.map(r => {
        if (r.id === selectedReview.id) {
          if (isPublished) {
            return { ...r, draftText: undefined, status: r.status };
          } else {
            return { ...r, draftText: undefined, replyText: undefined, replyDate: undefined, status: 'da_rispondere' as const };
          }
        }
        return r;
      });

      saveAppData({ ...appData, reviews: updatedReviews });
      if (isPublished) {
        setDraftReplyText(selectedReview.replyText || '');
      } else {
        setDraftReplyText('');
      }
      onRefreshReviews();
    } catch (err) {
      alert('Errore durante l\'operazione.');
    } finally {
      setIsSaving(false);
    }
  };

  // Metrics summary
  const totalReviewsCount = reviews.length;
  const daRispondereCount = reviews.filter(r => r.status === 'da_rispondere').length;
  const bozzaProntaCount = reviews.filter(r => r.status === 'bozza_pronta').length;
  const avgStarsVal = totalReviewsCount > 0 ? (reviews.reduce((acc, r) => acc + r.stars, 0) / totalReviewsCount).toFixed(1) : '0.0';
  const answeredCountVal = reviews.filter(r => r.status === 'pubblicata').length;
  const answeredPctVal = totalReviewsCount > 0 ? Math.round((answeredCountVal / totalReviewsCount) * 100) : 0;

  const renderStatusIndicator = (status: Review['status']) => {
    switch (status) {
      case 'pubblicata':
        return (
          <span className="flex items-center gap-1.5 text-[12px] text-[#1F5F4A]">
            <span className="w-2 h-2 rounded-full bg-[#1F5F4A]"></span> Pubblicata
          </span>
        );
      case 'bozza_pronta':
        return (
          <span className="flex items-center gap-1.5 text-[12px] text-[#2F5D9E]">
            <span className="w-2 h-2 rounded-full bg-[#2F5D9E]"></span> Bozza pronta
          </span>
        );
      case 'da_rispondere':
      default:
        return (
          <span className="flex items-center gap-1.5 text-[12px] text-[#946300]">
            <span className="w-2 h-2 rounded-full bg-[#946300]"></span> Da rispondere
          </span>
        );
    }
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Top Summary Line */}
      <div className="panel-card px-4 py-3 flex flex-wrap items-center justify-between text-xs text-[#667069] gap-2">
        <div>
          Da rispondere <strong className="text-[#1C2321]">{daRispondereCount}</strong> · 
          Bozze pronte <strong className="text-[#1C2321]">{bozzaProntaCount}</strong> · 
          Media <strong className="text-[#1C2321]">{avgStarsVal}</strong> · 
          Risposte <strong className="text-[#1C2321]">{answeredPctVal}%</strong>
        </div>
        <div className="text-[12px]">
          {filteredReviews.length} recensioni visualizzate
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="input-field text-xs py-1.5 px-3"
          >
            <option value="all">Tutti gli stati</option>
            <option value="da_rispondere">Da rispondere</option>
            <option value="bozza_pronta">Bozze pronte</option>
            <option value="pubblicata">Pubblicate</option>
          </select>

          <select
            value={filterStars}
            onChange={(e) => setFilterStars(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            className="input-field text-xs py-1.5 px-3"
          >
            <option value="all">Tutte le stelle</option>
            <option value="5">5 Stelle</option>
            <option value="4">4 Stelle</option>
            <option value="3">3 Stelle</option>
            <option value="2">2 Stelle</option>
            <option value="1">1 Stella</option>
          </select>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-[#667069] absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cerca per autore o testo..."
            className="input-field text-xs w-full pl-9 py-1.5"
          />
        </div>
      </div>

      {/* Two-Panel Layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
        {/* Left List Panel */}
        <div className={`md:col-span-5 panel-card overflow-hidden ${selectedReviewId ? 'hidden md:block' : 'block'}`}>
          <div className="divide-y divide-[#E5E7E3] max-h-[calc(100vh-240px)] overflow-y-auto">
            {filteredReviews.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <p className="text-xs text-[#667069]">Nessuna recensione trovata.</p>
                <button
                  onClick={() => { setFilterStatus('all'); setFilterStars('all'); setSearchQuery(''); }}
                  className="text-xs text-[#1F5F4A] font-medium hover:underline"
                >
                  Reimposta filtri
                </button>
              </div>
            ) : (
              filteredReviews.map((rev) => {
                const isSelected = rev.id === selectedReviewId;
                const snippet = rev.text ? (rev.text.length > 90 ? rev.text.substring(0, 90) + '...' : rev.text) : '(Nessun testo)';
                return (
                  <div
                    key={rev.id}
                    onClick={() => setSelectedReviewId(rev.id)}
                    className={`p-3.5 cursor-pointer transition text-left ${
                      isSelected ? 'bg-[#E8F0EC]/60 border-l-4 border-l-[#1F5F4A]' : 'hover:bg-[#F6F7F5]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-xs text-[#1C2321]">{rev.author}</span>
                      <span className="text-[11px] text-[#667069]">{rev.date}</span>
                    </div>

                    <div className="flex items-center gap-1 mb-1.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`w-3 h-3 ${i < rev.stars ? 'fill-[#E7A100] text-[#E7A100]' : 'text-[#E5E7E3]'}`}
                        />
                      ))}
                    </div>

                    <p className="text-xs text-[#667069] line-clamp-2 mb-2 leading-relaxed">
                      {snippet}
                    </p>

                    <div>
                      {renderStatusIndicator(rev.status)}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Detail Panel */}
        <div className={`md:col-span-7 panel-card p-5 ${!selectedReviewId ? 'hidden md:block' : 'block'}`}>
          {selectedReview ? (
            <div className="space-y-4">
              {/* Mobile Back Button */}
              <div className="md:hidden pb-2 border-b border-[#E5E7E3]">
                <button
                  onClick={() => setSelectedReviewId(null)}
                  className="flex items-center gap-1 text-xs text-[#1F5F4A] font-medium"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Torna alla lista
                </button>
              </div>

              {/* Warning bar for 1-2 stars */}
              {selectedReview.stars <= 2 && (
                <div className="bg-[#B3382C]/10 border border-[#B3382C]/30 px-3 py-2 rounded-[6px] text-xs text-[#B3382C] font-medium">
                  Richiede attenzione: rileggi con cura prima di pubblicare.
                </div>
              )}

              {/* Review Header */}
              <div className="flex items-center justify-between border-b border-[#E5E7E3] pb-3">
                <div>
                  <h3 className="font-semibold text-sm text-[#1C2321]">{selectedReview.author}</h3>
                  <p className="text-xs text-[#667069]">{selectedReview.date}</p>
                </div>
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`w-3.5 h-3.5 ${i < selectedReview.stars ? 'fill-[#E7A100] text-[#E7A100]' : 'text-[#E5E7E3]'}`}
                    />
                  ))}
                </div>
              </div>

              {/* Full Review Text */}
              <div className="space-y-1">
                <p className="text-xs font-semibold text-[#667069] uppercase tracking-wide">Testo recensione:</p>
                <p className="text-xs text-[#1C2321] leading-relaxed bg-[#F6F7F5] p-3 rounded-[6px] border border-[#E5E7E3]">
                  {selectedReview.text || '(Nessun testo, solo valutazione a stelle)'}
                </p>
              </div>

              {/* Published Reply Block if already published */}
              {selectedReview.status === 'pubblicata' && selectedReview.replyText && (
                <div className="space-y-1 bg-[#F6F7F5] p-3 rounded-[6px] border border-[#E5E7E3]">
                  <p className="text-xs font-semibold text-[#1F5F4A]">
                    Risposta pubblicata il {selectedReview.replyDate || selectedReview.date}:
                  </p>
                  <p className="text-xs text-[#1C2321] leading-relaxed">
                    {selectedReview.replyText}
                  </p>
                </div>
              )}

              {/* Response Editor Section */}
              <div className="space-y-2 pt-2 border-t border-[#E5E7E3]">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-[#1C2321]">
                    {selectedReview.status === 'pubblicata' ? 'Modifica risposta pubblicata' : 'Bozza risposta'}
                  </label>
                  <button
                    onClick={() => handleGenerateDraft()}
                    disabled={isGenerating}
                    className="text-xs text-[#1F5F4A] hover:underline font-medium flex items-center gap-1 disabled:opacity-50"
                  >
                    <RotateCcw className={`w-3 h-3 ${isGenerating && generatingReviewId === selectedReview.id ? 'animate-spin' : ''}`} />
                    Genera risposta
                  </button>
                </div>

                {generationError && (
                  <p className="text-xs text-[#B3382C]">{generationError}</p>
                )}

                <textarea
                  value={draftReplyText}
                  onChange={(e) => handleTextChange(e.target.value)}
                  rows={4}
                  disabled={isGenerating}
                  placeholder="Scrivi o genera una risposta..."
                  className="input-field w-full text-xs leading-relaxed"
                />
                <div className="text-[11px] text-[#667069] text-right">
                  Firmato: {business.signerName}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={handleDiscardOrCancel}
                  disabled={isSaving}
                  className="btn-secondary px-3 py-1.5 text-xs text-[#B3382C] hover:bg-[#B3382C]/10"
                >
                  {selectedReview.status === 'pubblicata' || selectedReview.replyText ? 'Annulla modifiche' : 'Scarta'}
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleGenerateDraft()}
                    disabled={isGenerating || isSaving}
                    className="btn-secondary px-3 py-1.5 text-xs"
                  >
                    Rigenera
                  </button>
                  <button
                    onClick={handleApproveAndPublish}
                    disabled={isSaving || !draftReplyText.trim()}
                    className="btn-primary px-4 py-1.5 text-xs disabled:opacity-50"
                  >
                    {selectedReview.status === 'pubblicata' ? 'Aggiorna risposta pubblicata' : 'Approva e pubblica'}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-xs text-[#667069]">
              Seleziona una recensione dalla lista a sinistra.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
