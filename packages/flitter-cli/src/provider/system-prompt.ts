// System prompt builder for flitter-cli.
//
// Constructs the system prompt sent to the LLM at the start of each
// conversation turn. Assembles context from:
// - Base identity and capabilities
// - Project-specific instructions (CLAUDE.md)
// - Git context (branch, recent commits)
// - Available tools list
// - Working directory info

import { existsSync, readFileSync } from 'node:fs';
import { join, basename } from 'node:path';
import type { ToolDefinition } from '../state/types';
import { log } from '../utils/logger';

/** Options for building the system prompt. */
export interface SystemPromptOptions {
  /** Current working directory. */
  cwd: string;
  /** Model identifier being used. */
  model: string;
  /** Provider name (e.g., 'anthropic', 'openai'). */
  providerName: string;
  /** Available tool definitions (for listing capabilities). */
  tools?: ToolDefinition[];
  /** Git branch name, if available. */
  gitBranch?: string | null;
  /** Git recent commits summary, if available. */
  gitLog?: string | null;
  /** Contents of CLAUDE.md, if found. */
  projectInstructions?: string | null;
}

/**
 * Build the complete system prompt for the LLM.
 *
 * The prompt is structured in sections:
 * 1. Identity and role
 * 2. Environment info (cwd, model, platform)
 * 3. Project instructions (CLAUDE.md)
 * 4. Git context
 * 5. Available tools summary
 * 6. Behavioral guidelines
 */
export function buildSystemPrompt(options: SystemPromptOptions): string {
  const sections: string[] = [];

  // --- Identity ---
  sections.push(
    'You are an AI coding assistant running inside flitter-cli, ' +
    'an interactive terminal tool for software engineering tasks. ' +
    'You help users with coding, debugging, refactoring, and project management.'
  );

  // --- Environment ---
  const envLines = [
    `Working directory: ${options.cwd}`,
    `Project: ${basename(options.cwd)}`,
    `Model: ${options.model}`,
    `Provider: ${options.providerName}`,
    `Platform: ${process.platform}`,
    `Date: ${new Date().toISOString().split('T')[0]}`,
  ];
  if (options.gitBranch) {
    envLines.push(`Git branch: ${options.gitBranch}`);
  }
  sections.push('<environment>\n' + envLines.join('\n') + '\n</environment>');

  // --- Project instructions (CLAUDE.md) ---
  if (options.projectInstructions) {
    sections.push(
      '<project-instructions>\n' +
      'The following instructions are from the project\'s CLAUDE.md file. ' +
      'Follow these instructions carefully:\n\n' +
      options.projectInstructions +
      '\n</project-instructions>'
    );
  }

  // --- Git context ---
  if (options.gitLog) {
    sections.push(
      '<git-context>\nRecent commits:\n' + options.gitLog + '\n</git-context>'
    );
  }

  // --- Tools ---
  if (options.tools && options.tools.length > 0) {
    const toolList = options.tools
      .map(t => `- ${t.name}: ${t.description.split('.')[0]}`)
      .join('\n');
    sections.push(
      'You have access to the following tools:\n' + toolList + '\n\n' +
      'Use tools to complete tasks. Read files before editing them. ' +
      'Prefer editing existing files over creating new ones.'
    );
  }

  // --- Behavioral guidelines ---
  sections.push(
    'Guidelines:\n' +
    '- Be concise and direct in responses.\n' +
    '- Read code before suggesting changes.\n' +
    '- Avoid over-engineering; make minimal changes needed.\n' +
    '- Do not add unnecessary comments, type annotations, or refactoring.\n' +
    '- When uncertain, investigate before assuming.'
  );

  return sections.join('\n\n');
}

/**
 * Load project instructions from CLAUDE.md files.
 *
 * Searches for CLAUDE.md in the working directory and parent directories
 * (up to 5 levels). Returns the combined contents, or null if not found.
 */
export function loadProjectInstructions(cwd: string): string | null {
  const candidates = [
    join(cwd, 'CLAUDE.md'),
    join(cwd, '.claude', 'CLAUDE.md'),
  ];

  // Walk up to 5 parent directories
  let dir = cwd;
  for (let i = 0; i < 5; i++) {
    const parent = join(dir, '..');
    if (parent === dir) break; // reached root
    dir = parent;
    candidates.push(join(dir, 'CLAUDE.md'));
  }

  const contents: string[] = [];
  const seen = new Set<string>();

  for (const path of candidates) {
    if (seen.has(path)) continue;
    seen.add(path);

    if (existsSync(path)) {
      try {
        const text = readFileSync(path, 'utf-8').trim();
        if (text) {
          contents.push(text);
          log.info(`SystemPrompt: loaded instructions from ${path}`);
        }
      } catch (err) {
        log.warn(`SystemPrompt: failed to read ${path}: ${err}`);
      }
    }
  }

  return contents.length > 0 ? contents.join('\n\n---\n\n') : null;
}

/**
 * Get git context for the working directory.
 * Returns branch name and recent commits, or null values if not a git repo.
 */
export async function getGitContext(cwd: string): Promise<{
  branch: string | null;
  log: string | null;
  repoRoot: string | null;
}> {
  try {
    const rootProc = Bun.spawn(
      ['git', 'rev-parse', '--show-toplevel'],
      { cwd, stdout: 'pipe', stderr: 'pipe' },
    );
    const rootOut = await new Response(rootProc.stdout).text();
    const rootExit = await rootProc.exited;
    const repoRoot = rootExit === 0 ? rootOut.trim() : null;

    const branchProc = Bun.spawn(
      ['git', 'rev-parse', '--abbrev-ref', 'HEAD'],
      { cwd, stdout: 'pipe', stderr: 'pipe' },
    );
    const branchOut = await new Response(branchProc.stdout).text();
    const branchExit = await branchProc.exited;
    const branch = branchExit === 0 ? branchOut.trim() : null;

    if (!branch) {
      return { branch: null, log: null, repoRoot };
    }

    const logProc = Bun.spawn(
      ['git', 'log', '--oneline', '-10', '--no-decorate'],
      { cwd, stdout: 'pipe', stderr: 'pipe' },
    );
    const logOut = await new Response(logProc.stdout).text();
    const logExit = await logProc.exited;
    const gitLog = logExit === 0 ? logOut.trim() : null;

    return { branch, log: gitLog || null, repoRoot };
  } catch {
    return { branch: null, log: null, repoRoot: null };
  }
}
