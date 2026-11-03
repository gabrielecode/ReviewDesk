import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { MessageSquare, Lock, Mail, ArrowRight, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';

interface AuthScreenProps {
  initialView?: 'login' | 'register' | 'forgot' | 'recovery';
  onAuthSuccess?: (session: any) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ initialView = 'login', onAuthSuccess }) => {
  const [view, setView] = useState<'login' | 'register' | 'forgot' | 'recovery'>(initialView);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const normEmail = email.toLowerCase().trim();

    if (!normEmail) {
      setError('Inserisci un indirizzo email valido.');
      return;
    }

    if (view !== 'forgot' && view !== 'recovery') {
      if (!password || password.length < 6) {
        setError('La password deve contenere almeno 6 caratteri.');
        return;
      }
    }

    if (view === 'register' && password !== confirmPassword) {
      setError('Le password non coincidono.');
      return;
    }

    setLoading(true);

    try {
      if (view === 'login') {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: normEmail, password })
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Credenziali non valide');
        }
        if (data?.session) {
          await supabase.auth.setSession(data.session);
          if (onAuthSuccess) {
            onAuthSuccess(data.session);
          } else {
            window.location.reload();
          }
        }
      } else if (view === 'register') {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: normEmail, password })
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Errore durante la registrazione');
        }
        if (data?.session) {
          await supabase.auth.setSession(data.session);
          if (onAuthSuccess) {
            onAuthSuccess(data.session);
          } else {
            window.location.reload();
          }
        }
      } else if (view === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(normEmail, {
          redirectTo: window.location.origin + '/app'
        });
        if (error) throw error;
        setSuccessMessage('Ti abbiamo inviato un\'email con le istruzioni per reimpostare la password.');
      } else if (view === 'recovery') {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        setSuccessMessage('Password aggiornata con successo! Effettua l\'accesso.');
        setTimeout(() => setView('login'), 2000);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Errore durante l\'autenticazione');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F7F5] flex items-center justify-center p-4 font-sans text-[#1C2321]">
      <div className="max-w-md w-full panel-card p-8 space-y-6 shadow-sm bg-white relative">
        <div className="flex items-center justify-between text-xs">
          <a href="/" className="text-[#1F5F4A] hover:underline font-medium inline-flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" /> Torna al sito
          </a>
        </div>

        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#E8F0EC] text-[#1F5F4A] mb-1">
            <MessageSquare className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-[#1C2321]">ReviewDesk</h1>
          <p className="text-xs text-[#667069]">
            Gestione intelligente delle recensioni Google e reputazione aziendale
          </p>
        </div>

        {view !== 'recovery' && (
          <div className="flex rounded-[6px] bg-[#F6F7F5] p-1 border border-[#E5E7E3] text-xs">
            <button
              type="button"
              onClick={() => { setView('login'); setError(null); setSuccessMessage(null); }}
              className={`flex-1 py-1.5 font-medium rounded-[4px] transition ${
                view === 'login' ? 'bg-white text-[#1F5F4A] shadow-xs font-semibold' : 'text-[#667069] hover:text-[#1C2321]'
              }`}
            >
              Accedi
            </button>
            <button
              type="button"
              onClick={() => { setView('register'); setError(null); setSuccessMessage(null); }}
              className={`flex-1 py-1.5 font-medium rounded-[4px] transition ${
                view === 'register' ? 'bg-white text-[#1F5F4A] shadow-xs font-semibold' : 'text-[#667069] hover:text-[#1C2321]'
              }`}
            >
              Registrati
            </button>
          </div>
        )}

        {error && (
          <div className="p-3 bg-[#B3382C]/10 border border-[#B3382C]/30 rounded-[6px] flex items-start gap-2 text-xs text-[#B3382C]">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-3 bg-[#1F5F4A]/10 border border-[#1F5F4A]/30 rounded-[6px] flex items-start gap-2 text-xs text-[#1F5F4A]">
            <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-[#667069] block">Indirizzo email</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#667069] absolute left-3 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nome@azienda.ch"
                className="input-field w-full text-xs pl-9 py-2.5"
                disabled={view === 'recovery'}
              />
            </div>
          </div>

          {view !== 'forgot' && (
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-[#667069]">
                  {view === 'recovery' ? 'Nuova password' : 'Password'}
                </label>
                {view === 'login' && (
                  <button
                    type="button"
                    onClick={() => { setView('forgot'); setError(null); setSuccessMessage(null); }}
                    className="text-[11px] text-[#1F5F4A] hover:underline"
                  >
                    Password dimenticata?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#667069] absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimo 6 caratteri"
                  className="input-field w-full text-xs pl-9 py-2.5"
                />
              </div>
            </div>
          )}

          {view === 'register' && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-[#667069] block">Conferma password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#667069] absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Ripeti la password"
                  className="input-field w-full text-xs pl-9 py-2.5"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-2.5 text-xs font-medium flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <span>
              {loading ? 'Attendere...' :
               view === 'login' ? 'Accedi' :
               view === 'register' ? 'Crea account' :
               view === 'forgot' ? 'Invia link di recupero' : 'Aggiorna password'}
            </span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {view === 'forgot' && (
          <div className="text-center pt-2">
            <button
              type="button"
              onClick={() => { setView('login'); setError(null); setSuccessMessage(null); }}
              className="text-xs text-[#1F5F4A] font-medium hover:underline"
            >
              ← Torna al login
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
