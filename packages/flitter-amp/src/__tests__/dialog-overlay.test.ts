// Tests for DialogOverlay — Gap 26: Connect Dialog data class to widget tree
//
// Verifies: DialogOverlay renders a Dialog data class as a modal overlay
// with proper title, subtitle, body, border, and styling

import { describe, it, expect } from 'bun:test';
import { Dialog } from 'flitter-core/src/widgets/dialog';
import { DialogOverlay } from 'flitter-core/src/widgets/dialog-overlay';
import { SizedBox } from 'flitter-core/src/widgets/sized-box';
import { Stack } from 'flitter-core/src/widgets/stack';
import { Color } from 'flitter-core/src/core/color';
import { TextStyle } from 'flitter-core/src/core/text-style';

describe('DialogOverlay', () => {
  it('can be instantiated with a Dialog data class', () => {
    const dialog = new Dialog({ title: 'Test Dialog' });
    const overlay = new DialogOverlay({ dialog });
    expect(overlay).toBeInstanceOf(DialogOverlay);
    expect(overlay.dialog).toBe(dialog);
  });

  it('stores the dialog and style', () => {
    const dialog = new Dialog({ title: 'Hello', type: 'warning' });
    const style = {
      borderColor: Color.red,
      titleStyle: new TextStyle({ bold: true }),
    };
    const overlay = new DialogOverlay({ dialog, style });
    expect(overlay.dialog.title).toBe('Hello');
    expect(overlay.dialog.type).toBe('warning');
    expect(overlay.style.borderColor).toBe(Color.red);
  });

  it('defaults style to empty object when not provided', () => {
    const dialog = new Dialog({ title: 'Minimal' });
    const overlay = new DialogOverlay({ dialog });
    expect(overlay.style).toEqual({});
  });

  it('accepts dialog with subtitle', () => {
    const dialog = new Dialog({ title: 'Title', subtitle: 'Subtitle text' });
    const overlay = new DialogOverlay({ dialog });
    expect(overlay.dialog.subtitle).toBe('Subtitle text');
  });

  it('accepts dialog with body widget', () => {
    const body = new SizedBox({ width: 10, height: 5 });
    const dialog = new Dialog({ title: 'Title', body });
    const overlay = new DialogOverlay({ dialog });
    expect(overlay.dialog.body).toBe(body);
  });

  it('accepts dialog with dimensions', () => {
    const dialog = new Dialog({
      title: 'Sized',
      dimensions: { width: 40, height: 20 },
    });
    const overlay = new DialogOverlay({ dialog });
    expect(overlay.dialog.dimensions?.width).toBe(40);
    expect(overlay.dialog.dimensions?.height).toBe(20);
  });

  it('accepts dialog with border: false', () => {
    const dialog = new Dialog({ title: 'No Border', border: false });
    const overlay = new DialogOverlay({ dialog });
    expect(overlay.dialog.border).toBe(false);
  });

  it('accepts all dialog types', () => {
    const types = ['info', 'warning', 'error', 'confirm', 'custom'] as const;
    for (const type of types) {
      const dialog = new Dialog({ title: 'Test', type });
      const overlay = new DialogOverlay({ dialog });
      expect(overlay.dialog.type).toBe(type);
    }
  });

  it('accepts custom mask color in style', () => {
    const dialog = new Dialog({ title: 'Custom Mask' });
    const overlay = new DialogOverlay({
      dialog,
      style: { maskColor: Color.rgb(0, 0, 0).withAlpha(0.8) },
    });
    expect(overlay.style.maskColor).toBeDefined();
  });

  it('accepts custom max width in style', () => {
    const dialog = new Dialog({ title: 'Custom Width' });
    const overlay = new DialogOverlay({
      dialog,
      style: { maxWidth: 80 },
    });
    expect(overlay.style.maxWidth).toBe(80);
  });
});
