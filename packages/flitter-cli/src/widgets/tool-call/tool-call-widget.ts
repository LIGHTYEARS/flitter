// ToolCallWidget — top-level dispatch widget for tool call rendering
//
// Routes a ToolCallItem to the appropriate specialized renderer based on
// the resolved tool name. In this initial version (Plan 18-02), ALL routes
// map to GenericToolCard as the fallback. The full dispatch switch structure
// is included with commented placeholders for specialized renderers.
//
// Ported from flitter-amp/src/widgets/tool-call/tool-call-widget.ts
// — specialized renderer imports deferred to Plans 18-03 and 18-04
// — sa__/tb__ prefix detection retained for sub-agent tools

import {
  StatelessWidget,
  Widget,
  type BuildContext,
} from '../../../../flitter-core/src/framework/widget';
import type { ToolCallItem } from '../../state/types';
import { GenericToolCard } from './generic-tool-card';
import { TOOL_NAME_MAP, resolveToolName } from './resolve-tool-name';

/** Props for the ToolCallWidget dispatch widget. */
interface ToolCallWidgetProps {
  toolCall: ToolCallItem;
  isExpanded?: boolean;
  onToggle?: () => void;
  /** Child widgets for TaskTool nesting support (Plan 18-04). */
  childWidgets?: Widget[];
}

/**
 * Top-level dispatch widget that routes a ToolCallItem to the appropriate
 * specialized renderer based on resolved tool name.
 *
 * Handles 35+ tool types matching Amp CLI and Coco ACP:
 *   - File I/O: Read, edit_file, create_file, apply_patch, undo_edit
 *   - Shell: Bash, shell_command, REPL
 *   - Search: Grep, glob, Glob, Search, LS, WebSearch, read_web_page
 *   - Sub-agents: Task, oracle, code_review, librarian, handoff
 *   - Todo: todo_list, todo_write, todo_read
 *   - Visual: painter, mermaid, chart, look_at
 *   - Utility: format_file, skill, get_diagnostics, EnterPlanMode, ExitPlanMode
 *   - Prefixed: sa__* (sub-agent), tb__* (toolbox)
 *   - Default: GenericToolCard fallback
 *
 * Currently all routes map to GenericToolCard. Specialized renderers are
 * added incrementally:
 *   Plan 18-03: ReadTool, EditFileTool, CreateFileTool, BashTool, GrepTool, WebSearchTool, TodoListTool
 *   Plan 18-04: HandoffTool, TaskTool
 */
export class ToolCallWidget extends StatelessWidget {
  private readonly toolCall: ToolCallItem;
  private readonly isExpanded: boolean;
  private readonly onToggle?: () => void;
  /** Accepted for future TaskTool nesting (Plan 18-04); currently unused. */
  // @ts-expect-error TS6133 — stored for Plan 18-04 TaskTool nesting
  private readonly childWidgets?: Widget[];

  constructor(props: ToolCallWidgetProps) {
    super({});
    this.toolCall = props.toolCall;
    this.isExpanded = props.isExpanded ?? !props.toolCall.collapsed;
    this.onToggle = props.onToggle;
    this.childWidgets = props.childWidgets;
  }

  build(_context: BuildContext): Widget {
    const rawName = resolveToolName(this.toolCall);
    const name = TOOL_NAME_MAP[rawName] ?? rawName;
    const expanded = this.isExpanded;
    const toggle = this.onToggle;

    // --- Prefix-based routing for sub-agent / toolbox tools ---
    if (name.startsWith('sa__') || name.startsWith('tb__')) {
      // Plan 18-04 adds TaskTool; GenericToolCard fallback for now
      return new GenericToolCard({
        toolCall: this.toolCall,
        isExpanded: expanded,
        onToggle: toggle,
      });
    }

    // --- Name-based dispatch switch ---
    // Plan 18-03 adds: ReadTool, EditFileTool, CreateFileTool, BashTool,
    //   GrepTool, WebSearchTool, TodoListTool
    // Plan 18-04 adds: HandoffTool, TaskTool
    switch (name) {
      case 'Read':
        // Plan 18-03: return new ReadTool({ ... })
        return new GenericToolCard({ toolCall: this.toolCall, isExpanded: expanded, onToggle: toggle });

      case 'edit_file':
      case 'apply_patch':
      case 'undo_edit':
        // Plan 18-03: return new EditFileTool({ ... })
        return new GenericToolCard({ toolCall: this.toolCall, isExpanded: expanded, onToggle: toggle });

      case 'create_file':
        // Plan 18-03: return new CreateFileTool({ ... })
        return new GenericToolCard({ toolCall: this.toolCall, isExpanded: expanded, onToggle: toggle });

      case 'Bash':
      case 'shell_command':
      case 'REPL':
        // Plan 18-03: return new BashTool({ ... })
        return new GenericToolCard({ toolCall: this.toolCall, isExpanded: expanded, onToggle: toggle });

      case 'Grep':
      case 'glob':
      case 'Glob':
      case 'Search':
      case 'LS':
        // Plan 18-03: return new GrepTool({ ... })
        return new GenericToolCard({ toolCall: this.toolCall, isExpanded: expanded, onToggle: toggle });

      case 'WebSearch':
      case 'read_web_page':
        // Plan 18-03: return new WebSearchTool({ ... })
        return new GenericToolCard({ toolCall: this.toolCall, isExpanded: expanded, onToggle: toggle });

      case 'Task':
      case 'oracle':
      case 'code_review':
      case 'librarian':
        // Plan 18-04: return new TaskTool({ ..., childWidgets })
        return new GenericToolCard({ toolCall: this.toolCall, isExpanded: expanded, onToggle: toggle });

      case 'handoff':
        // Plan 18-04: return new HandoffTool({ ... })
        return new GenericToolCard({ toolCall: this.toolCall, isExpanded: expanded, onToggle: toggle });

      case 'todo_list':
      case 'todo_write':
      case 'todo_read':
        // Plan 18-03: return new TodoListTool({ ... })
        return new GenericToolCard({ toolCall: this.toolCall, isExpanded: expanded, onToggle: toggle });

      case 'painter':
      case 'mermaid':
      case 'chart':
      case 'look_at':
      case 'format_file':
      case 'skill':
      case 'get_diagnostics':
      case 'EnterPlanMode':
      case 'ExitPlanMode':
        return new GenericToolCard({ toolCall: this.toolCall, isExpanded: expanded, onToggle: toggle });

      default:
        return new GenericToolCard({ toolCall: this.toolCall, isExpanded: expanded, onToggle: toggle });
    }
  }
}
