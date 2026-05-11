#!/usr/bin/env bun
/**
 * E2E test: render SubagentToolWidget in a real terminal via tmux capture.
 * Verifies cursor position and tree connector alignment.
 */
import { runApp } from "../../packages/tui/src/binding/run-app.js";
import { Column } from "../../packages/tui/src/widgets/column.js";
import { Expanded } from "../../packages/tui/src/widgets/flexible.js";
import { Container } from "../../packages/tui/src/widgets/container.js";
import { EdgeInsets } from "../../packages/tui/src/widgets/edge-insets.js";
import { RichText } from "../../packages/tui/src/widgets/rich-text.js";
import { TextSpan } from "../../packages/tui/src/widgets/text-span.js";
import { TextStyle } from "../../packages/tui/src/screen/text-style.js";
import { Color } from "../../packages/tui/src/screen/color.js";
import { Scrollable } from "../../packages/tui/src/scroll/scrollable.js";
import { SubagentToolWidget } from "../../packages/cli/src/widgets/subagent-tool-widget.js";
import type { SubagentContent } from "../../packages/cli/src/widgets/subagent-content.js";
import type { Widget } from "../../packages/tui/src/tree/element.js";

// Mock subagent content matching what produces the tree connectors
const mockContent: SubagentContent = {
  tools: [
    {
      toolUse: { id: "tu_1", name: "Bash", input: { command: "ls -la /Users/bytedance/workspace/flitter/docs" } },
      toolRun: { status: "in-progress" },
    },
    {
      toolUse: { id: "tu_2", name: "Bash", input: { command: "ls -la /Users/bytedance/workspace/flitter/packages" } },
      toolRun: { status: "in-progress" },
    },
  ],
  progressChunks: [
    {
      message: "Let me first list the docs directory and then read the key files.",
      tool_uses: [
        { tool_name: "Bash", normalized_name: "Bash", input: { command: "ls -la /Users/bytedance/workspace/flitter/docs" }, status: "in-progress" },
        { tool_name: "Bash", normalized_name: "Bash", input: { command: "ls -la /Users/bytedance/workspace/flitter/packages" }, status: "in-progress" },
      ],
    },
  ],
};

const widget = new SubagentToolWidget({
  toolName: "Subagent",
  status: "in-progress",
  description: "Explore docs & health status",
  subagentContent: mockContent,
});

// Also test with emoji in description (the 🔍 case from screenshot)
// Make the long message a NON-LAST child so it should show │ on continuation
const mockContent2: SubagentContent = {
  tools: [
    {
      toolUse: { id: "tu_3", name: "Bash", input: { command: "ls -la /Users/bytedance/workspace/flitter/docs" } },
      toolRun: { status: "in-progress" },
    },
  ],
  progressChunks: [
    {
      message: "🔍 The user wants to explore the documentation and health files in the Flitter project to understand the current state.",
      tool_uses: [
        { tool_name: "Bash", normalized_name: "Bash", input: { command: "ls -la /Users/bytedance/workspace/flitter/docs" }, status: "in-progress" },
      ],
    },
  ],
};

const widget2 = new SubagentToolWidget({
  toolName: "Subagent",
  status: "in-progress",
  description: "Explore repo structure & config",
  subagentContent: mockContent2,
});

// Build a simple layout: two subagent widgets stacked
const root = new Column({
  children: [
    widget as unknown as Widget,
    widget2 as unknown as Widget,
  ],
}) as unknown as Widget;

runApp(root);
