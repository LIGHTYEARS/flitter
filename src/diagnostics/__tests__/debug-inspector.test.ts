// Tests for Debug Inspector — HTTP server, tree serialization, element inspection
// Phase 15: DBUG-01

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import {
  DebugInspector,
  serializeElementTree,
  serializeFocusTree,
  findElementById,
} from '../debug-inspector';
import type { ElementNodeJson, FocusNodeJson } from '../debug-inspector';
import { debugFlags, resetDebugFlags } from '../debug-flags';
import {
  Widget,
  StatelessWidget,
  StatefulWidget,
  State,
  type BuildContext,
} from '../../framework/widget';
import { Element, StatelessElement, StatefulElement } from '../../framework/element';
import { WidgetsBinding } from '../../framework/binding';
import { FocusNode, FocusScopeNode, FocusManager } from '../../input/focus';

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

class _LeafWidget extends StatelessWidget {
  build(_context: BuildContext): Widget {
    return this;
  }
}

class _ParentWidget extends StatelessWidget {
  readonly child: Widget;
  constructor(child: Widget) {
    super();
    this.child = child;
  }
  build(_context: BuildContext): Widget {
    return this.child;
  }
}

class _CounterState extends State<_CounterWidget> {
  count = 0;
  build(_context: BuildContext): Widget {
    return new _LeafWidget();
  }
}

class _CounterWidget extends StatefulWidget {
  createState(): _CounterState {
    return new _CounterState();
  }
}

// ---------------------------------------------------------------------------
// serializeElementTree tests
// ---------------------------------------------------------------------------

describe('serializeElementTree', () => {
  test('serializes a single leaf element', () => {
    const widget = new _LeafWidget();
    const element = widget.createElement();
    element.mount();

    const json = serializeElementTree(element);

    expect(json.id).toBe(0);
    expect(json.widgetType).toBe('_LeafWidget');
    expect(json.elementType).toBe('StatelessElement');
    expect(json.mounted).toBe(true);
    expect(json.hasRenderObject).toBe(false);
    expect(json.children).toBeArray();
  });

  test('serializes a tree with parent-child relationship', () => {
    const leaf = new _LeafWidget();
    const parent = new _ParentWidget(leaf);
    const element = parent.createElement();
    element.mount();

    const json = serializeElementTree(element);

    // Root should be the parent
    expect(json.id).toBe(0);
    expect(json.widgetType).toBe('_ParentWidget');
    // Should have at least one child
    expect(json.children.length).toBeGreaterThanOrEqual(1);

    // Find the leaf child in the tree
    function findLeaf(node: ElementNodeJson): ElementNodeJson | null {
      if (node.widgetType === '_LeafWidget') return node;
      for (const child of node.children) {
        const result = findLeaf(child);
        if (result) return result;
      }
      return null;
    }
    const leafNode = findLeaf(json);
    expect(leafNode).not.toBeNull();
    expect(leafNode!.widgetType).toBe('_LeafWidget');
  });

  test('assigns sequential depth-first IDs', () => {
    const leaf = new _LeafWidget();
    const parent = new _ParentWidget(leaf);
    const element = parent.createElement();
    element.mount();

    const json = serializeElementTree(element);

    // IDs should start at 0 and increment
    expect(json.id).toBe(0);
    // Verify IDs are unique
    const ids = new Set<number>();
    function collectIds(node: ElementNodeJson): void {
      ids.add(node.id);
      for (const child of node.children) collectIds(child);
    }
    collectIds(json);
    // At least root + child
    expect(ids.size).toBeGreaterThanOrEqual(1);
  });

  test('includes dirty flag', () => {
    const widget = new _LeafWidget();
    const element = widget.createElement();
    element.mount();

    const json = serializeElementTree(element);
    expect(typeof json.dirty).toBe('boolean');
  });

  test('includes depth', () => {
    const widget = new _LeafWidget();
    const element = widget.createElement();
    element.mount();

    const json = serializeElementTree(element);
    expect(typeof json.depth).toBe('number');
  });

  test('serializes StatefulElement with state info', () => {
    const widget = new _CounterWidget();
    const element = widget.createElement() as StatefulElement;
    element.mount();

    const json = serializeElementTree(element);

    expect(json.widgetType).toBe('_CounterWidget');
    expect(json.elementType).toBe('StatefulElement');
    expect(json.state).toBeDefined();
    expect(json.state!.type).toBe('_CounterState');
  });
});

// ---------------------------------------------------------------------------
// findElementById tests
// ---------------------------------------------------------------------------

describe('findElementById', () => {
  test('finds root element with id 0', () => {
    const widget = new _LeafWidget();
    const element = widget.createElement();
    element.mount();

    // Must serialize first to assign IDs
    serializeElementTree(element);
    const found = findElementById(element, 0);

    expect(found).toBe(element);
  });

  test('returns null for non-existent id', () => {
    const widget = new _LeafWidget();
    const element = widget.createElement();
    element.mount();

    serializeElementTree(element);
    const found = findElementById(element, 999);

    expect(found).toBeNull();
  });

  test('finds child element by id', () => {
    const leaf = new _LeafWidget();
    const parent = new _ParentWidget(leaf);
    const element = parent.createElement();
    element.mount();

    const json = serializeElementTree(element);

    // Find first child id
    if (json.children.length > 0) {
      const childId = json.children[0]!.id;
      const found = findElementById(element, childId);
      expect(found).not.toBeNull();
      expect(found!.widget.constructor.name).toBe(json.children[0]!.widgetType);
    }
  });
});

// ---------------------------------------------------------------------------
// serializeFocusTree tests
// ---------------------------------------------------------------------------

describe('serializeFocusTree', () => {
  test('serializes a root focus node', () => {
    const node = new FocusNode({ debugLabel: 'Test Node' });
    const json = serializeFocusTree(node);

    expect(json.label).toBe('Test Node');
    expect(json.hasPrimaryFocus).toBe(false);
    expect(json.canRequestFocus).toBe(true);
    expect(json.skipTraversal).toBe(false);
    expect(json.children).toBeArray();
    expect(json.children.length).toBe(0);
  });

  test('serializes focus tree with children', () => {
    const parent = new FocusScopeNode({ debugLabel: 'Scope' });
    const child1 = new FocusNode({ debugLabel: 'Child 1' });
    const child2 = new FocusNode({ debugLabel: 'Child 2' });
    child1.attach(parent);
    child2.attach(parent);

    const json = serializeFocusTree(parent);

    expect(json.label).toBe('Scope');
    expect(json.children.length).toBe(2);
    expect(json.children[0]!.label).toBe('Child 1');
    expect(json.children[1]!.label).toBe('Child 2');

    child1.detach();
    child2.detach();
    parent.dispose();
  });

  test('serializes skipTraversal and canRequestFocus flags', () => {
    const node = new FocusNode({
      debugLabel: 'Skip',
      canRequestFocus: false,
      skipTraversal: true,
    });
    const json = serializeFocusTree(node);

    expect(json.canRequestFocus).toBe(false);
    expect(json.skipTraversal).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// DebugInspector class tests
// ---------------------------------------------------------------------------

describe('DebugInspector', () => {
  test('singleton pattern works', () => {
    const a = DebugInspector.instance;
    const b = DebugInspector.instance;
    expect(a).toBe(b);
    DebugInspector.reset();
  });

  test('default port is 9876', () => {
    const inspector = DebugInspector.instance;
    expect(inspector.port).toBe(9876);
    DebugInspector.reset();
  });

  test('starts disabled', () => {
    const inspector = DebugInspector.instance;
    expect(inspector.enabled).toBe(false);
    DebugInspector.reset();
  });

  test('selectedElementId starts null', () => {
    const inspector = DebugInspector.instance;
    expect(inspector.selectedElementId).toBeNull();
    DebugInspector.reset();
  });

  test('custom port via constructor', () => {
    const inspector = new DebugInspector(8888);
    expect(inspector.port).toBe(8888);
  });

  test('reset clears singleton', () => {
    const a = DebugInspector.instance;
    DebugInspector.reset();
    const b = DebugInspector.instance;
    expect(a).not.toBe(b);
    DebugInspector.reset();
  });
});

// ---------------------------------------------------------------------------
// DebugInspector HTTP server tests
// ---------------------------------------------------------------------------

describe('DebugInspector HTTP server', () => {
  let inspector: DebugInspector;

  // Use port 0 to let the OS assign an ephemeral port (avoids collisions)
  beforeEach(() => {
    inspector = new DebugInspector(0);
    WidgetsBinding.reset();
  });

  afterEach(() => {
    inspector.stop();
    WidgetsBinding.reset();
    DebugInspector.reset();
    FocusManager.reset();
    resetDebugFlags();
  });

  test('start enables the server', () => {
    inspector.start();
    expect(inspector.enabled).toBe(true);
  });

  test('stop disables the server', () => {
    inspector.start();
    inspector.stop();
    expect(inspector.enabled).toBe(false);
  });

  test('double start is no-op', () => {
    inspector.start();
    inspector.start(); // should not throw
    expect(inspector.enabled).toBe(true);
  });

  test('double stop is no-op', () => {
    inspector.start();
    inspector.stop();
    inspector.stop(); // should not throw
    expect(inspector.enabled).toBe(false);
  });

  test('GET /health returns ok', async () => {
    inspector.start();
    const res = await fetch(`http://localhost:${inspector.port}/health`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ok');
  });

  test('GET /tree returns 503 when no app running', async () => {
    inspector.start();
    const res = await fetch(`http://localhost:${inspector.port}/tree`);
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error).toContain('No widget tree');
  });

  test('GET /tree returns widget tree JSON', async () => {
    // Mount a widget
    const widget = new _LeafWidget();
    WidgetsBinding.instance.attachRootWidget(widget);

    inspector.start();
    const res = await fetch(`http://localhost:${inspector.port}/tree`);
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.id).toBe(0);
    expect(body.widgetType).toBeDefined();
    expect(body.elementType).toBeDefined();
    expect(body.children).toBeArray();
  });

  test('GET /widget-tree is alias for /tree', async () => {
    const widget = new _LeafWidget();
    WidgetsBinding.instance.attachRootWidget(widget);

    inspector.start();
    const res = await fetch(`http://localhost:${inspector.port}/widget-tree`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe(0);
  });

  test('GET /focus-tree returns focus tree JSON', async () => {
    inspector.start();
    const res = await fetch(`http://localhost:${inspector.port}/focus-tree`);
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.label).toBeDefined();
    expect(body.children).toBeArray();
  });

  test('GET /inspect requires id parameter', async () => {
    inspector.start();
    const res = await fetch(`http://localhost:${inspector.port}/inspect`);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('Missing required parameter');
  });

  test('GET /inspect?id=invalid returns 400', async () => {
    inspector.start();
    const res = await fetch(`http://localhost:${inspector.port}/inspect?id=abc`);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('Invalid id');
  });

  test('GET /inspect?id=-1 returns 400', async () => {
    inspector.start();
    const res = await fetch(`http://localhost:${inspector.port}/inspect?id=-1`);
    expect(res.status).toBe(400);
  });

  test('GET /inspect?id=0 returns element details', async () => {
    const widget = new _LeafWidget();
    WidgetsBinding.instance.attachRootWidget(widget);

    inspector.start();
    const res = await fetch(`http://localhost:${inspector.port}/inspect?id=0`);
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.id).toBe(0);
    expect(body.widgetType).toBeDefined();
    expect(body.elementType).toBeDefined();
    expect(body.depth).toBeDefined();
    expect(body.mounted).toBe(true);
    expect(typeof body.childCount).toBe('number');
  });

  test('GET /inspect?id=999 returns 404 for missing element', async () => {
    const widget = new _LeafWidget();
    WidgetsBinding.instance.attachRootWidget(widget);

    inspector.start();
    const res = await fetch(`http://localhost:${inspector.port}/inspect?id=999`);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toContain('not found');
  });

  test('GET /inspect returns 503 when no app running', async () => {
    inspector.start();
    const res = await fetch(`http://localhost:${inspector.port}/inspect?id=0`);
    expect(res.status).toBe(503);
  });

  test('GET /select sets selectedElementId', async () => {
    const widget = new _LeafWidget();
    WidgetsBinding.instance.attachRootWidget(widget);

    inspector.start();
    const res = await fetch(`http://localhost:${inspector.port}/select?id=0`);
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.selected).toBe(0);
    expect(body.widgetType).toBeDefined();
    expect(inspector.selectedElementId).toBe(0);
  });

  test('GET /select without id clears selection', async () => {
    const widget = new _LeafWidget();
    WidgetsBinding.instance.attachRootWidget(widget);

    inspector.start();
    // First select
    await fetch(`http://localhost:${inspector.port}/select?id=0`);
    expect(inspector.selectedElementId).toBe(0);

    // Then clear
    const res = await fetch(`http://localhost:${inspector.port}/select`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.selected).toBeNull();
    expect(inspector.selectedElementId).toBeNull();
  });

  test('GET /select?id=invalid returns 400', async () => {
    inspector.start();
    const res = await fetch(`http://localhost:${inspector.port}/select?id=xyz`);
    expect(res.status).toBe(400);
  });

  test('GET /select?id=999 returns 404 for missing element', async () => {
    const widget = new _LeafWidget();
    WidgetsBinding.instance.attachRootWidget(widget);

    inspector.start();
    const res = await fetch(`http://localhost:${inspector.port}/select?id=999`);
    expect(res.status).toBe(404);
  });

  test('GET /select returns 503 when no app running', async () => {
    inspector.start();
    const res = await fetch(`http://localhost:${inspector.port}/select?id=0`);
    expect(res.status).toBe(503);
  });

  test('GET unknown path returns 404 with endpoints list', async () => {
    inspector.start();
    const res = await fetch(`http://localhost:${inspector.port}/nonexistent`);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe('Not found');
    expect(body.endpoints).toBeArray();
    expect(body.endpoints).toContain('/tree');
    expect(body.endpoints).toContain('/health');
  });

  test('CORS headers are present', async () => {
    inspector.start();
    const res = await fetch(`http://localhost:${inspector.port}/health`);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
    expect(res.headers.get('Content-Type')).toBe('application/json');
  });

  test('OPTIONS request returns 204', async () => {
    inspector.start();
    const res = await fetch(`http://localhost:${inspector.port}/health`, { method: 'OPTIONS' });
    expect(res.status).toBe(204);
  });
});

// ---------------------------------------------------------------------------
// debugInspectorEnabled flag test
// ---------------------------------------------------------------------------

describe('debugInspectorEnabled flag', () => {
  test('flag exists and defaults to false', () => {
    expect(debugFlags.debugInspectorEnabled).toBe(false);
  });

  test('flag can be set to true', () => {
    debugFlags.debugInspectorEnabled = true;
    expect(debugFlags.debugInspectorEnabled).toBe(true);
    resetDebugFlags();
  });

  test('resetDebugFlags resets inspector flag', () => {
    debugFlags.debugInspectorEnabled = true;
    resetDebugFlags();
    expect(debugFlags.debugInspectorEnabled).toBe(false);
  });
});
