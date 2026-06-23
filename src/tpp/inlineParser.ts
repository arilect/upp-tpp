import { decodeUppImage } from '../tppImages';
import { escapeHtml, processUrlEscapes, processEscapes } from './escape';
import { parseFormatCodes, styleToCss, styleToClass } from './formatCodes';
import { isStyleDefinition } from './paragraphStyle';

export function processInlineContent(text: string): string {
  let result = '';
  let i = 0;

  while (i < text.length) {
    const ch = text[i];

    if (ch === '[') {
      // Find matching ]
      let depth = 1;
      let j = i + 1;
      while (j < text.length && depth > 0) {
        if (text[j] === '`' && j + 1 < text.length) {
          j += 2;
          continue;
        }
        if (text[j] === '[') {
          if (depth === 1) {
            // Check if content between outer [ and this [ is a style macro like {X}
            const contentBetween = text.substring(i + 1, j);
            if (/^\{[_A-Za-z0-9]{1,5}\}/.test(contentBetween)) {
              break;
            }
          }
          depth++;
        }
        if (text[j] === ']') depth--;
        j++;
      }

      if (depth > 0) {
        i++;
        continue;
      }

      const block = text.substring(i + 1, j - 1);
      i = j;

      // Skip style definitions
      if (isStyleDefinition(block)) {
        continue;
      }

      // Check for link: [^url^ text]
      if (block.startsWith('^')) {
        const linkMatch = block.match(/^\^([^\^]+)\^\s*([\s\S]*)/);
        if (linkMatch) {
          const rawUrl = linkMatch[1];
          const url = processUrlEscapes(rawUrl).replace(/\|/g, '/');
          const linkText = linkMatch[2] ? processEscapes(linkMatch[2].trim()) : url;
          if (url.startsWith('topic://')) {
            result += `<a data-href="${escapeHtml(url)}" class="topic-link">${escapeHtml(linkText)}</a>`;
          } else {
            result += `<a href="${escapeHtml(url)}" target="_blank">${escapeHtml(linkText)}</a>`;
          }
          continue;
        }
      }

      // Parse format codes and content
      // Find the space that separates format codes from content.
      // Labels like :Upp`:`:CoSort`(...) may contain spaces inside parens,
      // so find the first space at paren depth 0.
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
        continue;
      }

      const formatPart = block.substring(0, spaceIdx);
      const contentPart = block.substring(spaceIdx + 1);

      // Apply inline formatting
      const style = parseFormatCodes(formatPart);
      const cls = styleToClass(style);

      // Process content recursively
      let processedContent = processInlineContent(contentPart);

      if (style.link) {
        const url = processUrlEscapes(style.link).replace(/\|/g, '/');
        if (url.startsWith('topic://')) {
          result += `<a data-href="${escapeHtml(url)}" class="topic-link">${processedContent}</a>`;
        } else {
          result += `<a href="${escapeHtml(url)}" target="_blank">${processedContent}</a>`;
        }
      } else if (cls && style.underline) {
        result += `<u><span class="${cls}">${processedContent}</span></u>`;
      } else if (cls) {
        result += `<span class="${cls}">${processedContent}</span>`;
      } else if (style.underline && !style.color && !style.bold && !style.italic) {
        result += `<u>${processedContent}</u>`;
      } else {
        const css = styleToCss(style);
        if (css) {
          result += `<span style="${css}">${processedContent}</span>`;
        } else {
          result += processedContent;
        }
      }
    } else if (ch === '&') {
      result += '<br>';
      i++;
    } else if (ch === '{' && i + 1 < text.length && text[i + 1] === '{') {
      // QTF table block: {{colWidth:colWidth tableFmt [cell] ::fmt [cell] ::fmt [cell] ...}}
      i += 2;
      let depth = 1;
      let tableContent = '';
      while (i < text.length && depth > 0) {
        if (text[i] === '{' && i + 1 < text.length && text[i + 1] === '{') {
          depth++;
          i += 2;
        } else if (text[i] === '}' && i + 1 < text.length && text[i + 1] === '}') {
          depth--;
          i += 2;
        } else {
          tableContent += text[i];
          i++;
        }
      }
      // Find first [ to skip column widths and table format codes
      const firstBracket = tableContent.indexOf('[');
      if (firstBracket >= 0) {
        const rawContent = tableContent.substring(firstBracket);
        // Split by :: to separate table cells — bracket-aware
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
        for (const cell of cells) {
          // Each cell has format codes before [ — skip to first [
          const cellBracket = cell.indexOf('[');
          if (cellBracket >= 0) {
            result += processInlineContent(cell.substring(cellBracket));
          }
        }
      }
    } else if (ch === ']') {
      // Stray closing bracket from document structure — skip it
      i++;
    } else if (ch === '@' && i + 1 < text.length && text[i + 1] === '@') {
      // @@object: type:W&H\n(BASE64_DATA)
      i += 2;
      let typeName = '';
      while (i < text.length && /[a-zA-Z0-9_]/.test(text[i])) {
        typeName += text[i];
        i++;
      }
      if (i < text.length && text[i] === ':') i++;
      let wStr = '';
      while (i < text.length && /[0-9]/.test(text[i])) { wStr += text[i]; i++; }
      if (i < text.length && (text[i] === '&' || text[i] === '*')) i++;
      let hStr = '';
      while (i < text.length && /[0-9]/.test(text[i])) { hStr += text[i]; i++; }
      while (i < text.length && (text[i] === ' ' || text[i] === '\n' || text[i] === '\r' || text[i] === '\t')) i++;
      const w = parseInt(wStr) || 0;
      const h = parseInt(hStr) || 0;
      if (i < text.length && text[i] === '(') {
        i++;
        let b64 = '';
        while (i < text.length && text[i] !== ')') { b64 += text[i]; i++; }
        if (i < text.length) i++;
        if (typeName === 'rawimage' || typeName === 'PING' || typeName === 'PNG') {
          const aspectRatio = h > 0 && w > 0 ? ` aspect-ratio:${w}/${h}` : '';
          result += `<img src="data:image/png;base64,${b64}" style="max-width:100%;height:auto;${aspectRatio}">`;
        } else if (typeName === 'image') {
          const dataUrl = decodeUppImage(b64);
          if (dataUrl) {
            const aspectRatio = h > 0 && w > 0 ? ` aspect-ratio:${w}/${h}` : '';
            result += `<img src="${dataUrl}" style="max-width:100%;height:auto;${aspectRatio}">`;
          } else {
            const aspectRatio = h > 0 && w > 0 ? ` aspect-ratio:${w}/${h}` : '';
            result += `<img src="data:image/png;base64,${b64}" style="max-width:100%;height:auto;${aspectRatio}">`;
          }
        }
      } else {
        // Raw binary @@image data (not base64-wrapped) — skip all remaining content in this paragraph
        i = text.length;
        result += `<div style="display:inline-block;border:1px dashed var(--tpp-border-color,#555);padding:4px 8px;color:var(--tpp-text-color,#999);font-size:12px;">[Image: ${w}x${h}]</div>`;
      }
    } else if (ch === '@') {
      // Standalone @ in text — QTF uses @ as color prefix in format codes,
      // but in content text it's just a literal '@'. Emit as-is.
      result += '@';
      i++;
    } else {
      // Process escape sequences first, then escape HTML
      let textChunk = '';
      while (i < text.length && text[i] !== '[' && text[i] !== '&' && text[i] !== '{' && text[i] !== ']' && text[i] !== '@') {
        if (text[i] === '`' && i + 1 < text.length) {
          textChunk += text[i] + text[i + 1];
          i += 2;
        } else if (text[i] === '\n' || text[i] === '\r') {
          // Newline in text chunk = line break
          let eolLen = 1;
          if (text[i] === '\r' && i + 1 < text.length && text[i + 1] === '\n') eolLen = 2;
          textChunk += '\n';
          i += eolLen;
        } else {
          textChunk += text[i];
          i++;
        }
      }
      result += escapeHtml(processEscapes(textChunk));
    }
  }

  return result;
}
