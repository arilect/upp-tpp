import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { TppEditorProvider, TppHtmlContentProvider } from './tppEditor';
import { initHighlighter } from './highlighter';
import { TopicIndex } from './topicIndex';
import { TopicTreeProvider } from './topicTreeProvider';
import { TopicSearchViewProvider } from './topicSearchView';
import { IdeSourceViewProvider, UppsrcOption } from './ideSourceView';
import { searchHeadings, searchFullText } from './topicSearch';
import { showTableOfContents } from './topicToc';
import { resolveTopicUrl } from './topicResolver';

export async function activate(context: vscode.ExtensionContext) {
  console.log('UPP TPP Preview extension is now active');

  // Initialize Shiki highlighter at startup
  try {
    await initHighlighter();
    console.log('Shiki highlighter initialized');
  } catch (err) {
    console.warn('Failed to initialize Shiki highlighter:', err);
  }

  // Build topic index for tree view and search
  const topicIndex = new TopicIndex();
  try {
    await topicIndex.build();
    console.log(`Topic index built: ${topicIndex.getAll().length} topics, ${topicIndex.getAppTppEntries().length} app.tpp entries`);
  } catch (err) {
    console.warn('Failed to build topic index:', err);
  }

  // Register tree data providers (activity bar + explorer)
  const treeProvider = new TopicTreeProvider(topicIndex, context.extensionUri);
  const activityBarRegistration = vscode.window.registerTreeDataProvider('tpp.topicTree', treeProvider);
  const explorerRegistration = vscode.window.registerTreeDataProvider('tpp.explorerTopics', treeProvider);
  context.subscriptions.push(activityBarRegistration, explorerRegistration);

  // Register search input view (activity bar)
  const searchViewProvider = new TopicSearchViewProvider(
    context.extensionUri,
    (text) => treeProvider.setFilter(text),
    (query) => {
      if (query.trim().length >= 2) {
        treeProvider.setFullTextQuery(query);
      } else {
        treeProvider.setFullTextQuery(null);
      }
    },
    () => {
      treeProvider.setFullTextQuery(null);
    },
  );
  const searchViewRegistration = vscode.window.registerWebviewViewProvider(
    TopicSearchViewProvider.viewType,
    searchViewProvider,
    { webviewOptions: { retainContextWhenHidden: true } }
  );
  context.subscriptions.push(searchViewRegistration);

  // Register TheIDE source selector (activity bar)
  const ideSourceProvider = new IdeSourceViewProvider(
    context.extensionUri,
    (dir) => {
      treeProvider.setIdePathFilter(dir);
      context.workspaceState.update('tpp.activeIdePath', dir);
    },
  );
  const ideSourceRegistration = vscode.window.registerWebviewViewProvider(
    IdeSourceViewProvider.viewType,
    ideSourceProvider,
    { webviewOptions: { retainContextWhenHidden: true } }
  );
  context.subscriptions.push(ideSourceRegistration);

  // Send uppsrc/ide options to the webview after index builds
  function sendUppsrcOptions() {
    const options: UppsrcOption[] = topicIndex.getAppTppUppsrcPaths();
    const saved = context.workspaceState.get<string | null>('tpp.activeIdePath', null);
    const selected = saved && options.some(o => o.dir === saved) ? saved : null;
    ideSourceProvider.setOptions(options, selected);
    treeProvider.setIdePathFilter(selected);
  }
  sendUppsrcOptions();

  // File watcher for .tpp files — refresh index and tree on changes
  const tppWatcher = vscode.workspace.createFileSystemWatcher('**/*.tpp');
  tppWatcher.onDidChange(uri => {
    topicIndex.refresh(uri.fsPath);
    treeProvider.refresh();
  });
  tppWatcher.onDidCreate(uri => {
    topicIndex.refresh();
    treeProvider.refresh();
    sendUppsrcOptions();
  });
  tppWatcher.onDidDelete(uri => {
    topicIndex.refresh();
    treeProvider.refresh();
    sendUppsrcOptions();
  });
  context.subscriptions.push(tppWatcher);

  // Register search and TOC commands
  context.subscriptions.push(
    vscode.commands.registerCommand('tpp.searchHeadings', () => searchHeadings(topicIndex)),
    vscode.commands.registerCommand('tpp.searchFullText', () => searchFullText(topicIndex)),
    vscode.commands.registerCommand('tpp.tableOfContents', () => showTableOfContents(topicIndex)),
    vscode.commands.registerCommand('tpp.refreshTree', () => {
      topicIndex.build().then(() => treeProvider.refresh());
    }),
    vscode.commands.registerCommand('tpp.copyTopicPath', (node: any) => {
      if (node && node.filePath) {
        vscode.env.clipboard.writeText(node.filePath);
        vscode.window.showInformationMessage(`Copied: ${node.filePath}`);
      }
    }),
    vscode.commands.registerCommand('tpp.toggleRootSelection', (node: any) => {
      if (node && node.label) {
        treeProvider.toggleRootSelection(node.label);
      }
    }),
    vscode.commands.registerCommand('tpp.openTopicFromTree', async (filePath: string) => {
      const query = treeProvider.getFullTextQuery();
      if (query) {
        TppEditorProvider.pendingSearchQuery = query;
      }
      await vscode.commands.executeCommand('vscode.openWith', vscode.Uri.file(filePath), 'tpp.preview');
    }),
  );

  // Register the custom editor provider
  const editorProvider = new TppEditorProvider(context.extensionUri);
  const editorRegistration = vscode.window.registerCustomEditorProvider(
    TppEditorProvider.viewType,
    editorProvider
  );

  // Register command to open preview
  const openPreviewCommand = vscode.commands.registerCommand(
    'tpp.openPreview',
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showWarningMessage('No active editor');
        return;
      }

      const document = editor.document;
      if (!document.fileName.endsWith('.tpp')) {
        vscode.window.showWarningMessage('Active file is not a .tpp file');
        return;
      }

      // Create and show preview panel
      const panel = vscode.window.createWebviewPanel(
        'tppPreview',
        `Preview: ${document.fileName.split('/').pop()}`,
        vscode.ViewColumn.Beside,
        {
          enableScripts: true,
        }
      );

      // Import and use the parser
      const { tppToHtml } = await import('./tppParser');
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
        shikiTheme: config.get<string>('shikiTheme', 'dark-plus'),
      };
      panel.webview.html = tppToHtml(document.getText(), undefined, options);

      // Handle messages from the webview (topic:// link clicks)
      panel.webview.onDidReceiveMessage(async (message) => {
        if (message.type === 'openTopic' && message.url) {
          try {
            await openTopicUrl(message.url, document, panel.webview);
          } catch (err: any) {
            vscode.window.showWarningMessage(`Failed to open topic: ${err.message || err}`);
          }
        } else if (message.type === 'viewHtmlSource') {
          try {
            const { tppToHtml, preprocessTppImages } = await import('./tppParser');
            const cfg = vscode.workspace.getConfiguration('tpp');
            const opts = {
              fontSize: cfg.get<number>('fontSize', 18),
              fontFamily: cfg.get<string>('fontFamily', "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"),
              codeFontFamily: cfg.get<string>('codeFontFamily', 'Cascadia Code, Fira Code, monospace'),
              lineHeight: cfg.get<number>('lineHeight', 1.6),
              textColor: cfg.get<string>('textColor', '#d4d4d4'),
              backgroundColor: cfg.get<string>('backgroundColor', '#1e1e1e'),
              headingColor: cfg.get<string>('headingColor', '#569cd6'),
              linkColor: cfg.get<string>('linkColor', '#4ec9b0'),
              codeBackground: cfg.get<string>('codeBackground', '#2d2d2d'),
              codeColor: cfg.get<string>('codeColor', '#569cd6'),
              borderColor: cfg.get<string>('borderColor', '#3c3c3c'),
              keywordColor: cfg.get<string>('keywordColor', '#569cd6'),
              paramColor: cfg.get<string>('paramColor', '#ff0000'),
              serifFontFamily: cfg.get<string>('serifFontFamily', 'serif'),
              preprocessorColor: cfg.get<string>('preprocessorColor', '#8000ff'),
              stringColor: cfg.get<string>('stringColor', '#800000'),
              typeColor: cfg.get<string>('typeColor', '#008080'),
              operatorColor: cfg.get<string>('operatorColor', '#0000ff'),
              commentColor: cfg.get<string>('commentColor', '#008000'),
              bgYellow: cfg.get<string>('bgYellow', '#cccc44'),
              bgRed: cfg.get<string>('bgRed', '#ff6666'),
              bgGreen: cfg.get<string>('bgGreen', '#66cc66'),
              bgBlue: cfg.get<string>('bgBlue', '#569cd6'),
              bgMagenta: cfg.get<string>('bgMagenta', '#ff66ff'),
              bgCyan: cfg.get<string>('bgCyan', '#66ffff'),
              bgCustom: cfg.get<string>('bgCustom', '#555555'),
              tableBackgroundColor: cfg.get<string>('tableBackgroundColor', '#712a00'),
              codeFontSize: cfg.get<number>('codeFontSize', 13),
              codeMarginLeft: cfg.get<number>('codeMarginLeft', 64),
              listMarginLeft: cfg.get<number>('listMarginLeft', 45),
              size0: cfg.get<number>('size0', 18),
              size1: cfg.get<number>('size1', 24),
              size2: cfg.get<number>('size2', 30),
              size3: cfg.get<number>('size3', 36),
              size4: cfg.get<number>('size4', 48),
              size5: cfg.get<number>('size5', 60),
              size6: cfg.get<number>('size6', 72),
              size7: cfg.get<number>('size7', 84),
              size8: cfg.get<number>('size8', 108),
              size9: cfg.get<number>('size9', 144),
              codeRenderingMode: cfg.get<'u++' | 'vscode'>('codeRenderingMode', 'vscode'),
              shikiTheme: cfg.get<string>('shikiTheme', 'dark-plus'),
              uppsrcScanMode: cfg.get<string>('uppsrcScanMode', 'varfiles'),
              uppsrcCustomPath: cfg.get<string>('uppsrcCustomPath', ''),
            };
            const rawText = preprocessTppImages(document.uri.fsPath) || document.getText();
            const html = tppToHtml(rawText, undefined, opts);
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
          const cfg = vscode.workspace.getConfiguration('tpp');
          const s = message.settings;
          await cfg.update('fontSize', s.fontSize, vscode.ConfigurationTarget.Global);
          await cfg.update('lineHeight', s.lineHeight, vscode.ConfigurationTarget.Global);
          await cfg.update('fontFamily', s.fontFamily, vscode.ConfigurationTarget.Global);
          await cfg.update('codeFontFamily', s.codeFontFamily, vscode.ConfigurationTarget.Global);
          await cfg.update('textColor', s.textColor, vscode.ConfigurationTarget.Global);
          await cfg.update('backgroundColor', s.backgroundColor, vscode.ConfigurationTarget.Global);
          await cfg.update('headingColor', s.headingColor, vscode.ConfigurationTarget.Global);
          await cfg.update('linkColor', s.linkColor, vscode.ConfigurationTarget.Global);
          await cfg.update('codeBackground', s.codeBackground, vscode.ConfigurationTarget.Global);
          await cfg.update('codeColor', s.codeColor, vscode.ConfigurationTarget.Global);
          await cfg.update('borderColor', s.borderColor, vscode.ConfigurationTarget.Global);
          await cfg.update('keywordColor', s.keywordColor, vscode.ConfigurationTarget.Global);
          await cfg.update('paramColor', s.paramColor, vscode.ConfigurationTarget.Global);
          await cfg.update('serifFontFamily', s.serifFontFamily, vscode.ConfigurationTarget.Global);
          await cfg.update('preprocessorColor', s.preprocessorColor, vscode.ConfigurationTarget.Global);
          await cfg.update('stringColor', s.stringColor, vscode.ConfigurationTarget.Global);
          await cfg.update('typeColor', s.typeColor, vscode.ConfigurationTarget.Global);
          await cfg.update('operatorColor', s.operatorColor, vscode.ConfigurationTarget.Global);
          await cfg.update('commentColor', s.commentColor, vscode.ConfigurationTarget.Global);
          await cfg.update('bgYellow', s.bgYellow, vscode.ConfigurationTarget.Global);
          await cfg.update('bgRed', s.bgRed, vscode.ConfigurationTarget.Global);
          await cfg.update('bgGreen', s.bgGreen, vscode.ConfigurationTarget.Global);
          await cfg.update('bgBlue', s.bgBlue, vscode.ConfigurationTarget.Global);
          await cfg.update('bgMagenta', s.bgMagenta, vscode.ConfigurationTarget.Global);
          await cfg.update('bgCyan', s.bgCyan, vscode.ConfigurationTarget.Global);
          await cfg.update('bgCustom', s.bgCustom, vscode.ConfigurationTarget.Global);
          await cfg.update('tableBackgroundColor', s.tableBackgroundColor, vscode.ConfigurationTarget.Global);
          await cfg.update('codeFontSize', s.codeFontSize, vscode.ConfigurationTarget.Global);
          await cfg.update('codeMarginLeft', s.codeMarginLeft, vscode.ConfigurationTarget.Global);
          await cfg.update('listMarginLeft', s.listMarginLeft, vscode.ConfigurationTarget.Global);
          await cfg.update('size0', s.size0, vscode.ConfigurationTarget.Global);
          await cfg.update('size1', s.size1, vscode.ConfigurationTarget.Global);
          await cfg.update('size2', s.size2, vscode.ConfigurationTarget.Global);
          await cfg.update('size3', s.size3, vscode.ConfigurationTarget.Global);
          await cfg.update('size4', s.size4, vscode.ConfigurationTarget.Global);
          await cfg.update('size5', s.size5, vscode.ConfigurationTarget.Global);
          await cfg.update('size6', s.size6, vscode.ConfigurationTarget.Global);
          await cfg.update('size7', s.size7, vscode.ConfigurationTarget.Global);
          await cfg.update('size8', s.size8, vscode.ConfigurationTarget.Global);
          await cfg.update('size9', s.size9, vscode.ConfigurationTarget.Global);
          await cfg.update('codeRenderingMode', s.codeRenderingMode, vscode.ConfigurationTarget.Global);
          await cfg.update('shikiTheme', s.shikiTheme, vscode.ConfigurationTarget.Global);
          await cfg.update('uppsrcScanMode', s.uppsrcScanMode, vscode.ConfigurationTarget.Global);
          await cfg.update('uppsrcCustomPath', s.uppsrcCustomPath, vscode.ConfigurationTarget.Global);
          const opts = {
            fontSize: cfg.get<number>('fontSize', 18),
            fontFamily: cfg.get<string>('fontFamily', "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"),
            codeFontFamily: cfg.get<string>('codeFontFamily', 'Cascadia Code, Fira Code, monospace'),
            lineHeight: cfg.get<number>('lineHeight', 1.6),
            textColor: cfg.get<string>('textColor', '#d4d4d4'),
            backgroundColor: cfg.get<string>('backgroundColor', '#1e1e1e'),
            headingColor: cfg.get<string>('headingColor', '#569cd6'),
            linkColor: cfg.get<string>('linkColor', '#4ec9b0'),
            codeBackground: cfg.get<string>('codeBackground', '#2d2d2d'),
            codeColor: cfg.get<string>('codeColor', '#569cd6'),
            borderColor: cfg.get<string>('borderColor', '#3c3c3c'),
            keywordColor: cfg.get<string>('keywordColor', '#569cd6'),
            paramColor: cfg.get<string>('paramColor', '#ff0000'),
            serifFontFamily: cfg.get<string>('serifFontFamily', 'serif'),
            preprocessorColor: cfg.get<string>('preprocessorColor', '#8000ff'),
            stringColor: cfg.get<string>('stringColor', '#800000'),
            typeColor: cfg.get<string>('typeColor', '#008080'),
            operatorColor: cfg.get<string>('operatorColor', '#0000ff'),
            commentColor: cfg.get<string>('commentColor', '#008000'),
            bgYellow: cfg.get<string>('bgYellow', '#cccc44'),
            bgRed: cfg.get<string>('bgRed', '#ff6666'),
            bgGreen: cfg.get<string>('bgGreen', '#66cc66'),
            bgBlue: cfg.get<string>('bgBlue', '#569cd6'),
            bgMagenta: cfg.get<string>('bgMagenta', '#ff66ff'),
            bgCyan: cfg.get<string>('bgCyan', '#66ffff'),
            bgCustom: cfg.get<string>('bgCustom', '#555555'),
            tableBackgroundColor: cfg.get<string>('tableBackgroundColor', '#712a00'),
            codeFontSize: cfg.get<number>('codeFontSize', 13),
            codeMarginLeft: cfg.get<number>('codeMarginLeft', 64),
            listMarginLeft: cfg.get<number>('listMarginLeft', 45),
            size0: cfg.get<number>('size0', 18),
            size1: cfg.get<number>('size1', 24),
            size2: cfg.get<number>('size2', 30),
            size3: cfg.get<number>('size3', 36),
            size4: cfg.get<number>('size4', 48),
            size5: cfg.get<number>('size5', 60),
            size6: cfg.get<number>('size6', 72),
            size7: cfg.get<number>('size7', 84),
            size8: cfg.get<number>('size8', 108),
            size9: cfg.get<number>('size9', 144),
            codeRenderingMode: cfg.get<'u++' | 'vscode'>('codeRenderingMode', 'vscode'),
            shikiTheme: cfg.get<string>('shikiTheme', 'dark-plus'),
            uppsrcScanMode: cfg.get<string>('uppsrcScanMode', 'varfiles'),
            uppsrcCustomPath: cfg.get<string>('uppsrcCustomPath', ''),
          };
          panel.webview.html = tppToHtml(document.getText(), undefined, opts);
          // If scan mode changed, rebuild index and refresh tree
          if (s.uppsrcScanMode || s.uppsrcCustomPath) {
            await topicIndex.build();
            treeProvider.refresh();
            sendUppsrcOptions();
          }
        }
      });

      // Update on document changes
      const changeSubscription = vscode.workspace.onDidChangeTextDocument(
        (e) => {
          if (e.document.uri.toString() === document.uri.toString()) {
            panel.webview.html = tppToHtml(e.document.getText(), undefined, options);
          }
        }
      );

      panel.onDidDispose(() => {
        changeSubscription.dispose();
      });
    }
  );

  context.subscriptions.push(editorRegistration, openPreviewCommand);

  // Register the HTML content provider for View Source
  const htmlContentProvider = new TppHtmlContentProvider();
  const htmlRegistration = vscode.workspace.registerTextDocumentContentProvider(
    TppHtmlContentProvider.scheme,
    htmlContentProvider
  );
  context.subscriptions.push(htmlRegistration);
}

async function openTopicUrl(url: string, currentDocument?: vscode.TextDocument, currentWebview?: vscode.Webview): Promise<void> {
  const resolved = resolveTopicUrl(url);
  if (!resolved) {
    vscode.window.showWarningMessage(`Cannot resolve topic URL: ${url}`);
    return;
  }
  const { relativePath, anchor } = resolved;

  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders) {
    vscode.window.showWarningMessage(`No workspace open to resolve topic: ${url}`);
    return;
  }

  const currentFsPath = currentDocument?.uri.fsPath;

  for (const folder of workspaceFolders) {
    const candidates = [
      path.join(folder.uri.fsPath, relativePath),
      path.join(folder.uri.fsPath, 'uppsrc', relativePath),
    ];
    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) {
        if (currentFsPath && path.normalize(candidate) === path.normalize(currentFsPath) && currentWebview && anchor) {
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

  vscode.window.showWarningMessage(`Topic file not found: ${relativePath}`);
}

export function deactivate() {}
