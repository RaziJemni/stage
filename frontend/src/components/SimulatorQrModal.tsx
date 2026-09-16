import React, { useMemo, useState } from 'react';
import { 
  Check, 
  Copy, 
  ExternalLink, 
  QrCode, 
  Smartphone, 
  X,
  Sparkles
} from 'lucide-react';
import { renderQrCodeSvg } from '../utils/qrCode';

interface SimulatorQrModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SimulatorQrModal: React.FC<SimulatorQrModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);
  const defaultUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/simulator/whatsapp` 
    : 'http://localhost:5173/simulator/whatsapp';

  const [simulatorUrl, setSimulatorUrl] = useState(defaultUrl);

  const qrSvg = useMemo(() => {
    return renderQrCodeSvg(simulatorUrl, 220);
  }, [simulatorUrl]);

  if (!isOpen) return null;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(simulatorUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div 
      role="dialog"
      aria-modal="true"
      aria-labelledby="simulator-qr-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div className="relative w-full max-w-md rounded-2xl border border-[#EBE6DD] bg-white p-6 shadow-2xl">
        
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-[#EBE6DD] pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#075E54]/10 text-[#075E54]">
              <QrCode className="h-6 w-6" />
            </div>
            <div>
              <h2 id="simulator-qr-modal-title" className="text-base font-bold text-[#1C1B18]">
                Simulateur Mobile WhatsApp
              </h2>
              <p className="text-xs text-[#78716C] mt-0.5">
                Démonstration interactive en direct pour soutenance
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="rounded-lg p-1.5 text-[#78716C] hover:bg-[#FAF8F5] hover:text-[#1C1B18] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="py-5 flex flex-col items-center text-center">
          
          {/* QR Code Container */}
          <div className="rounded-2xl border-2 border-[#075E54]/20 bg-white p-3 shadow-md mb-4 flex items-center justify-center">
            <div 
              className="[&>svg]:block"
              dangerouslySetInnerHTML={{ __html: qrSvg }}
            />
          </div>

          <div className="flex items-center gap-1.5 text-xs font-semibold text-[#075E54] bg-[#E7F8EE] px-3 py-1 rounded-full mb-3">
            <Smartphone className="h-3.5 w-3.5" />
            <span>Scannez avec l'appareil photo de votre smartphone</span>
          </div>

          <p className="text-xs text-[#78716C] max-w-sm leading-relaxed mb-4">
            Le jury peut scanner ce code pour ouvrir l'interface de messagerie WhatsApp et poser des questions en direct à l'IA Vayca.
          </p>

          {/* URL Input / Customizer */}
          <div className="w-full rounded-xl border border-[#EBE6DD] bg-[#FAF8F5] p-2.5 flex items-center gap-2">
            <input
              type="text"
              value={simulatorUrl}
              onChange={(e) => setSimulatorUrl(e.target.value)}
              title="URL du simulateur"
              className="flex-1 bg-transparent text-xs font-mono text-[#1C1B18] focus:outline-hidden truncate"
            />
            <button
              type="button"
              onClick={() => void handleCopyLink()}
              className="inline-flex items-center gap-1 shrink-0 rounded-lg bg-white border border-[#DDD7CC] px-2.5 py-1 text-xs font-semibold text-[#1C1B18] hover:bg-gray-50 shadow-2xs transition-all active:scale-95"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5 text-[#78716C]" />}
              <span>{copied ? 'Copié !' : 'Copier'}</span>
            </button>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between gap-3 border-t border-[#EBE6DD] pt-4">
          <div className="flex items-center gap-1 text-[11px] text-[#78716C]">
            <Sparkles className="h-3.5 w-3.5 text-[#D96B43]" />
            <span>Mode simulation local</span>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={simulatorUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#0F3D5E] px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#0C324E] transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span>Ouvrir dans le navigateur</span>
            </a>
          </div>
        </div>

      </div>
    </div>
  );
};
