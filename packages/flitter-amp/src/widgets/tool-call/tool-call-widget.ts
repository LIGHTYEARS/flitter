// ToolCallWidget — top-level dispatch widget for 35+ tool types
// Amp ref: xD function — switches on toolCall.name to select specific renderers
// Dispatches to specialized tool widgets or falls back to GenericToolCard

import { StatelessWidget, Widget, BuildContext } from 'flitter-core/src/framework/widget';
import type { ToolCallItem } from '../../acp/types';
import { GenericToolCard } from './generic-tool-card';
import { ReadTool } from './read-tool';
import { EditFileTool } from './edit-file-tool';
import { BashTool } from './bash-tool';
import { GrepTool } from './grep-tool';
import { TaskTool } from './task-tool';
import { CreateFileTool } from './create-file-tool';
import { WebSearchTool } from './web-search-tool';
import { HandoffTool } from './handoff-tool';
import { TodoListTool } from './todo-list-tool';
import { TOOL_NAME_MAP, resolveToolName } from './resolve-tool-name';

interface ToolCallWidgetProps {
  toolCall: ToolCallItem;
  isExpanded?: boolean;
  onToggle?: () => void;
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
 */
export class ToolCallWidget extends StatelessWidget {
  private readonly toolCall: ToolCallItem;
  private readonly isExpanded: boolean;
  private readonly onToggle?: () => void;
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

    if (name.startsWith('sa__') || name.startsWith('tb__')) {
      return new TaskTool({
        toolCall: this.toolCall,
        isExpanded: expanded,
        onToggle: toggle,
        childWidgets: this.childWidgets,
      });
    }

    switch (name) {
      case 'Read':
        return new ReadTool({ toolCall: this.toolCall, isExpanded: expanded, onToggle: toggle });

      case 'edit_file':
      case 'apply_patch':
      case 'undo_edit':
        return new EditFileTool({ toolCall: this.toolCall, isExpanded: expanded, onToggle: toggle });

      case 'create_file':
        return new CreateFileTool({ toolCall: this.toolCall, isExpanded: expanded, onToggle: toggle });

      case 'Bash':
      case 'shell_command':
      case 'REPL':
        return new BashTool({ toolCall: this.toolCall, isExpanded: expanded, onToggle: toggle });

      case 'Grep':
      case 'glob':
      case 'Glob':
      case 'Search':
      case 'LS':
        return new GrepTool({ toolCall: this.toolCall, isExpanded: expanded, onToggle: toggle });

      case 'WebSearch':
      case 'read_web_page':
        return new WebSearchTool({ toolCall: this.toolCall, isExpanded: expanded, onToggle: toggle });

      case 'Task':
      case 'oracle':
      case 'code_review':
      case 'librarian':
        return new TaskTool({
          toolCall: this.toolCall,
          isExpanded: expanded,
          onToggle: toggle,
          childWidgets: this.childWidgets,
        });

      case 'handoff':
        return new HandoffTool({ toolCall: this.toolCall, isExpanded: expanded, onToggle: toggle });

      case 'todo_list':
      case 'todo_write':
      case 'todo_read':
        return new TodoListTool({ toolCall: this.toolCall, isExpanded: expanded, onToggle: toggle });

      case 'painter':
      case 'mermaid':
      case 'chart':
      case 'look_at':
      case 'format_file':
      case 'skill':
      case 'get_diagnostics':
      case 'EnterPlanMode':
      case 'ExitPlanMode':
        return new GenericToolCard({
          toolCall: this.toolCall,
          isExpanded: expanded,
          onToggle: toggle,
        });

      default:
        return new GenericToolCard({
          toolCall: this.toolCall,
          isExpanded: expanded,
          onToggle: toggle,
        });
    }
  }
}
