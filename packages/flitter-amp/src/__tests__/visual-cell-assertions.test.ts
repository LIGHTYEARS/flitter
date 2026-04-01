/**
 * Visual cell-level assertion tests for flitter-amp.
 *
 * Uses captureToGrid() to render the App headlessly, then asserts on
 * individual cell characters and styles (bold, italic, color, etc.).
 *
 * Run:  bun test src/__tests__/visual-cell-assertions.test.ts
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';

import { WidgetsBinding } from 'flitter-core/src/framework/binding';
import { FrameScheduler } from 'flitter-core/src/scheduler/frame-scheduler';
import { Color } from 'flitter-core/src/core/color';

import { captureToGrid } from '../test-utils/capture';
import { App } from '../app';
import { AppState } from '../state/app-state';
import {
  findText,
  findTextOnce,
  findRow,
  readRow,
  readScreenText,
  assertStyleAt,
  assertStyleRange,
  assertRowContains,
  countNonBlankRows,
  type Grid,
  type TextLocation,
} from '../test-utils/grid-helpers';
import { createAppTestHarness } from '../test-utils/app-test-harness';
import { icon } from '../ui/icons/icon-registry';
import { toolStatusIcon } from '../ui/icons/icon-registry';

// ── Theme color constants (from dark.ts) ──────────────────────────────
const SUCCESS = Color.rgb(43, 161, 43);
const INFO = Color.rgb(66, 161, 255);
const WARNING = Color.rgb(255, 183, 27);
const DESTRUCTIVE = Color.rgb(189, 43, 43);
const ACCENT = Color.rgb(234, 123, 188);
const MUTED = Color.rgb(156, 156, 156);

function findFirstBrailleSpinner(grid: Grid): TextLocation | null {
  for (let y = 0; y < grid.height; y++) {
    for (let x = 0; x < grid.width; x++) {
      const ch = grid.getCell(x, y).char;
      if (!ch) continue;
      const code = ch.codePointAt(0);
      if (!code) continue;
      if (code >= 0x2800 && code <= 0x28ff) {
        return { x, y };
      }
    }
  }
  return null;
}

// ── Quote computation (matches chat-view.ts:179) ──────────────────────
const QUOTES = [
  '"The best way to predict the future is to invent it." — Alan Kay',
  '"Simplicity is the ultimate sophistication." — Leonardo da Vinci',
  '"Talk is cheap. Show me the code." — Linus Torvalds',
  '"First, solve the problem. Then, write the code." — John Johnson',
  '"Any sufficiently advanced technology is indistinguishable from magic." — Arthur C. Clarke',
];

function makeApp(appState: AppState): App {
  return new App({
    appState,
    onSubmit: () => {},
    onCancel: () => {},
  });
}

function capture(appState: AppState, cols = 120, rows = 40): Grid {
  return captureToGrid(makeApp(appState), { cols, rows });
}

describe('Cell-Level Assertions', () => {
  beforeEach(() => {
    WidgetsBinding.reset();
    FrameScheduler.reset();
  });

  afterEach(() => {
    WidgetsBinding.reset();
    FrameScheduler.reset();
  });

  // ════════════════════════════════════════════════════════════════════
  //  Welcome Screen
  // ════════════════════════════════════════════════════════════════════

  describe('Welcome Screen', () => {
    test('renders "Welcome to Amp" in bold', () => {
      const appState = new AppState();
      appState.cwd = '/home/user/project';
      appState.gitBranch = 'main';
      const grid = capture(appState);

      const pos = findTextOnce(grid, 'Welcome to Amp');
      assertStyleRange(grid, pos.x, pos.y, 'Welcome to Amp'.length, { bold: true });
    });

    test('renders keybind hint with correct colors', () => {
      const appState = new AppState();
      appState.cwd = '/home/user/project';
      appState.gitBranch = 'main';
      const grid = capture(appState);

      // "Ctrl+O" in info/keybind color (blue)
      const ctrlPos = findTextOnce(grid, 'Ctrl+O');
      assertStyleAt(grid, ctrlPos.x, ctrlPos.y, { fg: Color.blue });

      // "for help" in warning color (yellow)
      const helpRow = readRow(grid, ctrlPos.y);
      const helpIdx = helpRow.indexOf('for help');
      expect(helpIdx).toBeGreaterThan(-1);
      assertStyleAt(grid, helpIdx, ctrlPos.y, { fg: WARNING });
    });

    test('renders daily quote in italic', () => {
      const appState = new AppState();
      appState.cwd = '/home/user/project';
      appState.gitBranch = 'main';
      const grid = capture(appState);

      const dayIndex = Math.floor(Date.now() / 86400000) % QUOTES.length;
      // Quote may be wrapped; check for a unique substring from the beginning
      const quoteStart = QUOTES[dayIndex]!.slice(0, 20);
      const matches = findText(grid, quoteStart);
      expect(matches.length).toBeGreaterThanOrEqual(1);

      const pos = matches[0]!;
      assertStyleAt(grid, pos.x, pos.y, { italic: true });
    });

    test('renders content in 80x24 without overflow', () => {
      const appState = new AppState();
      appState.cwd = '~/project';
      appState.gitBranch = 'main';
      const grid = capture(appState, 80, 24);

      expect(grid.width).toBe(80);
      expect(grid.height).toBe(24);
      expect(countNonBlankRows(grid)).toBeGreaterThan(0);
      expect(findText(grid, 'Welcome to Amp').length).toBeGreaterThanOrEqual(1);
    });

    test('renders "settings: open in editor" prompt', () => {
      const appState = new AppState();
      appState.cwd = '/home/user/project';
      appState.gitBranch = 'main';
      const grid = capture(appState);

      const pos = findTextOnce(grid, 'settings: open in editor');
      expect(pos).toBeDefined();
    });

    test('renders density characters in welcome orb', () => {
      const appState = new AppState();
      appState.cwd = '/home/user/project';
      appState.gitBranch = 'main';
      const grid = capture(appState);

      const screenText = readScreenText(grid).join('\n');
      const densityChars = ['#', '*', '+', '='];
      const hasDensity = densityChars.some(ch => screenText.includes(ch));
      expect(hasDensity).toBe(true);
    });
  });

  // ════════════════════════════════════════════════════════════════════
  //  User Message
  // ════════════════════════════════════════════════════════════════════

  describe('User Message', () => {
    test('user message text is green italic', () => {
      const appState = new AppState();
      appState.cwd = '/home/user/project';
      appState.gitBranch = 'main';
      appState.conversation.addUserMessage('Hello world');
      const grid = capture(appState);

      const pos = findTextOnce(grid, 'Hello world');
      assertStyleRange(grid, pos.x, pos.y, 'Hello world'.length, { italic: true, fg: SUCCESS });
    });
  });

  // ════════════════════════════════════════════════════════════════════
  //  Assistant Message
  // ════════════════════════════════════════════════════════════════════

  describe('Assistant Message', () => {
    test('markdown bold renders as bold cells', () => {
      const appState = new AppState();
      appState.cwd = '/home/user/project';
      appState.gitBranch = 'main';
      appState.conversation.addUserMessage('test');
      appState.conversation.appendAssistantChunk('This is **important** text');
      appState.conversation.finalizeAssistantMessage();
      const grid = capture(appState);

      const pos = findTextOnce(grid, 'important');
      assertStyleRange(grid, pos.x, pos.y, 'important'.length, { bold: true });
    });

    test('streaming response shows partial text', () => {
      const appState = new AppState();
      appState.cwd = '/home/user/project';
      appState.gitBranch = 'main';
      appState.conversation.addUserMessage('test');
      appState.conversation.isProcessing = true;
      appState.conversation.appendAssistantChunk('Building the project...');
      const grid = capture(appState);

      const matches = findText(grid, 'Building the project...');
      expect(matches.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ════════════════════════════════════════════════════════════════════
  //  Thinking Blocks
  // ════════════════════════════════════════════════════════════════════

  describe('Thinking Blocks', () => {
    test('expanded thinking shows content in italic + dim', () => {
      const appState = new AppState();
      appState.cwd = '/home/user/project';
      appState.gitBranch = 'main';
      appState.conversation.addUserMessage('analyze');
      appState.conversation.appendThinkingChunk('Analyzing the code carefully');
      appState.conversation.finalizeThinking();

      // Expand the thinking block
      const thinkingIndex = appState.conversation.items.findIndex(i => i.type === 'thinking');
      if (thinkingIndex >= 0) {
        appState.conversation.setItemCollapsed(thinkingIndex, false);
      }

      appState.conversation.appendAssistantChunk('Done.');
      appState.conversation.finalizeAssistantMessage();
      const grid = capture(appState);

      const pos = findTextOnce(grid, 'Analyzing the code');
      assertStyleAt(grid, pos.x, pos.y, { italic: true, dim: true });
    });

    test('collapsed thinking hides content', () => {
      const appState = new AppState();
      appState.cwd = '/home/user/project';
      appState.gitBranch = 'main';
      appState.conversation.addUserMessage('analyze');
      appState.conversation.appendThinkingChunk('Secret internal reasoning');
      appState.conversation.finalizeThinking();
      // Default: collapsed = true

      appState.conversation.appendAssistantChunk('Done.');
      appState.conversation.finalizeAssistantMessage();
      const grid = capture(appState);

      // "Thinking" label should be visible
      expect(findText(grid, 'Thinking').length).toBeGreaterThanOrEqual(1);
      // But the actual content should NOT be visible
      expect(findText(grid, 'Secret internal reasoning').length).toBe(0);
    });

    test('streaming thinking shows accent-colored indicator', () => {
      const appState = new AppState();
      appState.cwd = '/home/user/project';
      appState.gitBranch = 'main';
      appState.conversation.addUserMessage('think');
      appState.conversation.isProcessing = true;
      appState.conversation.appendThinkingChunk('Working on it...');
      // Don't finalize — still streaming

      const grid = capture(appState);

      // AMP-style streaming indicator is a braille spinner (U+2800..U+28FF)
      const spinnerPos = findFirstBrailleSpinner(grid);
      expect(spinnerPos).not.toBeNull();
      // Should be accent colored
      assertStyleAt(grid, spinnerPos!.x, spinnerPos!.y, { fg: ACCENT });
    });

    test('interrupted thinking shows warning text', () => {
      const appState = new AppState();
      appState.cwd = '/home/user/project';
      appState.gitBranch = 'main';
      appState.conversation.addUserMessage('help');
      appState.conversation.addInterruptedThinking();
      appState.conversation.appendAssistantChunk('Here.');
      appState.conversation.finalizeAssistantMessage();
      const grid = capture(appState);

      const pos = findTextOnce(grid, '(interrupted)');
      assertStyleAt(grid, pos.x, pos.y, { italic: true });
    });
  });

  // ════════════════════════════════════════════════════════════════════
  //  Tool Calls
  // ════════════════════════════════════════════════════════════════════

  describe('Tool Calls', () => {
    test('completed tool shows checkmark with success color', () => {
      const appState = new AppState();
      appState.cwd = '/home/user/project';
      appState.gitBranch = 'main';
      appState.conversation.addUserMessage('read file');
      appState.conversation.addToolCall(
        'tc-1', 'Read config.json', 'Read', 'completed',
        [{ path: 'config.json' }],
      );
      appState.conversation.appendAssistantChunk('Done.');
      appState.conversation.finalizeAssistantMessage();
      const grid = capture(appState);

      const checkmarks = findText(grid, toolStatusIcon('completed'));
      expect(checkmarks.length).toBeGreaterThanOrEqual(1);
      // The checkmark near the tool call should be success-colored
      const pos = checkmarks[0]!;
      assertStyleAt(grid, pos.x, pos.y, { fg: Color.green });
    });

    test('failed tool shows X with destructive color', () => {
      const appState = new AppState();
      appState.cwd = '/home/user/project';
      appState.gitBranch = 'main';
      appState.conversation.addUserMessage('deploy');
      appState.conversation.addToolCall(
        'tc-f1', '$ ./deploy.sh', 'Bash', 'failed',
        [], { command: './deploy.sh' },
      );
      appState.conversation.appendAssistantChunk('Failed.');
      appState.conversation.finalizeAssistantMessage();
      const grid = capture(appState);

      const xs = findText(grid, toolStatusIcon('failed'));
      expect(xs.length).toBeGreaterThanOrEqual(1);
      assertStyleAt(grid, xs[0]!.x, xs[0]!.y, { fg: DESTRUCTIVE });
    });

    test('in-progress tool shows ellipsis indicator', () => {
      const appState = new AppState();
      appState.cwd = '/home/user/project';
      appState.gitBranch = 'main';
      appState.conversation.addUserMessage('read');
      appState.conversation.addToolCall(
        'tc-ip', 'Read file.ts', 'Read', 'in_progress',
        [{ path: 'file.ts' }],
      );
      const grid = capture(appState);

      const ellipsis = findText(grid, toolStatusIcon('in_progress'));
      expect(ellipsis.length).toBeGreaterThanOrEqual(1);
    });

    test('tool call file path is visible', () => {
      const appState = new AppState();
      appState.cwd = '/home/user/project';
      appState.gitBranch = 'main';
      appState.conversation.addUserMessage('read');
      appState.conversation.addToolCall(
        'tc-r2', 'Read src/auth/login.ts', 'Read', 'completed',
        [{ path: 'src/auth/login.ts' }],
        { file_path: 'src/auth/login.ts' },
      );
      appState.conversation.appendAssistantChunk('Done.');
      appState.conversation.finalizeAssistantMessage();
      const grid = capture(appState);

      expect(findText(grid, 'src/auth/login.ts').length).toBeGreaterThanOrEqual(1);
    });

    test('Bash tool shows command', () => {
      const appState = new AppState();
      appState.cwd = '/home/user/project';
      appState.gitBranch = 'main';
      appState.conversation.addUserMessage('test');
      appState.conversation.addToolCall(
        'tc-b1', '$ npm test', 'Bash', 'completed',
        [], { command: 'npm test' },
      );
      appState.conversation.appendAssistantChunk('Done.');
      appState.conversation.finalizeAssistantMessage();
      const grid = capture(appState);

      expect(findText(grid, 'npm test').length).toBeGreaterThanOrEqual(1);
    });
  });

  // ════════════════════════════════════════════════════════════════════
  //  Plan View
  // ════════════════════════════════════════════════════════════════════

  describe('Plan View', () => {
    test('plan entries are visible with text', () => {
      const appState = new AppState();
      appState.cwd = '/home/user/project';
      appState.gitBranch = 'main';
      appState.conversation.addUserMessage('plan');
      appState.conversation.setPlan([
        { content: 'Analyze architecture', priority: 'high', status: 'completed' },
        { content: 'Implement refresh', priority: 'high', status: 'in_progress' },
        { content: 'Write tests', priority: 'low', status: 'pending' },
      ]);
      appState.conversation.appendAssistantChunk('Working on it.');
      appState.conversation.finalizeAssistantMessage();
      const grid = capture(appState);

      expect(findText(grid, 'Analyze architecture').length).toBeGreaterThanOrEqual(1);
      expect(findText(grid, 'Implement refresh').length).toBeGreaterThanOrEqual(1);
      expect(findText(grid, 'Write tests').length).toBeGreaterThanOrEqual(1);

      // Priority tags should be rendered inline with each entry
      expect(findText(grid, '[H]').length).toBeGreaterThanOrEqual(2); // two high-priority entries
      expect(findText(grid, '[L]').length).toBeGreaterThanOrEqual(1); // one low-priority entry
    });

    test('priority tags appear for all priority levels', () => {
      const appState = new AppState();
      appState.cwd = '/home/user/project';
      appState.gitBranch = 'main';
      appState.conversation.addUserMessage('plan');
      appState.conversation.setPlan([
        { content: 'Critical fix', priority: 'high', status: 'pending' },
        { content: 'Normal work', priority: 'medium', status: 'pending' },
        { content: 'Nice to have', priority: 'low', status: 'pending' },
      ]);
      appState.conversation.appendAssistantChunk('Planning.');
      appState.conversation.finalizeAssistantMessage();
      const grid = capture(appState);

      // All three priority tags should be present
      expect(findText(grid, '[H]').length).toBeGreaterThanOrEqual(1);
      expect(findText(grid, '[M]').length).toBeGreaterThanOrEqual(1);
      expect(findText(grid, '[L]').length).toBeGreaterThanOrEqual(1);

      // Content text should also be visible
      expect(findText(grid, 'Critical fix').length).toBeGreaterThanOrEqual(1);
      expect(findText(grid, 'Normal work').length).toBeGreaterThanOrEqual(1);
      expect(findText(grid, 'Nice to have').length).toBeGreaterThanOrEqual(1);
    });
  });

  // ════════════════════════════════════════════════════════════════════
  //  Error State
  // ════════════════════════════════════════════════════════════════════

  describe('Error State', () => {
    test('error message is visible', () => {
      const appState = new AppState();
      appState.cwd = '/home/user/project';
      appState.gitBranch = 'main';
      appState.conversation.addUserMessage('deploy');
      appState.error = 'Connection refused: agent exited (code 1)';
      const grid = capture(appState);

      expect(findText(grid, 'Connection refused').length).toBeGreaterThanOrEqual(1);
    });
  });

  // ════════════════════════════════════════════════════════════════════
  //  Bottom Grid (status bar)
  // ════════════════════════════════════════════════════════════════════

  describe('Bottom Grid', () => {
    test('shows cwd and git branch', () => {
      const appState = new AppState();
      appState.cwd = '/home/user/project';
      appState.gitBranch = 'feature/auth';
      const grid = capture(appState);

      // Check bottom rows for cwd and branch
      const screenText = readScreenText(grid);
      const bottomRows = screenText.slice(-5).join('\n');
      expect(bottomRows).toContain('/home/user/project');
      expect(bottomRows).toContain('feature/auth');
    });

    test('shows mode indicator', () => {
      const appState = new AppState();
      appState.cwd = '/home/user/project';
      appState.gitBranch = 'main';
      const grid = capture(appState);

      // "smart" mode label should appear somewhere
      expect(findText(grid, 'smart').length).toBeGreaterThanOrEqual(1);
    });

    test('shows skills badge when skillCount > 0', () => {
      const appState = new AppState();
      appState.cwd = '/home/user/project';
      appState.gitBranch = 'main';
      appState.skillCount = 7;
      const grid = capture(appState);

      const warningMatches = findText(grid, icon('status.warning'));
      expect(warningMatches.length).toBeGreaterThanOrEqual(1);
      assertStyleAt(grid, warningMatches[0]!.x, warningMatches[0]!.y, { fg: WARNING });
    });

    test('hides skills badge when skillCount is 0', () => {
      const appState = new AppState();
      appState.cwd = '/home/user/project';
      appState.gitBranch = 'main';
      appState.skillCount = 0;
      const grid = capture(appState);

      expect(findText(grid, 'skills').length).toBe(0);
    });

    test('"? for shortcuts" appears below input box border', () => {
      const appState = new AppState();
      appState.cwd = '/home/user/project';
      appState.gitBranch = 'main';
      const grid = capture(appState);

      const borderRow = findRow(grid, '╰');
      const shortcutRow = findRow(grid, '? for shortcuts');
      expect(borderRow).toBeDefined();
      expect(shortcutRow).toBeDefined();
      expect(shortcutRow!).toBeGreaterThan(borderRow!);
    });

    test('input box has at least 3 content rows', () => {
      const appState = new AppState();
      appState.cwd = '/home/user/project';
      appState.gitBranch = 'main';
      const grid = capture(appState);

      const topRow = findRow(grid, '╭');
      const bottomRow = findRow(grid, '╰');
      expect(topRow).toBeDefined();
      expect(bottomRow).toBeDefined();
      const contentRows = bottomRow! - topRow! - 1;
      expect(contentRows).toBeGreaterThanOrEqual(3);
    });

    test('input box shows no placeholder text', () => {
      const appState = new AppState();
      appState.cwd = '/home/user/project';
      appState.gitBranch = 'main';
      const grid = capture(appState);

      expect(findText(grid, 'Ask a question').length).toBe(0);
      expect(findText(grid, '$ for shell').length).toBe(0);
    });

    test('hides "? for shortcuts" when input has text', () => {
      const h = createAppTestHarness(120, 40);
      h.appState.cwd = '/home/user/project';
      h.inputController.text = 'hello';
      h.drawFrame();
      const grid = h.readGrid();
      expect(findText(grid, '? for shortcuts').length).toBe(0);
      h.cleanup();
    });

    test('shows "? for shortcuts" when input is empty', () => {
      const h = createAppTestHarness(120, 40);
      h.appState.cwd = '/home/user/project';
      h.inputController.text = '';
      h.drawFrame();
      const grid = h.readGrid();
      expect(findText(grid, '? for shortcuts').length).toBeGreaterThan(0);
      h.cleanup();
    });

    test('shows "Esc to cancel" during processing regardless of input', () => {
      const h = createAppTestHarness(120, 40);
      h.appState.cwd = '/home/user/project';
      h.inputController.text = 'some text';
      h.appState.startProcessing('test');
      h.drawFrame();
      const grid = h.readGrid();
      expect(findText(grid, 'Esc').length).toBeGreaterThan(0);
      expect(findText(grid, 'to cancel').length).toBeGreaterThan(0);
      h.cleanup();
    });

    test('status line remains as blank placeholder when input has text and not processing', () => {
      const h = createAppTestHarness(120, 40);
      h.appState.cwd = '/home/user/project';
      h.inputController.text = 'hello';
      h.drawFrame();
      const grid = h.readGrid();
      expect(findText(grid, '? for shortcuts').length).toBe(0);
      expect(findText(grid, 'Esc').length).toBe(0);
      const borderRow = findRow(grid, '╰');
      expect(borderRow).toBeDefined();
      expect(borderRow! + 1).toBeLessThan(grid.height);
      h.cleanup();
    });

    test('input box border position stays constant across processing state changes', () => {
      const h = createAppTestHarness(120, 40);
      h.appState.cwd = '/test';

      h.drawFrame();
      const idleBorderRow = findRow(h.readGrid(), '╭');

      h.appState.startProcessing('test');
      h.drawFrame();
      const processingBorderRow = findRow(h.readGrid(), '╭');

      expect(processingBorderRow).toBe(idleBorderRow);
      h.cleanup();
    });
  });
  // ════════════════════════════════════════════════════════════════════
  //  Token Usage
  // ════════════════════════════════════════════════════════════════════

  describe('Token Usage', () => {
    test('displays token counts when processing', () => {
      const appState = new AppState();
      appState.cwd = '/home/user/project';
      appState.gitBranch = 'main';
      appState.conversation.isProcessing = true;
      appState.conversation.setUsage({ size: 128000, used: 27700 });
      appState.conversation.addUserMessage('test');
      appState.conversation.appendAssistantChunk('Working...');
      const grid = capture(appState);

      const screenText = readScreenText(grid).join('\n');
      const hasTokenInfo = screenText.includes('27.7k') || screenText.includes('27700') || screenText.includes('128');
      expect(hasTokenInfo).toBe(true);
    });
  });

  // ════════════════════════════════════════════════════════════════════
  //  Grid Dimensions
  // ════════════════════════════════════════════════════════════════════

  describe('Grid Dimensions', () => {
    test('grid matches requested terminal size', () => {
      const appState = new AppState();
      appState.cwd = '/home/user/project';
      appState.gitBranch = 'main';

      const grid120 = capture(appState, 120, 40);
      expect(grid120.width).toBe(120);
      expect(grid120.height).toBe(40);

      WidgetsBinding.reset();
      FrameScheduler.reset();

      const grid80 = capture(appState, 80, 24);
      expect(grid80.width).toBe(80);
      expect(grid80.height).toBe(24);
    });
  });
});
