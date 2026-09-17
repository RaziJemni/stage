import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { GuestWhatsAppSimulatorPage } from './GuestWhatsAppSimulatorPage';
import * as simulatorApi from '../api/simulator';

vi.mock('../api/simulator', () => ({
  fetchSimulatorProperties: vi.fn(),
  fetchSimulatorMessages: vi.fn(),
  sendSimulatorMessage: vi.fn(),
}));

const mockProperties: simulatorApi.SimulatorProperty[] = [
  {
    id: 'prop-1',
    name: 'Villa Jasmin',
    city: 'Sidi Bou Said',
    address: 'Rue de la Plage',
  },
  {
    id: 'prop-2',
    name: 'Dar Fatma',
    city: 'La Marsa',
    address: 'Avenue Habib Bourguiba',
  },
];

const mockMessages: simulatorApi.SimulatorMessage[] = [
  {
    id: 'msg-1',
    conversation_id: 'conv-1',
    direction: 'inbound',
    sender_type: 'guest',
    content: 'Bonjour, quel est le code WiFi ?',
    delivery_status: 'delivered',
    created_at: '2026-09-15T10:00:00Z',
  },
  {
    id: 'msg-2',
    conversation_id: 'conv-1',
    direction: 'outbound',
    sender_type: 'system',
    content: 'Le code WiFi de la Villa Jasmin est Vayca-Secure-2026.',
    delivery_status: 'delivered',
    created_at: '2026-09-15T10:00:05Z',
  },
];

describe('GuestWhatsAppSimulatorPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
    localStorage.clear();
  });

  it('loads properties and messages on initial render', async () => {
    vi.mocked(simulatorApi.fetchSimulatorProperties).mockResolvedValue(mockProperties);
    vi.mocked(simulatorApi.fetchSimulatorMessages).mockResolvedValue(mockMessages);

    render(<GuestWhatsAppSimulatorPage />);

    await waitFor(() => {
      expect(screen.getByText('Villa Jasmin')).toBeInTheDocument();
      expect(screen.getByText(/Sidi Bou Said/)).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText('Bonjour, quel est le code WiFi ?')).toBeInTheDocument();
      expect(screen.getByText('Le code WiFi de la Villa Jasmin est Vayca-Secure-2026.')).toBeInTheDocument();
      expect(screen.getByText('🤖 IA Vayca')).toBeInTheDocument();
    });
  });

  it('allows switching the active property', async () => {
    vi.mocked(simulatorApi.fetchSimulatorProperties).mockResolvedValue(mockProperties);
    vi.mocked(simulatorApi.fetchSimulatorMessages).mockResolvedValue(mockMessages);

    render(<GuestWhatsAppSimulatorPage />);

    await waitFor(() => {
      expect(screen.getByText('Villa Jasmin')).toBeInTheDocument();
    });

    // Open property switcher modal
    const propBtn = screen.getByRole('button', { name: /Villa Jasmin/i });
    fireEvent.click(propBtn);

    expect(screen.getByText('Choisir une villa à contacter')).toBeInTheDocument();
    const secondPropBtn = screen.getByRole('button', { name: /Dar Fatma/i });
    fireEvent.click(secondPropBtn);

    await waitFor(() => {
      expect(screen.getByText('Dar Fatma')).toBeInTheDocument();
      expect(screen.getByText(/La Marsa/)).toBeInTheDocument();
    });
  });

  it('sends typed message from the input form', async () => {
    vi.mocked(simulatorApi.fetchSimulatorProperties).mockResolvedValue(mockProperties);
    vi.mocked(simulatorApi.fetchSimulatorMessages).mockResolvedValue(mockMessages);
    vi.mocked(simulatorApi.sendSimulatorMessage).mockResolvedValue({
      message_id: 'msg-3',
      conversation_id: 'conv-1',
      created: true,
      created_at: '2026-09-15T10:01:00Z',
    });

    render(<GuestWhatsAppSimulatorPage />);

    await waitFor(() => {
      expect(screen.getByText('Villa Jasmin')).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText('Tapez un message...');
    fireEvent.change(input, { target: { value: 'Est-ce que le barbecue est prêt ?' } });

    const sendBtn = screen.getByRole('button', { name: 'Envoyer' });
    fireEvent.click(sendBtn);

    expect(simulatorApi.sendSimulatorMessage).toHaveBeenCalledWith(
      'prop-1',
      expect.any(String),
      'Est-ce que le barbecue est prêt ?'
    );
  });

  it('sends message when clicking a quick-prompt chip', async () => {
    vi.mocked(simulatorApi.fetchSimulatorProperties).mockResolvedValue(mockProperties);
    vi.mocked(simulatorApi.fetchSimulatorMessages).mockResolvedValue(mockMessages);
    vi.mocked(simulatorApi.sendSimulatorMessage).mockResolvedValue({
      message_id: 'msg-3',
      conversation_id: 'conv-1',
      created: true,
      created_at: '2026-09-15T10:01:00Z',
    });

    render(<GuestWhatsAppSimulatorPage />);

    await waitFor(() => {
      expect(screen.getByText('Villa Jasmin')).toBeInTheDocument();
    });

    const wifiChip = screen.getByRole('button', { name: 'WiFi' });
    fireEvent.click(wifiChip);

    expect(simulatorApi.sendSimulatorMessage).toHaveBeenCalledWith(
      'prop-1',
      expect.any(String),
      'Bonjour, quel est le code WiFi de la villa ?'
    );
  });
});
