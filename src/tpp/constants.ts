import type { ParagraphStyle } from './types';

export const FONT_MAP: Record<string, string> = {
  'A': 'Arial, sans-serif',
  'R': 'Times New Roman, serif',
  'C': 'Courier New, monospace',
  'G': 'sans-serif',
  'g': 'sans-serif',
};

export const SIZE_MAP_DEFAULTS: Record<string, string> = {
  '0': '18px',
  '1': '24px',
  '2': '30px',
  '3': '36px',
  '4': '48px',
  '5': '60px',
  '6': '72px',
  '7': '84px',
  '8': '108px',
  '9': '144px',
};

export let currentCodeRenderingMode: 'u++' | 'vscode' = 'vscode';
export let currentShikiTheme = 'dark-plus';
export let currentFormatCode = true;
export let currentFormatStyle = 'U++';
export let styleRegistry: Record<string, ParagraphStyle> = {};

export let SIZE_MAP: Record<string, string> = { ...SIZE_MAP_DEFAULTS };
export let currentCodeFontFamily = 'Cascadia Code, Fira Code, monospace';
export let currentSerifFontFamily = 'serif';
export let currentPreprocessorColor = '#8000ff';
export let currentStringColor = '#800000';
export let currentTypeColor = '#008080';
export let currentOperatorColor = '#0000ff';
export let currentCommentColor = '#008000';

// Fixed U++ theme colors for class assignment in styleToClass().
// These are the colors QTF source uses in @(R.G.B) codes.
// Must NOT change when user adjusts color settings.
export const UPP_THEME_COLORS = {
  operator:  '#0000ff',
  keyword:   '#569cd6',
  string:    '#00a000',
  type:      '#008080',
  preprocessor: '#8000ff',
  comment:   '#008000',
} as const;
export let currentCodeFontSize = 13;
export let currentCodeMarginLeft = 64;
export let currentListMarginLeft = 45;
export let currentKeywordColor = '#569cd6';
export let currentParamColor = '#ff0000';
export let currentTableBackgroundColor = '#712a00';

export const COLOR_MAP: Record<string, string> = {
  '0': '#888888',
  '1': '#c0c0c0',
  '2': '#ffffff',
  '3': '#ff6666',
  '4': '#66cc66',
  '5': '#569cd6',
  '6': '#ff6666',
  '7': '#f0f0f0',
  '8': '#66ffff',
  '9': '#cccc44',
  'b': '#569cd6',
  'c': '#00ffff',
  'g': '#66cc66',
  'k': '#888888',
  'l': '#c0c0c0',
  'm': '#ff66ff',
  'r': '#ff6666',
  'y': '#cccc44',
};

export function setCurrentOptions(opts: {
  sizeMap?: Record<string, string>;
  codeFontFamily?: string;
  codeColor?: string;
  serifFontFamily?: string;
  preprocessorColor?: string;
  stringColor?: string;
  typeColor?: string;
  operatorColor?: string;
  commentColor?: string;
  codeFontSize?: number;
  codeMarginLeft?: number;
  listMarginLeft?: number;
  keywordColor?: string;
  paramColor?: string;
  tableBackgroundColor?: string;
  codeRenderingMode?: 'u++' | 'vscode';
  shikiTheme?: string;
  formatCode?: boolean;
  formatStyle?: string;
}) {
  if (opts.sizeMap) {
    for (const k of Object.keys(opts.sizeMap)) SIZE_MAP[k] = opts.sizeMap[k];
  }
  if (opts.codeFontFamily) currentCodeFontFamily = opts.codeFontFamily;
  if (opts.codeColor) {
    COLOR_MAP['5'] = opts.codeColor;
    COLOR_MAP['b'] = opts.codeColor;
  }
  if (opts.serifFontFamily) currentSerifFontFamily = opts.serifFontFamily;
  if (opts.preprocessorColor) currentPreprocessorColor = opts.preprocessorColor;
  if (opts.stringColor) currentStringColor = opts.stringColor;
  if (opts.typeColor) currentTypeColor = opts.typeColor;
  if (opts.operatorColor) currentOperatorColor = opts.operatorColor;
  if (opts.commentColor) currentCommentColor = opts.commentColor;
  if (opts.codeFontSize) currentCodeFontSize = opts.codeFontSize;
  if (opts.codeMarginLeft) currentCodeMarginLeft = opts.codeMarginLeft;
  if (opts.listMarginLeft) currentListMarginLeft = opts.listMarginLeft;
  if (opts.keywordColor) currentKeywordColor = opts.keywordColor;
  if (opts.paramColor) currentParamColor = opts.paramColor;
  if (opts.tableBackgroundColor) currentTableBackgroundColor = opts.tableBackgroundColor;
  if (opts.codeRenderingMode) currentCodeRenderingMode = opts.codeRenderingMode;
  if (opts.shikiTheme) currentShikiTheme = opts.shikiTheme;
  if (opts.formatCode !== undefined) currentFormatCode = opts.formatCode;
  if (opts.formatStyle) currentFormatStyle = opts.formatStyle;
}

export function resetStyleRegistry() {
  styleRegistry = {};
}

export function getStyleRegistry() {
  return styleRegistry;
}

export function registerStyle(id: string, style: ParagraphStyle) {
  styleRegistry[id] = style;
}
