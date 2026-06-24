import type { TppRenderOptions } from './types';
import { escapeHtml } from './escape';
import { generateCss } from './css';
import { generateWebviewJs } from './webviewJs';

export function buildHtmlDocument(
  options: TppRenderOptions | undefined,
  displayTitle: string,
  bodyHtml: string,
  isPublish: boolean
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(displayTitle)}</title>
${generateCss(options, isPublish)}
${generateWebviewJs(isPublish)}
</head>
<body>
  ${isPublish ? '' : `<div id="zoom-controls">
    <button id="zoom-out">-</button>
    <span id="zoom-level">100%</span>
    <button id="zoom-in">+</button>
    <button id="zoom-reset">1:1</button>
    <button id="zoom-fit">Fit</button>
    <button id="scroll-top" title="Scroll to Top">&#8593; Top</button>
    <button id="scroll-bottom" title="Scroll to Bottom">&#8595; Bottom</button>
    <button id="find-toggle" title="Find (Ctrl+F)">&#128269;</button>
    <button id="settings-toggle">&#9881;</button>
  </div>
  <div id="settings-panel">
    <h3>TPP Preview Settings</h3>
    <div class="settings-row">
      <div class="settings-group">
        <label>Font Size (px)</label>
        <input type="number" id="set-fontSize" min="8" max="72" value="${options?.fontSize || 18}">
      </div>
      <div class="settings-group">
        <label>Line Height</label>
        <input type="number" id="set-lineHeight" min="0.8" max="4" step="0.1" value="${options?.lineHeight || 1.6}">
      </div>
      <div class="settings-group">
        <label>Code Highlighting</label>
        <select id="set-codeRenderingMode">
          <option value="vscode"${(options?.codeRenderingMode || 'vscode') === 'vscode' ? ' selected' : ''}>VS Code (Shiki)</option>
          <option value="u++"${options?.codeRenderingMode === 'u++' ? ' selected' : ''}>U++ (QTF)</option>
        </select>
      </div>
    </div>
    <div class="settings-group">
      <label>Font Family</label>
      <input type="text" id="set-fontFamily" value="${(options?.fontFamily || '-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif').replace(/'/g, '')}">
    </div>
    <div class="settings-group">
      <label>Code Font Family</label>
      <input type="text" id="set-codeFontFamily" value="${(options?.codeFontFamily || 'Cascadia Code, Fira Code, monospace').replace(/'/g, '')}">
    </div>
    <div class="settings-row">
      <div class="settings-group">
        <label>Text Color</label>
        <input type="color" id="set-textColor" value="${options?.textColor || '#d4d4d4'}">
      </div>
      <div class="settings-group">
        <label>Background</label>
        <input type="color" id="set-backgroundColor" value="${options?.backgroundColor || '#1e1e1e'}">
      </div>
    </div>
    <div class="settings-row">
      <div class="settings-group">
        <label>Heading Color</label>
        <input type="color" id="set-headingColor" value="${options?.headingColor || '#569cd6'}">
      </div>
      <div class="settings-group">
        <label>Link Color</label>
        <input type="color" id="set-linkColor" value="${options?.linkColor || '#4ec9b0'}">
      </div>
    </div>
    <div class="settings-row">
      <div class="settings-group">
        <label>Code Background</label>
        <input type="color" id="set-codeBackground" value="${options?.codeBackground || '#2d2d2d'}">
      </div>
      <div class="settings-group">
        <label>Code Color</label>
        <input type="color" id="set-codeColor" value="${options?.codeColor || '#569cd6'}">
      </div>
      <div class="settings-group">
        <label>Border Color</label>
        <input type="color" id="set-borderColor" value="${options?.borderColor || '#3c3c3c'}">
      </div>
    </div>
    <div class="settings-row">
      <div class="settings-group">
        <label>Keyword Color</label>
        <input type="color" id="set-keywordColor" value="${options?.keywordColor || '#569cd6'}">
      </div>
      <div class="settings-group">
        <label>Param Color</label>
        <input type="color" id="set-paramColor" value="${options?.paramColor || '#ff0000'}">
      </div>
    </div>
    <div class="settings-row">
      <div class="settings-group">
        <label>Preprocessor Color</label>
        <input type="color" id="set-preprocessorColor" value="${options?.preprocessorColor || '#8000ff'}">
      </div>
      <div class="settings-group">
        <label>String Color</label>
        <input type="color" id="set-stringColor" value="${options?.stringColor || '#800000'}">
      </div>
    </div>
    <div class="settings-row">
      <div class="settings-group">
        <label>Type Color</label>
        <input type="color" id="set-typeColor" value="${options?.typeColor || '#008080'}">
      </div>
      <div class="settings-group">
        <label>Operator Color</label>
        <input type="color" id="set-operatorColor" value="${options?.operatorColor || '#0000ff'}">
      </div>
    </div>
    <div class="settings-row">
      <div class="settings-group">
        <label>Comment Color</label>
        <input type="color" id="set-commentColor" value="${options?.commentColor || '#008000'}">
      </div>
      <div class="settings-group">
        <label>Serif Font</label>
        <input type="text" id="set-serifFontFamily" value="${(options?.serifFontFamily || 'serif').replace(/'/g, '')}">
      </div>
    </div>
    <h3 style="margin-top:16px">Background Colors (QTF)</h3>
    <div class="settings-row">
      <div class="settings-group">
        <label>Table Background</label>
        <input type="color" id="set-tableBackgroundColor" value="${options?.tableBackgroundColor || '#712a00'}">
      </div>
    </div>
    <div class="settings-row">
      <div class="settings-group">
        <label>Yellow</label>
        <input type="color" id="set-bgYellow" value="${options?.bgYellow || '#cccc44'}">
      </div>
      <div class="settings-group">
        <label>Red</label>
        <input type="color" id="set-bgRed" value="${options?.bgRed || '#ff6666'}">
      </div>
      <div class="settings-group">
        <label>Green</label>
        <input type="color" id="set-bgGreen" value="${options?.bgGreen || '#66cc66'}">
      </div>
    </div>
    <div class="settings-row">
      <div class="settings-group">
        <label>Blue</label>
        <input type="color" id="set-bgBlue" value="${options?.bgBlue || '#569cd6'}">
      </div>
      <div class="settings-group">
        <label>Magenta</label>
        <input type="color" id="set-bgMagenta" value="${options?.bgMagenta || '#ff66ff'}">
      </div>
      <div class="settings-group">
        <label>Cyan</label>
        <input type="color" id="set-bgCyan" value="${options?.bgCyan || '#66ffff'}">
      </div>
    </div>
    <div class="settings-row">
      <div class="settings-group">
        <label>Custom</label>
        <input type="color" id="set-bgCustom" value="${options?.bgCustom || '#555555'}">
      </div>
    </div>
    <div class="settings-row">
      <div class="settings-group">
        <label>Code Font Size (px)</label>
        <input type="number" id="set-codeFontSize" min="6" max="48" value="${options?.codeFontSize || 13}">
      </div>
      <div class="settings-group">
        <label>Code Margin Left (px)</label>
        <input type="number" id="set-codeMarginLeft" min="0" max="200" value="${options?.codeMarginLeft || 64}">
      </div>
      <div class="settings-group">
        <label>List Margin (px)</label>
        <input type="number" id="set-listMarginLeft" min="0" max="200" value="${options?.listMarginLeft || 45}">
      </div>
    </div>
    <h3 style="margin-top:16px">Font Sizes (CSS pixels)</h3>
    <div class="settings-row">
      <div class="settings-group">
        <label>s0 (body)</label>
        <input type="number" id="set-size0" min="6" max="600" value="${options?.size0 || 18}">
      </div>
      <div class="settings-group">
        <label>s1</label>
        <input type="number" id="set-size1" min="6" max="600" value="${options?.size1 || 24}">
      </div>
      <div class="settings-group">
        <label>s2</label>
        <input type="number" id="set-size2" min="6" max="600" value="${options?.size2 || 30}">
      </div>
    </div>
    <div class="settings-row">
      <div class="settings-group">
        <label>s3 (title)</label>
        <input type="number" id="set-size3" min="6" max="600" value="${options?.size3 || 36}">
      </div>
      <div class="settings-group">
        <label>s4</label>
        <input type="number" id="set-size4" min="6" max="600" value="${options?.size4 || 48}">
      </div>
      <div class="settings-group">
        <label>s5</label>
        <input type="number" id="set-size5" min="6" max="600" value="${options?.size5 || 60}">
      </div>
    </div>
    <div class="settings-row">
      <div class="settings-group">
        <label>s6</label>
        <input type="number" id="set-size6" min="6" max="600" value="${options?.size6 || 72}">
      </div>
      <div class="settings-group">
        <label>s7</label>
        <input type="number" id="set-size7" min="6" max="600" value="${options?.size7 || 84}">
      </div>
      <div class="settings-group">
        <label>s8</label>
        <input type="number" id="set-size8" min="6" max="600" value="${options?.size8 || 108}">
      </div>
    </div>
    <div class="settings-row">
      <div class="settings-group">
        <label>s9</label>
        <input type="number" id="set-size9" min="6" max="600" value="${options?.size9 || 144}">
      </div>
    </div>
    <h3 style="margin-top:16px">U++ Source Discovery</h3>
    <div class="settings-row">
      <div class="settings-group">
        <label>Scan Mode</label>
        <select id="set-uppsrcScanMode">
          <option value="varfiles"${(options?.uppsrcScanMode || 'varfiles') === 'varfiles' ? ' selected' : ''}>*.var files (~/.config/u++/theide/)</option>
          <option value="home"${options?.uppsrcScanMode === 'home' ? ' selected' : ''}>Scan ~/ recursively</option>
          <option value="custom"${options?.uppsrcScanMode === 'custom' ? ' selected' : ''}>Custom folder</option>
        </select>
      </div>
    </div>
    <div class="settings-row" id="set-uppsrcCustomPath-row" style="display:${(options?.uppsrcScanMode || 'varfiles') === 'custom' ? 'flex' : 'none'}">
      <div class="settings-group" style="flex:1">
        <label>Custom Path</label>
        <input type="text" id="set-uppsrcCustomPath" value="${(options?.uppsrcCustomPath || '').replace(/"/g, '&quot;')}" placeholder="/path/to/uppsrc/roots">
      </div>
    </div>
    <button id="settings-reset">Reset to Defaults</button>
  </div>
  <div id="find-bar">
    <input type="text" id="find-input" placeholder="Find..." autocomplete="off" spellcheck="false">
    <span id="find-count"></span>
    <button id="find-prev" title="Previous (Shift+Enter)">&uarr;</button>
    <button id="find-next" title="Next (Enter)">&darr;</button>
    <button id="find-close" title="Close (Escape)">&times;</button>
  </div>`}
  <div id="zoom-wrapper">
    <h1>${escapeHtml(displayTitle)}</h1>
  ${bodyHtml}
  </div>
  ${options?.scrollToAnchor ? `<script>
    (function() {
      var anchor = ${JSON.stringify(options.scrollToAnchor)};
      var attempts = 0;
      function tryScroll() {
        if (typeof scrollToAnchor === 'function' && scrollToAnchor(anchor)) return;
        if (++attempts < 50) setTimeout(tryScroll, 100);
      }
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', tryScroll);
      } else {
        tryScroll();
      }
    })();
  </script>` : ''}
</body>
</html>`;
}
