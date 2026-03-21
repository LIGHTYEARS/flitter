// Tests for ShortcutBinding and matchesShortcut
// Amp ref: input-system.md Section 8.1
import { describe, test, expect } from 'bun:test';
import { matchesShortcut } from '../shortcuts';
import type { ShortcutBinding } from '../shortcuts';
import { createKeyEvent } from '../events';

describe('matchesShortcut', () => {
  test('matches exact key with no modifiers', () => {
    const event = createKeyEvent('Enter');
    const binding: ShortcutBinding = { key: 'Enter' };
    expect(matchesShortcut(event, binding)).toBe(true);
  });

  test('matches key with ctrl modifier', () => {
    const event = createKeyEvent('c', { ctrlKey: true });
    const binding: ShortcutBinding = { key: 'c', ctrl: true };
    expect(matchesShortcut(event, binding)).toBe(true);
  });

  test('matches key with alt modifier', () => {
    const event = createKeyEvent('d', { altKey: true });
    const binding: ShortcutBinding = { key: 'd', alt: true };
    expect(matchesShortcut(event, binding)).toBe(true);
  });

  test('matches key with shift modifier', () => {
    const event = createKeyEvent('Tab', { shiftKey: true });
    const binding: ShortcutBinding = { key: 'Tab', shift: true };
    expect(matchesShortcut(event, binding)).toBe(true);
  });

  test('matches key with meta modifier', () => {
    const event = createKeyEvent('Enter', { metaKey: true });
    const binding: ShortcutBinding = { key: 'Enter', meta: true };
    expect(matchesShortcut(event, binding)).toBe(true);
  });

  test('fails on wrong key', () => {
    const event = createKeyEvent('a');
    const binding: ShortcutBinding = { key: 'b' };
    expect(matchesShortcut(event, binding)).toBe(false);
  });

  test('fails when modifier mismatch — event has ctrl, binding does not', () => {
    const event = createKeyEvent('c', { ctrlKey: true });
    const binding: ShortcutBinding = { key: 'c' }; // ctrl defaults to false
    expect(matchesShortcut(event, binding)).toBe(false);
  });

  test('fails when modifier mismatch — binding expects ctrl, event does not', () => {
    const event = createKeyEvent('c');
    const binding: ShortcutBinding = { key: 'c', ctrl: true };
    expect(matchesShortcut(event, binding)).toBe(false);
  });

  test('undefined modifiers default to false', () => {
    const event = createKeyEvent('x');
    const binding: ShortcutBinding = { key: 'x' }; // all modifiers undefined -> false
    expect(matchesShortcut(event, binding)).toBe(true);
  });

  test('matches with multiple modifiers (ctrl+shift)', () => {
    const event = createKeyEvent('ArrowUp', { ctrlKey: true, shiftKey: true });
    const binding: ShortcutBinding = { key: 'ArrowUp', ctrl: true, shift: true };
    expect(matchesShortcut(event, binding)).toBe(true);
  });

  test('fails when only some modifiers match', () => {
    const event = createKeyEvent('ArrowUp', { ctrlKey: true, shiftKey: true });
    const binding: ShortcutBinding = { key: 'ArrowUp', ctrl: true };
    // event has shift=true but binding expects shift=false (default)
    expect(matchesShortcut(event, binding)).toBe(false);
  });

  test('matches Ctrl+Alt+Delete', () => {
    const event = createKeyEvent('Delete', { ctrlKey: true, altKey: true });
    const binding: ShortcutBinding = { key: 'Delete', ctrl: true, alt: true };
    expect(matchesShortcut(event, binding)).toBe(true);
  });

  test('matches all four modifiers at once', () => {
    const event = createKeyEvent('a', {
      ctrlKey: true,
      altKey: true,
      shiftKey: true,
      metaKey: true,
    });
    const binding: ShortcutBinding = {
      key: 'a',
      ctrl: true,
      alt: true,
      shift: true,
      meta: true,
    };
    expect(matchesShortcut(event, binding)).toBe(true);
  });

  test('arrow key shortcut without modifiers', () => {
    const event = createKeyEvent('ArrowDown');
    const binding: ShortcutBinding = { key: 'ArrowDown' };
    expect(matchesShortcut(event, binding)).toBe(true);
  });

  test('Escape key matching', () => {
    const event = createKeyEvent('Escape');
    const binding: ShortcutBinding = { key: 'Escape' };
    expect(matchesShortcut(event, binding)).toBe(true);
  });

  test('space key matching', () => {
    const event = createKeyEvent(' ');
    const binding: ShortcutBinding = { key: ' ' };
    expect(matchesShortcut(event, binding)).toBe(true);
  });
});
