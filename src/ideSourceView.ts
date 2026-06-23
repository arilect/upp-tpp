import * as vscode from 'vscode';

export interface UppsrcOption {
  dir: string;
  label: string;
}

export class IdeSourceViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'tpp.ideSource';
  private view?: vscode.WebviewView;
  private pendingOptions?: { options: UppsrcOption[]; selected: string | null };

  constructor(
    private extensionUri: vscode.Uri,
    private onUppsrcChange: (dir: string | null) => void,
  ) {}

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ): void {
    this.view = webviewView;
    webviewView.webview.options = { enableScripts: true };
    webviewView.webview.html = this.getHtml();

    webviewView.webview.onDidReceiveMessage((msg) => {
      if (msg.type === 'uppsrc') {
        this.onUppsrcChange(msg.dir || null);
      }
    });

    webviewView.onDidDispose(() => { this.view = undefined; });

    if (this.pendingOptions) {
      const { options, selected } = this.pendingOptions;
      this.pendingOptions = undefined;
      this.setOptions(options, selected);
    }
  }

  setOptions(options: UppsrcOption[], selected: string | null): void {
    if (this.view) {
      this.view.webview.postMessage({ type: 'uppsrcOptions', options, selected });
    } else {
      this.pendingOptions = { options, selected };
    }
  }

  private getHtml(): string {
    return `<!DOCTYPE html>
<html><head><style>
  body { padding: 6px 10px; margin: 0; }
  select {
    width: 100%; box-sizing: border-box;
    background: var(--vscode-input-background, #3c3c3c);
    color: var(--vscode-input-foreground, #cccccc);
    border: 1px solid var(--vscode-input-border, #3c3c3c);
    padding: 3px 6px; font-size: 12px; outline: none;
    border-radius: 2px; cursor: pointer;
  }
  select:focus { border-color: var(--vscode-focusBorder, #007acc); }
</style></head><body>
  <select id="uppsrc"></select>
  <script>
    var vscode = acquireVsCodeApi();
    var select = document.getElementById('uppsrc');

    select.addEventListener('change', function() {
      vscode.postMessage({ type: 'uppsrc', dir: select.value || null });
    });

    window.addEventListener('message', function(event) {
      var msg = event.data;
      if (msg.type === 'uppsrcOptions') {
        select.innerHTML = '';
        var allOpt = document.createElement('option');
        allOpt.value = '';
        allOpt.textContent = 'All packages';
        select.appendChild(allOpt);
        for (var i = 0; i < msg.options.length; i++) {
          var opt = document.createElement('option');
          opt.value = msg.options[i].dir;
          opt.textContent = msg.options[i].label;
          select.appendChild(opt);
        }
        select.value = msg.selected || '';
      }
    });
  </script>
</body></html>`;
  }
}
