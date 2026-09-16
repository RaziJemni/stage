import { fireEvent, render, screen, act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MobilePwaPrompt } from './MobilePwaPrompt';
import { I18nProvider } from '../i18n/I18nContext';

describe('MobilePwaPrompt', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();

    // Default: not standalone
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  });

  it('does not render if previously dismissed in localStorage', () => {
    localStorage.setItem('vayca_pwa_dismissed', 'true');

    render(
      <I18nProvider initialLocale="fr">
        <MobilePwaPrompt />
      </I18nProvider>
    );

    expect(screen.queryByRole('region')).not.toBeInTheDocument();
  });

  it('does not render if already in standalone display mode', () => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query === '(display-mode: standalone)',
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    render(
      <I18nProvider initialLocale="fr">
        <MobilePwaPrompt />
      </I18nProvider>
    );

    expect(screen.queryByRole('region')).not.toBeInTheDocument();
  });

  it('renders and displays install button when beforeinstallprompt event is fired', async () => {
    render(
      <I18nProvider initialLocale="en">
        <MobilePwaPrompt />
      </I18nProvider>
    );

    // Initially not visible before prompt event or iOS detection
    expect(screen.queryByRole('region')).not.toBeInTheDocument();

    const mockPrompt = vi.fn().mockResolvedValue(undefined);
    const mockUserChoice = Promise.resolve({ outcome: 'accepted' as const, platform: 'web' });

    const installPromptEvent = new Event('beforeinstallprompt');
    Object.assign(installPromptEvent, {
      prompt: mockPrompt,
      userChoice: mockUserChoice,
    });

    act(() => {
      window.dispatchEvent(installPromptEvent);
    });

    expect(screen.getByRole('region')).toBeInTheDocument();
    expect(screen.getByText('Install Vayca on your device')).toBeInTheDocument();

    const installBtn = screen.getByRole('button', { name: /Install App/i });
    expect(installBtn).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(installBtn);
      await mockUserChoice;
    });

    expect(mockPrompt).toHaveBeenCalledOnce();
  });

  it('renders iOS instructions when user agent matches iOS Safari', () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
    );

    render(
      <I18nProvider initialLocale="fr">
        <MobilePwaPrompt />
      </I18nProvider>
    );

    expect(screen.getByRole('region')).toBeInTheDocument();
    expect(screen.getByText('Installer Vayca sur votre appareil')).toBeInTheDocument();
    expect(
      screen.getByText('Pour installer : appuyez sur Partager puis "Sur l\'écran d\'accueil".')
    ).toBeInTheDocument();
  });

  it('saves dismissal to localStorage and hides prompt on dismiss click', () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)'
    );

    render(
      <I18nProvider initialLocale="fr">
        <MobilePwaPrompt />
      </I18nProvider>
    );

    expect(screen.getByRole('region')).toBeInTheDocument();

    const dismissBtn = screen.getByRole('button', { name: 'Plus tard' });
    fireEvent.click(dismissBtn);

    expect(localStorage.getItem('vayca_pwa_dismissed')).toBe('true');
    expect(screen.queryByRole('region')).not.toBeInTheDocument();
  });
});
