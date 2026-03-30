// Tests for ConstrainedBox widget — Gap 32
import { describe, test, expect } from 'bun:test';
import { ConstrainedBox } from '../constrained-box';
import { BoxConstraints } from '../../core/box-constraints';
import { RenderConstrainedBox } from '../../layout/render-constrained';

describe('ConstrainedBox', () => {
  describe('createRenderObject', () => {
    test('creates RenderConstrainedBox with provided constraints', () => {
      const c = new BoxConstraints({ minWidth: 10, maxWidth: 50 });
      const widget = new ConstrainedBox({ constraints: c });
      const ro = widget.createRenderObject();
      expect(ro).toBeInstanceOf(RenderConstrainedBox);
      expect(ro.additionalConstraints.equals(c)).toBe(true);
    });

    test('creates without a child', () => {
      const c = new BoxConstraints({ minHeight: 5 });
      const widget = new ConstrainedBox({ constraints: c });
      expect(widget.child).toBeUndefined();
    });

    test('creates with full range constraints', () => {
      const c = new BoxConstraints({
        minWidth: 5,
        maxWidth: 30,
        minHeight: 2,
        maxHeight: 15,
      });
      const widget = new ConstrainedBox({ constraints: c });
      const ro = widget.createRenderObject();
      expect(ro.additionalConstraints.minWidth).toBe(5);
      expect(ro.additionalConstraints.maxWidth).toBe(30);
      expect(ro.additionalConstraints.minHeight).toBe(2);
      expect(ro.additionalConstraints.maxHeight).toBe(15);
    });
  });

  describe('updateRenderObject', () => {
    test('updates additionalConstraints on render object', () => {
      const c1 = new BoxConstraints({ minWidth: 10 });
      const c2 = new BoxConstraints({ minWidth: 20, maxWidth: 40 });
      const widget1 = new ConstrainedBox({ constraints: c1 });
      const widget2 = new ConstrainedBox({ constraints: c2 });
      const ro = widget1.createRenderObject();
      expect(ro.additionalConstraints.equals(c1)).toBe(true);
      widget2.updateRenderObject(ro);
      expect(ro.additionalConstraints.equals(c2)).toBe(true);
    });

    test('no-op when constraints are identical', () => {
      const c = new BoxConstraints({ minWidth: 10, maxWidth: 50 });
      const widget = new ConstrainedBox({ constraints: c });
      const ro = widget.createRenderObject();
      // Setting same constraints should not trigger markNeedsLayout
      widget.updateRenderObject(ro);
      expect(ro.additionalConstraints.equals(c)).toBe(true);
    });
  });

  describe('constraint parameter is required', () => {
    test('widget stores constraints as readonly', () => {
      const c = new BoxConstraints({ minWidth: 5, maxWidth: 30 });
      const widget = new ConstrainedBox({ constraints: c });
      expect(widget.constraints).toBe(c);
    });

    test('tight constraints work like SizedBox', () => {
      const c = BoxConstraints.tightFor({ width: 20, height: 10 });
      const widget = new ConstrainedBox({ constraints: c });
      const ro = widget.createRenderObject();
      expect(ro.additionalConstraints.minWidth).toBe(20);
      expect(ro.additionalConstraints.maxWidth).toBe(20);
      expect(ro.additionalConstraints.minHeight).toBe(10);
      expect(ro.additionalConstraints.maxHeight).toBe(10);
    });
  });
});
