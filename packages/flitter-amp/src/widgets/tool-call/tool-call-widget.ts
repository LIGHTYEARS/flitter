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

interface ToolCallWidgetProps {
  toolCall: ToolCallItem;
  isExpanded?: boolean;
  onToggle?: () => void;
}

/**
 * Normalizes common agent tool name variants to canonical names
 * used by the dispatch switch below.
 */
const TOOL_NAME_MAP: Record<string, string> = {
  read_file: 'Read',
  ReadFile: 'Read',
  execute_command: 'Bash',
  shell: 'Bash',
  run_command: 'Bash',
  terminal: 'Bash',
  search: 'Grep',
  grep: 'Grep',
  ripgrep: 'Grep',
  find_files: 'Grep',
  list_files: 'Grep',
  write_file: 'create_file',
  write_to_file: 'create_file',
  WriteFile: 'create_file',
  edit: 'edit_file',
  str_replace_editor: 'edit_file',
  EditTool: 'edit_file',
  web_search: 'WebSearch',
  browser: 'WebSearch',
  fetch_url: 'WebSearch',
};

/**
 * Top-level dispatch widget that routes a ToolCallItem to the appropriate
 * specialized renderer based on toolCall.kind (the tool name).
 *
 * Handles 35+ tool types matching Amp CLI's architecture:
 *   - File I/O: Read, edit_file, create_file, apply_patch, undo_edit
 *   - Shell: Bash, shell_command, REPL
 *   - Search: Grep, glob, Glob, Search, WebSearch, read_web_page
 *   - Sub-agents: Task, oracle, code_review, librarian, handoff
 *   - Todo: todo_list, todo_write, todo_read
 *   - Visual: painter, mermaid, chart, look_at
 *   - Utility: format_file, skill, get_diagnostics
 *   - Prefixed: sa__* (sub-agent), tb__* (toolbox)
 *   - Default: GenericToolCard fallback
 */
export class ToolCallWidget extends StatelessWidget {
  private readonly toolCall: ToolCallItem;
  private readonly isExpanded: boolean;
  private readonly onToggle?: () => void;

  constructor(props: ToolCallWidgetProps) {
    super({});
    this.toolCall = props.toolCall;
    this.isExpanded = props.isExpanded ?? !props.toolCall.collapsed;
    this.onToggle = props.onToggle;
  }

  build(_context: BuildContext): Widget {
    const rawName = this.toolCall.kind;
    const name = TOOL_NAME_MAP[rawName] ?? rawName;
    const expanded = this.isExpanded;
    const toggle = this.onToggle;

    if (name.startsWith('sa__') || name.startsWith('tb__')) {
      return new TaskTool({ toolCall: this.toolCall, isExpanded: expanded, onToggle: toggle });
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
        return new GrepTool({ toolCall: this.toolCall, isExpanded: expanded, onToggle: toggle });

      case 'WebSearch':
      case 'read_web_page':
        return new WebSearchTool({ toolCall: this.toolCall, isExpanded: expanded, onToggle: toggle });

      case 'Task':
      case 'oracle':
      case 'code_review':
      case 'librarian':
        return new TaskTool({ toolCall: this.toolCall, isExpanded: expanded, onToggle: toggle });

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
