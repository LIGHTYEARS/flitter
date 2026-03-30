// Tests for overlay-ids — Gap 27: Well-known overlay identifiers and priorities
//
// Verifies: OVERLAY_IDS and OVERLAY_PRIORITIES constants are consistent
// and priorities maintain correct relative ordering

import { describe, it, expect } from 'bun:test';
import { OVERLAY_IDS, OVERLAY_PRIORITIES } from '../state/overlay-ids';

describe('overlay-ids', () => {
  describe('OVERLAY_IDS', () => {
    it('defines all expected overlay identifiers', () => {
      expect(OVERLAY_IDS.PERMISSION_DIALOG).toBe('permission');
      expect(OVERLAY_IDS.COMMAND_PALETTE).toBe('commandPalette');
      expect(OVERLAY_IDS.SHORTCUT_HELP).toBe('shortcutHelp');
      expect(OVERLAY_IDS.FILE_PICKER).toBe('filePicker');
      expect(OVERLAY_IDS.TOAST).toBe('toast');
    });

    it('all ids are unique', () => {
      const ids = Object.values(OVERLAY_IDS);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });
  });

  describe('OVERLAY_PRIORITIES', () => {
    it('defines all expected overlay priorities', () => {
      expect(typeof OVERLAY_PRIORITIES.PERMISSION_DIALOG).toBe('number');
      expect(typeof OVERLAY_PRIORITIES.COMMAND_PALETTE).toBe('number');
      expect(typeof OVERLAY_PRIORITIES.SHORTCUT_HELP).toBe('number');
      expect(typeof OVERLAY_PRIORITIES.FILE_PICKER).toBe('number');
      expect(typeof OVERLAY_PRIORITIES.TOAST).toBe('number');
    });

    it('permission dialog has highest priority', () => {
      expect(OVERLAY_PRIORITIES.PERMISSION_DIALOG).toBeGreaterThan(OVERLAY_PRIORITIES.COMMAND_PALETTE);
      expect(OVERLAY_PRIORITIES.PERMISSION_DIALOG).toBeGreaterThan(OVERLAY_PRIORITIES.SHORTCUT_HELP);
      expect(OVERLAY_PRIORITIES.PERMISSION_DIALOG).toBeGreaterThan(OVERLAY_PRIORITIES.FILE_PICKER);
      expect(OVERLAY_PRIORITIES.PERMISSION_DIALOG).toBeGreaterThan(OVERLAY_PRIORITIES.TOAST);
    });

    it('command palette and shortcut help have equal priority (mid-tier)', () => {
      expect(OVERLAY_PRIORITIES.COMMAND_PALETTE).toBe(OVERLAY_PRIORITIES.SHORTCUT_HELP);
    });

    it('file picker is below command palette', () => {
      expect(OVERLAY_PRIORITIES.FILE_PICKER).toBeLessThan(OVERLAY_PRIORITIES.COMMAND_PALETTE);
    });

    it('toast is lowest priority', () => {
      expect(OVERLAY_PRIORITIES.TOAST).toBeLessThan(OVERLAY_PRIORITIES.FILE_PICKER);
    });
  });
});
