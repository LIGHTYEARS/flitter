/**
 * Mermaid diagram rendering tool
 *
 * A declarative tool that lets the LLM output Mermaid diagram code.
 * Execute is a no-op (always succeeds) — actual rendering happens in the TUI layer.
 *
 * 逆向: amp-cli-reversed/chunk-005.js:148612-148686
 *   - gVR.spec: name "mermaid", input {code, citations}, source "builtin"
 *   - gVR.fn: async () => ({status: "done", result: {success: true}})
 *   - TUI renders via buildMermaidTool (chunk-006.js:29389) using x50() for ASCII
 *     and generates a mermaid.live link for interactive viewing
 *
 * 逆向: $0T = "mermaid" (chunk-005.js:13188)
 * 逆向: IVR = description string (chunk-005.js:148612-148655)
 */

import type { ToolResult, ToolSpec } from "../types";

// ─── Constants ─────────────────────────────────────────────

/** Mermaid.live base URL for interactive viewing */
const MERMAID_LIVE_BASE = "https://mermaid.live/edit#base64:";

/** Default mermaid theme config (逆向: xVR) */
const MERMAID_CONFIG = { theme: "dark" };

// ─── Description ───────────────────────────────────────────
// 逆向: IVR from chunk-005.js:148612-148655

const MERMAID_DESCRIPTION = `Renders a Mermaid diagram from the provided code.

PROACTIVELY USE DIAGRAMS when they would better convey information than prose alone.

You should create diagrams WITHOUT being explicitly asked in these scenarios:
- When explaining system architecture or component relationships
- When describing workflows, data flows, or user journeys
- When explaining algorithms or complex processes
- When illustrating class hierarchies or entity relationships
- When showing state transitions or event sequences

# Supported Headers
Only use supported diagram types: graph/flowchart, sequenceDiagram, classDiagram, stateDiagram, stateDiagram-v2, or erDiagram.
Do NOT use xychart-beta or other unsupported chart types.

# Citations
- Always include \`citations\` to make diagram elements clickable, linking to code locations.
- Keys: node IDs (e.g., "api") or edge labels (e.g., "authenticate(token)")
- Values: file:// URIs with optional line range (e.g., "file:///src/api.ts#L10-L50")

# Styling
- When defining custom classDefs, always define fill, stroke, and color explicitly
- Use DARK fill colors (close to #000) with light stroke and text colors (close to #fff)
- DO NOT use HTML tags in node labels`;

// ─── Tool ──────────────────────────────────────────────────

/**
 * Create the mermaid diagram tool spec.
 *
 * 逆向: gVR = { spec: {...}, fn: () => ... } at chunk-005.js:148656-148686
 */
export function createMermaidTool(): ToolSpec {
  return {
    name: "mermaid",
    description: MERMAID_DESCRIPTION,
    source: "builtin",
    isReadOnly: true,
    inputSchema: {
      type: "object",
      properties: {
        code: {
          type: "string",
          description:
            "The Mermaid diagram code to render. Only use supported headers: graph/flowchart, sequenceDiagram, classDiagram, stateDiagram, stateDiagram-v2, or erDiagram. Do NOT use xychart-beta or other Mermaid-only chart families. DO NOT override with custom colors or other styles, and DO NOT use HTML tags in node labels.",
        },
        citations: {
          type: "object",
          description:
            'REQUIRED: Map of citation keys to file:// URIs for clickable code navigation. Keys can be node IDs (e.g., "api") or edge labels (e.g., "run_rollout(request)"). Use {} if no code references apply.',
          additionalProperties: {
            type: "string",
          },
        },
      },
      required: ["code", "citations"],
    },
    // No-op execute — TUI renders the diagram from the tool_use block
    // 逆向: gVR.fn: () => Q9(async () => ({status: "done", result: {success: true}}))
    async execute(args: Record<string, unknown>): Promise<ToolResult> {
      const code = (args.code as string) ?? "";

      // Generate mermaid.live link for reference
      const liveUrl = code.trim()
        ? `${MERMAID_LIVE_BASE}${Buffer.from(JSON.stringify({ code, mermaid: MERMAID_CONFIG }), "utf8").toString("base64")}`
        : undefined;

      return {
        status: "done",
        content: liveUrl ? `Diagram rendered. View on mermaid.live: ${liveUrl}` : "Empty diagram.",
        data: { success: true, liveUrl },
      };
    },
  };
}

/** Pre-built instance for convenience */
export const MermaidTool = createMermaidTool();
