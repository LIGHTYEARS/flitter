// Tests for Key system
// Covers: ValueKey equality, UniqueKey uniqueness, GlobalKey (full implementation), toString

import { describe, expect, test, afterEach } from 'bun:test';
import { ValueKey, UniqueKey, GlobalKey, Key } from '../key';

describe('ValueKey', () => {
  test('equal when same value', () => {
    const a = new ValueKey('hello');
    const b = new ValueKey('hello');
    expect(a.equals(b)).toBe(true);
  });

  test('not equal when different value', () => {
    const a = new ValueKey('hello');
    const b = new ValueKey('world');
    expect(a.equals(b)).toBe(false);
  });

  test('not equal when different types (string vs number)', () => {
    const a = new ValueKey<string | number>('42');
    const b = new ValueKey<string | number>(42);
    expect(a.equals(b)).toBe(false);
  });

  test('equal with number values', () => {
    const a = new ValueKey(7);
    const b = new ValueKey(7);
    expect(a.equals(b)).toBe(true);
  });

  test('not equal to UniqueKey', () => {
    const vk = new ValueKey('test');
    const uk = new UniqueKey();
    expect(vk.equals(uk)).toBe(false);
  });

  test('not equal to GlobalKey', () => {
    const vk = new ValueKey('test');
    const gk = new GlobalKey();
    expect(vk.equals(gk)).toBe(false);
  });

  test('stores value', () => {
    const key = new ValueKey('myValue');
    expect(key.value).toBe('myValue');
  });

  test('toString', () => {
    expect(new ValueKey('hello').toString()).toBe('ValueKey(hello)');
    expect(new ValueKey(42).toString()).toBe('ValueKey(42)');
  });
});

describe('UniqueKey', () => {
  test('two instances are not equal', () => {
    const a = new UniqueKey();
    const b = new UniqueKey();
    expect(a.equals(b)).toBe(false);
  });

  test('same instance is equal to itself', () => {
    const a = new UniqueKey();
    expect(a.equals(a)).toBe(true);
  });

  test('has incrementing _id', () => {
    const a = new UniqueKey();
    const b = new UniqueKey();
    expect(b._id).toBe(a._id + 1);
  });

  test('not equal to ValueKey', () => {
    const uk = new UniqueKey();
    const vk = new ValueKey('test');
    expect(uk.equals(vk)).toBe(false);
  });

  test('toString contains id', () => {
    const key = new UniqueKey();
    expect(key.toString()).toBe(`UniqueKey(#${key._id})`);
  });
});

describe('GlobalKey', () => {
  afterEach(() => {
    GlobalKey._clearRegistry();
  });

  describe('constructor', () => {
    test('auto-generates an ID with GlobalKey prefix', () => {
      const key = new GlobalKey();
      expect(key.toString()).toMatch(/^GlobalKey\(GlobalKey_\d+\)$/);
    });

    test('uses debugLabel when provided', () => {
      const key = new GlobalKey('myForm');
      expect(key.toString()).toMatch(/^GlobalKey\(myForm_\d+\)$/);
    });

    test('registers itself in the static registry', () => {
      const key = new GlobalKey('test');
      expect(GlobalKey._registry.get(key._id)).toBe(key);
    });

    test('generates unique IDs for each instance', () => {
      const key1 = new GlobalKey();
      const key2 = new GlobalKey();
      expect(key1._id).not.toBe(key2._id);
    });
  });

  describe('equals', () => {
    test('returns true for the same instance', () => {
      const key = new GlobalKey();
      expect(key.equals(key)).toBe(true);
    });

    test('returns false for different GlobalKey instances', () => {
      const key1 = new GlobalKey();
      const key2 = new GlobalKey();
      expect(key1.equals(key2)).toBe(false);
    });

    test('returns false when compared to a ValueKey', () => {
      const gk = new GlobalKey();
      const vk = new ValueKey('test');
      expect(gk.equals(vk)).toBe(false);
    });

    test('returns false when compared to a UniqueKey', () => {
      const gk = new GlobalKey();
      const uk = new UniqueKey();
      expect(gk.equals(uk)).toBe(false);
    });
  });

  describe('_setElement / _clearElement', () => {
    test('sets and clears the current element', () => {
      const key = new GlobalKey();
      const mockElement = { widget: {} };

      key._setElement(mockElement);
      expect(key.currentElement).toBe(mockElement);

      key._clearElement();
      expect(key.currentElement).toBeUndefined();
    });

    test('throws when setting element twice without clearing', () => {
      const key = new GlobalKey();
      const elem1 = { widget: {} };
      const elem2 = { widget: {} };

      key._setElement(elem1);
      expect(() => key._setElement(elem2)).toThrow(
        /already associated with an element/
      );
    });

    test('removes from static registry on clear', () => {
      const key = new GlobalKey('test');
      const id = key._id;
      key._setElement({ widget: {} });

      expect(GlobalKey._registry.has(id)).toBe(true);
      key._clearElement();
      expect(GlobalKey._registry.has(id)).toBe(false);
    });
  });

  describe('accessors', () => {
    test('currentWidget returns element.widget', () => {
      const key = new GlobalKey();
      const widget = { name: 'TestWidget' };
      key._setElement({ widget });

      expect(key.currentWidget).toBe(widget);
    });

    test('currentWidget returns undefined when no element', () => {
      const key = new GlobalKey();
      expect(key.currentWidget).toBeUndefined();
    });

    test('currentState returns state from StatefulElement', () => {
      const key = new GlobalKey();
      const mockState = { count: 42 };
      key._setElement({ widget: {}, state: mockState });

      expect(key.currentState).toBe(mockState);
    });

    test('currentState returns undefined for non-stateful elements', () => {
      const key = new GlobalKey();
      key._setElement({ widget: {} });

      expect(key.currentState).toBeUndefined();
    });

    test('currentContext returns _context from element', () => {
      const key = new GlobalKey();
      const mockContext = { mounted: true };
      key._setElement({ widget: {}, _context: mockContext });

      expect(key.currentContext).toBe(mockContext);
    });

    test('currentContext returns undefined when no element', () => {
      const key = new GlobalKey();
      expect(key.currentContext).toBeUndefined();
    });
  });

  describe('_clearRegistry', () => {
    test('clears all entries and resets counter', () => {
      new GlobalKey();
      new GlobalKey();
      expect(GlobalKey._registry.size).toBe(2);

      GlobalKey._clearRegistry();
      expect(GlobalKey._registry.size).toBe(0);
      expect(GlobalKey._counter).toBe(0);
    });
  });
});

describe('Key (abstract base)', () => {
  afterEach(() => {
    GlobalKey._clearRegistry();
  });

  test('ValueKey is instanceof Key', () => {
    expect(new ValueKey('x')).toBeInstanceOf(Key);
  });

  test('UniqueKey is instanceof Key', () => {
    expect(new UniqueKey()).toBeInstanceOf(Key);
  });

  test('GlobalKey is instanceof Key', () => {
    expect(new GlobalKey()).toBeInstanceOf(Key);
  });
});
