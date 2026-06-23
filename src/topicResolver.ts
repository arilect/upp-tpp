/**
 * Resolve a topic:// URL to a file path on disk.
 *
 * U++ topic URL format:
 *   topic://PackageName/GroupName/TopicName$lang#anchor
 *
 * Where:
 *   PackageName  — may be multi-level: "Core", "Core/SSH", "plugin/bz2"
 *   GroupName    — the .tpp directory name: "src", "srcdoc", "srcimp", "app"
 *   TopicName    — the topic file name (without .tpp)
 *   $lang        — optional language suffix (e.g., "$en-us")
 *   #anchor      — optional in-page anchor
 *
 * Maps to filesystem path:
 *   PackageName/GroupName.tpp/TopicName_lang.tpp
 *   e.g. Core/SSH/srcdoc.tpp/Design_en-us.tpp
 */

/** Known .tpp group directory names (in priority order). */
const KNOWN_GROUPS = ['src', 'srcdoc', 'srcimp', 'app'];

export interface ResolvedTopic {
  /** Relative path to the .tpp file (e.g., "Core/SSH/srcdoc.tpp/Design_en-us.tpp") */
  relativePath: string;
  /** Optional in-page anchor */
  anchor?: string;
}

/**
 * Find the group name segment index by scanning for known .tpp directory names.
 * Returns the index of the group segment, or -1 if not found.
 */
function findGroupIndex(segments: string[]): number {
  // Scan from the end (group is typically second-to-last or third-to-last)
  for (let i = segments.length - 2; i >= 1; i--) {
    if (KNOWN_GROUPS.includes(segments[i])) {
      return i;
    }
  }
  // Fallback: scan from start
  for (let i = 1; i < segments.length - 1; i++) {
    if (KNOWN_GROUPS.includes(segments[i])) {
      return i;
    }
  }
  return -1;
}

/**
 * Parse a topic:// URL into a ResolvedTopic.
 */
export function resolveTopicUrl(url: string): ResolvedTopic | null {
  const hashIdx = url.indexOf('#');
  const anchor = hashIdx >= 0 ? decodeURIComponent(url.substring(hashIdx + 1)) : undefined;
  const cleanUrl = hashIdx >= 0 ? url.substring(0, hashIdx) : url;

  // Remove topic:// prefix
  const topicPath = cleanUrl.replace(/^topic:\/\//, '');

  // Split off language: TopicPath$Language (optional)
  const dollarIdx = topicPath.lastIndexOf('$');
  let pathPart: string;
  let lang: string | undefined;
  if (dollarIdx >= 0) {
    pathPart = topicPath.substring(0, dollarIdx);
    lang = topicPath.substring(dollarIdx + 1);
  } else {
    pathPart = topicPath;
  }

  const segments = pathPart.split('/');
  if (segments.length < 3) {
    return null;
  }

  // Find the group name by looking for known .tpp directory names
  const groupIdx = findGroupIndex(segments);

  let pkgParts: string[];
  let groupName: string;
  let topicName: string;

  if (groupIdx >= 0) {
    // Known group found — split around it
    pkgParts = segments.slice(0, groupIdx);
    groupName = segments[groupIdx];
    topicName = segments.slice(groupIdx + 1).join('/');
  } else {
    // Unknown group — fall back to assuming segments[1] is the group
    // (backward-compatible with old behavior)
    pkgParts = [segments[0]];
    groupName = segments[1];
    topicName = segments.slice(2).join('/');
  }

  // Build relative filesystem path
  const pkg = pkgParts.join('/');
  const fileName = lang ? `${topicName}_${lang}.tpp` : `${topicName}.tpp`;
  const relativePath = `${pkg}/${groupName}.tpp/${fileName}`;

  return { relativePath, anchor };
}
