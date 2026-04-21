/**
 * @flitter/agent-core — RestoreSnapshotTool
 *
 * Restore files or the entire workspace to a previous git tree snapshot.
 * The snapshot OIDs are provided to the agent in the `# User State` section
 * of user messages.
 *
 * 逆向: amp-cli-reversed/modules/2026_tail_anonymous.js:14244-14298 (Y2R)
 *   - Parses args via X2R schema (path + treeOID)
 *   - Creates temp index, read-tree HEAD, add -A, checkout --no-overlay
 *   - Returns success/error with descriptive message
 *
 * Tool spec: amp-cli-reversed/modules/2026_tail_anonymous.js:140785-140810 (J2R)
 *   name: "restore_snapshot" (jlR)
 *   inputSchema: { path: string, treeOID: string }
 *
 * @module
 */

import { restoreSnapshot } from "../../worker/auto-snapshot";
import type { ToolContext, ToolResult, ToolSpec } from "../types";

/**
 * restore_snapshot tool spec.
 *
 * 逆向: J2R in amp-cli-reversed/modules/2026_tail_anonymous.js:140789
 *   spec: { name: jlR, description: Z2R, inputSchema: { path, treeOID } }
 *   execute: Y2R — uses temp index + git checkout --no-overlay
 */
export const RestoreSnapshotTool: ToolSpec = {
  name: "restore_snapshot",
  description:
    "Restore files to a previous state captured in a git tree snapshot.\n\n" +
    "Use this tool to restore files to a previous state captured in a git tree snapshot. " +
    "The snapshot OIDs are provided in the `# User State` section of user messages.\n\n" +
    '- Use `path: "."` to restore the entire workspace\n' +
    "- Use a specific file or directory path to restore only that path\n" +
    "- The `treeOID` must be a valid git tree OID from a previous snapshot",
  source: "builtin",
  isReadOnly: false,

  inputSchema: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description:
          'The file or directory path to restore. Use "." to restore the entire workspace.',
      },
      treeOID: {
        type: "string",
        description: "The git tree OID from a previous snapshot to restore from.",
      },
    },
    required: ["path", "treeOID"],
  },

  /**
   * 逆向: amp preprocessArgs normalizes "path" → "file_path" for other tools,
   * but restore_snapshot uses "path" natively (no alias needed).
   */

  executionProfile: undefined,

  /**
   * Execute restore_snapshot.
   *
   * 逆向: Y2R in amp-cli-reversed/modules/2026_tail_anonymous.js:14244-14298
   *   1. Parse args (path, treeOID)
   *   2. Get workingDirectory from context
   *   3. Create temp index, read-tree, add -A, checkout --no-overlay
   *   4. Return { status: "done", result: 'Successfully restored ...' }
   *   5. On error: { status: "error", error: { message: ... } }
   */
  async execute(args: Record<string, unknown>, context: ToolContext): Promise<ToolResult> {
    const restorePath = args.path as string;
    const treeOID = args.treeOID as string;

    // Validate required params
    if (!restorePath || typeof restorePath !== "string") {
      return {
        status: "error",
        error: "path is required and must be a string",
      };
    }

    if (!treeOID || typeof treeOID !== "string") {
      return {
        status: "error",
        error: "treeOID is required and must be a string",
      };
    }

    // 逆向: Y2R uses R.fsPath (context.workingDirectory) as the repo root
    const repoRoot = context.workingDirectory;
    if (!repoRoot) {
      return {
        status: "error",
        error: "No working directory available in tool context",
      };
    }

    try {
      await restoreSnapshot({ treeOID, repoRoot }, restorePath);

      // 逆向: Y2R returns descriptive success message
      return {
        status: "done",
        content: `Successfully restored "${restorePath}" from snapshot ${treeOID}`,
      };
    } catch (err) {
      // 逆向: Y2R returns { status: "error", error: { message: ... } }
      return {
        status: "error",
        error: `Failed to restore snapshot: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  },
};
