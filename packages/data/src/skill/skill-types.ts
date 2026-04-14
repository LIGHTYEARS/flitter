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
