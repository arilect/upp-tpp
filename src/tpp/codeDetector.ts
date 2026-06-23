export function stripHtmlForCodeDetection(html: string): string {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function looksLikeCodeContent(text: string): boolean {
  const plain = stripHtmlForCodeDetection(text);
  return plain.length > 0 && (
    /^#\s*(include|define|if|else|elif|endif|pragma|undef|ifdef|ifndef)\b/.test(plain) ||
    /^(struct|class|enum|union|namespace|using|template|virtual|explicit|friend)\s/.test(plain) ||
    /^(void|int|bool|char|long|float|double|dword|byte|String|Value|Vector|Array)\s+\w+\s*[({]/.test(plain) ||
    /^(if|else|for|while|do|switch|case|return|break|continue|throw|try|catch)\s*[\({]/.test(plain) ||
    /^(public|private|protected)\s*[:{]/.test(plain) ||
    /^[a-zA-Z_]\w*::[a-zA-Z_~]\w*\s*\(/.test(plain) ||
    /^(GUI_APP_MAIN|CONSOLE_APP_MAIN|APP_MAIN)\b/.test(plain) ||
    /^\{;?\}?$/.test(plain) ||
    /^\};?$/.test(plain) ||
    /^\/\//.test(plain) ||
    /^\w+[\w.>-]*\s*\(/.test(plain) ||
    /^\w+\s+\w+\s*[;=]/.test(plain)
  );
}
