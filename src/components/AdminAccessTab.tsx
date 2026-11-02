import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  Mail, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Copy, 
  Key, 
  Building2, 
  ShieldAlert, 
  Send, 
  RefreshCw,
  Sliders,
  Check,
  ExternalLink
} from 'lucide-react';
import { PilotRequest } from '../types';
import { supabase } from '../lib/supabase';

interface AdminAccessTabProps {
  userEmail: string;
}

export const AdminAccessTab: React.FC<AdminAccessTabProps> = ({ userEmail }) => {
  const [activeSubTab, setActiveSubTab] = useState<'requests' | 'create' | 'settings'>('requests');
  const [requests, setRequests] = useState<PilotRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState<boolean>(true);
  const [requestsError, setRequestsError] = useState<string | null>(null);

  // New User Form State
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('Review2026!');
  const [newBizName, setNewBizName] = useState('');
  const [newBizCategory, setNewBizCategory] = useState('');
  const [newBizLocation, setNewBizLocation] = useState('Ticino');
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [userCreationResult, setUserCreationResult] = useState<{
    type: 'success' | 'error';
    text: string;
    details?: { email: string; pass: string; bizName: string };
  } | null>(null);

  // App settings
  const [signupsOpen, setSignupsOpen] = useState<boolean>(false);
  const [updatingSettings, setUpdatingSettings] = useState<boolean>(false);

  // Modal for approving request
  const [selectedReqForModal, setSelectedReqForModal] = useState<PilotRequest | null>(null);
  const [reqModalPass, setReqModalPass] = useState('Pilota2026!');
  const [copiedInviteText, setCopiedInviteText] = useState(false);

  useEffect(() => {
    fetchRequests();
    fetchConfig();
  }, []);

  const fetchRequests = async () => {
    setLoadingRequests(true);
    setRequestsError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch('/api/admin/pilot-requests', {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });

      if (!res.ok) {
        throw new Error('Impossibile caricare le richieste di accesso.');
      }

      const data = await res.json();
      setRequests(data.requests || []);
    } catch (err: any) {
      console.error(err);
      setRequestsError(err.message || 'Errore nel caricamento delle richieste.');
    } finally {
      setLoadingRequests(false);
    }
  };

  const fetchConfig = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const res = await fetch('/api/admin/config', {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
      });
      if (res.ok) {
        const data = await res.json();
        setSignupsOpen(data.signupsOpen);
      }
    } catch {}
  };

  const handleToggleSignups = async () => {
    setUpdatingSettings(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const nextState = !signupsOpen;

      const res = await fetch('/api/admin/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ signupsOpen: nextState })
      });

      if (res.ok) {
        setSignupsOpen(nextState);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingSettings(false);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: 'in_attesa' | 'approvato' | 'rifiutato') => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      await fetch(`/api/admin/pilot-requests/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ status: newStatus })
      });

      setRequests(prev => prev.map(r => r.id === id ? { ...r, status: newStatus } : r));
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserCreationResult(null);

    if (!newUserEmail.trim() || !newUserPassword.trim()) {
      setUserCreationResult({ type: 'error', text: 'Email e password sono obbligatori.' });
      return;
    }

    setIsCreatingUser(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          email: newUserEmail.trim(),
          password: newUserPassword.trim(),
          businessName: newBizName.trim(),
          businessCategory: newBizCategory.trim(),
          businessLocation: newBizLocation.trim(),
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Errore nella creazione dell\'utente.');
      }

      setUserCreationResult({
        type: 'success',
        text: `Account attivato con successo per ${newUserEmail}!`,
        details: {
          email: newUserEmail,
          pass: newUserPassword,
          bizName: newBizName || 'La tua attività'
        }
      });

      // Update in requests list if matching
      setRequests(prev => prev.map(r => r.email.toLowerCase() === newUserEmail.toLowerCase() ? { ...r, status: 'approvato' } : r));

      // Reset form
      setNewUserEmail('');
      setNewBizName('');
      setNewBizCategory('');
    } catch (err: any) {
      setUserCreationResult({
        type: 'error',
        text: err.message || 'Impossibile creare l\'utente.'
      });
    } finally {
      setIsCreatingUser(false);
    }
  };

  const handleApproveModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReqForModal) return;

    setIsCreatingUser(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          email: selectedReqForModal.email,
          password: reqModalPass,
          businessName: selectedReqForModal.businessName,
          businessCategory: selectedReqForModal.businessType,
          businessLocation: 'Ticino',
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Errore nella creazione account.');

      await handleUpdateStatus(selectedReqForModal.id, 'approvato');

      alert(`Account attivato per ${selectedReqForModal.name} (${selectedReqForModal.email})!\n\nEmail: ${selectedReqForModal.email}\nPassword: ${reqModalPass}`);
      setSelectedReqForModal(null);
      fetchRequests();
    } catch (err: any) {
      alert('Errore: ' + err.message);
    } finally {
      setIsCreatingUser(false);
    }
  };

  const generateWelcomeMessage = (email: string, pass: string, name?: string) => {
    const origin = window.location.origin;
    return `Ciao ${name || 'Cliente'},\n\nAbbiamo attivato il tuo accesso pilota a ReviewDesk per la tua attività!\n\nPuoi accedere subito da qui:\n${origin}/app/\n\nLe tue credenziali di accesso:\nEmail: ${email}\nPassword temporanea: ${pass}\n\nPer qualsiasi domanda o supporto per la prima configurazione rispondi pure a questa mail.\n\nUn cordiale saluto,\nGabriele Sestito - Connect & Create`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedInviteText(true);
    setTimeout(() => setCopiedInviteText(false), 2000);
  };

  const pendingCount = requests.filter(r => r.status === 'in_attesa').length;
  const approvedCount = requests.filter(r => r.status === 'approvato').length;

  return (
    <div className="space-y-6 max-w-5xl mx-auto font-sans text-[#1C2321]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-[8px] border border-[#E5E7E3]">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-[#1F5F4A]/10 text-[#1F5F4A] text-[11px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
              Pannello Admin
            </span>
            <h2 className="font-bold text-lg text-[#1C2321]">Gestione Inviti e Accessi Utenti</h2>
          </div>
          <p className="text-xs text-[#667069] mt-0.5">
            Inserisci gli utenti pilota, gestisci le richieste dalla Landing Page e controlla le registrazioni.
          </p>
        </div>

        {/* Counters */}
        <div className="flex items-center gap-3">
          <div className="bg-[#F6F7F5] px-3 py-1.5 rounded-[6px] border border-[#E5E7E3] text-center">
            <span className="text-[10px] text-[#667069] block font-medium uppercase">In attesa</span>
            <span className="font-bold text-sm text-[#B3382C]">{pendingCount}</span>
          </div>
          <div className="bg-[#F6F7F5] px-3 py-1.5 rounded-[6px] border border-[#E5E7E3] text-center">
            <span className="text-[10px] text-[#667069] block font-medium uppercase">Approvati</span>
            <span className="font-bold text-sm text-[#1F5F4A]">{approvedCount}</span>
          </div>
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="flex rounded-[6px] bg-white p-1 border border-[#E5E7E3] text-xs font-medium">
        <button
          type="button"
          onClick={() => setActiveSubTab('requests')}
          className={`flex-1 py-2 px-3 rounded-[4px] transition flex items-center justify-center gap-2 ${
            activeSubTab === 'requests' ? 'bg-[#E8F0EC] text-[#1F5F4A] font-semibold' : 'text-[#667069] hover:text-[#1C2321]'
          }`}
        >
          <Mail className="w-3.5 h-3.5" />
          <span>Richieste Ricevute ({requests.length})</span>
          {pendingCount > 0 && (
            <span className="w-2 h-2 rounded-full bg-[#B3382C]"></span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('create')}
          className={`flex-1 py-2 px-3 rounded-[4px] transition flex items-center justify-center gap-2 ${
            activeSubTab === 'create' ? 'bg-[#E8F0EC] text-[#1F5F4A] font-semibold' : 'text-[#667069] hover:text-[#1C2321]'
          }`}
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>Inserisci Nuovo Utente</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('settings')}
          className={`flex-1 py-2 px-3 rounded-[4px] transition flex items-center justify-center gap-2 ${
            activeSubTab === 'settings' ? 'bg-[#E8F0EC] text-[#1F5F4A] font-semibold' : 'text-[#667069] hover:text-[#1C2321]'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Modalità Registrazione</span>
        </button>
      </div>

      {/* SUBTAB 1: REQUESTS LIST */}
      {activeSubTab === 'requests' && (
        <div className="panel-card overflow-hidden bg-white">
          <div className="p-4 border-b border-[#E5E7E3] flex items-center justify-between">
            <h3 className="font-semibold text-xs text-[#1C2321] uppercase tracking-wide">Richieste di accesso dal sito</h3>
            <button
              onClick={fetchRequests}
              className="text-xs text-[#1F5F4A] hover:underline flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" /> Aggiorna
            </button>
          </div>

          {loadingRequests ? (
            <div className="p-8 text-center text-xs text-[#667069]">Caricamento richieste in corso...</div>
          ) : requestsError ? (
            <div className="p-4 text-xs text-[#B3382C] bg-[#B3382C]/5 text-center">{requestsError}</div>
          ) : requests.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#667069]">Nessuna richiesta pervenuta al momento.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F6F7F5] border-b border-[#E5E7E3] text-[#667069]">
                  <tr>
                    <th className="p-3 font-medium">Nome & Email</th>
                    <th className="p-3 font-medium">Attività / Tipo</th>
                    <th className="p-3 font-medium">Data</th>
                    <th className="p-3 font-medium">Stato</th>
                    <th className="p-3 font-medium text-right">Azioni</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7E3]">
                  {requests.map((req) => (
                    <tr key={req.id} className="hover:bg-[#F6F7F5]/50 transition">
                      <td className="p-3">
                        <p className="font-semibold text-[#1C2321]">{req.name}</p>
                        <p className="text-[#667069] font-mono text-[11px]">{req.email}</p>
                      </td>
                      <td className="p-3">
                        <p className="font-medium text-[#1C2321]">{req.businessName}</p>
                        <span className="text-[10px] text-[#667069] bg-[#E5E7E3]/60 px-1.5 py-0.5 rounded">
                          {req.businessType}
                        </span>
                      </td>
                      <td className="p-3 text-[#667069] text-[11px]">
                        {new Date(req.createdAt).toLocaleDateString('it-CH', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                      </td>
                      <td className="p-3">
                        {req.status === 'approvato' ? (
                          <span className="inline-flex items-center gap-1 text-[#1F5F4A] font-medium text-[11px] bg-[#1F5F4A]/10 px-2 py-0.5 rounded">
                            <CheckCircle className="w-3 h-3" /> Approvato
                          </span>
                        ) : req.status === 'rifiutato' ? (
                          <span className="inline-flex items-center gap-1 text-[#B3382C] font-medium text-[11px] bg-[#B3382C]/10 px-2 py-0.5 rounded">
                            <XCircle className="w-3 h-3" /> Rifiutato
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[#D99A00] font-medium text-[11px] bg-[#D99A00]/10 px-2 py-0.5 rounded">
                            <Clock className="w-3 h-3" /> In attesa
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {req.status !== 'approvato' && (
                            <button
                              onClick={() => {
                                setSelectedReqForModal(req);
                                setReqModalPass('Pilota2026!');
                              }}
                              className="btn-primary py-1 px-2.5 text-[11px] font-medium"
                            >
                              Approva & Attiva
                            </button>
                          )}
                          {req.status === 'approvato' && (
                            <button
                              onClick={() => {
                                const msg = generateWelcomeMessage(req.email, 'PasswordIniziale', req.name);
                                copyToClipboard(msg);
                                alert('Template mail di benvenuto copiato negli appunti!');
                              }}
                              className="btn-secondary py-1 px-2 text-[11px]"
                              title="Copia email di benvenuto per l'utente"
                            >
                              <Copy className="w-3 h-3" /> Mail
                            </button>
                          )}
                          {req.status !== 'rifiutato' && (
                            <button
                              onClick={() => handleUpdateStatus(req.id, 'rifiutato')}
                              className="text-[#B3382C] hover:bg-[#B3382C]/10 p-1 rounded text-[11px]"
                              title="Segna come rifiutato"
                            >
                              Rifiuta
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 2: DIRECT USER CREATION FORM */}
      {activeSubTab === 'create' && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          <div className="md:col-span-7 panel-card p-6 bg-white space-y-4">
            <div className="border-b border-[#E5E7E3] pb-3">
              <h3 className="font-semibold text-sm text-[#1C2321]">Inserisci e Crea Account Utente</h3>
              <p className="text-xs text-[#667069]">
                Qui puoi inserire un utente pilota e impostare le sue credenziali iniziali.
              </p>
            </div>

            {userCreationResult && (
              <div className={`p-4 rounded-[6px] text-xs ${
                userCreationResult.type === 'success' ? 'bg-[#1F5F4A]/10 text-[#1F5F4A] border border-[#1F5F4A]/30' : 'bg-[#B3382C]/10 text-[#B3382C] border border-[#B3382C]/30'
              }`}>
                <p className="font-semibold">{userCreationResult.text}</p>
                {userCreationResult.details && (
                  <div className="mt-2 pt-2 border-t border-[#1F5F4A]/20 space-y-1 font-mono text-[11px]">
                    <p><strong>Email:</strong> {userCreationResult.details.email}</p>
                    <p><strong>Password:</strong> {userCreationResult.details.pass}</p>
                    <p><strong>Attività:</strong> {userCreationResult.details.bizName}</p>
                  </div>
                )}
              </div>
            )}

            <form onSubmit={handleCreateUserSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-[#667069] block">Email utente</label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 text-[#667069] absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    placeholder="es. mario@ristorante.ch"
                    className="input-field w-full text-xs pl-9 py-2"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-[#667069]">Password temporanea</label>
                  <button
                    type="button"
                    onClick={() => setNewUserPassword('Review' + Math.floor(1000 + Math.random() * 9000) + '!')}
                    className="text-[11px] text-[#1F5F4A] hover:underline"
                  >
                    Genera password
                  </button>
                </div>
                <div className="relative">
                  <Key className="w-3.5 h-3.5 text-[#667069] absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                    className="input-field w-full text-xs pl-9 py-2 font-mono"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-[#E5E7E3] space-y-3">
                <p className="text-xs font-semibold text-[#1C2321]">Configurazione Attività Iniziale (opzionale)</p>
                
                <div className="space-y-1">
                  <label className="text-xs font-medium text-[#667069] block">Nome attività</label>
                  <input
                    type="text"
                    value={newBizName}
                    onChange={(e) => setNewBizName(e.target.value)}
                    placeholder="es. Osteria del Sole"
                    className="input-field w-full text-xs py-2"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-[#667069] block">Categoria</label>
                    <input
                      type="text"
                      value={newBizCategory}
                      onChange={(e) => setNewBizCategory(e.target.value)}
                      placeholder="es. Ristorante"
                      className="input-field w-full text-xs py-2"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-[#667069] block">Città / Località</label>
                    <input
                      type="text"
                      value={newBizLocation}
                      onChange={(e) => setNewBizLocation(e.target.value)}
                      placeholder="es. Lugano"
                      className="input-field w-full text-xs py-2"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isCreatingUser}
                className="btn-primary w-full py-2.5 text-xs font-medium flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <UserPlus className="w-4 h-4" />
                <span>{isCreatingUser ? 'Creazione in corso...' : 'Crea Account & Assegna Attività'}</span>
              </button>
            </form>
          </div>

          <div className="md:col-span-5 space-y-4">
            <div className="panel-card p-5 bg-[#F6F7F5] border border-[#E5E7E3] space-y-3">
              <h4 className="font-semibold text-xs text-[#1C2321] uppercase tracking-wide">Come dare accesso ai clienti:</h4>
              <ol className="text-xs text-[#667069] space-y-2 list-decimal pl-4 leading-relaxed">
                <li>Inserisci l'email del cliente e premi <strong>Crea Account</strong>.</li>
                <li>L'utente verrà salvato in Supabase e la sua attività verrà creata automaticamente.</li>
                <li>Copia il messaggio di benvenuto pronto e invialo via Email o WhatsApp.</li>
                <li>Il cliente potrà accedere immediatamente e troverà la sua dashboard pronti.</li>
              </ol>
            </div>

            {userCreationResult?.details && (
              <div className="panel-card p-5 bg-white space-y-3 border border-[#1F5F4A]/30">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-xs text-[#1F5F4A]">Messaggio di benvenuto pronto</h4>
                  <button
                    onClick={() => copyToClipboard(generateWelcomeMessage(userCreationResult.details!.email, userCreationResult.details!.pass))}
                    className="btn-secondary px-2.5 py-1 text-[11px] flex items-center gap-1"
                  >
                    {copiedInviteText ? <Check className="w-3 h-3 text-[#1F5F4A]" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedInviteText ? 'Copiato!' : 'Copia'}</span>
                  </button>
                </div>
                <pre className="text-[11px] font-mono whitespace-pre-wrap bg-[#FAFBF9] p-3 rounded border border-[#E5E7E3] text-[#1C2321] leading-normal max-h-48 overflow-y-auto">
                  {generateWelcomeMessage(userCreationResult.details.email, userCreationResult.details.pass)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUBTAB 3: REGISTRATION SETTINGS */}
      {activeSubTab === 'settings' && (
        <div className="panel-card p-6 bg-white space-y-6">
          <div className="flex items-start justify-between border-b border-[#E5E7E3] pb-4">
            <div>
              <h3 className="font-semibold text-sm text-[#1C2321]">Controllo Registrazioni ReviewDesk</h3>
              <p className="text-xs text-[#667069] mt-0.5">
                Scegli se permettere a chiunque di registrarsi o mantenere il sistema ad accesso riservato su invito.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-[#667069]">
                {signupsOpen ? 'Registrazione Libera' : 'Solo su Invito (Pilota)'}
              </span>
              <button
                type="button"
                onClick={handleToggleSignups}
                disabled={updatingSettings}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                  signupsOpen ? 'bg-[#1F5F4A]' : 'bg-[#C9CEC8]'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    signupsOpen ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className={`p-4 rounded-[6px] border ${!signupsOpen ? 'border-[#1F5F4A] bg-[#1F5F4A]/5' : 'border-[#E5E7E3] bg-[#F6F7F5]'}`}>
              <h4 className="font-semibold text-xs text-[#1C2321] mb-1">Modalità 1: Solo su Invito (Raccomandata in Pilota)</h4>
              <p className="text-xs text-[#667069] leading-relaxed">
                Nella schermata di login la tab "Registrati" è nascosta. I visitatori vengono invitati a richiedere l'accesso dalla Landing Page. Tu inserisci gli utenti a mano dalla tab "Inserisci Nuovo Utente".
              </p>
            </div>

            <div className={`p-4 rounded-[6px] border ${signupsOpen ? 'border-[#1F5F4A] bg-[#1F5F4A]/5' : 'border-[#E5E7E3] bg-[#F6F7F5]'}`}>
              <h4 className="font-semibold text-xs text-[#1C2321] mb-1">Modalità 2: Registrazioni Aperte</h4>
              <p className="text-xs text-[#667069] leading-relaxed">
                La tab "Registrati" è visibile a tutti. Chiunque può creare un account autonomamente inserendo email e password.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* APPROVE REQUEST MODAL */}
      {selectedReqForModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[8px] max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#E5E7E3] pb-3">
              <h3 className="font-semibold text-sm text-[#1C2321]">Approva & Attiva Utente Pilota</h3>
              <button
                onClick={() => setSelectedReqForModal(null)}
                className="text-xs text-[#667069] hover:text-[#1C2321]"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleApproveModalSubmit} className="space-y-4">
              <div className="space-y-1 bg-[#F6F7F5] p-3 rounded text-xs border border-[#E5E7E3]">
                <p><strong>Richiedente:</strong> {selectedReqForModal.name}</p>
                <p><strong>Email:</strong> {selectedReqForModal.email}</p>
                <p><strong>Attività:</strong> {selectedReqForModal.businessName} ({selectedReqForModal.businessType})</p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-[#667069] block">Imposta Password Iniziale</label>
                <input
                  type="text"
                  required
                  value={reqModalPass}
                  onChange={(e) => setReqModalPass(e.target.value)}
                  className="input-field w-full text-xs py-2 font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedReqForModal(null)}
                  className="btn-secondary px-3 py-1.5 text-xs"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  disabled={isCreatingUser}
                  className="btn-primary px-4 py-1.5 text-xs font-medium"
                >
                  {isCreatingUser ? 'Attivazione...' : 'Conferma e Crea Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
