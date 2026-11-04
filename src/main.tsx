import React, { Component, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Uncaught error in ReviewDesk app:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F6F7F5] flex items-center justify-center p-4 font-sans text-[#1C2321]">
          <div className="max-w-md w-full bg-white p-8 rounded-[8px] shadow-sm border border-[#E5E7E3] text-center space-y-4">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#B3382C]/10 text-[#B3382C] mx-auto font-bold text-lg">
              !
            </div>
            <h1 className="font-bold text-base text-[#1C2321]">Inizializzazione ReviewDesk</h1>
            <p className="text-xs text-[#667069] leading-relaxed">
              {this.state.error?.message || 'Inizializzazione del pannello di controllo in corso...'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-[#1F5F4A] text-white px-4 py-2 rounded-[6px] text-xs font-semibold hover:bg-[#174A39] transition w-full"
            >
              Ricarica la pagina
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>
  );
}

// Register PWA service worker
if (typeof window !== 'undefined' && 'serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('ServiceWorker registration error:', err);
    });
  });
}
