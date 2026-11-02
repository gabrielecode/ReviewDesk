import React from 'react';
import { ShieldCheck } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="py-6 px-6 border-t border-slate-800 bg-slate-950/60 text-center flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
      <div className="flex items-center gap-2">
        <span className="font-semibold text-slate-400">ReviewDesk Ticino</span>
        <span>•</span>
        <span>Prototipo dimostrativo, dati fittizi</span>
      </div>
      <div className="flex items-center gap-2">
        <ShieldCheck className="w-4 h-4 text-slate-400" />
        <span>Nessuna connessione reale a Google Business Profile</span>
      </div>
    </footer>
  );
};
