import React, { useEffect, useState } from 'react';
import { Download, Share, X, Smartphone } from 'lucide-react';
import { useI18n } from '../i18n/I18nContext';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

const STORAGE_KEY = 'vayca_pwa_dismissed';

export const MobilePwaPrompt: React.FC = () => {
  const { t } = useI18n();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIos, setIsIos] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if dismissed before
    if (localStorage.getItem(STORAGE_KEY) === 'true') {
      return;
    }

    // Check if already in standalone display mode
    const isStandalone =
      (typeof window !== 'undefined' &&
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(display-mode: standalone)').matches) ||
      (typeof window !== 'undefined' &&
        Boolean((window.navigator as unknown as { standalone?: boolean })?.standalone));

    if (isStandalone) {
      return;
    }

    // Detect iOS
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    const isIosDevice = /iPad|iPhone|iPod/.test(ua) && !(window as unknown as { MSStream?: unknown })?.MSStream;
    setIsIos(isIosDevice);

    if (isIosDevice) {
      setIsVisible(true);
    }

    // Listen for Chromium beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsVisible(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setIsVisible(false);
  };

  if (!isVisible) {
    return null;
  }

  return (
    <aside
      role="region"
      aria-label={t('pwa.prompt_title')}
      className="md:hidden sticky top-0 z-30 bg-[#0F3D5E] text-white px-4 py-3 shadow-md border-b border-[#0C324E]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="p-2 rounded-lg bg-white/10 text-white shrink-0 mt-0.5">
            {isIos ? <Share className="w-5 h-5 text-[#FAF8F5]" /> : <Smartphone className="w-5 h-5 text-[#FAF8F5]" />}
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold tracking-tight text-white leading-snug">
              {t('pwa.prompt_title')}
            </h3>
            <p className="text-xs text-white/80 mt-0.5 leading-normal">
              {isIos ? t('pwa.ios_instructions') : t('pwa.prompt_subtitle')}
            </p>
            {deferredPrompt && (
              <div className="mt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void handleInstallClick()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#D96B43] hover:bg-[#C25730] text-white text-xs font-semibold shadow-sm transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{t('pwa.install_button')}</span>
                </button>
                <button
                  type="button"
                  onClick={handleDismiss}
                  className="px-2.5 py-1.5 rounded-lg text-white/70 hover:text-white text-xs font-medium transition-colors"
                >
                  {t('pwa.dismiss')}
                </button>
              </div>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={handleDismiss}
          aria-label={t('pwa.dismiss')}
          className="p-1 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
};
