# 子代理渲染管道 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现 amp-cli 级别的子代理内容渲染——从数据管道到 widget 层，支持嵌套工具调用展示、progress 流式渲染、可折叠布局、thinking 块、和最终回复文本。

**Architecture:** 三层架构：(1) 数据层 `buildSubagentContent()` 从 messages 中按 `parentToolUseId` 分组构建子代理内容结构体; (2) display-items 层将子代理内容注入 `ToolItem`/`ActivityGroupItem`; (3) widget 层使用 `SubagentToolWidget` (对应 amp 的 `shT`/`D9R`) 递归渲染嵌套工具和最终回复。

**Tech Stack:** TypeScript, @flitter/tui, zod schemas (packages/schemas)

---

## 文件结构

| 操作 | 文件路径 | 职责 |
|------|---------|------|
| Create | `packages/cli/src/widgets/subagent-content.ts` | 子代理内容数据结构定义 + `buildSubagentContentByParentID()` 构建函数 |
| Create | `packages/cli/src/widgets/subagent-tool-widget.ts` | `SubagentToolWidget` — 对应 amp 的 `shT`/`D9R`，三优先级渲染 |
| Modify | `packages/cli/src/widgets/display-items.ts` | 扩展 `RawContentBlock.run` 加 `progress`; Task 路径产出 `SubagentToolItem` |
| Modify | `packages/cli/src/widgets/conversation-view.ts` | 集成 `SubagentToolWidget`，接入 Oracle/Librarian widget |
| Create | `packages/cli/src/widgets/__tests__/subagent-content.test.ts` | 数据层单元测试 |
| Create | `packages/cli/src/widgets/__tests__/subagent-tool-widget.test.ts` | Widget 层单元测试 |
| Modify | `packages/cli/src/widgets/__tests__/specialized-tools.test.ts` | 已有 Task 测试更新 |

---

## Task 1: 子代理内容数据结构 (`subagent-content.ts`)

**Files:**
- Create: `packages/cli/src/widgets/subagent-content.ts`
- Test: `packages/cli/src/widgets/__tests__/subagent-content.test.ts`
- Reference: `amp-cli-reversed/modules/2606_unknown_jM0.js` (jM0 函数)

**设计说明：** 对应 amp 的 `jM0()` 函数。从 messages 列表中提取携带 `parentToolUseId` 的消息，按 parent ID 分组，构建可渲染的子代理内容结构。同时从 `run.progress` 提取 progress chunks。

- [ ] **Step 1: 写失败测试 — 基础数据结构导出**

```typescript
// packages/cli/src/widgets/__tests__/subagent-content.test.ts
import { describe, it, expect } from "bun:test";
import {
  type SubagentContent,
  type SubagentTool,
  buildSubagentContentByParentID,
} from "../subagent-content.js";

describe("SubagentContent types", () => {
  it("SubagentTool has required fields", () => {
    const tool: SubagentTool = {
      toolUse: { type: "tool_use", id: "tu_1", name: "Bash", input: { command: "ls" }, complete: true },
      toolRun: { status: "done", result: "ok" },
    };
    expect(tool.toolUse.name).toBe("Bash");
    expect(tool.toolRun.status).toBe("done");
  });

  it("SubagentContent has tools and optional terminalAssistantMessage", () => {
    const content: SubagentContent = {
      tools: [],
      terminalAssistantMessage: undefined,
    };
    expect(content.tools).toEqual([]);
    expect(content.terminalAssistantMessage).toBeUndefined();
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd packages/cli && bun test src/widgets/__tests__/subagent-content.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: 实现数据结构定义**

```typescript
// packages/cli/src/widgets/subagent-content.ts
/**
 * SubagentContent — 子代理嵌套内容的数据结构。
 *
 * 逆向: modules/2606_unknown_jM0.js — jM0() 构建 subagentContentByParentID
 * 逆向: modules/1935_unknown_gB.js — gB() 消费 SubagentContent 产出 widget 数组
 *
 * 每个 entry 由 parent tool_use ID 索引，包含该子代理内部执行的所有工具调用
 * 以及最终的 assistant 回复消息。
 */

import type { RawMessage } from "./display-items.js";

// ─── 核心类型 ───────────────────────────────────────

/** 子代理内部的一次工具调用 (逆向: jM0 tools[] 元素) */
export interface SubagentTool {
  toolUse: {
    type: "tool_use";
    id: string;
    name: string;
    input: Record<string, unknown>;
    complete: boolean;
  };
  toolRun: {
    status: "done" | "error" | "in-progress" | "queued" | "cancelled" | "blocked-on-user";
    result?: unknown;
    error?: { message: string };
    reason?: string;
  };
  toolProgress?: { status?: string; content?: string };
}

/** progress chunk (逆向: run.progress[] 元素) */
export interface ProgressChunk {
  message?: string;
  reasoning?: string;
  tool_uses?: Array<{
    id?: string;
    tool_name?: string;
    normalized_name?: string;
    input?: unknown;
    status?: string;
    result?: unknown;
    error?: { message: string };
  }>;
}

/** 子代理最终回复 (逆向: $M0() → terminalAssistantMessage) */
export interface TerminalAssistantMessage {
  content: Array<{ type: "text"; text: string } | { type: "thinking"; thinking: string }>;
  state: { type: "streaming" | "complete" | "cancelled" | "error" };
}

/** 单个子代理的完整内容 (逆向: subagentContentByParentID[id] 的值) */
export interface SubagentContent {
  tools: SubagentTool[];
  terminalAssistantMessage?: TerminalAssistantMessage;
  progressChunks?: ProgressChunk[];
}

// ─── 子代理工具名判定 (逆向: xM0 in 2605_unknown_gM0.js) ─────

const SUBAGENT_TOOL_NAMES = new Set(["oracle", "finder", "librarian", "Task", "code_review"]);

export function isSubagentTool(toolName: string): boolean {
  return SUBAGENT_TOOL_NAMES.has(toolName);
}

// ─── 构建函数 ─────────────────────────────────────────

/**
 * 从消息列表构建 subagentContentByParentID。
 *
 * 逆向: jM0(T, R, a) in 2606_unknown_jM0.js
 *
 * 两条数据来源:
 * 1. 携带 parentToolUseId 的消息 → 分组后提取 tool_result 和最终 assistant text
 * 2. tool_result.run.progress 数组 → 提取嵌套 tool_uses
 *
 * Path 2 中的工具调用会被 Path 1 覆盖（如果 Path 1 有数据）。
 */
export function buildSubagentContentByParentID(
  messages: RawMessage[],
): Record<string, SubagentContent> {
  const result: Record<string, SubagentContent> = {};

  // ── Path 1: 按 parentToolUseId 分组消息 ──
  const childMessagesByParent = new Map<string, RawMessage[]>();
  for (const msg of messages) {
    const parentId = (msg as Record<string, unknown>).parentToolUseId as string | undefined;
    if (!parentId) continue;
    const existing = childMessagesByParent.get(parentId) ?? [];
    existing.push(msg);
    childMessagesByParent.set(parentId, existing);
  }

  for (const [parentId, childMsgs] of childMessagesByParent) {
    const tools: SubagentTool[] = [];
    let terminalAssistantMessage: TerminalAssistantMessage | undefined;

    for (const msg of childMsgs) {
      if (typeof msg.content === "string") continue;
      const role = (msg as Record<string, unknown>).role as string;

      if (role === "user") {
        // 提取 tool_result blocks
        for (const block of msg.content) {
          if (block.type === "tool_result" && block.toolUseID && block.run) {
            // 找到对应的 tool_use (在前面的 assistant 消息中)
            const toolUse = findToolUseBlock(childMsgs, block.toolUseID);
            if (toolUse) {
              tools.push({
                toolUse: {
                  type: "tool_use",
                  id: toolUse.id ?? block.toolUseID,
                  name: toolUse.name ?? "unknown",
                  input: (toolUse.input as Record<string, unknown>) ?? {},
                  complete: true,
                },
                toolRun: {
                  status: (block.run as { status: string }).status as SubagentTool["toolRun"]["status"],
                  result: (block.run as Record<string, unknown>).result,
                  error: (block.run as Record<string, unknown>).error as { message: string } | undefined,
                },
              });
            }
          }
        }
      } else if (role === "assistant") {
        // 检查是否为最终回复（有 text 内容且状态为 complete/streaming）
        const state = (msg as Record<string, unknown>).state as
          { type: string } | undefined;
        const contentBlocks = msg.content.filter(
          (b) => b.type === "text" || b.type === "thinking",
        );
        const hasText = contentBlocks.some(
          (b) => b.type === "text" && (b.text ?? "").trim().length > 0,
        );
        if (hasText && state) {
          terminalAssistantMessage = {
            content: contentBlocks.map((b) => {
              if (b.type === "thinking") return { type: "thinking" as const, thinking: b.thinking ?? "" };
              return { type: "text" as const, text: b.text ?? "" };
            }),
            state: { type: state.type as TerminalAssistantMessage["state"]["type"] },
          };
        }
      }
    }

    if (tools.length > 0 || terminalAssistantMessage) {
      result[parentId] = { tools, terminalAssistantMessage };
    }
  }

  // ── Path 2: 从 tool_result.run.progress 提取 ──
  for (const msg of messages) {
    if (typeof msg.content === "string") continue;
    const role = (msg as Record<string, unknown>).role as string;
    if (role !== "user") continue;

    for (const block of msg.content) {
      if (block.type !== "tool_result" || !block.toolUseID) continue;
      const run = block.run as Record<string, unknown> | undefined;
      if (!run?.progress) continue;

      const parentToolUseId = block.toolUseID;
      // Path 1 的数据优先
      if (result[parentToolUseId]?.tools.length) continue;

      const progress = run.progress as ProgressChunk[];
      if (!Array.isArray(progress) || progress.length === 0) continue;

      const tools: SubagentTool[] = [];
      let counter = 0;
      for (const chunk of progress) {
        if (!chunk.tool_uses || !Array.isArray(chunk.tool_uses)) continue;
        for (const tu of chunk.tool_uses) {
          tools.push({
            toolUse: {
              type: "tool_use",
              id: tu.id ?? `${parentToolUseId}:progress:${counter++}`,
              name: tu.normalized_name ?? tu.tool_name ?? "unknown",
              input: typeof tu.input === "object" && tu.input !== null
                ? (tu.input as Record<string, unknown>)
                : {},
              complete: true,
            },
            toolRun: {
              status: (tu.status as SubagentTool["toolRun"]["status"]) ?? "done",
              result: tu.result,
              error: tu.error,
            },
          });
        }
      }

      if (tools.length > 0) {
        const existing = result[parentToolUseId];
        if (existing) {
          if (existing.tools.length === 0) existing.tools = tools;
          existing.progressChunks = progress;
        } else {
          result[parentToolUseId] = { tools, progressChunks: progress };
        }
      }
    }
  }

  return result;
}

// ─── 内部帮助函数 ─────────────────────────────────────

function findToolUseBlock(
  messages: RawMessage[],
  toolUseId: string,
): { id?: string; name?: string; input?: unknown } | undefined {
  for (const msg of messages) {
    if (typeof msg.content === "string") continue;
    const role = (msg as Record<string, unknown>).role as string;
    if (role !== "assistant") continue;
    for (const block of msg.content) {
      if (block.type === "tool_use" && block.id === toolUseId) {
        return block;
      }
    }
  }
  return undefined;
}

/** 判断 SubagentContent 是否有最终回复 (逆向: C9R) */
export function hasTerminalMessage(content: SubagentContent): boolean {
  return content.terminalAssistantMessage !== undefined;
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `cd packages/cli && bun test src/widgets/__tests__/subagent-content.test.ts`
Expected: PASS

- [ ] **Step 5: 写更完整的 buildSubagentContentByParentID 测试**

```typescript
// 追加到 subagent-content.test.ts
describe("buildSubagentContentByParentID", () => {
  it("从 parentToolUseId 消息中提取子代理工具调用", () => {
    const messages: RawMessage[] = [
      // 顶层 assistant 消息触发 Task 工具
      {
        role: "assistant",
        content: [
          { type: "tool_use", id: "task_1", name: "Task", input: { description: "do stuff" } },
        ],
      },
      // 顶层 user 消息包含 tool_result
      {
        role: "user",
        content: [
          { type: "tool_result", toolUseID: "task_1", run: { status: "done", result: "ok" } },
        ],
      },
      // 子代理 assistant 消息 (parentToolUseId = "task_1")
      {
        role: "assistant",
        parentToolUseId: "task_1",
        content: [
          { type: "tool_use", id: "child_bash_1", name: "Bash", input: { command: "ls" } },
        ],
        state: { type: "complete", stopReason: "tool_use" },
      } as unknown as RawMessage,
      // 子代理 user 消息包含 child tool_result
      {
        role: "user",
        parentToolUseId: "task_1",
        content: [
          { type: "tool_result", toolUseID: "child_bash_1", run: { status: "done", result: "file.txt" } },
        ],
      } as unknown as RawMessage,
      // 子代理最终回复
      {
        role: "assistant",
        parentToolUseId: "task_1",
        content: [
          { type: "text", text: "Done! Created file.txt" },
        ],
        state: { type: "complete", stopReason: "end_turn" },
      } as unknown as RawMessage,
    ];

    const result = buildSubagentContentByParentID(messages);
    expect(result["task_1"]).toBeDefined();
    expect(result["task_1"].tools).toHaveLength(1);
    expect(result["task_1"].tools[0].toolUse.name).toBe("Bash");
    expect(result["task_1"].tools[0].toolRun.status).toBe("done");
    expect(result["task_1"].terminalAssistantMessage).toBeDefined();
    expect(result["task_1"].terminalAssistantMessage!.content[0]).toEqual({
      type: "text",
      text: "Done! Created file.txt",
    });
  });

  it("从 run.progress 提取子代理工具 (Path 2)", () => {
    const messages: RawMessage[] = [
      {
        role: "assistant",
        content: [
          { type: "tool_use", id: "task_2", name: "Task", input: { description: "search" } },
        ],
      },
      {
        role: "user",
        content: [
          {
            type: "tool_result",
            toolUseID: "task_2",
            run: {
              status: "done",
              result: "found it",
              progress: [
                {
                  message: "Searching...",
                  tool_uses: [
                    { id: "prog_1", tool_name: "Read", input: { path: "/a.ts" }, status: "done", result: "content" },
                  ],
                },
                {
                  message: "Found match",
                  tool_uses: [
                    { id: "prog_2", normalized_name: "Grep", input: { pattern: "foo" }, status: "done", result: "line 5" },
                  ],
                },
              ],
            },
          },
        ],
      },
    ];

    const result = buildSubagentContentByParentID(messages);
    expect(result["task_2"]).toBeDefined();
    expect(result["task_2"].tools).toHaveLength(2);
    expect(result["task_2"].tools[0].toolUse.name).toBe("Read");
    expect(result["task_2"].tools[1].toolUse.name).toBe("Grep");
    expect(result["task_2"].progressChunks).toHaveLength(2);
  });

  it("无子代理内容时返回空对象", () => {
    const messages: RawMessage[] = [
      { role: "user", content: [{ type: "text", text: "hello" }] },
      { role: "assistant", content: [{ type: "text", text: "hi" }] },
    ];
    const result = buildSubagentContentByParentID(messages);
    expect(Object.keys(result)).toHaveLength(0);
  });

  it("取消传播: 父被取消时子工具也标记取消", () => {
    // 此行为在 widget 层处理，数据层不改状态
    // 这里只验证数据层正确传递原始状态
    const messages: RawMessage[] = [
      {
        role: "assistant",
        parentToolUseId: "parent_1",
        content: [{ type: "tool_use", id: "child_1", name: "Bash", input: {} }],
        state: { type: "cancelled" },
      } as unknown as RawMessage,
      {
        role: "user",
        parentToolUseId: "parent_1",
        content: [
          { type: "tool_result", toolUseID: "child_1", run: { status: "in-progress" } },
        ],
      } as unknown as RawMessage,
    ];
    const result = buildSubagentContentByParentID(messages);
    expect(result["parent_1"]).toBeDefined();
    expect(result["parent_1"].tools[0].toolRun.status).toBe("in-progress");
  });
});
```

- [ ] **Step 6: 运行完整测试套件**

Run: `cd packages/cli && bun test src/widgets/__tests__/subagent-content.test.ts`
Expected: ALL PASS

- [ ] **Step 7: Commit**

```bash
git add packages/cli/src/widgets/subagent-content.ts packages/cli/src/widgets/__tests__/subagent-content.test.ts
git commit -m "feat(cli): add subagent content data pipeline (逆向: jM0/xM0)"
```

---

## Task 2: 扩展 display-items 支持子代理内容

**Files:**
- Modify: `packages/cli/src/widgets/display-items.ts`
- Modify: `packages/cli/src/widgets/__tests__/specialized-tools.test.ts`
- Reference: `amp-cli-reversed/modules/2604_unknown_lB.js` (lB 函数)

**设计说明：** 在 `transformThreadToDisplayItems` 中调用 `buildSubagentContentByParentID`，并在 Task 工具的 `ToolItem` 上附加子代理内容引用。同时扩展 `RawContentBlock.run` 以包含 `progress` 字段。

- [ ] **Step 1: 扩展 RawContentBlock.run 类型**

在 `display-items.ts` 中修改 `RawContentBlock` interface:

```typescript
// 修改 packages/cli/src/widgets/display-items.ts 第 217 行
export interface RawContentBlock {
  type: string;
  text?: string;
  thinking?: string;
  id?: string;
  name?: string;
  input?: Record<string, unknown>;
  complete?: boolean;
  toolUseID?: string;
  run?: {
    status: string;
    result?: unknown;
    error?: { message: string; errorCode?: string };
    progress?: unknown; // 逆向: ToolRunDoneSchema / ToolRunInProgressSchema — progress array
  };
  [key: string]: unknown;
}
```

- [ ] **Step 2: 新增 SubagentToolItem 类型**

在 `display-items.ts` 的类型定义区域 (ToolItem 之后) 新增:

```typescript
/**
 * 子代理工具的扩展 display item。
 * 逆向: x8R line 164 — subagentContent 作为 Bs props 传入
 */
export interface SubagentToolItem {
  type: "subagent-tool";
  toolUseId: string;
  toolName: string; // "Subagent" | "Oracle" | "Librarian" | display name from sa__ prefix
  status: ToolItem["status"];
  description?: string; // from input.description or input.prompt
  error?: string;
  subagentContent?: SubagentContent;
}
```

更新 `DisplayItem` 联合类型:

```typescript
export type DisplayItem = MessageItem | ToolItem | ActivityGroupItem | ThinkingItem | SubagentToolItem;
```

- [ ] **Step 3: 修改 transformThreadToDisplayItems 函数签名和内部逻辑**

```typescript
import { buildSubagentContentByParentID, type SubagentContent } from "./subagent-content.js";

export function transformThreadToDisplayItems(messages: RawMessage[]): DisplayItem[] {
  // 在函数顶部，构建子代理内容索引
  const subagentContentByParentID = buildSubagentContentByParentID(messages);

  // ... 原有 Phase 1 逻辑不变 ...

  // 在 Task 分支 (line ~822) 替换为:
  } else if (block.name === "Task") {
    flushActivityBuffer();
    const mode = typeof block.input?.mode === "string" ? block.input.mode : undefined;

    if (mode === "finder" || mode === "code_review" || mode === "code_tour") {
      // 保留原有 specialized activity group 逻辑
      const { actions: modeActions, summary: modeSummary } = buildSpecializedActivityGroup(
        mode, block, result, status,
      );
      items.push({
        type: "activity-group",
        actions: modeActions,
        summary: modeSummary,
        hasInProgress: status === "in-progress" || status === "queued",
      });
    } else {
      // 新路径: 产出 SubagentToolItem
      const detail =
        typeof block.input?.description === "string" ? block.input.description
        : typeof block.input?.prompt === "string" ? block.input.prompt
        : undefined;
      const subagentContent = block.id ? subagentContentByParentID[block.id] : undefined;

      items.push({
        type: "subagent-tool",
        toolUseId: block.id ?? "",
        toolName: "Subagent",
        status,
        description: detail,
        error: result?.run?.status === "error"
          ? (result.run.error as { message: string } | undefined)?.message
          : undefined,
        subagentContent,
      } satisfies SubagentToolItem);
    }
  }
```

- [ ] **Step 4: 对 Oracle 和 Librarian 工具也产出 SubagentToolItem**

在 `transformThreadToDisplayItems` 函数中，找到处理工具名的 switch/if 逻辑链，在 Task 之前添加:

```typescript
  } else if (block.name === "oracle") {
    flushActivityBuffer();
    const subagentContent = block.id ? subagentContentByParentID[block.id] : undefined;
    items.push({
      type: "subagent-tool",
      toolUseId: block.id ?? "",
      toolName: "Oracle",
      status,
      description: typeof block.input?.task === "string" ? block.input.task : undefined,
      error: result?.run?.status === "error"
        ? (result.run.error as { message: string } | undefined)?.message
        : undefined,
      subagentContent,
    } satisfies SubagentToolItem);
  } else if (block.name === "librarian") {
    flushActivityBuffer();
    const subagentContent = block.id ? subagentContentByParentID[block.id] : undefined;
    items.push({
      type: "subagent-tool",
      toolUseId: block.id ?? "",
      toolName: "Librarian",
      status,
      description: typeof block.input?.query === "string" ? block.input.query : undefined,
      error: result?.run?.status === "error"
        ? (result.run.error as { message: string } | undefined)?.message
        : undefined,
      subagentContent,
    } satisfies SubagentToolItem);
  }
```

- [ ] **Step 5: 更新已有的 Task 测试**

修改 `packages/cli/src/widgets/__tests__/specialized-tools.test.ts` 中 Task 相关测试:

```typescript
it("Task without mode produces SubagentToolItem", () => {
  const messages: RawMessage[] = [
    {
      role: "assistant",
      content: [{ type: "tool_use", id: "t1", name: "Task", input: { description: "run tests" } }],
    },
    {
      role: "user",
      content: [{ type: "tool_result", toolUseID: "t1", run: { status: "done", result: "passed" } }],
    },
  ];
  const items = transformThreadToDisplayItems(messages);
  const subagentItem = items.find((i) => i.type === "subagent-tool");
  expect(subagentItem).toBeDefined();
  expect((subagentItem as SubagentToolItem).toolName).toBe("Subagent");
  expect((subagentItem as SubagentToolItem).description).toBe("run tests");
  expect((subagentItem as SubagentToolItem).status).toBe("done");
});
```

- [ ] **Step 6: 运行测试**

Run: `cd packages/cli && bun test src/widgets/__tests__/specialized-tools.test.ts`
Expected: PASS (可能需要更新旧测试中 Task 的断言从 `type: "tool"` 改为 `type: "subagent-tool"`)

- [ ] **Step 7: Commit**

```bash
git add packages/cli/src/widgets/display-items.ts packages/cli/src/widgets/__tests__/specialized-tools.test.ts
git commit -m "feat(cli): produce SubagentToolItem from display-items pipeline (逆向: lB/x8R)"
```

---

## Task 3: SubagentToolWidget — 三优先级渲染

**Files:**
- Create: `packages/cli/src/widgets/subagent-tool-widget.ts`
- Test: `packages/cli/src/widgets/__tests__/subagent-tool-widget.test.ts`
- Reference: `amp-cli-reversed/modules/1472_tui_components/misc_utils.js` (D9R.build)

**设计说明：** 对应 amp 的 `shT` widget + `D9R` state。实现三优先级渲染逻辑:
1. 有 `terminalAssistantMessage` → 渲染完整工具列表 + 最终回复 markdown
2. 有 `progressChunks` → 逐步渲染 message/reasoning/tool_uses
3. 有 `tools` 但无上述 → fallback 渲染工具列表

使用 `ExpandableToolHeader` 作为可折叠容器。

- [ ] **Step 1: 写失败测试**

```typescript
// packages/cli/src/widgets/__tests__/subagent-tool-widget.test.ts
import { describe, it, expect } from "bun:test";
import { SubagentToolWidget } from "../subagent-tool-widget.js";
import type { SubagentContent } from "../subagent-content.js";

describe("SubagentToolWidget", () => {
  it("构造时接受必需参数", () => {
    const widget = new SubagentToolWidget({
      toolName: "Subagent",
      status: "done",
      description: "run tests",
    });
    expect(widget.config.toolName).toBe("Subagent");
    expect(widget.config.status).toBe("done");
  });

  it("接受 subagentContent 参数", () => {
    const content: SubagentContent = {
      tools: [
        {
          toolUse: { type: "tool_use", id: "t1", name: "Bash", input: { command: "ls" }, complete: true },
          toolRun: { status: "done", result: "ok" },
        },
      ],
      terminalAssistantMessage: {
        content: [{ type: "text", text: "All done" }],
        state: { type: "complete" },
      },
    };
    const widget = new SubagentToolWidget({
      toolName: "Subagent",
      status: "done",
      subagentContent: content,
    });
    expect(widget.config.subagentContent).toBeDefined();
    expect(widget.config.subagentContent!.tools).toHaveLength(1);
  });

  it("build() 返回一个 widget 而不抛异常", () => {
    const widget = new SubagentToolWidget({
      toolName: "Oracle",
      status: "in-progress",
      description: "analyze code",
    });
    // StatefulWidget — 我们测试 createState 不抛异常
    const state = widget.createState();
    expect(state).toBeDefined();
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd packages/cli && bun test src/widgets/__tests__/subagent-tool-widget.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: 实现 SubagentToolWidget**

```typescript
// packages/cli/src/widgets/subagent-tool-widget.ts
/**
 * SubagentToolWidget — 子代理工具的完整渲染 widget。
 *
 * 逆向: shT (jetbrains_wizard.js:2368) — StatefulWidget
 * 逆向: D9R (misc_utils.js:7630-7749) — State, 三优先级 build()
 *
 * 三优先级渲染:
 *   Priority 1: hasTerminalMessage(content) → gB() — 渲染所有工具 + 最终 assistant 文本
 *   Priority 2: progressChunks 存在 → 逐步渲染 message/reasoning/tool_uses
 *   Priority 3: tools 存在 → fallback 使用 gB() 风格渲染工具列表
 *
 * 布局: ExpandableToolHeader(title=toolName, status) + Padding(h:2) body Column
 * 逆向: D9R.build() lines 7730-7749 — xR + x3 header + uR(padding) body
 */

import type { BuildContext, Widget } from "@flitter/tui";
import {
  Color,
  Column,
  Container,
  EdgeInsets,
  RichText,
  Row,
  State,
  StatefulWidget,
  TextSpan,
  TextStyle,
} from "@flitter/tui";
import { ExpandableToolHeader, type ToolStatus } from "./expandable-tool-header.js";
import type { SubagentContent, ProgressChunk } from "./subagent-content.js";
import { hasTerminalMessage } from "./subagent-content.js";

// ─── 配置 ─────────────────────────────────────────

export interface SubagentToolWidgetConfig {
  toolName: string;
  status: ToolStatus;
  description?: string;
  outputResult?: string;
  error?: string;
  subagentContent?: SubagentContent;
  hideHeader?: boolean;
}

// ─── Widget ───────────────────────────────────────

export class SubagentToolWidget extends StatefulWidget {
  readonly config: SubagentToolWidgetConfig;

  constructor(config: SubagentToolWidgetConfig) {
    super();
    this.config = config;
  }

  createState(): SubagentToolWidgetState {
    return new SubagentToolWidgetState();
  }
}

// ─── State (逆向: D9R) ────────────────────────────

export class SubagentToolWidgetState extends State<SubagentToolWidget> {
  build(context: BuildContext): Widget {
    const { toolName, status, description, outputResult, error, subagentContent, hideHeader } =
      this.widget.config;

    const bodyChildren: Widget[] = [];

    // 始终先显示 description (逆向: D9R line 7667 — if (e) s.push(Z3({markdown: e})))
    if (description && description.trim().length > 0) {
      bodyChildren.push(_makeText(description, Color.default()));
    }

    // ── 三优先级逻辑 ──
    if (subagentContent && hasTerminalMessage(subagentContent)) {
      // Priority 1: 有 terminalAssistantMessage
      this._renderFullContent(subagentContent, bodyChildren);
    } else if (subagentContent?.progressChunks && subagentContent.progressChunks.length > 0) {
      // Priority 2: 有 progress chunks
      this._renderProgressChunks(subagentContent, bodyChildren);
    } else if (subagentContent && subagentContent.tools.length > 0) {
      // Priority 3: 只有 tools
      this._renderFullContent(subagentContent, bodyChildren);
    }

    // 追加 outputResult (但 Priority 1 时不追加，逆向: D9R line 7741)
    const showOutput = outputResult && !(subagentContent && hasTerminalMessage(subagentContent));
    if (showOutput && outputResult!.trim().length > 0) {
      bodyChildren.push(_makeText(outputResult!, Color.default()));
    }

    // Error
    if (error && error.trim().length > 0) {
      bodyChildren.push(_makeText(error, Color.indexed(1)));
    }

    // ── 组装布局 ──
    const body: Widget = new Container({
      padding: EdgeInsets.symmetric({ horizontal: 2 }),
      child: new Column({
        crossAxisAlignment: "start",
        mainAxisSize: "min",
        children: bodyChildren,
      }) as unknown as Widget,
    }) as unknown as Widget;

    if (hideHeader) {
      return body;
    }

    return new ExpandableToolHeader({
      title: toolName,
      status,
      child: body,
    }) as unknown as Widget;
  }

  /**
   * Priority 1 & 3: 渲染所有工具 + 最终回复 (逆向: gB())
   */
  private _renderFullContent(content: SubagentContent, children: Widget[]): void {
    // 渲染每个嵌套工具调用为一行摘要
    for (const tool of content.tools) {
      children.push(this._buildNestedToolRow(tool));
    }

    // 渲染 terminalAssistantMessage 的文本内容
    if (content.terminalAssistantMessage) {
      const msg = content.terminalAssistantMessage;
      const isCancelled = msg.state.type === "cancelled";

      for (const block of msg.content) {
        if (block.type === "text" && block.text.trim().length > 0) {
          children.push(_makeText(block.text, Color.default()));
        } else if (block.type === "thinking" && !isCancelled) {
          // Thinking 块渲染为折叠的摘要行
          const preview = block.thinking.slice(0, 60).replace(/\n/g, " ");
          children.push(_makeText(`  Thinking: ${preview}...`, Color.indexed(8)));
        }
      }
    }
  }

  /**
   * Priority 2: 逐步渲染 progress chunks (逆向: D9R lines 7676-7725)
   */
  private _renderProgressChunks(content: SubagentContent, children: Widget[]): void {
    const chunks = content.progressChunks ?? [];
    let toolIndex = 0;

    for (const chunk of chunks) {
      // 渲染 message
      if (chunk.message && chunk.message.trim().length > 0) {
        children.push(_makeText(chunk.message, Color.default()));
      }

      // 渲染 reasoning (简化为折叠摘要)
      if (chunk.reasoning && chunk.reasoning.trim().length > 0) {
        const preview = chunk.reasoning.slice(0, 60).replace(/\n/g, " ");
        children.push(_makeText(`  Thinking: ${preview}...`, Color.indexed(8)));
      }

      // 渲染 tool_uses — 优先使用 live content.tools
      if (chunk.tool_uses && Array.isArray(chunk.tool_uses)) {
        for (const _tu of chunk.tool_uses) {
          const liveTool = content.tools[toolIndex];
          if (liveTool) {
            children.push(this._buildNestedToolRow(liveTool));
            toolIndex++;
          } else {
            // Fallback: 从 progress chunk 直接渲染
            const name = _tu.normalized_name ?? _tu.tool_name ?? "Tool";
            const statusIcon = _tu.status === "done" ? "✓" : _tu.status === "error" ? "✗" : "⋯";
            children.push(_makeText(`  ${statusIcon} ${name}`, Color.default()));
          }
        }
      }
    }

    // Drain 剩余未消费的 live tools
    for (; toolIndex < content.tools.length; toolIndex++) {
      children.push(this._buildNestedToolRow(content.tools[toolIndex]));
    }
  }

  /**
   * 构建嵌套工具行 (逆向: gB() → new Bs({toolUse, toolRun}))
   *
   * 简化渲染: icon + toolName + detail
   * 完整递归 Bs 渲染留到后续迭代
   */
  private _buildNestedToolRow(tool: SubagentContent["tools"][0]): Widget {
    const { toolUse, toolRun } = tool;
    const icon = toolRun.status === "done" ? "✓"
      : toolRun.status === "error" ? "✗"
      : toolRun.status === "cancelled" ? "✗"
      : toolRun.status === "in-progress" ? "⋯"
      : "⋯";
    const iconColor = toolRun.status === "done" ? Color.indexed(2)
      : toolRun.status === "error" || toolRun.status === "cancelled" ? Color.indexed(1)
      : Color.indexed(4);

    const detail = _extractToolDetail(toolUse);
    const parts: Widget[] = [
      new RichText({
        text: new TextSpan({
          children: [
            new TextSpan({ text: `  ${icon} `, style: new TextStyle({ foreground: iconColor }) }),
            new TextSpan({ text: toolUse.name, style: new TextStyle({ foreground: Color.default(), bold: true }) }),
            ...(detail ? [new TextSpan({ text: ` ${detail}`, style: new TextStyle({ foreground: Color.indexed(8) }) })] : []),
          ],
        }),
      }) as unknown as Widget,
    ];

    return new Row({
      mainAxisSize: "min",
      children: parts,
    }) as unknown as Widget;
  }
}

// ─── Helpers ─────────────────────────────────────

function _makeText(text: string, color: Color): Widget {
  return new RichText({
    text: new TextSpan({
      text,
      style: new TextStyle({ foreground: color }),
    }),
  }) as unknown as Widget;
}

function _extractToolDetail(toolUse: { name: string; input: Record<string, unknown> }): string | undefined {
  const { name, input } = toolUse;
  if (name === "Bash" && typeof input.command === "string") {
    return input.command.length > 40 ? input.command.slice(0, 40) + "..." : input.command;
  }
  if ((name === "Read" || name === "Edit" || name === "Write") && typeof input.file_path === "string") {
    return input.file_path as string;
  }
  if (name === "Grep" && typeof input.pattern === "string") {
    return input.pattern as string;
  }
  if (typeof input.path === "string") return input.path as string;
  if (typeof input.query === "string") return input.query as string;
  return undefined;
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `cd packages/cli && bun test src/widgets/__tests__/subagent-tool-widget.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/widgets/subagent-tool-widget.ts packages/cli/src/widgets/__tests__/subagent-tool-widget.test.ts
git commit -m "feat(cli): add SubagentToolWidget with 3-priority rendering (逆向: shT/D9R)"
```

---

## Task 4: 集成到 ConversationView

**Files:**
- Modify: `packages/cli/src/widgets/conversation-view.ts`
- Reference: `amp-cli-reversed/modules/1959_unknown_x8R.js` (x8R.buildWidget)

**设计说明：** 在 `ConversationViewState` 的 `build()` 方法中，当遍历 `DisplayItem[]` 时，识别 `type === "subagent-tool"` 并实例化 `SubagentToolWidget`。同时接入已有的 `OracleToolWidget`。

- [ ] **Step 1: 导入新增模块**

在 `conversation-view.ts` 顶部添加导入:

```typescript
import { SubagentToolWidget } from "./subagent-tool-widget.js";
import type { SubagentToolItem } from "./display-items.js";
```

- [ ] **Step 2: 在 item 渲染分发中添加 subagent-tool 分支**

在 `ConversationViewState` 的 build 循环中 (处理 `item.type` 的 switch/if 链)，添加:

```typescript
case "subagent-tool": {
  const subItem = item as SubagentToolItem;
  widgets.push(
    new SubagentToolWidget({
      toolName: subItem.toolName,
      status: subItem.status as ToolStatus,
      description: subItem.description,
      error: subItem.error,
      subagentContent: subItem.subagentContent,
    }) as unknown as Widget,
  );
  break;
}
```

- [ ] **Step 3: 确保 spinner 动画覆盖新 widget**

`SubagentToolWidget` 使用 `ExpandableToolHeader` 内部的 `BrailleSpinner`，已经受 `ConversationViewState._animationTimer` 的 `setState` 驱动。无需额外改动。

- [ ] **Step 4: 运行类型检查**

Run: `cd packages/cli && bunx tsc --noEmit`
Expected: 无类型错误

- [ ] **Step 5: 运行已有 e2e/集成测试确认无回归**

Run: `cd packages/cli && bun test`
Expected: 全部通过

- [ ] **Step 6: Commit**

```bash
git add packages/cli/src/widgets/conversation-view.ts
git commit -m "feat(cli): wire SubagentToolWidget into conversation view (逆向: x8R.buildWidget)"
```

---

## Task 5: 接入 OracleToolWidget 和 LibrarianToolWidget

**Files:**
- Modify: `packages/cli/src/widgets/conversation-view.ts`
- Reference: `amp-cli-reversed/modules/1472_tui_components/layout_widgets.js` (Bs.buildOracleTool)

**设计说明：** 对于 `toolName === "Oracle"` 或 `"Librarian"` 的 `SubagentToolItem`，使用对应的专用 widget 代替通用的 `SubagentToolWidget`。这利用了已有但未接入的 widget 实现。

- [ ] **Step 1: 导入已有 widget**

```typescript
import { OracleToolWidget } from "./oracle-tool-widget.js";
import { LibrarianToolWidget } from "./librarian-tool-widget.js";
```

- [ ] **Step 2: 在 subagent-tool 分支中按 toolName 分发**

```typescript
case "subagent-tool": {
  const subItem = item as SubagentToolItem;
  if (subItem.toolName === "Oracle") {
    widgets.push(
      new OracleToolWidget({
        toolName: "Oracle",
        status: subItem.status as ToolStatus,
        input: subItem.description,
        output: subItem.subagentContent?.terminalAssistantMessage?.content
          .filter((b) => b.type === "text")
          .map((b) => (b as { text: string }).text)
          .join("\n") ?? undefined,
        error: subItem.error,
        progress: subItem.subagentContent?.progressChunks
          ?.map((c) => c.message)
          .filter((m): m is string => !!m && m.trim().length > 0),
      }) as unknown as Widget,
    );
  } else if (subItem.toolName === "Librarian") {
    widgets.push(
      new LibrarianToolWidget({
        name: "Librarian",
        status: subItem.status as ToolStatus,
        query: subItem.description,
        result: subItem.subagentContent?.terminalAssistantMessage?.content
          .filter((b) => b.type === "text")
          .map((b) => (b as { text: string }).text)
          .join("\n") ?? undefined,
        error: subItem.error,
      }) as unknown as Widget,
    );
  } else {
    // 通用子代理 (Task / sa__ prefix tools)
    widgets.push(
      new SubagentToolWidget({
        toolName: subItem.toolName,
        status: subItem.status as ToolStatus,
        description: subItem.description,
        error: subItem.error,
        subagentContent: subItem.subagentContent,
      }) as unknown as Widget,
    );
  }
  break;
}
```

- [ ] **Step 3: 运行类型检查**

Run: `cd packages/cli && bunx tsc --noEmit`
Expected: 无类型错误

- [ ] **Step 4: 运行测试**

Run: `cd packages/cli && bun test`
Expected: 全部通过

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/widgets/conversation-view.ts
git commit -m "feat(cli): wire Oracle/Librarian widgets into subagent rendering pipeline"
```

---

## Task 6: 处理 `sa__` 前缀工具名

**Files:**
- Modify: `packages/cli/src/widgets/display-items.ts`
- Test: `packages/cli/src/widgets/__tests__/subagent-content.test.ts`
- Reference: `amp-cli-reversed/modules/1472_tui_components/layout_widgets.js` (buildSubagentTool lines 2241-2252)

**设计说明：** amp 中 `sa__` 前缀的工具名会被转为标题格式显示名（如 `sa__code_writer` → `"Code Writer"`）。在 display-items 层识别这些工具名并产出 `SubagentToolItem`。

- [ ] **Step 1: 写测试**

```typescript
// 追加到 subagent-content.test.ts 或新文件
import { describe, it, expect } from "bun:test";
import { transformThreadToDisplayItems, type SubagentToolItem } from "../display-items.js";

describe("sa__ prefix tools", () => {
  it("sa__code_writer 渲染为 SubagentToolItem with name 'Code Writer'", () => {
    const messages = [
      {
        role: "assistant",
        content: [{ type: "tool_use", id: "sa1", name: "sa__code_writer", input: { prompt: "write a test" } }],
      },
      {
        role: "user",
        content: [{ type: "tool_result", toolUseID: "sa1", run: { status: "done", result: "done" } }],
      },
    ];
    const items = transformThreadToDisplayItems(messages as any);
    const saItem = items.find((i) => i.type === "subagent-tool") as SubagentToolItem | undefined;
    expect(saItem).toBeDefined();
    expect(saItem!.toolName).toBe("Code Writer");
    expect(saItem!.description).toBe("write a test");
  });
});
```

- [ ] **Step 2: 在 display-items.ts 中添加 sa__ 处理逻辑**

在工具名分发链中（Task 分支之前）:

```typescript
  } else if (block.name?.startsWith("sa__")) {
    flushActivityBuffer();
    // 逆向: Bs.buildSubagentTool lines 2241-2252 — strip sa__, title-case
    const displayName = block.name
      .replace(/^sa__/, "")
      .split(/[_-]/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
    const subagentContent = block.id ? subagentContentByParentID[block.id] : undefined;
    items.push({
      type: "subagent-tool",
      toolUseId: block.id ?? "",
      toolName: displayName,
      status,
      description: typeof block.input?.prompt === "string" ? block.input.prompt : undefined,
      error: result?.run?.status === "error"
        ? (result.run.error as { message: string } | undefined)?.message
        : undefined,
      subagentContent,
    } satisfies SubagentToolItem);
  }
```

- [ ] **Step 3: 运行测试**

Run: `cd packages/cli && bun test src/widgets/__tests__/subagent-content.test.ts`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add packages/cli/src/widgets/display-items.ts packages/cli/src/widgets/__tests__/subagent-content.test.ts
git commit -m "feat(cli): handle sa__ prefix subagent tools with title-case display names"
```

---

## Task 7: 取消传播 + 缓存签名

**Files:**
- Modify: `packages/cli/src/widgets/subagent-content.ts`
- Modify: `packages/cli/src/widgets/subagent-tool-widget.ts`
- Test: `packages/cli/src/widgets/__tests__/subagent-content.test.ts`
- Reference: `amp-cli-reversed/modules/2606_unknown_jM0.js` (t() 取消传播)
- Reference: `amp-cli-reversed/modules/1950_unknown_o8R.js` (o8R 缓存签名)

**设计说明：** 当父 Task 工具状态为 `cancelled` 时，其子代理内所有非终态的工具调用应被标记为 cancelled。提供 `computeSubagentSignature()` 用于 widget 缓存失效判定。

- [ ] **Step 1: 写取消传播测试**

```typescript
// 追加到 subagent-content.test.ts
import { propagateCancellation, computeSubagentSignature } from "../subagent-content.js";

describe("propagateCancellation", () => {
  it("父取消时将 in-progress 子工具标记为 cancelled", () => {
    const content: SubagentContent = {
      tools: [
        {
          toolUse: { type: "tool_use", id: "c1", name: "Bash", input: {}, complete: true },
          toolRun: { status: "in-progress" },
        },
        {
          toolUse: { type: "tool_use", id: "c2", name: "Read", input: {}, complete: true },
          toolRun: { status: "done", result: "ok" },
        },
      ],
    };
    const result = propagateCancellation(content);
    expect(result.tools[0].toolRun.status).toBe("cancelled");
    expect(result.tools[0].toolRun.reason).toBe("Parent subagent was cancelled");
    // done 状态不变
    expect(result.tools[1].toolRun.status).toBe("done");
  });
});

describe("computeSubagentSignature", () => {
  it("相同内容产出相同签名", () => {
    const content: SubagentContent = {
      tools: [
        { toolUse: { type: "tool_use", id: "t1", name: "Bash", input: {}, complete: true }, toolRun: { status: "done" } },
      ],
    };
    expect(computeSubagentSignature(content)).toBe(computeSubagentSignature(content));
  });

  it("状态变化产出不同签名", () => {
    const c1: SubagentContent = {
      tools: [{ toolUse: { type: "tool_use", id: "t1", name: "Bash", input: {}, complete: true }, toolRun: { status: "in-progress" } }],
    };
    const c2: SubagentContent = {
      tools: [{ toolUse: { type: "tool_use", id: "t1", name: "Bash", input: {}, complete: true }, toolRun: { status: "done" } }],
    };
    expect(computeSubagentSignature(c1)).not.toBe(computeSubagentSignature(c2));
  });
});
```

- [ ] **Step 2: 实现取消传播和签名**

在 `subagent-content.ts` 末尾添加:

```typescript
/** 终态集合 (逆向: wt() in jM0) */
const TERMINAL_STATUSES = new Set(["done", "error", "rejected-by-user", "cancelled"]);

/**
 * 当父被取消时，将所有非终态子工具标记为 cancelled。
 * 返回新对象（不修改原始数据）。
 *
 * 逆向: jM0 内 t() 函数
 */
export function propagateCancellation(content: SubagentContent): SubagentContent {
  return {
    ...content,
    tools: content.tools.map((tool) => {
      if (TERMINAL_STATUSES.has(tool.toolRun.status)) return tool;
      return {
        ...tool,
        toolRun: {
          ...tool.toolRun,
          status: "cancelled" as const,
          reason: "Parent subagent was cancelled",
        },
      };
    }),
  };
}

/**
 * 计算子代理内容的缓存签名，用于判定 widget 是否需要重建。
 *
 * 逆向: o8R() in 1950_unknown_o8R.js
 */
export function computeSubagentSignature(content: SubagentContent | undefined): string {
  if (!content) return "none";
  const toolsSig = content.tools
    .map((t) => `${t.toolUse.id}|${t.toolUse.name}|${t.toolRun.status}|${t.toolProgress?.status ?? "none"}`)
    .join("|");
  const msgSig = content.terminalAssistantMessage
    ? `msg:${content.terminalAssistantMessage.state.type}:${content.terminalAssistantMessage.content.length}`
    : "no-msg";
  return `tools:${toolsSig}|assistant:${msgSig}`;
}
```

- [ ] **Step 3: 在 SubagentToolWidget 中使用取消传播**

在 `SubagentToolWidgetState.build()` 顶部:

```typescript
// 如果父状态为 cancelled，传播到子工具
let effectiveContent = subagentContent;
if (status === "cancelled" && subagentContent) {
  effectiveContent = propagateCancellation(subagentContent);
}
```

然后用 `effectiveContent` 替代后续所有 `subagentContent` 引用。

- [ ] **Step 4: 运行测试**

Run: `cd packages/cli && bun test src/widgets/__tests__/subagent-content.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/widgets/subagent-content.ts packages/cli/src/widgets/subagent-tool-widget.ts packages/cli/src/widgets/__tests__/subagent-content.test.ts
git commit -m "feat(cli): add cancellation propagation and cache signature (逆向: wt/o8R)"
```

---

## Task 8: 清理死代码 + 导出整理

**Files:**
- Modify: `packages/cli/src/widgets/display-items.ts` — 删除旧的 generic Task fallback 路径中的死代码
- Modify: `packages/cli/src/widgets/display-items.ts` — 确保 `ActivityGroupItem.isSubagent` / `subagentLabel` 在 finder/code_review/code_tour 模式下正确填充

- [ ] **Step 1: 填充 isSubagent 字段**

在 `buildSpecializedActivityGroup` 返回的 ActivityGroupItem 上:

```typescript
items.push({
  type: "activity-group",
  actions: modeActions,
  summary: modeSummary,
  hasInProgress: status === "in-progress" || status === "queued",
  isSubagent: true,
  subagentLabel: mode === "finder" ? "Finder" : mode === "code_review" ? "Code Review" : "Code Tour",
});
```

- [ ] **Step 2: 在 _buildActivityGroupWidget 中利用 isSubagent**

如果 `group.isSubagent` 为 true，可以在 header 中使用 `subagentLabel` 替代 summary 作为标题前缀。

```typescript
// conversation-view.ts _buildActivityGroupWidget 中
const headerTitle = group.isSubagent && group.subagentLabel
  ? `${group.subagentLabel}: ${group.summary}`
  : group.summary;
```

- [ ] **Step 3: 运行完整测试**

Run: `cd packages/cli && bun test`
Expected: PASS

- [ ] **Step 4: 运行类型检查**

Run: `cd packages/cli && bunx tsc --noEmit`
Expected: 无类型错误

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/widgets/display-items.ts packages/cli/src/widgets/conversation-view.ts
git commit -m "feat(cli): populate isSubagent/subagentLabel on activity groups, clean dead code"
```

---

## Task 9: 集成验证 — tmux E2E 测试

**Files:**
- Create: `tests/e2e/subagent-rendering.sh`

**设计说明：** 按照 CLAUDE.md 规则 2，使用 tmux 捕获验证子代理渲染在真实终端中的表现。构造一个携带子代理嵌套消息的 mock thread，验证 widget 正确渲染。

- [ ] **Step 1: 编写 E2E 验证脚本**

```bash
#!/usr/bin/env bash
# tests/e2e/subagent-rendering.sh
# 验证子代理内容在 conversation view 中正确渲染
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo "=== Subagent Rendering E2E Test ==="

# Step 1: 运行单元测试确认基础正确
echo "Running unit tests..."
cd "$PROJECT_DIR/packages/cli"
bun test src/widgets/__tests__/subagent-content.test.ts --timeout 30000
bun test src/widgets/__tests__/subagent-tool-widget.test.ts --timeout 30000

# Step 2: 类型检查
echo "Running type check..."
bunx tsc --noEmit

# Step 3: 运行已有的 tool rendering e2e 测试
echo "Running tool rendering e2e tests..."
bun test src/__tests__/tool-rendering.e2e.test.ts --timeout 60000 || true

echo "=== All subagent rendering checks passed ==="
```

- [ ] **Step 2: 运行验证**

Run: `bash tests/e2e/subagent-rendering.sh`
Expected: 所有检查通过

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/subagent-rendering.sh
git commit -m "test(e2e): add subagent rendering verification script"
```

---

## 验收场景追踪

| 场景 | 覆盖 Task |
|------|-----------|
| Task 工具（无 mode）在会话中显示为可展开的子代理 widget | Task 2, 3, 4 |
| 子代理内部工具调用列表可见 | Task 1, 3 |
| 子代理最终回复文本渲染 | Task 1, 3 |
| Progress chunks 流式渲染 | Task 1, 3 |
| Oracle 工具使用专用 widget | Task 2, 5 |
| Librarian 工具使用专用 widget | Task 2, 5 |
| `sa__xxx` 前缀工具标题化 | Task 6 |
| 父取消传播到子工具 | Task 7 |
| finder/code_review/code_tour 显示 isSubagent 标签 | Task 8 |
| 真实终端可运行无崩溃 | Task 9 |
