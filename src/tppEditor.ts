import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { tppToHtml, preprocessTppImages } from './tppParser';
import { resolveTopicUrl } from './topicResolver';

export class TppEditorProvider implements vscode.CustomTextEditorProvider {
  public static readonly viewType = 'tpp.preview';
  public static pendingAnchor: string | undefined;
  public static pendingSearchQuery: string | undefined;

  constructor(private readonly extensionUri: vscode.Uri) {}

  public async resolveCustomTextEditor(
    document: vscode.TextDocument,
    webviewPanel: vscode.WebviewPanel,
    _token: vscode.CancellationToken
  ): Promise<void> {
    webviewPanel.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.extensionUri],
    };

    // Check for pending anchor from topic link navigation
    const pendingAnchor = TppEditorProvider.pendingAnchor;
    TppEditorProvider.pendingAnchor = undefined;

    // Check for pending search query from tree full text search
    const pendingSearchQuery = TppEditorProvider.pendingSearchQuery;
    TppEditorProvider.pendingSearchQuery = undefined;

    const content = preprocessTppImages(document.uri.fsPath) || document.getText();
    webviewPanel.webview.html = this.getHtmlForWebview(
      webviewPanel.webview,
      content,
      pendingAnchor
    );

    // Backup: send scrollToAnchor after webview loads (in case startup script fails)
    if (pendingAnchor) {
      setTimeout(() => {
        webviewPanel.webview.postMessage({ type: 'scrollToAnchor', anchor: pendingAnchor });
      }, 300);
    }

    // Send search query to webview to fill find bar and highlight
    if (pendingSearchQuery) {
      setTimeout(() => {
        webviewPanel.webview.postMessage({ type: 'searchQuery', query: pendingSearchQuery });
      }, 500);
    }

    // Handle messages from the webview (e.g. topic:// link clicks)
    webviewPanel.webview.onDidReceiveMessage(async (message) => {
      if (message.type === 'openTopic' && message.url) {
        try {
          await this.openTopicUrl(message.url, document, webviewPanel.webview);
        } catch (err: any) {
          vscode.window.showWarningMessage(`Failed to open topic: ${err.message || err}`);
        }
      } else if (message.type === 'viewHtmlSource') {
        try {
          const content = preprocessTppImages(document.uri.fsPath) || document.getText();
          const html = this.getHtmlForWebview(webviewPanel.webview, content);
          const uri = vscode.Uri.parse(`${TppHtmlContentProvider.scheme}:html-source`);
          TppHtmlContentProvider.setContent(uri, html);
          const doc = await vscode.workspace.openTextDocument(uri);
          const editor = await vscode.window.showTextDocument(doc, { viewColumn: vscode.ViewColumn.Beside });
          const anchorText = message.anchorText || '';
          if (anchorText) {
            const htmlLines = html.split('\n');
            const searchStr = anchorText.substring(0, 80);
            let foundLine = -1;
            for (let i = 0; i < htmlLines.length; i++) {
              const stripped = htmlLines[i].replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
              if (stripped.includes(searchStr)) {
                foundLine = i;
                break;
              }
            }
              if (foundLine >= 0) {
                const line = Math.min(foundLine, doc.lineCount - 1);
                const pos = new vscode.Position(line, 0);
                editor.selection = new vscode.Selection(pos, pos);
                setTimeout(() => {
                  editor.revealRange(new vscode.Range(pos, pos), vscode.TextEditorRevealType.InCenter);
                }, 500);
              }
          }
        } catch (err: any) {
          vscode.window.showWarningMessage(`View HTML Source failed: ${err.message || err}`);
        }
      } else if (message.type === 'viewTppSource') {
        try {
          let tppDoc = document;
          if (document.isClosed) {
            const found = vscode.workspace.textDocuments.find(d => d.uri.toString() === document.uri.toString());
            if (found) tppDoc = found;
          }
          const sourceText = tppDoc.getText();
          const anchorText = message.anchorText || '';
          let line = 0;
          if (anchorText) {
            const lines = sourceText.split('\n');
            const searchStr = anchorText.substring(0, 80);
            for (let i = 0; i < lines.length; i++) {
              if (lines[i].includes(searchStr)) {
                line = i;
                break;
              }
            }
          }
          const doc = await vscode.workspace.openTextDocument(tppDoc.uri);
          const editor = await vscode.window.showTextDocument(doc, { viewColumn: vscode.ViewColumn.Beside });
          const pos = new vscode.Position(line, 0);
          editor.selection = new vscode.Selection(pos, pos);
          editor.revealRange(new vscode.Range(pos, pos), vscode.TextEditorRevealType.InCenter);
        } catch (err: any) {
          vscode.window.showWarningMessage(`View TPP Source failed: ${err.message || err}`);
        }
      } else if (message.type === 'saveSettings' && message.settings) {
        const config = vscode.workspace.getConfiguration('tpp');
        const s = message.settings;
        await config.update('fontSize', s.fontSize, vscode.ConfigurationTarget.Global);
        await config.update('lineHeight', s.lineHeight, vscode.ConfigurationTarget.Global);
        await config.update('fontFamily', s.fontFamily, vscode.ConfigurationTarget.Global);
        await config.update('codeFontFamily', s.codeFontFamily, vscode.ConfigurationTarget.Global);
        await config.update('textColor', s.textColor, vscode.ConfigurationTarget.Global);
        await config.update('backgroundColor', s.backgroundColor, vscode.ConfigurationTarget.Global);
        await config.update('headingColor', s.headingColor, vscode.ConfigurationTarget.Global);
        await config.update('linkColor', s.linkColor, vscode.ConfigurationTarget.Global);
        await config.update('codeBackground', s.codeBackground, vscode.ConfigurationTarget.Global);
        await config.update('codeColor', s.codeColor, vscode.ConfigurationTarget.Global);
        await config.update('borderColor', s.borderColor, vscode.ConfigurationTarget.Global);
        await config.update('keywordColor', s.keywordColor, vscode.ConfigurationTarget.Global);
        await config.update('paramColor', s.paramColor, vscode.ConfigurationTarget.Global);
        await config.update('serifFontFamily', s.serifFontFamily, vscode.ConfigurationTarget.Global);
        await config.update('preprocessorColor', s.preprocessorColor, vscode.ConfigurationTarget.Global);
        await config.update('stringColor', s.stringColor, vscode.ConfigurationTarget.Global);
        await config.update('typeColor', s.typeColor, vscode.ConfigurationTarget.Global);
        await config.update('operatorColor', s.operatorColor, vscode.ConfigurationTarget.Global);
        await config.update('commentColor', s.commentColor, vscode.ConfigurationTarget.Global);
        await config.update('tableBackgroundColor', s.tableBackgroundColor, vscode.ConfigurationTarget.Global);
        await config.update('codeFontSize', s.codeFontSize, vscode.ConfigurationTarget.Global);
        await config.update('codeMarginLeft', s.codeMarginLeft, vscode.ConfigurationTarget.Global);
        await config.update('listMarginLeft', s.listMarginLeft, vscode.ConfigurationTarget.Global);
        await config.update('size0', s.size0, vscode.ConfigurationTarget.Global);
        await config.update('size1', s.size1, vscode.ConfigurationTarget.Global);
        await config.update('size2', s.size2, vscode.ConfigurationTarget.Global);
        await config.update('size3', s.size3, vscode.ConfigurationTarget.Global);
        await config.update('size4', s.size4, vscode.ConfigurationTarget.Global);
        await config.update('size5', s.size5, vscode.ConfigurationTarget.Global);
        await config.update('size6', s.size6, vscode.ConfigurationTarget.Global);
        await config.update('size7', s.size7, vscode.ConfigurationTarget.Global);
        await config.update('size8', s.size8, vscode.ConfigurationTarget.Global);
        await config.update('size9', s.size9, vscode.ConfigurationTarget.Global);
        await config.update('codeRenderingMode', s.codeRenderingMode, vscode.ConfigurationTarget.Global);
        await config.update('uppsrcScanMode', s.uppsrcScanMode, vscode.ConfigurationTarget.Global);
        await config.update('uppsrcCustomPath', s.uppsrcCustomPath, vscode.ConfigurationTarget.Global);
        const content = preprocessTppImages(document.uri.fsPath) || document.getText();
        webviewPanel.webview.html = this.getHtmlForWebview(
          webviewPanel.webview,
          content
        );
      }
    });

    // Update content when document changes
    const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument(
      (e) => {
        if (e.document.uri.toString() === document.uri.toString()) {
          const content = preprocessTppImages(document.uri.fsPath) || e.document.getText();
          webviewPanel.webview.html = this.getHtmlForWebview(
            webviewPanel.webview,
            content
          );
        }
      }
    );

    webviewPanel.onDidDispose(() => {
      changeDocumentSubscription.dispose();
    });
  }

  private async openTopicUrl(url: string, currentDocument: vscode.TextDocument, currentWebview?: vscode.Webview): Promise<void> {
    const resolved = resolveTopicUrl(url);
    if (!resolved) {
      vscode.window.showWarningMessage(`Cannot resolve topic URL: ${url}`);
      return;
    }
    const { relativePath, anchor } = resolved;

    // Try to find the file: first relative to current document, then workspace folders
    const currentDir = path.dirname(currentDocument.uri.fsPath);
    const currentFsPath = currentDocument.uri.fsPath;

    // Search relative to current document's location (walk up to find uppsrc)
    let searchDir = currentDir;
    for (let depth = 0; depth < 10; depth++) {
      const candidates = [
        path.join(searchDir, relativePath),
        path.join(searchDir, 'uppsrc', relativePath),
      ];
      for (const candidate of candidates) {
        if (fs.existsSync(candidate)) {
          // Same file: scroll in-place
          if (path.normalize(candidate) === path.normalize(currentFsPath) && currentWebview && anchor) {
            currentWebview.postMessage({ type: 'scrollToAnchor', anchor });
            return;
          }
          const uri = vscode.Uri.file(candidate);
          if (anchor) TppEditorProvider.pendingAnchor = anchor;
          await vscode.commands.executeCommand('vscode.openWith', uri, TppEditorProvider.viewType);
          return;
        }
      }
      const parentDir = path.dirname(searchDir);
      if (parentDir === searchDir) break;
      searchDir = parentDir;
    }

    // Fallback: search workspace folders
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders) {
      for (const folder of workspaceFolders) {
        const candidates = [
          path.join(folder.uri.fsPath, relativePath),
          path.join(folder.uri.fsPath, 'uppsrc', relativePath),
        ];
        for (const candidate of candidates) {
          if (fs.existsSync(candidate)) {
            if (path.normalize(candidate) === path.normalize(currentFsPath) && currentWebview && anchor) {
              currentWebview.postMessage({ type: 'scrollToAnchor', anchor });
              return;
            }
            const uri = vscode.Uri.file(candidate);
            if (anchor) TppEditorProvider.pendingAnchor = anchor;
            await vscode.commands.executeCommand('vscode.openWith', uri, TppEditorProvider.viewType);
            return;
          }
        }
      }
    }

    vscode.window.showWarningMessage(`Topic file not found: ${relativePath}`);
  }

  private getHtmlForWebview(webview: vscode.Webview, content: string, scrollToAnchor?: string): string {
    const config = vscode.workspace.getConfiguration('tpp');
    const options = {
      fontSize: config.get<number>('fontSize', 18),
      fontFamily: config.get<string>('fontFamily', "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"),
      codeFontFamily: config.get<string>('codeFontFamily', 'Cascadia Code, Fira Code, monospace'),
      lineHeight: config.get<number>('lineHeight', 1.6),
      textColor: config.get<string>('textColor', '#d4d4d4'),
      backgroundColor: config.get<string>('backgroundColor', '#1e1e1e'),
      headingColor: config.get<string>('headingColor', '#569cd6'),
      linkColor: config.get<string>('linkColor', '#4ec9b0'),
      codeBackground: config.get<string>('codeBackground', '#2d2d2d'),
      codeColor: config.get<string>('codeColor', '#569cd6'),
      borderColor: config.get<string>('borderColor', '#3c3c3c'),
      keywordColor: config.get<string>('keywordColor', '#569cd6'),
      paramColor: config.get<string>('paramColor', '#ff0000'),
      serifFontFamily: config.get<string>('serifFontFamily', 'serif'),
      preprocessorColor: config.get<string>('preprocessorColor', '#8000ff'),
      stringColor: config.get<string>('stringColor', '#800000'),
      typeColor: config.get<string>('typeColor', '#008080'),
      operatorColor: config.get<string>('operatorColor', '#0000ff'),
      commentColor: config.get<string>('commentColor', '#008000'),
      bgYellow: config.get<string>('bgYellow', '#cccc44'),
      bgRed: config.get<string>('bgRed', '#ff6666'),
      bgGreen: config.get<string>('bgGreen', '#66cc66'),
      bgBlue: config.get<string>('bgBlue', '#569cd6'),
      bgMagenta: config.get<string>('bgMagenta', '#ff66ff'),
      bgCyan: config.get<string>('bgCyan', '#66ffff'),
      bgCustom: config.get<string>('bgCustom', '#555555'),
      tableBackgroundColor: config.get<string>('tableBackgroundColor', '#712a00'),
      codeFontSize: config.get<number>('codeFontSize', 13),
      codeMarginLeft: config.get<number>('codeMarginLeft', 64),
      listMarginLeft: config.get<number>('listMarginLeft', 45),
      publishMode: config.get<boolean>('publishMode', false),
      size0: config.get<number>('size0', 18),
      size1: config.get<number>('size1', 24),
      size2: config.get<number>('size2', 30),
      size3: config.get<number>('size3', 36),
      size4: config.get<number>('size4', 48),
      size5: config.get<number>('size5', 60),
      size6: config.get<number>('size6', 72),
      size7: config.get<number>('size7', 84),
      size8: config.get<number>('size8', 108),
      size9: config.get<number>('size9', 144),
      codeRenderingMode: config.get<'u++' | 'vscode'>('codeRenderingMode', 'vscode'),
      uppsrcScanMode: config.get<string>('uppsrcScanMode', 'varfiles'),
      uppsrcCustomPath: config.get<string>('uppsrcCustomPath', ''),
      scrollToAnchor,
    };
    return tppToHtml(content, undefined, options);
  }
}

export class TppHtmlContentProvider implements vscode.TextDocumentContentProvider {
  public static scheme = 'tpp-html';
  private static contentMap = new Map<string, string>();

  static setContent(uri: vscode.Uri, content: string) {
    this.contentMap.set(uri.toString(), content);
  }

  provideTextDocumentContent(uri: vscode.Uri): string {
    const content = TppHtmlContentProvider.contentMap.get(uri.toString()) || '';
    TppHtmlContentProvider.contentMap.delete(uri.toString());
    return content;
  }
}
