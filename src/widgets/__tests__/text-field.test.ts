// TextField comprehensive tests — Phase 20 rewrite
// Tests cover: multi-line editing, word operations, selection, mouse interaction,
// cursor movement, onChanged/onSubmitted callbacks, backward compatibility

import { describe, test, expect, beforeEach } from 'bun:test';
import { TextEditingController, TextField } from '../text-field';
import { TextStyle } from '../../core/text-style';
import { Color } from '../../core/color';
import { FocusNode } from '../../input/focus';
import { createKeyEvent } from '../../input/events';
import type { KeyEvent } from '../../input/events';
import type { BuildContext } from '../../framework/widget';

// ---------------------------------------------------------------------------
// Helper: create a TextField state with initState() called
// ---------------------------------------------------------------------------

function createTextFieldState(opts?: Parameters<typeof TextField['prototype']['constructor']>[0]) {
  const tf = new TextField(opts);
  const state = tf.createState() as any;
  // Simulate mounting
  state._widget = tf;
  state._mounted = true;
  state.initState();
  return state;
}

function keyEvent(key: string, mods?: { ctrlKey?: boolean; shiftKey?: boolean; altKey?: boolean; metaKey?: boolean }): KeyEvent {
  return createKeyEvent(key, mods);
}

// ===========================================================================
// TextEditingController - Word Operations
// ===========================================================================

describe('TextEditingController - Word Operations', () => {
  let controller: TextEditingController;

  beforeEach(() => {
    controller = new TextEditingController();
  });

  describe('deleteWordBackward (Ctrl+Backspace)', () => {
    test('deletes word before cursor', () => {
      controller.insertText('hello world');
      controller.deleteWordBackward();
      expect(controller.text).toBe('hello ');
      expect(controller.cursorPosition).toBe(6);
    });

    test('deletes word including spaces before', () => {
      controller.insertText('hello world');
      // cursor is at end (pos 11)
      controller.deleteWordBackward(); // deletes "world"
      expect(controller.text).toBe('hello ');
    });

    test('no-op at position 0', () => {
      controller.insertText('hello');
      controller.cursorPosition = 0;
      controller.deleteWordBackward();
      expect(controller.text).toBe('hello');
    });

    test('deletes entire word when cursor at end of single word', () => {
      controller.insertText('hello');
      controller.deleteWordBackward();
      expect(controller.text).toBe('');
      expect(controller.cursorPosition).toBe(0);
    });

    test('with selection, deletes selection instead', () => {
      controller.insertText('hello world');
      controller.setSelection(0, 5);
      controller.deleteWordBackward();
      expect(controller.text).toBe(' world');
    });
  });

  describe('deleteWordForward (Ctrl+Delete)', () => {
    test('deletes word after cursor', () => {
      controller.insertText('hello world');
      controller.cursorPosition = 0;
      controller.deleteWordForward();
      expect(controller.text).toBe(' world');
      expect(controller.cursorPosition).toBe(0);
    });

    test('no-op at end of text', () => {
      controller.insertText('hello');
      controller.deleteWordForward();
      expect(controller.text).toBe('hello');
    });

    test('deletes from middle of word', () => {
      controller.insertText('hello world');
      controller.cursorPosition = 2;
      controller.deleteWordForward();
      expect(controller.text).toBe('he world');
    });

    test('with selection, deletes selection instead', () => {
      controller.insertText('hello world');
      controller.setSelection(6, 11);
      controller.deleteWordForward();
      expect(controller.text).toBe('hello ');
    });
  });

  describe('moveCursorWordLeft (Ctrl+Left)', () => {
    test('moves to start of current word', () => {
      controller.insertText('hello world');
      controller.moveCursorWordLeft();
      expect(controller.cursorPosition).toBe(6);
    });

    test('skips whitespace then moves to start of previous word', () => {
      controller.insertText('hello world');
      controller.cursorPosition = 6; // at 'w'
      controller.moveCursorWordLeft();
      expect(controller.cursorPosition).toBe(0);
    });

    test('no-op at position 0', () => {
      controller.insertText('hello');
      controller.cursorPosition = 0;
      controller.moveCursorWordLeft();
      expect(controller.cursorPosition).toBe(0);
    });

    test('clears selection', () => {
      controller.insertText('hello world');
      controller.setSelection(0, 5);
      controller.moveCursorWordLeft();
      expect(controller.selectionStart).toBe(-1);
      expect(controller.selectionEnd).toBe(-1);
    });
  });

  describe('moveCursorWordRight (Ctrl+Right)', () => {
    test('moves to end of current word', () => {
      controller.insertText('hello world');
      controller.cursorPosition = 0;
      controller.moveCursorWordRight();
      expect(controller.cursorPosition).toBe(5);
    });

    test('skips whitespace then moves to end of next word', () => {
      controller.insertText('hello world');
      controller.cursorPosition = 5;
      controller.moveCursorWordRight();
      expect(controller.cursorPosition).toBe(11);
    });

    test('no-op at end of text', () => {
      controller.insertText('hello');
      controller.moveCursorWordRight();
      expect(controller.cursorPosition).toBe(5);
    });

    test('clears selection', () => {
      controller.insertText('hello world');
      controller.setSelection(0, 5);
      controller.cursorPosition = 0;
      controller.moveCursorWordRight();
      expect(controller.selectionStart).toBe(-1);
      expect(controller.selectionEnd).toBe(-1);
    });
  });
});

// ===========================================================================
// TextEditingController - Multi-line Operations
// ===========================================================================

describe('TextEditingController - Multi-line', () => {
  let controller: TextEditingController;

  beforeEach(() => {
    controller = new TextEditingController();
  });

  test('moveCursorUp: moves to previous line', () => {
    controller.insertText('line1\nline2');
    // cursor at end of line2 (pos 11)
    const moved = controller.moveCursorUp();
    expect(moved).toBe(true);
    expect(controller.cursorPosition).toBe(5); // end of line1
  });

  test('moveCursorUp: preserves column or clamps', () => {
    controller.insertText('ab\nlonger line');
    // cursor at end (pos 14, col 11 of line 2)
    const moved = controller.moveCursorUp();
    expect(moved).toBe(true);
    expect(controller.cursorPosition).toBe(2); // clamped to end of 'ab'
  });

  test('moveCursorUp: returns false on single line', () => {
    controller.insertText('hello');
    const moved = controller.moveCursorUp();
    expect(moved).toBe(false);
  });

  test('moveCursorUp: returns false on first line', () => {
    controller.insertText('line1\nline2');
    controller.cursorPosition = 3;
    const moved = controller.moveCursorUp();
    expect(moved).toBe(false);
  });

  test('moveCursorDown: moves to next line', () => {
    controller.insertText('line1\nline2');
    controller.cursorPosition = 3; // in line1
    const moved = controller.moveCursorDown();
    expect(moved).toBe(true);
    expect(controller.cursorPosition).toBe(9); // col 3 of line2
  });

  test('moveCursorDown: clamps column if next line shorter', () => {
    controller.insertText('longer line\nab');
    controller.cursorPosition = 8; // col 8 of first line
    const moved = controller.moveCursorDown();
    expect(moved).toBe(true);
    expect(controller.cursorPosition).toBe(14); // end of 'ab' (12 + 2)
  });

  test('moveCursorDown: returns false on single line', () => {
    controller.insertText('hello');
    const moved = controller.moveCursorDown();
    expect(moved).toBe(false);
  });

  test('moveCursorDown: returns false on last line', () => {
    controller.insertText('line1\nline2');
    // cursor at end of line2
    const moved = controller.moveCursorDown();
    expect(moved).toBe(false);
  });

  test('moveCursorLineHome: moves to start of current line', () => {
    controller.insertText('line1\nline2');
    // cursor at end (pos 11)
    controller.moveCursorLineHome();
    expect(controller.cursorPosition).toBe(6); // start of line2
  });

  test('moveCursorLineEnd: moves to end of current line', () => {
    controller.insertText('line1\nline2');
    controller.cursorPosition = 6; // start of line2
    controller.moveCursorLineEnd();
    expect(controller.cursorPosition).toBe(11); // end of line2
  });

  test('moveCursorLineHome on first line goes to 0', () => {
    controller.insertText('line1\nline2');
    controller.cursorPosition = 3;
    controller.moveCursorLineHome();
    expect(controller.cursorPosition).toBe(0);
  });

  test('moveCursorLineEnd on first line goes to end of first line', () => {
    controller.insertText('line1\nline2');
    controller.cursorPosition = 2;
    controller.moveCursorLineEnd();
    expect(controller.cursorPosition).toBe(5);
  });

  test('insertText with newline creates multi-line', () => {
    controller.insertText('hello');
    controller.cursorPosition = 5;
    controller.insertText('\n');
    controller.insertText('world');
    expect(controller.text).toBe('hello\nworld');
  });
});

// ===========================================================================
// TextEditingController - Selection
// ===========================================================================

describe('TextEditingController - Selection', () => {
  let controller: TextEditingController;

  beforeEach(() => {
    controller = new TextEditingController();
  });

  test('hasSelection: false initially', () => {
    controller.insertText('hello');
    expect(controller.hasSelection).toBe(false);
  });

  test('hasSelection: true after setSelection', () => {
    controller.insertText('hello');
    controller.setSelection(0, 3);
    expect(controller.hasSelection).toBe(true);
  });

  test('hasSelection: false for same start/end', () => {
    controller.insertText('hello');
    controller.setSelection(2, 2);
    expect(controller.hasSelection).toBe(false);
  });

  test('selectedText: returns selected range', () => {
    controller.insertText('hello world');
    controller.setSelection(0, 5);
    expect(controller.selectedText).toBe('hello');
  });

  test('selectedText: handles reversed selection', () => {
    controller.insertText('hello world');
    controller.setSelection(5, 0);
    expect(controller.selectedText).toBe('hello');
  });

  test('selectedText: empty when no selection', () => {
    controller.insertText('hello');
    expect(controller.selectedText).toBe('');
  });

  test('clearSelection: clears selection', () => {
    controller.insertText('hello');
    controller.setSelection(0, 5);
    controller.clearSelection();
    expect(controller.hasSelection).toBe(false);
    expect(controller.selectionStart).toBe(-1);
    expect(controller.selectionEnd).toBe(-1);
  });

  test('clearSelection: no-op when already clear', () => {
    let notified = 0;
    controller.insertText('hello');
    controller.addListener(() => notified++);
    controller.clearSelection();
    expect(notified).toBe(0); // No notification needed
  });

  test('setSelection: clamps to text length', () => {
    controller.insertText('hi');
    controller.setSelection(0, 100);
    expect(controller.selectionEnd).toBe(2);
  });

  test('setSelection: negative values clear', () => {
    controller.insertText('hello');
    controller.setSelection(0, 5);
    controller.setSelection(-1, -1);
    expect(controller.selectionStart).toBe(-1);
    expect(controller.selectionEnd).toBe(-1);
  });

  describe('selectLeft (Shift+Left)', () => {
    test('extends selection left from cursor', () => {
      controller.insertText('hello');
      controller.selectLeft();
      expect(controller.selectionStart).toBe(5);
      expect(controller.selectionEnd).toBe(4);
      expect(controller.cursorPosition).toBe(4);
    });

    test('extends existing selection further left', () => {
      controller.insertText('hello');
      controller.selectLeft();
      controller.selectLeft();
      expect(controller.selectionStart).toBe(5);
      expect(controller.selectionEnd).toBe(3);
      expect(controller.cursorPosition).toBe(3);
    });

    test('no-op at position 0', () => {
      controller.insertText('hello');
      controller.cursorPosition = 0;
      let notified = 0;
      controller.addListener(() => notified++);
      controller.selectLeft();
      expect(notified).toBe(0);
    });
  });

  describe('selectRight (Shift+Right)', () => {
    test('extends selection right from cursor', () => {
      controller.insertText('hello');
      controller.cursorPosition = 0;
      controller.selectRight();
      expect(controller.selectionStart).toBe(0);
      expect(controller.selectionEnd).toBe(1);
      expect(controller.cursorPosition).toBe(1);
    });

    test('no-op at end of text', () => {
      controller.insertText('hello');
      let notified = 0;
      controller.addListener(() => notified++);
      controller.selectRight();
      expect(notified).toBe(0);
    });
  });

  describe('selectWordLeft (Ctrl+Shift+Left)', () => {
    test('selects to previous word boundary', () => {
      controller.insertText('hello world');
      controller.selectWordLeft();
      expect(controller.selectionStart).toBe(11);
      expect(controller.selectionEnd).toBe(6);
      expect(controller.cursorPosition).toBe(6);
    });
  });

  describe('selectWordRight (Ctrl+Shift+Right)', () => {
    test('selects to next word boundary', () => {
      controller.insertText('hello world');
      controller.cursorPosition = 0;
      controller.selectWordRight();
      expect(controller.selectionStart).toBe(0);
      expect(controller.selectionEnd).toBe(5);
      expect(controller.cursorPosition).toBe(5);
    });
  });

  describe('selectUp / selectDown', () => {
    test('selectUp extends selection to previous line', () => {
      controller.insertText('line1\nline2');
      controller.selectUp();
      expect(controller.hasSelection).toBe(true);
      expect(controller.selectionStart).toBe(11);
      expect(controller.cursorPosition).toBe(5);
    });

    test('selectDown extends selection to next line', () => {
      controller.insertText('line1\nline2');
      controller.cursorPosition = 3;
      controller.selectDown();
      expect(controller.hasSelection).toBe(true);
      expect(controller.selectionStart).toBe(3);
      expect(controller.cursorPosition).toBe(9);
    });

    test('selectUp no-op on single line', () => {
      controller.insertText('hello');
      let notified = 0;
      controller.addListener(() => notified++);
      controller.selectUp();
      expect(notified).toBe(0);
    });

    test('selectDown no-op on single line', () => {
      controller.insertText('hello');
      let notified = 0;
      controller.addListener(() => notified++);
      controller.selectDown();
      expect(notified).toBe(0);
    });
  });

  describe('selectHome / selectEnd', () => {
    test('selectHome selects to start', () => {
      controller.insertText('hello');
      controller.selectHome();
      expect(controller.selectionStart).toBe(5);
      expect(controller.selectionEnd).toBe(0);
      expect(controller.cursorPosition).toBe(0);
    });

    test('selectEnd selects to end', () => {
      controller.insertText('hello');
      controller.cursorPosition = 0;
      controller.selectEnd();
      expect(controller.selectionStart).toBe(0);
      expect(controller.selectionEnd).toBe(5);
      expect(controller.cursorPosition).toBe(5);
    });

    test('selectHome no-op at position 0', () => {
      controller.insertText('hello');
      controller.cursorPosition = 0;
      let notified = 0;
      controller.addListener(() => notified++);
      controller.selectHome();
      expect(notified).toBe(0);
    });

    test('selectEnd no-op at end', () => {
      controller.insertText('hello');
      let notified = 0;
      controller.addListener(() => notified++);
      controller.selectEnd();
      expect(notified).toBe(0);
    });
  });

  describe('selectAll', () => {
    test('selects entire text', () => {
      controller.insertText('hello world');
      controller.selectAll();
      expect(controller.selectionStart).toBe(0);
      expect(controller.selectionEnd).toBe(11);
      expect(controller.cursorPosition).toBe(11);
    });
  });

  describe('selectWordAt (double-click)', () => {
    test('selects word at position', () => {
      controller.insertText('hello world');
      controller.selectWordAt(7);
      expect(controller.selectionStart).toBe(6);
      expect(controller.selectionEnd).toBe(11);
    });

    test('selects word at start', () => {
      controller.insertText('hello world');
      controller.selectWordAt(0);
      expect(controller.selectionStart).toBe(0);
      expect(controller.selectionEnd).toBe(5);
    });

    test('selects single non-word character', () => {
      controller.insertText('hello world');
      controller.selectWordAt(5); // space
      expect(controller.selectionStart).toBe(5);
      expect(controller.selectionEnd).toBe(6);
    });
  });

  describe('insertText replaces selection', () => {
    test('replaces selected text', () => {
      controller.insertText('hello world');
      controller.setSelection(0, 5);
      controller.insertText('goodbye');
      expect(controller.text).toBe('goodbye world');
      expect(controller.cursorPosition).toBe(7);
      expect(controller.hasSelection).toBe(false);
    });
  });

  describe('deleteBackward with selection', () => {
    test('deletes selected text', () => {
      controller.insertText('hello world');
      controller.setSelection(5, 11);
      controller.deleteBackward();
      expect(controller.text).toBe('hello');
      expect(controller.cursorPosition).toBe(5);
      expect(controller.hasSelection).toBe(false);
    });
  });

  describe('deleteForward with selection', () => {
    test('deletes selected text', () => {
      controller.insertText('hello world');
      controller.setSelection(0, 5);
      controller.deleteForward();
      expect(controller.text).toBe(' world');
      expect(controller.cursorPosition).toBe(0);
      expect(controller.hasSelection).toBe(false);
    });
  });
});

// ===========================================================================
// TextField Widget - Properties
// ===========================================================================

describe('TextField - Properties', () => {
  test('creates with default values', () => {
    const tf = new TextField();
    expect(tf.controller).toBeUndefined();
    expect(tf.placeholder).toBeUndefined();
    expect(tf.maxLines).toBeUndefined();
    expect(tf.isSingleLine).toBe(false);
  });

  test('maxLines=1 is single-line', () => {
    const tf = new TextField({ maxLines: 1 });
    expect(tf.maxLines).toBe(1);
    expect(tf.isSingleLine).toBe(true);
  });

  test('maxLines > 1 is multi-line', () => {
    const tf = new TextField({ maxLines: 5 });
    expect(tf.isSingleLine).toBe(false);
  });

  test('undefined maxLines is multi-line', () => {
    const tf = new TextField();
    expect(tf.isSingleLine).toBe(false);
  });

  test('creates with onSubmitted callback', () => {
    let submitted = '';
    const tf = new TextField({ onSubmitted: (text) => { submitted = text; } });
    expect(tf.onSubmitted).toBeDefined();
    tf.onSubmitted!('test');
    expect(submitted).toBe('test');
  });

  test('creates with onSubmit callback (backward compat)', () => {
    let submitted = '';
    const tf = new TextField({ onSubmit: (text) => { submitted = text; } });
    expect(tf.onSubmit).toBeDefined();
    tf.onSubmit!('test');
    expect(submitted).toBe('test');
  });

  test('creates with focusNode', () => {
    const fn = new FocusNode();
    const tf = new TextField({ focusNode: fn });
    expect(tf.focusNode).toBe(fn);
    fn.dispose();
  });

  test('creates with selectionColor', () => {
    const tf = new TextField({ selectionColor: Color.blue });
    expect(tf.selectionColor).toBe(Color.blue);
  });

  test('creates with cursorChar', () => {
    const tf = new TextField({ cursorChar: '_' });
    expect(tf.cursorChar).toBe('_');
  });

  test('is a StatefulWidget', () => {
    const tf = new TextField();
    const state = tf.createState();
    expect(state).toBeDefined();
  });
});

// ===========================================================================
// TextField State - Single-line Mode (Enter submits)
// ===========================================================================

describe('TextField State - Single-line Mode', () => {
  test('Enter submits in single-line mode', () => {
    let submitted = '';
    const state = createTextFieldState({
      maxLines: 1,
      onSubmitted: (text) => { submitted = text; },
    });
    state.controller.insertText('hello');
    state.handleKeyEvent(keyEvent('Enter'));
    expect(submitted).toBe('hello');
  });

  test('Enter also fires onSubmit in single-line mode', () => {
    let submitted = '';
    const state = createTextFieldState({
      maxLines: 1,
      onSubmit: (text) => { submitted = text; },
    });
    state.controller.insertText('hello');
    state.handleKeyEvent(keyEvent('Enter'));
    expect(submitted).toBe('hello');
  });

  test('Ctrl+Enter submits in single-line mode', () => {
    let submitted = '';
    const state = createTextFieldState({
      maxLines: 1,
      onSubmitted: (text) => { submitted = text; },
    });
    state.controller.insertText('hello');
    state.handleKeyEvent(keyEvent('Enter', { ctrlKey: true }));
    expect(submitted).toBe('hello');
  });

  test('Shift+Enter inserts newline in single-line mode', () => {
    const state = createTextFieldState({ maxLines: 1 });
    state.controller.insertText('hello');
    state.handleKeyEvent(keyEvent('Enter', { shiftKey: true }));
    expect(state.controller.text).toBe('hello\n');
  });

  test('Alt+Enter inserts newline in single-line mode', () => {
    const state = createTextFieldState({ maxLines: 1 });
    state.controller.insertText('hello');
    state.handleKeyEvent(keyEvent('Enter', { altKey: true }));
    expect(state.controller.text).toBe('hello\n');
  });
});

// ===========================================================================
// TextField State - Multi-line Mode (Enter inserts newline, Ctrl+Enter submits)
// ===========================================================================

describe('TextField State - Multi-line Mode', () => {
  test('Enter inserts newline in multi-line mode', () => {
    const state = createTextFieldState({ maxLines: 5 });
    state.controller.insertText('hello');
    state.handleKeyEvent(keyEvent('Enter'));
    expect(state.controller.text).toBe('hello\n');
  });

  test('Enter inserts newline with undefined maxLines (default multi-line)', () => {
    const state = createTextFieldState();
    state.controller.insertText('hello');
    state.handleKeyEvent(keyEvent('Enter'));
    expect(state.controller.text).toBe('hello\n');
  });

  test('Ctrl+Enter submits in multi-line mode', () => {
    let submitted = '';
    const state = createTextFieldState({
      maxLines: 5,
      onSubmitted: (text) => { submitted = text; },
    });
    state.controller.insertText('hello\nworld');
    state.handleKeyEvent(keyEvent('Enter', { ctrlKey: true }));
    expect(submitted).toBe('hello\nworld');
  });

  test('ArrowUp moves cursor up in multi-line', () => {
    const state = createTextFieldState({ maxLines: 5 });
    state.controller.insertText('line1\nline2');
    const result = state.handleKeyEvent(keyEvent('ArrowUp'));
    expect(result).toBe('handled');
    expect(state.controller.cursorPosition).toBe(5);
  });

  test('ArrowDown moves cursor down in multi-line', () => {
    const state = createTextFieldState({ maxLines: 5 });
    state.controller.insertText('line1\nline2');
    state.controller.cursorPosition = 3;
    const result = state.handleKeyEvent(keyEvent('ArrowDown'));
    expect(result).toBe('handled');
    expect(state.controller.cursorPosition).toBe(9);
  });

  test('ArrowUp is ignored in single-line mode', () => {
    const state = createTextFieldState({ maxLines: 1 });
    state.controller.insertText('hello');
    const result = state.handleKeyEvent(keyEvent('ArrowUp'));
    expect(result).toBe('ignored');
  });

  test('ArrowDown is ignored in single-line mode', () => {
    const state = createTextFieldState({ maxLines: 1 });
    state.controller.insertText('hello');
    const result = state.handleKeyEvent(keyEvent('ArrowDown'));
    expect(result).toBe('ignored');
  });

  test('Home goes to line start in multi-line', () => {
    const state = createTextFieldState({ maxLines: 5 });
    state.controller.insertText('line1\nline2');
    state.handleKeyEvent(keyEvent('Home'));
    expect(state.controller.cursorPosition).toBe(6); // start of line2
  });

  test('End goes to line end in multi-line', () => {
    const state = createTextFieldState({ maxLines: 5 });
    state.controller.insertText('line1\nline2');
    state.controller.cursorPosition = 6;
    state.handleKeyEvent(keyEvent('End'));
    expect(state.controller.cursorPosition).toBe(11);
  });
});

// ===========================================================================
// TextField State - Character Insertion and Deletion
// ===========================================================================

describe('TextField State - Character Operations', () => {
  test('typing characters', () => {
    const state = createTextFieldState({ maxLines: 1 });
    state.handleKeyEvent(keyEvent('h'));
    state.handleKeyEvent(keyEvent('i'));
    expect(state.controller.text).toBe('hi');
    expect(state.controller.cursorPosition).toBe(2);
  });

  test('Backspace deletes backward', () => {
    const state = createTextFieldState({ maxLines: 1 });
    state.controller.insertText('abc');
    state.handleKeyEvent(keyEvent('Backspace'));
    expect(state.controller.text).toBe('ab');
  });

  test('Delete deletes forward', () => {
    const state = createTextFieldState({ maxLines: 1 });
    state.controller.insertText('abc');
    state.controller.cursorPosition = 1;
    state.handleKeyEvent(keyEvent('Delete'));
    expect(state.controller.text).toBe('ac');
  });

  test('Space inserts space character', () => {
    const state = createTextFieldState({ maxLines: 1 });
    state.controller.insertText('hello');
    state.handleKeyEvent(keyEvent('Space'));
    expect(state.controller.text).toBe('hello ');
  });
});

// ===========================================================================
// TextField State - Word-level Operations via Key Events
// ===========================================================================

describe('TextField State - Word Operations', () => {
  test('Ctrl+Backspace deletes word backward', () => {
    const state = createTextFieldState({ maxLines: 1 });
    state.controller.insertText('hello world');
    state.handleKeyEvent(keyEvent('Backspace', { ctrlKey: true }));
    expect(state.controller.text).toBe('hello ');
  });

  test('Ctrl+Delete deletes word forward', () => {
    const state = createTextFieldState({ maxLines: 1 });
    state.controller.insertText('hello world');
    state.controller.cursorPosition = 0;
    state.handleKeyEvent(keyEvent('Delete', { ctrlKey: true }));
    expect(state.controller.text).toBe(' world');
  });

  test('Ctrl+Left moves to previous word', () => {
    const state = createTextFieldState({ maxLines: 1 });
    state.controller.insertText('hello world');
    state.handleKeyEvent(keyEvent('ArrowLeft', { ctrlKey: true }));
    expect(state.controller.cursorPosition).toBe(6);
  });

  test('Ctrl+Right moves to next word', () => {
    const state = createTextFieldState({ maxLines: 1 });
    state.controller.insertText('hello world');
    state.controller.cursorPosition = 0;
    state.handleKeyEvent(keyEvent('ArrowRight', { ctrlKey: true }));
    expect(state.controller.cursorPosition).toBe(5);
  });
});

// ===========================================================================
// TextField State - Cursor Movement
// ===========================================================================

describe('TextField State - Cursor Movement', () => {
  test('ArrowLeft moves cursor left', () => {
    const state = createTextFieldState({ maxLines: 1 });
    state.controller.insertText('abc');
    state.handleKeyEvent(keyEvent('ArrowLeft'));
    expect(state.controller.cursorPosition).toBe(2);
  });

  test('ArrowRight moves cursor right', () => {
    const state = createTextFieldState({ maxLines: 1 });
    state.controller.insertText('abc');
    state.controller.cursorPosition = 0;
    state.handleKeyEvent(keyEvent('ArrowRight'));
    expect(state.controller.cursorPosition).toBe(1);
  });

  test('Home moves to start', () => {
    const state = createTextFieldState({ maxLines: 1 });
    state.controller.insertText('abc');
    state.handleKeyEvent(keyEvent('Home'));
    expect(state.controller.cursorPosition).toBe(0);
  });

  test('End moves to end', () => {
    const state = createTextFieldState({ maxLines: 1 });
    state.controller.insertText('abc');
    state.controller.cursorPosition = 0;
    state.handleKeyEvent(keyEvent('End'));
    expect(state.controller.cursorPosition).toBe(3);
  });

  test('ArrowLeft collapses selection to start', () => {
    const state = createTextFieldState({ maxLines: 1 });
    state.controller.insertText('hello');
    state.controller.setSelection(1, 4);
    state.handleKeyEvent(keyEvent('ArrowLeft'));
    expect(state.controller.hasSelection).toBe(false);
    expect(state.controller.cursorPosition).toBe(1);
  });

  test('ArrowRight collapses selection to end', () => {
    const state = createTextFieldState({ maxLines: 1 });
    state.controller.insertText('hello');
    state.controller.setSelection(1, 4);
    state.handleKeyEvent(keyEvent('ArrowRight'));
    expect(state.controller.hasSelection).toBe(false);
    expect(state.controller.cursorPosition).toBe(4);
  });
});

// ===========================================================================
// TextField State - Selection via Key Events
// ===========================================================================

describe('TextField State - Selection', () => {
  test('Shift+Left extends selection left', () => {
    const state = createTextFieldState({ maxLines: 1 });
    state.controller.insertText('hello');
    state.handleKeyEvent(keyEvent('ArrowLeft', { shiftKey: true }));
    expect(state.controller.hasSelection).toBe(true);
    expect(state.controller.selectionStart).toBe(5);
    expect(state.controller.selectionEnd).toBe(4);
  });

  test('Shift+Right extends selection right', () => {
    const state = createTextFieldState({ maxLines: 1 });
    state.controller.insertText('hello');
    state.controller.cursorPosition = 0;
    state.handleKeyEvent(keyEvent('ArrowRight', { shiftKey: true }));
    expect(state.controller.hasSelection).toBe(true);
    expect(state.controller.selectionStart).toBe(0);
    expect(state.controller.selectionEnd).toBe(1);
  });

  test('Ctrl+A selects all', () => {
    const state = createTextFieldState({ maxLines: 1 });
    state.controller.insertText('hello');
    state.handleKeyEvent(keyEvent('a', { ctrlKey: true }));
    expect(state.controller.selectionStart).toBe(0);
    expect(state.controller.selectionEnd).toBe(5);
  });

  test('Ctrl+Shift+Left selects word left', () => {
    const state = createTextFieldState({ maxLines: 1 });
    state.controller.insertText('hello world');
    state.handleKeyEvent(keyEvent('ArrowLeft', { ctrlKey: true, shiftKey: true }));
    expect(state.controller.hasSelection).toBe(true);
    expect(state.controller.selectionStart).toBe(11);
    expect(state.controller.selectionEnd).toBe(6);
  });

  test('Ctrl+Shift+Right selects word right', () => {
    const state = createTextFieldState({ maxLines: 1 });
    state.controller.insertText('hello world');
    state.controller.cursorPosition = 0;
    state.handleKeyEvent(keyEvent('ArrowRight', { ctrlKey: true, shiftKey: true }));
    expect(state.controller.hasSelection).toBe(true);
    expect(state.controller.selectionStart).toBe(0);
    expect(state.controller.selectionEnd).toBe(5);
  });

  test('Shift+Home selects to start', () => {
    const state = createTextFieldState({ maxLines: 1 });
    state.controller.insertText('hello');
    state.handleKeyEvent(keyEvent('Home', { shiftKey: true }));
    expect(state.controller.hasSelection).toBe(true);
    expect(state.controller.selectionStart).toBe(5);
    expect(state.controller.selectionEnd).toBe(0);
  });

  test('Shift+End selects to end', () => {
    const state = createTextFieldState({ maxLines: 1 });
    state.controller.insertText('hello');
    state.controller.cursorPosition = 0;
    state.handleKeyEvent(keyEvent('End', { shiftKey: true }));
    expect(state.controller.hasSelection).toBe(true);
    expect(state.controller.selectionStart).toBe(0);
    expect(state.controller.selectionEnd).toBe(5);
  });

  test('Shift+Up extends selection up in multi-line', () => {
    const state = createTextFieldState({ maxLines: 5 });
    state.controller.insertText('line1\nline2');
    state.handleKeyEvent(keyEvent('ArrowUp', { shiftKey: true }));
    expect(state.controller.hasSelection).toBe(true);
  });

  test('Shift+Down extends selection down in multi-line', () => {
    const state = createTextFieldState({ maxLines: 5 });
    state.controller.insertText('line1\nline2');
    state.controller.cursorPosition = 3;
    state.handleKeyEvent(keyEvent('ArrowDown', { shiftKey: true }));
    expect(state.controller.hasSelection).toBe(true);
  });
});

// ===========================================================================
// TextField State - Mouse Interaction
// ===========================================================================

describe('TextField State - Mouse Interaction', () => {
  test('click places cursor at position', () => {
    const state = createTextFieldState({ maxLines: 1 });
    state.controller.insertText('hello world');
    state.handleMouseEvent('click', 5, 0);
    expect(state.controller.cursorPosition).toBe(5);
    expect(state.controller.hasSelection).toBe(false);
  });

  test('click in multi-line places cursor on correct line', () => {
    const state = createTextFieldState({ maxLines: 5 });
    state.controller.insertText('line1\nline2\nline3');
    state.handleMouseEvent('click', 3, 1);
    expect(state.controller.cursorPosition).toBe(9); // 6 + 3 (start of line2 + col 3)
  });

  test('double-click selects word', () => {
    const state = createTextFieldState({ maxLines: 1 });
    state.controller.insertText('hello world');
    // First click
    state.handleMouseEvent('click', 7, 0);
    // Simulate double-click with same position and fast timing
    // We need to manipulate internal state for timing, so let's just call twice
    state.handleMouseEvent('click', 7, 0);
    expect(state.controller.hasSelection).toBe(true);
    expect(state.controller.selectionStart).toBe(6);
    expect(state.controller.selectionEnd).toBe(11);
  });

  test('click-and-drag creates selection', () => {
    const state = createTextFieldState({ maxLines: 1 });
    state.controller.insertText('hello world');
    state.handleMouseEvent('press', 0, 0);
    state.handleMouseEvent('drag', 5, 0);
    expect(state.controller.hasSelection).toBe(true);
    expect(state.controller.selectionStart).toBe(0);
    expect(state.controller.selectionEnd).toBe(5);
  });

  test('release stops dragging', () => {
    const state = createTextFieldState({ maxLines: 1 });
    state.controller.insertText('hello world');
    state.handleMouseEvent('press', 0, 0);
    state.handleMouseEvent('drag', 3, 0);
    state.handleMouseEvent('release', 3, 0);
    // Further drag should not change selection
    const prevStart = state.controller.selectionStart;
    const prevEnd = state.controller.selectionEnd;
    state.handleMouseEvent('drag', 8, 0);
    expect(state.controller.selectionStart).toBe(prevStart);
    expect(state.controller.selectionEnd).toBe(prevEnd);
  });

  test('click clamps x to line length', () => {
    const state = createTextFieldState({ maxLines: 1 });
    state.controller.insertText('hi');
    state.handleMouseEvent('click', 100, 0);
    expect(state.controller.cursorPosition).toBe(2);
  });

  test('click clamps y to line count', () => {
    const state = createTextFieldState({ maxLines: 5 });
    state.controller.insertText('line1');
    state.handleMouseEvent('click', 2, 10);
    expect(state.controller.cursorPosition).toBe(2);
  });
});

// ===========================================================================
// TextField State - onChanged Callback
// ===========================================================================

describe('TextField State - onChanged', () => {
  test('fires onChanged when text is typed', () => {
    const changes: string[] = [];
    const state = createTextFieldState({
      maxLines: 1,
      onChanged: (text) => { changes.push(text); },
    });
    state.handleKeyEvent(keyEvent('h'));
    state.handleKeyEvent(keyEvent('i'));
    expect(changes).toEqual(['h', 'hi']);
  });

  test('fires onChanged on Backspace', () => {
    const changes: string[] = [];
    const state = createTextFieldState({
      maxLines: 1,
      onChanged: (text) => { changes.push(text); },
    });
    state.controller.insertText('abc');
    changes.length = 0; // clear initial changes
    state.handleKeyEvent(keyEvent('Backspace'));
    expect(changes).toEqual(['ab']);
  });
});

// ===========================================================================
// TextField State - onSubmitted Callback
// ===========================================================================

describe('TextField State - onSubmitted', () => {
  test('fires onSubmitted on Enter in single-line', () => {
    let submitted = '';
    const state = createTextFieldState({
      maxLines: 1,
      onSubmitted: (text) => { submitted = text; },
    });
    state.controller.insertText('hello');
    state.handleKeyEvent(keyEvent('Enter'));
    expect(submitted).toBe('hello');
  });

  test('fires onSubmitted on Ctrl+Enter in multi-line', () => {
    let submitted = '';
    const state = createTextFieldState({
      maxLines: 5,
      onSubmitted: (text) => { submitted = text; },
    });
    state.controller.insertText('line1\nline2');
    state.handleKeyEvent(keyEvent('Enter', { ctrlKey: true }));
    expect(submitted).toBe('line1\nline2');
  });

  test('does NOT fire onSubmitted on Enter in multi-line (inserts newline instead)', () => {
    let submitted = '';
    const state = createTextFieldState({
      maxLines: 5,
      onSubmitted: (text) => { submitted = text; },
    });
    state.controller.insertText('hello');
    state.handleKeyEvent(keyEvent('Enter'));
    expect(submitted).toBe('');
    expect(state.controller.text).toBe('hello\n');
  });
});

// ===========================================================================
// TextField State - Backward Compatibility (string-based handleKeyEvent)
// ===========================================================================

describe('TextField State - Backward Compatibility', () => {
  test('handles string-based key events', () => {
    const state = createTextFieldState({ maxLines: 1 });
    state.handleKeyEvent('h');
    state.handleKeyEvent('i');
    expect(state.controller.text).toBe('hi');
  });

  test('Backspace via string key', () => {
    const state = createTextFieldState({ maxLines: 1 });
    state.controller.insertText('abc');
    state.handleKeyEvent('Backspace');
    expect(state.controller.text).toBe('ab');
  });

  test('Delete via string key', () => {
    const state = createTextFieldState({ maxLines: 1 });
    state.controller.insertText('abc');
    state.controller.cursorPosition = 1;
    state.handleKeyEvent('Delete');
    expect(state.controller.text).toBe('ac');
  });

  test('ArrowLeft via string key', () => {
    const state = createTextFieldState({ maxLines: 1 });
    state.controller.insertText('abc');
    state.handleKeyEvent('ArrowLeft');
    expect(state.controller.cursorPosition).toBe(2);
  });

  test('ArrowRight via string key', () => {
    const state = createTextFieldState({ maxLines: 1 });
    state.controller.insertText('abc');
    state.controller.cursorPosition = 0;
    state.handleKeyEvent('ArrowRight');
    expect(state.controller.cursorPosition).toBe(1);
  });

  test('Home via string key', () => {
    const state = createTextFieldState({ maxLines: 1 });
    state.controller.insertText('abc');
    state.handleKeyEvent('Home');
    expect(state.controller.cursorPosition).toBe(0);
  });

  test('End via string key', () => {
    const state = createTextFieldState({ maxLines: 1 });
    state.controller.insertText('abc');
    state.controller.cursorPosition = 0;
    state.handleKeyEvent('End');
    expect(state.controller.cursorPosition).toBe(3);
  });

  test('Enter via string key submits (single-line default)', () => {
    let submitted = '';
    const state = createTextFieldState({
      maxLines: 1,
      onSubmit: (text) => { submitted = text; },
    });
    state.controller.insertText('test');
    state.handleKeyEvent('Enter');
    expect(submitted).toBe('test');
  });

  test('unknown key returns ignored', () => {
    const state = createTextFieldState({ maxLines: 1 });
    const result = state.handleKeyEvent('F12');
    expect(result).toBe('ignored');
  });
});

// ===========================================================================
// TextField State - Tab handling
// ===========================================================================

describe('TextField State - Tab', () => {
  test('Tab returns ignored (for focus traversal)', () => {
    const state = createTextFieldState({ maxLines: 1 });
    const result = state.handleKeyEvent(keyEvent('Tab'));
    expect(result).toBe('ignored');
  });
});

// ===========================================================================
// TextField State - FocusNode
// ===========================================================================

describe('TextField State - Focus', () => {
  test('state creates internal focusNode when none provided', () => {
    const state = createTextFieldState();
    expect(state.focusNode).toBeDefined();
    expect(state.focusNode).toBeInstanceOf(FocusNode);
  });

  test('state uses provided focusNode', () => {
    const fn = new FocusNode();
    const state = createTextFieldState({ focusNode: fn });
    expect(state.focusNode).toBe(fn);
    fn.dispose();
  });

  test('focusNode has onPaste handler wired', () => {
    const state = createTextFieldState();
    expect(state.focusNode.onPaste).toBeDefined();
    expect(typeof state.focusNode.onPaste).toBe('function');
  });
});

// ===========================================================================
// TextField State - Paste Handling
// ===========================================================================

describe('TextField State - Paste', () => {
  test('onPaste inserts text at cursor', () => {
    const state = createTextFieldState({ maxLines: 1 });
    state.controller.insertText('hello');
    state.controller.cursorPosition = 5;
    state.focusNode.onPaste!('world');
    expect(state.controller.text).toBe('helloworld');
    expect(state.controller.cursorPosition).toBe(10);
  });

  test('onPaste replaces selection', () => {
    const state = createTextFieldState({ maxLines: 1 });
    state.controller.insertText('hello world');
    state.controller.setSelection(0, 5);
    state.focusNode.onPaste!('goodbye');
    expect(state.controller.text).toBe('goodbye world');
    expect(state.controller.cursorPosition).toBe(7);
    expect(state.controller.hasSelection).toBe(false);
  });

  test('onPaste inserts multi-line text', () => {
    const state = createTextFieldState({ maxLines: 5 });
    state.focusNode.onPaste!('line1\nline2\nline3');
    expect(state.controller.text).toBe('line1\nline2\nline3');
    expect(state.controller.cursorPosition).toBe(17);
  });

  test('onPaste triggers onChanged', () => {
    const changes: string[] = [];
    const state = createTextFieldState({
      maxLines: 1,
      onChanged: (text) => { changes.push(text); },
    });
    state.focusNode.onPaste!('pasted');
    expect(changes).toEqual(['pasted']);
  });
});
