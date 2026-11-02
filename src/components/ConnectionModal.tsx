import React from 'react';
import { X } from 'lucide-react';
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
    <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white border border-[#E5E7E3] rounded-[8px] w-full max-w-md overflow-hidden shadow-lg p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-[#E5E7E3] pb-3">
          <h3 className="font-semibold text-sm text-[#1C2321]">Connessione Google Business Profile</h3>
          <button
            onClick={onClose}
            className="text-[#667069] hover:text-[#1C2321] p-1 rounded-[6px] hover:bg-[#F6F7F5] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3 text-xs text-[#667069] leading-relaxed">
          <div className="flex items-center justify-between py-2 border-b border-[#E5E7E3]">
            <span className="font-medium text-[#1C2321]">Stato</span>
            <span className={`flex items-center gap-1.5 font-medium ${business.isConnected ? 'text-[#1F5F4A]' : 'text-[#B3382C]'}`}>
              <span className={`w-2 h-2 rounded-full ${business.isConnected ? 'bg-[#1F5F4A]' : 'bg-[#B3382C]'}`}></span>
              {business.isConnected ? 'Connesso' : 'Non connesso'}
            </span>
          </div>

          <p>
            Attività: <strong className="text-[#1C2321]">{business.name}</strong> ({business.location}).
          </p>
          <p>
            Questa è una simulazione dell'integrazione con le API di Google Business Profile per la gestione delle recensioni.
          </p>
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E5E7E3]">
          <button
            onClick={onClose}
            className="btn-secondary px-4 py-2 text-xs"
          >
            Chiudi
          </button>
          <button
            onClick={handleSimulateConnection}
            className="btn-primary px-4 py-2 text-xs"
          >
            {business.isConnected ? 'Simula disconnessione' : 'Connetti profilo'}
          </button>
        </div>
      </div>
    </div>
  );
};
