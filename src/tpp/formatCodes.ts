import type { TextStyle } from './types';
import { COLOR_MAP, FONT_MAP, SIZE_MAP, UPP_THEME_COLORS } from './constants';
import { rgbToHex } from './escape';

export function parseColor(code: string): string | undefined {
  if (COLOR_MAP[code]) {
    return COLOR_MAP[code];
  }
  if (/^[0-9a-fA-F]{6}$/.test(code)) {
    return `#${code}`;
  }
  const rgbMatch = code.match(/^\(?(\d+)[,.](\d+)[,.](\d+)\)?$/);
  if (rgbMatch) {
    return `rgb(${rgbMatch[1]},${rgbMatch[2]},${rgbMatch[3]})`;
  }
  return undefined;
}

export function parseFormatCodes(codes: string): TextStyle {
  const style: TextStyle = {};
  let i = 0;

  while (i < codes.length) {
    const ch = codes[i];

    if (ch === '*') {
      style.bold = !style.bold;
    } else if (ch === '/') {
      style.italic = !style.italic;
    } else if (ch === '_') {
      style.underline = !style.underline;
    } else if (ch === '-') {
      style.strikeout = !style.strikeout;
    } else if (ch === '%') {
      // % is a language code selector, not a monospace toggle.
      // %% = English (monospace), %- = language 0 (default)
      if (i + 1 < codes.length) {
        const next = codes[i + 1];
        if (next === '%') {
          style.monospace = true;
          i += 2;
        } else if (next === '-') {
          style.monospace = false;
          i += 2;
        } else {
          // Other language code — skip alphanumeric + hyphen code chars
          i++;
          while (i < codes.length && /[a-zA-Z0-9_-]/.test(codes[i])) {
            i++;
          }
        }
      } else {
        i++;
      }
      continue;
    } else if (ch === '`') {
      style.superscript = !style.superscript;
    } else if (ch === ',') {
      style.subscript = !style.subscript;
    } else if (FONT_MAP[ch]) {
      style.fontFamily = FONT_MAP[ch];
    } else if (SIZE_MAP[ch]) {
      style.fontSize = SIZE_MAP[ch];
    } else if (ch === '+') {
      i++;
      let num = '';
      while (i < codes.length && /[0-9]/.test(codes[i])) {
        num += codes[i];
        i++;
      }
      if (num) {
        const s0px = parseInt(SIZE_MAP['0']) || 18;
        style.fontSize = `${Math.round(parseInt(num) * s0px / 50)}px`;
      }
      continue;
    } else if (ch === '@') {
      let colorCode = '';
      i++;
      if (i < codes.length && codes[i] === '(') {
        i++;
        while (i < codes.length && codes[i] !== ')') {
          colorCode += codes[i];
          i++;
        }
        // i currently points at ')'; continue will do i++ to skip it
      } else {
        while (i < codes.length && /[0-9a-fA-F]/.test(codes[i])) {
          colorCode += codes[i];
          i++;
        }
      }
      const color = parseColor(colorCode);
      if (color) {
        style.color = color;
      }
      continue;
    } else if (ch === '$') {
      let colorCode = '';
      i++;
      if (i < codes.length && codes[i] === '(') {
        i++;
        while (i < codes.length && codes[i] !== ')') {
          colorCode += codes[i];
          i++;
        }
        // i currently points at ')'; continue will do i++ to skip it
      } else {
        while (i < codes.length && /[0-9a-fA-F]/.test(codes[i])) {
          colorCode += codes[i];
          i++;
        }
      }
      const color = parseColor(colorCode);
      if (color) {
        style.bgColor = color;
      }
      continue;
    } else if (ch === '^') {
      // Link format code: ^url^ — extract URL into style.link
      i++;
      let url = '';
      while (i < codes.length && codes[i] !== '^') {
        url += codes[i];
        i++;
      }
      if (i < codes.length) i++; // skip closing ^
      style.link = url;
      continue;
    } else if (ch === ':') {
      // Label format code: :label: — skip until closing :
      i++;
      while (i < codes.length && codes[i] !== ':') {
        i++;
      }
      if (i < codes.length) i++; // skip closing :
      continue;
    } else if (ch === '{') {
      // Charset format code: {charset} — skip until closing }
      i++;
      while (i < codes.length && codes[i] !== '}') {
        i++;
      }
      if (i < codes.length) i++; // skip closing }
      continue;
    } else if (ch === 'I' || ch === 'n' || ch === 'm') {
      // Index entry / numbering: read until ;
      i++;
      while (i < codes.length && codes[i] !== ';') {
        i++;
      }
      if (i < codes.length) i++; // skip ;
      continue;
    } else if (ch === '!') {
      // Custom font name: !fontname!
      i++;
      while (i < codes.length && codes[i] !== '!') {
        i++;
      }
      if (i < codes.length) i++; // skip closing !
      continue;
    }

    i++;
  }

  return style;
}

export function styleToCss(style: TextStyle): string {
  const parts: string[] = [];

  if (style.bold) parts.push('font-weight:bold');
  if (style.italic) parts.push('font-style:italic');
  if (style.underline) parts.push('text-decoration:underline');
  if (style.strikeout) parts.push('text-decoration:line-through');
  if (style.monospace || (style.fontFamily && /monospace|courier/i.test(style.fontFamily))) {
    parts.push('font-family:var(--tpp-code-font)');
  }
  if (style.fontFamily && !(/monospace|courier/i.test(style.fontFamily || ''))) {
    parts.push(`font-family:${style.fontFamily}`);
  }
  if (style.color) parts.push(`color:${style.color}`);
  if (style.bgColor) parts.push(`background-color:${style.bgColor}`);
  if (style.superscript) parts.push('vertical-align:super;font-size:0.8em');
  if (style.subscript) parts.push('vertical-align:sub;font-size:0.8em');

  return parts.join(';');
}

export function styleToClass(style: TextStyle): string | null {
  const m = style.monospace || (style.fontFamily && /monospace|courier/i.test(style.fontFamily));
  const b = style.bold;
  const it = style.italic;
  const c = style.color;
  const u = style.underline;
  const so = style.strikeout;
  const sup = style.superscript;
  const sub = style.subscript;
  const bg = style.bgColor;

  if (sup || sub || so) return null;

  const lc = c ? rgbToHex(c) : '';
  const lcbg = bg ? rgbToHex(bg) : '';
  const kw = lc === UPP_THEME_COLORS.keyword;
  const str = lc === UPP_THEME_COLORS.string;
  const tp = lc === UPP_THEME_COLORS.type;
  const op = lc === UPP_THEME_COLORS.operator;
  const pp = lc === UPP_THEME_COLORS.preprocessor;
  const cm = lc === UPP_THEME_COLORS.comment;

  // Monospace + background (with or without fg)
  if (m && lcbg && lcbg !== '#888888' && lcbg !== '#000000') {
    if (lcbg === '#ffffff') return 'bgWhiteMono';
    if (lcbg === '#cccc44' || lcbg === '#ffff00') return 'bgYellowMono';
    return 'L';
  }

  // Background-only (no fg color override)
  if (lcbg && !c && !m && !b && !it && !u) {
    if (lcbg === '#888888' || lcbg === '#000000') return 'bgDefault';
    if (lcbg === '#ffffff') return 'bgWhite';
    if (lcbg === '#cccc44' || lcbg === '#ffff00') return 'bgYellow';
    if (lcbg === '#ff6666' || lcbg === '#ff0000') return 'bgRed';
    if (lcbg === '#66cc66' || lcbg === '#00ff00') return 'bgGreen';
    if (lcbg === '#569cd6' || lcbg === '#0000ff') return 'bgBlue';
    if (lcbg === '#ff66ff' || lcbg === '#ff00ff') return 'bgMagenta';
    if (lcbg === '#66ffff' || lcbg === '#00ffff') return 'bgCyan';
    return 'bgCustom';
  }

  // Non-monospace bg + fg
  if (lcbg && c && !m) {
    if (lcbg === '#cccc44' || lcbg === '#ffff00') return 'bgYellowFg';
    if (lcbg === '#ffffff') return 'bgWhiteFg';
    return null;
  }

  // Monospace fg combos (no bg)
  if (m && b && kw) return 'N';
  if (m && b && str) return 'AM';
  if (m && b && tp) return 'AN';
  if (m && b && pp) return 'AS';
  if (m && cm && it) return 'AF';
  if (m && str) return 'O';
  if (m && tp) return 'V';
  if (m && kw) return 'AH';
  if (m && pp) return 'K';
  if (m && op && !b && !it) return 'R';
  if (m && b && !c) return 'AI';
  if (m && it && !c) return 'AB';
  if (m) return 'L';

  // Non-monospace fg combos
  if (b && it) return 'Q';
  if (b) return 'E';
  if (it) return 'AB';
  if (lc === '#888888' || lc === '#000000') return 'L';
  return null;
}
