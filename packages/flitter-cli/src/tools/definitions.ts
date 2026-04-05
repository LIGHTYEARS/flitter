// Tool definitions (JSON schemas) for all core tools.
//
// These are the ToolDefinition objects sent to the LLM to describe
// available tools. Each definition specifies the tool name, description,
// and input_schema (JSON Schema for the input parameters).
//
// Schemas match the Anthropic/OpenAI tool calling specification and
// are designed to be compatible with Claude Code's tool surface.

import type { ToolDefinition } from '../state/types';

// ---------------------------------------------------------------------------
// Bash
// ---------------------------------------------------------------------------

export const BashTool: ToolDefinition = {
  name: 'Bash',
  description:
    'Execute a bash command in the user\'s terminal. ' +
    'Use for running scripts, installing packages, git operations, ' +
    'and other shell commands. The working directory persists between calls.',
  input_schema: {
    type: 'object',
    properties: {
      command: {
        type: 'string',
        description: 'The bash command to execute.',
      },
      timeout: {
        type: 'number',
        description: 'Optional timeout in milliseconds (max 600000). Default: 120000.',
      },
    },
    required: ['command'],
  },
};

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

export const ReadTool: ToolDefinition = {
  name: 'Read',
  description:
    'Read a file from the filesystem. Returns file contents with line numbers. ' +
    'Supports text files, images (displayed visually), and PDFs. ' +
    'Use offset and limit for large files.',
  input_schema: {
    type: 'object',
    properties: {
      file_path: {
        type: 'string',
        description: 'Absolute path to the file to read.',
      },
      offset: {
        type: 'number',
        description: 'Line number to start reading from (1-based). Optional.',
      },
      limit: {
        type: 'number',
        description: 'Maximum number of lines to read. Optional.',
      },
    },
    required: ['file_path'],
  },
};

// ---------------------------------------------------------------------------
// Write
// ---------------------------------------------------------------------------

export const WriteTool: ToolDefinition = {
  name: 'Write',
  description:
    'Write content to a file, creating it if it doesn\'t exist or overwriting if it does. ' +
    'Use for creating new files. Prefer Edit for modifying existing files.',
  input_schema: {
    type: 'object',
    properties: {
      file_path: {
        type: 'string',
        description: 'Absolute path to the file to write.',
      },
      content: {
        type: 'string',
        description: 'The content to write to the file.',
      },
    },
    required: ['file_path', 'content'],
  },
};

// ---------------------------------------------------------------------------
// Edit
// ---------------------------------------------------------------------------

export const EditTool: ToolDefinition = {
  name: 'Edit',
  description:
    'Perform exact string replacements in an existing file. ' +
    'The old_string must be unique in the file. Use replace_all to change every instance. ' +
    'Prefer this over Write for modifying existing files.',
  input_schema: {
    type: 'object',
    properties: {
      file_path: {
        type: 'string',
        description: 'Absolute path to the file to edit.',
      },
      old_string: {
        type: 'string',
        description: 'The exact text to replace. Must be unique in the file.',
      },
      new_string: {
        type: 'string',
        description: 'The replacement text.',
      },
      replace_all: {
        type: 'boolean',
        description: 'Replace all occurrences of old_string. Default: false.',
      },
    },
    required: ['file_path', 'old_string', 'new_string'],
  },
};

// ---------------------------------------------------------------------------
// Grep
// ---------------------------------------------------------------------------

export const GrepTool: ToolDefinition = {
  name: 'Grep',
  description:
    'Search file contents using regex patterns (ripgrep-based). ' +
    'Returns matching files or content with context lines. ' +
    'Use for finding code, strings, or patterns across the codebase.',
  input_schema: {
    type: 'object',
    properties: {
      pattern: {
        type: 'string',
        description: 'Regex pattern to search for.',
      },
      path: {
        type: 'string',
        description: 'File or directory to search in. Default: current working directory.',
      },
      glob: {
        type: 'string',
        description: 'Glob pattern to filter files (e.g. "*.ts", "*.{js,jsx}").',
      },
      output_mode: {
        type: 'string',
        description: 'Output mode: "content", "files_with_matches" (default), or "count".',
      },
    },
    required: ['pattern'],
  },
};

// ---------------------------------------------------------------------------
// Glob
// ---------------------------------------------------------------------------

export const GlobTool: ToolDefinition = {
  name: 'Glob',
  description:
    'Find files by name pattern. Returns matching file paths sorted by modification time. ' +
    'Use for locating files by name, extension, or directory structure.',
  input_schema: {
    type: 'object',
    properties: {
      pattern: {
        type: 'string',
        description: 'Glob pattern to match files (e.g. "**/*.ts", "src/**/*.test.ts").',
      },
      path: {
        type: 'string',
        description: 'Directory to search in. Default: current working directory.',
      },
    },
    required: ['pattern'],
  },
};

// ---------------------------------------------------------------------------
// TodoWrite
// ---------------------------------------------------------------------------

export const TodoWriteTool: ToolDefinition = {
  name: 'TodoWrite',
  description:
    'Create and manage a structured task list. Use to track progress on complex tasks. ' +
    'Each todo has content (description), status (pending/in_progress/completed), ' +
    'and activeForm (present-tense description shown during execution).',
  input_schema: {
    type: 'object',
    properties: {
      todos: {
        type: 'array',
        description: 'The updated todo list.',
        items: {
          type: 'object',
          properties: {
            content: { type: 'string', description: 'Task description.' },
            status: {
              type: 'string',
              description: 'Task status: pending, in_progress, or completed.',
            },
            activeForm: {
              type: 'string',
              description: 'Present-tense description shown during execution.',
            },
          },
          required: ['content', 'status', 'activeForm'],
        },
      },
    },
    required: ['todos'],
  },
};

// ---------------------------------------------------------------------------
// Task
// ---------------------------------------------------------------------------

export const TaskTool: ToolDefinition = {
  name: 'Task',
  description:
    'Launch a sub-agent to handle a complex task autonomously. ' +
    'The task runs in a separate context and returns results when complete.',
  input_schema: {
    type: 'object',
    properties: {
      description: {
        type: 'string',
        description: 'Short (3-5 word) description of the task.',
      },
      prompt: {
        type: 'string',
        description: 'Detailed instructions for the sub-agent.',
      },
      subagent_type: {
        type: 'string',
        description: 'Agent type: general-purpose, Bash, Explore, Plan.',
      },
    },
    required: ['description', 'prompt', 'subagent_type'],
  },
};

// ---------------------------------------------------------------------------
// Registry builder
// ---------------------------------------------------------------------------

/**
 * All core tool definitions in registration order.
 * Used by createDefaultRegistry() to populate the registry.
 */
export const CORE_TOOL_DEFINITIONS: ToolDefinition[] = [
  BashTool,
  ReadTool,
  WriteTool,
  EditTool,
  GrepTool,
  GlobTool,
  TodoWriteTool,
  TaskTool,
];
