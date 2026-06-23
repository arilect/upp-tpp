import * as vscode from 'vscode';
import * as path from 'path';
import { TopicIndex, TopicEntry, groupDisplayName } from './topicIndex';

interface TopicQuickPickItem extends vscode.QuickPickItem {
  filePath: string;
  entry: TopicEntry;
}

/**
 * Get a context snippet around a match in the body text.
 */
function getContextSnippet(bodyText: string, query: string, maxLength = 120): string {
  const lower = bodyText.toLowerCase();
  const queryLower = query.toLowerCase();
  const idx = lower.indexOf(queryLower);
  if (idx < 0) return bodyText.substring(0, maxLength);

  const start = Math.max(0, idx - 40);
  const end = Math.min(bodyText.length, idx + query.length + 80);
  let snippet = bodyText.substring(start, end).trim();

  // Clean up the snippet
  snippet = snippet.replace(/\s+/g, ' ');
  if (start > 0) snippet = '...' + snippet;
  if (end < bodyText.length) snippet = snippet + '...';

  return snippet;
}

/**
 * Open a topic file in the TPP preview editor.
 */
async function openTopicFile(filePath: string): Promise<void> {
  const uri = vscode.Uri.file(filePath);
  await vscode.commands.executeCommand('vscode.openWith', uri, 'tpp.preview');
}

/**
 * Search topic headings (title + section headings).
 * Uses QuickPick with preview.
 */
export async function searchHeadings(index: TopicIndex): Promise<void> {
  const allEntries = index.getAll();

  if (allEntries.length === 0) {
    vscode.window.showInformationMessage('No topics found. Make sure uppsrc with .tpp files is accessible.');
    return;
  }

  const quickPick = vscode.window.createQuickPick<TopicQuickPickItem>();
  quickPick.placeholder = 'Search topic headings...';
  quickPick.matchOnDescription = true;
  quickPick.matchOnDetail = true;

  // Build initial items from all entries (limited for performance)
  const buildItems = (query: string): TopicQuickPickItem[] => {
    let entries: TopicEntry[];
    if (query.trim()) {
      entries = index.searchHeadings(query);
    } else {
      // Show all when no query — limit to first 200 for performance
      entries = allEntries.slice(0, 200);
    }

    return entries.map(entry => {
      const title = entry.title || path.basename(entry.filePath, '.tpp');
      const groupLabel = groupDisplayName(entry.groupName);
      const description = `${entry.packageName} → ${groupLabel}`;

      // Find matching heading for detail
      let detail = '';
      if (query.trim()) {
        const lower = query.toLowerCase();
        if (entry.title && entry.title.toLowerCase().includes(lower)) {
          detail = entry.title;
        } else {
          for (const heading of entry.headings) {
            if (heading.toLowerCase().includes(lower)) {
              detail = heading;
              break;
            }
          }
        }
      }

      return {
        label: title,
        description,
        detail,
        filePath: entry.filePath,
        entry,
      };
    });
  };

  // Show initial items
  quickPick.items = buildItems('');

  // Update items on type (debounced)
  let debounceTimer: ReturnType<typeof setTimeout> | undefined;
  quickPick.onDidChangeValue(value => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      quickPick.items = buildItems(value);
    }, 150);
  });

  quickPick.onDidAccept(() => {
    const selected = quickPick.selectedItems[0];
    quickPick.dispose();
    if (selected) {
      openTopicFile(selected.filePath);
    }
  });

  quickPick.onDidHide(() => {
    quickPick.dispose();
  });

  quickPick.show();
}

/**
 * Full-text search across topic body text.
 * Uses QuickPick with preview.
 */
export async function searchFullText(index: TopicIndex, initialQuery?: string): Promise<void> {
  const allEntries = index.getAll();

  if (allEntries.length === 0) {
    vscode.window.showInformationMessage('No topics found. Make sure uppsrc with .tpp files is accessible.');
    return;
  }

  const quickPick = vscode.window.createQuickPick<TopicQuickPickItem>();
  quickPick.placeholder = 'Full-text search across all topics...';
  quickPick.matchOnDescription = true;
  quickPick.matchOnDetail = true;

  const buildItems = (query: string): TopicQuickPickItem[] => {
    if (!query.trim()) return [];

    const entries = index.searchFullText(query);

    return entries.map(entry => {
      const title = entry.title || path.basename(entry.filePath, '.tpp');
      const groupLabel = groupDisplayName(entry.groupName);
      const description = `${entry.packageName} → ${groupLabel}`;
      const detail = getContextSnippet(entry.bodyText, query);

      return {
        label: title,
        description,
        detail,
        filePath: entry.filePath,
        entry,
      };
    });
  };

  quickPick.items = buildItems(initialQuery || '');

  if (initialQuery) {
    quickPick.value = initialQuery;
  }

  let debounceTimer: ReturnType<typeof setTimeout> | undefined;
  quickPick.onDidChangeValue(value => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      quickPick.items = buildItems(value);
    }, 200);
  });

  quickPick.onDidAccept(() => {
    const selected = quickPick.selectedItems[0];
    quickPick.dispose();
    if (selected) {
      openTopicFile(selected.filePath);
    }
  });

  quickPick.onDidHide(() => {
    quickPick.dispose();
  });

  quickPick.show();
}
