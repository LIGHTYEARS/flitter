import * as fs from "node:fs";
import * as fsp from "node:fs/promises";
import * as path from "node:path";
import { BehaviorSubject } from "@flitter/util";
import { loadSkill, validateSkillName } from "./skill-parser.js";
import type {
  MCPServerSpec,
  Skill,
  SkillFrontmatter,
  SkillInstallResult,
  SkillScanResult,
} from "./skill-types.ts";

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

  /** Install skill from local path */
  async install(
    source: string,
    options?: { name?: string; overwrite?: boolean },
  ): Promise<SkillInstallResult> {
    // Load source to get name
    const skill = loadSkill(source);
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
    await copyDir(source, installPath);
    return { success: true, skillName: name, installedPath: installPath };
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

  private updateMcpServers(skills: Skill[]): void {
    const servers: Record<string, MCPServerSpec> = {};
    for (const skill of skills) {
      if (skill.frontmatter.mcpServers) {
        for (const [name, spec] of Object.entries(skill.frontmatter.mcpServers)) {
          servers[name] = spec;
        }
      }
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
