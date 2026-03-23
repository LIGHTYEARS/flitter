// Tests for LogicalKey constants and keyboard helpers
import { describe, test, expect } from 'bun:test';
import {
  LogicalKey,
  isModifierKey,
  keyFromCharCode,
  isPrintableKey,
  LOW_LEVEL_TO_TUI_KEY,
} from '../keyboard';
import { createKeyEvent } from '../events';

describe('LogicalKey constants', () => {
  test('arrow keys exist', () => {
    expect(LogicalKey.ArrowUp).toBe('ArrowUp');
    expect(LogicalKey.ArrowDown).toBe('ArrowDown');
    expect(LogicalKey.ArrowLeft).toBe('ArrowLeft');
    expect(LogicalKey.ArrowRight).toBe('ArrowRight');
  });

  test('function keys f1-f12 exist', () => {
    expect(LogicalKey.f1).toBe('f1');
    expect(LogicalKey.f2).toBe('f2');
    expect(LogicalKey.f3).toBe('f3');
    expect(LogicalKey.f4).toBe('f4');
    expect(LogicalKey.f5).toBe('f5');
    expect(LogicalKey.f6).toBe('f6');
    expect(LogicalKey.f7).toBe('f7');
    expect(LogicalKey.f8).toBe('f8');
    expect(LogicalKey.f9).toBe('f9');
    expect(LogicalKey.f10).toBe('f10');
    expect(LogicalKey.f11).toBe('f11');
    expect(LogicalKey.f12).toBe('f12');
  });

  test('navigation keys exist', () => {
    expect(LogicalKey.Home).toBe('Home');
    expect(LogicalKey.End).toBe('End');
    expect(LogicalKey.PageUp).toBe('PageUp');
    expect(LogicalKey.PageDown).toBe('PageDown');
    expect(LogicalKey.Insert).toBe('Insert');
    expect(LogicalKey.Delete).toBe('Delete');
  });

  test('action keys exist', () => {
    expect(LogicalKey.Enter).toBe('Enter');
    expect(LogicalKey.Return).toBe('Return');
    expect(LogicalKey.Tab).toBe('Tab');
    expect(LogicalKey.Escape).toBe('Escape');
    expect(LogicalKey.Backspace).toBe('Backspace');
    expect(LogicalKey.Space).toBe('Space');
  });
});

describe('isModifierKey', () => {
  test('recognizes modifier key names', () => {
    expect(isModifierKey('Control')).toBe(true);
    expect(isModifierKey('Shift')).toBe(true);
    expect(isModifierKey('Alt')).toBe(true);
    expect(isModifierKey('Meta')).toBe(true);
  });

  test('rejects non-modifier keys', () => {
    expect(isModifierKey('a')).toBe(false);
    expect(isModifierKey('ArrowUp')).toBe(false);
    expect(isModifierKey('Enter')).toBe(false);
    expect(isModifierKey('Escape')).toBe(false);
    expect(isModifierKey('f1')).toBe(false);
  });
});

describe('keyFromCharCode', () => {
  test('maps control characters (0x01-0x1A) to letters', () => {
    expect(keyFromCharCode(0x01)).toBe('a');  // Ctrl+A
    expect(keyFromCharCode(0x03)).toBe('c');  // Ctrl+C
    expect(keyFromCharCode(0x1A)).toBe('z');  // Ctrl+Z
  });

  test('maps printable ASCII characters', () => {
    expect(keyFromCharCode(0x41)).toBe('A');  // 'A'
    expect(keyFromCharCode(0x61)).toBe('a');  // 'a'
    expect(keyFromCharCode(0x30)).toBe('0');  // '0'
    expect(keyFromCharCode(0x21)).toBe('!');  // '!'
  });

  test('maps special single-byte characters', () => {
    expect(keyFromCharCode(0x0D)).toBe('Enter');
    expect(keyFromCharCode(0x0A)).toBe('Enter');
    expect(keyFromCharCode(0x09)).toBe('Tab');
    expect(keyFromCharCode(0x08)).toBe('Backspace');
    expect(keyFromCharCode(0x7F)).toBe('Backspace');
    expect(keyFromCharCode(0x1B)).toBe('Escape');
  });
});

describe('isPrintableKey', () => {
  test('regular letters are printable', () => {
    expect(isPrintableKey(createKeyEvent('a'))).toBe(true);
    expect(isPrintableKey(createKeyEvent('Z'))).toBe(true);
    expect(isPrintableKey(createKeyEvent('5'))).toBe(true);
    expect(isPrintableKey(createKeyEvent('!'))).toBe(true);
  });

  test('Space is printable', () => {
    expect(isPrintableKey(createKeyEvent('Space'))).toBe(true);
  });

  test('special keys are not printable', () => {
    expect(isPrintableKey(createKeyEvent('ArrowUp'))).toBe(false);
    expect(isPrintableKey(createKeyEvent('Enter'))).toBe(false);
    expect(isPrintableKey(createKeyEvent('Escape'))).toBe(false);
    expect(isPrintableKey(createKeyEvent('f1'))).toBe(false);
  });

  test('modified keys are not printable', () => {
    expect(isPrintableKey(createKeyEvent('a', { ctrlKey: true }))).toBe(false);
    expect(isPrintableKey(createKeyEvent('a', { altKey: true }))).toBe(false);
    expect(isPrintableKey(createKeyEvent('a', { metaKey: true }))).toBe(false);
  });

  test('shift alone does not prevent printability', () => {
    // Shift+a = 'A' which is printable (the key would be 'A')
    expect(isPrintableKey(createKeyEvent('A', { shiftKey: true }))).toBe(true);
  });
});

describe('LOW_LEVEL_TO_TUI_KEY mapping', () => {
  test('maps low-level arrow key names', () => {
    expect(LOW_LEVEL_TO_TUI_KEY['up']).toBe('ArrowUp');
    expect(LOW_LEVEL_TO_TUI_KEY['down']).toBe('ArrowDown');
    expect(LOW_LEVEL_TO_TUI_KEY['left']).toBe('ArrowLeft');
    expect(LOW_LEVEL_TO_TUI_KEY['right']).toBe('ArrowRight');
  });

  test('maps low-level navigation key names', () => {
    expect(LOW_LEVEL_TO_TUI_KEY['home']).toBe('Home');
    expect(LOW_LEVEL_TO_TUI_KEY['end']).toBe('End');
    expect(LOW_LEVEL_TO_TUI_KEY['pageup']).toBe('PageUp');
    expect(LOW_LEVEL_TO_TUI_KEY['pagedown']).toBe('PageDown');
    expect(LOW_LEVEL_TO_TUI_KEY['insert']).toBe('Insert');
    expect(LOW_LEVEL_TO_TUI_KEY['delete']).toBe('Delete');
  });

  test('maps low-level action key names', () => {
    expect(LOW_LEVEL_TO_TUI_KEY['enter']).toBe('Enter');
    expect(LOW_LEVEL_TO_TUI_KEY['return']).toBe('Return');
    expect(LOW_LEVEL_TO_TUI_KEY['tab']).toBe('Tab');
    expect(LOW_LEVEL_TO_TUI_KEY['escape']).toBe('Escape');
    expect(LOW_LEVEL_TO_TUI_KEY['backspace']).toBe('Backspace');
    expect(LOW_LEVEL_TO_TUI_KEY['space']).toBe('Space');
  });
});
