// Tests for CommandPalette — Gap 28: Search/filter functionality
//
// Verifies: CommandPalette construction, search/filter behavior,
// command scoring, and callback wiring.

import { describe, test, expect } from 'bun:test';
import { CommandPalette } from '../widgets/command-palette';
import type { SelectionItem } from 'flitter-core/src/widgets/selection-list';
import { scoreCommand } from '../utils/fuzzy-match';

describe('CommandPalette', () => {
  const testCommands: SelectionItem[] = [
    { label: 'Clear conversation', value: 'clear', description: 'Remove all messages (Ctrl+L)' },
    { label: 'Toggle tool calls', value: 'toggle-tools', description: 'Expand/collapse tool blocks' },
    { label: 'Toggle thinking', value: 'toggle-thinking', description: 'Expand/collapse thinking blocks' },
    { label: 'Open editor', value: 'open-editor', description: 'Open in $EDITOR (Ctrl+G)' },
    { label: 'Cancel operation', value: 'cancel', description: 'Cancel current operation (Ctrl+C)' },
  ];

  test('constructs with default commands when none provided', () => {
    const palette = new CommandPalette({
      onExecute: () => {},
      onDismiss: () => {},
    });
    // Default commands should be populated (3 default items)
    expect(palette.commands.length).toBeGreaterThan(0);
  });

  test('constructs with custom commands', () => {
    const palette = new CommandPalette({
      onExecute: () => {},
      onDismiss: () => {},
      commands: testCommands,
    });
    expect(palette.commands.length).toBe(5);
  });

  test('is a StatefulWidget', () => {
    const palette = new CommandPalette({
      onExecute: () => {},
      onDismiss: () => {},
    });
    expect(palette.createState).toBeDefined();
  });

  test('stores onExecute and onDismiss callbacks', () => {
    const onExecute = (cmd: string) => {};
    const onDismiss = () => {};
    const palette = new CommandPalette({
      onExecute,
      onDismiss,
      commands: testCommands,
    });
    expect(palette.onExecute).toBe(onExecute);
    expect(palette.onDismiss).toBe(onDismiss);
  });
});

describe('CommandPalette search/filter integration (scoreCommand)', () => {
  // These tests verify the search logic that powers the palette filtering.

  const commands: SelectionItem[] = [
    { label: 'Clear conversation', value: 'clear', description: 'Remove all messages' },
    { label: 'Toggle tool calls', value: 'toggle-tools', description: 'Expand/collapse tool blocks' },
    { label: 'Toggle thinking', value: 'toggle-thinking', description: 'Expand/collapse thinking blocks' },
    { label: 'Open editor', value: 'open-editor', description: 'Open in $EDITOR' },
    { label: 'Cancel operation', value: 'cancel', description: 'Cancel current operation' },
  ];

  function filterCommands(query: string): SelectionItem[] {
    if (query.length === 0) return commands;
    const scored: Array<{ item: SelectionItem; score: number }> = [];
    for (const item of commands) {
      const score = scoreCommand(query, item);
      if (score !== null) {
        scored.push({ item, score });
      }
    }
    scored.sort((a, b) => b.score - a.score);
    return scored.map(s => s.item);
  }

  test('empty query shows all commands', () => {
    const results = filterCommands('');
    expect(results.length).toBe(5);
  });

  test('searching "clear" returns Clear conversation first', () => {
    const results = filterCommands('clear');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]!.value).toBe('clear');
  });

  test('searching "toggle" returns both toggle commands', () => {
    const results = filterCommands('toggle');
    expect(results.length).toBeGreaterThanOrEqual(2);
    const values = results.map(r => r.value);
    expect(values).toContain('toggle-tools');
    expect(values).toContain('toggle-thinking');
  });

  test('non-matching query returns empty array', () => {
    const results = filterCommands('zzzzz');
    expect(results.length).toBe(0);
  });

  test('partial match "cl" finds Clear conversation in results', () => {
    const results = filterCommands('cl');
    expect(results.length).toBeGreaterThan(0);
    const values = results.map(r => r.value);
    expect(values).toContain('clear');
  });

  test('searching "editor" finds Open editor via description match', () => {
    const results = filterCommands('editor');
    expect(results.length).toBeGreaterThan(0);
    const values = results.map(r => r.value);
    expect(values).toContain('open-editor');
  });

  test('search is case insensitive', () => {
    const results1 = filterCommands('CLEAR');
    const results2 = filterCommands('clear');
    expect(results1.length).toBe(results2.length);
    if (results1.length > 0) {
      expect(results1[0]!.value).toBe(results2[0]!.value);
    }
  });

  test('single character search works', () => {
    const results = filterCommands('c');
    expect(results.length).toBeGreaterThan(0);
  });
});
