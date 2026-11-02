import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Business, RequestItem } from '../types';
import { getAppData, saveAppData } from '../storage';

interface RequestsTabProps {
  business: Business;
  requests: RequestItem[];
  onRefreshRequests: () => void;
  onUpdateBusiness: (updated: Partial<Business>) => void;
}

export const RequestsTab: React.FC<RequestsTabProps> = ({
  business,
  requests,
  onRefreshRequests,
  onUpdateBusiness,
}) => {
  const [clientName, setClientName] = useState('');
  const [phone, setPhone] = useState('');
  const [hasConsent, setHasConsent] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [editableUrl, setEditableUrl] = useState(business.googleUrl);
  const [smsTemplate, setSmsTemplate] = useState(business.smsTemplate);
  const [copied, setCopied] = useState(false);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(editableUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveSettings = () => {
    onUpdateBusiness({
      googleUrl: editableUrl,
      smsTemplate: smsTemplate,
    });
    alert('Impostazioni salvate');
  };

  const handleSendRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName || !phone || !hasConsent) return;

    setIsSending(true);
    try {
      const data = getAppData();
      const newReq: RequestItem = {
        id: 'req-' + Date.now(),
        businessId: business.id,
        clientName,
        phone,
        date: new Date().toISOString().replace('T', ' ').substring(0, 16),
        status: 'inviata'
      };
      const updatedRequests = [newReq, ...data.requests];
      saveAppData({ ...data, requests: updatedRequests });
      
      setClientName('');
      setPhone('');
      setHasConsent(false);
      onRefreshRequests();
      alert('Richiesta inviata');
    } catch (err) {
      alert('Errore durante l\'invio');
    } finally {
      setIsSending(false);
    }
  };

  const renderStatusBadge = (status: RequestItem['status']) => {
    switch (status) {
      case 'recensione_ricevuta':
        return <span className="text-xs text-[#1F5F4A] font-medium">Recensione ricevuta</span>;
      case 'vista':
        return <span className="text-xs text-[#2F5D9E] font-medium">SMS visto</span>;
      case 'inviata':
      default:
        return <span className="text-xs text-[#667069]">Inviata</span>;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Title */}
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-xl text-[#1C2321]">Richieste recensione</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: History Table */}
        <div className="lg:col-span-7 space-y-4">
          <div className="panel-card overflow-hidden">
            <div className="p-4 border-b border-[#E5E7E3]">
              <h3 className="font-semibold text-xs text-[#1C2321] uppercase tracking-wide">Storico richieste inviate</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F6F7F5] border-b border-[#E5E7E3] text-[#667069]">
                  <tr>
                    <th className="p-3 font-medium">Cliente</th>
                    <th className="p-3 font-medium">Telefono</th>
                    <th className="p-3 font-medium">Inviata il</th>
                    <th className="p-3 font-medium">Stato</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7E3]">
                  {requests.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-6 text-center text-[#667069]">Nessuna richiesta recente.</td>
                    </tr>
                  ) : (
                    requests.map((req) => (
                      <tr key={req.id} className="hover:bg-[#F6F7F5] transition">
                        <td className="p-3 font-medium text-[#1C2321]">{req.clientName}</td>
                        <td className="p-3 text-[#667069]">{req.phone}</td>
                        <td className="p-3 text-[#667069]">{req.date}</td>
                        <td className="p-3">{renderStatusBadge(req.status)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: New Request Form & QR Panel */}
        <div className="lg:col-span-5 space-y-6">
          <div className="panel-card p-5 space-y-4">
            <h3 className="font-semibold text-sm text-[#1C2321]">Nuova richiesta SMS</h3>

            <form onSubmit={handleSendRequest} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-[#667069]">Nome cliente</label>
                <input
                  type="text"
                  required
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Nome e cognome"
                  className="input-field w-full text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-[#667069]">Telefono</label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+41 ..."
                  className="input-field w-full text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-[#667069]">Testo SMS</label>
                <textarea
                  value={smsTemplate.replace('{nome}', clientName || 'Cliente').replace('{link}', editableUrl)}
                  onChange={(e) => setSmsTemplate(e.target.value)}
                  rows={3}
                  className="input-field w-full text-xs"
                />
              </div>

              <div className="flex items-start gap-2 pt-1">
                <input
                  type="checkbox"
                  id="consent"
                  checked={hasConsent}
                  onChange={(e) => setHasConsent(e.target.checked)}
                  className="mt-0.5 rounded border-[#E5E7E3]"
                />
                <label htmlFor="consent" className="text-[11px] text-[#667069] leading-tight">
                  Il cliente ha acconsentito alla ricezione del messaggio post-servizio.
                </label>
              </div>

              <button
                type="submit"
                disabled={!hasConsent || isSending || !clientName || !phone}
                className="btn-primary w-full py-2 text-xs disabled:opacity-50"
              >
                Invia richiesta
              </button>
            </form>

            {/* Note piccola sotto il modulo */}
            <p className="text-[11px] text-[#667069] leading-tight pt-2 border-t border-[#E5E7E3]">
              Nota: inviare a tutti i clienti, nessun premio o incentivo in cambio di recensioni.
            </p>
          </div>

          {/* QR Code Panel */}
          <div className="panel-card p-5 text-center space-y-3">
            <h3 className="font-semibold text-xs text-[#1C2321] uppercase tracking-wide">QR Code recensione</h3>
            <div className="bg-white p-4 rounded-[6px] border border-[#E5E7E3] inline-block">
              <QRCodeSVG value={editableUrl} size={140} level="H" includeMargin={true} />
            </div>
            <div className="space-y-2 text-left">
              <input
                type="url"
                value={editableUrl}
                onChange={(e) => setEditableUrl(e.target.value)}
                className="input-field w-full text-xs"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="btn-secondary px-3 py-1.5 text-xs w-full"
                >
                  {copied ? 'Copiato' : 'Copia link'}
                </button>
                <button
                  type="button"
                  onClick={handleSaveSettings}
                  className="btn-primary px-3 py-1.5 text-xs w-full"
                >
                  Salva URL
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
