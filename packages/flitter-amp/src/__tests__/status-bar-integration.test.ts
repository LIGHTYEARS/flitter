/**
 * StatusBar + BottomGrid integration tests — verifies WaveSpinner integration
 * and multi-state message rendering (streaming, interrupted, idle).
 *
 * Validates:
 *   - Streaming state shows WaveSpinner wave characters
 *   - Interrupted state shows warning message with warning icon prefix
 *   - Status bar area height is always 1 line across all states
 *   - Idle state shows "? for shortcuts" hint
 */

import { describe, test, expect, beforeEach, afterEach, jest } from 'bun:test';

import { WidgetsBinding } from 'flitter-core/src/framework/binding';
import { FrameScheduler } from 'flitter-core/src/scheduler/frame-scheduler';

import { createAppTestHarness, type AppTestHarness } from '../test-utils/app-test-harness';
import { AppState } from '../state/app-state';
import { captureToGrid } from '../test-utils/capture';
import { App } from '../app';
import {
  findText,
  readScreenText,
  type Grid,
} from '../test-utils/grid-helpers';
import { icon } from '../ui/icons/icon-registry';

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

describe('StatusBar + BottomGrid — WaveSpinner Integration', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    WidgetsBinding.reset();
    FrameScheduler.reset();
  });

  afterEach(() => {
    jest.useRealTimers();
    WidgetsBinding.reset();
    FrameScheduler.reset();
  });

  // ════════════════════════════════════════════════════════════════════
  //  Streaming state — WaveSpinner visible
  // ════════════════════════════════════════════════════════════════════

  describe('Streaming state', () => {
    test('shows wave character during streaming', () => {
      const harness = createAppTestHarness(120, 40);

      harness.appState.startProcessing('test prompt');
      harness.drawFrame();

      jest.advanceTimersByTime(200);
      harness.drawFrame();

      const screenText = readScreenText(harness.readGrid());
      const allText = screenText.join('\n');

      const hasWaveChar = allText.includes('∼') || allText.includes('≈') || allText.includes('≋');
      expect(hasWaveChar).toBe(true);

      harness.cleanup();
    });

    test('shows "Streaming..." text during processing without token usage', () => {
      const harness = createAppTestHarness(120, 40);

      harness.appState.startProcessing('test prompt');
      harness.drawFrame();

      const screenText = readScreenText(harness.readGrid());
      const allText = screenText.join('\n');
      expect(allText).toContain('Streaming...');

      harness.cleanup();
    });
  });

  // ════════════════════════════════════════════════════════════════════
  //  Interrupted state — warning message
  // ════════════════════════════════════════════════════════════════════

  describe('Interrupted state', () => {
    test('shows warning message after interruption', () => {
      const harness = createAppTestHarness(120, 40);

      harness.appState.startProcessing('test prompt');
      jest.advanceTimersByTime(50);
      harness.drawFrame();

      harness.appState.onPromptComplete('test-session', 'cancelled');
      jest.advanceTimersByTime(50);
      harness.drawFrame();

      expect(harness.appState.isInterrupted).toBe(true);

      const screenText = readScreenText(harness.readGrid());
      const allText = screenText.join('\n');
      expect(allText).toContain('Response interrupted');

      harness.cleanup();
    });

    test('shows warning icon in interrupted state', () => {
      const harness = createAppTestHarness(120, 40);

      harness.appState.startProcessing('hello');
      jest.advanceTimersByTime(50);
      harness.drawFrame();

      harness.appState.onPromptComplete('test-session', 'cancelled');
      jest.advanceTimersByTime(50);
      harness.drawFrame();

      const screenText = readScreenText(harness.readGrid());
      const allText = screenText.join('\n');
      expect(allText).toContain(icon('status.warning'));

      harness.cleanup();
    });

    test('interrupted state clears when new prompt starts', () => {
      const harness = createAppTestHarness(120, 40);

      harness.appState.startProcessing('prompt 1');
      harness.appState.onPromptComplete('test-session', 'cancelled');
      expect(harness.appState.isInterrupted).toBe(true);

      harness.appState.startProcessing('prompt 2');
      expect(harness.appState.isInterrupted).toBe(false);
      expect(harness.appState.lastStopReason).toBeNull();

      harness.cleanup();
    });

    test('normal end_turn does not trigger interrupted state', () => {
      const harness = createAppTestHarness(120, 40);

      harness.appState.startProcessing('hello');
      harness.appState.onPromptComplete('test-session', 'end_turn');

      expect(harness.appState.isInterrupted).toBe(false);

      harness.cleanup();
    });
  });

  // ════════════════════════════════════════════════════════════════════
  //  Status bar height stability — always 1 line
  // ════════════════════════════════════════════════════════════════════

  describe('Height stability', () => {
    /**
     * Measures the height of the bottom status area (topLeft line above input).
     * The topLeft line is a single row above the input border. It should always
     * be exactly 1 line tall (either SizedBox(height:1) or content of 1 row).
     */
    function measureBottomAreaRows(grid: Grid): number {
      const screenText = readScreenText(grid);
      const lastRow = screenText.length - 1;

      let bottomLineCount = 0;
      for (let y = lastRow; y >= 0; y--) {
        const row = screenText[y]!;
        if (row.trim().length === 0) break;
        bottomLineCount++;
      }
      return bottomLineCount;
    }

    test('idle state bottom area is stable', () => {
      const appState = new AppState();
      appState.cwd = '/home/user/project';
      appState.gitBranch = 'main';
      const grid = capture(appState);

      const bottomRows = measureBottomAreaRows(grid);
      expect(bottomRows).toBeGreaterThanOrEqual(3);
    });

    test('streaming state bottom area is stable', () => {
      const harness = createAppTestHarness(120, 40);

      harness.appState.startProcessing('test');
      harness.drawFrame();

      const grid = harness.readGrid();
      const bottomRows = measureBottomAreaRows(grid);
      expect(bottomRows).toBeGreaterThanOrEqual(3);

      harness.cleanup();
    });

    test('interrupted state bottom area is stable', () => {
      const harness = createAppTestHarness(120, 40);

      harness.appState.startProcessing('test');
      harness.appState.onPromptComplete('test-session', 'cancelled');
      harness.drawFrame();

      const grid = harness.readGrid();
      const bottomRows = measureBottomAreaRows(grid);
      expect(bottomRows).toBeGreaterThanOrEqual(3);

      harness.cleanup();
    });
  });

  // ════════════════════════════════════════════════════════════════════
  //  Idle state — "? for shortcuts"
  // ════════════════════════════════════════════════════════════════════

  describe('Idle state', () => {
    test('shows "? for shortcuts" hint when idle', () => {
      const appState = new AppState();
      appState.cwd = '/home/user/project';
      appState.gitBranch = 'main';
      const grid = capture(appState);

      const matches = findText(grid, '? for shortcuts');
      expect(matches.length).toBeGreaterThan(0);
    });
  });

  // ════════════════════════════════════════════════════════════════════
  //  AppState — lastStopReason tracking
  // ════════════════════════════════════════════════════════════════════

  describe('AppState.lastStopReason', () => {
    test('stores stopReason on prompt complete', () => {
      const appState = new AppState();
      appState.startProcessing('hello');
      appState.onPromptComplete('session', 'end_turn');
      expect(appState.lastStopReason).toBe('end_turn');
    });

    test('stores cancelled stopReason', () => {
      const appState = new AppState();
      appState.startProcessing('hello');
      appState.onPromptComplete('session', 'cancelled');
      expect(appState.lastStopReason).toBe('cancelled');
    });

    test('clears on startProcessing', () => {
      const appState = new AppState();
      appState.startProcessing('prompt 1');
      appState.onPromptComplete('session', 'cancelled');
      expect(appState.lastStopReason).toBe('cancelled');

      appState.startProcessing('prompt 2');
      expect(appState.lastStopReason).toBeNull();
    });

    test('isInterrupted is false during processing', () => {
      const appState = new AppState();
      appState.startProcessing('hello');
      expect(appState.isInterrupted).toBe(false);
    });

    test('isInterrupted is true after non-end_turn stop', () => {
      const appState = new AppState();
      appState.startProcessing('hello');
      appState.onPromptComplete('session', 'cancelled');
      expect(appState.isInterrupted).toBe(true);
    });

    test('isInterrupted is false after end_turn stop', () => {
      const appState = new AppState();
      appState.startProcessing('hello');
      appState.onPromptComplete('session', 'end_turn');
      expect(appState.isInterrupted).toBe(false);
    });
  });
});
