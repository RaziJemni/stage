/**
 * Zero-dependency QR Code Generator in pure TypeScript.
 * Implements ISO/IEC 18004 QR Code Byte Mode with Reed-Solomon Error Correction.
 */

// Galois Field GF(256) with primitive polynomial 0x11D (285)
const GF256_EXP = new Uint8Array(512);
const GF256_LOG = new Uint8Array(256);

(() => {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    GF256_EXP[i] = x;
    GF256_EXP[i + 255] = x;
    GF256_LOG[x] = i;
    x = (x << 1) ^ (x >= 128 ? 0x11d : 0);
  }
})();

function gfMultiply(x: number, y: number): number {
  if (x === 0 || y === 0) return 0;
  return GF256_EXP[GF256_LOG[x] + GF256_LOG[y]];
}

// Generate Reed-Solomon generator polynomial for given degree
function rsGeneratorPoly(degree: number): Uint8Array {
  let poly = new Uint8Array([1]);
  for (let i = 0; i < degree; i++) {
    const nextPoly = new Uint8Array(poly.length + 1);
    const root = GF256_EXP[i];
    for (let j = 0; j < poly.length; j++) {
      nextPoly[j] ^= gfMultiply(poly[j], root);
      nextPoly[j + 1] ^= poly[j];
    }
    poly = nextPoly;
  }
  return poly;
}

// Calculate Reed-Solomon error correction codewords
function rsCalculateEcc(data: Uint8Array, eccCount: number): Uint8Array {
  const gen = rsGeneratorPoly(eccCount);
  const remainder = new Uint8Array(eccCount);

  for (let i = 0; i < data.length; i++) {
    const factor = data[i] ^ remainder[0];
    for (let j = 0; j < eccCount - 1; j++) {
      remainder[j] = remainder[j + 1] ^ gfMultiply(gen[eccCount - 1 - j], factor);
    }
    remainder[eccCount - 1] = gfMultiply(gen[0], factor);
  }
  return remainder;
}

// QR Code version specification (Version 1 to 4, Low error correction)
interface QrSpec {
  version: number;
  size: number;
  totalDataBytes: number;
  eccBytes: number;
  alignmentPatternCenters: number[];
}

const QR_SPECS: QrSpec[] = [
  { version: 1, size: 21, totalDataBytes: 19, eccBytes: 7, alignmentPatternCenters: [] },
  { version: 2, size: 25, totalDataBytes: 34, eccBytes: 10, alignmentPatternCenters: [6, 18] },
  { version: 3, size: 29, totalDataBytes: 55, eccBytes: 15, alignmentPatternCenters: [6, 22] },
  { version: 4, size: 33, totalDataBytes: 80, eccBytes: 20, alignmentPatternCenters: [6, 26] },
  { version: 5, size: 37, totalDataBytes: 108, eccBytes: 26, alignmentPatternCenters: [6, 30] },
];

export function generateQrMatrix(text: string): boolean[][] {
  const dataBytes = new TextEncoder().encode(text);
  const dataLen = dataBytes.length;

  // Pick smallest version that can accommodate data (Mode: Byte)
  const spec = QR_SPECS.find((s) => s.totalDataBytes >= dataLen + 2) ?? QR_SPECS[QR_SPECS.length - 1];

  // Byte mode header (0100) + 8-bit length indicator
  const bitStream: number[] = [0, 1, 0, 0];
  for (let i = 7; i >= 0; i--) {
    bitStream.push((dataLen >> i) & 1);
  }

  // Data bits
  for (const byte of dataBytes) {
    for (let i = 7; i >= 0; i--) {
      bitStream.push((byte >> i) & 1);
    }
  }

  // Terminator (up to 4 zeroes)
  const capacityBits = spec.totalDataBytes * 8;
  const terminatorLength = Math.min(4, capacityBits - bitStream.length);
  for (let i = 0; i < terminatorLength; i++) {
    bitStream.push(0);
  }

  // Pad to byte boundary
  while (bitStream.length % 8 !== 0) {
    bitStream.push(0);
  }

  // Pack into data bytes
  const dataCodewords = new Uint8Array(spec.totalDataBytes);
  let byteIdx = 0;
  for (let i = 0; i < bitStream.length; i += 8) {
    let byteVal = 0;
    for (let j = 0; j < 8; j++) {
      byteVal = (byteVal << 1) | bitStream[i + j];
    }
    dataCodewords[byteIdx++] = byteVal;
  }

  // Pad bytes: 0xEC (236), 0x11 (17)
  let padToggle = false;
  while (byteIdx < spec.totalDataBytes) {
    dataCodewords[byteIdx++] = padToggle ? 0x11 : 0xec;
    padToggle = !padToggle;
  }

  // Compute ECC
  const eccCodewords = rsCalculateEcc(dataCodewords, spec.eccBytes);

  // Combine data + ECC
  const finalSequence = new Uint8Array(dataCodewords.length + eccCodewords.length);
  finalSequence.set(dataCodewords);
  finalSequence.set(eccCodewords, dataCodewords.length);

  // Initialize module matrix and reserved mask
  const size = spec.size;
  const matrix: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));
  const reserved: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));

  const setModule = (r: number, c: number, isDark: boolean) => {
    matrix[r][c] = isDark;
    reserved[r][c] = true;
  };

  // 1. Finder patterns (7x7) at (0,0), (size-7, 0), (0, size-7)
  const drawFinder = (startRow: number, startCol: number) => {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        const isDark =
          r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4);
        setModule(startRow + r, startCol + c, isDark);
      }
    }
    // Separator
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const nr = startRow + r;
        const nc = startCol + c;
        if (nr >= 0 && nr < size && nc >= 0 && nc < size && !reserved[nr][nc]) {
          setModule(nr, nc, false);
        }
      }
    }
  };

  drawFinder(0, 0);
  drawFinder(0, size - 7);
  drawFinder(size - 7, 0);

  // 2. Alignment patterns
  if (spec.alignmentPatternCenters.length > 0) {
    for (const r of spec.alignmentPatternCenters) {
      for (const c of spec.alignmentPatternCenters) {
        if (reserved[r][c]) continue;
        for (let dr = -2; dr <= 2; dr++) {
          for (let dc = -2; dc <= 2; dc++) {
            const isDark = Math.max(Math.abs(dr), Math.abs(dc)) !== 1;
            setModule(r + dr, c + dc, isDark);
          }
        }
      }
    }
  }

  // 3. Timing patterns
  for (let i = 8; i < size - 8; i++) {
    const isDark = i % 2 === 0;
    if (!reserved[6][i]) setModule(6, i, isDark);
    if (!reserved[i][6]) setModule(i, 6, isDark);
  }

  // 4. Dark module
  setModule(4 * spec.version + 9, 8, true);

  // 5. Reserve format info areas
  for (let i = 0; i < 9; i++) {
    if (!reserved[8][i]) reserved[8][i] = true;
    if (!reserved[i][8]) reserved[i][8] = true;
    if (i < 8) {
      if (!reserved[8][size - 1 - i]) reserved[8][size - 1 - i] = true;
      if (!reserved[size - 1 - i][8]) reserved[size - 1 - i][8] = true;
    }
  }

  // 6. Data placement (zigzag in 2-column stripes)
  let bitIdx = 0;
  const totalBits = finalSequence.length * 8;
  let upwards = true;

  for (let c = size - 1; c > 0; c -= 2) {
    if (c === 6) c--; // Skip vertical timing pattern column
    const rows = upwards
      ? Array.from({ length: size }, (_, idx) => size - 1 - idx)
      : Array.from({ length: size }, (_, idx) => idx);

    for (const r of rows) {
      for (const colOffset of [0, -1]) {
        const col = c + colOffset;
        if (!reserved[r][col]) {
          let bit = false;
          if (bitIdx < totalBits) {
            const byte = finalSequence[bitIdx >> 3];
            bit = ((byte >> (7 - (bitIdx & 7))) & 1) === 1;
            bitIdx++;
          }
          // Mask pattern 0: (row + col) % 2 === 0
          const mask = (r + col) % 2 === 0;
          matrix[r][col] = bit !== mask;
        }
      }
    }
    upwards = !upwards;
  }

  // 7. Format information for ECC Level L and Mask 0: 0x77C4 (0b111011111000100)
  const formatBits = 0x77c4;
  for (let i = 0; i < 15; i++) {
    const bit = ((formatBits >> (14 - i)) & 1) === 1;
    // Top-left area
    if (i < 6) matrix[8][i] = bit;
    else if (i === 6) matrix[8][7] = bit;
    else if (i === 7) matrix[8][8] = bit;
    else if (i === 8) matrix[7][8] = bit;
    else matrix[14 - i][8] = bit;

    // Split format area around finders
    if (i < 8) matrix[size - 1 - i][8] = bit;
    else matrix[8][size - 15 + i] = bit;
  }

  return matrix;
}

export function renderQrCodeSvg(text: string, size = 220): string {
  const matrix = generateQrMatrix(text);
  const matrixSize = matrix.length;
  const quietZone = 2;
  const totalSize = matrixSize + quietZone * 2;

  let rects = '';
  for (let r = 0; r < matrixSize; r++) {
    for (let c = 0; c < matrixSize; c++) {
      if (matrix[r][c]) {
        rects += `<rect x="${c + quietZone}" y="${r + quietZone}" width="1" height="1" fill="#1C1B18"/>`;
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalSize} ${totalSize}" width="${size}" height="${size}" shape-rendering="crispEdges">
    <rect width="${totalSize}" height="${totalSize}" fill="#FFFFFF" rx="4"/>
    ${rects}
  </svg>`;
}
