/**
 * System Prompt Assembly — compose the final system prompt from
 * role instructions, tool definitions, context blocks, and sub-agent modifiers.
 *
 * Reverse-engineered from: LO (buildSystemPrompt, tool-execution-engine.js 591-816)
 */
import type { SystemPromptBlock, ToolDefinition } from "@flitter/llm";

// ─── Base Role Prompt ───────────────────────────────────

/**
 * Core agent identity and behavior instructions.
 * Reverse: LO ~600-650
 */
export const BASE_ROLE_PROMPT = `You are an interactive CLI-based coding assistant. You help users with software engineering tasks including reading, writing, and editing code, running commands, searching codebases, and managing files.

Your strengths:
- Searching for code, configurations, and patterns across large codebases
- Analyzing multiple files to understand system architecture
- Investigating complex questions that require exploring many files
- Performing multi-step research tasks
- Writing, editing, and refactoring code across multiple files
- Running shell commands and interpreting their output

Guidelines:
- For file searches: Use Grep or Glob when you need to search broadly. Use Read when you know the specific file path.
- For analysis: Start broad and narrow down. Use multiple search strategies if the first doesn't yield results.
- Be thorough: Check multiple locations, consider different naming conventions, look for related files.
- NEVER create files unless they are absolutely necessary for achieving your goal. ALWAYS prefer editing an existing file to creating a new one.
- NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested.
- In your final response always share relevant file names and code snippets. Any file paths you return in your response MUST be absolute. Do NOT use relative paths.

Safety:
- NEVER execute destructive commands without explicit user confirmation.
- Be cautious with git operations that modify history (push --force, reset --hard, etc.)
- Do not commit changes unless the user explicitly asks.

Communication:
- Be concise and direct.
- When uncertain, ask for clarification rather than guessing.
- Show your reasoning for complex decisions.`;

// ─── Sub-Agent Modifier ─────────────────────────────────

/**
 * Additional constraints for sub-agent mode.
 * Reverse: LO ~780-816
 */
export const SUB_AGENT_MODIFIER = `You are operating as a sub-agent with a focused scope. Additional constraints:
- Do NOT spawn additional sub-agents or use the Task tool.
- Stay focused on the specific task assigned to you.
- Do not make assumptions about the broader context beyond your assigned task.
- Complete your work and return results promptly.`;

// ─── Options ────────────────────────────────────────────

export interface BuildSystemPromptOptions {
  /** Current available tool definitions */
  toolDefinitions: ToolDefinition[];
  /** Pre-collected context blocks (from collectContextBlocks) */
  contextBlocks: SystemPromptBlock[];
  /** Whether this is a sub-agent */
  isSubAgent?: boolean;
}

// ─── Main ───────────────────────────────────────────────

/**
 * Assemble the final system prompt.
 * Reverse: LO (buildSystemPrompt, tool-execution-engine.js 591-816)
 *
 * Assembly order:
 * 1. Base role prompt (hardcoded)
 * 2. Tool instructions block (formatted tool list)
 * 3. Context blocks (environment / guidance / skills / repo)
 * 4. Sub-agent modifier (if isSubAgent=true)
 *
 * Returns multiple SystemPromptBlock segments to allow
 * per-segment cache_control at the LLM provider level.
 */
export function buildSystemPrompt(opts: BuildSystemPromptOptions): SystemPromptBlock[] {
  const blocks: SystemPromptBlock[] = [];

  // 1. Base role prompt
  blocks.push({
    type: "text",
    text: BASE_ROLE_PROMPT,
    cache_control: { type: "ephemeral", ttl: "300s" },
  });

  // 2. Tool instructions
  const toolBlock = buildToolInstructionsBlock(opts.toolDefinitions);
  if (toolBlock) blocks.push(toolBlock);

  // 3. Context blocks
  blocks.push(...opts.contextBlocks);

  // 4. Sub-agent modifier
  if (opts.isSubAgent) {
    blocks.push({
      type: "text",
      text: SUB_AGENT_MODIFIER,
    });
  }

  return blocks;
}

// ─── Internal ───────────────────────────────────────────

/**
 * Format tool definitions into an instruction block.
 * Reverse: LO ~660-720
 */
function buildToolInstructionsBlock(toolDefinitions: ToolDefinition[]): SystemPromptBlock | null {
  if (toolDefinitions.length === 0) return null;

  const toolLines = toolDefinitions.map((tool) => `- **${tool.name}**: ${tool.description}`);

  const text = [
    "You have access to the following tools:",
    "",
    ...toolLines,
    "",
    "Use the appropriate tool for each task. You can call multiple tools in a single response when they are independent of each other.",
  ].join("\n");

  return {
    type: "text",
    text,
  };
}
