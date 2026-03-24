// Debug Inspector — HTTP server for inspecting widget/element/render trees
// Amp ref: Mu (debug inspector server), amp-strings.txt
// Reference: .reference/element-tree.md Section 16
//
// Provides HTTP endpoints on port 9876 for developer tools:
//   GET /tree         -> JSON snapshot of widget/element tree
//   GET /focus-tree   -> JSON snapshot of focus tree
//   GET /inspect?id=N -> Detailed info for a specific element by depth-first index
//   GET /select?id=N  -> Mark an element as selected (highlight for debugging)
//   GET /health       -> { status: "ok" }
//   GET /keystrokes   -> Recent keystroke history

import { WidgetsBinding } from '../framework/binding';
import { Element, StatefulElement, StatelessElement, InheritedElement } from '../framework/element';
import { RenderBox, RenderObject } from '../framework/render-object';
import { FocusNode, FocusManager } from '../input/focus';

// ---------------------------------------------------------------------------
// Serialization types
// ---------------------------------------------------------------------------

/** JSON representation of a widget/element node in the tree. */
export interface ElementNodeJson {
  id: number;
  widgetType: string;
  elementType: string;
  depth: number;
  dirty: boolean;
  mounted: boolean;
  key?: string;
  hasRenderObject: boolean;
  renderObject?: RenderObjectJson;
  state?: Record<string, unknown>;
  children: ElementNodeJson[];
}

/** JSON representation of a render object. */
export interface RenderObjectJson {
  type: string;
  needsLayout: boolean;
  needsPaint: boolean;
  size?: { width: number; height: number };
  offset?: { x: number; y: number };
}

/** JSON representation of a focus tree node. */
export interface FocusNodeJson {
  label?: string;
  hasPrimaryFocus: boolean;
  canRequestFocus: boolean;
  skipTraversal: boolean;
  children: FocusNodeJson[];
}

// ---------------------------------------------------------------------------
// Stable element ID tracking (Amp ref: Mu stable IDs via WeakMap)
// ---------------------------------------------------------------------------

/**
 * WeakMap from Element to a stable integer ID.
 * Unlike depth-first IDs which change on every tree mutation,
 * stable IDs persist as long as the Element instance is alive.
 *
 * Amp ref: Mu uses WeakMap for stable element identity across tree snapshots
 */
let _stableIdMap = new WeakMap<Element, number>();
let _nextStableId = 0;

/**
 * Get or assign a stable ID for an element.
 * Once assigned, the ID persists for the lifetime of the Element instance.
 */
function getStableId(element: Element): number {
  let id = _stableIdMap.get(element);
  if (id === undefined) {
    id = _nextStableId++;
    _stableIdMap.set(element, id);
  }
  return id;
}

/**
 * Reset stable IDs completely (for tests).
 * Replaces the WeakMap AND resets the counter so IDs restart from 0
 * with no stale references.
 */
export function resetStableIds(): void {
  _stableIdMap = new WeakMap<Element, number>();
  _nextStableId = 0;
}

// ---------------------------------------------------------------------------
// Render object to element reverse map (Amp ref: Mu.renderObjectToElementMap)
// ---------------------------------------------------------------------------

/**
 * Build a reverse lookup map from RenderObject to its owning Element.
 * Traverses the element tree and collects all element→renderObject associations.
 *
 * Amp ref: Mu.renderObjectToElementMap — reverse lookup for click-to-inspect
 */
export function buildRenderObjectToElementMap(root: Element): Map<RenderObject, Element> {
  const map = new Map<RenderObject, Element>();

  function walk(element: Element): void {
    const ro = element.renderObject;
    if (ro) {
      map.set(ro, element);
    }
    element.visitChildren((child: Element) => {
      walk(child);
    });
  }

  walk(root);
  return map;
}

// ---------------------------------------------------------------------------
// Tree serialization
// ---------------------------------------------------------------------------

/**
 * Serialize an Element and its subtree to JSON.
 * Assigns depth-first IDs for /inspect and /select lookups.
 * Also assigns stable IDs via WeakMap for persistent identification.
 *
 * Uses a closure-local counter to avoid module-level mutable state that
 * could be corrupted by concurrent serialization calls.
 */
export function serializeElementTree(element: Element): ElementNodeJson {
  let nextId = 0;

  function serialize(el: Element): ElementNodeJson {
    const id = nextId++;
    const widget = el.widget;

    // Also assign stable ID (side effect)
    getStableId(el);

    const node: ElementNodeJson = {
      id,
      widgetType: widget.constructor.name,
      elementType: el.constructor.name,
      depth: el.depth,
      dirty: el.dirty,
      mounted: el.mounted,
      hasRenderObject: el.renderObject !== undefined,
      children: [],
    };

    // Key
    if (widget.key !== undefined) {
      node.key = widget.key.toString();
    }

    // Render object info
    const ro = el.renderObject;
    if (ro) {
      const roJson: RenderObjectJson = {
        type: ro.constructor.name,
        needsLayout: ro.needsLayout,
        needsPaint: ro.needsPaint,
      };
      if (ro instanceof RenderBox) {
        roJson.size = { width: ro.size.width, height: ro.size.height };
        roJson.offset = { x: ro.offset.col, y: ro.offset.row };
      }
      node.renderObject = roJson;
    }

    // State info for StatefulElements
    if (el instanceof StatefulElement && el.state) {
      node.state = { type: el.state.constructor.name };
    }

    // Children
    el.visitChildren((child: Element) => {
      node.children.push(serialize(child));
    });

    return node;
  }

  return serialize(element);
}

/**
 * Find an element by depth-first ID in the tree.
 */
export function findElementById(root: Element, targetId: number): Element | null {
  let currentId = 0;

  function search(element: Element): Element | null {
    if (currentId === targetId) return element;
    currentId++;
    for (const child of element.children) {
      const result = search(child);
      if (result) return result;
    }
    return null;
  }

  return search(root);
}

/**
 * Serialize a FocusNode tree to JSON.
 */
export function serializeFocusTree(node: FocusNode): FocusNodeJson {
  return {
    label: node.debugLabel,
    hasPrimaryFocus: node.hasPrimaryFocus,
    canRequestFocus: node.canRequestFocus,
    skipTraversal: node.skipTraversal,
    children: node.children.map(child => serializeFocusTree(child)),
  };
}

// ---------------------------------------------------------------------------
// Keystroke history entry
// ---------------------------------------------------------------------------

/** A recorded keystroke for the debug inspector history. */
export interface KeystrokeEntry {
  key: string;
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  timestamp: number;
}

// ---------------------------------------------------------------------------
// Ring buffer for keystroke history — O(1) push/eviction
// ---------------------------------------------------------------------------

class RingBuffer<T> {
  private _buf: (T | undefined)[];
  private _head: number = 0;
  private _size: number = 0;
  private readonly _capacity: number;

  constructor(capacity: number) {
    this._capacity = capacity;
    this._buf = new Array(capacity);
  }

  get length(): number {
    return this._size;
  }

  push(item: T): void {
    const idx = (this._head + this._size) % this._capacity;
    if (this._size === this._capacity) {
      // Overwrite oldest, advance head
      this._buf[this._head] = item;
      this._head = (this._head + 1) % this._capacity;
    } else {
      this._buf[idx] = item;
      this._size++;
    }
  }

  /** Return items in insertion order (oldest first). */
  toArray(): T[] {
    const result: T[] = [];
    for (let i = 0; i < this._size; i++) {
      result.push(this._buf[(this._head + i) % this._capacity]!);
    }
    return result;
  }

  clear(): void {
    this._buf = new Array(this._capacity);
    this._head = 0;
    this._size = 0;
  }
}

// ---------------------------------------------------------------------------
// DebugInspector (Amp: Mu)
// ---------------------------------------------------------------------------

/**
 * Debug inspector HTTP server.
 * Exposes widget tree, focus tree, element inspection, and keystroke history over HTTP.
 *
 * Features (Amp ref: class Mu):
 * - Periodic tree scanning at 1s interval for live dev tools
 * - Keystroke history ring buffer (last 100 entries, O(1) push)
 * - Stable element IDs via WeakMap for persistent identification
 * - RenderObject → Element reverse lookup map
 *
 * Amp ref: class Mu, amp-strings.txt — runs on http://localhost:9876
 */
export class DebugInspector {
  private static _instance: DebugInspector | null = null;

  private _server: any = null;
  private _port: number;
  private _enabled: boolean = false;
  private _selectedElementId: number | null = null;

  // --- Periodic scanning (Amp ref: Mu periodic scan at 1s interval) ---
  private _scanTimer: ReturnType<typeof setInterval> | null = null;
  private _lastTreeSnapshot: ElementNodeJson | null = null;

  // --- Keystroke history (Amp ref: Mu keystroke history buffer) ---
  static readonly MAX_KEYSTROKE_HISTORY = 100;
  private _keystrokeHistory: RingBuffer<KeystrokeEntry> = new RingBuffer(DebugInspector.MAX_KEYSTROKE_HISTORY);

  // --- RenderObject to Element map (Amp ref: Mu.renderObjectToElementMap) ---
  private _renderObjectToElementMap: Map<RenderObject, Element> = new Map();

  constructor(port: number = 9876) {
    this._port = port;
  }

  /** The port the server is listening on (actual port, may differ from requested if 0 was passed). */
  get port(): number {
    if (this._server && typeof this._server.port === 'number') {
      return this._server.port;
    }
    return this._port;
  }

  static get instance(): DebugInspector {
    if (!DebugInspector._instance) {
      DebugInspector._instance = new DebugInspector();
    }
    return DebugInspector._instance;
  }

  static reset(): void {
    if (DebugInspector._instance) {
      DebugInspector._instance.stop();
    }
    DebugInspector._instance = null;
    resetStableIds();
  }

  get enabled(): boolean {
    return this._enabled;
  }

  get selectedElementId(): number | null {
    return this._selectedElementId;
  }

  /** The last periodic tree snapshot, or null if no scan has run yet. */
  get lastTreeSnapshot(): ElementNodeJson | null {
    return this._lastTreeSnapshot;
  }

  /** The keystroke history buffer (most recent last). */
  get keystrokeHistory(): readonly KeystrokeEntry[] {
    return this._keystrokeHistory.toArray();
  }

  /** The current renderObject→element reverse map. */
  get renderObjectToElementMap(): ReadonlyMap<RenderObject, Element> {
    return this._renderObjectToElementMap;
  }

  /**
   * Record a keystroke in the history ring buffer.
   * O(1) push — no Array.shift() overhead.
   *
   * Amp ref: Mu.recordKeystroke()
   */
  recordKeystroke(entry: KeystrokeEntry): void {
    this._keystrokeHistory.push(entry);
  }

  /**
   * Start the debug inspector HTTP server.
   * Also starts periodic tree scanning at 1s interval.
   * Uses Bun.serve() for the HTTP server.
   */
  start(): void {
    if (this._enabled) return;
    this._enabled = true;

    try {
      this._server = Bun.serve({
        port: this._port,
        fetch: (req: Request) => this._handleRequest(req),
      });
    } catch (_e) {
      // Server creation failed (e.g., port in use) — mark as not enabled
      this._enabled = false;
      throw _e;
    }

    // Start periodic scanning (Amp ref: Mu scans tree every 1s)
    this._startPeriodicScan();
  }

  /**
   * Stop the debug inspector HTTP server.
   */
  stop(): void {
    if (!this._enabled) return;
    this._enabled = false;
    this._stopPeriodicScan();
    if (this._server) {
      this._server.stop();
      this._server = null;
    }
    this._selectedElementId = null;
    this._lastTreeSnapshot = null;
    this._keystrokeHistory.clear();
    this._renderObjectToElementMap.clear();
  }

  /**
   * Start periodic tree scanning at 1s interval.
   * Updates the cached tree snapshot and renderObject→element map.
   *
   * Amp ref: Mu periodic scan — keeps dev tools snapshot fresh
   */
  private _startPeriodicScan(): void {
    if (this._scanTimer) return;
    this._scanTimer = setInterval(() => {
      this._performScan();
    }, 1000);
  }

  /**
   * Stop periodic tree scanning.
   */
  private _stopPeriodicScan(): void {
    if (this._scanTimer) {
      clearInterval(this._scanTimer);
      this._scanTimer = null;
    }
  }

  /**
   * Perform one scan: serialize tree + build reverse map.
   */
  private _performScan(): void {
    try {
      const root = WidgetsBinding.instance.rootElement;
      if (!root) return;
      this._lastTreeSnapshot = serializeElementTree(root);
      this._renderObjectToElementMap = buildRenderObjectToElementMap(root);
    } catch (_e) {
      // Ignore scan errors (tree may be in inconsistent state during rebuild)
    }
  }

  /**
   * Handle an incoming HTTP request.
   * Routes to appropriate endpoint handler.
   */
  private _handleRequest(req: Request): Response {
    const url = new URL(req.url);
    const path = url.pathname;

    // CORS headers for dev tools
    const headers = {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers });
    }

    try {
      switch (path) {
        case '/tree':
        case '/widget-tree':
          return this._handleTree(headers);
        case '/focus-tree':
          return this._handleFocusTree(headers);
        case '/inspect':
          return this._handleInspect(url, headers);
        case '/select':
          return this._handleSelect(url, headers);
        case '/keystrokes':
          return this._handleKeystrokes(headers);
        case '/health':
          return new Response(JSON.stringify({ status: 'ok' }), { headers });
        default:
          return new Response(
            JSON.stringify({ error: 'Not found', endpoints: ['/tree', '/focus-tree', '/inspect', '/select', '/keystrokes', '/health'] }),
            { status: 404, headers },
          );
      }
    } catch (e: any) {
      return new Response(
        JSON.stringify({ error: e.message || 'Internal server error' }),
        { status: 500, headers },
      );
    }
  }

  /**
   * GET /tree — Returns full widget/element tree as JSON.
   */
  private _handleTree(headers: Record<string, string>): Response {
    const root = WidgetsBinding.instance.rootElement;
    if (!root) {
      return new Response(
        JSON.stringify({ error: 'No widget tree — app not running' }),
        { status: 503, headers },
      );
    }
    const tree = serializeElementTree(root);
    return new Response(JSON.stringify(tree, null, 2), { headers });
  }

  /**
   * GET /focus-tree — Returns focus tree as JSON.
   */
  private _handleFocusTree(headers: Record<string, string>): Response {
    const rootScope = FocusManager.instance.rootScope;
    const tree = serializeFocusTree(rootScope);
    return new Response(JSON.stringify(tree, null, 2), { headers });
  }

  /**
   * GET /inspect?id=N — Returns detailed info for element at depth-first index N.
   */
  private _handleInspect(url: URL, headers: Record<string, string>): Response {
    const idParam = url.searchParams.get('id');
    if (idParam === null) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameter: id' }),
        { status: 400, headers },
      );
    }

    const id = parseInt(idParam, 10);
    if (isNaN(id) || id < 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid id parameter — must be a non-negative integer' }),
        { status: 400, headers },
      );
    }

    const root = WidgetsBinding.instance.rootElement;
    if (!root) {
      return new Response(
        JSON.stringify({ error: 'No widget tree — app not running' }),
        { status: 503, headers },
      );
    }

    const element = findElementById(root, id);
    if (!element) {
      return new Response(
        JSON.stringify({ error: `Element with id ${id} not found` }),
        { status: 404, headers },
      );
    }

    // Build detailed inspection result
    const detail: Record<string, unknown> = {
      id,
      stableId: getStableId(element),
      widgetType: element.widget.constructor.name,
      elementType: element.constructor.name,
      depth: element.depth,
      dirty: element.dirty,
      mounted: element.mounted,
      childCount: element.children.length,
    };

    if (element.widget.key !== undefined) {
      detail.key = element.widget.key.toString();
    }

    // Widget-specific info
    if (element instanceof StatefulElement && element.state) {
      detail.state = {
        type: element.state.constructor.name,
        mounted: element.state.mounted,
      };
    }

    // Render object detail
    const ro = element.renderObject;
    if (ro) {
      const roDetail: Record<string, unknown> = {
        type: ro.constructor.name,
        needsLayout: ro.needsLayout,
        needsPaint: ro.needsPaint,
        attached: ro.attached,
      };
      if (ro instanceof RenderBox) {
        roDetail.size = { width: ro.size.width, height: ro.size.height };
        roDetail.offset = { x: ro.offset.col, y: ro.offset.row };
      }
      detail.renderObject = roDetail;
    }

    // Parent info
    if (element.parent) {
      detail.parent = {
        widgetType: element.parent.widget.constructor.name,
        elementType: element.parent.constructor.name,
      };
    }

    // Inherited dependencies
    if (element._inheritedDependencies.size > 0) {
      detail.inheritedDependencies = Array.from(element._inheritedDependencies).map(
        dep => dep.widget.constructor.name,
      );
    }

    return new Response(JSON.stringify(detail, null, 2), { headers });
  }

  /**
   * GET /select?id=N — Select an element for debugging highlight.
   */
  private _handleSelect(url: URL, headers: Record<string, string>): Response {
    const idParam = url.searchParams.get('id');

    // Clear selection if no id
    if (idParam === null || idParam === '') {
      this._selectedElementId = null;
      return new Response(
        JSON.stringify({ selected: null, message: 'Selection cleared' }),
        { headers },
      );
    }

    const id = parseInt(idParam, 10);
    if (isNaN(id) || id < 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid id parameter — must be a non-negative integer' }),
        { status: 400, headers },
      );
    }

    const root = WidgetsBinding.instance.rootElement;
    if (!root) {
      return new Response(
        JSON.stringify({ error: 'No widget tree — app not running' }),
        { status: 503, headers },
      );
    }

    const element = findElementById(root, id);
    if (!element) {
      return new Response(
        JSON.stringify({ error: `Element with id ${id} not found` }),
        { status: 404, headers },
      );
    }

    this._selectedElementId = id;

    return new Response(
      JSON.stringify({
        selected: id,
        widgetType: element.widget.constructor.name,
        message: `Selected element ${id} (${element.widget.constructor.name})`,
      }),
      { headers },
    );
  }

  /**
   * GET /keystrokes — Returns recent keystroke history.
   *
   * Amp ref: Mu keystroke history endpoint
   */
  private _handleKeystrokes(headers: Record<string, string>): Response {
    const keystrokes = this._keystrokeHistory.toArray();
    return new Response(
      JSON.stringify({
        count: keystrokes.length,
        maxHistory: DebugInspector.MAX_KEYSTROKE_HISTORY,
        keystrokes,
      }, null, 2),
      { headers },
    );
  }
}
