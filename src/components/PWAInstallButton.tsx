import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Smartphone, X, Check } from 'lucide-react';

interface PWAInstallButtonProps {
  className?: string;
  variant?: 'primary' | 'sidebar' | 'compact';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ 
  className = '', 
  variant = 'primary' 
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  // Se l'app è già avviata in modalità standalone (installata), non mostrare il tasto
  if (isInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    setIsInstalling(true);
    try {
      await install();
    } finally {
      setIsInstalling(false);
    }
  };

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    if (variant === 'sidebar') {
      return (
        <button
          onClick={handleInstallClick}
          disabled={isInstalling}
          className={`w-full flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-[6px] bg-[#1F5F4A]/10 text-[#1F5F4A] hover:bg-[#1F5F4A]/20 transition text-[11px] font-medium ${className}`}
          title="Installa ReviewDesk sul tuo computer o telefono"
        >
          <Download className="w-3.5 h-3.5" />
          <span>{isInstalling ? 'Installazione...' : 'Installa come App'}</span>
        </button>
      );
    }

    if (variant === 'compact') {
      return (
        <button
          onClick={handleInstallClick}
          disabled={isInstalling}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] bg-[#1F5F4A] text-white hover:bg-[#174A39] transition text-xs font-medium shadow-xs ${className}`}
        >
          <Download className="w-3.5 h-3.5" />
          <span>Installa</span>
        </button>
      );
    }

    return (
      <button
        onClick={handleInstallClick}
        disabled={isInstalling}
        className={`inline-flex items-center gap-2 rounded-[6px] bg-[#1F5F4A] px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#174A39] transition ${className}`}
      >
        <Download className="w-4 h-4" />
        <span>{isInstalling ? 'Installazione in corso...' : 'Installa ReviewDesk'}</span>
      </button>
    );
  }

  // iOS Safari flow (WebKit non supporta beforeinstallprompt)
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className={
            variant === 'sidebar'
              ? `w-full flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-[6px] bg-[#1F5F4A]/10 text-[#1F5F4A] hover:bg-[#1F5F4A]/20 transition text-[11px] font-medium ${className}`
              : `inline-flex items-center gap-1.5 rounded-[6px] border border-[#1F5F4A]/30 bg-[#E8F0EC] px-3 py-1.5 text-xs font-medium text-[#1F5F4A] hover:bg-[#d8e8e0] transition ${className}`
          }
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>Installa su iPhone/iPad</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in">
            <div className="w-full max-w-sm rounded-[10px] bg-white p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-[#E5E7E3] pb-3">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded bg-[#1F5F4A]/10 text-[#1F5F4A]">
                    <Smartphone className="w-4 h-4" />
                  </span>
                  <h3 className="font-semibold text-sm text-[#1C2321]">Installa su iOS (iPhone/iPad)</h3>
                </div>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 text-[#667069] hover:text-[#1C2321] rounded"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="text-xs text-[#667069] space-y-2.5">
                <p>Per installare ReviewDesk come applicazione sulla schermata principale:</p>
                <ol className="list-decimal list-inside space-y-2 pl-1">
                  <li>
                    Tocca l'icona <strong className="text-[#1C2321]">Condividi</strong> (il quadrato con la freccia in su in basso su Safari).
                  </li>
                  <li>
                    Scorri le opzioni verso il basso e tocca <strong className="text-[#1C2321]">Aggiungi alla schermata Home</strong>.
                  </li>
                  <li>
                    Conferma toccando <strong className="text-[#1F5F4A]">Aggiungi</strong> in alto a destra.
                  </li>
                </ol>
              </div>

              <button
                onClick={() => setShowIOSGuide(false)}
                className="w-full btn-primary py-2 text-xs font-medium"
              >
                Ho capito
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  // Se il browser non ha ancora scatenato beforeinstallprompt, possiamo comunque mostrare una guida rapida o il tasto installa generico
  return (
    <button
      onClick={() => {
        alert("Per installare l'app:\n• Su Chrome/Edge: clicca sull'icona Installa nella barra degli indirizzi o nel menu del browser (3 puntini).\n• Su smartphone: scegli 'Aggiungi a schermata Home'.");
      }}
      className={
        variant === 'sidebar'
          ? `w-full flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-[6px] hover:bg-[#F6F7F5] text-[#667069] hover:text-[#1C2321] text-[11px] transition ${className}`
          : `inline-flex items-center gap-1.5 px-2.5 py-1 text-xs text-[#667069] hover:text-[#1F5F4A] transition ${className}`
      }
      title="Installa ReviewDesk sul tuo dispositivo"
    >
      <Download className="w-3.5 h-3.5" />
      <span>Installa App</span>
    </button>
  );
};
