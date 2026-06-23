import * as vscode from 'vscode';
import * as path from 'path';
import { TopicIndex, TopicEntry, groupDisplayName } from './topicIndex';

interface TocQuickPickItem extends vscode.QuickPickItem {
  filePath: string;
}

/**
 * Show a Table of Contents for all topics.
 * Uses QuickPick with type-to-filter (like Go to File).
 */
export async function showTableOfContents(index: TopicIndex): Promise<void> {
  const allEntries = index.getAll();
  const appEntries = index.getAppTppEntries();

  if (allEntries.length === 0 && appEntries.length === 0) {
    vscode.window.showInformationMessage('No topics found. Make sure uppsrc with .tpp files is accessible.');
    return;
  }

  // Build items grouped by category
  const items: TocQuickPickItem[] = [];

  // TheIDE help topics
  if (appEntries.length > 0) {
    items.push({
      label: '$(book) TheIDE help',
      description: '',
      kind: vscode.QuickPickItemKind.Separator,
      filePath: '',
    });
    for (const entry of appEntries) {
      items.push({
        label: entry.title || path.basename(entry.filePath, '.tpp'),
        description: `App Topics`,
        filePath: entry.filePath,
      });
    }
  }

  // Group all entries by package
  const packageMap = new Map<string, TopicEntry[]>();
  for (const entry of allEntries) {
    const existing = packageMap.get(entry.packageName) || [];
    existing.push(entry);
    packageMap.set(entry.packageName, existing);
  }

  // Sort packages alphabetically
  const sortedPackages = [...packageMap.keys()].sort();

  for (const packageName of sortedPackages) {
    const entries = packageMap.get(packageName)!;

    // Separator for this package
    items.push({
      label: `$(package) ${packageName}`,
      description: '',
      kind: vscode.QuickPickItemKind.Separator,
      filePath: '',
    });

    // Group entries by group within this package
    const groupMap = new Map<string, TopicEntry[]>();
    for (const entry of entries) {
      const existing = groupMap.get(entry.groupName) || [];
      existing.push(entry);
      groupMap.set(entry.groupName, existing);
    }

    // Sort groups by standard order
    const sortedGroups = [...groupMap.keys()].sort((a, b) => {
      const order: Record<string, number> = { srcdoc: 0, src: 1, srcimp: 2 };
      return (order[a] ?? 3) - (order[b] ?? 3);
    });

    for (const groupName of sortedGroups) {
      const groupEntries = groupMap.get(groupName)!;
      const groupLabel = groupDisplayName(groupName);

      for (const entry of groupEntries) {
        const title = entry.title || path.basename(entry.filePath, '.tpp');
        items.push({
          label: title,
          description: `${groupLabel}`,
          filePath: entry.filePath,
        });
      }
    }
  }

  const quickPick = vscode.window.createQuickPick<TocQuickPickItem>();
  quickPick.placeholder = 'Navigate to a topic...';
  quickPick.items = items;
  quickPick.matchOnDescription = true;

  quickPick.onDidAccept(() => {
    const selected = quickPick.selectedItems[0];
    quickPick.dispose();
    if (selected && selected.filePath) {
      const uri = vscode.Uri.file(selected.filePath);
      vscode.commands.executeCommand('vscode.openWith', uri, 'tpp.preview');
    }
  });

  quickPick.onDidHide(() => {
    quickPick.dispose();
  });

  quickPick.show();
}
