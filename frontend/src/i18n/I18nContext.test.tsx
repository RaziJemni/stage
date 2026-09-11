import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { I18nProvider, useI18n } from './I18nContext';

function TestComponent() {
  const { locale, setLocale, t } = useI18n();
  return (
    <div>
      <span data-testid="current-locale">{locale}</span>
      <span data-testid="dashboard-title">{t('dashboard.title')}</span>
      <span data-testid="param-test">{t('properties.subtitle', { count: 5 })}</span>
      <button onClick={() => setLocale('en')} data-testid="switch-en">English</button>
      <button onClick={() => setLocale('fr')} data-testid="switch-fr">Français</button>
    </div>
  );
}

describe('I18n subsystem', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('defaults to French (fr) as primary language', () => {
    render(
      <I18nProvider>
        <TestComponent />
      </I18nProvider>
    );

    expect(screen.getByTestId('current-locale').textContent).toBe('fr');
    expect(screen.getByTestId('dashboard-title').textContent).toBe('Centre de Commande Opérationnel');
    expect(screen.getByTestId('param-test').textContent).toBe('5 résidences & propriétés de prestige en Tunisie');
  });

  it('switches to English and persists in localStorage', () => {
    render(
      <I18nProvider>
        <TestComponent />
      </I18nProvider>
    );

    fireEvent.click(screen.getByTestId('switch-en'));

    expect(screen.getByTestId('current-locale').textContent).toBe('en');
    expect(screen.getByTestId('dashboard-title').textContent).toBe('Operations Command Center');
    expect(window.localStorage.getItem('vayca_locale')).toBe('en');
  });

  it('initializes from localStorage if previously set', () => {
    window.localStorage.setItem('vayca_locale', 'en');

    render(
      <I18nProvider>
        <TestComponent />
      </I18nProvider>
    );

    expect(screen.getByTestId('current-locale').textContent).toBe('en');
    expect(screen.getByTestId('dashboard-title').textContent).toBe('Operations Command Center');
  });

  it('synchronizes locale with userPreferredLanguage and updates localStorage', () => {
    const { rerender } = render(
      <I18nProvider userPreferredLanguage={null}>
        <TestComponent />
      </I18nProvider>
    );

    expect(screen.getByTestId('current-locale').textContent).toBe('fr');

    rerender(
      <I18nProvider userPreferredLanguage="en">
        <TestComponent />
      </I18nProvider>
    );

    expect(screen.getByTestId('current-locale').textContent).toBe('en');
    expect(window.localStorage.getItem('vayca_locale')).toBe('en');
  });

  it('calls onLocaleChange callback when locale is changed', () => {
    const handleLocaleChange = vi.fn();

    render(
      <I18nProvider onLocaleChange={handleLocaleChange}>
        <TestComponent />
      </I18nProvider>
    );

    fireEvent.click(screen.getByTestId('switch-en'));
    expect(handleLocaleChange).toHaveBeenCalledWith('en');

    fireEvent.click(screen.getByTestId('switch-fr'));
    expect(handleLocaleChange).toHaveBeenCalledWith('fr');
  });

  it('does not revert user selection when userPreferredLanguage equals the initial locale', () => {
    render(
      <I18nProvider userPreferredLanguage="fr">
        <TestComponent />
      </I18nProvider>
    );

    expect(screen.getByTestId('current-locale').textContent).toBe('fr');

    fireEvent.click(screen.getByTestId('switch-en'));

    expect(screen.getByTestId('current-locale').textContent).toBe('en');
    expect(window.localStorage.getItem('vayca_locale')).toBe('en');
  });

  it('reverts locale and localStorage when onLocaleChange fails', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const failingCallback = vi.fn().mockRejectedValue(new Error('Network failure'));

    render(
      <I18nProvider userPreferredLanguage="fr" onLocaleChange={failingCallback}>
        <TestComponent />
      </I18nProvider>
    );

    expect(screen.getByTestId('current-locale').textContent).toBe('fr');

    fireEvent.click(screen.getByTestId('switch-en'));
    expect(failingCallback).toHaveBeenCalledWith('en');

    await waitFor(() => {
      expect(screen.getByTestId('current-locale').textContent).toBe('fr');
      expect(window.localStorage.getItem('vayca_locale')).toBe('fr');
    });

    consoleErrorSpy.mockRestore();
  });
});
