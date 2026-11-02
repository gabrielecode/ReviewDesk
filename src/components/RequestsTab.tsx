import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Business, RequestItem } from '../types';
import { createRequestInDb } from '../storage';

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
  const [phone, setPhone] = useState('+41 ');
  const [hasConsent, setHasConsent] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [editableUrl, setEditableUrl] = useState(business.googleUrl);
  const [smsTemplate, setSmsTemplate] = useState(business.smsTemplate);
  const [copied, setCopied] = useState(false);
  const [inlineMessage, setInlineMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(editableUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      window.prompt('Copia manualmente il link:', editableUrl);
    }
  };

  const handleSaveSettings = () => {
    onUpdateBusiness({
      googleUrl: editableUrl,
      smsTemplate: smsTemplate,
    });
    setInlineMessage({ type: 'success', text: 'Impostazioni salvate con successo' });
    setTimeout(() => setInlineMessage(null), 3000);
  };

  const handleSendRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setInlineMessage(null);

    if (!clientName.trim()) {
      setInlineMessage({ type: 'error', text: 'Inserisci il nome del cliente.' });
      return;
    }

    const cleanPhone = phone.replace(/\s+/g, '');
    const phoneRegex = /^\+41\d{9}$/;
    if (!phoneRegex.test(cleanPhone)) {
      setInlineMessage({ type: 'error', text: 'Formato telefono non valido. Deve iniziare con +41 seguito da 9 cifre (es. +41791234567).' });
      return;
    }

    if (!hasConsent) {
      setInlineMessage({ type: 'error', text: 'È necessario il consenso del cliente.' });
      return;
    }

    setIsSending(true);
    try {
      const finalSmsText = smsTemplate.replaceAll('{nome}', clientName).replaceAll('{link}', editableUrl);
      const nowStr = new Date().toLocaleString('it-CH');
      const nowIso = new Date().toISOString();

      const newReq: RequestItem = {
        id: 'req-' + Date.now(),
        businessId: business.id,
        clientName,
        phone: cleanPhone,
        date: nowStr,
        status: 'inviata',
        text: finalSmsText,
        consent: true,
        consentAt: nowIso
      };

      await createRequestInDb(newReq);
      
      setClientName('');
      setPhone('+41 ');
      setHasConsent(false);
      onRefreshRequests();
      setInlineMessage({ type: 'success', text: 'Richiesta SMS inviata con successo!' });
      setTimeout(() => setInlineMessage(null), 3000);
    } catch (err) {
      setInlineMessage({ type: 'error', text: 'Errore durante l\'invio della richiesta.' });
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

  const previewText = smsTemplate.replaceAll('{nome}', clientName || 'Nome Cliente').replaceAll('{link}', editableUrl);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Title */}
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-xl text-[#1C2321]">Richieste recensione</h2>
      </div>

      {inlineMessage && (
        <div className={`p-3 rounded-[6px] text-xs font-medium ${
          inlineMessage.type === 'success' ? 'bg-[#1F5F4A]/10 text-[#1F5F4A] border border-[#1F5F4A]/30' : 'bg-[#B3382C]/10 text-[#B3382C] border border-[#B3382C]/30'
        }`}>
          {inlineMessage.text}
        </div>
      )}

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
                    <th className="p-3 font-medium">Consenso</th>
                    <th className="p-3 font-medium">Stato</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7E3]">
                  {requests.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-[#667069]">Nessuna richiesta recente.</td>
                    </tr>
                  ) : (
                    requests.map((req) => (
                      <tr key={req.id} className="hover:bg-[#F6F7F5] transition">
                        <td className="p-3 font-medium text-[#1C2321]">{req.clientName}</td>
                        <td className="p-3 text-[#667069]">{req.phone}</td>
                        <td className="p-3 text-[#667069]">{req.date}</td>
                        <td className="p-3 text-[#667069]">
                          {req.consent ? (
                            <span className="text-[#1F5F4A] font-medium" title={req.consentAt ? `Consentito il ${req.consentAt}` : undefined}>Sì</span>
                          ) : 'No'}
                        </td>
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
                <label className="text-xs font-medium text-[#667069]">Telefono (+41...)</label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+41791234567"
                  className="input-field w-full text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-[#667069]">Modello SMS</label>
                <textarea
                  value={smsTemplate}
                  onChange={(e) => setSmsTemplate(e.target.value)}
                  rows={2}
                  className="input-field w-full text-xs"
                />
              </div>

              {/* Anteprima non modificabile */}
              <div className="space-y-1 bg-[#F6F7F5] p-3 rounded-[6px] border border-[#E5E7E3]">
                <label className="text-[11px] font-semibold text-[#667069] uppercase tracking-wide block">Anteprima SMS:</label>
                <p className="text-xs text-[#1C2321] italic leading-relaxed">
                  "{previewText}"
                </p>
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
