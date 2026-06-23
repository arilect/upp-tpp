import type { TppRenderOptions } from './types';

export function generateCss(options: TppRenderOptions | undefined, isPublish: boolean): string {
  return `  <style>
    :root {
      --tpp-font-family: ${options?.fontFamily || "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"};
      --tpp-font-size: ${options?.fontSize || 18}px;
      --tpp-line-height: ${options?.lineHeight || 1.6};
      --tpp-text-color: ${options?.textColor || '#d4d4d4'};
      --tpp-bg-color: ${options?.backgroundColor || '#1e1e1e'};
      --tpp-heading-color: ${options?.headingColor || '#569cd6'};
      --tpp-link-color: ${options?.linkColor || '#4ec9b0'};
      --tpp-code-bg: ${options?.codeBackground || '#2d2d2d'};
      --tpp-code-color: ${options?.codeColor || '#569cd6'};
      --tpp-border-color: ${options?.borderColor || '#3c3c3c'};
      --tpp-code-font: ${options?.codeFontFamily || 'Cascadia Code, Fira Code, monospace'};
      --tpp-keyword-color: ${options?.keywordColor || '#569cd6'};
      --tpp-param-color: ${options?.paramColor || '#ff0000'};
      --tpp-preprocessor-color: ${options?.preprocessorColor || '#8000ff'};
      --tpp-string-color: ${options?.stringColor || '#800000'};
      --tpp-type-color: ${options?.typeColor || '#008080'};
      --tpp-operator-color: ${options?.operatorColor || '#0000ff'};
      --tpp-comment-color: ${options?.commentColor || '#008000'};
      --tpp-serif-font: ${options?.serifFontFamily || 'serif'};
      --tpp-bg-yellow: ${options?.bgYellow || '#cccc44'};
      --tpp-bg-red: ${options?.bgRed || '#ff6666'};
      --tpp-bg-green: ${options?.bgGreen || '#66cc66'};
      --tpp-bg-blue: ${options?.bgBlue || '#569cd6'};
      --tpp-bg-magenta: ${options?.bgMagenta || '#ff66ff'};
      --tpp-bg-cyan: ${options?.bgCyan || '#66ffff'};
      --tpp-bg-custom: ${options?.bgCustom || '#555555'};
      --tpp-code-font-size: ${options?.codeFontSize || 13}px;
      --tpp-code-margin-left: ${options?.codeMarginLeft || 64}px;
      --tpp-list-margin-left: ${options?.listMarginLeft || 45}px;
      --tpp-space-small: ${Math.round((options?.fontSize || 18) * 0.44)}px;
      --tpp-space-medium: ${Math.round((options?.fontSize || 18) * 0.89)}px;
      --tpp-space-large: ${Math.round((options?.fontSize || 18) * 1.78)}px;
    }
    body {
      font-family: var(--tpp-font-family);
      font-size: var(--tpp-font-size);
      line-height: var(--tpp-line-height);
      color: var(--tpp-text-color);
      background: var(--tpp-bg-color);
      padding: 20px;
      margin: 0 auto;
      overflow-wrap: break-word;
      word-wrap: break-word;
      tab-size: 4;
    }
    h1 {
      font-size: 1.2em;
      color: var(--tpp-heading-color);
      border-bottom: 1px solid var(--tpp-border-color);
      padding-bottom: 10px;
    }
    p {
      margin: 0.5em 0;
      line-height: 1.6;
    }
    br {
      content: '';
      display: block;
      margin-bottom: 0.3em;
    }
    a {
      color: var(--tpp-link-color);
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
    }
    .topic-link {
      cursor: pointer;
    }
    img {
      max-width: 100%;
      height: auto;
      display: block;
      margin: 0.5em 0;
    }
    code {
      background: var(--tpp-code-bg);
      padding: 2px 6px;
      border-radius: 3px;
      font-family: var(--tpp-code-font);
    }
    pre {
      background: var(--tpp-code-bg);
      padding: 12px;
      border-radius: 6px;
      overflow-wrap: break-word;
      word-wrap: break-word;
      white-space: pre-wrap;
    }
    table {
      border-collapse: collapse;
      margin: 1em 0;
      table-layout: fixed;
      width: 100%;
      overflow-wrap: break-word;
    }
    td, th {
      border: 1px solid var(--tpp-border-color);
      padding: 8px 12px;
      text-align: left;
      overflow-wrap: break-word;
      word-wrap: break-word;
    }
    th {
      background: var(--tpp-code-bg);
    }
    .tpp-hr { border: none; border-top: 1px solid var(--tpp-border-color); margin: 4px 0; }
    .tpp-hr-thin { border: none; border-top: 1px solid var(--tpp-border-color); margin: 2px 0; }
    .tpp-table { border: 1px solid var(--tpp-border-color); width: 100%; margin: 12px 0; border-radius: 4px; border-collapse: collapse; }
    .tpp-table-colored { background: var(--tpp-table-bg); border: 1px solid var(--tpp-table-bg); }
    .tpp-table td { padding: 8px 12px; vertical-align: top; border-bottom: 1px solid var(--tpp-border-color); }
    .tpp-table-colored td { border-bottom-color: rgba(0,0,0,0.15); }
    .tpp-table-cell-key { padding: 8px 12px; font-family:var(--tpp-code-font); font-size:var(--tpp-code-font-size); font-weight: bold; white-space: nowrap; background: var(--tpp-table-bg); color: #000; }
    .tpp-table-cell-desc { padding: 8px 12px; background: var(--tpp-table-bg); color: #000; }
    .shiki-wrapper { margin: 0.5em 0; border-radius: 6px; overflow: hidden; }
    .shiki-wrapper pre.shiki { background-color: var(--tpp-code-bg) !important; margin: 0; padding: 0 12px 12px 0; border-radius: 6px; overflow-wrap: break-word; word-wrap: break-word; white-space: pre-wrap; }
    a.l1 { text-decoration:none; font-size: 8pt; font-family: sans-serif; font-weight: normal; }
    a.l1:link { color:var(--tpp-link-color); }
    a.l1:visited { color:#bb88cc; }
    a.l1:hover { color:#9933CC; }
    a.l1:active { color:var(--tpp-link-color); }
    a.l2 { text-decoration:none; font-size: 12pt; font-family: sans-serif; font-variant: small-caps; }
    a.l2:link { color:var(--tpp-link-color); }
    a.l2:visited { color:#cc8844; }
    a.l2:hover { color:#BC0624; }
    a.l2:active { color:var(--tpp-link-color); }
    .A { margin:0; text-indent:0; text-align:left; color:var(--tpp-text-color); font-family:var(--tpp-font-family); font-size:var(--tpp-font-size); font-weight:normal; font-style:normal; }
    .B { font-size:1.2em; }
    .C { margin:var(--tpp-space-medium) 0 var(--tpp-space-large) 0; text-indent:0; text-align:left; color:var(--tpp-heading-color); font-family:var(--tpp-serif-font); font-size:2.4em; font-weight:bold; font-style:normal; }
    .D { margin:var(--tpp-space-small) 0; text-indent:0; text-align:left; color:var(--tpp-text-color); font-family:var(--tpp-font-family); font-size:var(--tpp-font-size); font-weight:normal; font-style:normal; line-height:var(--tpp-line-height); }
    .E { font-weight:bold; }
    .F { margin:var(--tpp-space-large) 0 0 0; text-indent:0; text-align:left; color:var(--tpp-heading-color); font-family:var(--tpp-font-family); font-size:1.6em; font-weight:bold; font-style:normal; }
    .G { margin:var(--tpp-space-large) 0 0 0; text-indent:0; text-align:left; color:var(--tpp-heading-color); font-family:var(--tpp-font-family); font-size:1.2em; font-weight:bold; font-style:normal; }
    .H { margin:var(--tpp-space-small) 0; text-indent:0; text-align:center; color:var(--tpp-text-color); font-family:var(--tpp-font-family); font-size:var(--tpp-font-size); font-weight:normal; font-style:normal; }
    .I { display:list-item; list-style-type:disc; margin:var(--tpp-space-small) 0 var(--tpp-space-small) var(--tpp-list-margin-left); text-indent:0; text-align:left; color:var(--tpp-text-color); font-family:var(--tpp-font-family); font-size:var(--tpp-font-size); font-weight:normal; font-style:normal; line-height:var(--tpp-line-height); }
    .J { margin:0 0 0 var(--tpp-code-margin-left); text-indent:0; text-align:left; color:var(--tpp-operator-color); font-family:var(--tpp-code-font); font-size:var(--tpp-code-font-size); font-weight:normal; font-style:normal; white-space:pre-wrap; word-wrap:break-word; }
    .K { color:var(--tpp-preprocessor-color); }
    .L { color:var(--tpp-text-color); }
    .M { margin:0 0 0 var(--tpp-code-margin-left); text-indent:0; text-align:left; color:var(--tpp-text-color); font-family:var(--tpp-code-font); font-size:var(--tpp-code-font-size); font-weight:normal; font-style:normal; white-space:pre-wrap; word-wrap:break-word; }
    .N { color:var(--tpp-keyword-color); font-weight:bold; }
    .O { color:var(--tpp-string-color); }
    .P { margin:0 0 0 var(--tpp-code-margin-left); text-indent:0; text-align:left; color:var(--tpp-operator-color); font-family:var(--tpp-code-font); font-size:var(--tpp-code-font-size); font-weight:normal; font-style:normal; white-space:pre-wrap; word-wrap:break-word; }
    .Q { font-weight:bold; font-style:italic; }
    .R { color:var(--tpp-operator-color); }
    .S { margin:0 0 0 var(--tpp-code-margin-left); text-indent:0; text-align:left; color:var(--tpp-text-color); font-family:var(--tpp-code-font); font-size:var(--tpp-code-font-size); font-weight:bold; font-style:normal; white-space:pre-wrap; word-wrap:break-word; }
    .T { font-weight:normal; }
    .U { margin:var(--tpp-space-small) 44px var(--tpp-space-small) 57px; text-indent:0; text-align:center; color:var(--tpp-text-color); font-family:var(--tpp-font-family); font-size:var(--tpp-font-size); font-weight:normal; font-style:normal; line-height:var(--tpp-line-height); }
    .V { color:var(--tpp-type-color); }
    .W { margin:0 0 0 var(--tpp-code-margin-left); text-indent:0; text-align:left; color:var(--tpp-text-color); font-family:var(--tpp-font-family); font-size:var(--tpp-code-font-size); font-weight:normal; font-style:normal; white-space:pre-wrap; word-wrap:break-word; }
    .X { margin:0 0 0 var(--tpp-code-margin-left); text-indent:0; text-align:left; color:var(--tpp-keyword-color); font-family:var(--tpp-code-font); font-size:var(--tpp-code-font-size); font-weight:bold; font-style:normal; white-space:pre-wrap; word-wrap:break-word; }
    .Y { color:var(--tpp-text-color); font-weight:normal; }
    .Z { margin:var(--tpp-space-small) 0; text-indent:0; text-align:left; color:var(--tpp-text-color); font-family:var(--tpp-font-family); font-size:var(--tpp-font-size); font-weight:normal; font-style:italic; line-height:var(--tpp-line-height); }
    .AA { margin:0; text-indent:0; text-align:left; color:var(--tpp-operator-color); font-family:var(--tpp-code-font); font-size:var(--tpp-code-font-size); font-weight:normal; font-style:normal; white-space:pre-wrap; word-wrap:break-word; }
    .AB { font-style:italic; }
    .AC { margin:var(--tpp-space-small) 0; text-indent:0; text-align:center; color:var(--tpp-text-color); font-family:var(--tpp-font-family); font-size:var(--tpp-font-size); font-weight:normal; font-style:normal; line-height:var(--tpp-line-height); }
    .AD { margin:0; text-indent:0; text-align:center; color:var(--tpp-keyword-color); font-family:var(--tpp-font-family); font-size:var(--tpp-font-size); font-weight:bold; font-style:normal; }
    .AE { color:var(--tpp-operator-color); font-weight:bold; }
    .AF { margin:0 0 0 var(--tpp-code-margin-left); text-indent:0; text-align:left; color:var(--tpp-comment-color); font-family:var(--tpp-code-font); font-size:var(--tpp-code-font-size); font-weight:normal; font-style:italic; white-space:pre-wrap; word-wrap:break-word; }
    .AG { color:var(--tpp-text-color); font-style:normal; }
    .AH { color:var(--tpp-keyword-color); font-weight:bold; font-style:normal; }
    .AI { color:var(--tpp-text-color); font-weight:bold; font-style:normal; }
    .AJ { color:var(--tpp-type-color); font-weight:bold; font-style:normal; }
    .AK { color:var(--tpp-keyword-color); font-style:normal; }
    .AL { color:var(--tpp-string-color); font-style:normal; }
    .AM { color:var(--tpp-string-color); font-weight:bold; }
    .AN { color:var(--tpp-type-color); font-weight:bold; }
    .AO { color:var(--tpp-operator-color); }
    .AP { margin:var(--tpp-space-small) 0; text-indent:0; text-align:left; color:var(--tpp-text-color); font-family:var(--tpp-font-family); font-size:var(--tpp-font-size); font-weight:bold; font-style:normal; line-height:var(--tpp-line-height); }
    .AQ { margin:var(--tpp-space-small) 0 var(--tpp-space-small) var(--tpp-code-margin-left); text-indent:0; text-align:left; color:var(--tpp-text-color); font-family:var(--tpp-font-family); font-size:var(--tpp-font-size); font-weight:normal; font-style:normal; line-height:var(--tpp-line-height); }
    .AR { display:list-item; list-style-type:disc; margin:var(--tpp-space-small) 0 var(--tpp-space-small) calc(var(--tpp-list-margin-left) + 7px); text-indent:0; text-align:left; color:var(--tpp-text-color); font-family:var(--tpp-font-family); font-size:var(--tpp-font-size); font-weight:normal; font-style:normal; line-height:var(--tpp-line-height); }
    .AS { color:var(--tpp-preprocessor-color); font-weight:bold; }
    .AT { margin:0 0 0 var(--tpp-code-margin-left); text-indent:0; text-align:left; color:var(--tpp-comment-color); font-family:var(--tpp-code-font); font-size:var(--tpp-code-font-size); font-weight:normal; font-style:normal; }
    .AU { margin:0 0 0 var(--tpp-code-margin-left); text-indent:0; text-align:left; color:var(--tpp-comment-color); font-family:var(--tpp-code-font); font-size:var(--tpp-code-font-size); font-weight:normal; font-style:italic; }
    .AV { margin:0 0 0 var(--tpp-code-margin-left); text-indent:0; text-align:left; color:var(--tpp-text-color); font-family:var(--tpp-code-font); font-size:var(--tpp-code-font-size); font-weight:normal; font-style:normal; }
    .AW { margin:0 0 0 var(--tpp-code-margin-left); text-indent:0; text-align:left; color:var(--tpp-keyword-color); font-family:var(--tpp-code-font); font-size:var(--tpp-code-font-size); font-weight:normal; font-style:normal; }
    .AX { margin:0 0 0 var(--tpp-code-margin-left); text-indent:0; text-align:left; color:var(--tpp-text-color); font-family:var(--tpp-code-font); font-size:var(--tpp-code-font-size); font-weight:bold; font-style:normal; }
    .AY { margin:0 0 0 var(--tpp-code-margin-left); text-indent:0; text-align:left; color:var(--tpp-text-color); font-family:var(--tpp-code-font); font-size:6px; font-weight:normal; font-style:normal; }
    .AZ { margin:0 0 0 var(--tpp-code-margin-left); text-indent:0; text-align:left; color:var(--tpp-keyword-color); font-family:var(--tpp-code-font); font-size:var(--tpp-code-font-size); font-weight:bold; font-style:normal; }
    .BA { margin:0 0 0 var(--tpp-code-margin-left); text-indent:0; text-align:left; color:var(--tpp-text-color); font-family:var(--tpp-font-family); font-size:var(--tpp-font-size); font-weight:normal; font-style:normal; }
    .bgDefault { background-color:var(--tpp-bg-color); color:var(--tpp-text-color); padding:1px 4px; border-radius:2px; }
    .bgWhite { background-color:#ffffff; color:#000000; padding:1px 4px; border-radius:2px; }
    .bgYellow { background-color:var(--tpp-bg-yellow,#cccc44); color:#000000; padding:1px 4px; border-radius:2px; }
    .bgRed { background-color:var(--tpp-bg-red,#ff6666); color:#000000; padding:1px 4px; border-radius:2px; }
    .bgGreen { background-color:var(--tpp-bg-green,#66cc66); color:#000000; padding:1px 4px; border-radius:2px; }
    .bgBlue { background-color:var(--tpp-bg-blue,#569cd6); color:#000000; padding:1px 4px; border-radius:2px; }
    .bgMagenta { background-color:var(--tpp-bg-magenta,#ff66ff); color:#000000; padding:1px 4px; border-radius:2px; }
    .bgCyan { background-color:var(--tpp-bg-cyan,#66ffff); color:#000000; padding:1px 4px; border-radius:2px; }
    .bgCustom { background-color:var(--tpp-bg-custom,#555555); color:#000000; padding:1px 4px; border-radius:2px; }
    .bgYellowMono { background-color:var(--tpp-bg-yellow,#cccc44); color:#000000; font-family:var(--tpp-code-font); font-size:var(--tpp-code-font-size); padding:1px 4px; border-radius:2px; white-space:pre-wrap; word-wrap:break-word; }
    .bgWhiteMono { background-color:#ffffff; color:#000000; font-family:var(--tpp-code-font); font-size:var(--tpp-code-font-size); padding:1px 4px; border-radius:2px; white-space:pre-wrap; word-wrap:break-word; }
    .bgYellowFg { background-color:var(--tpp-bg-yellow,#cccc44); color:#000000; padding:1px 4px; border-radius:2px; }
    .bgWhiteFg { background-color:#ffffff; color:#000000; padding:1px 4px; border-radius:2px; }
    ${isPublish ? '' : `
    #zoom-controls {
      position: fixed;
      top: 8px;
      right: 8px;
      z-index: 100;
      display: flex;
      gap: 4px;
      background: rgba(45, 45, 45, 0.9);
      border-radius: 4px;
      padding: 4px;
    }
    #zoom-controls button {
      background: #3c3c3c;
      border: 1px solid #555;
      color: #ccc;
      cursor: pointer;
      padding: 4px 8px;
      border-radius: 3px;
      font-size: 12px;
      min-width: 28px;
      text-align: center;
    }
    #zoom-controls button:hover {
      background: #505050;
      color: #fff;
    }
    #zoom-level {
      color: #ccc;
      font-size: 12px;
      padding: 4px 6px;
      min-width: 40px;
      text-align: center;
    }
    #zoom-wrapper {
      transform-origin: 0 0;
    }
    #settings-panel {
      display: none;
      position: fixed;
      top: 44px;
      right: 8px;
      z-index: 200;
      background: #252526;
      border: 1px solid #3c3c3c;
      border-radius: 6px;
      padding: 16px;
      width: 320px;
      max-height: 80vh;
      overflow-y: auto;
      box-shadow: 0 4px 16px rgba(0,0,0,0.4);
    }
    #settings-panel.open { display: block; }
    #settings-panel h3 {
      margin: 0 0 12px 0;
      font-size: 14px;
      color: #ccc;
    }
    .settings-group {
      margin-bottom: 12px;
    }
    .settings-group label {
      display: block;
      font-size: 11px;
      color: #999;
      margin-bottom: 4px;
    }
    .settings-group input[type="number"],
    .settings-group input[type="text"],
    .settings-group input[type="color"],
    .settings-group select {
      width: 100%;
      box-sizing: border-box;
      background: #3c3c3c;
      border: 1px solid #555;
      color: #ccc;
      padding: 5px 8px;
      border-radius: 3px;
      font-size: 12px;
    }
    .settings-group input[type="color"] {
      height: 30px;
      padding: 2px;
      cursor: pointer;
    }
    .settings-row {
      display: flex;
      gap: 8px;
    }
    .settings-row .settings-group {
      flex: 1;
    }
    #settings-reset {
      width: 100%;
      margin-top: 8px;
      background: #3c3c3c;
      border: 1px solid #555;
      color: #ccc;
      padding: 6px;
      border-radius: 3px;
      cursor: pointer;
      font-size: 12px;
    }
    #settings-reset:hover { background: #505050; color: #fff; }
    #find-bar {
      display: none;
      position: fixed;
      top: 40px;
      right: 8px;
      z-index: 300;
      background: #252526;
      border: 1px solid #3c3c3c;
      border-radius: 6px;
      padding: 6px 8px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.4);
      align-items: center;
      gap: 4px;
    }
    #find-bar.open { display: flex; }
    #find-input {
      background: #3c3c3c;
      border: 1px solid #555;
      color: #ccc;
      padding: 4px 8px;
      border-radius: 3px;
      font-size: 13px;
      width: 200px;
      outline: none;
    }
    #find-input:focus { border-color: #007acc; }
    #find-count {
      color: #999;
      font-size: 12px;
      min-width: 60px;
      text-align: center;
      user-select: none;
    }
    #find-bar button {
      background: #3c3c3c;
      border: 1px solid #555;
      color: #ccc;
      cursor: pointer;
      padding: 4px 6px;
      border-radius: 3px;
      font-size: 12px;
      min-width: 26px;
      text-align: center;
    }
    #find-bar button:hover { background: #505050; color: #fff; }
    #find-bar button:disabled { opacity: 0.4; cursor: default; }
    .find-match { background: #613214; border-radius: 2px; }
    .find-match.current { background: #264f78; }
    `}
  </style>`;
}
