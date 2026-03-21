// Todo App — A complete CRUD todo application demonstrating:
// - StatefulWidget with complex state
// - List rendering with dynamic children
// - Keyboard-driven CRUD operations
// - Focus management
// - Container styling with colors and borders
//
// Operations:
// - 'a': Add new todo (enter input mode)
// - 'd': Delete selected todo
// - 'space': Toggle complete/incomplete
// - 'j'/'ArrowDown': Move selection down
// - 'k'/'ArrowUp': Move selection up
// - 'q': Quit
// - Enter (in input mode): Confirm new todo
// - Escape: Cancel input mode
//
// Usage (conceptual — requires full binding to render):
//   bun run examples/todo-app.ts

import {
  StatefulWidget,
  State,
  Widget,
  type BuildContext,
} from '../src/framework/widget';
import { Text } from '../src/widgets/text';
import { Column, Row } from '../src/widgets/flex';
import { SizedBox } from '../src/widgets/sized-box';
import { Container } from '../src/widgets/container';
import { Divider } from '../src/widgets/divider';
import { Expanded } from '../src/widgets/flexible';
import { TextField, TextEditingController } from '../src/widgets/text-field';
import { TextSpan } from '../src/core/text-span';
import { TextStyle } from '../src/core/text-style';
import { Color } from '../src/core/color';
import { EdgeInsets } from '../src/layout/edge-insets';
import {
  BoxDecoration,
  Border,
  BorderSide,
} from '../src/layout/render-decorated';

// ---------------------------------------------------------------------------
// Data model
// ---------------------------------------------------------------------------

export interface Todo {
  id: number;
  title: string;
  completed: boolean;
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const titleStyle = new TextStyle({ bold: true, foreground: Color.cyan });
const completedStyle = new TextStyle({
  dim: true,
  strikethrough: true,
});
const normalStyle = new TextStyle();
const dimStyle = new TextStyle({ dim: true });
const selectedBg = Color.blue;

// ---------------------------------------------------------------------------
// Helper: create a Text widget from a string
// ---------------------------------------------------------------------------

function txt(content: string, style?: TextStyle): Text {
  return new Text({
    text: new TextSpan({ text: content, style: style ?? normalStyle }),
  });
}

// ---------------------------------------------------------------------------
// TodoApp Widget
// ---------------------------------------------------------------------------

export interface TodoAppOptions {
  initialTodos?: Todo[];
  onQuit?: () => void;
}

/**
 * TodoApp — A full CRUD todo application using StatefulWidget.
 */
export class TodoApp extends StatefulWidget {
  readonly initialTodos: Todo[];
  readonly onQuit?: () => void;

  constructor(opts?: TodoAppOptions) {
    super();
    this.initialTodos = opts?.initialTodos ?? [];
    this.onQuit = opts?.onQuit;
  }

  createState(): State<TodoApp> {
    return new TodoAppState();
  }
}

/**
 * TodoAppState — manages todo list, selection, and input mode.
 */
export class TodoAppState extends State<TodoApp> {
  private _todos: Todo[] = [];
  private _selectedIndex: number = 0;
  private _inputMode: boolean = false;
  private _inputController!: TextEditingController;
  private _nextId: number = 1;

  initState(): void {
    super.initState();
    this._inputController = new TextEditingController();
    // Copy initial todos
    for (const todo of this.widget.initialTodos) {
      this._todos.push({ ...todo });
      if (todo.id >= this._nextId) {
        this._nextId = todo.id + 1;
      }
    }
  }

  dispose(): void {
    this._inputController.dispose();
    super.dispose();
  }

  // --- Public accessors for testing ---

  get todos(): readonly Todo[] {
    return this._todos;
  }

  get selectedIndex(): number {
    return this._selectedIndex;
  }

  get inputMode(): boolean {
    return this._inputMode;
  }

  get inputController(): TextEditingController {
    return this._inputController;
  }

  // --- CRUD operations ---

  /** Add a new todo with the given title. */
  addTodo(title: string): void {
    if (title.trim().length === 0) return;
    this._todos.push({
      id: this._nextId++,
      title: title.trim(),
      completed: false,
    });
    // Select the newly added item
    this._selectedIndex = this._todos.length - 1;
  }

  /** Delete the todo at the selected index. */
  deleteSelected(): void {
    if (this._todos.length === 0) return;
    this._todos.splice(this._selectedIndex, 1);
    // Adjust selection
    if (this._selectedIndex >= this._todos.length && this._todos.length > 0) {
      this._selectedIndex = this._todos.length - 1;
    }
    if (this._todos.length === 0) {
      this._selectedIndex = 0;
    }
  }

  /** Toggle the completed status of the selected todo. */
  toggleSelected(): void {
    if (this._todos.length === 0) return;
    const todo = this._todos[this._selectedIndex];
    if (todo) {
      todo.completed = !todo.completed;
    }
  }

  /** Move selection down by one. */
  moveDown(): void {
    if (this._selectedIndex < this._todos.length - 1) {
      this._selectedIndex++;
    }
  }

  /** Move selection up by one. */
  moveUp(): void {
    if (this._selectedIndex > 0) {
      this._selectedIndex--;
    }
  }

  /** Enter input mode to add a new todo. */
  enterInputMode(): void {
    this._inputMode = true;
    this._inputController.clear();
  }

  /** Exit input mode without adding. */
  cancelInputMode(): void {
    this._inputMode = false;
    this._inputController.clear();
  }

  /** Confirm the new todo from input mode. */
  confirmInput(): void {
    const title = this._inputController.text;
    this.addTodo(title);
    this._inputMode = false;
    this._inputController.clear();
  }

  // --- Key handling ---

  /**
   * Handle keyboard events for the todo app.
   * Returns 'handled' if the key was consumed, 'ignored' otherwise.
   */
  handleKeyEvent(key: string): 'handled' | 'ignored' {
    if (this._inputMode) {
      return this._handleInputModeKey(key);
    }
    return this._handleNormalModeKey(key);
  }

  private _handleInputModeKey(key: string): 'handled' | 'ignored' {
    if (key === 'Enter') {
      this.confirmInput();
      return 'handled';
    }
    if (key === 'Escape') {
      this.cancelInputMode();
      return 'handled';
    }
    // Delegate printable characters and editing keys to the controller
    if (key === 'Backspace') {
      this._inputController.deleteBackward();
      return 'handled';
    }
    if (key.length === 1) {
      this._inputController.insertText(key);
      return 'handled';
    }
    return 'ignored';
  }

  private _handleNormalModeKey(key: string): 'handled' | 'ignored' {
    switch (key) {
      case 'a':
        this.enterInputMode();
        return 'handled';
      case 'd':
        this.deleteSelected();
        return 'handled';
      case ' ':
        this.toggleSelected();
        return 'handled';
      case 'j':
      case 'ArrowDown':
        this.moveDown();
        return 'handled';
      case 'k':
      case 'ArrowUp':
        this.moveUp();
        return 'handled';
      case 'q':
        this.widget.onQuit?.();
        return 'handled';
      default:
        return 'ignored';
    }
  }

  // --- Build ---

  build(_context: BuildContext): Widget {
    const headerBorder = Border.all(
      new BorderSide({ color: Color.cyan, style: 'rounded' }),
    );

    // Build todo list items
    const todoWidgets: Widget[] = this._todos.map((todo, i) => {
      const isSelected = i === this._selectedIndex;
      const checkbox = todo.completed ? '[x]' : '[ ]';
      const textStyle = todo.completed ? completedStyle : normalStyle;

      const itemDecoration = isSelected
        ? new BoxDecoration({ color: selectedBg })
        : new BoxDecoration();

      return new Container({
        decoration: itemDecoration,
        child: new Row({
          children: [
            txt(checkbox),
            new SizedBox({ width: 1 }),
            new Expanded({
              child: txt(todo.title, textStyle),
            }),
          ],
        }),
      });
    });

    // If no todos, show placeholder
    if (todoWidgets.length === 0) {
      todoWidgets.push(txt('  No todos yet. Press "a" to add one.', dimStyle));
    }

    // Bottom bar: input mode or help text
    const bottomBar: Widget = this._inputMode
      ? new Row({
          children: [
            txt('> '),
            new Expanded({
              child: new TextField({ controller: this._inputController }),
            }),
          ],
        })
      : txt('a:add  d:delete  space:toggle  j/k:navigate  q:quit', dimStyle);

    return new Column({
      children: [
        // Header
        new Container({
          decoration: new BoxDecoration({ border: headerBorder }),
          child: txt(' Todo App ', titleStyle),
        }),
        new Divider(),
        // Todo list
        new Expanded({
          child: new Column({
            mainAxisSize: 'min',
            children: todoWidgets,
          }),
        }),
        new Divider(),
        bottomBar,
      ],
    });
  }
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export { txt };
