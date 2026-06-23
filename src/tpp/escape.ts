export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function processUrlEscapes(text: string): string {
  let result = '';
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '`' && i + 1 < text.length) {
      result += text[i + 1];
      i++;
    } else {
      result += text[i];
    }
  }
  return result;
}

export function processEscapes(text: string): string {
  let result = '';
  let i = 0;
  while (i < text.length) {
    if (text[i] === '`' && i + 1 < text.length) {
      const next = text[i + 1];
      // QTF escape: backtick + char = literal char
      if (next === '+') result += '+';
      else if (next === '_') result += '_'; // literal underscore
      else if (next === '$') result += '|'; // tab
      else if (next === ':') result += ':';
      else if (next === '/') result += '/';
      else if (next === '.') result += '.';
      else if (next === '-') result += '-';
      else if (next === '`') result += '`';
      else result += next;
      i += 2;
    } else if (text[i] === '-' && i + 1 < text.length && text[i + 1] === '|') {
      // -| = tab character
      result += '\t';
      i += 2;
    } else if (text[i] === '_') {
      // Bare _ in QTF content = non-breaking space (chr(160))
      result += '\u00A0';
      i++;
    } else if (text[i] === '\n' || text[i] === '\r' || text[i] === '\t') {
      // Handle \r\n as a single line break unit
      let eolLen = 1;
      if (text[i] === '\r' && i + 1 < text.length && text[i + 1] === '\n') {
        eolLen = 2;
      }
      const prevChar = i > 0 ? text[i - 1] : '';
      const nextIdx = i + eolLen;
      const nextChar = nextIdx < text.length ? text[nextIdx] : '';
      const isSourceWrap =
        (text[i] === '\n' || text[i] === '\r') &&
        (
          (prevChar && /\w/.test(prevChar) && nextChar && /\w/.test(nextChar)) ||
          (nextChar === '`')
        );
      if (isSourceWrap) {
        i += eolLen;
      } else {
        result += ' ';
        i += eolLen;
      }
    } else {
      result += text[i];
      i++;
    }
  }
  return result;
}

export function rgbToHex(c: string): string {
  const m = c.match(/^rgb\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)\)$/);
  if (!m) return c.toLowerCase();
  return '#' + [parseInt(m[1]), parseInt(m[2]), parseInt(m[3])].map(v => v.toString(16).padStart(2, '0')).join('');
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/<[^>]+>/g, '')
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}
