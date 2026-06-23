/**
 * Image decoding helpers for UPP Topic++ files.
 * Extracted from tppParser.ts for modularity.
 */

import * as zlib from 'zlib';
import * as fs from 'fs';

/**
 * Decode U++ 7->8 binary encoding.
 * Exact port of ParseQtf.cpp lines 326-336:
 *   byte seven = *term++;
 *   for(int i = 0; i < 7; i++) {
 *       data.Cat((*term++ & 0x7f) | ((seven << 7) & 0x80));
 *       seven >>= 1;
 *   }
 */
function decodeUppBinary(buf: Buffer, start: number): number[] {
  const data: number[] = [];
  let i = start;
  while (i < buf.length) {
    // Skip control chars (matching ParseQtf.cpp while loop)
    while (i < buf.length && buf[i] > 0 && buf[i] < 0x20) i++;
    if (i >= buf.length) break;
    if (buf[i] >= 0x20 && buf[i] <= 0x7F || buf[i] === 0) break;
    let seven = buf[i++];
    for (let j = 0; j < 7 && i < buf.length; j++) {
      // Skip control chars before each data byte
      while (i < buf.length && buf[i] > 0 && buf[i] < 0x20) i++;
      if (i >= buf.length) break;
      if (buf[i] >= 0x20 && buf[i] <= 0x7F || buf[i] === 0) break;
      data.push((buf[i] & 0x7F) | ((seven << 7) & 0x80));
      seven >>= 1;
      i++;
    }
  }
  return data;
}

/**
 * Read .tpp file as binary buffer and convert @@image raw-encoded data
 * to base64-wrapped format that processInlineContent can decode.
 */
export function preprocessTppImages(filePath: string): string {
  let buf: Buffer;
  try { buf = fs.readFileSync(filePath); } catch { return ''; }

  const result: number[] = [];
  let i = 0;
  while (i < buf.length) {
    // Match @@ followed by image type name
    if (i + 2 < buf.length && buf[i] === 0x40 && buf[i + 1] === 0x40) {
      const tagStart = i;
      i += 2;
      let typeName = '';
      while (i < buf.length && /[a-zA-Z0-9_]/.test(String.fromCharCode(buf[i]))) {
        typeName += String.fromCharCode(buf[i]);
        i++;
      }
      if (typeName !== 'image' && typeName !== 'rawimage' && typeName !== 'PING' && typeName !== 'PNG') {
        for (let k = tagStart; k < i; k++) result.push(buf[k]);
        continue;
      }
      // Parse :W&H or W*H
      if (i < buf.length && buf[i] === 0x3A) i++; // skip ':'
      let wStr = '';
      while (i < buf.length && buf[i] >= 0x30 && buf[i] <= 0x39) { wStr += String.fromCharCode(buf[i]); i++; }
      if (i < buf.length && (buf[i] === 0x26 || buf[i] === 0x2A)) i++; // & or *
      let hStr = '';
      while (i < buf.length && buf[i] >= 0x30 && buf[i] <= 0x39) { hStr += String.fromCharCode(buf[i]); i++; }
      // Skip whitespace/newlines
      while (i < buf.length && (buf[i] === 0x20 || buf[i] === 0x0D || buf[i] === 0x0A || buf[i] === 0x09)) i++;

      if (i < buf.length && buf[i] === 0x28) {
        // Already base64 in () — copy original tag + parentheses through
        for (let k = tagStart; k < i; k++) result.push(buf[k]);
        while (i < buf.length) { result.push(buf[i]); if (buf[i] === 0x29) { i++; break; } i++; }
        continue;
      }

      if (i < buf.length && buf[i] >= 0x80) {
        // 7->8 encoded raw binary — decode and base64-wrap
        const decoded = decodeUppBinary(buf, i);
        // Skip past consumed encoded bytes (must match decodeUppBinary's skipping logic)
        let scan = i;
        while (scan < buf.length) {
          while (scan < buf.length && buf[scan] > 0 && buf[scan] < 0x20) scan++;
          if (scan >= buf.length) break;
          if (buf[scan] >= 0x20 && buf[scan] <= 0x7F || buf[scan] === 0) break;
          scan++; // flag byte
          for (let j = 0; j < 7 && scan < buf.length; j++) {
            while (scan < buf.length && buf[scan] > 0 && buf[scan] < 0x20) scan++;
            if (scan >= buf.length) break;
            if (buf[scan] >= 0x20 && buf[scan] <= 0x7F || buf[scan] === 0) break;
            scan++;
          }
        }
        i = scan;

        const b64 = Buffer.from(decoded).toString('base64');
        const header = `@@image:${wStr}&${hStr}(${b64})`;
        for (let k = 0; k < header.length; k++) result.push(header.charCodeAt(k));
        continue;
      }

      // Unknown format — copy original tag
      for (let k = tagStart; k < i; k++) result.push(buf[k]);
    } else {
      result.push(buf[i]);
      i++;
    }
  }
  return Buffer.from(result).toString('utf-8');
}

// CRC32 lookup table for PNG chunk checksums
const crc32Table = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[n] = c;
  }
  return table;
})();

function crc32(buf: Buffer): number {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc = crc32Table[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function makePngChunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeB = Buffer.from(type, 'ascii');
  const crcBuf = crc32(Buffer.concat([typeB, data]));
  const crcB = Buffer.alloc(4);
  crcB.writeUInt32BE(crcBuf, 0);
  return Buffer.concat([len, typeB, data, crcB]);
}

export function decodeUppImage(base64Data: string): string | null {
  try {
    const buf = Buffer.from(base64Data, 'base64');
    if (buf.length < 13) return null;

    const type = buf[0] & 0x3f;
    if (type !== 3 && type !== 4) return null;

    const w = buf.readUInt16LE(1);
    const h = buf.readUInt16LE(3);
    if (w <= 0 || h <= 0 || w > 8192 || h > 8192) return null;

    const compressed = buf.slice(13);
    const pixels = zlib.inflateSync(compressed);

    const expected = type * w * h;
    if (pixels.length !== expected) return null;

    // PNG signature
    const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

    // IHDR: width(4) + height(4) + bitDepth(1) + colorType(1) + compression(1) + filter(1) + interlace(1)
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(w, 0);
    ihdr.writeUInt32BE(h, 4);
    ihdr[8] = 8;  // bit depth
    ihdr[9] = type === 4 ? 6 : 2;  // color type: 6=RGBA, 2=RGB
    ihdr[10] = 0; // compression
    ihdr[11] = 0; // filter
    ihdr[12] = 0; // interlace

    // Add filter byte (0=none) to each row
    const bytesPerPixel = type;
    const rawSize = h * (1 + w * bytesPerPixel);
    const raw = Buffer.alloc(rawSize);
    const rowBytes = 1 + w * bytesPerPixel;
    for (let y = 0; y < h; y++) {
      raw[y * rowBytes] = 0; // no filter
      pixels.copy(raw, y * rowBytes + 1, y * w * bytesPerPixel, (y + 1) * w * bytesPerPixel);
    }

    const compressedData = zlib.deflateSync(raw, { level: 9 });

    const png = Buffer.concat([
      sig,
      makePngChunk('IHDR', ihdr),
      makePngChunk('IDAT', compressedData),
      makePngChunk('IEND', Buffer.alloc(0)),
    ]);

    return 'data:image/png;base64,' + png.toString('base64');
  } catch {
    return null;
  }
}
