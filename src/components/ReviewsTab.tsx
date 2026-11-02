import React, { useState } from 'react';
import { 
  Star, 
  MessageSquare, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Sparkles, 
  Send, 
  X, 
  RotateCcw, 
  Filter,
  Trash2
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
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [draftReplyText, setDraftReplyText] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Filter reviews
  const filteredReviews = reviews.filter((r) => {
    if (filterStatus !== 'all' && r.status !== filterStatus) return false;
    if (filterStars !== 'all' && r.stars !== filterStars) return false;
    return true;
  });

  const handleOpenDraft = async (review: Review) => {
    setSelectedReview(review);
    setGenerationError(null);
    if (review.replyText) {
      setDraftReplyText(review.replyText);
    } else {
      await generateDraft(review);
    }
  };

  const generateDraft = async (reviewToUse?: Review) => {
    const target = reviewToUse || selectedReview;
    if (!target) return;

    setIsGenerating(true);
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
        throw new Error(errData.error || 'Errore di comunicazione con il server AI');
      }
      const data = await res.json();
      setDraftReplyText(data.draft);

      // Save draft to localStorage
      const appData = getAppData();
      const updatedReviews = appData.reviews.map(r => r.id === target.id ? { ...r, replyText: data.draft, status: 'bozza_pronta' as const } : r);
      saveAppData({ ...appData, reviews: updatedReviews });

      onRefreshReviews();
    } catch (err: any) {
      console.error(err);
      setGenerationError(err.message || 'Si è verificato un errore durante la generazione della bozza.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApproveAndPublish = async () => {
    if (!selectedReview) return;
    setIsSaving(true);
    try {
      const appData = getAppData();
      const updatedReviews = appData.reviews.map(r => r.id === selectedReview.id ? { ...r, replyText: draftReplyText, status: 'pubblicata' as const } : r);
      saveAppData({ ...appData, reviews: updatedReviews });

      onRefreshReviews();
      setSelectedReview(null);
    } catch (err) {
      alert('Errore durante la pubblicazione della risposta.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDiscard = async () => {
    if (!selectedReview) return;
    setIsSaving(true);
    try {
      const appData = getAppData();
      const updatedReviews = appData.reviews.map(r => r.id === selectedReview.id ? { ...r, replyText: undefined, status: 'da_rispondere' as const } : r);
      saveAppData({ ...appData, reviews: updatedReviews });

      onRefreshReviews();
      setSelectedReview(null);
    } catch (err) {
      alert('Errore durante lo scarto.');
    } finally {
      setIsSaving(false);
    }
  };

  const getStatusBadge = (status: Review['status']) => {
    switch (status) {
      case 'pubblicata':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5" /> Pubblicata
          </span>
        );
      case 'bozza_pronta':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Sparkles className="w-3.5 h-3.5" /> Bozza pronta
          </span>
        );
      case 'da_rispondere':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
            <Clock className="w-3.5 h-3.5 text-slate-400" /> Da rispondere
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-amber-400" />
            Gestione Recensioni Google
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Visualizza le recensioni di <span className="text-white font-medium">{business.name}</span> e prepara risposte professionali con l'IA.
          </p>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-950 px-3 py-2 rounded-xl border border-slate-800">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-transparent text-xs text-white focus:outline-none font-medium cursor-pointer"
            >
              <option value="all" className="bg-slate-900">Tutti gli stati</option>
              <option value="da_rispondere" className="bg-slate-900">Da rispondere</option>
              <option value="bozza_pronta" className="bg-slate-900">Bozza pronta</option>
              <option value="pubblicata" className="bg-slate-900">Pubblicate</option>
            </select>
          </div>

          <div className="flex items-center gap-2 bg-slate-950 px-3 py-2 rounded-xl border border-slate-800">
            <Star className="w-4 h-4 text-amber-400" />
            <select
              value={filterStars}
              onChange={(e) => setFilterStars(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              className="bg-transparent text-xs text-white focus:outline-none font-medium cursor-pointer"
            >
              <option value="all" className="bg-slate-900">Tutte le stelle</option>
              <option value="5" className="bg-slate-900">5 Stelle</option>
              <option value="4" className="bg-slate-900">4 Stelle</option>
              <option value="3" className="bg-slate-900">3 Stelle</option>
              <option value="2" className="bg-slate-900">2 Stelle</option>
              <option value="1" className="bg-slate-900">1 Stella</option>
            </select>
          </div>
        </div>
      </div>

      {/* Reviews List */}
      <div className="grid grid-cols-1 gap-4">
        {filteredReviews.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center space-y-3">
            <MessageSquare className="w-12 h-12 text-slate-600 mx-auto" />
            <p className="text-slate-300 font-medium">Nessuna recensione trovata con i filtri selezionati</p>
            <button
              onClick={() => { setFilterStatus('all'); setFilterStars('all'); }}
              className="text-xs text-amber-400 hover:underline font-semibold"
            >
              Reimposta filtri
            </button>
          </div>
        ) : (
          filteredReviews.map((review) => {
            const isNegative = review.stars <= 2;
            return (
              <div
                key={review.id}
                className={`bg-slate-900 border rounded-2xl p-6 transition hover:border-slate-700 shadow-lg relative overflow-hidden ${
                  isNegative ? 'border-rose-500/40 bg-gradient-to-r from-rose-950/10 to-slate-900' : 'border-slate-800'
                }`}
              >
                {isNegative && (
                  <div className="absolute top-0 right-0 bg-rose-500 text-slate-950 text-[10px] font-bold px-3 py-1 rounded-bl-xl uppercase tracking-wider flex items-center gap-1 shadow-sm">
                    <AlertTriangle className="w-3 h-3" /> Richiede attenzione
                  </div>
                )}

                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center font-bold text-amber-400 border border-slate-700 text-sm">
                        {review.author.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-bold text-white text-base">{review.author}</h3>
                        <p className="text-xs text-slate-400">{review.date}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 text-amber-400 pt-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${i < review.stars ? 'fill-amber-400 text-amber-400' : 'text-slate-700'}`}
                        />
                      ))}
                      <span className="text-xs text-slate-400 ml-2 font-medium">({review.stars}/5)</span>
                    </div>

                    <p className="text-slate-200 text-sm pt-1 leading-relaxed">
                      {review.text || <span className="italic text-slate-500">(Nessun testo, solo valutazione a stelle)</span>}
                    </p>

                    {review.replyText && (
                      <div className="mt-4 bg-slate-950/60 p-4 rounded-xl border border-slate-800/80 space-y-1">
                        <p className="text-xs font-semibold text-amber-400 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Risposta pubblicata:
                        </p>
                        <p className="text-xs text-slate-300 italic">{review.replyText}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex md:flex-col items-center md:items-end justify-between gap-3 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-800">
                    {getStatusBadge(review.status)}

                    <button
                      onClick={() => handleOpenDraft(review)}
                      className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition shadow-md shadow-amber-500/20 flex items-center gap-2"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      {review.status === 'pubblicata' ? 'Modifica risposta' : review.status === 'bozza_pronta' ? 'Visualizza bozza' : 'Prepara risposta'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Draft Reply Modal / Panel */}
      {selectedReview && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Risposta a {selectedReview.author}</h3>
                  <p className="text-xs text-slate-400">Valutazione: {selectedReview.stars} stelle • {selectedReview.date}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedReview(null)}
                className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-2">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Recensione cliente:</p>
                <p className="text-sm text-slate-200 italic">"{selectedReview.text || 'Solo stelle'}"</p>
              </div>

              {selectedReview.stars <= 2 && (
                <div className="bg-rose-500/10 border border-rose-500/30 p-3 rounded-xl flex items-center gap-3 text-rose-300 text-xs font-medium">
                  <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
                  <span>Rileggi con cura prima di pubblicare. Questa recensione richiede attenzione particolare e tatto.</span>
                </div>
              )}

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Bozza generata da Gemini (Modificabile)
                  </label>
                  <button
                    onClick={() => generateDraft()}
                    disabled={isGenerating}
                    className="text-xs text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1 disabled:opacity-50"
                  >
                    <RotateCcw className={`w-3 h-3 ${isGenerating ? 'animate-spin' : ''}`} />
                    Rigenera con IA
                  </button>
                </div>

                {generationError ? (
                  <div className="bg-rose-500/10 border border-rose-500/30 p-4 rounded-xl space-y-3 text-center">
                    <p className="text-xs text-rose-300">{generationError}</p>
                    <button
                      onClick={() => generateDraft()}
                      className="px-4 py-2 rounded-lg bg-rose-500 text-slate-950 text-xs font-bold hover:bg-rose-400 transition"
                    >
                      Riprova
                    </button>
                  </div>
                ) : (
                  <textarea
                    value={draftReplyText}
                    onChange={(e) => setDraftReplyText(e.target.value)}
                    rows={5}
                    disabled={isGenerating}
                    placeholder="Generazione bozza in corso..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm text-slate-100 focus:outline-none focus:border-amber-500 transition leading-relaxed disabled:opacity-50"
                  />
                )}
                <p className="text-[11px] text-slate-500 text-right">
                  Firmato come: <span className="font-semibold text-slate-400">{business.signerName}</span> • Max 70 parole
                </p>
              </div>
            </div>

            <div className="p-6 border-t border-slate-800 flex items-center justify-between bg-slate-950/40">
              <button
                onClick={handleDiscard}
                disabled={isSaving}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-rose-500/20 text-slate-300 hover:text-rose-300 text-xs font-semibold transition flex items-center gap-1.5 border border-slate-700"
              >
                <Trash2 className="w-3.5 h-3.5" /> Scarta bozza
              </button>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSelectedReview(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition"
                >
                  Annulla
                </button>
                <button
                  onClick={handleApproveAndPublish}
                  disabled={isSaving || !draftReplyText.trim()}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition shadow-lg shadow-amber-500/20 flex items-center gap-2 disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" /> Approva e pubblica su Google
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
