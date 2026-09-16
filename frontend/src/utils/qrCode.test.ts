import { describe, expect, it } from 'vitest';
import { generateQrMatrix, renderQrCodeSvg } from './qrCode';

describe('qrCode utility', () => {
  it('generates a square boolean matrix with valid finder patterns for short URL', () => {
    const url = 'http://localhost:5173/simulator/whatsapp';
    const matrix = generateQrMatrix(url);

    expect(matrix.length).toBeGreaterThanOrEqual(21);
    expect(matrix[0].length).toBe(matrix.length);

    // Verify top-left finder pattern corner is dark
    expect(matrix[0][0]).toBe(true);
    expect(matrix[0][6]).toBe(true);
    expect(matrix[6][0]).toBe(true);
    expect(matrix[6][6]).toBe(true);

    // Inner 3x3 of finder pattern is dark
    expect(matrix[2][2]).toBe(true);
    expect(matrix[4][4]).toBe(true);
  });

  it('renders a valid SVG string with rect elements and dimensions', () => {
    const url = 'http://192.168.1.100:5173/simulator/whatsapp';
    const svg = renderQrCodeSvg(url, 240);

    expect(svg).toContain('<svg xmlns="http://www.w3.org/2000/svg"');
    expect(svg).toContain('width="240"');
    expect(svg).toContain('height="240"');
    expect(svg).toContain('<rect');
    expect(svg).toContain('fill="#1C1B18"');
  });
});
