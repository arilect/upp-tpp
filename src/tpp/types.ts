export interface TextStyle {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikeout?: boolean;
  fontFamily?: string;
  fontSize?: string;
  color?: string;
  bgColor?: string;
  superscript?: boolean;
  subscript?: boolean;
  monospace?: boolean;
  link?: string;
}

export interface ParagraphStyle {
  align?: string;
  indent?: number;
  leftMargin?: number;
  rightMargin?: number;
  spaceBefore?: number;
  spaceAfter?: number;
  bullet?: string;
  styleId?: string;
  horizontalRule?: boolean;
  rulerHeight?: number;
  label?: string;
  fontSize?: string;
  bold?: boolean;
  italic?: boolean;
  [key: string]: unknown;
}

export interface ParsedTpp {
  title: string | null;
  bodyHtml: string;
}

export interface TppRenderOptions {
  fontSize?: number;
  fontFamily?: string;
  codeFontFamily?: string;
  serifFontFamily?: string;
  codeColor?: string;
  lineHeight?: number;
  textColor?: string;
  backgroundColor?: string;
  headingColor?: string;
  linkColor?: string;
  codeBackground?: string;
  borderColor?: string;
  keywordColor?: string;
  paramColor?: string;
  preprocessorColor?: string;
  stringColor?: string;
  typeColor?: string;
  operatorColor?: string;
  commentColor?: string;
  bgYellow?: string;
  bgRed?: string;
  bgGreen?: string;
  bgBlue?: string;
  bgMagenta?: string;
  bgCyan?: string;
  bgCustom?: string;
  tableBackgroundColor?: string;
  codeFontSize?: number;
  codeMarginLeft?: number;
  listMarginLeft?: number;
  publishMode?: boolean;
  codeRenderingMode?: 'u++' | 'vscode';
  shikiTheme?: string;
  scrollToAnchor?: string;
  size0?: number;
  size1?: number;
  size2?: number;
  size3?: number;
  size4?: number;
  size5?: number;
  size6?: number;
  size7?: number;
  size8?: number;
  size9?: number;
  uppsrcScanMode?: string;
  uppsrcCustomPath?: string;
}
