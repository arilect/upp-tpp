// U++ framework .clang-format config (from ~/gits/upp/.clang-format)
export const UPP_STYLE = `{BasedOnStyle: LLVM, UseTab: AlignWithSpaces, IndentWidth: 4, TabWidth: 4, ColumnLimit: 96, AccessModifierOffset: -4, AllowShortFunctionsOnASingleLine: All, AlwaysBreakTemplateDeclarations: true, BreakBeforeBraces: Stroustrup, BreakConstructorInitializers: BeforeComma, CompactNamespaces: true, DerivePointerAlignment: false, PointerAlignment: Left, SpaceBeforeParens: Custom, SpaceBeforeParensOptions: {AfterControlStatements: false}, IndentAccessModifiers: false, IndentPPDirectives: None}`;

export const FORMAT_STYLES: Record<string, string> = {
  'U++': UPP_STYLE,
  'LLVM': 'LLVM',
  'Google': 'Google',
  'Chromium': 'Chromium',
  'Mozilla': 'Mozilla',
  'WebKit': 'WebKit',
  'Microsoft': 'Microsoft',
  'GNU': 'GNU',
};

let formatFn: ((content: string, filename?: string, style?: string) => string) | null = null;
let initDone = false;

export async function initFormatter(): Promise<void> {
  if (initDone) return;
  try {
    const mod = require('@wasm-fmt/clang-format/clang-format-node.js');
    formatFn = mod.format;
    initDone = true;
  } catch (err) {
    console.warn('Failed to initialize WASM clang-format:', err);
    formatFn = null;
    initDone = true;
  }
}

export function getFormatter(): ((content: string, filename?: string, style?: string) => string) | null {
  return formatFn;
}

export function formatCodeSync(code: string, style?: string): string {
  if (!formatFn) return code;
  const resolvedStyle = FORMAT_STYLES[style || 'U++'] || UPP_STYLE;
  try {
    return formatFn(code, 'main.cpp', resolvedStyle);
  } catch {
    return code;
  }
}
