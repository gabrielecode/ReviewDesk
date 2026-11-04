import React, { useState, useEffect } from 'react';
import { Business } from '../types';
import { getAuthToken } from '../lib/firebase';
import { Compass, ExternalLink, RefreshCw, CheckCircle, AlertCircle, Copy, Check, Trash2, MessageSquare, Plus } from 'lucide-react';

interface TripAdvisorTabProps {
  business: Business;
}

export const TripAdvisorTab: React.FC<TripAdvisorTabProps> = ({ business }) => {
  const [placeUrl, setPlaceUrl] = useState('');
  const [sources, setSources] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchSourcesAndReviews = async () => {
    try {
      const token = await getAuthToken();
      const resSources = await fetch(`/api/tripadvisor/sources?businessId=${business.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (resSources.ok) {
        const data = await resSources.json();
        setSources(data.sources || []);
      }

      const resReviews = await fetch(`/api/tripadvisor/reviews?businessId=${business.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (resReviews.ok) {
        const data = await resReviews.json();
        setReviews(data.reviews || data);
      }
    } catch (err) {
      console.error('Error fetching TripAdvisor data:', err);
    }
  };

  useEffect(() => {
    if (business?.id) {
      fetchSourcesAndReviews();
    }
  }, [business?.id]);

  const handleAddSource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!placeUrl.trim()) return;

    setLoading(true);
    setStatusMsg(null);
    try {
      const token = await getAuthToken();
      const res = await fetch('/api/tripadvisor/sources', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ placeUrl: placeUrl.trim(), businessId: business.id })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Errore durante la connessione');

      setStatusMsg('Profilo TripAdvisor collegato con successo!');
      setPlaceUrl('');
      fetchSourcesAndReviews();
    } catch (err: any) {
      setStatusMsg(err.message || 'Errore durante il collegamento');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSource = async (id: string) => {
    if (!window.confirm('Vuoi rimuovere questa connessione TripAdvisor?')) return;
    try {
      const token = await getAuthToken();
      await fetch(`/api/tripadvisor/sources/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchSourcesAndReviews();
    } catch (err) {
      console.error(err);
    }
  };

  const handleConfirmPublish = async (reviewId: string) => {
    try {
      const token = await getAuthToken();
      await fetch(`/api/tripadvisor/reviews/${reviewId}/publish-confirm`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchSourcesAndReviews();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCopyAndOpen = (review: any) => {
    const textToCopy = review.ownerResponse || review.draftText || 'Grazie per la sua recensione!';
    navigator.clipboard.writeText(textToCopy);
    setCopiedId(review.id);
    setTimeout(() => setCopiedId(null), 3000);

    const replyUrl = review.directReplyUrl || review.rawPayload?.mgmtResponseUrl || review.placeUrl || 'https://www.tripadvisor.com';
    window.open(replyUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1C2321] flex items-center gap-2">
            <Compass className="w-7 h-7 text-[#00AF87]" /> TripAdvisor Monitor &amp; Reply
          </h1>
          <p className="text-sm text-[#586159]">
            Gestisci le recensioni TripAdvisor per {business.name}. Monitoraggio via Apify, bozze AI e risposte manuali.
          </p>
        </div>
      </div>

      {/* Connection Form */}
      <div className="panel-card bg-white p-6 rounded-lg border border-[#E2E5E0] shadow-sm">
        <h2 className="text-lg font-semibold mb-2">Collega il tuo ristorante o locale su TripAdvisor</h2>
        <p className="text-xs text-[#586159] mb-4">
          Incolla l'URL della pagina TripAdvisor della tua attività (es. https://www.tripadvisor.it/Restaurant_Review-...).
        </p>

        <form onSubmit={handleAddSource} className="flex gap-3">
          <input 
            type="url"
            value={placeUrl}
            onChange={e => setPlaceUrl(e.target.value)}
            placeholder="https://www.tripadvisor.it/Restaurant_Review-..."
            required
            className="flex-1 p-2.5 border border-[#C9CEC8] rounded-md text-sm"
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-[#00AF87] hover:bg-[#008f6d] text-white px-5 py-2.5 rounded-md font-semibold text-sm transition flex items-center gap-2 disabled:opacity-50"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Collega TripAdvisor
          </button>
        </form>

        {statusMsg && (
          <div className="mt-3 p-3 bg-[#E8F0EC] text-[#1F5F4A] rounded-md text-xs font-medium">
            {statusMsg}
          </div>
        )}
      </div>

      {/* Connected Sources List */}
      {sources.length > 0 && (
        <div className="bg-white rounded-lg border border-[#E2E5E0] p-6 shadow-sm">
          <h3 className="text-md font-semibold mb-3">Fonti collegate</h3>
          <div className="space-y-3">
            {sources.map(src => (
              <div key={src.id} className="flex items-center justify-between p-3 bg-[#FAFBF9] rounded-md border border-[#E2E5E0]">
                <div>
                  <p className="font-semibold text-sm text-[#1C2321]">{src.placeName || src.placeUrl}</p>
                  <a href={src.placeUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-[#00AF87] hover:underline flex items-center gap-1 mt-0.5">
                    Visita pagina TripAdvisor <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <button
                  onClick={() => handleDeleteSource(src.id)}
                  className="text-red-600 hover:text-red-800 p-2 text-xs font-semibold flex items-center gap-1"
                >
                  <Trash2 className="w-4 h-4" /> Disconnetti
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reviews Queue */}
      <div className="bg-white rounded-lg border border-[#E2E5E0] p-6 shadow-sm">
        <h3 className="text-md font-semibold mb-4 flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-[#00AF87]" /> Recensioni TripAdvisor ({reviews.length})
        </h3>

        {reviews.length === 0 ? (
          <div className="text-center py-12 text-[#586159] text-sm">
            Nessuna recensione TripAdvisor sincronizzata al momento. Collega la pagina sopra per iniziare.
          </div>
        ) : (
          <div className="space-y-4">
            {reviews.map((rev: any) => (
              <div key={rev.id} className="border border-[#E2E5E0] rounded-lg p-4 bg-white shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <strong className="text-sm text-[#1C2321]">{rev.reviewerName || 'Ospite TripAdvisor'}</strong>
                    <div className="text-amber-500 text-xs mt-0.5">
                      {'★'.repeat(rev.rating || 5)}{'☆'.repeat(5 - (rev.rating || 5))}
                    </div>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                    rev.status === 'published_manually' ? 'bg-green-100 text-green-800' :
                    rev.status === 'drafted' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                  }`}>
                    {rev.status === 'published_manually' ? 'Pubblicata' : rev.status === 'drafted' ? 'Bozza pronta' : 'Nuova'}
                  </span>
                </div>

                <p className="text-sm text-[#1C2321] leading-relaxed">{rev.text || rev.title}</p>

                {/* Response / Draft Box */}
                <div className="bg-[#FAFBF9] border border-[#E2E5E0] p-3 rounded-md space-y-2">
                  <div className="text-xs text-[#586159] font-medium">Bozza di risposta suggerita dall'AI:</div>
                  <p className="text-sm text-[#1C2321] italic">{rev.ownerResponse || rev.draftText || 'Bozza in elaborazione...'}</p>
                  
                  <div className="flex flex-wrap gap-2 pt-2">
                    <button
                      onClick={() => handleCopyAndOpen(rev)}
                      className="bg-[#00AF87] hover:bg-[#008f6d] text-white text-xs px-3.5 py-2 rounded-md font-semibold transition flex items-center gap-1.5"
                    >
                      {copiedId === rev.id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedId === rev.id ? 'Copiato!' : 'Copia e apri TripAdvisor'}
                    </button>

                    {rev.status !== 'published_manually' && (
                      <button
                        onClick={() => handleConfirmPublish(rev.id)}
                        className="bg-gray-100 hover:bg-gray-200 text-[#1C2321] text-xs px-3.5 py-2 rounded-md font-semibold transition flex items-center gap-1.5"
                      >
                        <CheckCircle className="w-3.5 h-3.5 text-green-600" /> Conferma pubblicazione manuale
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
