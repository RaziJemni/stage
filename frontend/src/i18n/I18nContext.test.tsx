import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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
});
