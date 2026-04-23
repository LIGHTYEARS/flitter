/**
 * walkthrough + walkthrough_diagram tools — Interactive codebase exploration.
 *
 * 逆向: modules/2026_tail_anonymous.js:143379-143526
 *
 * walkthrough (kXR / nlR):
 *   - name: nlR = "walkthrough"
 *   - description: creates interactive walkthrough diagram for exploring a codebase topic
 *   - inputSchema: { topic: string (required), context?: string }
 *   - meta: { disableTimeout: !0 }
 *   - source: "builtin"
 *   - executionProfile: { resourceKeys: () => [] }
 *   - fn: uXR — validates topic, spawns "walkthrough" subagent (planner),
 *     parses <walkthroughPlan> XML from response, returns { diagram: { code, nodes } }
 *
 * walkthrough_diagram ($XR / uET):
 *   - name: uET = "walkthrough_diagram"
 *   - description: gXR — renders interactive Mermaid diagram
 *   - inputSchema: { code: string (required), nodes: object (required), summary?: string }
 *   - source: "builtin"
 *   - fn: validates code/nodes, builds view URL from thread+toolUseID, returns message
 *
 * 逆向: chunk-005.js:67177 — HW = ["code_tour","code_review","walkthrough","walkthrough_diagram"]
 *   Both tools are deferred (loaded via skill) in smart and large modes.
 *
 * 逆向: chunk-005.js:80626 — builtinTools: ["walkthrough", "walkthrough_diagram"]
 * 逆向: chunk-005.js:80641-80642 — subagent keys: walkthrough → "walkthrough"
 */

import { createLogger } from "@flitter/util";
import type { SubAgentManager } from "../../subagent/subagent";
import type { ToolContext, ToolResult, ToolSpec } from "../types";

const log = createLogger("tool:walkthrough");

/**
 * Walkthrough planner system prompt (phase 1: explore).
 *
 * 逆向: modules/2026_tail_anonymous.js:16115-16125 (xXR)
 */
const WALKTHROUGH_SYSTEM_PROMPT = `You are the Walkthrough Planner - an expert at exploring codebases and creating interactive walkthrough diagrams.

Your role is to analyze a topic and create an interactive walkthrough diagram that helps users understand the codebase architecture and flow.

In this first phase, use your tools to thoroughly explore the codebase:
1. Read relevant source files to understand the implementation
2. Identify key components, flows, and relationships
3. Understand how different parts connect together
4. Note the file paths for important components

Take your time to explore - you'll be asked to create the diagram structure in a follow-up message.`;

/**
 * Walkthrough plan prompt (phase 2: plan).
 *
 * 逆向: modules/2026_tail_anonymous.js:16126-16143 (fXR)
 */
const WALKTHROUGH_PLAN_PROMPT = `Now that you've explored the codebase, plan your walkthrough diagram:

1. Choose the best mermaid diagram type for this topic:
   - flowchart - Control flow, algorithms, decision trees, and general processes
   - sequenceDiagram - API calls, service interactions, and message passing
   - classDiagram - OOP class structures, interfaces, and type relationships
   - stateDiagram-v2 - State machines, object lifecycles, and status transitions
   - erDiagram - Database schemas and data model relationships

2. Identify 5-8 key components to include as nodes
3. Plan the connections between them
4. Note which files each component corresponds to

IMPORTANT for erDiagram: Do NOT use inline comments with quotes (e.g., \`string name "comment"\`).
Valid erDiagram attribute syntax is ONLY: \`type name\` or \`type name PK\` or \`type name FK\`.
Put explanatory comments in the node descriptions, not in the diagram code.

Describe your diagram plan briefly - what type, what nodes, and how they connect.`;

/**
 * Walkthrough diagram emit prompt (phase 3: emit).
 *
 * 逆向: modules/2026_tail_anonymous.js:16144-16188 (IXR)
 */
const WALKTHROUGH_EMIT_PROMPT = `Now emit your walkthrough diagram in this XML-like format:

<walkthroughPlan>
<code>
flowchart TD
  A[Component A] --> B[Component B]
  B --> C[Component C]
</code>
<node>
<id>A</id>
<title>Component A</title>
<description>## Overview
What this component is and its primary purpose.

## How It Works
- Key mechanism 1
- Key mechanism 2
- Data flow pattern

## Connections
How it connects to other parts of the system.</description>
<links>
<link><label>src/component-a.ts</label><url>file:///path/to/component-a.ts</url></link>
</links>
</node>
<node>
<id>B</id>
<title>Component B</title>
<description>## Overview
Description of component B...

## How It Works
- How it processes data
- Key patterns used</description>
</node>
</walkthroughPlan>`;

/**
 * Result structure from parsed <walkthroughPlan>.
 *
 * 逆向: modules/2026_tail_anonymous.js:16089-16099 (yXR parses XML → diagram)
 */
interface WalkthroughDiagram {
  code: string;
  nodes: Record<
    string,
    {
      title: string;
      description: string;
      links?: Array<{ label: string; url: string }>;
      codeSnippet?: string;
    }
  >;
}

/**
 * Parse <walkthroughPlan> XML block from planner response.
 *
 * 逆向: modules/2026_tail_anonymous.js:16089 (yXR)
 *   - extracts <code> block
 *   - extracts <node> blocks with <id>, <title>, <description>, <links>
 *   - returns null on parse failure
 */
function parseWalkthroughPlan(response: string): { diagram: WalkthroughDiagram } | null {
  const planMatch = response.match(/<walkthroughPlan>([\s\S]*?)<\/walkthroughPlan>/);
  if (!planMatch) return null;

  const planXml = planMatch[1];

  // Extract mermaid code block
  const codeMatch = planXml.match(/<code>\s*([\s\S]*?)\s*<\/code>/);
  if (!codeMatch) return null;
  const code = codeMatch[1].trim();

  // Extract node blocks
  const nodes: WalkthroughDiagram["nodes"] = {};
  const nodeMatches = planXml.matchAll(/<node>([\s\S]*?)<\/node>/g);

  for (const nodeMatch of nodeMatches) {
    const nodeXml = nodeMatch[1];

    const idMatch = nodeXml.match(/<id>([\s\S]*?)<\/id>/);
    const titleMatch = nodeXml.match(/<title>([\s\S]*?)<\/title>/);
    const descMatch = nodeXml.match(/<description>([\s\S]*?)<\/description>/);

    if (!idMatch || !titleMatch || !descMatch) continue;

    const id = idMatch[1].trim();
    const title = titleMatch[1].trim();
    const description = descMatch[1].trim();

    // Extract links
    const links: Array<{ label: string; url: string }> = [];
    const linkMatches = nodeXml.matchAll(
      /<link><label>([\s\S]*?)<\/label><url>([\s\S]*?)<\/url><\/link>/g,
    );
    for (const linkMatch of linkMatches) {
      links.push({ label: linkMatch[1].trim(), url: linkMatch[2].trim() });
    }

    nodes[id] = {
      title,
      description,
      ...(links.length > 0 ? { links } : {}),
    };
  }

  if (Object.keys(nodes).length === 0) return null;

  return { diagram: { code, nodes } };
}

/**
 * Factory: create a walkthrough ToolSpec bound to a SubAgentManager.
 *
 * 逆向: modules/2026_tail_anonymous.js:143379-143429 (kXR spec)
 *   fn: uXR (modules/2026_tail_anonymous.js:16066-16112)
 *   - validates topic (throws on missing)
 *   - spawns "walkthrough" subagent via mXR (planner)
 *   - parses walkthroughPlan via yXR
 *   - returns { diagram: { code, nodes } } on success
 */
export function createWalkthroughTool(subAgentManager: SubAgentManager): ToolSpec {
  return {
    name: "walkthrough",
    // 逆向: kXR.spec.description (modules/2026_tail_anonymous.js:143382-143405)
    description: `Create an interactive walkthrough diagram for exploring a topic in the codebase.

The walkthrough tool:
1. Invokes a planner subagent to explore the codebase
2. Creates a diagram structure with detailed "deep dive" content for each node
3. Returns a complete diagram where clicking nodes shows their deep dive content

After receiving the result, call walkthrough_diagram with the returned diagram:

\`\`\`
// 1. Call walkthrough to get the diagram with deep dives
const result = await walkthrough({ topic: "How does authentication work?" })

// 2. Render the interactive diagram
walkthrough_diagram({
  code: result.diagram.code,
  nodes: result.diagram.nodes
})
\`\`\`

Each node in the diagram will have a description field with detailed markdown content explaining that component.
`,
    // 逆向: kXR.spec.inputSchema (modules/2026_tail_anonymous.js:143406-143419)
    inputSchema: {
      type: "object",
      properties: {
        topic: {
          type: "string",
          description:
            "The topic or question to create a walkthrough for. Be specific about what aspect of the codebase to explore.",
        },
        context: {
          type: "string",
          description: "Optional additional context about what the user wants to understand.",
        },
      },
      required: ["topic"],
    },
    source: "builtin",
    isReadOnly: true,
    executionProfile: {
      // 逆向: kXR.spec.executionProfile: { resourceKeys: () => [] }
      resourceKeys: [],
      // 逆向: kXR.spec.meta: { disableTimeout: !0 }
      // walkthrough subagent can take minutes — never timeout
      disableTimeout: true,
    },

    async execute(args: Record<string, unknown>, context: ToolContext): Promise<ToolResult> {
      // 逆向: uXR validates topic (modules/2026_tail_anonymous.js:16070)
      const topic = typeof args.topic === "string" ? args.topic.trim() : "";
      if (!topic) {
        return {
          status: "error",
          error: 'Missing required parameter "topic"',
        };
      }

      const extraContext = typeof args.context === "string" ? args.context : undefined;

      log.debug("Walkthrough planner starting", {
        topic: topic.substring(0, 100) + (topic.length > 100 ? "..." : ""),
        hasContext: !!extraContext,
      });

      // 逆向: uXR spawns planner via mXR with topic, context, toolService, R
      // (modules/2026_tail_anonymous.js:16073-16076)
      // Three-phase prompt: system prompt + user topic → plan request → emit request
      const promptParts: string[] = [
        WALKTHROUGH_SYSTEM_PROMPT,
        ``,
        `## Topic to explore`,
        ``,
        topic,
      ];

      if (extraContext) {
        promptParts.push(``, `## Additional context`, ``, extraContext);
      }

      promptParts.push(``, WALKTHROUGH_PLAN_PROMPT, ``, WALKTHROUGH_EMIT_PROMPT);

      try {
        const result = await subAgentManager.spawn({
          parentThreadId: context.threadId,
          prompt: promptParts.join("\n"),
          description: `Walkthrough: ${topic.substring(0, 60)}${topic.length > 60 ? "..." : ""}`,
          type: "walkthrough",
        });

        switch (result.status) {
          case "completed": {
            // 逆向: uXR parses via yXR (modules/2026_tail_anonymous.js:16089)
            const parsed = parseWalkthroughPlan(result.response ?? "");
            if (!parsed) {
              return {
                status: "error",
                error: `Failed to parse walkthrough plan from subagent response. Response: ${(result.response ?? "").substring(0, 500)}...`,
              };
            }

            log.debug("Walkthrough planner completed", {
              nodeCount: Object.keys(parsed.diagram.nodes).length,
              nodesWithLinks: Object.values(parsed.diagram.nodes).filter((n) => n.links?.length)
                .length,
            });

            return {
              status: "done",
              content: JSON.stringify({ diagram: parsed.diagram }),
            };
          }
          case "timeout":
            return {
              status: "error",
              error: `Walkthrough timed out. Partial response: ${result.response || "(none)"}`,
              content: result.response,
            };
          case "cancelled":
            return {
              status: "cancelled",
              error: "Walkthrough was cancelled",
              content: result.response,
            };
          case "error":
            return {
              status: "error",
              error: result.error ?? "Walkthrough encountered an error",
              content: result.response,
            };
          default:
            return {
              status: "error",
              error: `Unknown walkthrough status: ${String((result as { status: string }).status)}`,
            };
        }
      } catch (err) {
        log.debug("walkthrough error", { error: err });
        return {
          status: "error",
          error: err instanceof Error ? err.message : String(err),
        };
      }
    },
  };
}

/**
 * walkthrough_diagram description.
 *
 * 逆向: modules/2026_tail_anonymous.js:143436 — description: gXR
 *   gXR = "Renders an interactive Mermaid diagram where users can click on nodes..."
 */
const WALKTHROUGH_DIAGRAM_DESCRIPTION = `Renders an interactive Mermaid diagram where users can click on nodes to see detailed information or navigate to related documentation.

Use this tool when you want to create a walkthrough diagram that allows users to explore details about each component by clicking on them.

After calling this tool, ALWAYS include the \`message\` from the result in your response so users can view the interactive walkthrough on the web.`;

/**
 * Factory: create a walkthrough_diagram ToolSpec.
 *
 * 逆向: modules/2026_tail_anonymous.js:143433-143526 ($XR spec + fn)
 *   - validates code (string, required)
 *   - parses nodes (may be JSON string)
 *   - builds view URL from thread.id + toolUseID
 *   - returns { success: true, viewUrl?, message? }
 */
export function createWalkthroughDiagramTool(): ToolSpec {
  return {
    name: "walkthrough_diagram",
    // 逆向: $XR.spec.description = gXR (modules/2026_tail_anonymous.js:143436)
    description: WALKTHROUGH_DIAGRAM_DESCRIPTION,
    // 逆向: $XR.spec.inputSchema (modules/2026_tail_anonymous.js:143437-143491)
    inputSchema: {
      type: "object",
      properties: {
        code: {
          type: "string",
          description:
            "The Mermaid diagram code to render without overrides or modifications to styling. Use plain text labels instead of HTML tags in nodes.",
        },
        summary: {
          type: "string",
          description:
            'A one-sentence summary describing what this diagram illustrates (e.g., "This diagram shows the authentication flow from login to token validation")',
        },
        nodes: {
          type: "object",
          description: "Metadata for clickable nodes, keyed by node ID from the mermaid code",
          additionalProperties: {
            type: "object",
            properties: {
              title: {
                type: "string",
                description: "Display title for the node",
              },
              description: {
                type: "string",
                description: "Detailed description shown when node is selected",
              },
              links: {
                type: "array",
                description: "Related files or documentation links",
                items: {
                  type: "object",
                  properties: {
                    label: { type: "string" },
                    url: { type: "string" },
                  },
                  required: ["label", "url"],
                },
              },
              codeSnippet: {
                type: "string",
                description: "Optional code snippet to display",
              },
              threadID: {
                type: "string",
                description: "Thread ID of a subthread that explores this node in detail",
              },
            },
            required: ["title", "description"],
          },
        },
      },
      required: ["code", "nodes"],
    },
    source: "builtin",
    isReadOnly: true,

    async execute(args: Record<string, unknown>, _context: ToolContext): Promise<ToolResult> {
      // 逆向: $XR.fn validates code (modules/2026_tail_anonymous.js:143498-143503)
      if (!args.code || typeof args.code !== "string") {
        return {
          status: "error",
          error: 'Missing or invalid "code" parameter',
        };
      }

      // 逆向: $XR.fn parses nodes — may arrive as JSON string (modules/2026_tail_anonymous.js:143504-143512)
      let nodes = args.nodes;
      if (typeof nodes === "string") {
        try {
          nodes = JSON.parse(nodes);
        } catch {
          // will fail the type check below
        }
      }

      if (!nodes || typeof nodes !== "object") {
        return {
          status: "error",
          error: 'Missing or invalid "nodes" parameter',
        };
      }

      // 逆向: $XR.fn builds view URL: ${config.settings.url}/threads/${thread.id}?diagram=${toolUseID}&fullscreen=true
      // (modules/2026_tail_anonymous.js:143514-143516)
      // Flitter: no web viewer yet — return formatted mermaid output for TUI rendering
      const code = args.code as string;
      const summary = typeof args.summary === "string" ? args.summary : undefined;

      const output = ["```mermaid", code, "```", ...(summary ? [``, summary] : [])].join("\n");

      log.debug("walkthrough_diagram rendered", {
        codeLength: code.length,
        nodeCount: Object.keys(nodes as object).length,
        hasSummary: !!summary,
      });

      return {
        status: "done",
        content: JSON.stringify({
          success: true,
          output,
          message: summary
            ? `Walkthrough diagram rendered. ${summary}`
            : "Walkthrough diagram rendered.",
        }),
      };
    },
  };
}
