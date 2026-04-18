import * as fsp from "node:fs/promises";
import * as path from "node:path";
import type {
  GuidanceFile,
  GuidanceFrontmatter,
  GuidanceLoadOptions,
  GuidanceType,
} from "./guidance-types";

/** Search file names — AGENTS.md takes priority over CLAUDE.md */
const SEARCH_FILENAMES = ["AGENTS.md", "CLAUDE.md"];

/**
 * Sub-directories to also search within each candidate directory.
 * Matches amp's .claude/** pattern (chunk-005.js:70814) and Claude Code's
 * convention of storing CLAUDE.md inside .claude/ subdirectory.
 *
 * 逆向: chunk-005.js:70814 — patterns: ["**\/.claude\/**", "~\/.claude\/**"]
 */
const SEARCH_SUBDIRS = [".claude"];

const DEFAULT_MAX_BYTES = 32768;

// ---------------------------------------------------------------------------
// Simple YAML frontmatter parser
// ---------------------------------------------------------------------------

const FRONTMATTER_RE = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;

/**
 * Minimal YAML parser for frontmatter blocks.
 * Handles simple `key: value` lines and arrays written as `- item` entries.
 * Returns null on any parse error.
 */
function parseSimpleYaml(yaml: string): GuidanceFrontmatter | null {
  try {
    const result: Record<string, unknown> = {};
    const lines = yaml.split("\n");
    let currentKey: string | null = null;
    let currentArray: string[] | null = null;

    for (const raw of lines) {
      const line = raw.trimEnd();
      // Skip blank lines and comments
      if (line.trim() === "" || line.trim().startsWith("#")) {
        continue;
      }

      // Array item: "  - value"
      const arrayItemMatch = line.match(/^\s+-\s+(.+)$/);
      if (arrayItemMatch && currentKey !== null && currentArray !== null) {
        currentArray.push(stripQuotes(arrayItemMatch[1].trim()));
        result[currentKey] = currentArray;
        continue;
      }

      // Flush any pending array
      if (currentArray !== null && currentKey !== null) {
        result[currentKey] = currentArray;
      }
      currentKey = null;
      currentArray = null;

      // key: value
      const kvMatch = line.match(/^(\w[\w.-]*):\s*(.*)$/);
      if (!kvMatch) {
        return null; // unexpected line
      }

      const key = kvMatch[1];
      const val = kvMatch[2].trim();

      if (val === "" || val === "|" || val === ">") {
        // Start of an array or block scalar — treat as array
        currentKey = key;
        currentArray = [];
      } else {
        result[key] = parseYamlValue(val);
      }
    }

    // Flush trailing array
    if (currentArray !== null && currentKey !== null) {
      result[currentKey] = currentArray;
    }

    // Normalize globs: if globs is a single string, wrap in array
    if (typeof result.globs === "string") {
      result.globs = [result.globs];
    }

    return result as GuidanceFrontmatter;
  } catch {
    return null;
  }
}

function stripQuotes(s: string): string {
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1);
  }
  return s;
}

function parseYamlValue(val: string): unknown {
  const stripped = stripQuotes(val);
  if (val !== stripped) return stripped; // was quoted → string

  if (val === "true") return true;
  if (val === "false") return false;
  if (val === "null") return null;
  if (/^-?\d+(\.\d+)?$/.test(val)) return Number(val);

  return val;
}

// ---------------------------------------------------------------------------
// parseFrontmatter
// ---------------------------------------------------------------------------

/**
 * Parse YAML frontmatter from guidance file content.
 *
 * Pattern: /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/
 * Returns `{ frontMatter, content }`.
 * If no frontmatter match, returns `{ frontMatter: null, content: trimmed original }`.
 * On YAML parse error, returns `{ frontMatter: null, content: trimmed original }`.
 */
export function parseFrontmatter(raw: string): {
  frontMatter: GuidanceFrontmatter | null;
  content: string;
} {
  const match = FRONTMATTER_RE.exec(raw);
  if (!match) {
    return { frontMatter: null, content: raw.trim() };
  }

  const yamlBlock = match[1];
  const body = match[2];
  const frontMatter = parseSimpleYaml(yamlBlock);
  if (frontMatter === null) {
    return { frontMatter: null, content: raw.trim() };
  }

  return { frontMatter, content: body.trim() };
}

// ---------------------------------------------------------------------------
// matchGlobs
// ---------------------------------------------------------------------------

/**
 * Check if globs in frontmatter match any of the readFiles.
 * If no globs are defined, returns true (no filtering).
 * Uses simple glob matching since micromatch is unavailable.
 */
export function matchGlobs(
  frontMatter: GuidanceFrontmatter | null,
  readFiles: string[],
  _fileUri: string,
): boolean {
  if (!frontMatter?.globs || frontMatter.globs.length === 0) {
    return true;
  }
  if (readFiles.length === 0) {
    return false;
  }

  return frontMatter.globs.some((glob) => readFiles.some((file) => simpleGlobMatch(glob, file)));
}

/**
 * Basic glob matching:
 * - `**​/*.ext` matches any file ending with .ext at any depth
 * - `*.ext` matches files ending with .ext (no directory separators)
 * - `**​/name` matches file named `name` at any depth
 * - Exact string match as fallback
 * - `*` matches any sequence of non-separator characters
 */
function simpleGlobMatch(glob: string, filePath: string): boolean {
  // Normalize separators
  const normalizedPath = filePath.replace(/\\/g, "/");
  const normalizedGlob = glob.replace(/\\/g, "/");

  // Convert glob to regex
  const regexStr = globToRegex(normalizedGlob);
  const re = new RegExp(`^${regexStr}$`);
  return re.test(normalizedPath);
}

function globToRegex(glob: string): string {
  let result = "";
  let i = 0;
  while (i < glob.length) {
    const ch = glob[i];
    if (ch === "*" && glob[i + 1] === "*") {
      // **
      if (glob[i + 2] === "/") {
        // **/  — match any directory prefix (including empty)
        result += "(?:.*/)?";
        i += 3;
      } else {
        // ** at end — match everything
        result += ".*";
        i += 2;
      }
    } else if (ch === "*") {
      // * — match anything except /
      result += "[^/]*";
      i++;
    } else if (ch === "?") {
      result += "[^/]";
      i++;
    } else if (ch === ".") {
      result += "\\.";
      i++;
    } else if (ch === "{") {
      result += "(?:";
      i++;
    } else if (ch === "}") {
      result += ")";
      i++;
    } else if (ch === ",") {
      result += "|";
      i++;
    } else {
      result += ch;
      i++;
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// extractAtReferences
// ---------------------------------------------------------------------------

const CODE_BLOCK_RE = /```[\s\S]*?```/g;
const INLINE_CODE_RE = /`[^`]*`/g;
const AT_REF_RE = /@([a-zA-Z0-9._~/*?[\]{}\\,-]+)/g;
const TRAILING_PUNCT_RE = /[.,;:!?)}\]]+$/;

/**
 * Extract @references from content.
 * Strips code blocks first (triple-backtick and inline backtick).
 * Strips trailing punctuation from matches.
 */
export function extractAtReferences(content: string): string[] {
  // Remove code blocks
  let stripped = content.replace(CODE_BLOCK_RE, "");
  stripped = stripped.replace(INLINE_CODE_RE, "");

  const refs: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = AT_REF_RE.exec(stripped)) !== null) {
    let ref = match[1];
    ref = ref.replace(TRAILING_PUNCT_RE, "");
    if (ref.length > 0) {
      refs.push(ref);
    }
  }
  return refs;
}

// ---------------------------------------------------------------------------
// isRootDirectory
// ---------------------------------------------------------------------------

/**
 * Check if a directory is a filesystem root.
 * Returns true for "/" and platform root patterns.
 */
export function isRootDirectory(dir: string): boolean {
  const normalized = path.resolve(dir);
  return normalized === path.parse(normalized).root;
}

// ---------------------------------------------------------------------------
// discoverGuidanceFiles
// ---------------------------------------------------------------------------

/**
 * Discover and load guidance files from workspace roots, parent directories,
 * and user config directory.
 */
export async function discoverGuidanceFiles(options: GuidanceLoadOptions): Promise<GuidanceFile[]> {
  const {
    workspaceRoots,
    userConfigDir,
    readFiles = [],
    maxBytesPerFile = DEFAULT_MAX_BYTES,
    signal,
  } = options;

  // Track which URIs we've already seen (for dedup and cycle prevention)
  const seenUris = new Set<string>();
  // Track which directory has already been claimed (for dedup across filenames)
  const seenDirs = new Set<string>();

  // Collect candidate paths: { filePath, type }
  interface Candidate {
    filePath: string;
    type: GuidanceType;
  }
  const candidates: Candidate[] = [];

  // Build candidate list
  const workspaceRootSet = new Set(workspaceRoots.map((r) => path.resolve(r)));

  for (const root of workspaceRoots) {
    signal?.throwIfAborted();

    const resolvedRoot = path.resolve(root);
    let dir = resolvedRoot;

    while (true) {
      signal?.throwIfAborted();

      if (!seenDirs.has(dir)) {
        const type: GuidanceType = isUnderAny(dir, workspaceRootSet) ? "project" : "parent";
        // Search in the directory itself
        for (const filename of SEARCH_FILENAMES) {
          candidates.push({ filePath: path.join(dir, filename), type });
        }
        // Also search in .claude/ subdirectory (逆向: chunk-005.js:70814)
        for (const subdir of SEARCH_SUBDIRS) {
          for (const filename of SEARCH_FILENAMES) {
            candidates.push({ filePath: path.join(dir, subdir, filename), type });
          }
        }
        seenDirs.add(dir);
      }

      if (isRootDirectory(dir)) {
        break;
      }

      const parentDir = path.dirname(dir);
      if (parentDir === dir) {
        break; // safety guard
      }
      dir = parentDir;
    }
  }

  // Add user config dir candidates
  if (userConfigDir) {
    const resolvedConfig = path.resolve(userConfigDir);
    if (!seenDirs.has(resolvedConfig)) {
      // Search in the user config dir itself
      for (const filename of SEARCH_FILENAMES) {
        candidates.push({
          filePath: path.join(resolvedConfig, filename),
          type: "user",
        });
      }
      // Also search in .claude/ subdirectory (逆向: chunk-005.js:70814)
      for (const subdir of SEARCH_SUBDIRS) {
        for (const filename of SEARCH_FILENAMES) {
          candidates.push({
            filePath: path.join(resolvedConfig, subdir, filename),
            type: "user",
          });
        }
      }
      seenDirs.add(resolvedConfig);
    }
  }

  // Dedup by directory — only take the first existing file per directory
  const dirClaimed = new Set<string>();
  const validCandidates: Candidate[] = [];

  for (const candidate of candidates) {
    signal?.throwIfAborted();

    const dir = path.dirname(candidate.filePath);
    if (dirClaimed.has(dir)) {
      continue; // already have a file from this directory
    }

    if (await fileExists(candidate.filePath)) {
      dirClaimed.add(dir);
      validCandidates.push(candidate);
    }
  }

  // Load each file and collect results
  const results: GuidanceFile[] = [];
  // Mentioned files to be inserted after their referrer
  const mentionedQueue: Array<{ afterIndex: number; files: GuidanceFile[] }> = [];

  for (const candidate of validCandidates) {
    signal?.throwIfAborted();

    const uri = candidate.filePath;
    if (seenUris.has(uri)) {
      continue;
    }

    const file = await loadGuidanceFile(uri, candidate.type, readFiles, maxBytesPerFile, signal);
    if (!file) {
      continue;
    }

    seenUris.add(uri);
    const currentIndex = results.length;
    results.push(file);

    // Extract and load @referenced files
    const refs = extractAtReferences(file.content);
    const mentionedFiles: GuidanceFile[] = [];

    for (const ref of refs) {
      signal?.throwIfAborted();

      const resolvedRef = path.resolve(path.dirname(uri), ref);
      if (seenUris.has(resolvedRef)) {
        continue; // cycle prevention
      }

      const mentioned = await loadGuidanceFile(
        resolvedRef,
        "mentioned",
        readFiles,
        maxBytesPerFile,
        signal,
      );
      if (mentioned) {
        seenUris.add(resolvedRef);
        mentionedFiles.push(mentioned);
      }
    }

    if (mentionedFiles.length > 0) {
      mentionedQueue.push({ afterIndex: currentIndex, files: mentionedFiles });
    }
  }

  // Insert mentioned files after their referrer (process in reverse to keep indices stable)
  for (let i = mentionedQueue.length - 1; i >= 0; i--) {
    const { afterIndex, files } = mentionedQueue[i];
    results.splice(afterIndex + 1, 0, ...files);
  }

  return results;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isUnderAny(dir: string, roots: Set<string>): boolean {
  const resolved = path.resolve(dir);
  for (const root of roots) {
    if (resolved === root || resolved.startsWith(root + path.sep)) {
      return true;
    }
  }
  return false;
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fsp.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function loadGuidanceFile(
  uri: string,
  type: GuidanceType,
  readFiles: string[],
  maxBytes: number,
  signal?: AbortSignal,
): Promise<GuidanceFile | null> {
  signal?.throwIfAborted();

  try {
    let raw = await fsp.readFile(uri, "utf-8");

    // Truncate if over budget
    if (Buffer.byteLength(raw, "utf-8") > maxBytes) {
      raw = Buffer.from(raw, "utf-8").subarray(0, maxBytes).toString("utf-8");
    }

    const { frontMatter, content } = parseFrontmatter(raw);
    const exclude = !matchGlobs(frontMatter, readFiles, uri);
    const lineCount = content.split("\n").length;

    return {
      uri,
      type,
      content,
      frontMatter,
      exclude,
      lineCount,
    };
  } catch {
    // File doesn't exist or can't be read — skip gracefully
    return null;
  }
}
