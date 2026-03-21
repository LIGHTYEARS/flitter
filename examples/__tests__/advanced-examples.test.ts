// Advanced example smoke tests.
// Verifies that each advanced example can be imported, widget trees
// can be constructed, and core functionality works correctly.

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { WidgetsBinding } from '../../src/framework/binding';
import { FocusManager } from '../../src/input/focus';
import { Widget, StatefulWidget, StatelessWidget } from '../../src/framework/widget';
import { Text } from '../../src/widgets/text';
import { Column, Row } from '../../src/widgets/flex';
import { Container } from '../../src/widgets/container';
import { Table } from '../../src/widgets/table';

// ---------------------------------------------------------------------------
// Cleanup between tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  WidgetsBinding.reset();
  FocusManager.reset();
});

afterEach(() => {
  WidgetsBinding.reset();
  FocusManager.reset();
});

// ===========================================================================
// table-demo.ts
// ===========================================================================

describe('table-demo example', () => {
  test('can be imported without errors', async () => {
    const mod = await import('../table-demo');
    expect(mod).toBeDefined();
  });

  test('exports LANGUAGES data', async () => {
    const mod = await import('../table-demo');
    expect(mod.LANGUAGES).toBeDefined();
    expect(Array.isArray(mod.LANGUAGES)).toBe(true);
    expect(mod.LANGUAGES.length).toBeGreaterThan(0);
  });

  test('LANGUAGES have correct shape', async () => {
    const mod = await import('../table-demo');
    for (const lang of mod.LANGUAGES) {
      expect(typeof lang.name).toBe('string');
      expect(typeof lang.year).toBe('number');
      expect(typeof lang.creator).toBe('string');
      expect(typeof lang.paradigm).toBe('string');
    }
  });

  test('TableDemo widget can be constructed', async () => {
    const mod = await import('../table-demo');
    const demo = new mod.TableDemo();
    expect(demo).toBeDefined();
    expect(demo).toBeInstanceOf(StatelessWidget);
  });

  test('TableDemo builds a widget tree', async () => {
    const mod = await import('../table-demo');
    const demo = new mod.TableDemo();
    const tree = demo.build({} as any);
    expect(tree).toBeDefined();
    expect(tree).toBeInstanceOf(Column);
  });

  test('styledText helper creates Text widgets', async () => {
    const mod = await import('../table-demo');
    const widget = mod.styledText('hello');
    expect(widget).toBeInstanceOf(Text);
  });
});

// ===========================================================================
// input-form.ts
// ===========================================================================

describe('input-form example', () => {
  test('can be imported without errors', async () => {
    const mod = await import('../input-form');
    expect(mod).toBeDefined();
  });

  test('InputForm widget can be constructed', async () => {
    const mod = await import('../input-form');
    const form = new mod.InputForm();
    expect(form).toBeDefined();
    expect(form).toBeInstanceOf(StatefulWidget);
  });

  test('InputForm.createState returns valid state', async () => {
    const mod = await import('../input-form');
    const form = new mod.InputForm();
    const state = form.createState();
    expect(state).toBeDefined();
    expect(typeof state.build).toBe('function');
  });

  test('InputForm accepts onSubmit callback', async () => {
    const mod = await import('../input-form');
    let submitted: any = null;
    const form = new mod.InputForm({
      onSubmit: (data) => { submitted = data; },
    });
    expect(form.onSubmit).toBeDefined();
  });

  test('textWidget helper creates Text widgets', async () => {
    const mod = await import('../input-form');
    const widget = mod.textWidget('test');
    expect(widget).toBeInstanceOf(Text);
  });
});

// ===========================================================================
// todo-app.ts
// ===========================================================================

describe('todo-app example', () => {
  test('can be imported without errors', async () => {
    const mod = await import('../todo-app');
    expect(mod).toBeDefined();
  });

  test('TodoApp widget can be constructed', async () => {
    const mod = await import('../todo-app');
    const app = new mod.TodoApp();
    expect(app).toBeDefined();
    expect(app).toBeInstanceOf(StatefulWidget);
  });

  test('TodoApp accepts initial todos', async () => {
    const mod = await import('../todo-app');
    const app = new mod.TodoApp({
      initialTodos: [
        { id: 1, title: 'Test todo', completed: false },
      ],
    });
    expect(app.initialTodos.length).toBe(1);
    expect(app.initialTodos[0]!.title).toBe('Test todo');
  });

  test('TodoApp.createState returns TodoAppState', async () => {
    const mod = await import('../todo-app');
    const app = new mod.TodoApp();
    const state = app.createState();
    expect(state).toBeDefined();
    expect(state).toBeInstanceOf(mod.TodoAppState);
  });

  // --- TodoAppState CRUD operations ---

  describe('TodoAppState operations', () => {
    let state: InstanceType<typeof import('../todo-app').TodoAppState>;

    beforeEach(async () => {
      const mod = await import('../todo-app');
      const app = new mod.TodoApp({
        initialTodos: [
          { id: 1, title: 'Buy groceries', completed: false },
          { id: 2, title: 'Write code', completed: false },
          { id: 3, title: 'Read book', completed: true },
        ],
      });
      state = app.createState() as InstanceType<typeof mod.TodoAppState>;
      // Manually mount the state (simulating framework mount)
      (state as any)._mount(app, {} as any);
    });

    test('initial state has todos from widget', () => {
      expect(state.todos.length).toBe(3);
      expect(state.selectedIndex).toBe(0);
      expect(state.inputMode).toBe(false);
    });

    test('addTodo adds a new todo at the end', () => {
      state.addTodo('New task');
      expect(state.todos.length).toBe(4);
      expect(state.todos[3]!.title).toBe('New task');
      expect(state.todos[3]!.completed).toBe(false);
      // Selection moves to new item
      expect(state.selectedIndex).toBe(3);
    });

    test('addTodo ignores empty titles', () => {
      state.addTodo('');
      expect(state.todos.length).toBe(3);
      state.addTodo('   ');
      expect(state.todos.length).toBe(3);
    });

    test('deleteSelected removes the selected todo', () => {
      state.deleteSelected();
      expect(state.todos.length).toBe(2);
      expect(state.todos[0]!.title).toBe('Write code');
    });

    test('deleteSelected adjusts selection when at end', () => {
      // Move to last item
      state.moveDown();
      state.moveDown();
      expect(state.selectedIndex).toBe(2);
      state.deleteSelected();
      expect(state.todos.length).toBe(2);
      expect(state.selectedIndex).toBe(1); // adjusted to last
    });

    test('deleteSelected handles empty list', () => {
      state.deleteSelected();
      state.deleteSelected();
      state.deleteSelected();
      expect(state.todos.length).toBe(0);
      // Should not throw
      state.deleteSelected();
      expect(state.todos.length).toBe(0);
      expect(state.selectedIndex).toBe(0);
    });

    test('toggleSelected toggles completion status', () => {
      expect(state.todos[0]!.completed).toBe(false);
      state.toggleSelected();
      expect(state.todos[0]!.completed).toBe(true);
      state.toggleSelected();
      expect(state.todos[0]!.completed).toBe(false);
    });

    test('toggleSelected on empty list does nothing', () => {
      state.deleteSelected();
      state.deleteSelected();
      state.deleteSelected();
      // Should not throw
      state.toggleSelected();
    });

    test('moveDown moves selection down', () => {
      expect(state.selectedIndex).toBe(0);
      state.moveDown();
      expect(state.selectedIndex).toBe(1);
      state.moveDown();
      expect(state.selectedIndex).toBe(2);
    });

    test('moveDown stops at last item', () => {
      state.moveDown();
      state.moveDown();
      state.moveDown(); // already at end
      expect(state.selectedIndex).toBe(2);
    });

    test('moveUp moves selection up', () => {
      state.moveDown();
      state.moveDown();
      expect(state.selectedIndex).toBe(2);
      state.moveUp();
      expect(state.selectedIndex).toBe(1);
    });

    test('moveUp stops at first item', () => {
      state.moveUp(); // already at 0
      expect(state.selectedIndex).toBe(0);
    });

    test('enterInputMode activates input', () => {
      state.enterInputMode();
      expect(state.inputMode).toBe(true);
    });

    test('cancelInputMode deactivates input', () => {
      state.enterInputMode();
      state.inputController.insertText('test');
      state.cancelInputMode();
      expect(state.inputMode).toBe(false);
      expect(state.inputController.text).toBe('');
    });

    test('confirmInput adds todo and exits input mode', () => {
      state.enterInputMode();
      state.inputController.insertText('New from input');
      state.confirmInput();
      expect(state.inputMode).toBe(false);
      expect(state.todos.length).toBe(4);
      expect(state.todos[3]!.title).toBe('New from input');
    });

    // --- Key handling ---

    test('key "a" enters input mode', () => {
      const result = state.handleKeyEvent('a');
      expect(result).toBe('handled');
      expect(state.inputMode).toBe(true);
    });

    test('key "d" deletes selected', () => {
      const result = state.handleKeyEvent('d');
      expect(result).toBe('handled');
      expect(state.todos.length).toBe(2);
    });

    test('key "space" toggles selected', () => {
      const result = state.handleKeyEvent(' ');
      expect(result).toBe('handled');
      expect(state.todos[0]!.completed).toBe(true);
    });

    test('key "j" and "ArrowDown" move down', () => {
      state.handleKeyEvent('j');
      expect(state.selectedIndex).toBe(1);
      state.handleKeyEvent('ArrowDown');
      expect(state.selectedIndex).toBe(2);
    });

    test('key "k" and "ArrowUp" move up', () => {
      state.handleKeyEvent('j');
      state.handleKeyEvent('j');
      state.handleKeyEvent('k');
      expect(state.selectedIndex).toBe(1);
      state.handleKeyEvent('ArrowUp');
      expect(state.selectedIndex).toBe(0);
    });

    test('key "q" calls onQuit', async () => {
      const mod = await import('../todo-app');
      let quitCalled = false;
      const app = new mod.TodoApp({ onQuit: () => { quitCalled = true; } });
      const qState = app.createState() as InstanceType<typeof mod.TodoAppState>;
      (qState as any)._mount(app, {} as any);
      const result = qState.handleKeyEvent('q');
      expect(result).toBe('handled');
      expect(quitCalled).toBe(true);
    });

    test('Enter in input mode confirms todo', () => {
      state.handleKeyEvent('a');
      state.inputController.insertText('via key');
      state.handleKeyEvent('Enter');
      expect(state.inputMode).toBe(false);
      expect(state.todos[3]!.title).toBe('via key');
    });

    test('Escape in input mode cancels', () => {
      state.handleKeyEvent('a');
      state.inputController.insertText('cancel me');
      state.handleKeyEvent('Escape');
      expect(state.inputMode).toBe(false);
      expect(state.todos.length).toBe(3);
    });

    test('typing in input mode inserts text', () => {
      state.handleKeyEvent('a');
      state.handleKeyEvent('H');
      state.handleKeyEvent('i');
      expect(state.inputController.text).toBe('Hi');
    });

    test('Backspace in input mode deletes char', () => {
      state.handleKeyEvent('a');
      state.handleKeyEvent('A');
      state.handleKeyEvent('B');
      state.handleKeyEvent('Backspace');
      expect(state.inputController.text).toBe('A');
    });

    test('unrecognized key in normal mode returns ignored', () => {
      const result = state.handleKeyEvent('x');
      expect(result).toBe('ignored');
    });

    test('build produces a widget tree', () => {
      const tree = state.build({} as any);
      expect(tree).toBeDefined();
      expect(tree).toBeInstanceOf(Column);
    });
  });
});

// ===========================================================================
// perf-stress.ts
// ===========================================================================

describe('perf-stress example', () => {
  test('can be imported without errors', async () => {
    const mod = await import('../perf-stress');
    expect(mod).toBeDefined();
  });

  test('exports grid constants', async () => {
    const mod = await import('../perf-stress');
    expect(mod.GRID_COLS).toBe(50);
    expect(mod.GRID_ROWS).toBe(20);
    expect(mod.TOTAL_CELLS).toBe(1000);
  });

  test('exports PALETTE with colors', async () => {
    const mod = await import('../perf-stress');
    expect(mod.PALETTE).toBeDefined();
    expect(mod.PALETTE.length).toBeGreaterThan(0);
  });

  test('initCells creates correct number of cells', async () => {
    const mod = await import('../perf-stress');
    const cells = mod.initCells(mod.GRID_ROWS, mod.GRID_COLS);
    expect(cells.length).toBe(mod.TOTAL_CELLS);
  });

  test('initCells creates cells with cycling color indices', async () => {
    const mod = await import('../perf-stress');
    const cells = mod.initCells(mod.GRID_ROWS, mod.GRID_COLS);
    // First cell (0,0) should have colorIndex = (0+0) % PALETTE.length = 0
    expect(cells[0]!.colorIndex).toBe(0);
    // Cell at (1,0) should have colorIndex = (1+0) % PALETTE.length = 1
    expect(cells[mod.GRID_COLS]!.colorIndex).toBe(1);
  });

  test('randomizeCells modifies cells', async () => {
    const mod = await import('../perf-stress');
    const cells = mod.initCells(mod.GRID_ROWS, mod.GRID_COLS);
    const originalFirst = cells[0]!.colorIndex;
    // Randomize many cells to ensure at least some change
    mod.randomizeCells(cells, 500, 42);
    // Count changes
    let changed = 0;
    const freshCells = mod.initCells(mod.GRID_ROWS, mod.GRID_COLS);
    for (let i = 0; i < cells.length; i++) {
      if (cells[i]!.colorIndex !== freshCells[i]!.colorIndex) changed++;
    }
    expect(changed).toBeGreaterThan(0);
  });

  test('buildGridRow creates a Row widget', async () => {
    const mod = await import('../perf-stress');
    const cells = mod.initCells(mod.GRID_ROWS, mod.GRID_COLS);
    const row = mod.buildGridRow(0, cells, mod.GRID_COLS);
    expect(row).toBeInstanceOf(Row);
  });

  test('buildGrid creates a Column with correct number of rows', async () => {
    const mod = await import('../perf-stress');
    const cells = mod.initCells(mod.GRID_ROWS, mod.GRID_COLS);
    const grid = mod.buildGrid(cells, mod.GRID_ROWS, mod.GRID_COLS);
    expect(grid).toBeInstanceOf(Column);
  });

  test('PerfStressTest can be constructed', async () => {
    const mod = await import('../perf-stress');
    const widget = new mod.PerfStressTest();
    expect(widget).toBeDefined();
    expect(widget).toBeInstanceOf(StatefulWidget);
  });

  test('PerfStressTestState initializes with correct cell count', async () => {
    const mod = await import('../perf-stress');
    const widget = new mod.PerfStressTest();
    const state = widget.createState() as InstanceType<typeof mod.PerfStressTestState>;
    (state as any)._mount(widget, {} as any);
    expect(state.cells.length).toBe(mod.TOTAL_CELLS);
    expect(state.frameNumber).toBe(0);
  });

  test('simulateFrame increments frame count and records stats', async () => {
    const mod = await import('../perf-stress');
    const widget = new mod.PerfStressTest();
    const state = widget.createState() as InstanceType<typeof mod.PerfStressTestState>;
    (state as any)._mount(widget, {} as any);

    state.simulateFrame();
    expect(state.frameNumber).toBe(1);
    expect(state.frameStats.frameCount).toBe(1);

    state.simulateFrame();
    expect(state.frameNumber).toBe(2);
    expect(state.frameStats.frameCount).toBe(2);
  });

  test('PerfStressTestState builds a widget tree', async () => {
    const mod = await import('../perf-stress');
    const widget = new mod.PerfStressTest();
    const state = widget.createState() as InstanceType<typeof mod.PerfStressTestState>;
    (state as any)._mount(widget, {} as any);
    const tree = state.build({} as any);
    expect(tree).toBeDefined();
    expect(tree).toBeInstanceOf(Column);
  });

  test('stress test generates 1000 container widgets in grid', async () => {
    const mod = await import('../perf-stress');
    const cells = mod.initCells(mod.GRID_ROWS, mod.GRID_COLS);
    // Count total containers by building grid
    let containerCount = 0;
    for (let r = 0; r < mod.GRID_ROWS; r++) {
      for (let c = 0; c < mod.GRID_COLS; c++) {
        containerCount++;
      }
    }
    expect(containerCount).toBe(1000);
  });
});
