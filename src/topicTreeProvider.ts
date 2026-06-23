import * as vscode from 'vscode';
import * as path from 'path';
import { TopicIndex, TopicEntry, groupDisplayName } from './topicIndex';

// ── Tree node types ──────────────────────────────────────────────────

export type TppTreeNode = TppRootNode | TppPackageNode | TppGroupNode | TppTopicNode;

export interface TppRootNode {
  kind: 'root';
  label: string;
  icon: string;
  isChecked: boolean;
}

export interface TppPackageNode {
  kind: 'package';
  name: string;
  isUsed: boolean;
}

export interface TppGroupNode {
  kind: 'group';
  packageName: string;
  groupName: string;
  label: string;
  isUsed: boolean;
}

export interface TppTopicNode {
  kind: 'topic';
  filePath: string;
  title: string;
  packageName: string;
  groupName: string;
}

// ── Helpers ──────────────────────────────────────────────────────────

function nodeLabel(node: TppTreeNode): string {
  switch (node.kind) {
    case 'root': return node.label;
    case 'package': return node.name;
    case 'group': return node.label;
    case 'topic': return node.title;
  }
}

// ── Tree item adapter ────────────────────────────────────────────────

class TppTreeItem extends vscode.TreeItem {
  constructor(
    public readonly node: TppTreeNode,
    collapsibleState: vscode.TreeItemCollapsibleState,
    extensionUri?: vscode.Uri,
  ) {
    super(nodeLabel(node), collapsibleState);

    switch (node.kind) {
      case 'root':
        if (extensionUri) {
          const iconFile = node.isChecked ? 'checkbox-checked.svg' : 'checkbox-unchecked.svg';
          this.iconPath = vscode.Uri.joinPath(extensionUri, 'media', iconFile);
        }
        this.contextValue = 'tppRoot';
        break;

      case 'package':
        this.iconPath = new vscode.ThemeIcon('package');
        this.contextValue = 'tppPackage';
        break;

      case 'group':
        this.iconPath = new vscode.ThemeIcon('folder');
        this.contextValue = 'tppGroup';
        break;

      case 'topic':
        this.iconPath = new vscode.ThemeIcon('file-text');
        this.contextValue = 'tppTopic';
        this.resourceUri = vscode.Uri.file(node.filePath);
        this.tooltip = node.filePath;
        this.description = node.packageName;
        this.command = {
          command: 'tpp.openTopicFromTree',
          title: 'Open Topic',
          arguments: [node.filePath],
        };
        break;
    }
  }
}

// ── Tree data provider ───────────────────────────────────────────────

export class TopicTreeProvider implements vscode.TreeDataProvider<TppTreeNode> {
  private _onDidChangeTreeData = new vscode.EventEmitter<TppTreeNode | undefined | null | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private rootNodes: TppRootNode[] = [];
  private filterText = '';
  private idePathFilter: string | null = null;
  private selectedRoots = new Set<string>(['Used packages']);
  private fullTextQuery: string | null = null;
  private fullTextMatchedPackages = new Set<string>();
  private fullTextMatchedGroups = new Set<string>();
  private fullTextMatchedTopics = new Set<string>();
  private filterMatchedPackages = new Set<string>();
  private filterMatchedGroups = new Set<string>();

  constructor(private index: TopicIndex, private extensionUri: vscode.Uri) {}

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  setFilter(text: string): void {
    this.filterText = text.toLowerCase().trim();
    this.filterMatchedPackages.clear();
    this.filterMatchedGroups.clear();
    if (this.filterText) {
      for (const entry of this.index.getAll()) {
        const title = (entry.title || path.basename(entry.filePath, '.tpp')).toLowerCase();
        if (title.includes(this.filterText)) {
          this.filterMatchedPackages.add(entry.packageName);
          this.filterMatchedGroups.add(entry.packageName + '\0' + entry.groupName);
        }
      }
    }
    this._onDidChangeTreeData.fire();
  }

  getFilter(): string {
    return this.filterText;
  }

  setIdePathFilter(dir: string | null): void {
    this.idePathFilter = dir;
    this._onDidChangeTreeData.fire();
  }

  getIdePathFilter(): string | null {
    return this.idePathFilter;
  }

  toggleRootSelection(label: string): void {
    if (this.selectedRoots.has(label)) {
      this.selectedRoots.delete(label);
    } else {
      this.selectedRoots.add(label);
    }
    this._onDidChangeTreeData.fire();
  }

  isRootSelected(label: string): boolean {
    return this.selectedRoots.has(label);
  }

  getSelectedRoots(): Set<string> {
    return new Set(this.selectedRoots);
  }

  setFullTextQuery(query: string | null): void {
    this.fullTextQuery = query;
    this.fullTextMatchedPackages.clear();
    this.fullTextMatchedGroups.clear();
    this.fullTextMatchedTopics.clear();
    if (query && query.trim()) {
      const entries = this.index.searchFullText(query);
      for (const e of entries) {
        if (this.filterText) {
          const title = (e.title || path.basename(e.filePath, '.tpp')).toLowerCase();
          const matches = title.includes(this.filterText)
            || e.packageName.toLowerCase().includes(this.filterText)
            || e.groupName.toLowerCase().includes(this.filterText);
          if (!matches) continue;
        }
        this.fullTextMatchedPackages.add(e.packageName);
        this.fullTextMatchedGroups.add(e.packageName + '\0' + e.groupName);
        this.fullTextMatchedTopics.add(e.filePath);
      }
    }
    this._onDidChangeTreeData.fire();
  }

  getFullTextQuery(): string | null {
    return this.fullTextQuery;
  }

  getTreeItem(element: TppTreeNode): vscode.TreeItem {
    const item = new TppTreeItem(
      element,
      element.kind === 'topic'
        ? vscode.TreeItemCollapsibleState.None
        : vscode.TreeItemCollapsibleState.Expanded,
      this.extensionUri,
    );

    if (element.kind === 'root') {
      item.command = {
        command: 'tpp.toggleRootSelection',
        title: 'Toggle Selection',
        arguments: [element],
      };
    }

    return item;
  }

  getChildren(element?: TppTreeNode): TppTreeNode[] {
    if (!element) {
      return this.getRootNodes();
    }

    switch (element.kind) {
      case 'root': {
        const children = this.getChildrenForRoot(element);
        return this.filterNodes(children);
      }
      case 'package': {
        const children = this.getChildrenForPackage(element);
        if (this.filterText) {
          return this.filterNodes(children);
        }
        return children;
      }
      case 'group': {
        const children = this.getChildrenForGroup(element);
        return this.filterNodes(children);
      }
      default:
        return [];
    }
  }

  private matchesFilter(node: TppTreeNode): boolean {
    if (!this.filterText) return true;
    const q = this.filterText;
    switch (node.kind) {
      case 'topic':
        return node.title.toLowerCase().includes(q)
          || node.packageName.toLowerCase().includes(q)
          || node.groupName.toLowerCase().includes(q);
      case 'package':
        return node.name.toLowerCase().includes(q)
          || this.filterMatchedPackages.has(node.name);
      case 'group':
        return node.label.toLowerCase().includes(q)
          || node.packageName.toLowerCase().includes(q)
          || this.filterMatchedGroups.has(node.packageName + '\0' + node.groupName);
      case 'root':
        return true;
    }
  }

  private filterNodes(nodes: TppTreeNode[]): TppTreeNode[] {
    if (!this.filterText) return nodes;
    return nodes.filter(n => this.matchesFilter(n));
  }

  getParent(element: TppTreeNode): TppTreeNode | undefined {
    // Not strictly needed for basic functionality but useful for reveal()
    return undefined;
  }

  // ── Root nodes ───────────────────────────────────────────────────

  private getRootNodes(): TppRootNode[] {
    const nodes: TppRootNode[] = [];

    // 1. TheIDE help (app.tpp topics) — always first
    nodes.push({
      kind: 'root',
      label: 'TheIDE help',
      icon: 'book',
      isChecked: this.selectedRoots.has('TheIDE help'),
    });

    // 2. Used packages (packages with .tpp in workspace)
    const workspacePackageNames = this.getWorkspacePackageNames();
    const allPackageNames = this.index.getPackageNames();

    const usedPackages = allPackageNames.filter(name => workspacePackageNames.has(name));
    const otherPackages = allPackageNames.filter(name => !workspacePackageNames.has(name));

    if (usedPackages.length > 0) {
      nodes.push({
        kind: 'root',
        label: 'Used packages',
        icon: 'briefcase',
        isChecked: this.selectedRoots.has('Used packages'),
      });
    }

    if (otherPackages.length > 0) {
      nodes.push({
        kind: 'root',
        label: 'Other packages',
        icon: 'archive',
        isChecked: this.selectedRoots.has('Other packages'),
      });
    }

    this.rootNodes = nodes;
    return nodes;
  }

  // ── Children of root nodes ───────────────────────────────────────

  private getChildrenForRoot(root: TppRootNode): TppTreeNode[] {
    if (!this.selectedRoots.has(root.label)) return [];

    switch (root.label) {
      case 'TheIDE help':
        return this.getAppTppNodes();

      case 'Used packages': {
        const nodes = this.getPackageNodes(true);
        return this.fullTextQuery
          ? nodes.filter(n => this.fullTextMatchedPackages.has(n.name))
          : nodes;
      }

      case 'Other packages': {
        const nodes = this.getPackageNodes(false);
        return this.fullTextQuery
          ? nodes.filter(n => this.fullTextMatchedPackages.has(n.name))
          : nodes;
      }

      default:
        return [];
    }
  }

  /**
   * Get app.tpp topics as tree nodes.
   * These are listed directly under "TheIDE help" without package/group hierarchy.
   */
  private getAppTppNodes(): TppTopicNode[] {
    let entries: TopicEntry[];

    if (this.idePathFilter) {
      entries = this.index.getAppTppRawEntries().filter(e => {
        const normalized = e.filePath.replace(/\\/g, '/');
        return normalized.startsWith(this.idePathFilter! + '/');
      });
    } else {
      entries = this.index.getAppTppEntries();
    }

    if (this.fullTextQuery) {
      entries = entries.filter(e => this.fullTextMatchedTopics.has(e.filePath));
    }

    return entries.map(entry => ({
      kind: 'topic' as const,
      filePath: entry.filePath,
      title: entry.title || path.basename(entry.filePath, '.tpp'),
      packageName: entry.packageName,
      groupName: entry.groupName,
    }));
  }

  /**
   * Get package nodes for "Used packages" or "Other packages".
   */
  private getPackageNodes(used: boolean): TppPackageNode[] {
    const workspacePackageNames = this.getWorkspacePackageNames();
    const allPackageNames = this.index.getPackageNames();

    const packages = used
      ? allPackageNames.filter(name => workspacePackageNames.has(name))
      : allPackageNames.filter(name => !workspacePackageNames.has(name));

    return packages.map(name => ({
      kind: 'package' as const,
      name,
      isUsed: used,
    }));
  }

  // ── Children of package nodes ────────────────────────────────────

  private getChildrenForPackage(pkg: TppPackageNode): TppGroupNode[] {
    let groupNames = this.index.getGroupNames(pkg.name);
    if (this.fullTextQuery) {
      groupNames = groupNames.filter(gn => this.fullTextMatchedGroups.has(pkg.name + '\0' + gn));
    }
    return groupNames.map(groupName => ({
      kind: 'group' as const,
      packageName: pkg.name,
      groupName,
      label: groupDisplayName(groupName),
      isUsed: pkg.isUsed,
    }));
  }

  // ── Children of group nodes ──────────────────────────────────────

  private getChildrenForGroup(group: TppGroupNode): TppTopicNode[] {
    let entries = this.index.getGroupEntries(group.packageName, group.groupName);
    if (group.isUsed) {
      const assembly = this.index.getMatchedAssembly();
      if (assembly && assembly.nests.length > 0) {
        const nestPrefixes = assembly.nests.map(n => n.replace(/\\/g, '/'));
        entries = entries.filter(e => {
          const normalized = e.filePath.replace(/\\/g, '/');
          return nestPrefixes.some(n => normalized.startsWith(n + '/') || normalized.startsWith(n));
        });
      }
    }
    if (this.fullTextQuery) {
      entries = entries.filter(e => this.fullTextMatchedTopics.has(e.filePath));
    }
    return entries.map(entry => ({
      kind: 'topic' as const,
      filePath: entry.filePath,
      title: entry.title || path.basename(entry.filePath, '.tpp'),
      packageName: entry.packageName,
      groupName: entry.groupName,
    }));
  }

  // ── Workspace detection ──────────────────────────────────────────

  /**
   * Determine which packages are "used" — from the matched assembly's .upp files.
   */
  private getWorkspacePackageNames(): Set<string> {
    return this.index.getUsedPackageNames();
  }
}
