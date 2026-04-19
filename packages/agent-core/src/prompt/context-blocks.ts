/**
 * Context Block Collection — gather environment, guidance, skills, custom prompt,
 * and repository info into SystemPromptBlock segments.
 *
 * Reverse-engineered from: fwR (collectContextBlocks, tool-execution-engine.js 434-547)
 */

import * as os from "node:os";
import * as path from "node:path";
import type { GuidanceFile, GuidanceLoadOptions } from "@flitter/data";
import type { SystemPromptBlock } from "@flitter/llm";
import type { Config } from "@flitter/schemas";

// Re-export for consumers
export type { SystemPromptBlock };

// ─── Options ────────────────────────────────────────────

export interface ContextBlocksOptions {
  /** Return current Config (settings + secrets) */
  getConfig: () => Config;
  /** List available skill summaries: { name, description } */
  listSkills: () => Array<{ name: string; description: string }>;
  /** Workspace root directory */
  workspaceRoot: string;
  /** Current working directory */
  workingDirectory: string;
  /** Discover guidance files (AGENTS.md / CLAUDE.md) from workspace + parents */
  discoverGuidanceFiles?: (opts: GuidanceLoadOptions) => Promise<GuidanceFile[]>;
  /** Git info (optional) */
  git?: {
    isRepo: boolean;
    branch?: string | null;
  };
  /** Abort signal for cancellation */
  signal?: AbortSignal;
}

// ─── Main ───────────────────────────────────────────────

/**
 * Collect context blocks for the system prompt.
 *
 * Collection order:
 * 1. Environment block: date, working directory, OS, platform, git status
 * 2. Guidance blocks: AGENTS.md / CLAUDE.md files wrapped in <instructions> tags
 * 3. Skills block: available skills formatted as bullet list
 * 4. Custom system prompt: from config.settings.systemPrompt
 * 5. Repository info: git branch
 */
export async function collectContextBlocks(
  opts: ContextBlocksOptions,
): Promise<SystemPromptBlock[]> {
  const blocks: SystemPromptBlock[] = [];

  // 1. Environment
  blocks.push(buildEnvironmentBlock(opts));

  // 2. Guidance
  const guidanceBlocks = await buildGuidanceBlocks(opts);
  blocks.push(...guidanceBlocks);

  // 3. Skills
  const skillsBlock = buildSkillsBlock(opts);
  if (skillsBlock) blocks.push(skillsBlock);

  // 4. Custom system prompt
  const customBlock = buildCustomSystemPromptBlock(opts);
  if (customBlock) blocks.push(customBlock);

  // 5. Repository info
  const repoBlock = buildRepositoryBlock(opts);
  if (repoBlock) blocks.push(repoBlock);

  return blocks;
}

// ─── Internal builders ──────────────────────────────────

/**
 * Build environment info block.
 * Contains: today's date, working directory, OS, platform, git repo status.
 */
function buildEnvironmentBlock(opts: ContextBlocksOptions): SystemPromptBlock {
  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  const platform = os.platform();
  const osVersion = os.release();

  const lines = [
    `Today's date: ${today}`,
    `Working directory: ${opts.workingDirectory}`,
    `Platform: ${platform}`,
    `OS Version: ${osVersion}`,
    `Is directory a git repo: ${opts.git?.isRepo ? "Yes" : "No"}`,
  ];

  return {
    type: "text",
    text: lines.join("\n"),
  };
}

/**
 * Build guidance blocks from discovered AGENTS.md / CLAUDE.md files.
 * Each non-excluded file becomes a separate SystemPromptBlock
 * wrapped in <instructions> tags. Separate blocks allow
 * per-block cache_control.
 */
async function buildGuidanceBlocks(opts: ContextBlocksOptions): Promise<SystemPromptBlock[]> {
  if (!opts.discoverGuidanceFiles) return [];

  const blocks: SystemPromptBlock[] = [];

  try {
    const guidanceFiles = await opts.discoverGuidanceFiles({
      workspaceRoots: [opts.workspaceRoot],
      signal: opts.signal,
    });

    for (const file of guidanceFiles) {
      if (opts.signal?.aborted) break;
      if (file.exclude) continue;
      if (!file.content || file.content.trim().length === 0) continue;

      const relativePath = path.relative(opts.workspaceRoot, file.uri);
      const wrappedText = [
        `<instructions source="${relativePath}">`,
        file.content.trim(),
        `</instructions>`,
      ].join("\n");

      blocks.push({
        type: "text",
        text: wrappedText,
        cache_control: { type: "ephemeral", ttl: "300s" },
      });
    }
  } catch {
    // discoverGuidanceFiles failure → return empty
  }

  return blocks;
}

/**
 * Build skills list block.
 * Formats available skills as a bullet list.
 */
function buildSkillsBlock(opts: ContextBlocksOptions): SystemPromptBlock | null {
  try {
    const skills = opts.listSkills();
    if (skills.length === 0) return null;

    const skillLines = skills.map((s) => `- ${s.name}: ${s.description ?? "No description"}`);

    const text = ["Available skills:", ...skillLines].join("\n");
    return { type: "text", text };
  } catch {
    return null;
  }
}

/**
 * Build custom system prompt block from config.settings.systemPrompt.
 */
function buildCustomSystemPromptBlock(opts: ContextBlocksOptions): SystemPromptBlock | null {
  const config = opts.getConfig();
  const customPrompt = (config.settings as Record<string, unknown>).systemPrompt as
    | string
    | undefined;

  if (!customPrompt || customPrompt.trim().length === 0) return null;

  return {
    type: "text",
    text: customPrompt.trim(),
  };
}

/**
 * Build repository info block with git branch.
 */
function buildRepositoryBlock(opts: ContextBlocksOptions): SystemPromptBlock | null {
  if (!opts.git?.isRepo) return null;

  const lines: string[] = [];

  if (opts.git.branch) {
    lines.push(`Current branch: ${opts.git.branch}`);
  }

  if (lines.length === 0) return null;

  return {
    type: "text",
    text: lines.join("\n"),
  };
}
