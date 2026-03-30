// Integration tests for GlobalKey Element lifecycle hooks
// Covers: markMounted registers GlobalKey, unmount deregisters, currentState for stateful,
// duplicate key detection, re-mount after unmount, non-GlobalKey widgets unaffected

import { describe, expect, test, afterEach } from 'bun:test';
import { GlobalKey } from '../../core/key';
import { StatelessElement, StatefulElement } from '../element';
import {
  StatelessWidget,
  StatefulWidget,
  State,
  type BuildContext,
  Widget,
} from '../widget';

// Test helpers

class SimpleWidget extends StatelessWidget {
  build(_context: BuildContext): Widget {
    return this; // self-referential leaf pattern
  }
}

class CounterState extends State<CounterWidget> {
  count = 0;
  build(_context: BuildContext): Widget {
    return new SimpleWidget();
  }
}

class CounterWidget extends StatefulWidget {
  createState() {
    return new CounterState();
  }
}

describe('GlobalKey Element Lifecycle', () => {
  afterEach(() => {
    GlobalKey._clearRegistry();
  });

  test('registers element on markMounted()', () => {
    const key = new GlobalKey('test');
    const widget = new SimpleWidget({ key });
    const element = new StatelessElement(widget);

    element.markMounted();

    expect(key.currentElement).toBe(element);
    expect(key.currentWidget).toBe(widget);
  });

  test('deregisters element on unmount()', () => {
    const key = new GlobalKey('test');
    const widget = new SimpleWidget({ key });
    const element = new StatelessElement(widget);

    element.markMounted();
    expect(key.currentElement).toBe(element);

    element.unmount();
    expect(key.currentElement).toBeUndefined();
    expect(key.currentWidget).toBeUndefined();
  });

  test('provides access to State via currentState for StatefulElement', () => {
    const key = new GlobalKey('counter');
    const widget = new CounterWidget({ key });
    const element = widget.createElement() as StatefulElement;

    // Simulate the mount lifecycle
    element.mount();

    expect(key.currentElement).toBe(element);
    expect(key.currentState).toBeInstanceOf(CounterState);
    expect((key.currentState as CounterState).count).toBe(0);
  });

  test('throws on duplicate GlobalKey mount', () => {
    const key = new GlobalKey('dup');
    const widget1 = new SimpleWidget({ key });
    const widget2 = new SimpleWidget({ key });
    const elem1 = new StatelessElement(widget1);
    const elem2 = new StatelessElement(widget2);

    elem1.markMounted();

    expect(() => elem2.markMounted()).toThrow(
      /already associated with an element/
    );
  });

  test('allows re-mount after unmount with new GlobalKey', () => {
    const key1 = new GlobalKey('reuse');
    const widget1 = new SimpleWidget({ key: key1 });
    const elem1 = new StatelessElement(widget1);

    elem1.markMounted();
    elem1.unmount();

    // After unmount, the key's registry entry is cleared, so create a new key
    const key2 = new GlobalKey('reuse2');
    const widget2 = new SimpleWidget({ key: key2 });
    const elem2 = new StatelessElement(widget2);

    expect(() => elem2.markMounted()).not.toThrow();
    expect(key2.currentElement).toBe(elem2);
  });

  test('does not affect non-GlobalKey widgets', () => {
    const widget = new SimpleWidget(); // no key
    const element = new StatelessElement(widget);

    // Should not throw
    element.markMounted();
    element.unmount();
  });

  test('currentState returns undefined after stateful element unmount', () => {
    const key = new GlobalKey('stateful');
    const widget = new CounterWidget({ key });
    const element = widget.createElement() as StatefulElement;

    element.mount();
    expect(key.currentState).toBeInstanceOf(CounterState);

    element.unmount();
    expect(key.currentState).toBeUndefined();
    expect(key.currentElement).toBeUndefined();
  });

  test('currentWidget returns correct widget for stateless element', () => {
    const key = new GlobalKey('stateless');
    const widget = new SimpleWidget({ key });
    const element = new StatelessElement(widget);

    element.markMounted();

    expect(key.currentWidget).toBe(widget);
    expect(key.currentWidget).toBeInstanceOf(SimpleWidget);
  });

  test('registry is cleaned up properly on unmount', () => {
    const key = new GlobalKey('cleanup');
    const id = key._id;

    // Key starts in the static registry
    expect(GlobalKey._registry.has(id)).toBe(true);

    const widget = new SimpleWidget({ key });
    const element = new StatelessElement(widget);
    element.markMounted();

    // Still in registry
    expect(GlobalKey._registry.has(id)).toBe(true);

    element.unmount();

    // _clearElement removes from registry
    expect(GlobalKey._registry.has(id)).toBe(false);
  });
});
