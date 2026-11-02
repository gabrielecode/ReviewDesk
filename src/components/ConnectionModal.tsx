import React from 'react';
import { Store, CheckCircle2, AlertTriangle, X, Lock, ExternalLink } from 'lucide-react';
import { Business } from '../types';

interface ConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  business: Business | null;
  onUpdateBusiness: (updated: Partial<Business>) => void;
}

export const ConnectionModal: React.FC<ConnectionModalProps> = ({
  isOpen,
  onClose,
  business,
  onUpdateBusiness,
}) => {
  if (!isOpen || !business) return null;

  const handleSimulateConnection = () => {
    onUpdateBusiness({ isConnected: !business.isConnected });
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Connetti Google Business Profile</h3>
              <p className="text-xs text-slate-400">Gestione account per {business.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-300">Stato connessione</span>
              {business.isConnected ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Connesso (demo)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <AlertTriangle className="w-3.5 h-3.5" /> Non connesso
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">
              {business.isConnected
                ? 'Il profilo è collegato correttamente. Le recensioni e le richieste di esempio vengono sincronizzate automaticamente.'
                : 'Collega il profilo Google Business della tua attività per iniziare a ricevere e gestire le recensioni direttamente da ReviewDesk.'}
            </p>
          </div>

          <div className="space-y-3 text-xs text-slate-400 bg-slate-800/40 p-4 rounded-xl border border-slate-800">
            <div className="flex items-center gap-2 text-slate-300 font-medium">
              <Lock className="w-4 h-4 text-amber-400" />
              <span>TODO: integrazione Google Business Profile API</span>
            </div>
            <p>
              In un ambiente di produzione reale, questo pulsante avvierebbe il flusso OAuth ufficiale Google per autorizzare l'accesso alle recensioni dell'esercente tramite Google My Business API.
            </p>
            <div className="pt-2 flex items-center justify-between text-slate-500 font-mono text-[11px]">
              <span>Endpoint: https://mybusiness.googleapis.com/v4/accounts</span>
              <a href="#docs" onClick={(e) => e.preventDefault()} className="text-amber-400 hover:underline flex items-center gap-1">
                Documentazione API <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium transition"
            >
              Chiudi
            </button>
            <button
              onClick={handleSimulateConnection}
              className={`px-5 py-2.5 rounded-xl text-sm font-semibold shadow-lg transition ${
                business.isConnected
                  ? 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30'
                  : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20'
              }`}
            >
              {business.isConnected ? 'Simula disconnessione' : 'Connetti il tuo profilo Google'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
