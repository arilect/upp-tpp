import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// ── Assembly / .var / .upp types ─────────────────────────────────────

export interface Assembly {
  name: string;
  filePath: string;
  nests: string[];
}

export interface PackageMeta {
  name: string;
  nestDir: string;
  uppFile: string;
  uses: string[];
  description?: string;
  isMain: boolean;
}

function stripComments(content: string): string {
  return content
    .replace(/\/\/.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '');
}

export function parseAssembly(varPath: string): Assembly {
  const name = path.basename(varPath, '.var');
  const nests: string[] = [];
  if (!fs.existsSync(varPath)) return { name, filePath: varPath, nests };
  const content = fs.readFileSync(varPath, 'utf8');
  const kvPattern = /^(\w+)\s*=\s*"([^"]*)"\s*;/gm;
  let m: RegExpExecArray | null;
  while ((m = kvPattern.exec(content)) !== null) {
    if (m[1] === 'UPP') {
      nests.push(...m[2].split(';').map(s => s.trim()).filter(Boolean));
    }
  }
  return { name, filePath: varPath, nests };
}

export function findAssemblies(varDir?: string): Assembly[] {
  const searchDirs = varDir?.trim()
    ? [varDir.trim()]
    : [
        path.join(os.homedir(), '.config', 'u++', 'theide'),
        path.join(os.homedir(), '.upp', 'theide'),
        path.join(os.homedir(), '.upp', 'umk'),
      ];
  const results: Assembly[] = [];
  const seen = new Set<string>();
  for (const dir of searchDirs) {
    if (!fs.existsSync(dir)) continue;
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isFile() || !entry.name.endsWith('.var')) continue;
        const name = path.basename(entry.name, '.var');
        if (seen.has(name)) continue;
        seen.add(name);
        results.push(parseAssembly(path.join(dir, entry.name)));
      }
    } catch {}
  }
  return results;
}

export function parseUppFile(uppFilePath: string): PackageMeta {
  const leaf = path.basename(uppFilePath, '.upp');
  const pkgDir = path.dirname(uppFilePath);
  const meta: PackageMeta = { name: leaf, nestDir: '', uppFile: uppFilePath, uses: [], isMain: false };
  if (!fs.existsSync(uppFilePath)) return meta;
  const content = stripComments(fs.readFileSync(uppFilePath, 'utf8'));
  const usesMatch = content.match(/\buses\b([\s\S]*?);/);
  if (usesMatch) {
    meta.uses.push(
      ...usesMatch[1].split(/[\s,]+/).map(s => s.trim()).filter(s => s.length > 0 && !s.startsWith('//'))
    );
  }
  meta.isMain = /\bmainconfig\b/.test(content);
  const descMatch = content.match(/description\s+"(.+?)\\377[^"]*";/);
  if (descMatch) meta.description = descMatch[1];
  return meta;
}

export function findPackagesInAssembly(assembly: Assembly): PackageMeta[] {
  const results: PackageMeta[] = [];
  for (const nest of assembly.nests) {
    if (!fs.existsSync(nest)) continue;
    try {
      const topEntries = fs.readdirSync(nest, { withFileTypes: true });
      for (const top of topEntries) {
        if (!top.isDirectory()) continue;
        const topPath = path.join(nest, top.name);
        const directUpp = path.join(topPath, `${top.name}.upp`);
        if (fs.existsSync(directUpp)) {
          const meta = parseUppFile(directUpp);
          meta.name = top.name;
          meta.nestDir = nest;
          results.push(meta);
          continue;
        }
        try {
          const subEntries = fs.readdirSync(topPath, { withFileTypes: true });
          for (const sub of subEntries) {
            if (!sub.isDirectory()) continue;
            const subUpp = path.join(topPath, sub.name, `${sub.name}.upp`);
            if (fs.existsSync(subUpp)) {
              const meta = parseUppFile(subUpp);
              meta.name = `${top.name}/${sub.name}`;
              meta.nestDir = nest;
              results.push(meta);
            }
          }
        } catch {}
      }
    } catch {}
  }
  return results;
}

export function findMatchingAssembly(
  assemblies: Assembly[],
  workspaceFolders: readonly vscode.WorkspaceFolder[]
): Assembly | null {
  for (const folder of workspaceFolders) {
    const folderPath = folder.uri.fsPath.replace(/\\/g, '/');
    for (const assembly of assemblies) {
      for (const nest of assembly.nests) {
        const normalizedNest = nest.replace(/\\/g, '/');
        if (folderPath.startsWith(normalizedNest + '/') || folderPath === normalizedNest) {
          return assembly;
        }
      }
    }
  }
  return null;
}

export interface TopicEntry {
  filePath: string;
  packageName: string;
  groupName: string;
  title: string | null;
  bodyText: string;
  headings: string[];
  uppsrcDir: string;
}

export interface TopicIndexEntry extends TopicEntry {
  /** Relative path from uppsrc root */
  relativePath: string;
}

/**
 * Extract topic title from QTF content: topic "Title"
 */
function extractTitle(content: string): string | null {
  const match = content.match(/^topic\s+"([^"]+)"/m);
  return match ? match[1] : null;
}

/**
 * Strip QTF formatting to plain text for full-text search.
 * Simplified version focused on extracting readable text.
 */
function stripQtfFormatting(content: string): string {
  let result = '';
  let i = 0;
  while (i < content.length) {
    const ch = content[i];
    if (ch === '[') {
      let depth = 1;
      let j = i + 1;
      while (j < content.length && depth > 0) {
        if (content[j] === '`' && j + 1 < content.length) { j += 2; continue; }
        if (content[j] === '[') depth++;
        if (content[j] === ']') depth--;
        j++;
      }
      if (depth === 0) {
        const inner = content.substring(i + 1, j - 1);
        // Skip style definitions: [identifier $$row,col#hash:name]
        if (/\$\$\d+,\d+#/.test(inner)) { i = j; continue; }
        // Skip to content after first space at depth 0
        let spaceIdx = -1;
        let pd = 0;
        for (let k = 0; k < inner.length; k++) {
          if (inner[k] === '(' || inner[k] === '[') pd++;
          else if (inner[k] === ')' || inner[k] === ']') pd--;
          if (inner[k] === ' ' && pd <= 0) { spaceIdx = k; break; }
        }
        if (spaceIdx >= 0) {
          result += stripQtfFormatting(inner.substring(spaceIdx + 1));
        }
        i = j;
      } else {
        i++;
      }
    } else if (ch === '`' && i + 1 < content.length) {
      const next = content[i + 1];
      if (next === '+') result += '+';
      else if (next === '_') result += '_';
      else if (next === '$') result += '\t';
      else if (next === ':') result += ':';
      else if (next === '-') result += '-';
      else result += next;
      i += 2;
    } else if (ch === '-' && i + 1 < content.length && content[i + 1] === '|') {
      result += '\t';
      i += 2;
    } else if (ch === '_') {
      result += '\u00A0';
      i++;
    } else if (ch === '&' || ch === '{' || ch === '}') {
      i++;
    } else if (ch === '\n' || ch === '\r') {
      let eolLen = 1;
      if (ch === '\r' && i + 1 < content.length && content[i + 1] === '\n') eolLen = 2;
      i += eolLen;
    } else if (ch === '@' && i + 1 < content.length && content[i + 1] === '@') {
      // Skip @@image:... raw image data
      i += 2;
      while (i < content.length && /[a-zA-Z0-9_]/.test(content[i])) i++;
      if (i < content.length && content[i] === ':') i++;
      while (i < content.length && /[0-9&*]/.test(content[i])) i++;
      while (i < content.length && (content[i] === ' ' || content[i] === '\n' || content[i] === '\r' || content[i] === '\t')) i++;
      if (i < content.length && content[i] === '(') {
        i++;
        while (i < content.length && content[i] !== ')') i++;
        if (i < content.length) i++;
      }
    } else if (ch === '@') {
      i++;
    } else {
      result += ch;
      i++;
    }
  }
  return result;
}

/**
 * Extract section headings from QTF body text.
 * Looks for paragraphs that would render as headings (classes C, F, G):
 * - Labels matching section numbers: 1, 1_1, 14.1, 2_3_1
 * - Bold text with large font sizes
 * - Paragraph styles with ruler height (H prefix)
 */
function extractHeadings(bodyText: string): string[] {
  const headings: string[] = [];
  const lines = bodyText.split('\n');

  for (const line of lines) {
    // Match paragraph format blocks: [format content&]
    const paraMatch = line.match(/^\[([^\]]*?)(?:\s+([\s\S]*?))?&\]$/);
    if (!paraMatch) continue;

    const formatPart = paraMatch[1];
    const contentPart = paraMatch[2] || '';

    // Skip style definitions
    if (/\$\$\d+,\d+#/.test(formatPart)) continue;

    let isHeading = false;

    // Check for section-number labels: [s1;:1_1: ...] or [s1;:14.1: ...]
    const labelMatch = formatPart.match(/:(\d+(?:[_.]\d+)*)[:\s]/);
    if (labelMatch) {
      isHeading = true;
    }

    // Check for explicit heading styles (large font or bold)
    const fontSizeMatch = formatPart.match(/F\((\d+)\)/);
    if (fontSizeMatch) {
      const size = parseInt(fontSizeMatch[1]);
      if (size >= 30) isHeading = true;
    }

    // Check for ruler/separator headings (H prefix in format)
    if (/H\d+/.test(formatPart)) {
      isHeading = true;
    }

    // Check for style macros that indicate headings: [{C}, [{F}, [{G
    if (/\{[CFG]\}/.test(formatPart)) {
      isHeading = true;
    }

    if (isHeading && contentPart) {
      // Strip inline QTF from heading text
      let headingText = contentPart
        .replace(/\[[^\]]*\]/g, '') // remove inline blocks
        .replace(/`([+_$:~-])/g, '$1') // unescape
        .replace(/_/g, ' ') // underscores to spaces
        .replace(/&$/, '') // trailing paragraph break
        .trim();
      if (headingText.length > 0 && headingText.length < 200) {
        headings.push(headingText);
      }
    }
  }

  return headings;
}

/**
 * Derive package name and group name from a .tpp file path.
 * Expected path patterns:
 *   .../uppsrc/PackageName/src.tpp/Topic_en-us.tpp  → { packageName: "PackageName", groupName: "src" }
 *   .../uppsrc/PackageName/srcdoc.tpp/Foo_en-us.tpp → { packageName: "PackageName", groupName: "srcdoc" }
 *   .../uppsrc/plugin/PluginName/src.tpp/Bar_en-us.tpp → { packageName: "plugin/PluginName", groupName: "src" }
 */
function parseTppPath(filePath: string): { packageName: string; groupName: string } | null {
  // Normalize path separators
  const normalized = filePath.replace(/\\/g, '/');

  // Find the last occurrence of a .tpp directory (group directory)
  const tppDirRegex = /\/([^/]+\.tpp)\//;
  const match = normalized.match(tppDirRegex);
  if (!match) return null;

  const groupDirName = match[1]; // e.g., "src.tpp", "srcdoc.tpp", "srcimp.tpp"
  const groupName = groupDirName.replace(/\.tpp$/, ''); // "src", "srcdoc", "srcimp"

  // Everything before the group dir is the package path
  const groupDirIndex = normalized.indexOf(match[0]);
  const packagePath = normalized.substring(0, groupDirIndex);

  // Extract the last component(s) as package name
  // Handle both "uppsrc/Core" and "uppsrc/plugin/bz2" patterns
  const uppsrcMatch = packagePath.match(/uppsrc\/(.+)$/);
  if (uppsrcMatch) {
    return { packageName: uppsrcMatch[1], groupName };
  }

  // Fallback: use the last directory name(s)
  const parts = packagePath.split('/');
  // Walk backwards to find a meaningful package path
  for (let i = parts.length - 1; i >= 0; i--) {
    if (parts[i] && !parts[i].startsWith('.')) {
      // Check if parent is "plugin" to include it
      if (i > 0 && parts[i - 1] === 'plugin') {
        return { packageName: `plugin/${parts[i]}`, groupName };
      }
      return { packageName: parts[i], groupName };
    }
  }

  return null;
}

/**
 * Find all UPP source directories based on scan mode.
 * - "varfiles": Read ~/.config/u++/theide/*.var files
 * - "home": Recursively scan ~/ for directories containing uppsrc
 * - "custom": Recursively scan a custom path for directories containing uppsrc
 */
export function findUppsrcDirs(
  _workspaceFolders: readonly vscode.WorkspaceFolder[],
  scanMode: string = 'varfiles',
  customPath: string = '',
): { dirs: string[]; realUppsrc: string[] } {
  if (scanMode === 'home') {
    const home = process.env.HOME || '';
    return findUppsrcDirsByScanning(home);
  }
  if (scanMode === 'custom' && customPath) {
    const resolved = path.resolve(customPath);
    if (fs.existsSync(resolved) && fs.statSync(resolved).isDirectory()) {
      return findUppsrcDirsByScanning(resolved);
    }
  }
  return findUppsrcDirsFromVarFiles(_workspaceFolders);
}

function findUppsrcDirsFromVarFiles(_workspaceFolders: readonly vscode.WorkspaceFolder[]): { dirs: string[]; realUppsrc: string[] } {
  const uppsrcDirs: string[] = [];
  const realUppsrc: string[] = [];
  const seen = new Set<string>();

  const home = process.env.HOME || '';
  const configDirs = [
    path.join(home, '.config', 'u++', 'theide'),
    path.join(home, '.config', 'U++', 'theide'),
  ];

  let theideDir = '';
  for (const d of configDirs) {
    if (fs.existsSync(d)) { theideDir = d; break; }
  }

  if (!theideDir) {
    return findUppsrcDirsFallback(_workspaceFolders);
  }

  try {
    const files = fs.readdirSync(theideDir);
    for (const file of files) {
      if (!file.endsWith('.var')) continue;
      const content = fs.readFileSync(path.join(theideDir, file), 'utf-8');
      const uppMatch = content.match(/^UPP\s*=\s*"([^"]+)"/m);
      if (!uppMatch) continue;

      const paths = uppMatch[1].split(';').map(p => p.trim()).filter(p => p.length > 0);
      for (const p of paths) {
        const resolved = path.resolve(p);
        if (!fs.existsSync(resolved)) continue;
        if (!fs.statSync(resolved).isDirectory()) continue;

        const normalized = resolved.replace(/\\/g, '/');
        if (seen.has(normalized)) continue;
        seen.add(normalized);

        uppsrcDirs.push(resolved);

        try {
          const entries = fs.readdirSync(resolved, { withFileTypes: true });
          const hasTppDirs = entries.some(e => e.isDirectory() && e.name.endsWith('.tpp'));
          if (hasTppDirs) {
            realUppsrc.push(resolved);
          }
        } catch {}
      }
    }
  } catch {}

  return { dirs: uppsrcDirs, realUppsrc };
}

/**
 * Recursively scan a root directory for directories that contain uppsrc subdirs.
 * Scans up to 6 levels deep. Returns the uppsrc dirs found.
 */
function findUppsrcDirsByScanning(scanRoot: string): { dirs: string[]; realUppsrc: string[] } {
  const uppsrcDirs: string[] = [];
  const realUppsrc: string[] = [];
  const seen = new Set<string>();

  function walk(dir: string, depth: number): void {
    if (depth > 6) return;
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory() || entry.name.startsWith('.')) continue;
        const fullPath = path.join(dir, entry.name);

        if (entry.name === 'uppsrc') {
          const normalized = fullPath.replace(/\\/g, '/');
          if (seen.has(normalized)) continue;
          seen.add(normalized);

          uppsrcDirs.push(fullPath);

          try {
            const subEntries = fs.readdirSync(fullPath, { withFileTypes: true });
            const hasTppDirs = subEntries.some(e => e.isDirectory() && e.name.endsWith('.tpp'));
            if (hasTppDirs) {
              realUppsrc.push(fullPath);
            }
          } catch {}
        } else {
          walk(fullPath, depth + 1);
        }
      }
    } catch {}
  }

  walk(scanRoot, 0);
  return { dirs: uppsrcDirs, realUppsrc };
}

function findUppsrcDirsFallback(workspaceFolders: readonly vscode.WorkspaceFolder[]): { dirs: string[]; realUppsrc: string[] } {
  const uppsrcDirs: string[] = [];
  const realUppsrc: string[] = [];
  const visited = new Set<string>();

  for (const folder of workspaceFolders) {
    let dir = folder.uri.fsPath;
    for (let depth = 0; depth < 10; depth++) {
      if (visited.has(dir)) break;
      visited.add(dir);

      const candidate = path.join(dir, 'uppsrc');
      if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
        if (!uppsrcDirs.includes(candidate)) {
          uppsrcDirs.push(candidate);
          realUppsrc.push(candidate);
        }
        break;
      }

      const parent = path.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
  }

  return { dirs: uppsrcDirs, realUppsrc };
}

/**
 * Recursively scan a directory for packages containing .tpp groups.
 * Returns all .tpp file paths found.
 */
function scanForTppFiles(dir: string, depth = 0): string[] {
  if (depth > 10) return [];
  const results: string[] = [];

  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name.startsWith('.')) continue;

      const fullPath = path.join(dir, entry.name);

      // Check if this directory contains .tpp files (it's a group dir like src.tpp/)
      if (entry.name.endsWith('.tpp')) {
        try {
          const files = fs.readdirSync(fullPath, { withFileTypes: true });
          for (const file of files) {
            if (file.isFile() && file.name.endsWith('.tpp')) {
              results.push(path.join(fullPath, file.name));
            }
          }
        } catch {
          // Skip unreadable directories
        }
      } else {
        // Recurse into subdirectories (packages, plugin/*, etc.)
        results.push(...scanForTppFiles(fullPath, depth + 1));
      }
    }
  } catch {
    // Skip unreadable directories
  }

  return results;
}

/**
 * Find app.tpp directories for "TheIDE help" topics.
 */
function findAppTppFiles(uppsrcDirs: string[]): string[] {
  const appTppFiles: string[] = [];

  for (const uppsrcDir of uppsrcDirs) {
    const files = scanForTppFiles(uppsrcDir);
    for (const file of files) {
      // Check if this file is inside an app.tpp directory
      if (file.includes('/app.tpp/') || file.includes('\\app.tpp\\')) {
        appTppFiles.push(file);
      }
    }
  }

  return appTppFiles;
}

/**
 * Read a .tpp file and extract index data.
 */
function readTopicEntry(filePath: string, uppsrcDir: string): TopicEntry | null {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const parsed = parseTppPath(filePath);
    if (!parsed) return null;

    const title = extractTitle(content);
    const body = extractBody(content);
    const bodyText = stripQtfFormatting(body);
    const headings = extractHeadings(body);

    return {
      filePath,
      packageName: parsed.packageName,
      groupName: parsed.groupName,
      title,
      bodyText,
      headings,
      uppsrcDir,
    };
  } catch {
    return null;
  }
}

/**
 * Extract body text after the topic "..." line.
 */
function extractBody(content: string): string {
  const lines = content.split('\n');
  const bodyLines: string[] = [];
  let foundTopic = false;

  for (const line of lines) {
    if (!foundTopic) {
      if (/^topic\s+"/.test(line)) {
        foundTopic = true;
        continue;
      }
    }
    if (foundTopic) {
      bodyLines.push(line);
    }
  }

  return bodyLines.join('\n');
}

export class TopicIndex {
  private entries: TopicEntry[] = [];
  private appTppRawEntries: TopicEntry[] = [];
  private appTppEntries: TopicEntry[] = [];
  private appTppParentPaths: string[] = [];
  private uppsrcDirs: string[] = [];
  private realUppsrcDirs: string[] = [];
  private assemblies: Assembly[] = [];
  private matchedAssembly: Assembly | null = null;
  private usedPackageNames: Set<string> = new Set();

  /**
   * Build the full index by scanning workspace for .tpp files.
   */
  async build(): Promise<void> {
    const workspaceFolders = vscode.workspace.workspaceFolders || [];
    const config = vscode.workspace.getConfiguration('tpp');
    const scanMode = config.get<string>('uppsrcScanMode', 'varfiles');
    const customPath = config.get<string>('uppsrcCustomPath', '');
    const result = findUppsrcDirs(workspaceFolders, scanMode, customPath);
    this.uppsrcDirs = result.dirs;
    this.realUppsrcDirs = result.realUppsrc;

    // Scan tpp files from all UPP dirs found in .var files, tracking source dir
    const fileToDir = new Map<string, string>();
    for (const dir of this.uppsrcDirs) {
      for (const file of scanForTppFiles(dir)) {
        fileToDir.set(file, dir);
      }
    }

    // If no .var dirs found, fall back to workspace-level scan
    if (fileToDir.size === 0 && this.uppsrcDirs.length === 0) {
      for (const folder of workspaceFolders) {
        for (const file of scanForTppFiles(folder.uri.fsPath)) {
          fileToDir.set(file, folder.uri.fsPath);
        }
        if (fileToDir.size > 0) {
          this.uppsrcDirs.push(folder.uri.fsPath);
        }
      }
    }

    // Deduplicate
    const uniqueFiles = [...new Set(fileToDir.keys())];

    this.entries = [];
    this.appTppRawEntries = [];

    for (const file of uniqueFiles) {
      const dir = fileToDir.get(file) || '';
      const entry = readTopicEntry(file, dir);
      if (entry) {
        if (entry.groupName === 'app') {
          const normalized = file.replace(/\\/g, '/');
          if (normalized.includes('uppsrc/ide/') || normalized.includes('uppsrc\\ide\\')) {
            this.appTppRawEntries.push(entry);
          }
        } else {
          this.entries.push(entry);
        }
      }
    }

    // Sort entries
    this.entries.sort((a, b) => {
      const pkgCmp = a.packageName.localeCompare(b.packageName);
      if (pkgCmp !== 0) return pkgCmp;
      const grpCmp = groupSortOrder(a.groupName) - groupSortOrder(b.groupName);
      if (grpCmp !== 0) return grpCmp;
      return (a.title || '').localeCompare(b.title || '');
    });

    // Extract distinct parent paths (dir containing uppsrc/ide) from raw entries
    const parentPathSet = new Set<string>();
    for (const entry of this.appTppRawEntries) {
      const normalized = entry.filePath.replace(/\\/g, '/');
      const match = normalized.match(/^(.+)\/uppsrc\/ide\//);
      if (match) {
        parentPathSet.add(match[1]);
      }
    }
    this.appTppParentPaths = [...parentPathSet].sort();

    // Deduplicate app.tpp entries by title for "All" display
    const seenTitles = new Set<string>();
    this.appTppEntries = this.appTppRawEntries.filter(e => {
      const key = e.title || e.filePath;
      if (seenTitles.has(key)) return false;
      seenTitles.add(key);
      return true;
    });

    this.appTppEntries.sort((a, b) =>
      (a.title || '').localeCompare(b.title || '')
    );

    // Discover assemblies from .var files
    this.assemblies = findAssemblies();
    this.matchedAssembly = findMatchingAssembly(this.assemblies, workspaceFolders);

    // Build used package names from matched assembly + .upp dependencies
    this.usedPackageNames = new Set<string>();
    if (this.matchedAssembly) {
      const packages = findPackagesInAssembly(this.matchedAssembly);
      const visited = new Set<string>();
      const resolve = (pkgName: string) => {
        if (visited.has(pkgName)) return;
        visited.add(pkgName);
        this.usedPackageNames.add(pkgName);
        const pkg = packages.find(p => p.name === pkgName);
        if (pkg) {
          for (const dep of pkg.uses) resolve(dep);
        }
      };
      for (const pkg of packages) resolve(pkg.name);
    }
  }

  private isUnderRealUppsrc(filePath: string): boolean {
    const normalized = filePath.replace(/\\/g, '/');
    for (const dir of this.realUppsrcDirs) {
      if (normalized.startsWith(dir.replace(/\\/g, '/'))) return true;
    }
    return false;
  }

  /**
   * Refresh the index (full rebuild or single file update).
   */
  refresh(changedFile?: string): void {
    if (changedFile && changedFile.endsWith('.tpp')) {
      // Try to update a single entry
      const existingIdx = this.entries.findIndex(e => e.filePath === changedFile);
      const existingAppIdx = this.appTppEntries.findIndex(e => e.filePath === changedFile);

      // Determine uppsrcDir from existing entry or find it
      let uppsrcDir = '';
      if (existingIdx >= 0) uppsrcDir = this.entries[existingIdx].uppsrcDir;
      else if (existingAppIdx >= 0) uppsrcDir = this.appTppEntries[existingAppIdx].uppsrcDir;
      else {
        // Find which uppsrcDir this file belongs to
        const normalized = changedFile.replace(/\\/g, '/');
        for (const dir of this.uppsrcDirs) {
          if (normalized.startsWith(dir.replace(/\\/g, '/'))) {
            uppsrcDir = dir;
            break;
          }
        }
      }

      const entry = readTopicEntry(changedFile, uppsrcDir);
      if (entry) {
        if (entry.groupName === 'app') {
          if (existingAppIdx >= 0) {
            this.appTppEntries[existingAppIdx] = entry;
          } else {
            this.appTppEntries.push(entry);
            this.appTppEntries.sort((a, b) =>
              (a.title || '').localeCompare(b.title || '')
            );
          }
        } else {
          if (existingIdx >= 0) {
            this.entries[existingIdx] = entry;
          } else {
            this.entries.push(entry);
            this.entries.sort((a, b) => {
              const pkgCmp = a.packageName.localeCompare(b.packageName);
              if (pkgCmp !== 0) return pkgCmp;
              const grpCmp = groupSortOrder(a.groupName) - groupSortOrder(b.groupName);
              if (grpCmp !== 0) return grpCmp;
              return (a.title || '').localeCompare(b.title || '');
            });
          }
        }
      } else {
        // File was deleted or unreadable — remove
        if (existingIdx >= 0) this.entries.splice(existingIdx, 1);
        if (existingAppIdx >= 0) this.appTppEntries.splice(existingAppIdx, 1);
      }
    } else {
      // Full rebuild
      this.build();
    }
  }

  /**
   * Search headings (title + section headings). Returns matching entries.
   */
  searchHeadings(query: string): TopicEntry[] {
    if (!query.trim()) return [];
    const lower = query.toLowerCase();
    const results: TopicEntry[] = [];

    // Search titles first (higher priority)
    for (const entry of this.entries) {
      if (entry.title && entry.title.toLowerCase().includes(lower)) {
        results.push(entry);
      }
    }
    // Then search headings
    for (const entry of this.entries) {
      if (results.includes(entry)) continue;
      for (const heading of entry.headings) {
        if (heading.toLowerCase().includes(lower)) {
          results.push(entry);
          break;
        }
      }
    }

    return results;
  }

  /**
   * Full-text search across body text. Returns matching entries with context.
   */
  searchFullText(query: string): TopicEntry[] {
    if (!query.trim()) return [];
    const lower = query.toLowerCase();
    const results: TopicEntry[] = [];

    for (const entry of this.entries) {
      if (entry.bodyText.toLowerCase().includes(lower)) {
        results.push(entry);
      }
    }

    return results;
  }

  /**
   * Get all regular entries (non-app.tpp).
   */
  getAll(): TopicEntry[] {
    return [...this.entries];
  }

  /**
   * Get app.tpp entries (TheIDE help topics).
   */
  getAppTppEntries(): TopicEntry[] {
    return [...this.appTppEntries];
  }

  getAppTppRawEntries(): TopicEntry[] {
    return [...this.appTppRawEntries];
  }

  /**
   * Get distinct uppsrc/ide parent paths from app.tpp entries.
   * E.g., "~/Downloads/upp-16759-aris/uppsrc/ide" → "upp-16759-aris/uppsrc/ide"
   */
  getAppTppUppsrcPaths(): { dir: string; label: string }[] {
    const home = process.env.HOME || '';
    return this.appTppParentPaths.map(p => ({
      dir: p,
      label: p.startsWith(home) ? '~' + p.substring(home.length) : p,
    }));
  }

  /**
   * Get entries for a specific package.
   */
  getByPackage(packageName: string): TopicEntry[] {
    return this.entries.filter(e => e.packageName === packageName);
  }

  /**
   * Get entries for a specific package and group.
   */
  getGroupEntries(packageName: string, group: string): TopicEntry[] {
    return this.entries.filter(e =>
      e.packageName === packageName && e.groupName === group
    );
  }

  /**
   * Get all unique package names.
   */
  getPackageNames(): string[] {
    const names = new Set<string>();
    for (const entry of this.entries) {
      names.add(entry.packageName);
    }
    return [...names].sort();
  }

  /**
   * Get all unique group names for a package.
   */
  getGroupNames(packageName: string): string[] {
    const names = new Set<string>();
    for (const entry of this.entries) {
      if (entry.packageName === packageName) {
        names.add(entry.groupName);
      }
    }
    return [...names].sort((a, b) => groupSortOrder(a) - groupSortOrder(b));
  }

  getUsedPackageNames(): Set<string> {
    return new Set(this.usedPackageNames);
  }

  getMatchedAssembly(): Assembly | null {
    return this.matchedAssembly;
  }

  /**
   * Get the uppsrc directories found during build.
   */
  getUppsrcDirs(): string[] {
    return [...this.uppsrcDirs];
  }

  /**
   * Get unique uppsrc dir display names as "parent/basename" (or just basename if root).
   * E.g., "/home/user/uppsrc" → "home/uppsrc", "/home/user/bazaar" → "home/bazaar"
   */
  getUppsrcDirNames(): { dir: string; label: string }[] {
    const seen = new Map<string, string>(); // normalized → label
    const results: { dir: string; label: string }[] = [];

    for (const dir of this.uppsrcDirs) {
      const normalized = dir.replace(/\\/g, '/');
      if (seen.has(normalized)) continue;

      const parts = normalized.split('/').filter(Boolean);
      const basename = parts[parts.length - 1] || dir;
      const parent = parts.length >= 2 ? parts[parts.length - 2] : '';
      const label = parent ? `${parent}/${basename}` : basename;

      // Handle duplicate basenames by using full label
      let finalLabel = label;
      for (const [, existingLabel] of seen) {
        if (existingLabel === label) {
          finalLabel = label;
          break;
        }
      }

      seen.set(normalized, finalLabel);
      results.push({ dir, label: finalLabel });
    }

    return results;
  }

  /**
   * Get entries belonging to a specific uppsrc directory.
   */
  getEntriesForUppsrcDir(uppsrcDir: string): TopicEntry[] {
    return this.entries.filter(e => e.uppsrcDir === uppsrcDir);
  }

  /**
   * Get all unique package names from a specific uppsrc directory.
   */
  getPackageNamesForUppsrcDir(uppsrcDir: string): string[] {
    const names = new Set<string>();
    for (const entry of this.entries) {
      if (entry.uppsrcDir === uppsrcDir) {
        names.add(entry.packageName);
      }
    }
    return [...names].sort();
  }
}

/**
 * Sort order for group names (matches U++ TheIDE ordering).
 */
function groupSortOrder(group: string): number {
  switch (group) {
    case 'srcdoc': return 3;   // "Documents"
    case 'src': return 4;      // "Reference"
    case 'srcimp': return 5;   // "Implementation"
    default: return 6;         // Other groups
  }
}

/**
 * Map group name to display label (matches U++ TheIDE).
 */
export function groupDisplayName(group: string): string {
  switch (group) {
    case 'src': return 'Reference';
    case 'srcdoc': return 'Documents';
    case 'srcimp': return 'Implementation';
    case 'app': return 'App Topics';
    default: return group;
  }
}
