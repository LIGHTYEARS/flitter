# Tools + Agent-Core — code_tour, walkthrough, Agg-man Mode Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement `code_tour`/`walkthrough`/`walkthrough_diagram` tools (GAP-TOOL-35) and agg-man orchestrator mode (GAP-CORE-21).

**Architecture:** `code_tour` spawns a read-only subagent with `eval_git_diff`+`post_explanation` mini-tools. `walkthrough` spawns a 3-turn planner subagent that outputs diagram XML. `walkthrough_diagram` is a no-op rendering tool. Agg-man mode is a new agent mode with navigation-only tools (no Bash/Edit) and the V7R system prompt.

**Tech Stack:** TypeScript, existing SubAgentManager/ToolSpec/AGENT_MODES infrastructure.

**Amp reference:** `2026_tail_anonymous.js:140409` (code_tour schema), `2026_tail_anonymous.js:143379` (walkthrough schema), `1208_unknown_V7R.js` (aggman prompt), `1246_ThreadWorkerService_QWT.js` (aggman mode)

---

## Task 1: code_tour tool (GAP-TOOL-35 part 1)

**Files:**
- Create: `packages/agent-core/src/tools/builtin/code-tour.ts`
- Test: `packages/agent-core/src/tools/builtin/__tests__/code-tour.test.ts`

- [ ] **Step 1: Write failing test**

```ts
import { describe, test, expect } from "bun:test";
import { createCodeTourTool } from "../code-tour";

describe("code_tour tool", () => {
  test("tool spec has correct name and schema", () => {
    const tool = createCodeTourTool();
    expect(tool.name).toBe("code_tour");
    expect(tool.inputSchema.required).toContain("baseRevision");
    expect(tool.inputSchema.properties.baseRevision.pattern).toBe("^[0-9a-fA-F]{7,40}$");
    expect(tool.inputSchema.properties.focus).toBeDefined();
  });

  test("disableTimeout is true", () => {
    const tool = createCodeTourTool();
    expect(tool.executionProfile?.disableTimeout).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

- [ ] **Step 3: Implement code-tour.ts**

```ts
// packages/agent-core/src/tools/builtin/code-tour.ts
// 逆向: I2R (2026_tail_anonymous.js:140409) — code_tour tool schema
// 逆向: f2R — code_tour execution (spawns code-tour subagent)
// 逆向: a2R — code_tour system prompt

import type { ToolSpec, ToolContext, ToolResult } from "../types";

// 逆向: a2R system prompt (2026_tail_anonymous.js:14078)
const CODE_TOUR_PROMPT = `You are a code tour guide. Your job is to create a guided walkthrough of code changes.

RULES:
1. Always call eval_git_diff first with the provided base revision
2. Emit explanations in two batches: an early overview, then detailed hunk walkthrough
3. Use post_explanation for ALL output — your final message should just be "I am done"
4. Include clickable [path#L1-L10](path#L1-L10) links
5. Include unified diff hunks in explanations
6. Format as **Overview:** + short bullet lists`;

export function createCodeTourTool(): ToolSpec {
  return {
    name: "code_tour",
    description:
      "Generate a guided code tour for working changes relative to a base commit. " +
      "Use for: walking uncommitted changes, explaining complex patches, understanding " +
      "change intent and cross-file impact. " +
      "The main agent must not repeat or summarize this tool's output.",
    inputSchema: {
      type: "object" as const,
      properties: {
        baseRevision: {
          type: "string",
          pattern: "^[0-9a-fA-F]{7,40}$",
          description: "Git commit hash used as the base revision for generating the raw diff",
        },
        focus: {
          type: "string",
          description: "Optional focus area: architecture impact, risky changes, API behavior, etc.",
        },
      },
      required: ["baseRevision"],
      additionalProperties: false,
    },
    source: "builtin",
    isReadOnly: true,
    executionProfile: { disableTimeout: true },
    async execute(args: Record<string, unknown>, ctx: ToolContext): Promise<ToolResult> {
      const baseRevision = args.baseRevision as string;
      const focus = args.focus as string | undefined;

      if (!ctx.subAgentManager) {
        return { success: false, error: "SubAgentManager not available" };
      }

      const goal = focus
        ? `Create a guided code tour of changes since ${baseRevision}, focusing on: ${focus}`
        : `Create a guided code tour of changes since ${baseRevision}`;

      const result = await ctx.subAgentManager.spawn({
        type: "code-tour",
        goal,
        context: `Base revision: ${baseRevision}`,
        systemPrompt: CODE_TOUR_PROMPT,
      });

      return { success: true, output: result.output ?? "Code tour complete." };
    },
  };
}
```

- [ ] **Step 4: Register in container.ts and add to SMART_DEFERRED**

Add `code_tour` to `SMART_DEFERRED` in `agent-modes.ts` (alongside existing `code_review`).
Register `createCodeTourTool()` in the builtin tools array in `container.ts`.

- [ ] **Step 5: Run tests, commit**

```bash
git add packages/agent-core/src/tools/builtin/code-tour.ts packages/agent-core/src/tools/builtin/__tests__/code-tour.test.ts packages/agent-core/src/modes/agent-modes.ts
git commit -m "feat(tools): code_tour guided walkthrough tool (GAP-TOOL-35)"
```

---

## Task 2: walkthrough + walkthrough_diagram tools (GAP-TOOL-35 part 2)

**Files:**
- Create: `packages/agent-core/src/tools/builtin/walkthrough.ts`
- Test: `packages/agent-core/src/tools/builtin/__tests__/walkthrough.test.ts`

- [ ] **Step 1: Write failing test**

```ts
import { createWalkthroughTool, createWalkthroughDiagramTool } from "../walkthrough";

describe("walkthrough tools", () => {
  test("walkthrough tool has correct schema", () => {
    const tool = createWalkthroughTool();
    expect(tool.name).toBe("walkthrough");
    expect(tool.inputSchema.required).toContain("topic");
  });

  test("walkthrough_diagram tool has correct schema", () => {
    const tool = createWalkthroughDiagramTool();
    expect(tool.name).toBe("walkthrough_diagram");
    expect(tool.inputSchema.required).toContain("code");
    expect(tool.inputSchema.required).toContain("nodes");
  });

  test("walkthrough_diagram is read-only", () => {
    const tool = createWalkthroughDiagramTool();
    expect(tool.isReadOnly).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

- [ ] **Step 3: Implement walkthrough.ts**

```ts
// packages/agent-core/src/tools/builtin/walkthrough.ts
// 逆向: kXR (2026_tail_anonymous.js:143379) — walkthrough tool
// 逆向: $XR (2026_tail_anonymous.js:143433) — walkthrough_diagram tool
// 逆向: uXR — walkthrough execution (3-turn subagent)

import type { ToolSpec, ToolContext, ToolResult } from "../types";

export function createWalkthroughTool(): ToolSpec {
  return {
    name: "walkthrough",
    description:
      "Create an interactive walkthrough diagram for exploring a topic in the codebase. " +
      "1. Invokes a planner subagent to explore the codebase. " +
      "2. Creates a diagram structure with detailed deep-dive content for each node. " +
      "3. Returns a complete diagram where clicking nodes shows their deep dive content. " +
      "The planner has access to: Read, Grep, glob, finder.",
    inputSchema: {
      type: "object" as const,
      properties: {
        topic: { type: "string", description: "The topic or question. Be specific." },
        context: { type: "string", description: "Optional additional context." },
      },
      required: ["topic"],
      additionalProperties: false,
    },
    source: "builtin",
    isReadOnly: true,
    executionProfile: { disableTimeout: true },
    async execute(args: Record<string, unknown>, ctx: ToolContext): Promise<ToolResult> {
      const topic = args.topic as string;
      const context = args.context as string | undefined;

      if (!ctx.subAgentManager) {
        return { success: false, error: "SubAgentManager not available" };
      }

      const goal = context
        ? `Create an interactive walkthrough diagram for: ${topic}\nContext: ${context}`
        : `Create an interactive walkthrough diagram for: ${topic}`;

      const result = await ctx.subAgentManager.spawn({
        type: "walkthrough",
        goal,
        systemPrompt:
          "You are a walkthrough planner. Explore the codebase to understand the topic, " +
          "then design a mermaid diagram with 5-8 nodes. For each node, provide a title, " +
          "description, and optional code snippets or links.",
      });

      return { success: true, output: result.output ?? "Walkthrough complete." };
    },
  };
}

export function createWalkthroughDiagramTool(): ToolSpec {
  return {
    name: "walkthrough_diagram",
    description:
      "Renders an interactive Mermaid diagram where users can click nodes " +
      "to see detailed explanations, code snippets, and related links.",
    inputSchema: {
      type: "object" as const,
      properties: {
        code: { type: "string", description: "Mermaid diagram code, no HTML tags in nodes" },
        summary: { type: "string", description: "One-sentence summary of what the diagram illustrates" },
        nodes: {
          type: "object",
          description: "Metadata keyed by mermaid node ID",
          additionalProperties: {
            type: "object",
            properties: {
              title: { type: "string" },
              description: { type: "string" },
              links: {
                type: "array",
                items: {
                  type: "object",
                  properties: { label: { type: "string" }, url: { type: "string" } },
                },
              },
              codeSnippet: { type: "string" },
            },
            required: ["title", "description"],
          },
        },
      },
      required: ["code", "nodes"],
      additionalProperties: false,
    },
    source: "builtin",
    isReadOnly: true,
    async execute(args: Record<string, unknown>): Promise<ToolResult> {
      // 逆向: walkthrough_diagram is a declarative rendering tool (like mermaid)
      const code = args.code as string;
      const summary = (args.summary as string) ?? "";
      return {
        success: true,
        output: `Walkthrough diagram rendered.\n${summary}\n\`\`\`mermaid\n${code}\n\`\`\``,
      };
    },
  };
}
```

- [ ] **Step 4: Register both tools, add walkthrough + walkthrough_diagram to SMART_DEFERRED**

- [ ] **Step 5: Run tests, commit**

```bash
git add packages/agent-core/src/tools/builtin/walkthrough.ts packages/agent-core/src/tools/builtin/__tests__/walkthrough.test.ts packages/agent-core/src/modes/agent-modes.ts
git commit -m "feat(tools): walkthrough + walkthrough_diagram tools (GAP-TOOL-35)"
```

---

## Task 3: Agg-man orchestrator mode (GAP-CORE-21)

**Files:**
- Modify: `packages/agent-core/src/modes/agent-modes.ts`
- Create: `packages/agent-core/src/modes/aggman-prompt.ts`
- Test: `packages/agent-core/src/modes/__tests__/aggman.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
import { AGENT_MODES, isToolAllowedInMode } from "../agent-modes";

describe("agg-man mode", () => {
  test("AGENT_MODES has agg-man entry", () => {
    expect(AGENT_MODES["agg-man"]).toBeDefined();
    expect(AGENT_MODES["agg-man"].displayName).toBe("Agg");
  });

  test("agg-man mode allows navigation tools", () => {
    expect(isToolAllowedInMode("find_thread", "agg-man")).toBe(true);
    expect(isToolAllowedInMode("read_thread", "agg-man")).toBe(true);
    expect(isToolAllowedInMode("web_search", "agg-man")).toBe(true);
    expect(isToolAllowedInMode("create_thread", "agg-man")).toBe(true);
    expect(isToolAllowedInMode("send_message_to_thread", "agg-man")).toBe(true);
  });

  test("agg-man mode blocks execution tools", () => {
    expect(isToolAllowedInMode("Bash", "agg-man")).toBe(false);
    expect(isToolAllowedInMode("Read", "agg-man")).toBe(false);
    expect(isToolAllowedInMode("edit_file", "agg-man")).toBe(false);
    expect(isToolAllowedInMode("Task", "agg-man")).toBe(false);
  });

  test("agg-man is not visible in mode picker", () => {
    expect(AGENT_MODES["agg-man"].visible).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

- [ ] **Step 3: Implement agg-man mode**

Add to `agent-modes.ts`:

```ts
// 逆向: Ab.AGG (2026_tail_anonymous.js) — agg-man mode definition
// 逆向: jiT — aggman's allowed tools
const AGGMAN_TOOLS = [
  "find_thread", "read_thread", "web_search", "read_web_page",
  "render_agg_man", "create_project",
  "create_thread", "archive_thread", "unarchive_thread",
  "send_message_to_thread",
  "github_repo_ci_status", "read_github", "search_github",
  "commit_search", "list_directory_github", "list_repositories",
  "glob_github", "diff",
];

// In AGENT_MODES object:
"agg-man": {
  key: "agg-man",
  displayName: "Agg",
  description: "Navigate work across projects, threads, and context",
  primaryModel: "claude-opus-4-6",
  includeTools: AGGMAN_TOOLS,
  visible: false,
  uiHints: { primaryColor: { r: 26, g: 0, b: 77 }, secondaryColor: { r: 102, g: 153, b: 255 } },
},
```

- [ ] **Step 4: Create aggman-prompt.ts**

```ts
// packages/agent-core/src/modes/aggman-prompt.ts
// 逆向: V7R() (modules/1208_unknown_V7R.js) — Agg Man system prompt

export function buildAggmanSystemPrompt(): string {
  return `You are Agg Man, the platform control-plane assistant.

Your domain is workflow management: finding threads, creating threads, navigating repos, checking CI status, and coordinating work.

## Available Tools
- find_thread / read_thread — discover and inspect threads
- create_thread / send_message_to_thread — create new threads and dispatch work
- archive_thread / unarchive_thread — manage thread lifecycle
- web_search / read_web_page — research context
- GitHub tools (read_github, search_github, commit_search, diff, list_directory_github, list_repositories, glob_github) — code and CI context
- github_repo_ci_status — check CI status
- render_agg_man — render a visual self-preview

## Rules
1. After calling create_thread or send_message_to_thread, STOP. Do NOT poll for results.
2. When dispatching work to executor threads, include an explicit instruction to call send_message_to_aggman when done.
3. Only merge when the user explicitly says "merge" or "ship".
4. Never invent thread content, metadata, or outcomes.
5. Use render_agg_man only when users ask what Agg Man would look like.`;
}
```

- [ ] **Step 5: Wire aggman prompt into system prompt selector**

In the system prompt builder (where mode dispatches to different prompts), add the `"agg-man"` case to return `buildAggmanSystemPrompt()`.

- [ ] **Step 6: Run tests, commit**

```bash
git add packages/agent-core/src/modes/agent-modes.ts packages/agent-core/src/modes/aggman-prompt.ts packages/agent-core/src/modes/__tests__/aggman.test.ts
git commit -m "feat(core): agg-man orchestrator mode with navigation-only tools (GAP-CORE-21)"
```

---

## Task 4: Update GAPS.md

- [ ] **Step 1: Mark GAP-TOOL-35 (including TOOL-13, TOOL-14) and GAP-CORE-21 as closed**
- [ ] **Step 2: Commit**

```bash
git add GAPS.md
git commit -m "docs: close GAP-TOOL-35, GAP-CORE-21 — code_tour, walkthrough, agg-man mode"
```
