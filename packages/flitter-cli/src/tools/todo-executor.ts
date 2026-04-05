// TodoWrite tool executor for flitter-cli.
//
// Manages a session todo list. Receives a `todos` array and replaces the
// current plan entries via the onPlanUpdate callback on the tool context.

import type { ToolExecutor, ToolResult, ToolContext } from './executor';

/** Map TodoWrite status strings to PlanEntry status values. */
function mapTodoStatus(status: string): 'pending' | 'in_progress' | 'completed' {
  switch (status) {
    case 'pending':
      return 'pending';
    case 'in_progress':
      return 'in_progress';
    case 'completed':
      return 'completed';
    default:
      return 'pending';
  }
}

/**
 * TodoExecutor handles the TodoWrite tool.
 *
 * It converts the incoming `todos` array into PlanEntry format and
 * pushes them to the session via the `onPlanUpdate` callback. Returns
 * a summary of the todo counts by status.
 */
export class TodoExecutor implements ToolExecutor {
  async execute(
    input: Record<string, unknown>,
    context: ToolContext,
  ): Promise<ToolResult> {
    const todos = input.todos;
    if (!Array.isArray(todos)) {
      return { content: 'Error: "todos" must be an array', isError: true };
    }

    // Convert to PlanEntry format
    const entries = (todos as Array<{ content: string; status: string; activeForm?: string }>).map(
      (t) => ({
        content: t.content,
        status: mapTodoStatus(t.status),
        priority: 'medium' as const,
      }),
    );

    // Push to session via callback
    if (context.onPlanUpdate) {
      context.onPlanUpdate(entries);
    }

    // Format summary
    const counts = {
      pending: entries.filter((e) => e.status === 'pending').length,
      in_progress: entries.filter((e) => e.status === 'in_progress').length,
      completed: entries.filter((e) => e.status === 'completed').length,
    };

    return {
      content: `Todos updated: ${counts.completed} completed, ${counts.in_progress} in progress, ${counts.pending} pending (${entries.length} total)`,
      isError: false,
    };
  }
}
