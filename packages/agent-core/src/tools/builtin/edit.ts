/**
 * @flitter/agent-core — EditTool
 *
 * Performs exact string replacements in files.
 * Supports single-match replacement and replace-all mode.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import type { ToolSpec, ToolResult, ToolContext, ExecutionProfile } from "../types";

/**
 * Count the number of non-overlapping occurrences of `search` in `content`.
 */
function countOccurrences(content: string, search: string): number {
  if (search.length === 0) {
    return 0;
  }
  let count = 0;
  let position = 0;
  while (true) {
    const index = content.indexOf(search, position);
    if (index === -1) {
      break;
    }
    count++;
    position = index + search.length;
  }
  return count;
}

/**
 * Compute the execution profile for an Edit invocation.
 * Declares a write-mode resource key on the target file path.
 */
export function editExecutionProfile(
  args: Record<string, unknown>,
): ExecutionProfile {
  const filePath = args.file_path as string;
  return {
    resourceKeys: [{ key: filePath, mode: "write" }],
  };
}

/**
 * EditTool: performs exact string replacements in files.
 */
export const EditTool: ToolSpec = {
  name: "Edit",
  description:
    "Performs exact string replacements in files. The old_string must match " +
    "exactly in the file content. By default, old_string must be unique; " +
    "use replace_all to replace all occurrences.",
  source: "builtin",
  isReadOnly: false,

  inputSchema: {
    type: "object",
    properties: {
      file_path: {
        type: "string",
        description: "The absolute path to the file to edit",
      },
      old_string: {
        type: "string",
        description: "The exact text to find and replace",
      },
      new_string: {
        type: "string",
        description: "The replacement text",
      },
      replace_all: {
        type: "boolean",
        description:
          "If true, replace all occurrences of old_string. Defaults to false.",
        default: false,
      },
    },
    required: ["file_path", "old_string", "new_string"],
    additionalProperties: false,
  },

  executionProfile: undefined,

  async execute(
    args: Record<string, unknown>,
    _context: ToolContext,
  ): Promise<ToolResult> {
    const filePath = args.file_path as string;
    const oldString = args.old_string as string;
    const newString = args.new_string as string;
    const replaceAll = (args.replace_all as boolean | undefined) ?? false;

    // Validate file_path
    if (!filePath || typeof filePath !== "string") {
      return {
        status: "error",
        error: "file_path is required and must be a string",
      };
    }

    // Validate old_string and new_string
    if (typeof oldString !== "string") {
      return {
        status: "error",
        error: "old_string is required and must be a string",
      };
    }

    if (typeof newString !== "string") {
      return {
        status: "error",
        error: "new_string is required and must be a string",
      };
    }

    // Check old_string !== new_string
    if (oldString === newString) {
      return {
        status: "error",
        error: "old_string and new_string must be different",
      };
    }

    // Check file exists
    if (!fs.existsSync(filePath)) {
      return {
        status: "error",
        error: `File not found: ${filePath}`,
      };
    }

    // Read the file
    const content = fs.readFileSync(filePath, "utf-8");

    // Count occurrences
    const count = countOccurrences(content, oldString);

    if (count === 0) {
      return {
        status: "error",
        error: `old_string not found in ${filePath}`,
      };
    }

    if (count > 1 && !replaceAll) {
      return {
        status: "error",
        error:
          `Found ${count} occurrences of old_string in ${filePath}. ` +
          `Use replace_all=true to replace all occurrences, or provide a ` +
          `larger unique string.`,
      };
    }

    // Perform replacement
    let newContent: string;
    if (replaceAll) {
      newContent = content.split(oldString).join(newString);
    } else {
      // Replace only the first occurrence
      const index = content.indexOf(oldString);
      newContent =
        content.slice(0, index) +
        newString +
        content.slice(index + oldString.length);
    }

    // Write back
    fs.writeFileSync(filePath, newContent, "utf-8");

    const message =
      replaceAll && count > 1
        ? `Replaced ${count} occurrences in ${filePath}`
        : `Successfully edited ${filePath}`;

    return {
      status: "done",
      content: message,
      outputFiles: [filePath],
    };
  },
};
