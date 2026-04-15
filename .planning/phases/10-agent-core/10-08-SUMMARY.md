---
phase: 10
plan: 08
status: complete
---

# System Prompt Assembly — Summary

## One-Liner
Implemented the two-stage system prompt assembly: context block collection (environment, guidance files, skills, custom prompt, repo info) and final prompt construction (base role, tool instructions, context blocks, sub-agent modifier).

## What Was Built
- `collectContextBlocks(opts)` — async function that collects 5 types of context blocks:
  1. Environment block: today's date, working directory, platform, OS version, git repo status
  2. Guidance blocks: discovered AGENTS.md/CLAUDE.md files wrapped in `<instructions source="...">` tags with ephemeral cache_control
  3. Skills block: formatted as bullet list (`- name: description`)
  4. Custom system prompt: from `config.settings.systemPrompt`
  5. Repository info: git branch
- `ContextBlocksOptions` interface using callback-based dependency injection (getConfig, listSkills, discoverGuidanceFiles, git info)
- `buildSystemPrompt(opts)` — synchronous assembly of final prompt blocks:
  1. `BASE_ROLE_PROMPT` (hardcoded agent identity, capabilities, guidelines, safety, communication style) with ephemeral cache_control
  2. Tool instructions block (formatted as `- **Name**: Description` list)
  3. Appended context blocks from collectContextBlocks
  4. `SUB_AGENT_MODIFIER` (if isSubAgent=true): constraints against nested spawning, scope limitation
- `BuildSystemPromptOptions` interface (toolDefinitions, contextBlocks, isSubAgent)

## Key Decisions
- Context blocks use callback-based DI rather than importing service classes directly, maintaining loose coupling
- Each guidance file gets its own SystemPromptBlock for independent cache_control (avoids cache invalidation when one file changes)
- `listSkills` is synchronous (unlike the plan's async SkillService.getSkills); adapted to match actual @flitter/data API
- AbortSignal checked during guidance file iteration loop for cancellation support
- Guidance files with `exclude: true` or empty content are silently skipped
- buildToolInstructionsBlock returns null when no tools are defined (avoids empty block)
- Returns `SystemPromptBlock[]` array (not a single string) to support per-segment cache_control at the LLM provider level

## Test Coverage
25 tests in `system-prompt.test.ts` covering: collectContextBlocks (environment block with date/directory/OS/platform, git status with/without git, skills block with/without skills, custom systemPrompt with/without content, repository branch info, AbortSignal cancellation), buildSystemPrompt (BASE_ROLE_PROMPT in first block, tool instructions listing, no tools yields no tool block, contextBlocks appended, isSubAgent=true appends modifier, isSubAgent=false omits modifier, all blocks have correct type:text format).

## Artifacts
- `packages/agent-core/src/prompt/system-prompt.ts`
- `packages/agent-core/src/prompt/context-blocks.ts`
- `packages/agent-core/src/prompt/system-prompt.test.ts`
