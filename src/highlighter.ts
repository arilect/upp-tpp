import { createHighlighter } from 'shiki';
import type { BundledLanguage, BundledTheme } from 'shiki';

type Highlighter = Awaited<ReturnType<typeof createHighlighter>>;

let highlighterInstance: Highlighter | null = null;
let initPromise: Promise<Highlighter> | null = null;

const LANGUAGES: BundledLanguage[] = ['cpp', 'c', 'sql', 'json'];
const THEME: BundledTheme = 'dark-plus';

export async function initHighlighter(): Promise<Highlighter> {
  if (highlighterInstance) return highlighterInstance;
  if (initPromise) return initPromise;

  initPromise = createHighlighter({
    themes: [THEME],
    langs: LANGUAGES,
  }).then(h => {
    highlighterInstance = h;
    return h;
  });

  return initPromise;
}

export function getHighlighter(): Highlighter | null {
  return highlighterInstance;
}

export function detectLanguage(codeText: string): string {
  if (/TABLE_\(\)|INT_\(\)|STRING_\(\)|END_TABLE|PRIMARY_KEY|SERIAL_\(\)|SQLDEFAULT/.test(codeText)) {
    return 'cpp';
  }
  if (/@\(x\)|for\(i in|is_void|:foo\s*=|#:foo|var\s+/.test(codeText)) {
    return 'text';
  }
  if (/^\s*(SELECT|INSERT|CREATE\s+TABLE|ALTER\s+TABLE|DROP\s+TABLE|UPDATE|DELETE\s+FROM)\s/im.test(codeText)) {
    return 'sql';
  }
  if (/^\s*\{/.test(codeText) && /"[\w]+"\s*:/.test(codeText)) {
    return 'json';
  }
  return 'cpp';
}

export function highlightCode(code: string, lang?: string): string {
  if (!highlighterInstance) {
    return escapeHtmlFallback(code);
  }
  const language = lang || detectLanguage(code);
  if (language === 'text') {
    return escapeHtmlFallback(code);
  }
  try {
    return highlighterInstance.codeToHtml(code, { lang: language as BundledLanguage, theme: THEME });
  } catch {
    return escapeHtmlFallback(code);
  }
}

function escapeHtmlFallback(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
