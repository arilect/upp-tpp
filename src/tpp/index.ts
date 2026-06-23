export type { TextStyle, ParagraphStyle, ParsedTpp, TppRenderOptions } from './types';
import type { TppRenderOptions } from './types';
import { SIZE_MAP_DEFAULTS, setCurrentOptions } from './constants';
import { extractTopicTitle, extractTopicBody, parseQtfContent } from './qtfParser';
import { buildHtmlDocument } from './htmlTemplate';
import { escapeHtml } from './escape';

export function parseTpp(content: string): { title: string | null; bodyHtml: string } {
  const title = extractTopicTitle(content);
  const body = extractTopicBody(content);
  const bodyHtml = parseQtfContent(body);

  return {
    title,
    bodyHtml,
  };
}

export function tppToHtml(content: string, title?: string, options?: TppRenderOptions): string {
  if (options) {
    const sizeMap: Record<string, string> = {
      '0': (options.size0 ?? 18) + 'px',
      '1': (options.size1 ?? 24) + 'px',
      '2': (options.size2 ?? 30) + 'px',
      '3': (options.size3 ?? 36) + 'px',
      '4': (options.size4 ?? 48) + 'px',
      '5': (options.size5 ?? 60) + 'px',
      '6': (options.size6 ?? 72) + 'px',
      '7': (options.size7 ?? 84) + 'px',
      '8': (options.size8 ?? 108) + 'px',
      '9': (options.size9 ?? 144) + 'px',
    };
    setCurrentOptions({
      sizeMap,
      codeFontFamily: options.codeFontFamily,
      codeColor: options.codeColor,
      serifFontFamily: options.serifFontFamily,
      preprocessorColor: options.preprocessorColor,
      stringColor: options.stringColor,
      typeColor: options.typeColor,
      operatorColor: options.operatorColor,
      commentColor: options.commentColor,
      codeFontSize: options.codeFontSize,
      codeMarginLeft: options.codeMarginLeft,
      listMarginLeft: options.listMarginLeft,
      keywordColor: options.keywordColor,
      paramColor: options.paramColor,
      codeRenderingMode: options.codeRenderingMode,
      shikiTheme: options.shikiTheme,
    });
  }
  const parsed = parseTpp(content);
  const displayTitle = title || parsed.title || 'Topic';
  const isPublish = options?.publishMode || false;
  const bodyHtml = parsed.bodyHtml
    .replace(/color:rgb\(0,\s*0,\s*255\)/g, 'color:var(--tpp-keyword-color)')
    .replace(/color:#ff0000/g, 'color:var(--tpp-param-color)');

  return buildHtmlDocument(options, displayTitle, bodyHtml, isPublish);
}
