import { highlightCode, getHighlighter } from '../highlighter';
import { escapeHtml, processUrlEscapes, processEscapes } from './escape';
import { parseFormatCodes, styleToClass } from './formatCodes';
import { parseParagraphStyle, paragraphStyleToCss, isStyleDefinition } from './paragraphStyle';
import { processInlineContent } from './inlineParser';
import { looksLikeCodeContent } from './codeDetector';
import { slugify } from './escape';
import { currentCodeRenderingMode, currentShikiTheme, resetStyleRegistry, getStyleRegistry, registerStyle } from './constants';

function stripQtfFormatting(content: string): string {
  let result = '';
  let i = 0;
  while (i < content.length) {
    const ch = content[i];
    if (ch === '[') {
      let depth = 1;
      let j = i + 1;
      while (j < content.length && depth > 0) {
        if (content[j] === '`' && j + 1 < content.length) {
          j += 2;
          continue;
        }
        if (content[j] === '[') depth++;
        if (content[j] === ']') depth--;
        j++;
      }
      if (depth === 0) {
        const inner = content.substring(i + 1, j - 1);
        if (isStyleDefinition(inner)) {
          i = j;
          continue;
        }
        let spaceIdx = -1;
        let pd = 0;
        for (let k = 0; k < inner.length; k++) {
          if (inner[k] === '(' || inner[k] === '[') pd++;
          else if (inner[k] === ')' || inner[k] === ']') pd--;
          if (inner[k] === ' ' && pd <= 0) { spaceIdx = k; break; }
        }
        if (spaceIdx >= 0) {
          result += stripQtfFormatting(inner.substring(spaceIdx + 1));
        }
        i = j;
      } else {
        i++;
      }
    } else if (ch === '`' && i + 1 < content.length) {
      const next = content[i + 1];
      if (next === '+') result += '+';
      else if (next === '_') result += '_';
      else if (next === '$') result += '|';
      else if (next === ':') result += ':';
      else if (next === '-') result += '-';
      else result += next;
      i += 2;
    } else if (ch === '-' && i + 1 < content.length && content[i + 1] === '|') {
      result += '\t';
      i += 2;
    } else if (ch === '_') {
      result += '\u00A0';
      i++;
    } else if (ch === '\n' || ch === '\r') {
      let eolLen = 1;
      if (ch === '\r' && i + 1 < content.length && content[i + 1] === '\n') eolLen = 2;
      i += eolLen;
    } else if (ch === '@' && i + 1 < content.length && content[i + 1] === '@') {
      // @@image:... or @@rawimage:... — skip entire image data
      i += 2;
      while (i < content.length && /[a-zA-Z0-9_]/.test(content[i])) i++;
      if (i < content.length && content[i] === ':') i++;
      while (i < content.length && /[0-9&*]/.test(content[i])) i++;
      while (i < content.length && (content[i] === ' ' || content[i] === '\n' || content[i] === '\r' || content[i] === '\t')) i++;
      if (i < content.length && content[i] === '(') {
        i++;
        while (i < content.length && content[i] !== ')') i++;
        if (i < content.length) i++;
      }
    } else if (ch === '@') {
      // Standalone @ — skip
      i++;
    } else if (ch === '&' || ch === '{' || ch === '}') {
      i++;
    } else {
      result += ch;
      i++;
    }
  }
  return result;
}

export function extractTopicTitle(content: string): string | null {
  const match = content.match(/^topic\s+"([^"]+)"/m);
  return match ? match[1] : null;
}

export function extractTopicBody(content: string): string {
  const lines = content.split('\n');
  const bodyLines: string[] = [];
  let foundTopic = false;

  for (const line of lines) {
    if (!foundTopic) {
      if (/^topic\s+"/.test(line)) {
        foundTopic = true;
        continue;
      }
    }
    if (foundTopic) {
      bodyLines.push(line);
    }
  }

  return bodyLines.join('\n');
}

export function parseQtfContent(content: string): string {
  let html = '';
  let i = 0;
  let codeBuffer: string[] = [];

  // Clear style registry at start of parsing
  resetStyleRegistry();

  const styleRegistry = getStyleRegistry();

  function flushCodeBuffer() {
    if (codeBuffer.length === 0) return;
    if (currentCodeRenderingMode === 'vscode' && getHighlighter()) {
      const merged = codeBuffer.join('\n');
      const highlighted = highlightCode(merged, undefined, currentShikiTheme);
      html += `<div class="shiki-wrapper" style="font-family:var(--tpp-code-font);font-size:var(--tpp-code-font-size);white-space:pre-wrap;word-wrap:break-word;">${highlighted}</div>\n`;
    } else {
      for (const line of codeBuffer) {
        html += `<p class="M">${line}</p>\n`;
      }
    }
    codeBuffer = [];
  }

  while (i < content.length) {
    const ch = content[i];

    if (ch === '[') {
      // Find matching ]
      let depth = 1;
      let j = i + 1;
      while (j < content.length && depth > 0) {
        if (content[j] === '`' && j + 1 < content.length) {
          j += 2;
          continue;
        }
        if (content[j] === '[') {
          if (depth === 1) {
            const contentBetween = content.substring(i + 1, j);
            if (/^\{[_A-Za-z0-9]{1,5}\}/.test(contentBetween)) {
              break;
            }
          }
          depth++;
        }
        if (content[j] === ']') depth--;
        j++;
      }

      if (depth > 0) {
        // Unclosed block: check if it's a style macro like [{_} (no closing ])
        const innerContent = content.substring(i + 1, j);
        const styleMacroMatch = innerContent.match(/^\{[_A-Za-z0-9]{1,5}\}/);
        if (styleMacroMatch) {
          i += 1 + styleMacroMatch[0].length;
          // Skip any trailing language code like %EN-US after the style macro
          while (i < content.length && content[i] === '%') {
            i++;
            while (i < content.length && /[A-Za-z0-9_-]/.test(content[i])) {
              i++;
            }
          }
          // Skip trailing whitespace
          while (i < content.length && (content[i] === ' ' || content[i] === '\r' || content[i] === '\n')) {
            i++;
          }
        } else {
          i++;
        }
        continue;
      }

      const block = content.substring(i + 1, j - 1);
      i = j;

      // Parse style definitions and store full ParagraphStyle
      if (isStyleDefinition(block)) {
        const styleIdMatch = block.match(/\$\$(\d+)/);
        if (styleIdMatch) {
          const styleId = styleIdMatch[1];
          const formatPart = block.substring(0, block.indexOf('$$'));
          const style = parseParagraphStyle(formatPart);
          registerStyle(styleId, style);
        }
        continue;
      }

      // Check for link at block level: [^url^ text]
      if (block.startsWith('^')) {
        const linkMatch = block.match(/^\^([^\^]+)\^\s*([\s\S]*)/);
        if (linkMatch) {
          const rawUrl = linkMatch[1];
          const url = processUrlEscapes(rawUrl).replace(/\|/g, '/');
          const linkText = linkMatch[2] ? processEscapes(linkMatch[2].trim()) : url;
          if (url.startsWith('topic://')) {
            html += `<a data-href="${escapeHtml(url)}" class="topic-link">${escapeHtml(linkText)}</a>`;
          } else {
            html += `<a href="${escapeHtml(url)}" target="_blank">${escapeHtml(linkText)}</a>`;
          }
          continue;
        }
      }

      // Parse format codes
      // Find the first space at paren depth 0 (labels may contain spaces inside parens)
      let spaceIdx = -1;
      let parenDepth = 0;
      for (let k = 0; k < block.length; k++) {
        if (block[k] === '(' || block[k] === '[') parenDepth++;
        else if (block[k] === ')' || block[k] === ']') parenDepth--;
        if (block[k] === ' ' && parenDepth <= 0) {
          spaceIdx = k;
          break;
        }
      }
      if (spaceIdx === -1) {
        // Just format codes, no content
        continue;
      }

      const formatPart = block.substring(0, spaceIdx);
      const contentPart = block.substring(spaceIdx + 1);

      // Check if content is a table: starts with {digit (lost one { during space split)
      // e.g. block "[ {{5000:5000... }}]" → contentPart = "{5000:5000... }}"
      const isTable = /^\{\d+/.test(contentPart) || /^\{\{/.test(contentPart);
      if (isTable) {
        // Restore the full table content by prepending { if needed
        const tableSrc = contentPart.startsWith('{{') ? contentPart : '{' + contentPart;
        // Find matching }}
        let tDepth = 0;
        let tEnd = -1;
        for (let ti = 0; ti < tableSrc.length - 1; ti++) {
          if (tableSrc[ti] === '{' && tableSrc[ti + 1] === '{') { tDepth++; ti++; }
          else if (tableSrc[ti] === '}' && tableSrc[ti + 1] === '}') { tDepth--; ti++; if (tDepth === 0) { tEnd = ti - 1; break; } }
        }
        if (tEnd >= 0) {
          const tableContent = tableSrc.substring(tableSrc.startsWith('{{') ? 2 : 1, tEnd);
          // Parse table format: colWidth[:colWidth...] [@(R,G.B)] [F(size)] [G(size)]
          const headerEnd = tableContent.indexOf('[');
          const header = headerEnd >= 0 ? tableContent.substring(0, headerEnd) : '';
          // Extract background color from @(R,G.B) pattern
          let bgColor = '';
          const colorMatch = header.match(/@\((\d+)\.(\d+)\.(\d+)\)/);
          if (colorMatch) {
            bgColor = `rgb(${colorMatch[1]},${colorMatch[2]},${colorMatch[3]})`;
          }
          // Extract F/G font sizes for section headings
          let fSize = '';
          let gSize = '';
          const fMatch = header.match(/F\((\d+)\)/);
          const gMatch = header.match(/G\((\d+)\)/);
          if (fMatch) fSize = fMatch[1];
          if (gMatch) gSize = gMatch[1];

          const firstBracket = tableContent.indexOf('[');
          if (firstBracket >= 0) {
            const rawContent = tableContent.substring(firstBracket);
            const cells: string[] = [];
            let cellStart = 0;
            let cd = 0;
            for (let ci = 0; ci < rawContent.length - 1; ci++) {
              if (rawContent[ci] === '`' && ci + 1 < rawContent.length) { ci++; continue; }
              if (rawContent[ci] === '[') cd++;
              else if (rawContent[ci] === ']') cd--;
              if (cd === 0 && rawContent[ci] === ':' && rawContent[ci + 1] === ':') {
                cells.push(rawContent.substring(cellStart, ci));
                cellStart = ci + 2;
                ci++;
              }
            }
            cells.push(rawContent.substring(cellStart));

            const numCols = header.includes(':') ? header.split(':').length : 2;
            const effectiveBg = bgColor || 'rgb(255,255,150)';
            html += `<table class="tpp-table tpp-table-colored" style="--tpp-table-bg:${effectiveBg}"><tbody>\n`;
            for (let ci = 0; ci < cells.length; ci += numCols) {
              html += '<tr>\n';
              for (let col = 0; col < numCols; col++) {
                const cell = cells[ci + col];
                if (cell !== undefined) {
                  const cellBracket = cell.indexOf('[');
                  if (cellBracket >= 0) {
                    const processed = processInlineContent(cell.substring(cellBracket));
                    const cellClass = col === 0 ? 'tpp-table-cell-key' : 'tpp-table-cell-desc';
                    html += `<td class="${cellClass}">${processed}</td>\n`;
                  }
                }
              }
              html += '</tr>\n';
            }
            html += `</tbody></table>\n`;
          }
          continue;
        }
      }

      // Parse paragraph style
      const pStyle = parseParagraphStyle(formatPart);

      // Merge inherited style from style registry (full ParagraphStyle)
      if (pStyle.styleId && styleRegistry[pStyle.styleId]) {
        const inherited = styleRegistry[pStyle.styleId];
        // Inherit properties not explicitly set in this paragraph
        // Exclude 'bullet' - list item styles shouldn't force bullets on function signatures
        // Exclude 'horizontalRule'/'rulerHeight' - structural properties that cause the parser
        // to emit only <hr> and lose the heading content entirely (e.g. s3 style with H4)
        const pKeys = Object.keys(pStyle);
        for (const key of Object.keys(inherited)) {
          if (key === 'bullet' || key === 'horizontalRule' || key === 'rulerHeight') continue;
          if (!pKeys.includes(key) && inherited[key] !== undefined) {
            pStyle[key] = inherited[key];
          }
        }
      }

      const pStyleCss = paragraphStyleToCss(pStyle);

      // Process content with inline formatting
      const processedContent = processInlineContent(contentPart);
      let finalContent = processedContent;

      // Check if this ends with &] (paragraph end)
      const endsWithParagraph = contentPart.endsWith('&]');

      // Detect code block paragraphs: l320 left margin (code indentation) or C (Courier) font in paragraph format
      const isCodeBlock = /l320|l321/.test(formatPart) || /;C[+0-9]*%/.test(formatPart);

      // Secondary heuristic: detect code by content patterns (catches s7 Courier paragraphs)
      // Only applies to paragraphs with Courier-style formatting (C font or explicit code style s7)
      // NOTE: /s[37]/ was wrong because s3 is a heading style in some documents, not code
      const plainText = isCodeBlock ? '' : stripQtfFormatting(contentPart).trim();
      const hasCourierStyle = /s7[;\s]|s7$/.test(formatPart) || /;C[+0-9]/.test(formatPart) || /;C%/.test(formatPart);
      const looksLikeCode = !isCodeBlock && hasCourierStyle && plainText.length > 0 && looksLikeCodeContent(plainText);

      // Determine U++ CSS class from EFFECTIVE style (after inheritance)
      // Only assign heading classes when paragraph has EXPLICIT heading formatting
      let pClass = 'D';
      if (isCodeBlock) {
        pClass = 'M';
      } else if (pStyle.bullet) {
        pClass = 'I';
      } else if (pStyle.horizontalRule) {
        // Paragraph has explicit ruler (Hn) - it's a heading with separator above
        // Assign heading class based on effective font size/bold
        const fontSizePx = pStyle.fontSize ? parseFloat(pStyle.fontSize) : 0;
        const isBold = pStyle.bold === true;
        if (fontSizePx >= 48) pClass = 'C';
        else if (fontSizePx >= 36 && isBold) pClass = 'F';
        else if (fontSizePx >= 30 && isBold) pClass = 'G';
        else pClass = 'F'; // default heading with ruler
      } else if (pStyle.align === 'center') {
        pClass = 'H';
      } else if (plainText.length > 0 && looksLikeCodeContent(plainText)) {
        pClass = 'D';
      } else if (/H\d+/.test(formatPart)) {
        // Explicit ruler height = heading separator
        pClass = 'F';
      } else if (pStyle.align === 'center' && pStyle.bold) {
        pClass = 'F'; // centered + bold = heading
      } else if (pStyle.fontSize) {
        const sz = parseFloat(pStyle.fontSize);
        const isBold = pStyle.bold === true;
        if (sz >= 48) pClass = 'C';
        else if (sz >= 36 && isBold) pClass = 'F';
        else if (sz >= 30 && isBold) pClass = 'G';
        else pClass = 'D';
      } else if (pStyle.label && /^\d+([_.]\d+)*$/.test(pStyle.label)) {
        // Label is a section number like "2", "1_1", "14.1" — it's a heading
        // Main sections (single number) get C/F, subsections (number.number) get G
        pClass = /[_.]/.test(pStyle.label) ? 'G' : 'F';
      } else if (/;[A-Z]/.test(formatPart) && pStyle.bold) {
        pClass = 'AP'; // labeled bold
      } else if (/;[A-Z]/.test(formatPart)) {
        pClass = 'D'; // labeled normal
      } else {
        pClass = 'D'; // default body
      }

      // Auto-number headings: if label is numeric (e.g. "1", "1_1", "14.1") and text
      // doesn't already start with that number, prepend it as "1. " / "1.1 "
      if ((pClass === 'C' || pClass === 'F' || pClass === 'G') && pStyle.label && /^\d+([_.]\d+)*$/.test(pStyle.label)) {
        const textOnly = processedContent.replace(/<[^>]+>/g, '').trim();
        const displayLabel = pStyle.label.replace(/_/g, '.');
        // Don't add numbering if text already starts with label (e.g. "1. " or "1.1 " or "1." or "1.1")
        const alreadyNumbered = textOnly.startsWith(displayLabel + '. ') || textOnly.startsWith(displayLabel + '.') || textOnly.startsWith(displayLabel + ' ') || textOnly === displayLabel;
        if (!alreadyNumbered) {
          finalContent = `<b>${escapeHtml(displayLabel)}. </b>${processedContent}`;
        }
      }

      if (pStyle.horizontalRule) {
        flushCodeBuffer();
        html += `<hr class="tpp-hr">\n`;
      }
      if ((isCodeBlock || looksLikeCode) && currentCodeRenderingMode === 'vscode' && getHighlighter()) {
        const text = isCodeBlock ? stripQtfFormatting(contentPart) : plainText;
        if (text.trim()) {
          codeBuffer.push(text);
        }
      } else if (isCodeBlock || looksLikeCode) {
        flushCodeBuffer();
        if (processedContent.trim() !== '<br>' && processedContent.trim() !== '' && processedContent.trim() !== ' ') {
          // Generate ID for paragraph (prefer explicit label, otherwise use leading multi-level number, otherwise slug)
          let idAttr = '';
          if (pStyle.label) {
            idAttr = ` id="${escapeHtml(pStyle.label)}"`;
          } else {
            const plain = processedContent.replace(/<[^>]+>/g, '').replace(/[`]/g, '').trim();
            const stripped = processedContent.trim().replace(/<br\/?>$/i, '').trim();
            const hasOnlyLink = /^<a[\s>]/.test(stripped) && stripped.endsWith('</a>');
            const numMatch = plain.match(/^(\d+(?:\.\d+)*)[\.)\s]/);
            if (!hasOnlyLink && numMatch) {
              idAttr = ` id="${escapeHtml(numMatch[1])}"`;
            } else if (!hasOnlyLink && pClass !== 'M' && plain.length > 0) {
              idAttr = ` id="${escapeHtml(slugify(plain))}"`;
            }
          }
          html += `<p class="${pClass}"${idAttr}>${finalContent}</p>\n`;


        }
      } else if (processedContent.trim() === '<br>' || processedContent.trim() === '' || processedContent.trim() === ' ') {
        if (codeBuffer.length > 0) {
          // Empty line inside code block — skip, don't flush
        } else {
          html += `<br>\n`;
        }
      } else {
        // If we're inside a code buffer and this line looks like code, absorb it
        const plainTextForExtend = stripQtfFormatting(contentPart).trim();
        if (codeBuffer.length > 0 && plainTextForExtend.length > 0 && looksLikeCodeContent(plainTextForExtend)) {
          codeBuffer.push(plainTextForExtend);
        } else {
          flushCodeBuffer();
          // Generate ID for regular paragraph (prefer explicit label, otherwise use leading multi-level number, otherwise slug)
          let idAttr = '';
          if (pStyle.label) {
            idAttr = ` id="${escapeHtml(pStyle.label)}"`;
          } else {
            const plain = processedContent.replace(/<[^>]+>/g, '').replace(/[`]/g, '').trim();
            // Only auto-generate ID if paragraph has actual standalone text content
            // (skip paragraphs that are just links, images, or empty — e.g. TOC entries)
            const stripped = processedContent.trim().replace(/<br\/?>$/i, '').trim();
            const hasOnlyLink = /^<a[\s>]/.test(stripped) && stripped.endsWith('</a>');
            const numMatch = plain.match(/^(\d+(?:\.\d+)*)[\.)\s]/);
            if (!hasOnlyLink && numMatch) {
              idAttr = ` id="${escapeHtml(numMatch[1])}"`;
            } else if (!hasOnlyLink && pClass !== 'M' && plain.length > 0) {
              idAttr = ` id="${escapeHtml(slugify(plain))}"`;
            }
          }
          html += `<p class="${pClass}"${idAttr}>${finalContent}</p>\n`;

        }
      }
    } else if (ch === '{' && i + 1 < content.length && content[i + 1] === '{') {
      // QTF table block at top level
      i += 2;
      let depth = 1;
      let tableContent = '';
      while (i < content.length && depth > 0) {
        if (content[i] === '{' && i + 1 < content.length && content[i + 1] === '{') {
          depth++;
          i += 2;
        } else if (content[i] === '}' && i + 1 < content.length && content[i + 1] === '}') {
          depth--;
          i += 2;
        } else {
          tableContent += content[i];
          i++;
        }
      }
      const firstBracket = tableContent.indexOf('[');
      if (firstBracket >= 0) {
        const rawContent = tableContent.substring(firstBracket);
        const cells: string[] = [];
        let cellStart = 0;
        let depth = 0;
        for (let ci = 0; ci < rawContent.length - 1; ci++) {
          if (rawContent[ci] === '`' && ci + 1 < rawContent.length) {
            ci++;
            continue;
          }
          if (rawContent[ci] === '[') depth++;
          else if (rawContent[ci] === ']') depth--;
          if (depth === 0 && rawContent[ci] === ':' && rawContent[ci + 1] === ':') {
            cells.push(rawContent.substring(cellStart, ci));
            cellStart = ci + 2;
            ci++;
          }
        }
        cells.push(rawContent.substring(cellStart));
        for (const cell of cells) {
          const cellBracket = cell.indexOf('[');
          if (cellBracket >= 0) {
            const processed = processInlineContent(cell.substring(cellBracket));
            html += `<p>${processed}</p>\n`;
          }
        }
      }
    } else if (ch === '&') {
      // Standalone paragraph break
      flushCodeBuffer();
      i++;
    } else if (ch === '{') {
      // Lone { (not {{) — skip it
      i++;
    } else if (ch === ']') {
      // Stray closing bracket from document structure — skip it
      i++;
    } else {
      // Regular text outside of blocks
      let text = '';
      while (i < content.length && content[i] !== '[' && content[i] !== '&' && content[i] !== '{' && content[i] !== ']') {
        if (content[i] === '`' && i + 1 < content.length) {
          text += content[i] + content[i + 1];
          i += 2;
        } else {
          text += content[i];
          i++;
        }
      }
      if (text.trim()) {
        flushCodeBuffer();
        html += `<p>${escapeHtml(processEscapes(text))}</p>\n`;
      }
    }
  }

  // Flush any remaining code buffer
  flushCodeBuffer();

  return html;
}
