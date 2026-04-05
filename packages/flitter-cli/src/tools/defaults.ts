// Default tool registry setup for flitter-cli.
//
// Creates a ToolRegistry populated with all core tool definitions
// and their real executors.

import { ToolRegistry } from './registry';
import type { RegisteredTool, ToolExecutor, ToolResult, ToolContext, PermissionLevel } from './executor';
import {
  BashTool,
  ReadTool,
  WriteTool,
  EditTool,
  GrepTool,
  GlobTool,
  TodoWriteTool,
  TaskTool,
} from './definitions';
import { BashExecutor } from './bash-executor';
import { ReadExecutor } from './read-executor';
import { WriteExecutor } from './write-executor';
import { EditExecutor } from './edit-executor';
import { GrepExecutor } from './grep-executor';
import { GlobExecutor } from './glob-executor';
import { TodoExecutor } from './todo-executor';
import type { ToolDefinition } from '../state/types';

/**
 * Stub executor that returns a "not implemented" error.
 * Used for tools that don't have real executors yet (TodoWrite, Task).
 */
class StubExecutor implements ToolExecutor {
  private _name: string;

  constructor(name: string) {
    this._name = name;
  }

  async execute(
    _input: Record<string, unknown>,
    _context: ToolContext,
  ): Promise<ToolResult> {
    return {
      content: `Tool '${this._name}' is not yet implemented.`,
      isError: true,
    };
  }
}

/** Permission requirements for each tool. */
const PERMISSION_MAP: Record<string, boolean> = {
  Bash: true,       // Shell execution always needs permission
  Read: false,      // Reading files is safe
  Write: true,      // Writing files needs permission
  Edit: true,       // Editing files needs permission
  Grep: false,      // Searching is safe
  Glob: false,      // File matching is safe
  TodoWrite: false,  // Managing todos is safe
  Task: false,       // Sub-agents manage their own permissions
};

/**
 * Fine-grained permission levels for each tool.
 *
 * - 'auto': safe, read-only operations — no user confirmation needed
 * - 'confirm': potentially destructive operations — requires user approval
 * - 'deny': blocked entirely (no default tools use this, but available for user config)
 */
const PERMISSION_LEVEL_MAP: Record<string, PermissionLevel> = {
  Bash: 'confirm',      // Shell execution — destructive potential
  Read: 'auto',         // Reading files is safe
  Write: 'confirm',     // Writing files — destructive
  Edit: 'confirm',      // Editing files — destructive
  Grep: 'auto',         // Searching is safe
  Glob: 'auto',         // File matching is safe
  TodoWrite: 'auto',    // Managing todos is safe
  Task: 'confirm',      // Sub-agent tasks can perform destructive operations
};

/**
 * Create the default ToolRegistry with all core tools registered.
 *
 * Core file/shell tools (Bash, Read, Write, Edit, Grep, Glob) have
 * real executors. TodoWrite and Task use stubs until later phases.
 */
export function createDefaultRegistry(): ToolRegistry {
  const registry = new ToolRegistry();

  // Real executors
  registry.register({
    definition: BashTool,
    executor: new BashExecutor(),
    requiresPermission: PERMISSION_MAP.Bash,
    permissionLevel: PERMISSION_LEVEL_MAP.Bash,
  });
  registry.register({
    definition: ReadTool,
    executor: new ReadExecutor(),
    requiresPermission: PERMISSION_MAP.Read,
    permissionLevel: PERMISSION_LEVEL_MAP.Read,
  });
  registry.register({
    definition: WriteTool,
    executor: new WriteExecutor(),
    requiresPermission: PERMISSION_MAP.Write,
    permissionLevel: PERMISSION_LEVEL_MAP.Write,
  });
  registry.register({
    definition: EditTool,
    executor: new EditExecutor(),
    requiresPermission: PERMISSION_MAP.Edit,
    permissionLevel: PERMISSION_LEVEL_MAP.Edit,
  });
  registry.register({
    definition: GrepTool,
    executor: new GrepExecutor(),
    requiresPermission: PERMISSION_MAP.Grep,
    permissionLevel: PERMISSION_LEVEL_MAP.Grep,
  });
  registry.register({
    definition: GlobTool,
    executor: new GlobExecutor(),
    requiresPermission: PERMISSION_MAP.Glob,
    permissionLevel: PERMISSION_LEVEL_MAP.Glob,
  });

  // TodoWrite: real executor
  registry.register({
    definition: TodoWriteTool,
    executor: new TodoExecutor(),
    requiresPermission: PERMISSION_MAP.TodoWrite,
    permissionLevel: PERMISSION_LEVEL_MAP.TodoWrite,
  });
  // Task: stub executor (replaced with real TaskExecutor in index.ts after provider creation)
  registry.register({
    definition: TaskTool,
    executor: new StubExecutor('Task'),
    requiresPermission: PERMISSION_MAP.Task,
    permissionLevel: PERMISSION_LEVEL_MAP.Task,
  });

  return registry;
}
