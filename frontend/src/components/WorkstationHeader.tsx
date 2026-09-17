import React, { useState } from 'react';
import { QrCode } from 'lucide-react';
import { useI18n } from '../i18n/I18nContext';
import { SimulatorQrModal } from './SimulatorQrModal';

interface WorkstationHeaderProps {
  section: string;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children?: React.ReactNode;
}

export const WorkstationHeader: React.FC<WorkstationHeaderProps> = ({
  section,
  title,
  subtitle,
  actions,
  children,
}) => {
  const { t } = useI18n();
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);

  return (
    <>
      <header className="h-16 shrink-0 bg-white border-b border-[#EBE6DD] px-6 flex items-center justify-between z-10 sticky top-0">
        <div className="flex flex-col justify-center min-w-0">
          <div className="flex items-center gap-1 text-[11px] font-semibold text-[#78716C] uppercase tracking-wider">
            <span>{t('nav.operations')}</span>
            <span>&gt;</span>
            <span className="text-[#0F3D5E]">{section}</span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold text-[#1C1B18] tracking-tight truncate leading-tight">
              {title}
            </h1>
            {subtitle && (
              <span className="hidden lg:inline-block text-xs text-[#78716C] font-normal truncate">
                · {subtitle}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setIsQrModalOpen(true)}
            title="Ouvrir le QR code du simulateur voyageur WhatsApp"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#075E54]/30 bg-[#E7F8EE] text-[#075E54] text-xs font-semibold hover:bg-[#D2F2E1] transition-all shadow-2xs"
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>Démo WhatsApp</span>
          </button>
          {children}
          {actions}
        </div>
      </header>

      <SimulatorQrModal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
      />
    </>
  );
};

