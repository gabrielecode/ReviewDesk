import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { MessageSquare, Send, Smartphone, Copy, Check, ExternalLink } from 'lucide-react';
import { Business, RequestItem } from '../types';
import { createRequestInDb } from '../storage';

interface RequestsTabProps {
  business: Business;
  requests: RequestItem[];
  onRefreshRequests: () => void | Promise<void>;
  onUpdateBusiness: (updated: Partial<Business>) => void | Promise<void>;
}

function normalizePhone(input: string): string {
  if (!input) return '';
  let cleaned = input.trim().replace(/[^\d+]/g, '');
  if (cleaned.startsWith('00')) {
    cleaned = '+' + cleaned.substring(2);
  } else if (cleaned.startsWith('0')) {
    cleaned = '+41' + cleaned.substring(1);
  } else if (!cleaned.startsWith('+')) {
    cleaned = '+' + cleaned;
  }
  return cleaned;
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
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
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

  const handleSaveSettings = async () => {
    try {
      await onUpdateBusiness({
        googleUrl: editableUrl,
        smsTemplate: smsTemplate,
      });
      setInlineMessage({ type: 'success', text: 'Impostazioni salvate con successo!' });
      setTimeout(() => setInlineMessage(null), 3000);
    } catch (err: any) {
      setInlineMessage({ type: 'error', text: err.message || 'Errore durante il salvataggio.' });
    }
  };

  const createAndRegisterRequest = async (sendMethod: 'sms' | 'whatsapp' | 'copy') => {
    setInlineMessage(null);

    if (!clientName.trim()) {
      setInlineMessage({ type: 'error', text: 'Inserisci il nome del cliente.' });
      return null;
    }

    const cleanPhone = normalizePhone(phone);
    if (!cleanPhone || cleanPhone.length < 8) {
      setInlineMessage({ type: 'error', text: 'Inserisci un numero di telefono valido (es. +41 79 123 45 67 o 0791234567).' });
      return null;
    }

    if (!hasConsent) {
      setInlineMessage({ type: 'error', text: 'Spunta la casella del consenso del cliente per procedere.' });
      return null;
    }

    setIsSending(true);
    try {
      const finalSmsText = smsTemplate
        .replaceAll('{nome}', clientName.trim())
        .replaceAll('{link}', editableUrl.trim());

      const nowStr = new Date().toLocaleString('it-CH');
      const nowIso = new Date().toISOString();

      const newReq: RequestItem = {
        id: 'req-' + Date.now(),
        businessId: business.id,
        clientName: clientName.trim(),
        phone: cleanPhone,
        date: nowStr,
        status: 'inviata',
        text: finalSmsText,
        consent: true,
        consentAt: nowIso
      };

      await createRequestInDb(newReq);
      await onRefreshRequests();

      setClientName('');
      setPhone('+41 ');
      setHasConsent(false);

      if (sendMethod === 'sms') {
        const smsUri = `sms:${cleanPhone}?body=${encodeURIComponent(finalSmsText)}`;
        window.location.href = smsUri;
        setInlineMessage({ type: 'success', text: `Richiesta registrata! Apertura app SMS in corso per ${cleanPhone}...` });
      } else if (sendMethod === 'whatsapp') {
        const waPhone = cleanPhone.replace('+', '');
        const waUri = `https://api.whatsapp.com/send?phone=${waPhone}&text=${encodeURIComponent(finalSmsText)}`;
        window.open(waUri, '_blank');
        setInlineMessage({ type: 'success', text: `Richiesta registrata! Apertura WhatsApp in corso per ${cleanPhone}...` });
      } else {
        await navigator.clipboard.writeText(finalSmsText);
        setInlineMessage({ type: 'success', text: 'Richiesta registrata e testo copiato negli appunti!' });
      }

      setTimeout(() => setInlineMessage(null), 4000);
      return newReq;
    } catch (err: any) {
      setInlineMessage({ type: 'error', text: err.message || 'Errore durante la registrazione della richiesta.' });
      return null;
    } finally {
      setIsSending(false);
    }
  };

  const handleSendSms = (e: React.FormEvent) => {
    e.preventDefault();
    createAndRegisterRequest('sms');
  };

  const handleOpenSmsDirect = (phoneNum: string, text?: string) => {
    const cleanP = normalizePhone(phoneNum);
    const msgText = text || smsTemplate.replaceAll('{nome}', 'Cliente').replaceAll('{link}', editableUrl);
    window.location.href = `sms:${cleanP}?body=${encodeURIComponent(msgText)}`;
  };

  const handleOpenWhatsAppDirect = (phoneNum: string, text?: string) => {
    const cleanP = normalizePhone(phoneNum).replace('+', '');
    const msgText = text || smsTemplate.replaceAll('{nome}', 'Cliente').replaceAll('{link}', editableUrl);
    window.open(`https://api.whatsapp.com/send?phone=${cleanP}&text=${encodeURIComponent(msgText)}`, '_blank');
  };

  const handleCopyTextDirect = async (id: string, text?: string) => {
    const msgText = text || smsTemplate.replaceAll('{nome}', 'Cliente').replaceAll('{link}', editableUrl);
    try {
      await navigator.clipboard.writeText(msgText);
      setCopiedMsgId(id);
      setTimeout(() => setCopiedMsgId(null), 2000);
    } catch {
      window.prompt('Copia il testo:', msgText);
    }
  };

  const renderStatusBadge = (status: RequestItem['status']) => {
    switch (status) {
      case 'recensione_ricevuta':
        return <span className="text-[11px] text-[#1F5F4A] font-medium bg-[#E8F0EC] px-2 py-0.5 rounded-full">Recensione ricevuta</span>;
      case 'vista':
        return <span className="text-[11px] text-[#2F5D9E] font-medium bg-[#2F5D9E]/10 px-2 py-0.5 rounded-full">Messaggio visto</span>;
      default:
        return <span className="text-[11px] text-[#667069] bg-[#F6F7F5] px-2 py-0.5 rounded-full">Inviata</span>;
    }
  };

  const previewText = smsTemplate.replaceAll('{nome}', clientName || 'Nome Cliente').replaceAll('{link}', editableUrl);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-xl text-[#1C2321]">Richieste recensione (SMS & WhatsApp)</h2>
      </div>

      {inlineMessage && (
        <div className={`p-3 rounded-[6px] text-xs font-medium ${
          inlineMessage.type === 'success' ? 'bg-[#1F5F4A]/10 text-[#1F5F4A] border border-[#1F5F4A]/30' : 'bg-[#B3382C]/10 text-[#B3382C] border border-[#B3382C]/30'
        }`}>
          {inlineMessage.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 space-y-4">
          <div className="panel-card overflow-hidden">
            <div className="p-4 border-b border-[#E5E7E3] flex items-center justify-between">
              <h3 className="font-semibold text-xs text-[#1C2321] uppercase tracking-wide">Storico richieste inviate</h3>
              <span className="text-[11px] text-[#667069]">{requests.length} totali</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F6F7F5] border-b border-[#E5E7E3] text-[#667069]">
                  <tr>
                    <th className="p-3 font-medium">Cliente</th>
                    <th className="p-3 font-medium">Telefono</th>
                    <th className="p-3 font-medium">Inviata il</th>
                    <th className="p-3 font-medium">Stato</th>
                    <th className="p-3 font-medium text-right">Azioni rapide</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7E3]">
                  {requests.length === 0 ? (
                    <tr><td colSpan={5} className="p-6 text-center text-[#667069]">Nessuna richiesta recente.</td></tr>
                  ) : (
                    requests.map((req) => (
                      <tr key={req.id} className="hover:bg-[#F6F7F5] transition">
                        <td className="p-3 font-medium text-[#1C2321]">{req.clientName}</td>
                        <td className="p-3 text-[#667069] font-mono">{req.phone}</td>
                        <td className="p-3 text-[#667069] text-[11px]">{req.date}</td>
                        <td className="p-3">{renderStatusBadge(req.status)}</td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button type="button" onClick={() => handleOpenSmsDirect(req.phone, req.text)} className="px-2 py-1 bg-[#F6F7F5] hover:bg-[#E5E7E3] text-[#1C2321] rounded-[4px] text-[11px] font-medium transition flex items-center gap-1"><Smartphone className="w-3 h-3 text-[#1F5F4A]" /> SMS</button>
                            <button type="button" onClick={() => handleOpenWhatsAppDirect(req.phone, req.text)} className="px-2 py-1 bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#128C7E] rounded-[4px] text-[11px] font-medium transition flex items-center gap-1"><Send className="w-3 h-3 text-[#25D366]" /> WA</button>
                            <button type="button" onClick={() => handleCopyTextDirect(req.id, req.text)} className="p-1 text-[#667069] hover:text-[#1C2321] hover:bg-[#F6F7F5] rounded-[4px]">{copiedMsgId === req.id ? <Check className="w-3.5 h-3.5 text-[#1F5F4A]" /> : <Copy className="w-3.5 h-3.5" />}</button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="lg:col-span-5 space-y-6">
          <div className="panel-card p-5 space-y-4">
            <h3 className="font-semibold text-sm text-[#1C2321] flex items-center gap-2"><Smartphone className="w-4 h-4 text-[#1F5F4A]" /> Invia nuova richiesta</h3>
            <form onSubmit={handleSendSms} className="space-y-3">
              <div className="space-y-1"><label className="text-xs font-medium text-[#667069]">Nome cliente</label><input type="text" required value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Nome e cognome" className="input-field w-full text-xs" /></div>
              <div className="space-y-1"><label className="text-xs font-medium text-[#667069]">Telefono</label><input type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+41 79 123 45 67" className="input-field w-full text-xs font-mono" /></div>
              <div className="space-y-1"><label className="text-xs font-medium text-[#667069]">Modello messaggio</label><textarea value={smsTemplate} onChange={(e) => setSmsTemplate(e.target.value)} rows={3} className="input-field w-full text-xs" /></div>
              <div className="space-y-1 bg-[#F6F7F5] p-3 rounded-[6px] border border-[#E5E7E3]"><label className="text-[11px] font-semibold text-[#667069] uppercase tracking-wide block">Anteprima:</label><p className="text-xs text-[#1C2321] italic leading-relaxed">"{previewText}"</p></div>
              <div className="flex items-start gap-2 pt-1"><input type="checkbox" id="consent" checked={hasConsent} onChange={(e) => setHasConsent(e.target.checked)} className="mt-0.5 rounded border-[#E5E7E3] text-[#1F5F4A]" /><label htmlFor="consent" className="text-[11px] text-[#667069] leading-tight cursor-pointer">Il cliente ha acconsentito alla ricezione del messaggio.</label></div>
              <div className="space-y-2 pt-2 border-t border-[#E5E7E3]">
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => createAndRegisterRequest('sms')} disabled={!hasConsent || isSending || !clientName || !phone} className="btn-primary py-2 text-xs flex items-center justify-center gap-1.5 disabled:opacity-50"><Smartphone className="w-3.5 h-3.5" /> SMS</button>
                  <button type="button" onClick={() => createAndRegisterRequest('whatsapp')} disabled={!hasConsent || isSending || !clientName || !phone} className="bg-[#25D366] text-white hover:bg-[#20bd5a] py-2 text-xs rounded-[6px] font-medium transition flex items-center justify-center gap-1.5 disabled:opacity-50"><Send className="w-3.5 h-3.5" /> WhatsApp</button>
                </div>
                <button type="button" onClick={() => createAndRegisterRequest('copy')} disabled={!hasConsent || isSending || !clientName || !phone} className="btn-secondary w-full py-2 text-xs flex items-center justify-center gap-1.5 disabled:opacity-50"><Copy className="w-3.5 h-3.5" /> Copia & registra</button>
              </div>
            </form>
          </div>

          <div className="panel-card p-5 text-center space-y-3">
            <h3 className="font-semibold text-xs text-[#1C2321] uppercase tracking-wide">QR Code recensione</h3>
            <div className="bg-white p-4 rounded-[6px] border border-[#E5E7E3] inline-block"><QRCodeSVG value={editableUrl} size={140} level="H" includeMargin={true} /></div>
            <div className="space-y-2 text-left">
              <input type="url" value={editableUrl} onChange={(e) => setEditableUrl(e.target.value)} className="input-field w-full text-xs font-mono" />
              <div className="flex gap-2">
                <button type="button" onClick={handleCopyLink} className="btn-secondary px-3 py-1.5 text-xs w-full">{copied ? 'Copiato!' : 'Copia link'}</button>
                <button type="button" onClick={handleSaveSettings} className="btn-primary px-3 py-1.5 text-xs w-full">Salva URL</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
