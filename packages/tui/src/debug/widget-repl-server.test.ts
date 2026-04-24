/**
 * Tests for WidgetREPLServer and WidgetDebugAPI.
 *
 * 逆向: modules/2647_unknown_LJT.js + modules/2649_unknown_WidgetREPLServer.js
 *
 * Socket-level tests are avoided (require OS resources); all logic is exercised
 * through WidgetDebugAPI directly against mock Element trees.
 */

import { describe, expect, it } from "bun:test";
import type { Element } from "../tree/element.js";
import { WidgetDebugAPI, WidgetREPLServer } from "./widget-repl-server.js";

// ════════════════════════════════════════════════════
//  Helpers — minimal mock Element / Widget
// ════════════════════════════════════════════════════

/** Build a mock element whose widget.constructor.name === typeName. */
function mockElement(
  typeName: string,
  opts: {
    dirty?: boolean;
    stateful?: boolean;
    state?: unknown;
    widgetProps?: Record<string, unknown>;
    focusNode?: { hasFocus: boolean } | null;
  } = {},
): Element {
  // Dynamically create a named constructor so .constructor.name === typeName.
  const WidgetClass = { [typeName]: class {} }[typeName];
  const widget = new WidgetClass();
  if (opts.widgetProps) {
    Object.assign(widget, opts.widgetProps);
  }
  if (opts.focusNode !== undefined) {
    (widget as Record<string, unknown>).focusNode = opts.focusNode;
  }

  const el = {
    widget,
    children: [] as Element[],
    dirty: opts.dirty ?? false,
    ...(opts.stateful ? { state: opts.state ?? {} } : {}),
  } as unknown as Element;

  return el;
}

/** Link parent → children and return parent. */
function withChildren(parent: Element, ...kids: Element[]): Element {
  for (const kid of kids) {
    (parent as unknown as { children: Element[] }).children.push(kid);
  }
  return parent;
}

// ════════════════════════════════════════════════════
//  Test trees
// ════════════════════════════════════════════════════

function buildSimpleTree(): Element {
  const root = mockElement("Root");
  const col = mockElement("Column");
  const tf1 = mockElement("TextField", { dirty: true, widgetProps: { placeholder: "search" } });
  const tf2 = mockElement("TextField");
  const btn = mockElement("Button", { stateful: true, state: { pressed: false } });
  withChildren(col, tf1, tf2, btn);
  withChildren(root, col);
  return root;
}

// ════════════════════════════════════════════════════
//  WidgetDebugAPI tests
// ════════════════════════════════════════════════════

describe("WidgetDebugAPI", () => {
  it("tree() returns a string containing widget type names", () => {
    const api = new WidgetDebugAPI(buildSimpleTree());
    const result = api.tree();
    expect(typeof result).toBe("string");
    expect(result).toContain("Root");
    expect(result).toContain("Column");
    expect(result).toContain("TextField");
    expect(result).toContain("Button");
  });

  it("tree() marks dirty elements with [dirty]", () => {
    const api = new WidgetDebugAPI(buildSimpleTree());
    const result = api.tree();
    expect(result).toContain("[dirty]");
  });

  it("tree() marks stateful elements with [S]", () => {
    const api = new WidgetDebugAPI(buildSimpleTree());
    const result = api.tree();
    expect(result).toContain("[S]");
  });

  it("tree() respects maxDepth — truncates deep nodes", () => {
    const root = mockElement("Root");
    const child = mockElement("Child");
    const grandchild = mockElement("GrandChild");
    withChildren(child, grandchild);
    withChildren(root, child);

    const api = new WidgetDebugAPI(root);
    const shallow = api.tree(1); // depth 0 = root, depth 1 = child, depth 2 > maxDepth
    expect(shallow).not.toContain("GrandChild");
    expect(shallow).toContain("...");
  });

  it("findByType() returns matching elements (case-insensitive)", () => {
    const api = new WidgetDebugAPI(buildSimpleTree());
    const results = api.findByType("textfield");
    expect(results).toHaveLength(2);
  });

  it("getFirstByType() returns null when nothing found", () => {
    const api = new WidgetDebugAPI(buildSimpleTree());
    expect(api.getFirstByType("NonExistent")).toBeNull();
  });

  it("getState() returns state from a stateful element", () => {
    const api = new WidgetDebugAPI(buildSimpleTree());
    const btn = api.getFirstByType("Button");
    expect(btn).not.toBeNull();
    const state = api.getState(btn!);
    expect(state).toEqual({ pressed: false });
  });

  it("getState() returns null for a stateless element", () => {
    const api = new WidgetDebugAPI(buildSimpleTree());
    const col = api.getFirstByType("Column");
    expect(api.getState(col!)).toBeNull();
  });

  it("getStateOf() convenience combines findByType + getState", () => {
    const api = new WidgetDebugAPI(buildSimpleTree());
    expect(api.getStateOf("Button")).toEqual({ pressed: false });
    expect(api.getStateOf("NonExistent")).toBeNull();
  });

  it("props() returns non-function, non-private widget properties", () => {
    const api = new WidgetDebugAPI(buildSimpleTree());
    const tf = api.getFirstByType("TextField");
    const p = api.props(tf!);
    expect(p).toHaveProperty("placeholder", "search");
  });

  it("summary() reports correct counts", () => {
    const api = new WidgetDebugAPI(buildSimpleTree());
    const s = api.summary();
    // root + column + 2 x TextField + Button = 5
    expect(s.totalCount).toBe(5);
    expect(s.countByType.TextField).toBe(2);
    expect(s.statefulCount).toBe(1); // only Button has state
    expect(s.dirtyCount).toBe(1); // only tf1 is dirty
  });

  it("focused() returns the element with focusNode.hasFocus === true", () => {
    const focused = mockElement("Input", { focusNode: { hasFocus: true } });
    const other = mockElement("Other", { focusNode: { hasFocus: false } });
    const root = mockElement("Root");
    withChildren(root, other, focused);

    const api = new WidgetDebugAPI(root);
    const result = api.focused();
    expect(result).toBe(focused);
  });

  it("focused() returns null when no element has focus", () => {
    const api = new WidgetDebugAPI(buildSimpleTree());
    expect(api.focused()).toBeNull();
  });

  it("updateRoot() replaces the root for subsequent calls", () => {
    const api = new WidgetDebugAPI(null);
    expect(api.tree()).toBe("(no root)\n");

    const newRoot = mockElement("NewRoot");
    api.updateRoot(newRoot);
    expect(api.tree()).toContain("NewRoot");
  });
});

// ════════════════════════════════════════════════════
//  WidgetREPLServer — socket path tests (no real I/O)
// ════════════════════════════════════════════════════

describe("WidgetREPLServer", () => {
  it("getSocketPath() returns a path using tmpdir and process.pid", () => {
    const server = new WidgetREPLServer();
    const p = server.getSocketPath();
    expect(p).toContain("flitter-widget-repl-");
    expect(p).toContain(String(process.pid));
  });

  it("stop() does not throw when server was never started", () => {
    const server = new WidgetREPLServer();
    expect(() => server.stop()).not.toThrow();
  });

  it("updateRoot() forwards to internal WidgetDebugAPI without throwing", () => {
    const server = new WidgetREPLServer(null);
    const root = buildSimpleTree();
    expect(() => server.updateRoot(root)).not.toThrow();
  });
});
