import * as vscode from 'vscode';

export class TopicSearchViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'tpp.topicSearch';
  private view?: vscode.WebviewView;

  constructor(
    private extensionUri: vscode.Uri,
    private onFilterChange: (text: string) => void,
    private onFullTextSearch: (query: string) => void,
    private onFullTextClear: () => void,
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
      if (msg.type === 'filter') {
        this.onFilterChange(msg.text || '');
      } else if (msg.type === 'fulltext') {
        this.onFullTextSearch(msg.text || '');
      } else if (msg.type === 'fulltext-clear') {
        this.onFullTextClear();
      }
    });

    webviewView.onDidDispose(() => { this.view = undefined; });
  }

  setFilter(text: string): void {
    if (this.view) {
      this.view.webview.postMessage({ type: 'setFilter', text });
    }
  }

  private getHtml(): string {
    return `<!DOCTYPE html>
<html><head><style>
  body { padding: 6px 10px; margin: 0; }
  .search-row { margin-bottom: 4px; }
  .search-row label {
    display: block; font-size: 10px; color: var(--vscode-foreground);
    margin-bottom: 2px; opacity: 0.7; text-transform: uppercase; letter-spacing: 0.5px;
  }
  input {
    width: 100%; box-sizing: border-box;
    background: var(--vscode-input-background, #3c3c3c);
    color: var(--vscode-input-foreground, #cccccc);
    border: 1px solid var(--vscode-input-border, #3c3c3c);
    padding: 3px 6px; font-size: 12px; outline: none;
    border-radius: 2px;
  }
  input:focus { border-color: var(--vscode-focusBorder, #007acc); }
  input::placeholder { color: var(--vscode-input-placeholderForeground, #999); }
</style></head><body>
  <div class="search-row">
    <label>Filter headings</label>
    <input type="text" id="filter" placeholder="Filter tree..." autocomplete="off" spellcheck="false">
  </div>
  <div class="search-row">
    <label>Full text search (Enter to search, Esc to clear)</label>
    <input type="text" id="fulltext" placeholder="Type and press Enter..." autocomplete="off" spellcheck="false">
  </div>
  <script>
    var vscode = acquireVsCodeApi();
    var filterInput = document.getElementById('filter');
    var fulltextInput = document.getElementById('fulltext');
    var filterTimer = null;

    filterInput.addEventListener('input', function() {
      clearTimeout(filterTimer);
      filterTimer = setTimeout(function() {
        vscode.postMessage({ type: 'filter', text: filterInput.value });
      }, 100);
    });

    fulltextInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        vscode.postMessage({ type: 'fulltext', text: fulltextInput.value });
      } else if (e.key === 'Escape') {
        e.preventDefault();
        fulltextInput.value = '';
        vscode.postMessage({ type: 'fulltext-clear' });
      }
    });

    window.addEventListener('message', function(event) {
      var msg = event.data;
      if (msg.type === 'setFilter') {
        filterInput.value = msg.text;
      }
    });
  </script>
</body></html>`;
  }
}
