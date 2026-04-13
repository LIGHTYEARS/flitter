/** Guidance file type */
export type GuidanceType = "project" | "parent" | "user" | "mentioned";

/** Guidance file frontmatter */
export interface GuidanceFrontmatter {
  globs?: string[];
  [key: string]: unknown;
}

/** Loaded guidance file */
export interface GuidanceFile {
  uri: string;
  type: GuidanceType;
  content: string;
  frontMatter: GuidanceFrontmatter | null;
  exclude: boolean;
  lineCount: number;
}

/** Guidance load options */
export interface GuidanceLoadOptions {
  workspaceRoots: string[];
  userConfigDir?: string;
  readFiles?: string[];
  maxBytesPerFile?: number; // default: 32768
  signal?: AbortSignal;
}
