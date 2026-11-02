import React, { useState, useEffect } from 'react';
import { Settings, Save, Sparkles, Building, User, Globe, ShieldAlert, PhoneCall } from 'lucide-react';
import { Business } from '../types';

interface SettingsTabProps {
  business: Business;
  onUpdateBusiness: (updated: Partial<Business>) => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({ business, onUpdateBusiness }) => {
  const [formData, setFormData] = useState<Business>(business);
  const [saved, setSaved] = useState(false);
  const [geminiStatus, setGeminiStatus] = useState<boolean | null>(null);

  useEffect(() => {
    setFormData(business);
  }, [business]);

  useEffect(() => {
    fetch('/api/health')
      .then(res => res.json())
      .then(data => {
        setGeminiStatus(data.geminiConfigured);
      })
      .catch(() => setGeminiStatus(false));
  }, []);

  const handleChange = (field: keyof Business, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateBusiness(formData);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const previewReply = formData.tone === 'formale'
    ? `Gentile Cliente, La ringraziamo sentitamente per il Suo feedback positivo riguardo alla nostra attività. Cordiali saluti, ${formData.signerName}`
    : formData.tone === 'diretto'
    ? `Grazie mille per la recensione! Siamo felici che ti sia trovato bene. Un saluto, ${formData.signerName}`
    : `Grazie di cuore per le tue parole meravigliose! Siamo davvero entusiasti di averti ospitato. Ti aspettiamo presto! Un caro saluto, ${formData.signerName}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Settings className="w-6 h-6 text-amber-400" />
            Impostazioni Attività e Tono IA
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Personalizza le preferenze per la generazione automatica delle bozze di risposta di <span className="text-white font-medium">{business.name}</span>.
          </p>
        </div>

        <div>
          {geminiStatus === null ? (
            <span className="text-xs text-slate-400 px-3 py-1.5 rounded-full bg-slate-800 border border-slate-700">Verifica stato Gemini...</span>
          ) : geminiStatus ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> Gemini configurato
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-rose-400"></span> Gemini non configurato
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form */}
        <form onSubmit={handleSave} className="lg:col-span-2 bg-slate-950 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6 bg-slate-900">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-amber-400" /> Nome Attività
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-amber-400" /> Nome della persona che firma
              </label>
              <input
                type="text"
                required
                value={formData.signerName}
                onChange={(e) => handleChange('signerName', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Tono delle Risposte
              </label>
              <select
                value={formData.tone}
                onChange={(e) => handleChange('tone', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-500 cursor-pointer"
              >
                <option value="caloroso">Caloroso (Amichevole e caloroso)</option>
                <option value="formale">Formale (Professionale ed elegante)</option>
                <option value="diretto">Diretto (Sintetico e diretto)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-amber-400" /> Lingua Predefinita
              </label>
              <select
                value={formData.defaultLanguage}
                onChange={(e) => handleChange('defaultLanguage', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-500 cursor-pointer"
              >
                <option value="it">Italiano (Adatta anche il tedesco/inglese se recensito in lingua)</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400" /> Frasi da evitare
            </label>
            <input
              type="text"
              value={formData.phrasesToAvoid}
              onChange={(e) => handleChange('phrasesToAvoid', e.target.value)}
              placeholder="es. Speriamo di rivederci presto se non avete troppa fretta"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-500"
            />
            <p className="text-[11px] text-slate-500">L'IA eviterà di inserire espressioni simili nelle risposte generate.</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <PhoneCall className="w-3.5 h-3.5 text-amber-400" /> Contatto privato per casi negativi (Telefono o Email)
            </label>
            <input
              type="text"
              value={formData.privateContact}
              onChange={(e) => handleChange('privateContact', e.target.value)}
              placeholder="es. info@osteria.ch / +41 91 000 00 00"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-500"
            />
            <p className="text-[11px] text-slate-500">Inserito nelle risposte a recensioni negative (1-2 stelle) per invitare a un contatto privato.</p>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-800">
            {saved ? (
              <span className="text-xs font-medium text-emerald-400 flex items-center gap-1">
                ✓ Impostazioni salvate con successo!
              </span>
            ) : (
              <span></span>
            )}
            <button
              type="submit"
              className="px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-sm font-bold transition shadow-lg shadow-amber-500/20 flex items-center gap-2"
            >
              <Save className="w-4 h-4" /> Salva Impostazioni
            </button>
          </div>
        </form>

        {/* Live Preview Box */}
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="font-bold text-white text-base flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              Anteprima Risposta IA
            </h3>
            <p className="text-xs text-slate-400">
              Ecco come apparirà una risposta generata con il tono <span className="text-amber-400 font-semibold">{formData.tone}</span> e firmata da <span className="text-white font-semibold">{formData.signerName}</span>:
            </p>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs text-slate-200 italic leading-relaxed">
              "{previewReply}"
            </div>

            <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl space-y-2">
              <p className="text-xs font-bold text-amber-300">Regole attive per l'IA:</p>
              <ul className="text-[11px] text-amber-200/80 space-y-1 list-disc pl-4">
                <li>Massimo 70 parole</li>
                <li>Nessuna promessa di sconti o rimborsi</li>
                <li>Empatia e nessun giudizio per recensioni negative</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
