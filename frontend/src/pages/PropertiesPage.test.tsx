import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PropertiesPage } from './PropertiesPage';
import type { Property } from '../data/mockData';

describe('PropertiesPage Component', () => {
  it('renders Add New Property button for manager role', () => {
    render(
      <PropertiesPage
        properties={[]}
        isManager={true}
        onSelectProperty={vi.fn()}
      />
    );
    expect(screen.getByRole('button', { name: /Add New Property/i })).toBeInTheDocument();
  });

  it('hides Add New Property button for staff role', () => {
    render(
      <PropertiesPage
        properties={[]}
        isManager={false}
        onSelectProperty={vi.fn()}
      />
    );
    expect(screen.queryByRole('button', { name: /Add New Property/i })).not.toBeInTheDocument();
  });

  it('renders clear empty state when no properties exist', () => {
    render(
      <PropertiesPage
        properties={[]}
        isManager={true}
        onSelectProperty={vi.fn()}
      />
    );
    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    expect(screen.getByText('No properties found')).toBeInTheDocument();
  });

  it('renders API error banner when an error is passed', () => {
    const errorMsg = 'Failed to load property listings from API server.';
    render(
      <PropertiesPage
        properties={[]}
        error={errorMsg}
        onSelectProperty={vi.fn()}
      />
    );
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

    render(
      <PropertiesPage
        properties={[realProp]}
        isManager={true}
        onSelectProperty={vi.fn()}
      />
    );

    expect(screen.getByText('Real Beach Villa')).toBeInTheDocument();
    expect(screen.getByText('4 Max Guests')).toBeInTheDocument();
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

    render(
      <PropertiesPage
        properties={[customProp]}
        isManager={true}
        onSelectProperty={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: 'Tabarka' })).toBeInTheDocument();
  });
});
