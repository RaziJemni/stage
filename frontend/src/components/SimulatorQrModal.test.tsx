import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { SimulatorQrModal } from './SimulatorQrModal';

describe('SimulatorQrModal', () => {
  const onCloseMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when isOpen is false', () => {
    const { container } = render(<SimulatorQrModal isOpen={false} onClose={onCloseMock} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders modal dialog with QR code and title when isOpen is true', () => {
    render(<SimulatorQrModal isOpen={true} onClose={onCloseMock} />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Simulateur Mobile WhatsApp')).toBeInTheDocument();
    expect(screen.getByText(/Scannez avec l'appareil photo/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue(/simulator\/whatsapp/)).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    render(<SimulatorQrModal isOpen={true} onClose={onCloseMock} />);

    const closeBtn = screen.getByRole('button', { name: /Fermer/i });
    fireEvent.click(closeBtn);

    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });

  it('copies URL to clipboard and shows feedback', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    render(<SimulatorQrModal isOpen={true} onClose={onCloseMock} />);

    const copyBtn = screen.getByRole('button', { name: /Copier/i });
    fireEvent.click(copyBtn);

    expect(writeTextMock).toHaveBeenCalledWith(expect.stringContaining('/simulator/whatsapp'));
    await waitFor(() => {
      expect(screen.getByText('Copié !')).toBeInTheDocument();
    });
  });

  it('allows updating custom simulator URL', () => {
    render(<SimulatorQrModal isOpen={true} onClose={onCloseMock} />);

    const input = screen.getByTitle('URL du simulateur');
    fireEvent.change(input, { target: { value: 'https://demo.vayca.test/simulator/whatsapp' } });

    expect(input).toHaveValue('https://demo.vayca.test/simulator/whatsapp');
  });
});
