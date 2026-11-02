import React, { useState, useEffect } from 'react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid 
} from 'recharts';
import { Business, Review, InsightsData } from '../types';

interface StatsTabProps {
  business: Business;
  reviews: Review[];
}

export const StatsTab: React.FC<StatsTabProps> = ({ business, reviews }) => {
  const [insights, setInsights] = useState<InsightsData | null>(null);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [insightsError, setInsightsError] = useState<string | null>(null);

  const STORAGE_INSIGHTS_KEY = `reviewdesk_insights_${business.id}`;

  // Load cached insights on mount
  useEffect(() => {
    try {
      const cached = localStorage.getItem(STORAGE_INSIGHTS_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && Array.isArray(parsed.strengths) && Array.isArray(parsed.improvements)) {
          setInsights(parsed);
        }
      }
    } catch (e) {
      console.error(e);
    }
  }, [business.id]);

  // Calculate stats
  const totalReviews = reviews.length;
  const avgStars = totalReviews > 0 
    ? (reviews.reduce((acc, r) => acc + r.stars, 0) / totalReviews).toFixed(1) 
    : '0.0';
  
  // Conteggio pubblicate = solo stato pubblicata
  const publishedCount = reviews.filter(r => r.status === 'pubblicata').length;
  const publishedPct = totalReviews > 0 ? Math.round((publishedCount / totalReviews) * 100) : 0;

  // Tempo medio di risposta calcolato dai giorni tra date e replyDate ("n/d" se mancano dati)
  let avgResponseTime = 'n/d';
  const repliedWithDates = reviews.filter(r => r.date && r.replyDate);
  if (repliedWithDates.length > 0) {
    const totalDiffDays = repliedWithDates.reduce((acc, r) => {
      const d1 = new Date(r.date).getTime();
      const d2 = new Date(r.replyDate!).getTime();
      const diffDays = Math.max(0, (d2 - d1) / (1000 * 60 * 60 * 24));
      return acc + diffDays;
    }, 0);
    const avgDays = totalDiffDays / repliedWithDates.length;
    if (avgDays < 1) {
      const avgHours = Math.round(avgDays * 24 * 10) / 10;
      avgResponseTime = `${avgHours} ore`;
    } else {
      const roundedDays = Math.round(avgDays * 10) / 10;
      avgResponseTime = `${roundedDays} giorni`;
    }
  }

  // Grafico con il conteggio reale delle recensioni per mese negli ultimi 6 mesi, senza valori inventati
  const getTrendData = () => {
    const now = new Date();
    const months: { key: string; label: string; count: number; starsSum: number }[] = [];
    
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const month = d.getMonth();
      const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
      const label = d.toLocaleString('it-CH', { month: 'short' });
      months.push({ key: monthKey, label, count: 0, starsSum: 0 });
    }

    reviews.forEach(r => {
      if (!r.date) return;
      // r.date expected YYYY-MM-DD
      const rKey = r.date.substring(0, 7);
      const found = months.find(m => m.key === rKey);
      if (found) {
        found.count++;
        found.starsSum += r.stars;
      }
    });

    return months.map(m => ({
      mese: m.label.charAt(0).toUpperCase() + m.label.slice(1),
      recensioni: m.count,
      media: m.count > 0 ? Number((m.starsSum / m.count).toFixed(1)) : 0
    }));
  };

  const trendData = getTrendData();

  const fetchInsights = async () => {
    setLoadingInsights(true);
    setInsightsError(null);
    try {
      const res = await fetch('/api/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ business, reviews }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Errore analisi');
      }
      const data = await res.json();
      if (!data || !Array.isArray(data.strengths) || !Array.isArray(data.improvements)) {
        throw new Error('Formato risposta non valido');
      }
      setInsights(data);
      localStorage.setItem(STORAGE_INSIGHTS_KEY, JSON.stringify(data));
    } catch (err: any) {
      console.error(err);
      setInsightsError(err.message || 'Errore durante la generazione dell\'analisi.');
    } finally {
      setLoadingInsights(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Title */}
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-xl text-[#1C2321]">Statistiche e analisi</h2>
      </div>

      {/* 4 Numbers in a Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="panel-card p-4 space-y-1">
          <p className="text-xs text-[#667069] font-medium">Media stelle</p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-[#1C2321]">{avgStars}</span>
            <span className="text-xs text-[#1F5F4A]">su 5.0</span>
          </div>
        </div>

        <div className="panel-card p-4 space-y-1">
          <p className="text-xs text-[#667069] font-medium">Recensioni</p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-[#1C2321]">{totalReviews}</span>
            <span className="text-xs text-[#667069]">totali</span>
          </div>
        </div>

        <div className="panel-card p-4 space-y-1">
          <p className="text-xs text-[#667069] font-medium">Risposte</p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-[#1C2321]">{publishedPct}%</span>
            <span className="text-xs text-[#1F5F4A]">{publishedCount} pubblicate</span>
          </div>
        </div>

        <div className="panel-card p-4 space-y-1">
          <p className="text-xs text-[#667069] font-medium">Tempo medio risposta</p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-[#1C2321]">{avgResponseTime}</span>
          </div>
        </div>
      </div>

      {/* Line Chart & Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Single Line Chart with real review counts */}
        <div className="panel-card p-5 space-y-4">
          <h3 className="font-semibold text-xs text-[#1C2321] uppercase tracking-wide">Andamento recensioni (ultimi 6 mesi)</h3>
          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7E3" opacity={0.6} />
                <XAxis dataKey="mese" stroke="#667069" fontSize={11} />
                <YAxis stroke="#667069" fontSize={11} allowDecimals={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E5E7E3', borderRadius: '6px', color: '#1C2321', fontSize: '12px' }}
                />
                <Line type="monotone" dataKey="recensioni" stroke="#1F5F4A" strokeWidth={2} dot={{ r: 3, fill: '#1F5F4A' }} name="Recensioni" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* AI Insights Panel */}
        <div className="panel-card p-5 space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-xs text-[#1C2321] uppercase tracking-wide">Sintesi recensioni (IA)</h3>
              <button
                onClick={fetchInsights}
                disabled={loadingInsights}
                className="btn-secondary px-3 py-1 text-xs disabled:opacity-50"
              >
                {loadingInsights ? 'Generazione...' : insights ? 'Aggiorna analisi' : 'Genera analisi'}
              </button>
            </div>

            {insightsError && (
              <div className="p-3 bg-[#B3382C]/10 border border-[#B3382C]/30 rounded-[6px] space-y-2">
                <p className="text-xs text-[#B3382C]">{insightsError}</p>
                <button
                  onClick={fetchInsights}
                  className="btn-primary px-3 py-1 text-xs"
                >
                  Riprova
                </button>
              </div>
            )}

            {!insights && !insightsError && !loadingInsights && (
              <div className="p-8 text-center space-y-2">
                <p className="text-xs text-[#667069]">Clicca su "Genera analisi" per analizzare le recensioni con l'IA.</p>
              </div>
            )}

            {loadingInsights && (
              <p className="text-xs text-[#667069] py-8 text-center">Analisi in corso con OpenRouter...</p>
            )}

            {insights && !loadingInsights && (
              <div className="space-y-4 text-xs">
                <div className="space-y-2">
                  <p className="font-medium text-[#1F5F4A]">Punti di forza</p>
                  <ul className="space-y-1.5">
                    {insights.strengths.length === 0 ? (
                      <li className="text-[#667069] italic">Nessun punto di forza evidenziato.</li>
                    ) : (
                      insights.strengths.map((item, idx) => (
                        <li key={idx} className="bg-[#F6F7F5] p-2.5 rounded-[6px] border border-[#E5E7E3] text-[#1C2321]">
                          {item}
                        </li>
                      ))
                    )}
                  </ul>
                </div>

                <div className="space-y-2">
                  <p className="font-medium text-[#B3382C]">Aree di miglioramento</p>
                  <ul className="space-y-1.5">
                    {insights.improvements.length === 0 ? (
                      <li className="text-[#667069] italic">Nessuna area di miglioramento evidenziata.</li>
                    ) : (
                      insights.improvements.map((item, idx) => (
                        <li key={idx} className="bg-[#F6F7F5] p-2.5 rounded-[6px] border border-[#E5E7E3] text-[#1C2321]">
                          {item}
                        </li>
                      ))
                    )}
                  </ul>
                </div>
              </div>
            )}
          </div>

          <p className="text-[11px] text-[#667069] pt-3 border-t border-[#E5E7E3]">
            Sintesi automatica basata sulle recensioni dell'attività.
          </p>
        </div>
      </div>
    </div>
  );
};
