import { spawn } from "node:child_process";
import * as fs from "node:fs";
import * as fsp from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { BehaviorSubject, createLogger } from "@flitter/util";
import { loadSkill, validateSkillName } from "./skill-parser.js";
import type {
  MCPServerSpec,
  Skill,
  SkillFrontmatter,
  SkillInstallResult,
  SkillScanResult,
} from "./skill-types.ts";

const log = createLogger("skill");

export interface SkillServiceOptions {
  workspaceRoot: string | null;
  userConfigDir: string;
  debounceMs?: number;
  /** Optional config getter for skills.path and skills.disableClaudeCodeSkills */
  settings?: {
    get(key: string): unknown;
  };
}

export class SkillService {
  readonly skills = new BehaviorSubject<Skill[]>([]);
  readonly errors = new BehaviorSubject<Array<{ path: string; error: string }>>([]);
  readonly mcpServersFromSkills = new BehaviorSubject<Record<string, MCPServerSpec>>({});

  private workspaceRoot: string | null;
  private userConfigDir: string;
  private debounceMs: number;
  private settings: { get(key: string): unknown } | null;
  private watchers: fs.FSWatcher[] = [];
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(options: SkillServiceOptions) {
    this.workspaceRoot = options.workspaceRoot;
    this.userConfigDir = options.userConfigDir;
    this.debounceMs = options.debounceMs ?? 500;
    this.settings = options.settings ?? null;
  }

  /**
   * Get discovery paths in priority order (KD-30, expanded to match amp P7T).
   *
   * Priority order:
   * 1. {workspaceRoot}/.flitter/skills/ (project-local, highest priority)
   * 2. ~/.config/agents/skills/ (global cross-tool agent skills)
   * 3. {ancestors}/.agents/skills (ancestor .agents dirs walking up)
   * 4. {ancestors}/.claude/skills (ancestor .claude dirs, unless disabled)
   * 5. ~/.claude/skills (global Claude skills, unless disabled)
   * 6. ~/.claude/plugins/cache (plugin skill cache, unless disabled)
   * 7. ~/.config/flitter/skills/ (userConfigDir — global flitter skills)
   * 8. skills.path config (custom colon-separated paths, lowest priority)
   *
   * 逆向: P7T() in modules/1847_unknown_P7T.js
   */
  getDiscoveryPaths(): string[] {
    const paths: string[] = [];
    const home = process.env.HOME ?? process.env.USERPROFILE ?? "";

    const disableClaudeSkills = this.settings?.get("skills.disableClaudeCodeSkills");

    // 1. Project-local .flitter/skills
    if (this.workspaceRoot) {
      paths.push(path.join(this.workspaceRoot, ".flitter", "skills"));
    }

    // 2. Global agent skills (~/.config/agents/skills)
    if (home) {
      paths.push(path.join(home, ".config", "agents", "skills"));
    }

    // 3. Ancestor .agents/skills dirs
    paths.push(...this.getAncestorPaths(path.join(".agents", "skills")));

    // 4. Ancestor .claude/skills dirs (unless disabled)
    if (!disableClaudeSkills) {
      paths.push(...this.getAncestorPaths(path.join(".claude", "skills")));
    }

    // 5. Global ~/.claude/skills (unless disabled)
    if (!disableClaudeSkills && home) {
      paths.push(path.join(home, ".claude", "skills"));
    }

    // 6. Global ~/.claude/plugins/cache (unless disabled)
    if (!disableClaudeSkills && home) {
      paths.push(path.join(home, ".claude", "plugins", "cache"));
    }

    // 7. Global flitter skills (userConfigDir/skills)
    paths.push(path.join(this.userConfigDir, "skills"));

    // 8. skills.path custom paths (colon-separated)
    const customPaths = this.settings?.get("skills.path");
    if (typeof customPaths === "string" && customPaths.length > 0) {
      for (const p of customPaths.split(":")) {
        const trimmed = p.trim();
        if (trimmed) paths.push(trimmed);
      }
    }

    return paths;
  }

  /**
   * Walk up from workspaceRoot to root, collecting paths that have the given subdirectory.
   * 逆向: P7T walks workspace ancestors for .agents/skills and .claude/skills
   */
  private getAncestorPaths(subdir: string): string[] {
    if (!this.workspaceRoot) return [];
    const paths: string[] = [];
    let dir = this.workspaceRoot;
    while (true) {
      const candidate = path.join(dir, subdir);
      paths.push(candidate);
      const parent = path.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
    return paths;
  }

  /** Scan all discovery paths for skills */
  async scan(): Promise<SkillScanResult> {
    const paths = this.getDiscoveryPaths();
    const skills: Skill[] = [];
    const errors: Array<{ path: string; error: string }> = [];
    const warnings: string[] = [];
    const seen = new Set<string>(); // dedup by name (project overrides global)

    for (const basePath of paths) {
      let entries: string[];
      try {
        entries = await fsp.readdir(basePath);
      } catch {
        continue; // directory doesn't exist
      }
      for (const entry of entries) {
        const skillDir = path.join(basePath, entry);
        try {
          const stat = await fsp.stat(skillDir);
          if (!stat.isDirectory()) continue;
        } catch {
          continue;
        }

        try {
          const skill = loadSkill(skillDir);
          if (seen.has(skill.name)) {
            warnings.push(
              `Duplicate skill "${skill.name}" at ${skillDir} (shadowed by earlier discovery)`,
            );
            continue;
          }
          seen.add(skill.name);
          skills.push(skill);
        } catch (err: unknown) {
          errors.push({
            path: skillDir,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }
    }

    skills.sort((a, b) => a.name.localeCompare(b.name));
    this.skills.next(skills);
    this.errors.next(errors);
    this.updateMcpServers(skills);
    return { skills, errors, warnings };
  }

  /** Install skill from local path or GitHub URL */
  async install(
    source: string,
    options?: { name?: string; overwrite?: boolean },
  ): Promise<SkillInstallResult> {
    let localSource = source;
    let tempDir: string | undefined;

    // Clone from GitHub if source is a URL
    // 逆向: pqR(url, signal) in modules/1322_unknown_pqR.js
    if (isGitUrl(source)) {
      try {
        tempDir = await cloneFromGit(source);
        localSource = tempDir;
      } catch (err) {
        return {
          success: false,
          skillName: options?.name ?? "unknown",
          installedPath: "",
          error: err instanceof Error ? err.message : String(err),
        };
      }
    }

    try {
      // Load source to get name
      const skill = loadSkill(localSource);
      const name = options?.name ?? skill.name;
      validateSkillName(name);

      const installBase = this.workspaceRoot
        ? path.join(this.workspaceRoot, ".flitter", "skills")
        : path.join(this.userConfigDir, "skills");
      const installPath = path.join(installBase, name);

      // Check existing
      try {
        await fsp.stat(installPath);
        if (!options?.overwrite) {
          return {
            success: false,
            skillName: name,
            installedPath: installPath,
            error: `Skill "${name}" already exists`,
          };
        }
        await fsp.rm(installPath, { recursive: true, force: true });
      } catch {
        /* doesn't exist, ok */
      }

      // Copy directory
      await fsp.mkdir(installPath, { recursive: true });
      await copyDir(localSource, installPath);
      return { success: true, skillName: name, installedPath: installPath };
    } finally {
      // Clean up temp dir from git clone
      if (tempDir) {
        await fsp.rm(tempDir, { recursive: true, force: true }).catch(() => {});
      }
    }
  }

  /** Remove installed skill */
  async remove(name: string): Promise<boolean> {
    const paths = this.getDiscoveryPaths();
    for (const basePath of paths) {
      const skillDir = path.join(basePath, name);
      try {
        await fsp.stat(skillDir);
        await fsp.rm(skillDir, { recursive: true, force: true });
        return true;
      } catch {}
    }
    return false;
  }

  /** List all installed skill frontmatters */
  list(): SkillFrontmatter[] {
    return this.skills.getValue().map((s) => s.frontmatter);
  }

  /** Start watching discovery paths */
  startWatching(): { dispose: () => void } {
    this.stopWatching();
    const paths = this.getDiscoveryPaths();
    for (const p of paths) {
      try {
        const watcher = fs.watch(p, { recursive: true, persistent: false }, (_event, filename) => {
          if (filename?.toLowerCase().endsWith("skill.md")) {
            this.debouncedScan();
          }
        });
        this.watchers.push(watcher);
      } catch {
        /* dir may not exist */
      }
    }
    return { dispose: () => this.stopWatching() };
  }

  dispose(): void {
    this.stopWatching();
  }

  private stopWatching(): void {
    for (const w of this.watchers) {
      try {
        w.close();
      } catch {
        /* ignore */
      }
    }
    this.watchers = [];
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
  }

  private debouncedScan(): void {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.scan();
    }, this.debounceMs);
  }

  /**
   * Derive merged MCP servers from skills with collision detection.
   *
   * 逆向: modules/1338_SkillService_UqR.js:73-137
   *
   * When multiple skills reference the same MCP server name:
   * - If the base specs (command, args, env) differ → warn and skip the conflicting entry
   * - If they match → merge includeTools arrays (Set dedup)
   * - Track per-skill includeTools for downstream filtering
   */
  private updateMcpServers(skills: Skill[]): void {
    const servers: Record<string, MCPServerSpec> = {};

    for (const skill of skills) {
      if (!skill.frontmatter.mcpServers) continue;
      for (const [serverName, spec] of Object.entries(skill.frontmatter.mcpServers)) {
        const existing = servers[serverName];

        if (!existing) {
          // First encounter — store with skill metadata
          const skillIncludeTools = spec.includeTools
            ? { [skill.name]: spec.includeTools }
            : undefined;
          servers[serverName] = {
            ...spec,
            _skillName: skill.name,
            _skillNames: [skill.name],
            _skillIncludeTools: skillIncludeTools,
          };
          continue;
        }

        // Collision — compare base specs (strip skill metadata + includeTools)
        const existingNames =
          existing._skillNames ?? (existing._skillName ? [existing._skillName] : []);
        const mergedNames = existingNames.includes(skill.name)
          ? existingNames
          : [...existingNames, skill.name];

        const stripMeta = (s: MCPServerSpec): Record<string, unknown> => {
          const {
            includeTools: _it,
            _skillName: _sn,
            _skillNames: _sns,
            _skillIncludeTools: _sit,
            ...base
          } = s;
          return base;
        };

        if (JSON.stringify(stripMeta(existing)) !== JSON.stringify(stripMeta(spec))) {
          log.warn("Skill MCP server name collision with different specs", {
            serverName,
            firstSkill: existingNames[0],
            conflictingSkill: skill.name,
          });
          continue;
        }

        // Specs match — merge includeTools
        const merged = Array.from(
          new Set([...(existing.includeTools ?? []), ...(spec.includeTools ?? [])]),
        );
        const mergedIncludeTools = merged.length > 0 ? merged : undefined;

        // Update per-skill tracking
        const perSkillTools: Record<string, string[]> = {
          ...(existing._skillIncludeTools ?? {}),
        };
        if (spec.includeTools) {
          perSkillTools[skill.name] = spec.includeTools;
        }

        servers[serverName] = {
          ...spec,
          includeTools: mergedIncludeTools,
          _skillName: mergedNames[0],
          _skillNames: mergedNames,
          _skillIncludeTools: Object.keys(perSkillTools).length > 0 ? perSkillTools : undefined,
        };
      }
    }

    if (Object.keys(servers).length > 0) {
      log.info("SkillService derived MCP servers from skills", {
        serverCount: Object.keys(servers).length,
        serverNames: Object.keys(servers),
      });
    }
    this.mcpServersFromSkills.next(servers);
  }
}

async function copyDir(src: string, dest: string): Promise<void> {
  const entries = await fsp.readdir(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      await fsp.mkdir(destPath, { recursive: true });
      await copyDir(srcPath, destPath);
    } else if (entry.isFile()) {
      await fsp.copyFile(srcPath, destPath);
    }
  }
}

// ─── GitHub URL support ─────────────────────────────────

/**
 * Whether a source string looks like a Git URL.
 *
 * Matches:
 * - https://github.com/...
 * - git@github.com:...
 * - github:owner/repo
 * - Any https:// URL ending in .git
 *
 * 逆向: pqR in modules/1322_unknown_pqR.js accepts arbitrary git URLs
 */
export function isGitUrl(source: string): boolean {
  if (source.startsWith("https://github.com/")) return true;
  if (source.startsWith("git@github.com:")) return true;
  if (source.startsWith("github:")) return true;
  if (/^https?:\/\/.+\.git$/i.test(source)) return true;
  return false;
}

/**
 * Normalize a GitHub shorthand to a full clone URL.
 * - `github:owner/repo` → `https://github.com/owner/repo.git`
 * - Already full URL → return as-is
 */
function normalizeGitUrl(source: string): string {
  if (source.startsWith("github:")) {
    const ownerRepo = source.slice("github:".length);
    return `https://github.com/${ownerRepo}.git`;
  }
  return source;
}

/** Clone timeout in ms (逆向: buT = 15000) */
const GIT_CLONE_TIMEOUT_MS = 15_000;

/**
 * Clone a git repository to a temporary directory.
 *
 * 逆向: pqR(T, R) in modules/1322_unknown_pqR.js
 *
 * - Creates a temp dir
 * - Runs `git clone --depth 1 <url> <tmpDir>`
 * - Returns the temp dir path on success
 * - Cleans up temp dir on failure
 * - 15 second timeout matching amp's buT
 */
export async function cloneFromGit(url: string): Promise<string> {
  const normalizedUrl = normalizeGitUrl(url);
  const tmpDir = path.join(os.tmpdir(), `flitter-skill-${Date.now().toString(36)}`);
  await fsp.mkdir(tmpDir, { recursive: true });

  return new Promise<string>((resolve, reject) => {
    let done = false;

    const proc = spawn("git", ["clone", "--depth", "1", normalizedUrl, tmpDir], {
      stdio: ["ignore", "pipe", "pipe"],
    });

    const timer = setTimeout(() => {
      if (!done) {
        done = true;
        proc.kill();
        fsp.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
        reject(new Error(`Git clone timed out after ${GIT_CLONE_TIMEOUT_MS / 1000} seconds`));
      }
    }, GIT_CLONE_TIMEOUT_MS);

    let stderr = "";
    proc.stderr?.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    proc.on("close", (code) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      if (code === 0) {
        resolve(tmpDir);
      } else {
        fsp.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
        reject(new Error(`Git clone failed: ${stderr.trim() || "Unknown error"}`));
      }
    });

    proc.on("error", (err) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      fsp.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
      reject(new Error(`Failed to run git: ${err.message}`));
    });
  });
}
