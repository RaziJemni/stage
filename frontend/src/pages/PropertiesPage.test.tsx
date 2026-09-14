import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PropertiesPage } from './PropertiesPage';
import type { Property } from '../data/mockData';
import { I18nProvider } from '../i18n/I18nContext';

function renderPropertiesPage(props: any, locale: 'en' | 'fr' = 'en') {
  return render(
    <I18nProvider initialLocale={locale}>
      <PropertiesPage {...props} />
    </I18nProvider>
  );
}

describe('PropertiesPage Component', () => {
  it('renders Add New Property button for manager role', () => {
    renderPropertiesPage({
      properties: [],
      isManager: true,
      onSelectProperty: vi.fn(),
    });
    const addButtons = screen.getAllByRole('button', { name: /Add New Property/i });
    expect(addButtons.length).toBeGreaterThanOrEqual(1);
  });

  it('hides Add New Property button for staff role', () => {
    renderPropertiesPage({
      properties: [],
      isManager: false,
      onSelectProperty: vi.fn(),
    });
    expect(screen.queryByRole('button', { name: /Add New Property/i })).not.toBeInTheDocument();
  });

  it('renders clear empty state when no properties exist', () => {
    renderPropertiesPage({
      properties: [],
      isManager: true,
      onSelectProperty: vi.fn(),
    });
    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    expect(screen.getByText('No properties found')).toBeInTheDocument();
  });

  it('renders API error banner when an error is passed', () => {
    const errorMsg = 'Failed to load property listings from API server.';
    renderPropertiesPage({
      properties: [],
      error: errorMsg,
      onSelectProperty: vi.fn(),
    });
    expect(screen.getByRole('alert')).toHaveTextContent(errorMsg);
  });

  it('truthfully renders property without fabricated credentials or specs', () => {
    const realProp: Property = {
      id: 'prop-100',
      name: 'Real Beach Villa',
      location: 'Sousse Coastal Area',
      city: 'Sousse',
      bedrooms: undefined as any,
      bathrooms: undefined as any,
      maxGuests: 4,
      nightlyRateTND: undefined as any,
      status: 'Available',
      imageUrl: '',
      rating: undefined as any,
      wifiSSID: '',
      wifiPass: '',
      doorCode: '',
      checkInTime: '14:00',
      checkOutTime: '11:00',
      trashSchedule: '',
      houseRules: [],
      emergencyContact: '',
    };

    renderPropertiesPage({
      properties: [realProp],
      isManager: true,
      onSelectProperty: vi.fn(),
    });

    expect(screen.getByText('Real Beach Villa')).toBeInTheDocument();
    expect(screen.getByText(/4\s+Guests/i)).toBeInTheDocument();
    expect(screen.queryByText(/HammametBeach/)).not.toBeInTheDocument();
    expect(screen.queryByText(/1234#/)).not.toBeInTheDocument();
  });

  it('renders dynamic region tab based on actual property cities', () => {
    const customProp: Property = {
      id: 'prop-200',
      name: 'Tabarka Forest Lodge',
      location: 'Northern Pines',
      city: 'Tabarka',
      bedrooms: undefined as any,
      bathrooms: undefined as any,
      maxGuests: 6,
      nightlyRateTND: undefined as any,
      status: 'Available',
      imageUrl: '',
      rating: undefined as any,
      wifiSSID: '',
      wifiPass: '',
      doorCode: '',
      checkInTime: '',
      checkOutTime: '',
      trashSchedule: '',
      houseRules: [],
      emergencyContact: '',
    };

    renderPropertiesPage({
      properties: [customProp],
      isManager: true,
      onSelectProperty: vi.fn(),
    });

    expect(screen.getByRole('button', { name: 'Tabarka' })).toBeInTheDocument();
  });

  it('renders French labels when locale is fr', () => {
    renderPropertiesPage({
      properties: [],
      isManager: true,
      onSelectProperty: vi.fn(),
    }, 'fr');

    const addButtons = screen.getAllByRole('button', { name: /Ajouter une propriété/i });
    expect(addButtons.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Aucune propriété trouvée')).toBeInTheDocument();
  });

  it('renders owner attribution on property card when ownerName is present', () => {
    const ownerProp: Property = {
      id: 'prop-200',
      name: 'Villa Carthage',
      location: 'Carthage Marina',
      city: 'Tunis',
      bedrooms: 3,
      bathrooms: 2,
      maxGuests: 6,
      nightlyRateTND: 450,
      status: 'Available',
      imageUrl: '',
      rating: 4.8,
      wifiSSID: 'Marina_WiFi',
      wifiPass: 'pass123',
      doorCode: '1234',
      checkInTime: '15:00',
      checkOutTime: '11:00',
      trashSchedule: '',
      houseRules: [],
      emergencyContact: '',
      ownerId: 'owner-1',
      ownerName: 'Kamel Trabelsi',
    };

    renderPropertiesPage({
      properties: [ownerProp],
      isManager: true,
      onSelectProperty: vi.fn(),
    });

    expect(screen.getByTestId('property-owner-prop-200')).toHaveTextContent('Kamel Trabelsi');
  });
});
