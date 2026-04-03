// TodoListTool — todo checklist display with status icons and colors
//
// Renders a todo_list / todo_write / todo_read tool call:
//   Header: [status icon] todo_write [title detail]
//   Body (expanded): list of todo entries with status-specific icons:
//     - pending:     empty circle (dim)
//     - in_progress: half circle (yellow)
//     - completed:   checkmark (green, content dim)
//     - cancelled:   cross (dim)
//
// Ported from flitter-amp/src/widgets/tool-call/todo-list-tool.ts
// — AmpThemeProvider color lookups replaced with direct Color.* constants
// — icon('todo.status.*') replaced with todoStatusIcon() from tool-icons.ts

import {
  StatelessWidget,
  Widget,
  type BuildContext,
} from '../../../../flitter-core/src/framework/widget';
import { Column } from '../../../../flitter-core/src/widgets/flex';
import { Text } from '../../../../flitter-core/src/widgets/text';
import { TextStyle } from '../../../../flitter-core/src/core/text-style';
import { TextSpan } from '../../../../flitter-core/src/core/text-span';
import { Color } from '../../../../flitter-core/src/core/color';
import { Padding } from '../../../../flitter-core/src/widgets/padding';
import { EdgeInsets } from '../../../../flitter-core/src/layout/edge-insets';
import { ToolHeader } from './tool-header';
import type { BaseToolProps, ToolCallItem } from './base-tool-props';
import { asString, asArray, isTodoEntry } from '../../utils/raw-input';
import { resolveToolDisplayName, extractTitleDetail } from './resolve-tool-name';
import { todoStatusIcon } from './tool-icons';

interface TodoListToolProps extends BaseToolProps {}

/** Shape of a parsed todo entry for rendering. */
interface TodoEntry {
  content: string;
  status: string;
  priority?: string;
}

/**
 * Renders a todo_list / todo_write / todo_read tool call.
 * Shows a checklist with status icons from the todoStatusIcon helper.
 */
export class TodoListTool extends StatelessWidget {
  private readonly toolCall: ToolCallItem;
  private readonly isExpanded: boolean;
  private readonly onToggle?: () => void;

  constructor(props: TodoListToolProps) {
    super({});
    this.toolCall = props.toolCall;
    this.isExpanded = props.isExpanded;
    this.onToggle = props.onToggle;
  }

  build(_context: BuildContext): Widget {
    const titleDetail = extractTitleDetail(this.toolCall);
    const header = new ToolHeader({
      name: resolveToolDisplayName(this.toolCall),
      status: this.toolCall.status,
      details: titleDetail ? [titleDetail] : [],
      onToggle: this.onToggle,
    });

    if (!this.isExpanded) {
      return header;
    }

    const entries = this.extractTodoEntries();
    if (entries.length === 0) {
      return header;
    }

    const entryWidgets: Widget[] = entries.map(entry => {
      const { icon, color } = this.getStatusDisplay(entry.status);
      return new Text({
        text: new TextSpan({
          children: [
            new TextSpan({
              text: `  ${icon} `,
              style: new TextStyle({ foreground: color }),
            }),
            new TextSpan({
              text: entry.content,
              style: new TextStyle({
                foreground: entry.status === 'completed'
                  ? Color.brightBlack
                  : Color.defaultColor,
                dim: entry.status === 'completed',
              }),
            }),
          ],
        }),
      });
    });

    return new Column({
      mainAxisSize: 'min',
      crossAxisAlignment: 'stretch',
      children: [
        header,
        new Padding({
          padding: EdgeInsets.only({ left: 2 }),
          child: new Column({
            mainAxisSize: 'min',
            crossAxisAlignment: 'stretch',
            children: entryWidgets,
          }),
        }),
      ],
    });
  }

  /**
   * Returns the status icon and color for a todo entry.
   * Uses todoStatusIcon() from tool-icons.ts and direct Color constants.
   */
  private getStatusDisplay(status: string): { icon: string; color: Color } {
    switch (status) {
      case 'pending':
        return { icon: todoStatusIcon('pending'), color: Color.brightBlack };
      case 'in_progress':
        return { icon: todoStatusIcon('in_progress'), color: Color.yellow };
      case 'completed':
        return { icon: todoStatusIcon('completed'), color: Color.green };
      case 'cancelled':
        return { icon: todoStatusIcon('cancelled'), color: Color.brightBlack };
      default:
        return { icon: todoStatusIcon('pending'), color: Color.brightBlack };
    }
  }

  /**
   * Extracts todo entries from the tool's rawInput or result.
   * Checks rawInput.todos first, falls back to result.rawOutput.todos/items.
   */
  private extractTodoEntries(): TodoEntry[] {
    const input = this.toolCall.rawInput;
    if (input) {
      const todos = asArray(input['todos'], isTodoEntry);
      if (todos.length > 0) {
        return todos.map(t => ({
          content: asString(t.content),
          status: asString(t.status, 'pending'),
          priority: typeof t.priority === 'string' ? t.priority : undefined,
        }));
      }
    }

    const raw = this.toolCall.result?.rawOutput;
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      const candidates = raw['todos'] ?? raw['items'];
      const todos = asArray(candidates, isTodoEntry);
      if (todos.length > 0) {
        return todos.map(t => ({
          content: asString(t.content),
          status: asString(t.status, 'pending'),
          priority: typeof t.priority === 'string' ? t.priority : undefined,
        }));
      }
    }

    return [];
  }
}
