// Tests for HoverContext InheritedWidget
// Covers: construction, of/maybeOf, updateShouldNotify, nested override, default value

import { describe, it, expect } from 'bun:test';
import { HoverContext } from '../hover-context';
import { StatelessWidget, Widget, BuildContext } from '../../framework/widget';
import { StatelessElement, InheritedElement, BuildContextImpl } from '../../framework/element';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

class DummyLeaf extends StatelessWidget {
  build(_context: BuildContext): Widget {
    return this; // self-referential leaf
  }
}

function buildTree(isHovered: boolean) {
  const leaf = new DummyLeaf();
  const hoverCtx = new HoverContext({ isHovered, child: leaf });

  const hoverElement = hoverCtx.createElement() as InheritedElement;
  hoverElement.mount();

  const leafElement = hoverElement.child!;
  const context = new BuildContextImpl(leafElement, leafElement.widget);
  return { context, hoverElement, leafElement };
}

// ---------------------------------------------------------------------------
// HoverContext
// ---------------------------------------------------------------------------

describe('HoverContext', () => {
  describe('construction', () => {
    it('stores isHovered and child', () => {
      const child = new DummyLeaf();
      const hc = new HoverContext({ isHovered: true, child });
      expect(hc.isHovered).toBe(true);
      expect(hc.child).toBe(child);
    });

    it('stores false value', () => {
      const child = new DummyLeaf();
      const hc = new HoverContext({ isHovered: false, child });
      expect(hc.isHovered).toBe(false);
    });

    it('accepts an optional key', () => {
      const { ValueKey } = require('../../core/key');
      const child = new DummyLeaf();
      const hc = new HoverContext({
        isHovered: true,
        child,
        key: new ValueKey('hover'),
      });
      expect(hc.key).toBeDefined();
    });
  });

  // ---------------------------------------------------------------------------
  // updateShouldNotify
  // ---------------------------------------------------------------------------

  describe('updateShouldNotify', () => {
    it('returns false when isHovered is unchanged (both true)', () => {
      const child = new DummyLeaf();
      const a = new HoverContext({ isHovered: true, child });
      const b = new HoverContext({ isHovered: true, child });
      expect(b.updateShouldNotify(a)).toBe(false);
    });

    it('returns false when isHovered is unchanged (both false)', () => {
      const child = new DummyLeaf();
      const a = new HoverContext({ isHovered: false, child });
      const b = new HoverContext({ isHovered: false, child });
      expect(b.updateShouldNotify(a)).toBe(false);
    });

    it('returns true when isHovered changes from false to true', () => {
      const child = new DummyLeaf();
      const a = new HoverContext({ isHovered: false, child });
      const b = new HoverContext({ isHovered: true, child });
      expect(b.updateShouldNotify(a)).toBe(true);
    });

    it('returns true when isHovered changes from true to false', () => {
      const child = new DummyLeaf();
      const a = new HoverContext({ isHovered: true, child });
      const b = new HoverContext({ isHovered: false, child });
      expect(b.updateShouldNotify(a)).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // createElement
  // ---------------------------------------------------------------------------

  describe('createElement', () => {
    it('creates an InheritedElement', () => {
      const child = new DummyLeaf();
      const hc = new HoverContext({ isHovered: true, child });
      const element = hc.createElement();
      expect(element).toBeInstanceOf(InheritedElement);
      expect(element.widget).toBe(hc);
    });
  });

  // ---------------------------------------------------------------------------
  // static of / maybeOf
  // ---------------------------------------------------------------------------

  describe('static of / maybeOf', () => {
    it('HoverContext.of() returns true when hovered', () => {
      const { context } = buildTree(true);
      expect(HoverContext.of(context)).toBe(true);
    });

    it('HoverContext.of() returns false when not hovered', () => {
      const { context } = buildTree(false);
      expect(HoverContext.of(context)).toBe(false);
    });

    it('HoverContext.of() returns false (default) when no ancestor exists', () => {
      const leaf = new DummyLeaf();
      const leafElement = leaf.createElement() as StatelessElement;
      const context = new BuildContextImpl(leafElement, leaf);
      // No HoverContext ancestor — should default to false
      expect(HoverContext.of(context)).toBe(false);
    });

    it('HoverContext.maybeOf() returns undefined when no ancestor exists', () => {
      const leaf = new DummyLeaf();
      const leafElement = leaf.createElement() as StatelessElement;
      const context = new BuildContextImpl(leafElement, leaf);
      expect(HoverContext.maybeOf(context)).toBeUndefined();
    });

    it('registers dependency on the InheritedElement', () => {
      const { context, hoverElement } = buildTree(true);
      const dependents = (hoverElement as any)._dependents as Set<any>;

      // Trigger dependency
      HoverContext.of(context);

      expect(dependents.size).toBeGreaterThan(0);
    });
  });

  // ---------------------------------------------------------------------------
  // Nested override
  // ---------------------------------------------------------------------------

  describe('nested HoverContext override', () => {
    it('inner HoverContext overrides outer', () => {
      const leaf = new DummyLeaf();
      const inner = new HoverContext({ isHovered: true, child: leaf });
      const outer = new HoverContext({ isHovered: false, child: inner });

      const outerElement = outer.createElement() as InheritedElement;
      outerElement.mount();

      const innerElement = outerElement.child! as InheritedElement;
      const leafElement = innerElement.child!;

      const context = new BuildContextImpl(leafElement, leafElement.widget);
      // Inner is true even though outer is false
      expect(HoverContext.of(context)).toBe(true);
    });

    it('outer value accessible when inner is not present', () => {
      // Just the outer wrapping the leaf directly
      const { context } = buildTree(true);
      expect(HoverContext.of(context)).toBe(true);
    });
  });
});
