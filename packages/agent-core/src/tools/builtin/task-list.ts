/**
 * task_list tool — Plan and track tasks with dependency management.
 *
 * 逆向: chunk-005.js:149274-149373 (_XR spec, bXR fn)
 *   - name: db = "task_list"
 *   - inputSchema: { action (required), taskID, title, description, repoURL, status,
 *     dependsOn, parentID, limit, ready }
 *   - actions: create, list, get, update, delete
 *   - Tasks persist across sessions, support dependencies and hierarchical breakdown
 *
 * 逆向: chunk-005.js:71164 — included in VsT (task-subagent tools)
 *
 * NOTE: In amp, task_list is a full task planning system with server-side persistence.
 * In Flitter, we implement an in-memory task store that persists via ThreadStore metadata.
 * This is a factory-created tool (needs in-memory task store).
 */

import { createLogger } from "@flitter/util";
import type { ToolContext, ToolResult, ToolSpec } from "../types";

const log = createLogger("tool:task_list");

/** Task status values */
export type TaskStatus = "open" | "in_progress" | "completed";

/** A single task */
export interface Task {
  id: string;
  title: string;
  description?: string;
  repoURL?: string;
  status: TaskStatus;
  dependsOn: string[];
  parentID?: string;
  createdAt: string;
  updatedAt: string;
  threadId?: string;
  deleted?: boolean;
}

/**
 * In-memory task store.
 * 逆向: amp persists tasks server-side; Flitter keeps them in memory.
 */
export class TaskStore {
  private tasks = new Map<string, Task>();
  private counter = 0;

  create(fields: Partial<Task> & { title: string }, threadId?: string): Task {
    this.counter++;
    const id = fields.id ?? `task-${this.counter}`;
    const task: Task = {
      id,
      title: fields.title,
      description: fields.description,
      repoURL: fields.repoURL,
      status: fields.status ?? "open",
      dependsOn: fields.dependsOn ?? [],
      parentID: fields.parentID,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      threadId,
      deleted: false,
    };
    this.tasks.set(id, task);
    return task;
  }

  get(id: string): Task | undefined {
    const task = this.tasks.get(id);
    return task?.deleted ? undefined : task;
  }

  list(filters?: {
    repoURL?: string;
    status?: TaskStatus;
    limit?: number;
    ready?: boolean;
  }): Task[] {
    let tasks = Array.from(this.tasks.values()).filter((t) => !t.deleted);

    if (filters?.repoURL) {
      tasks = tasks.filter((t) => t.repoURL === filters.repoURL);
    }
    if (filters?.status) {
      tasks = tasks.filter((t) => t.status === filters.status);
    } else {
      // Default: exclude completed tasks
      tasks = tasks.filter((t) => t.status !== "completed");
    }
    if (filters?.ready) {
      tasks = tasks.filter((t) =>
        t.dependsOn.every((depId) => {
          const dep = this.tasks.get(depId);
          return dep?.status === "completed";
        }),
      );
    }

    // Sort by creation time
    tasks.sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );

    if (filters?.limit) {
      tasks = tasks.slice(0, filters.limit);
    }

    return tasks;
  }

  update(id: string, fields: Partial<Task>): Task | undefined {
    const task = this.tasks.get(id);
    if (!task || task.deleted) return undefined;

    if (fields.title !== undefined) task.title = fields.title;
    if (fields.description !== undefined) task.description = fields.description;
    if (fields.repoURL !== undefined) task.repoURL = fields.repoURL;
    if (fields.status !== undefined) task.status = fields.status as TaskStatus;
    if (fields.dependsOn !== undefined) task.dependsOn = fields.dependsOn;
    if (fields.parentID !== undefined) task.parentID = fields.parentID;
    task.updatedAt = new Date().toISOString();

    return task;
  }

  delete(id: string): boolean {
    const task = this.tasks.get(id);
    if (!task || task.deleted) return false;
    task.deleted = true;
    task.updatedAt = new Date().toISOString();
    return true;
  }
}

/** Singleton task store for the process */
const globalTaskStore = new TaskStore();

/**
 * Factory: create a task_list ToolSpec.
 *
 * 逆向: _XR spec + bXR fn
 */
export function createTaskListTool(taskStore?: TaskStore): ToolSpec {
  const store = taskStore ?? globalTaskStore;

  return {
    name: "task_list",
    description: `Plan and track tasks. Use this tool for ALL task planning - breaking down work into steps, tracking progress, and managing what needs to be done.

Actions:
- create: Create a new task with title (required), description, repoURL, status, dependsOn, parentID
- list: List tasks with optional filters (repoURL, status, limit, ready). Completed tasks are excluded by default; use status filter to include them.
- get: Get a single task by taskID
- update: Update a task by taskID with new values
- delete: Soft delete a task by taskID

Use dependsOn to specify task dependencies - an array of task IDs that block this task. If B dependsOn A, then A blocks B (A must complete before B can start). Use \`ready: true\` with the list action to find tasks where all blockers are completed. Use parentID to establish parent-child relationships between tasks (for hierarchical task breakdown). Tasks persist across sessions and the creating thread ID is automatically recorded.

Write task descriptions with enough context that a future thread can pick up the work without needing the original conversation. Include relevant file paths, function names, error messages, or acceptance criteria.`,
    inputSchema: {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: ["create", "list", "get", "update", "delete"],
          description: "The action to perform",
        },
        taskID: {
          type: "string",
          description: "Task ID (required for get, update, delete)",
        },
        title: {
          type: "string",
          description: "Task title (required for create, optional for update)",
        },
        description: {
          type: "string",
          description: "Task description",
        },
        repoURL: {
          type: "string",
          description: "Repository URL to associate with the task",
        },
        status: {
          type: "string",
          enum: ["open", "in_progress", "completed"],
          description: "Task status",
        },
        dependsOn: {
          type: "array",
          items: { type: "string" },
          description:
            "Array of task IDs this task depends on - should be done after these tasks",
        },
        parentID: {
          type: "string",
          description: "Parent task ID for hierarchical task breakdown",
        },
        limit: {
          type: "number",
          description: "Maximum number of tasks to return (for list action)",
        },
        ready: {
          type: "boolean",
          description:
            "Filter to only return tasks that are ready to work on (all dependencies completed)",
        },
      },
      required: ["action"],
    },
    source: "builtin",
    isReadOnly: false,
    executionProfile: {
      resourceKeys: [],
    },

    async execute(args: Record<string, unknown>, context: ToolContext): Promise<ToolResult> {
      const action = args.action as string;

      if (!action) {
        return { status: "error", error: "Missing required field: action" };
      }

      log.debug("task_list called", { action, args });

      switch (action) {
        case "create": {
          const title = args.title as string;
          if (!title) {
            return {
              status: "error",
              error: "Missing required field: title (for create action)",
            };
          }
          const task = store.create(
            {
              title,
              description: args.description as string | undefined,
              repoURL: args.repoURL as string | undefined,
              status: (args.status as TaskStatus) ?? "open",
              dependsOn: (args.dependsOn as string[]) ?? [],
              parentID: args.parentID as string | undefined,
            },
            context.threadId,
          );
          return {
            status: "done",
            content: `Created task "${task.title}" with ID: ${task.id}`,
            data: { task },
          };
        }

        case "list": {
          const tasks = store.list({
            repoURL: args.repoURL as string | undefined,
            status: args.status as TaskStatus | undefined,
            limit: args.limit as number | undefined,
            ready: args.ready as boolean | undefined,
          });

          if (tasks.length === 0) {
            return { status: "done", content: "No tasks found." };
          }

          const formatted = tasks
            .map(
              (t) =>
                `- [${t.status}] ${t.id}: ${t.title}${t.dependsOn.length ? ` (depends on: ${t.dependsOn.join(", ")})` : ""}`,
            )
            .join("\n");

          return {
            status: "done",
            content: `Found ${tasks.length} task(s):\n${formatted}`,
            data: { tasks },
          };
        }

        case "get": {
          const taskID = args.taskID as string;
          if (!taskID) {
            return {
              status: "error",
              error: "Missing required field: taskID (for get action)",
            };
          }
          const task = store.get(taskID);
          if (!task) {
            return { status: "error", error: `Task "${taskID}" not found` };
          }
          return {
            status: "done",
            content: `Task ${task.id}:\n  Title: ${task.title}\n  Status: ${task.status}\n  Description: ${task.description ?? "(none)"}\n  Dependencies: ${task.dependsOn.join(", ") || "(none)"}\n  Parent: ${task.parentID ?? "(none)"}`,
            data: { task },
          };
        }

        case "update": {
          const taskID = args.taskID as string;
          if (!taskID) {
            return {
              status: "error",
              error: "Missing required field: taskID (for update action)",
            };
          }
          const updated = store.update(taskID, {
            title: args.title as string | undefined,
            description: args.description as string | undefined,
            repoURL: args.repoURL as string | undefined,
            status: args.status as TaskStatus | undefined,
            dependsOn: args.dependsOn as string[] | undefined,
            parentID: args.parentID as string | undefined,
          });
          if (!updated) {
            return { status: "error", error: `Task "${taskID}" not found` };
          }
          return {
            status: "done",
            content: `Updated task "${updated.title}" (${updated.id}), status: ${updated.status}`,
            data: { task: updated },
          };
        }

        case "delete": {
          const taskID = args.taskID as string;
          if (!taskID) {
            return {
              status: "error",
              error: "Missing required field: taskID (for delete action)",
            };
          }
          const deleted = store.delete(taskID);
          if (!deleted) {
            return { status: "error", error: `Task "${taskID}" not found` };
          }
          return {
            status: "done",
            content: `Deleted task "${taskID}"`,
          };
        }

        default:
          return {
            status: "error",
            error: `Unknown action: ${action}. Valid actions: create, list, get, update, delete`,
          };
      }
    },
  };
}
