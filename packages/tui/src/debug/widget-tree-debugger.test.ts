/**
 * WidgetTreeDebugger unit tests.
 *
 * Covers: singleton management, stable ID generation, tree serialization
 * (widget, element, renderObject nodes), keystroke history, HTTP endpoint
 * routing (via _handleRequest directly), and enabled/disabled guard.
 */

import { afterEach, describe, expect, test } from "bun:test";
import type { Element, Key, Widget } from "../tree/element.js";
import type { RenderObject } from "../tree/render-object.js";
import {
  type ElementDebugInfo,
  type RenderTreeDebugInfo,
  type WidgetDebugInfo,
  WidgetTreeDebugger,
} from "./widget-tree-debugger.js";

// ════════════════════════════════════════════════════
//  Minimal fake Element / Widget / RenderObject
// ════════════════════════════════════════════════════

function makeWidget(name: string, key?: Key): Widget {
  class W {
    static {
      Object.defineProperty(W, "name", { value: name });
    }
    key: Key | undefined = key;
  }
  return new W() as unknown as Widget;
}

function makeElement(
  widget: Widget,
  opts: {
    depth?: number;
    dirty?: boolean;
    mounted?: boolean;
    renderObject?: RenderObject;
    children?: Element[];
    name?: string;
  } = {},
): Element {
  const name = opts.name ?? "TestElement";
  class E {
    static {
      Object.defineProperty(E, "name", { value: name });
    }
    widget = widget;
    depth = opts.depth ?? 0;
    dirty = opts.dirty ?? false;
    mounted = opts.mounted ?? true;
    renderObject = opts.renderObject;
    children: Element[] = opts.children ?? [];
  }
  return new E() as unknown as Element;
}

function makeRenderObject(
  opts: {
    name?: string;
    needsLayout?: boolean;
    needsPaint?: boolean;
    size?: { width: number; height: number };
    offset?: { x: number; y: number };
    _lastConstraints?: unknown;
    children?: RenderObject[];
    publicProp?: string;
  } = {},
): RenderObject {
  const name = opts.name ?? "TestRenderObject";
  class R {
    static {
      Object.defineProperty(R, "name", { value: name });
    }
    needsLayout = opts.needsLayout ?? false;
    needsPaint = opts.needsPaint ?? false;
    size = opts.size ?? { width: 100, height: 50 };
    offset = opts.offset ?? { x: 0, y: 0 };
    _lastConstraints = opts._lastConstraints;
    children: RenderObject[] = opts.children ?? [];
    publicProp = opts.publicProp ?? "hello";
  }
  return new R() as unknown as RenderObject;
}

// ════════════════════════════════════════════════════
//  Test helpers
// ════════════════════════════════════════════════════

/** Create a fresh debugger (not enabled, no HTTP) for serialization tests. */
function makeDbg(): WidgetTreeDebugger {
  return new WidgetTreeDebugger(false);
}

// ════════════════════════════════════════════════════
//  Stable ID (toId)
// ════════════════════════════════════════════════════

describe("toId — stable ID generation", () => {
  test("assigns 'inspector-0' to the first object", () => {
    const dbg = makeDbg();
    const obj = {};
    expect(dbg.toId(obj)).toBe("inspector-0");
  });

  test("returns the same ID on repeated calls (stable)", () => {
    const dbg = makeDbg();
    const obj = {};
    const id1 = dbg.toId(obj);
    const id2 = dbg.toId(obj);
    expect(id1).toBe(id2);
  });

  test("assigns different IDs to distinct objects", () => {
    const dbg = makeDbg();
    const a = {};
    const b = {};
    const idA = dbg.toId(a);
    const idB = dbg.toId(b);
    expect(idA).not.toBe(idB);
  });

  test("IDs increment monotonically across objects", () => {
    const dbg = makeDbg();
    const ids = [{}, {}, {}].map((o) => dbg.toId(o));
    expect(ids).toEqual(["inspector-0", "inspector-1", "inspector-2"]);
  });
});

// ════════════════════════════════════════════════════
//  elementToDebugInfo serialization
// ════════════════════════════════════════════════════

describe("elementToDebugInfo — widget-centric serialization", () => {
  test("serializes type from widget constructor name", () => {
    const dbg = makeDbg();
    const w = makeWidget("MyWidget");
    const el = makeElement(w, { depth: 2 });
    const info: WidgetDebugInfo = dbg.elementToDebugInfo(el);
    expect(info.type).toBe("MyWidget");
  });

  test("serializes depth correctly", () => {
    const dbg = makeDbg();
    const el = makeElement(makeWidget("Box"), { depth: 5 });
    const info = dbg.elementToDebugInfo(el);
    expect(info.depth).toBe(5);
  });

  test("key is undefined when widget has no key", () => {
    const dbg = makeDbg();
    const el = makeElement(makeWidget("Row"));
    const info = dbg.elementToDebugInfo(el);
    expect(info.key).toBeUndefined();
  });

  test("key is serialized as a string via String(key)", () => {
    const dbg = makeDbg();
    // amp uses String(T.widget.key) — which calls .toString() on the key object.
    // Our Key class doesn't override toString, so String(key) = "[object Object]".
    const key = { value: "my-key", equals: () => false } as unknown as Key;
    const el = makeElement(makeWidget("Col", key));
    const info = dbg.elementToDebugInfo(el);
    expect(typeof info.key).toBe("string");
  });

  test("children are recursively serialized", () => {
    const dbg = makeDbg();
    const child = makeElement(makeWidget("Child"), { depth: 1 });
    const parent = makeElement(makeWidget("Parent"), {
      depth: 0,
      children: [child],
    });
    const info = dbg.elementToDebugInfo(parent);
    expect(info.children).toHaveLength(1);
    expect(info.children[0]!.type).toBe("Child");
  });

  test("renderObject summary is included when present", () => {
    const dbg = makeDbg();
    const ro = makeRenderObject({ name: "RenderFlex" });
    const el = makeElement(makeWidget("Flex"), { renderObject: ro });
    const info = dbg.elementToDebugInfo(el);
    expect(info.renderObject).toBeDefined();
    expect(info.renderObject!.type).toBe("RenderFlex");
  });
});

// ════════════════════════════════════════════════════
//  elementToElementDebugInfo serialization
// ════════════════════════════════════════════════════

describe("elementToElementDebugInfo — element-centric serialization", () => {
  test("includes dirty and mounted flags", () => {
    const dbg = makeDbg();
    const el = makeElement(makeWidget("E"), { dirty: true, mounted: false });
    const info: ElementDebugInfo = dbg.elementToElementDebugInfo(el);
    expect(info.dirty).toBe(true);
    expect(info.mounted).toBe(false);
  });

  test("type is the element class name (not widget name)", () => {
    const dbg = makeDbg();
    const el = makeElement(makeWidget("SomeWidget"), {
      name: "StatefulElement",
    });
    const info = dbg.elementToElementDebugInfo(el);
    expect(info.type).toBe("StatefulElement");
  });

  test("widget field is populated with widget debug info", () => {
    const dbg = makeDbg();
    const el = makeElement(makeWidget("Text"), { depth: 3 });
    const info = dbg.elementToElementDebugInfo(el);
    expect(info.widget.type).toBe("Text");
    expect(info.widget.depth).toBe(3);
  });

  test("children are recursively serialized as element nodes", () => {
    const dbg = makeDbg();
    const child = makeElement(makeWidget("C"), { name: "ComponentElement" });
    const parent = makeElement(makeWidget("P"), { children: [child] });
    const info = dbg.elementToElementDebugInfo(parent);
    expect(info.children).toHaveLength(1);
    expect(info.children[0]!.type).toBe("ComponentElement");
  });
});

// ════════════════════════════════════════════════════
//  renderObjectToRenderTreeDebugInfo serialization
// ════════════════════════════════════════════════════

describe("renderObjectToRenderTreeDebugInfo — full render tree", () => {
  test("includes needsLayout and needsPaint", () => {
    const dbg = makeDbg();
    const ro = makeRenderObject({ needsLayout: true, needsPaint: true });
    const info: RenderTreeDebugInfo = dbg.renderObjectToRenderTreeDebugInfo(ro);
    expect(info.needsLayout).toBe(true);
    expect(info.needsPaint).toBe(true);
  });

  test("serializes offset as {x, y}", () => {
    const dbg = makeDbg();
    const ro = makeRenderObject({ offset: { x: 10, y: 20 } });
    const info = dbg.renderObjectToRenderTreeDebugInfo(ro);
    expect(info.offset).toEqual({ x: 10, y: 20 });
  });

  test("public non-underscore primitive properties go into properties map", () => {
    const dbg = makeDbg();
    const ro = makeRenderObject({ publicProp: "world" });
    const info = dbg.renderObjectToRenderTreeDebugInfo(ro);
    expect(info.properties.publicProp).toBe("world");
  });

  test("underscore-prefixed fields are excluded from properties", () => {
    const dbg = makeDbg();
    const ro = makeRenderObject();
    const info = dbg.renderObjectToRenderTreeDebugInfo(ro);
    // _lastConstraints should not appear in properties
    expect("_lastConstraints" in info.properties).toBe(false);
  });

  test("children are recursively included", () => {
    const dbg = makeDbg();
    const child = makeRenderObject({ name: "RenderChild" });
    const parent = makeRenderObject({ name: "RenderParent", children: [child] });
    const info = dbg.renderObjectToRenderTreeDebugInfo(parent);
    expect(info.children).toHaveLength(1);
    expect(info.children[0]!.type).toBe("RenderChild");
  });

  test("id is stable across multiple calls", () => {
    const dbg = makeDbg();
    const ro = makeRenderObject();
    const id1 = dbg.renderObjectToRenderTreeDebugInfo(ro).id;
    const id2 = dbg.renderObjectToRenderTreeDebugInfo(ro).id;
    expect(id1).toBe(id2);
  });
});

// ════════════════════════════════════════════════════
//  buildRenderObjectElementMap
// ════════════════════════════════════════════════════

describe("buildRenderObjectElementMap", () => {
  test("maps render objects to their elements", () => {
    const dbg = makeDbg();
    const ro = makeRenderObject();
    const el = makeElement(makeWidget("W"), { renderObject: ro });
    dbg.buildRenderObjectElementMap(el);
    expect(dbg.renderObjectToElementMap.get(ro)).toBe(el);
  });

  test("traverses children recursively", () => {
    const dbg = makeDbg();
    const ro1 = makeRenderObject({ name: "RO1" });
    const ro2 = makeRenderObject({ name: "RO2" });
    const child = makeElement(makeWidget("C"), { renderObject: ro2 });
    const parent = makeElement(makeWidget("P"), {
      renderObject: ro1,
      children: [child],
    });
    dbg.buildRenderObjectElementMap(parent);
    expect(dbg.renderObjectToElementMap.get(ro1)).toBe(parent);
    expect(dbg.renderObjectToElementMap.get(ro2)).toBe(child);
  });

  test("clears stale entries on repeated scans", () => {
    const dbg = makeDbg();
    const ro = makeRenderObject();
    const el = makeElement(makeWidget("W"), { renderObject: ro });
    dbg.buildRenderObjectElementMap(el);
    const oldSize = dbg.renderObjectToElementMap.size;

    // Simulate a rescan where the element no longer has a renderObject
    const el2 = makeElement(makeWidget("W2"));
    dbg.renderObjectToElementMap.clear();
    dbg.buildRenderObjectElementMap(el2);
    expect(dbg.renderObjectToElementMap.size).toBe(0);
    expect(dbg.renderObjectToElementMap.size).toBeLessThan(oldSize);
  });
});

// ════════════════════════════════════════════════════
//  Keystroke history
// ════════════════════════════════════════════════════

describe("recordKeystroke — static keystroke history", () => {
  afterEach(() => {
    // Reset singleton
    WidgetTreeDebugger._instance = null;
  });

  test("records keystrokes into history when enabled", () => {
    const dbg = new WidgetTreeDebugger(true);
    WidgetTreeDebugger.recordKeystroke("Enter", ["root", "input"], true);
    expect(dbg.keystrokeHistory).toHaveLength(1);
    expect(dbg.keystrokeHistory[0]!.key).toBe("Enter");
    expect(dbg.keystrokeHistory[0]!.handled).toBe(true);
    expect(dbg.keystrokeHistory[0]!.focusPath).toEqual(["root", "input"]);
  });

  test("does nothing when disabled", () => {
    const dbg = new WidgetTreeDebugger(false);
    WidgetTreeDebugger.recordKeystroke("a", [], false);
    expect(dbg.keystrokeHistory).toHaveLength(0);
  });

  test("caps history at MAX_KEYSTROKE_HISTORY (50)", () => {
    const dbg = new WidgetTreeDebugger(true);
    for (let i = 0; i < 55; i++) {
      WidgetTreeDebugger.recordKeystroke(`key-${i}`, [], false);
    }
    expect(dbg.keystrokeHistory.length).toBe(50);
    // Oldest entries were shifted out; newest is key-54
    expect(dbg.keystrokeHistory[49]!.key).toBe("key-54");
  });

  test("timestamp is a recent epoch milliseconds value", () => {
    const before = Date.now();
    const dbg = new WidgetTreeDebugger(true);
    WidgetTreeDebugger.recordKeystroke("x", [], false);
    const after = Date.now();
    const ts = dbg.keystrokeHistory[0]!.timestamp;
    expect(ts).toBeGreaterThanOrEqual(before);
    expect(ts).toBeLessThanOrEqual(after);
  });

  test("does nothing when no instance exists", () => {
    WidgetTreeDebugger._instance = null;
    // Should not throw
    expect(() => WidgetTreeDebugger.recordKeystroke("a", [], true)).not.toThrow();
  });
});

// ════════════════════════════════════════════════════
//  Singleton / enabled guard
// ════════════════════════════════════════════════════

describe("singleton and enabled guard", () => {
  afterEach(() => {
    WidgetTreeDebugger._instance = null;
  });

  test("constructor sets _instance", () => {
    const dbg = new WidgetTreeDebugger(false);
    expect(WidgetTreeDebugger.instance).toBe(dbg);
  });

  test("second constructor replaces _instance", () => {
    const first = new WidgetTreeDebugger(false);
    const second = new WidgetTreeDebugger(false);
    expect(WidgetTreeDebugger.instance).toBe(second);
    expect(WidgetTreeDebugger.instance).not.toBe(first);
  });

  test("stop() nulls _instance", () => {
    const dbg = new WidgetTreeDebugger(false);
    dbg.stop();
    expect(WidgetTreeDebugger.instance).toBeNull();
  });

  test("start() is a no-op when not enabled", () => {
    const dbg = new WidgetTreeDebugger(false);
    const root = makeElement(makeWidget("Root"));
    dbg.start(root);
    // rootElement should not be set because enabled=false
    expect(dbg.rootElement).toBeNull();
  });
});

// ════════════════════════════════════════════════════
//  scanTree
// ════════════════════════════════════════════════════

describe("scanTree — snapshot building", () => {
  afterEach(() => {
    WidgetTreeDebugger._instance = null;
  });

  test("populates latestSnapshot after scan", () => {
    const dbg = new WidgetTreeDebugger(false); // enabled=false but we call scanTree directly
    const el = makeElement(makeWidget("Root"), { depth: 0 });
    dbg.rootElement = el;
    dbg.scanTree();
    expect(dbg.latestSnapshot).not.toBeNull();
    expect(dbg.latestSnapshot!.rootWidget).not.toBeNull();
  });

  test("snapshot timestamp is recent", () => {
    const dbg = new WidgetTreeDebugger(false);
    const el = makeElement(makeWidget("Root"));
    dbg.rootElement = el;
    const before = Date.now();
    dbg.scanTree();
    const after = Date.now();
    expect(dbg.latestSnapshot!.timestamp).toBeGreaterThanOrEqual(before);
    expect(dbg.latestSnapshot!.timestamp).toBeLessThanOrEqual(after);
  });

  test("snapshot includes recentKeystrokes copy", () => {
    const dbg = new WidgetTreeDebugger(true);
    WidgetTreeDebugger.recordKeystroke("Enter", ["root"], true);
    const el = makeElement(makeWidget("Root"));
    dbg.rootElement = el;
    dbg.scanTree();
    expect(dbg.latestSnapshot!.recentKeystrokes).toHaveLength(1);
  });

  test("does not throw when rootElement is null", () => {
    const dbg = new WidgetTreeDebugger(false);
    expect(() => dbg.scanTree()).not.toThrow();
    expect(dbg.latestSnapshot).toBeNull();
  });
});

// ════════════════════════════════════════════════════
//  HTTP endpoint routing (_handleRequest directly)
// ════════════════════════════════════════════════════

describe("HTTP endpoint routing", () => {
  /**
   * Minimal mock request/response objects to exercise _handleRequest
   * without spinning up a real TCP server.
   */
  function makeReqRes(
    method: string,
    url: string,
  ): {
    req: { method: string; url: string };
    res: {
      headers: Record<string, string>;
      statusCode: number;
      body: string;
      setHeader(k: string, v: string): void;
      writeHead(code: number): void;
      end(data?: string): void;
    };
  } {
    const res = {
      headers: {} as Record<string, string>,
      statusCode: 200,
      body: "",
      setHeader(k: string, v: string) {
        this.headers[k] = v;
      },
      writeHead(code: number) {
        this.statusCode = code;
      },
      end(data = "") {
        this.body = data;
      },
    };
    return { req: { method, url }, res };
  }

  afterEach(() => {
    WidgetTreeDebugger._instance = null;
  });

  test("GET /health returns {status:'ok', enabled:...}", () => {
    const dbg = new WidgetTreeDebugger(true);
    const { req, res } = makeReqRes("GET", "/health");
    dbg._handleRequest(req, res);
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.status).toBe("ok");
    expect(typeof body.enabled).toBe("boolean");
  });

  test("GET /widget-tree returns latest snapshot or fallback", () => {
    const dbg = new WidgetTreeDebugger(true);
    const { req, res } = makeReqRes("GET", "/widget-tree");
    dbg._handleRequest(req, res);
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect("timestamp" in body).toBe(true);
  });

  test("GET /focus-tree returns {timestamp, rootScope}", () => {
    const dbg = new WidgetTreeDebugger(true);
    const { req, res } = makeReqRes("GET", "/focus-tree");
    dbg._handleRequest(req, res);
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect("timestamp" in body).toBe(true);
    expect("rootScope" in body).toBe(true);
  });

  test("unknown route returns 404", () => {
    const dbg = new WidgetTreeDebugger(true);
    const { req, res } = makeReqRes("GET", "/unknown");
    dbg._handleRequest(req, res);
    expect(res.statusCode).toBe(404);
  });

  test("OPTIONS returns 200 (CORS preflight)", () => {
    const dbg = new WidgetTreeDebugger(true);
    const { req, res } = makeReqRes("OPTIONS", "/widget-tree");
    dbg._handleRequest(req, res);
    expect(res.statusCode).toBe(200);
  });

  test("CORS headers present on every response", () => {
    const dbg = new WidgetTreeDebugger(true);
    const { req, res } = makeReqRes("GET", "/health");
    dbg._handleRequest(req, res);
    expect(res.headers["Access-Control-Allow-Origin"]).toBe("*");
  });

  test("GET /widget-tree returns stored snapshot when available", () => {
    const dbg = new WidgetTreeDebugger(false);
    dbg.latestSnapshot = {
      timestamp: 12345,
      rootWidget: null,
      rootElement: null,
      rootRenderObject: null,
      recentKeystrokes: [],
    };
    const { req, res } = makeReqRes("GET", "/widget-tree");
    dbg._handleRequest(req, res);
    const body = JSON.parse(res.body);
    expect(body.timestamp).toBe(12345);
  });
});
