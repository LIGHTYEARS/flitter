// SkillService — centralized skill management for flitter-cli.
//
// Provides loading, caching, querying, and grouping of skills.
// Matching AMP's skill infrastructure:
//   - Bulk skill state from external sources (tool registry, config)
//   - Listener-based reactivity for widget rebuilds
//   - groupSkillsByPath() matching AMP's Cq0 function (Local/Global grouping)
//   - relativizePath() matching AMP's A_R function (path display)

import type {
  SkillDefinition,
  SkillError,
  SkillWarning,
  SkillGroup,
} from './skill-types';
import { homedir } from 'node:os';
import { relative, resolve } from 'node:path';

// ---------------------------------------------------------------------------
// SkillService
// ---------------------------------------------------------------------------

/**
 * Centralized skill management service.
 *
 * Holds the cached skill list, load errors, and warnings. Notifies
 * registered listeners on any state change. Used by SkillsModal and
 * other UI components to read the current skill inventory.
 */
export class SkillService {
  /** Cached skill list. */
  private _skills: SkillDefinition[] = [];

  /** Cached load errors. */
  private _errors: SkillError[] = [];

  /** Cached load warnings. */
  private _warnings: SkillWarning[] = [];

  /** Whether the initial load has completed. */
  private _loaded: boolean = false;

  /** Change listeners notified on any state mutation. */
  private _listeners: Set<() => void> = new Set();

  // -------------------------------------------------------------------------
  // Public getters
  // -------------------------------------------------------------------------

  /** All currently loaded skills. */
  get skills(): SkillDefinition[] {
    return this._skills;
  }

  /** All skill load errors. */
  get errors(): SkillError[] {
    return this._errors;
  }

  /** All skill load warnings. */
  get warnings(): SkillWarning[] {
    return this._warnings;
  }

  /** Whether the initial skill load has completed. */
  get isLoaded(): boolean {
    return this._loaded;
  }

  /** Total number of loaded skills. */
  get skillCount(): number {
    return this._skills.length;
  }

  /** Total number of load warnings. */
  get warningCount(): number {
    return this._warnings.length;
  }

  // -------------------------------------------------------------------------
  // Public methods
  // -------------------------------------------------------------------------

  /**
   * Bulk update the skill inventory from an external source.
   *
   * Replaces all cached skills, errors, and warnings, marks the service
   * as loaded, and notifies all listeners.
   */
  setSkills(
    skills: SkillDefinition[],
    errors: SkillError[],
    warnings: SkillWarning[],
  ): void {
    this._skills = skills;
    this._errors = errors;
    this._warnings = warnings;
    this._loaded = true;
    this._notifyListeners();
  }

  /**
   * Look up a skill by name.
   *
   * Returns the first skill whose name matches exactly, or undefined.
   */
  getSkillByName(name: string): SkillDefinition | undefined {
    return this._skills.find((s) => s.name === name);
  }

  /** Register a listener to be notified on skill state changes. */
  addListener(fn: () => void): void {
    this._listeners.add(fn);
  }

  /** Unregister a previously registered listener. */
  removeListener(fn: () => void): void {
    this._listeners.delete(fn);
  }

  // -------------------------------------------------------------------------
  // Private
  // -------------------------------------------------------------------------

  /** Notify all registered listeners. */
  private _notifyListeners(): void {
    for (const fn of this._listeners) {
      fn();
    }
  }
}

// ---------------------------------------------------------------------------
// groupSkillsByPath — matching AMP's Cq0 function
// ---------------------------------------------------------------------------

/**
 * Group non-builtin skills by their baseDir path origin.
 *
 * Matches AMP's Cq0(skills, cwd) grouping logic:
 *   - Skills with baseDir containing ".agents/skills/" relative to cwd
 *     are grouped as "Local" with pathHint ".agents/skills/"
 *   - Skills with baseDir containing "~/.agents/skills/" (home dir)
 *     are grouped as "Global" with pathHint "~/.agents/skills/"
 *   - Skills at other paths get a group labeled by the relative path
 *
 * Returns groups in a stable order: local first, then global, then others.
 *
 * @param skills - Non-builtin skills only (pre-filtered)
 * @param cwd - Current working directory for path relativization
 */
export function groupSkillsByPath(
  skills: SkillDefinition[],
  cwd: string,
): SkillGroup[] {
  const home = homedir();
  const localPattern = resolve(cwd, '.agents/skills');
  const globalPattern = resolve(home, '.agents/skills');

  const localSkills: SkillDefinition[] = [];
  const globalSkills: SkillDefinition[] = [];
  const otherGroups: Map<string, SkillDefinition[]> = new Map();

  for (const skill of skills) {
    // Convert file:// URI to filesystem path for comparison
    const basePath = skill.baseDir.startsWith('file://')
      ? fileURIToPath(skill.baseDir)
      : skill.baseDir;

    if (basePath.startsWith(localPattern)) {
      localSkills.push(skill);
    } else if (basePath.startsWith(globalPattern)) {
      globalSkills.push(skill);
    } else {
      // Group by parent directory relative to cwd
      const rel = relativizePath(basePath, cwd);
      const parentDir = rel.split('/').slice(0, -1).join('/') || rel;
      const existing = otherGroups.get(parentDir);
      if (existing) {
        existing.push(skill);
      } else {
        otherGroups.set(parentDir, [skill]);
      }
    }
  }

  const groups: SkillGroup[] = [];

  if (localSkills.length > 0) {
    groups.push({
      label: 'Local',
      pathHint: '.agents/skills/',
      skills: localSkills,
    });
  }

  if (globalSkills.length > 0) {
    groups.push({
      label: 'Global',
      pathHint: '~/.agents/skills/',
      skills: globalSkills,
    });
  }

  for (const [path, pathSkills] of otherGroups) {
    groups.push({
      label: path,
      pathHint: null,
      skills: pathSkills,
    });
  }

  return groups;
}

// ---------------------------------------------------------------------------
// relativizePath — matching AMP's A_R function
// ---------------------------------------------------------------------------

/**
 * Make an absolute path relative to cwd, using ~ for home directory prefix.
 *
 * Matches AMP's A_R(absolutePath, cwd) path display function used in
 * error/warning path rendering.
 *
 * @param absolutePath - The absolute path to relativize
 * @param cwd - Current working directory
 * @returns Relative path string (may use ~ prefix for home-based paths)
 */
export function relativizePath(absolutePath: string, cwd: string): string {
  const home = homedir();

  // Try making relative to cwd first
  const relToCwd = relative(cwd, absolutePath);

  // If the relative path doesn't go too far up, use it
  if (!relToCwd.startsWith('../../..')) {
    return relToCwd;
  }

  // Otherwise try using ~ prefix for home directory
  if (absolutePath.startsWith(home)) {
    return '~' + absolutePath.slice(home.length);
  }

  return absolutePath;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Convert a file:// URI to a filesystem path.
 *
 * Strips the "file://" prefix. Handles URL-encoded characters.
 */
function fileURIToPath(uri: string): string {
  if (uri.startsWith('file://')) {
    const path = uri.slice(7);
    try {
      return decodeURIComponent(path);
    } catch {
      return path;
    }
  }
  return uri;
}
