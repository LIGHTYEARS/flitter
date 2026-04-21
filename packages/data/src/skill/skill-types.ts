/** SKILL.md frontmatter */
export interface SkillFrontmatter {
  name: string;
  description: string;
  mcpServers?: Record<string, MCPServerSpec>;
  includeTools?: string[];
  [key: string]: unknown;
}

export interface MCPServerSpec {
  command: string;
  args?: string[];
  env?: Record<string, string>;
  /** Tool names to include from this MCP server when associated with a skill */
  includeTools?: string[];
  /** Internal: first skill that contributed this server (逆向: _ampSkillName) */
  _skillName?: string;
  /** Internal: all skills that contributed this server (逆向: _ampSkillNames) */
  _skillNames?: string[];
  /** Internal: per-skill includeTools map (逆向: _ampSkillIncludeTools) */
  _skillIncludeTools?: Record<string, string[]>;
}

/** Parsed Skill */
export interface Skill {
  name: string;
  description: string;
  baseDir: string;
  frontmatter: SkillFrontmatter;
  body: string;
  files?: SkillFile[];
}

export interface SkillFile {
  path: string; // relative path
  fullPath: string; // absolute path
  size: number;
}

export interface SkillScanResult {
  skills: Skill[];
  errors: Array<{ path: string; error: string }>;
  warnings: string[];
}

export interface SkillInstallResult {
  success: boolean;
  skillName: string;
  installedPath: string;
  error?: string;
}
