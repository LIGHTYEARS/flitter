/**
 * @flitter/agent-core — DeleteFileTool
 *
 * Delete a file from the filesystem.
 * Records the deletion in FileChangeTracker for undo support.
 *
 * 逆向: amp's delete_file is IDE-only, but apply_patch supports "*** Delete File:" format.
 * Flitter implements a standalone delete_file tool for CLI use.
 * The pattern follows amp's write/edit tools: validate path, check guarded files,
 * record change in tracker, perform filesystem operation.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import type { FileChangeTracker } from "../file-change-tracker";
import type { ToolContext, ToolResult, ToolSpec } from "../types";

/**
 * Factory: create DeleteFileTool bound to a FileChangeTracker.
 *
 * The tracker records the old content with newContent="" so undo_edit
 * can restore the file.
 */
export function createDeleteFileTool(fileChangeTracker: FileChangeTracker): ToolSpec {
  return {
    name: "delete_file",
    description:
      "Delete a file from the filesystem. " +
      "The deletion is recorded so it can be undone with undo_edit.",
    source: "builtin",
    isReadOnly: false,

    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Absolute path to the file to delete",
        },
      },
      required: ["path"],
    },

    executionProfile: undefined,
    // Resource key is dynamic per file path; orchestrator conflict
    // detection is static so we use undefined like Edit/Write tools.

    async execute(args: Record<string, unknown>, _context: ToolContext): Promise<ToolResult> {
      const filePath = args.path as string;

      // Validate path
      if (!filePath || typeof filePath !== "string") {
        return {
          status: "error",
          error: "path is required and must be a string",
        };
      }

      if (!path.isAbsolute(filePath)) {
        return {
          status: "error",
          error: `Path must be absolute: ${filePath}`,
        };
      }

      // Check file exists
      if (!fs.existsSync(filePath)) {
        return {
          status: "error",
          error: `File not found: ${filePath}`,
        };
      }

      // Check it's a file, not a directory
      const stat = fs.statSync(filePath);
      if (stat.isDirectory()) {
        return {
          status: "error",
          error: `Cannot delete directory: ${filePath}. Only files can be deleted.`,
        };
      }

      // Read current content for undo tracking
      let oldContent: string;
      try {
        oldContent = fs.readFileSync(filePath, "utf-8");
      } catch {
        // Binary or unreadable — record empty for best effort
        oldContent = "";
      }

      // Record in tracker: oldContent -> "" (deletion)
      fileChangeTracker.record(filePath, oldContent, "");

      // Delete the file
      try {
        fs.unlinkSync(filePath);
      } catch (err) {
        // Revert tracker if delete fails
        fileChangeTracker.revertLastEdit(filePath);
        return {
          status: "error",
          error: `Failed to delete file: ${err instanceof Error ? err.message : String(err)}`,
        };
      }

      return {
        status: "done",
        content: `Deleted ${filePath}`,
        outputFiles: [filePath],
      };
    },
  };
}
