import React, { useState } from 'react';
import { 
  Send, 
  QrCode, 
  Link as LinkIcon, 
  MessageSquare, 
  CheckCircle2, 
  AlertCircle, 
  Smartphone, 
  Copy, 
  Check,
  ShieldAlert,
  History
} from 'lucide-react';
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
  const [copied, setCopied] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [editableUrl, setEditableUrl] = useState(business.googleUrl);
  const [smsTemplate, setSmsTemplate] = useState(business.smsTemplate);

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
    alert('Impostazioni link e modello SMS salvate con successo!');
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
      alert('Richiesta inviata con successo al cliente!');
    } catch (err) {
      alert('Errore durante l\'invio della richiesta.');
    } finally {
      setIsSending(false);
    }
  };

  const getStatusBadge = (status: RequestItem['status']) => {
    switch (status) {
      case 'recensione_ricevuta':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5" /> Recensione ricevuta
          </span>
        );
      case 'vista':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Smartphone className="w-3.5 h-3.5" /> SMS visto
          </span>
        );
      case 'inviata':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
            <Send className="w-3.5 h-3.5 text-slate-400" /> Inviata
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Send className="w-6 h-6 text-amber-400" />
          Richieste di Recensione Google
        </h2>
        <p className="text-sm text-slate-400 mt-1">
          Invia inviti tramite SMS o WhatsApp ai clienti di <span className="text-white font-medium">{business.name}</span> dopo il servizio.
        </p>
      </div>

      {/* Mandatory Rules Banner */}
      <div className="bg-amber-500/10 border border-amber-500/30 p-5 rounded-2xl flex items-start gap-4">
        <ShieldAlert className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-1 text-xs text-amber-200">
          <p className="font-bold text-amber-300 uppercase tracking-wider text-xs">Regole di conformità Google e buone pratiche:</p>
          <ul className="list-disc pl-4 space-y-1 text-amber-200/90">
            <li>La richiesta viene inviata a <strong>TUTTI</strong> i clienti, mai solo a quelli ritenuti soddisfatti.</li>
            <li>Non sono ammessi premi, sconti o omaggi in cambio di recensioni (politica Google).</li>
            <li>È obbligatorio il consenso esplicito del cliente alla ricezione del messaggio.</li>
          </ul>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Send SMS Form & QR code */}
        <div className="lg:col-span-2 space-y-6">
          {/* Send Form */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
            <h3 className="font-bold text-white text-base flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-amber-400" />
              Simula Invio Messaggio (SMS / WhatsApp)
            </h3>

            <form onSubmit={handleSendRequest} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Nome Cliente</label>
                  <input
                    type="text"
                    required
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="es. Marco Rossi"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-500 transition"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Numero Telefono</label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+41 79 123 45 67"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-500 transition"
                  />
                </div>
              </div>

              {/* Editable SMS Preview */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Anteprima Messaggio SMS</label>
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs text-slate-300 italic leading-relaxed">
                  {smsTemplate
                    .replace('{nome}', clientName || '[Nome]')
                    .replace('{link}', editableUrl)}
                </div>
              </div>

              {/* Mandatory Consent Checkbox */}
              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 flex items-start gap-3">
                <input
                  type="checkbox"
                  id="consent"
                  checked={hasConsent}
                  onChange={(e) => setHasConsent(e.target.checked)}
                  className="mt-1 w-4 h-4 rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-amber-500 cursor-pointer"
                />
                <label htmlFor="consent" className="text-xs text-slate-300 cursor-pointer font-medium leading-relaxed">
                  Il cliente ha acconsentito a ricevere questo messaggio promozionale/informativo post-servizio. *(Obbligatorio)*
                </label>
              </div>

              <button
                type="submit"
                disabled={!hasConsent || isSending || !clientName || !phone}
                className="w-full py-3 px-6 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-sm font-bold transition shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
                Invia Richiesta Recensione
              </button>
            </form>
          </div>

          {/* History of Sent Requests */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="font-bold text-white text-base flex items-center gap-2">
              <History className="w-5 h-5 text-amber-400" />
              Storico Richieste Inviate
            </h3>

            <div className="divide-y divide-slate-800 overflow-x-auto">
              {requests.length === 0 ? (
                <p className="text-xs text-slate-500 py-4 text-center">Nessuna richiesta inviata di recente.</p>
              ) : (
                requests.map((req) => (
                  <div key={req.id} className="py-3 flex items-center justify-between gap-4 text-sm">
                    <div>
                      <p className="font-semibold text-white">{req.clientName}</p>
                      <p className="text-xs text-slate-400">{req.phone} • {req.date}</p>
                    </div>
                    <div>{getStatusBadge(req.status)}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: QR Code & Link Config */}
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5 text-center">
            <h3 className="font-bold text-white text-base flex items-center justify-center gap-2">
              <QrCode className="w-5 h-5 text-amber-400" />
              QR Code Google Profilo
            </h3>
            <p className="text-xs text-slate-400">
              I clienti possono scansionare questo QR code direttamente in cassa o sul tavolo.
            </p>

            <div className="bg-white p-6 rounded-2xl inline-block shadow-inner mx-auto">
              <QRCodeSVG value={editableUrl} size={180} level="H" includeMargin={true} />
            </div>

            <div className="space-y-3 pt-2">
              <div className="space-y-1 text-left">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1">
                  <LinkIcon className="w-3.5 h-3.5 text-amber-400" /> URL Profilo Google
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={editableUrl}
                    onChange={(e) => setEditableUrl(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                  <button
                    onClick={handleCopyLink}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition flex items-center gap-1 shrink-0"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1 text-left">
                <label className="text-xs font-semibold text-slate-300">Modello Testo SMS</label>
                <textarea
                  value={smsTemplate}
                  onChange={(e) => setSmsTemplate(e.target.value)}
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <button
                onClick={handleSaveSettings}
                className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl transition border border-slate-700"
              >
                Salva impostazioni QR & SMS
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
