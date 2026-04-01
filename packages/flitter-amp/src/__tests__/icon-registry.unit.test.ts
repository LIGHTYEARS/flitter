import { describe, test, expect } from 'bun:test';

import { stringWidth } from 'flitter-core/src/core/wcwidth';

import { icon } from '../ui/icons/icon-registry';
import type { IconName } from '../ui/icons/types';

const ICON_NAMES: IconName[] = [
  'status.warning',
  'status.processing',
  'disclosure.collapsed',
  'disclosure.expanded',
  'tool.status.done',
  'tool.status.error',
  'tool.status.pending',
  'plan.status.completed',
  'plan.status.in_progress',
  'plan.status.pending',
  'todo.status.pending',
  'todo.status.in_progress',
  'todo.status.completed',
  'todo.status.cancelled',
  'arrow.right',
];
describe('icon registry', () => {
  test('every icon is 1-cell wide', () => {
    for (const name of ICON_NAMES) {
      const glyph = icon(name);
      expect(glyph.length).toBeGreaterThan(0);
      expect(stringWidth(glyph)).toBe(1);
    }
  });
});
