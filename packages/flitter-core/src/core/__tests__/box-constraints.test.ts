// Tests for BoxConstraints
// Covers: constructors, factory methods, constrain, enforce, deflate, queries, equality

import { describe, expect, test } from 'bun:test';
import { BoxConstraints } from '../box-constraints';
import { Size } from '../types';

describe('BoxConstraints', () => {
  describe('default constructor', () => {
    test('creates unconstrained when no args', () => {
      const c = new BoxConstraints();
      expect(c.minWidth).toBe(0);
      expect(c.minHeight).toBe(0);
      expect(c.maxWidth).toBe(Infinity);
      expect(c.maxHeight).toBe(Infinity);
    });

    test('accepts partial options', () => {
      const c = new BoxConstraints({ minWidth: 10, maxHeight: 50 });
      expect(c.minWidth).toBe(10);
      expect(c.minHeight).toBe(0);
      expect(c.maxWidth).toBe(Infinity);
      expect(c.maxHeight).toBe(50);
    });

    test('rounds values to integers', () => {
      const c = new BoxConstraints({
        minWidth: 10.4,
        minHeight: 20.6,
        maxWidth: 30.5,
        maxHeight: 40.3,
      });
      expect(c.minWidth).toBe(10);
      expect(c.minHeight).toBe(21);
      expect(c.maxWidth).toBe(31);
      expect(c.maxHeight).toBe(40);
    });

    test('preserves Infinity (does not round it)', () => {
      const c = new BoxConstraints({ maxWidth: Infinity, maxHeight: Infinity });
      expect(c.maxWidth).toBe(Infinity);
      expect(c.maxHeight).toBe(Infinity);
    });
  });

  describe('tight()', () => {
    test('creates constraints where min equals max', () => {
      const c = BoxConstraints.tight(new Size(80, 24));
      expect(c.minWidth).toBe(80);
      expect(c.maxWidth).toBe(80);
      expect(c.minHeight).toBe(24);
      expect(c.maxHeight).toBe(24);
      expect(c.isTight).toBe(true);
    });

    test('tight with zero size', () => {
      const c = BoxConstraints.tight(Size.zero);
      expect(c.minWidth).toBe(0);
      expect(c.maxWidth).toBe(0);
      expect(c.minHeight).toBe(0);
      expect(c.maxHeight).toBe(0);
      expect(c.isTight).toBe(true);
    });
  });

  describe('tightFor()', () => {
    test('tight on width only', () => {
      const c = BoxConstraints.tightFor({ width: 80 });
      expect(c.minWidth).toBe(80);
      expect(c.maxWidth).toBe(80);
      expect(c.minHeight).toBe(0);
      expect(c.maxHeight).toBe(Infinity);
    });

    test('tight on height only', () => {
      const c = BoxConstraints.tightFor({ height: 24 });
      expect(c.minWidth).toBe(0);
      expect(c.maxWidth).toBe(Infinity);
      expect(c.minHeight).toBe(24);
      expect(c.maxHeight).toBe(24);
    });

    test('tight on both axes', () => {
      const c = BoxConstraints.tightFor({ width: 80, height: 24 });
      expect(c.minWidth).toBe(80);
      expect(c.maxWidth).toBe(80);
      expect(c.minHeight).toBe(24);
      expect(c.maxHeight).toBe(24);
      expect(c.isTight).toBe(true);
    });

    test('no args creates unconstrained', () => {
      const c = BoxConstraints.tightFor();
      expect(c.minWidth).toBe(0);
      expect(c.maxWidth).toBe(Infinity);
      expect(c.minHeight).toBe(0);
      expect(c.maxHeight).toBe(Infinity);
    });
  });

  describe('loose()', () => {
    test('creates zero-min constraints', () => {
      const c = BoxConstraints.loose(new Size(80, 24));
      expect(c.minWidth).toBe(0);
      expect(c.minHeight).toBe(0);
      expect(c.maxWidth).toBe(80);
      expect(c.maxHeight).toBe(24);
    });

    test('loose with zero size', () => {
      const c = BoxConstraints.loose(Size.zero);
      expect(c.minWidth).toBe(0);
      expect(c.minHeight).toBe(0);
      expect(c.maxWidth).toBe(0);
      expect(c.maxHeight).toBe(0);
    });
  });

  describe('constrain()', () => {
    test('clamps size below minimum', () => {
      const c = new BoxConstraints({ minWidth: 10, minHeight: 10, maxWidth: 100, maxHeight: 100 });
      const result = c.constrain(new Size(5, 3));
      expect(result.width).toBe(10);
      expect(result.height).toBe(10);
    });

    test('clamps size above maximum', () => {
      const c = new BoxConstraints({ minWidth: 10, minHeight: 10, maxWidth: 100, maxHeight: 100 });
      const result = c.constrain(new Size(200, 150));
      expect(result.width).toBe(100);
      expect(result.height).toBe(100);
    });

    test('passes through size within range', () => {
      const c = new BoxConstraints({ minWidth: 10, minHeight: 10, maxWidth: 100, maxHeight: 100 });
      const result = c.constrain(new Size(50, 50));
      expect(result.width).toBe(50);
      expect(result.height).toBe(50);
    });

    test('tight constraints always return the tight size', () => {
      const c = BoxConstraints.tight(new Size(80, 24));
      const result = c.constrain(new Size(999, 999));
      expect(result.width).toBe(80);
      expect(result.height).toBe(24);
    });

    test('unconstrained passes through any size', () => {
      const c = new BoxConstraints();
      const result = c.constrain(new Size(500, 300));
      expect(result.width).toBe(500);
      expect(result.height).toBe(300);
    });
  });

  describe('enforce()', () => {
    test('produces intersection of two constraints', () => {
      const inner = new BoxConstraints({ minWidth: 10, maxWidth: 200, minHeight: 5, maxHeight: 100 });
      const outer = new BoxConstraints({ minWidth: 20, maxWidth: 150, minHeight: 10, maxHeight: 80 });
      const result = inner.enforce(outer);
      expect(result.minWidth).toBe(20);
      expect(result.maxWidth).toBe(150);
      expect(result.minHeight).toBe(10);
      expect(result.maxHeight).toBe(80);
    });

    test('enforce with tighter inner constraints', () => {
      const inner = new BoxConstraints({ minWidth: 50, maxWidth: 80, minHeight: 20, maxHeight: 40 });
      const outer = new BoxConstraints({ minWidth: 10, maxWidth: 200, minHeight: 5, maxHeight: 100 });
      const result = inner.enforce(outer);
      expect(result.minWidth).toBe(50);
      expect(result.maxWidth).toBe(80);
      expect(result.minHeight).toBe(20);
      expect(result.maxHeight).toBe(40);
    });

    test('enforce clamps min to outer max when inner min exceeds it', () => {
      const inner = new BoxConstraints({ minWidth: 200, maxWidth: 300 });
      const outer = new BoxConstraints({ minWidth: 0, maxWidth: 100 });
      const result = inner.enforce(outer);
      // inner.minWidth=200 clamped to [0,100] -> 100
      // inner.maxWidth=300 clamped to [0,100] -> 100
      expect(result.minWidth).toBe(100);
      expect(result.maxWidth).toBe(100);
    });
  });

  describe('deflate()', () => {
    test('shrinks constraints by edge insets', () => {
      const c = new BoxConstraints({ minWidth: 20, maxWidth: 100, minHeight: 10, maxHeight: 50 });
      const result = c.deflate({ left: 5, top: 3, right: 5, bottom: 3 });
      expect(result.minWidth).toBe(10);  // 20 - 10
      expect(result.maxWidth).toBe(90);  // 100 - 10
      expect(result.minHeight).toBe(4);  // 10 - 6
      expect(result.maxHeight).toBe(44); // 50 - 6
    });

    test('deflate does not go below zero for min', () => {
      const c = new BoxConstraints({ minWidth: 5, maxWidth: 100, minHeight: 3, maxHeight: 50 });
      const result = c.deflate({ left: 10, top: 10, right: 10, bottom: 10 });
      expect(result.minWidth).toBe(0);   // max(0, 5-20) = 0
      expect(result.maxWidth).toBe(80);  // 100 - 20
      expect(result.minHeight).toBe(0);  // max(0, 3-20) = 0
      expect(result.maxHeight).toBe(30); // 50 - 20
    });

    test('deflate maxWidth does not go below deflated minWidth', () => {
      const c = new BoxConstraints({ minWidth: 0, maxWidth: 10, minHeight: 0, maxHeight: 10 });
      const result = c.deflate({ left: 8, top: 8, right: 8, bottom: 8 });
      // minWidth = max(0, 0-16) = 0
      // maxWidth = max(0, 10-16) = max(0, -6) = 0
      expect(result.minWidth).toBe(0);
      expect(result.maxWidth).toBe(0);
      expect(result.minHeight).toBe(0);
      expect(result.maxHeight).toBe(0);
    });
  });

  describe('queries', () => {
    test('isTight returns true when min equals max', () => {
      expect(BoxConstraints.tight(new Size(80, 24)).isTight).toBe(true);
    });

    test('isTight returns false when not tight', () => {
      expect(new BoxConstraints().isTight).toBe(false);
      expect(BoxConstraints.tightFor({ width: 80 }).isTight).toBe(false);
    });

    test('hasBoundedWidth', () => {
      expect(new BoxConstraints({ maxWidth: 100 }).hasBoundedWidth).toBe(true);
      expect(new BoxConstraints().hasBoundedWidth).toBe(false);
    });

    test('hasBoundedHeight', () => {
      expect(new BoxConstraints({ maxHeight: 50 }).hasBoundedHeight).toBe(true);
      expect(new BoxConstraints().hasBoundedHeight).toBe(false);
    });

    test('isNormalized', () => {
      expect(new BoxConstraints().isNormalized).toBe(true);
      expect(BoxConstraints.tight(new Size(10, 10)).isNormalized).toBe(true);
    });

    test('biggest returns max dimensions', () => {
      const c = new BoxConstraints({ minWidth: 10, maxWidth: 100, minHeight: 5, maxHeight: 50 });
      const biggest = c.biggest;
      expect(biggest.width).toBe(100);
      expect(biggest.height).toBe(50);
    });

    test('smallest returns min dimensions', () => {
      const c = new BoxConstraints({ minWidth: 10, maxWidth: 100, minHeight: 5, maxHeight: 50 });
      const smallest = c.smallest;
      expect(smallest.width).toBe(10);
      expect(smallest.height).toBe(5);
    });
  });

  describe('equals()', () => {
    test('equal constraints', () => {
      const a = new BoxConstraints({ minWidth: 10, minHeight: 5, maxWidth: 100, maxHeight: 50 });
      const b = new BoxConstraints({ minWidth: 10, minHeight: 5, maxWidth: 100, maxHeight: 50 });
      expect(a.equals(b)).toBe(true);
    });

    test('unequal constraints', () => {
      const a = new BoxConstraints({ minWidth: 10 });
      const b = new BoxConstraints({ minWidth: 20 });
      expect(a.equals(b)).toBe(false);
    });

    test('default constraints are equal to each other', () => {
      expect(new BoxConstraints().equals(new BoxConstraints())).toBe(true);
    });

    test('Infinity values are equal', () => {
      const a = new BoxConstraints({ maxWidth: Infinity });
      const b = new BoxConstraints({ maxWidth: Infinity });
      expect(a.equals(b)).toBe(true);
    });
  });

  describe('toString()', () => {
    test('tight constraints', () => {
      const c = BoxConstraints.tight(new Size(80, 24));
      expect(c.toString()).toBe('BoxConstraints.tight(80 x 24)');
    });

    test('general constraints', () => {
      const c = new BoxConstraints({ minWidth: 10, maxWidth: 100, minHeight: 5, maxHeight: 50 });
      expect(c.toString()).toBe('BoxConstraints(w: 10..100, h: 5..50)');
    });

    test('unbounded constraints show Inf', () => {
      const c = new BoxConstraints();
      expect(c.toString()).toBe('BoxConstraints(w: 0..Inf, h: 0..Inf)');
    });
  });

  describe('edge cases with Infinity', () => {
    test('constrain with Infinity max', () => {
      const c = new BoxConstraints();
      const result = c.constrain(new Size(999, 999));
      expect(result.width).toBe(999);
      expect(result.height).toBe(999);
    });

    test('biggest with Infinity', () => {
      const c = new BoxConstraints();
      expect(c.biggest.width).toBe(Infinity);
      expect(c.biggest.height).toBe(Infinity);
    });

    test('enforce with Infinity', () => {
      const inner = new BoxConstraints(); // unconstrained
      const outer = new BoxConstraints({ maxWidth: 100, maxHeight: 50 });
      const result = inner.enforce(outer);
      expect(result.maxWidth).toBe(100);
      expect(result.maxHeight).toBe(50);
    });

    test('loose with Infinity-containing size', () => {
      const c = BoxConstraints.loose(new Size(Infinity, Infinity));
      expect(c.minWidth).toBe(0);
      expect(c.minHeight).toBe(0);
      expect(c.maxWidth).toBe(Infinity);
      expect(c.maxHeight).toBe(Infinity);
    });
  });

  describe('tightForFinite()', () => {
    test('tightens finite width, leaves infinite height unconstrained', () => {
      const c = BoxConstraints.tightForFinite({ width: 80, height: Infinity });
      expect(c.minWidth).toBe(80);
      expect(c.maxWidth).toBe(80);
      expect(c.minHeight).toBe(0);
      expect(c.maxHeight).toBe(Infinity);
    });

    test('tightens finite height, leaves infinite width unconstrained', () => {
      const c = BoxConstraints.tightForFinite({ width: Infinity, height: 24 });
      expect(c.minWidth).toBe(0);
      expect(c.maxWidth).toBe(Infinity);
      expect(c.minHeight).toBe(24);
      expect(c.maxHeight).toBe(24);
    });

    test('tightens both when both are finite', () => {
      const c = BoxConstraints.tightForFinite({ width: 80, height: 24 });
      expect(c.minWidth).toBe(80);
      expect(c.maxWidth).toBe(80);
      expect(c.minHeight).toBe(24);
      expect(c.maxHeight).toBe(24);
      expect(c.isTight).toBe(true);
    });

    test('both Infinity leaves fully unconstrained', () => {
      const c = BoxConstraints.tightForFinite({ width: Infinity, height: Infinity });
      expect(c.minWidth).toBe(0);
      expect(c.maxWidth).toBe(Infinity);
      expect(c.minHeight).toBe(0);
      expect(c.maxHeight).toBe(Infinity);
    });

    test('no args creates unconstrained', () => {
      const c = BoxConstraints.tightForFinite();
      expect(c.minWidth).toBe(0);
      expect(c.maxWidth).toBe(Infinity);
      expect(c.minHeight).toBe(0);
      expect(c.maxHeight).toBe(Infinity);
    });

    test('undefined values leave axis unconstrained', () => {
      const c = BoxConstraints.tightForFinite({ width: 50 });
      expect(c.minWidth).toBe(50);
      expect(c.maxWidth).toBe(50);
      expect(c.minHeight).toBe(0);
      expect(c.maxHeight).toBe(Infinity);
    });
  });

  describe('flipped', () => {
    test('swaps width and height constraints', () => {
      const c = new BoxConstraints({ minWidth: 10, maxWidth: 100, minHeight: 5, maxHeight: 50 });
      const f = c.flipped;
      expect(f.minWidth).toBe(5);
      expect(f.maxWidth).toBe(50);
      expect(f.minHeight).toBe(10);
      expect(f.maxHeight).toBe(100);
    });

    test('flipping twice returns equivalent constraints', () => {
      const c = new BoxConstraints({ minWidth: 10, maxWidth: 100, minHeight: 5, maxHeight: 50 });
      const ff = c.flipped.flipped;
      expect(ff.equals(c)).toBe(true);
    });

    test('flipping tight constraints remains tight', () => {
      const c = BoxConstraints.tight(new Size(80, 24));
      const f = c.flipped;
      expect(f.isTight).toBe(true);
      expect(f.minWidth).toBe(24);
      expect(f.maxWidth).toBe(24);
      expect(f.minHeight).toBe(80);
      expect(f.maxHeight).toBe(80);
    });

    test('flipping preserves Infinity', () => {
      const c = new BoxConstraints({ maxWidth: 100 });
      const f = c.flipped;
      expect(f.minWidth).toBe(0);
      expect(f.maxWidth).toBe(Infinity);
      expect(f.minHeight).toBe(0);
      expect(f.maxHeight).toBe(100);
    });
  });

  describe('widthConstraints()', () => {
    test('preserves width, height becomes unconstrained', () => {
      const c = new BoxConstraints({ minWidth: 10, maxWidth: 100, minHeight: 5, maxHeight: 50 });
      const wc = c.widthConstraints();
      expect(wc.minWidth).toBe(10);
      expect(wc.maxWidth).toBe(100);
      expect(wc.minHeight).toBe(0);
      expect(wc.maxHeight).toBe(Infinity);
    });

    test('already unconstrained height stays unconstrained', () => {
      const c = new BoxConstraints({ minWidth: 20, maxWidth: 80 });
      const wc = c.widthConstraints();
      expect(wc.minWidth).toBe(20);
      expect(wc.maxWidth).toBe(80);
      expect(wc.minHeight).toBe(0);
      expect(wc.maxHeight).toBe(Infinity);
    });
  });

  describe('heightConstraints()', () => {
    test('preserves height, width becomes unconstrained', () => {
      const c = new BoxConstraints({ minWidth: 10, maxWidth: 100, minHeight: 5, maxHeight: 50 });
      const hc = c.heightConstraints();
      expect(hc.minWidth).toBe(0);
      expect(hc.maxWidth).toBe(Infinity);
      expect(hc.minHeight).toBe(5);
      expect(hc.maxHeight).toBe(50);
    });

    test('already unconstrained width stays unconstrained', () => {
      const c = new BoxConstraints({ minHeight: 10, maxHeight: 40 });
      const hc = c.heightConstraints();
      expect(hc.minWidth).toBe(0);
      expect(hc.maxWidth).toBe(Infinity);
      expect(hc.minHeight).toBe(10);
      expect(hc.maxHeight).toBe(40);
    });
  });
});
