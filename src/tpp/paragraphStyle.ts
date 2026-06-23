import type { ParagraphStyle } from './types';
import { SIZE_MAP } from './constants';

export function isStyleDefinition(content: string): boolean {
  // Style definitions look like: [format_codes $$number,#uuid:name]
  return /\$\$[\d]+,[\d#]+/.test(content);
}

export function parseParagraphStyle(codes: string): ParagraphStyle {
  const style: ParagraphStyle = {};
  let i = 0;

  while (i < codes.length) {
    const ch = codes[i];

    if (ch === ':') {
      // Label format code: :label: — extract label
      i++;
      let label = '';
      while (i < codes.length && codes[i] !== ':') {
        label += codes[i];
        i++;
      }
      if (i < codes.length) i++; // skip closing :
      if (label) style.label = label.replace(/`/g, '');
      continue;
    } else if (ch === '<') {
      style.align = 'left';
    } else if (ch === '=') {
      style.align = 'center';
    } else if (ch === '>') {
      style.align = 'right';
    } else if (ch === '#') {
      style.align = 'justify';
    } else if (ch === 'i') {
      i++;
      let num = '';
      while (i < codes.length && /[0-9]/.test(codes[i])) {
        num += codes[i];
        i++;
      }
      if (num) style.indent = parseInt(num);
      continue;
    } else if (ch === 'l') {
      i++;
      let num = '';
      while (i < codes.length && /[0-9]/.test(codes[i])) {
        num += codes[i];
        i++;
      }
      if (num) style.leftMargin = parseInt(num);
      continue;
    } else if (ch === 'r') {
      i++;
      let num = '';
      while (i < codes.length && /[0-9]/.test(codes[i])) {
        num += codes[i];
        i++;
      }
      if (num) style.rightMargin = parseInt(num);
      continue;
    } else if (ch === 'b') {
      i++;
      let num = '';
      while (i < codes.length && /[0-9]/.test(codes[i])) {
        num += codes[i];
        i++;
      }
      if (num) style.spaceBefore = parseInt(num);
      continue;
    } else if (ch === 'a') {
      i++;
      let num = '';
      while (i < codes.length && /[0-9]/.test(codes[i])) {
        num += codes[i];
        i++;
      }
      if (num) style.spaceAfter = parseInt(num);
      continue;
    } else if (ch === 'O') {
      i++;
      if (i < codes.length) {
        const bulletCh = codes[i];
        if (bulletCh === '0' || bulletCh === '1' || bulletCh === '2' || bulletCh === '3') {
          style.bullet = '\u2022';
        } else if (bulletCh === '9') {
          style.bullet = '\u2192';
        }
      }
      continue;
    } else if (ch === 's') {
      i++;
      let styleId = '';
      while (i < codes.length && /[0-9]/.test(codes[i])) {
        styleId += codes[i];
        i++;
      }
      style.styleId = styleId;
      continue;
    } else if (ch === 'k') {
      i++;
      // Skip k/K (keep with next)
      continue;
    } else if (ch === '*') {
      i++;
      let num = '';
      while (i < codes.length && /[0-9]/.test(codes[i])) {
        num += codes[i];
        i++;
      }
      if (num) {
        // *N maps to SIZE_MAP: *0=18px, *1=24px, *2=30px, *3=36px, *4=48px, etc.
        style.fontSize = SIZE_MAP[num] || `${Math.round(parseInt(num) * 18 / 50)}px`;
      }
      continue;
    } else if (ch === 'H') {
      i++;
      let num = '';
      while (i < codes.length && /[0-9]/.test(codes[i])) {
        num += codes[i];
        i++;
      }
      const h = parseInt(num) || 0;
      if (h > 0) {
        style.horizontalRule = true;
        style.rulerHeight = h;
      }
      continue;
    }

    i++;
  }

  return style;
}

export function paragraphStyleToCss(style: ParagraphStyle): string {
  const parts: string[] = [];

  if (style.align) parts.push(`text-align:${style.align}`);
  if (style.indent) parts.push(`text-indent:${Math.round(style.indent / 10)}px`);
  if (style.leftMargin) parts.push(`margin-left:${Math.round(style.leftMargin / 10)}px`);
  if (style.rightMargin) parts.push(`margin-right:${Math.round(style.rightMargin / 10)}px`);
  if (style.spaceBefore) parts.push(`margin-top:${Math.round(style.spaceBefore / 5)}px`);
  if (style.spaceAfter) parts.push(`margin-bottom:${Math.round(style.spaceAfter / 5)}px`);

  return parts.join(';');
}
