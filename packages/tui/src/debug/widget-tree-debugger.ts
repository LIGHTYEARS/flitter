/**
 * WidgetTreeDebugger — HTTP server for widget tree inspection.
 *
 * 逆向: modules/2101_unknown_aA.js — class aA
 *
 * Endpoints:
 *   GET /widget-tree  — JSON widget tree snapshot
 *   GET /focus-tree   — JSON focus tree
 *   GET /health       — Health check
 *
 * @module
 */

import * as http from "node:http";
import { FocusManager } from "../focus/focus-manager.js";
import type { Element } from "../tree/element.js";
import type { RenderObject } from "../tree/render-object.js";
import { Logger, logger } from "./logger.js";

// ════════════════════════════════════════════════════
//  Types
// ════════════════════════════════════════════════════

/** Serialized widget-tree debug node (elementToDebugInfo). */
export interface WidgetDebugInfo {
  id: string;
  type: string;
  key: string | undefined;
  depth: number;
  renderObject: RenderObjectDebugInfo | undefined;
  children: WidgetDebugInfo[];
}

/** Serialized element-tree debug node (elementToElementDebugInfo). */
export interface ElementDebugInfo {
  id: string;
  type: string;
  depth: number;
  dirty: boolean;
  mounted: boolean;
  widget: WidgetDebugInfo;
  renderObject: RenderObjectDebugInfo | undefined;
  children: ElementDebugInfo[];
}

/** Compact render-object info (renderObjectToDebugInfo). */
export interface RenderObjectDebugInfo {
  type: string;
  properties: Record<string, unknown>;
}

/** Full render-tree node (renderObjectToRenderTreeDebugInfo). */
export interface RenderTreeDebugInfo {
  id: string;
  type: string;
  constraints: unknown;
  size: unknown;
  offset: { x: number; y: number } | undefined;
  needsLayout: boolean;
  needsPaint: boolean;
  properties: Record<string, unknown>;
  debugData: Record<string, unknown> | undefined;
  elementId: string | undefined;
  children: RenderTreeDebugInfo[];
}

/** Full /widget-tree snapshot. */
export interface WidgetTreeSnapshot {
  timestamp: number;
  rootWidget: WidgetDebugInfo | null;
  rootElement: ElementDebugInfo | null;
  rootRenderObject: RenderTreeDebugInfo | null;
  recentKeystrokes: KeystrokeRecord[];
}

/** Keystroke history entry. */
export interface KeystrokeRecord {
  timestamp: number;
  key: string;
  focusPath: string[];
  handled: boolean;
}

// ════════════════════════════════════════════════════
//  WidgetTreeDebugger
// ════════════════════════════════════════════════════

/**
 * HTTP debug server that exposes the live widget/element/render-object tree
 * as JSON for external tooling.
 *
 * 逆向: class aA in modules/2101_unknown_aA.js
 *
 * @example
 * ```ts
 * const dbg = new WidgetTreeDebugger(true);
 * dbg.start(rootElement);
 * // ... later
 * dbg.stop();
 * ```
 */
export class WidgetTreeDebugger {
  /** Whether the debugger is enabled. */
  enabled: boolean;

  /** Scan interval in ms. */
  interval: number;

  /** Singleton instance. */
  static _instance: WidgetTreeDebugger | null = null;

  /** HTTP server. */
  server: http.Server | null = null;

  /** Latest scanned snapshot. */
  latestSnapshot: WidgetTreeSnapshot | null = null;

  /** Scan timer. */
  timer: ReturnType<typeof setInterval> | null = null;

  /** Root element reference. */
  rootElement: Element | null = null;

  /** Listen port. */
  port: number;

  /** Stable object → id mapping. */
  objectToId: WeakMap<object, string> = new WeakMap();

  /** Monotonic ID counter. */
  nextId = 0;

  /** RenderObject → Element reverse map (rebuilt each scan). */
  renderObjectToElementMap: Map<RenderObject, Element> = new Map();

  /** Recent keystroke history (max MAX_KEYSTROKE_HISTORY entries). */
  keystrokeHistory: KeystrokeRecord[] = [];

  /** Maximum retained keystrokes. */
  MAX_KEYSTROKE_HISTORY = 50;

  private readonly _log: Logger;

  /**
   * Construct a WidgetTreeDebugger.
   *
   * 逆向: aA constructor — (T = false, R = 1000, a?) where
   *   this.enabled = T, this.interval = R, this.port = a ?? 9876,
   *   aA._instance = this
   *
   * @param enabled - Whether to activate the debugger (default false).
   * @param interval - Scan interval in ms (default 1000).
   * @param port    - HTTP listen port (default 9876).
   * @param customLogger - Optional logger instance (defaults to global logger).
   *                       Used to redirect inspector logs to a file backend.
   */
  constructor(enabled = false, interval = 1000, port?: number, customLogger?: Logger) {
    this.enabled = enabled;
    this.interval = interval;
    this.port = port ?? 9876;
    this._log = (customLogger ?? logger).scoped("widget-tree-debugger");
    WidgetTreeDebugger._instance = this;
  }

  /** Access the current singleton. */
  static get instance(): WidgetTreeDebugger | null {
    return WidgetTreeDebugger._instance;
  }

  /**
   * Start the HTTP server and periodic scan.
   *
   * 逆向: aA.start(T) — guards on enabled, sets rootElement, calls
   *   startServer() and startPeriodicScan().
   */
  start(rootElement: Element, port?: number): void {
    if (!this.enabled) return;
    if (port !== undefined) this.port = port;
    this.rootElement = rootElement;
    this.startServer();
    this.startPeriodicScan();
  }

  /**
   * Stop the server and clear the timer.
   *
   * 逆向: aA.stop() — clears timer, closes server, nulls _instance.
   */
  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (this.server) {
      this.server.close();
      this.server = null;
    }
    WidgetTreeDebugger._instance = null;
  }

  /**
   * Record a keystroke into the singleton's history.
   *
   * 逆向: aA.recordKeystroke(T, R, a) — static method, pushes to instance's
   *   keystrokeHistory and shifts when length > MAX_KEYSTROKE_HISTORY.
   */
  static recordKeystroke(key: string, focusPath: string[], handled: boolean): void {
    const instance = WidgetTreeDebugger._instance;
    if (!instance?.enabled) return;

    const entry: KeystrokeRecord = {
      timestamp: Date.now(),
      key,
      focusPath,
      handled,
    };
    instance.keystrokeHistory.push(entry);
    if (instance.keystrokeHistory.length > instance.MAX_KEYSTROKE_HISTORY) {
      instance.keystrokeHistory.shift();
    }
  }

  // ════════════════════════════════════════════════════
  //  Server
  // ════════════════════════════════════════════════════

  /**
   * Route handler — separated for testability.
   *
   * 逆向: anonymous handler inside aA.startServer().
   */
  _handleRequest(
    req: { method?: string; url?: string },
    res: {
      setHeader(k: string, v: string): void;
      writeHead(code: number): void;
      end(data?: string): void;
    },
  ): void {
    // CORS
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

    if (req.method === "OPTIONS") {
      res.writeHead(200);
      res.end();
      return;
    }

    if (req.url === "/widget-tree" && req.method === "GET") {
      res.setHeader("Content-Type", "application/json");
      res.writeHead(200);
      res.end(
        JSON.stringify(
          this.latestSnapshot ?? {
            timestamp: Date.now(),
            rootWidget: null,
          },
        ),
      );
      return;
    }

    if (req.url === "/focus-tree" && req.method === "GET") {
      res.setHeader("Content-Type", "application/json");
      res.writeHead(200);
      const focusTree = this._dumpFocusTree();
      res.end(
        JSON.stringify(
          focusTree ?? {
            timestamp: Date.now(),
            rootScope: null,
          },
        ),
      );
      return;
    }

    if (req.url === "/health" && req.method === "GET") {
      res.setHeader("Content-Type", "application/json");
      res.writeHead(200);
      res.end(JSON.stringify({ status: "ok", enabled: this.enabled }));
      return;
    }

    res.writeHead(404);
    res.end("Not Found");
  }

  /**
   * Create and bind the HTTP server.
   *
   * 逆向: aA.startServer() — bare http.createServer, CORS headers on every
   *   response, routes: /widget-tree, /focus-tree, /health, else 404.
   */
  startServer(): void {
    this.server = http.createServer((req, res) => {
      this._handleRequest(req, res);
    });

    this.server.listen(this.port, "localhost", () => {
      this._log.info(`Widget Tree Debugger running on http://localhost:${this.port}`);
      this._log.info(`Widget Tree Data: http://localhost:${this.port}/widget-tree`);
    });

    this.server.on("error", (err) => {
      this._log.error("Widget Tree Debugger server error:", err);
    });
  }

  /**
   * Start the periodic tree scan.
   *
   * 逆向: aA.startPeriodicScan() — immediate scan then setInterval.
   */
  startPeriodicScan(): void {
    this.scanTree();
    this.timer = setInterval(() => {
      this.scanTree();
    }, this.interval);
  }

  // ════════════════════════════════════════════════════
  //  Tree scanning
  // ════════════════════════════════════════════════════

  /**
   * Perform a full tree scan and store the snapshot.
   *
   * 逆向: aA.scanTree() — clears renderObjectToElementMap, rebuilds it,
   *   then serializes widget/element/renderObject trees.
   */
  scanTree(): void {
    if (!this.rootElement) return;
    try {
      this.renderObjectToElementMap.clear();
      this.buildRenderObjectElementMap(this.rootElement);

      const rootWidget = this.elementToDebugInfo(this.rootElement);
      const rootElement = this.elementToElementDebugInfo(this.rootElement);
      const ro = this.rootElement.renderObject;
      const rootRenderObject = ro
        ? this.renderObjectToRenderTreeDebugInfo(ro, this.rootElement)
        : null;

      this.latestSnapshot = {
        timestamp: Date.now(),
        rootWidget,
        rootElement,
        rootRenderObject,
        recentKeystrokes: [...this.keystrokeHistory],
      };
    } catch (err) {
      this._log.error("Error scanning trees:", err);
    }
  }

  /**
   * Build the renderObject → Element reverse map by DFS.
   *
   * 逆向: aA.buildRenderObjectElementMap(T)
   */
  buildRenderObjectElementMap(element: Element): void {
    const ro = element.renderObject;
    if (ro) this.renderObjectToElementMap.set(ro, element);
    for (const child of element.children) {
      this.buildRenderObjectElementMap(child);
    }
  }

  // ════════════════════════════════════════════════════
  //  Serialization
  // ════════════════════════════════════════════════════

  /**
   * Serialize an Element as a Widget-centric debug node.
   *
   * 逆向: aA.elementToDebugInfo(T)
   */
  elementToDebugInfo(element: Element): WidgetDebugInfo {
    const id = this.toId(element);
    const type = element.widget.constructor.name;
    const key = element.widget.key ? String(element.widget.key) : undefined;
    const depth = element.depth;
    const ro = element.renderObject;
    const renderObject = ro ? this.renderObjectToDebugInfo(ro) : undefined;
    const children = element.children.map((c) => this.elementToDebugInfo(c));
    return { id, type, key, depth, renderObject, children };
  }

  /**
   * Serialize an Element as an element-centric debug node.
   *
   * 逆向: aA.elementToElementDebugInfo(T)
   */
  elementToElementDebugInfo(element: Element): ElementDebugInfo {
    const id = this.toId(element);
    const type = element.constructor.name;
    const depth = element.depth;
    const dirty = element.dirty;
    const mounted = element.mounted;
    const widget = this.elementToDebugInfo(element);
    const ro = element.renderObject;
    const renderObject = ro ? this.renderObjectToDebugInfo(ro) : undefined;
    const children = element.children.map((c) => this.elementToElementDebugInfo(c));
    return { id, type, depth, dirty, mounted, widget, renderObject, children };
  }

  /**
   * Compact render-object summary (used as inline child info in widget nodes).
   *
   * 逆向: aA.renderObjectToDebugInfo(T)
   */
  renderObjectToDebugInfo(ro: RenderObject): RenderObjectDebugInfo {
    const type = ro.constructor.name;
    const properties: Record<string, unknown> = {};
    try {
      const roAny = ro as unknown as Record<string, unknown>;
      if ("size" in ro) properties.size = roAny.size;
      if ("constraints" in ro) properties.constraints = roAny.constraints;
      if ("offset" in ro) properties.offset = roAny.offset;

      const names = Object.getOwnPropertyNames(ro);
      for (const name of names) {
        if (name.startsWith("_") || name === "constructor") continue;
        try {
          const val = roAny[name];
          if (typeof val !== "function") properties[name] = val;
        } catch {
          // skip inaccessible properties
        }
      }
    } catch (err) {
      properties.error = `Failed to extract properties: ${err}`;
    }
    return { type, properties };
  }

  /**
   * Full render-tree node serialization (recursive, includes children).
   *
   * 逆向: aA.renderObjectToRenderTreeDebugInfo(T, R?)
   */
  renderObjectToRenderTreeDebugInfo(ro: RenderObject, element?: Element): RenderTreeDebugInfo {
    const id = this.toId(ro);
    const mappedElement = this.renderObjectToElementMap.get(ro);
    const elementId = mappedElement ? this.toId(mappedElement) : undefined;
    const type = ro.constructor.name;
    const properties: Record<string, unknown> = {};
    let needsLayout = false;
    let needsPaint = false;
    let size: unknown;
    let constraints: unknown;
    let offset: { x: number; y: number } | undefined;
    let debugData: Record<string, unknown> | undefined;

    // Collect debug data from element/renderObject
    const ctx = element ?? mappedElement;
    if (ctx) {
      debugData = this.getDebugData(ctx, ro);
    } else {
      const roAny = ro as unknown as Record<string, unknown>;
      if ("debugData" in ro) {
        const d = roAny.debugData as Record<string, unknown> | undefined;
        if (d && Object.keys(d).length > 0) debugData = d;
      }
    }

    try {
      const roAny = ro as unknown as Record<string, unknown>;
      if ("needsLayout" in ro) needsLayout = ro.needsLayout;
      if ("needsPaint" in ro) needsPaint = ro.needsPaint;
      if ("size" in ro) size = roAny.size;
      if ("_lastConstraints" in ro) constraints = roAny._lastConstraints;
      if ("offset" in ro) {
        const off = roAny.offset as { x?: unknown; y?: unknown } | undefined;
        if (
          off &&
          typeof off === "object" &&
          "x" in off &&
          "y" in off &&
          typeof off.x === "number" &&
          typeof off.y === "number"
        ) {
          offset = { x: off.x, y: off.y };
        }
      }

      const skipKeys = new Set([
        "needsLayout",
        "needsPaint",
        "size",
        "constraints",
        "offset",
        "constructor",
      ]);
      const names = Object.getOwnPropertyNames(ro);
      for (const name of names) {
        if (name.startsWith("_") || skipKeys.has(name)) continue;
        try {
          const val = roAny[name];
          if (typeof val !== "function" && typeof val !== "object") {
            properties[name] = val;
          }
        } catch {
          // skip
        }
      }
    } catch (err) {
      properties.error = `Failed to extract properties: ${err}`;
    }

    // Recurse into children
    const children: RenderTreeDebugInfo[] = [];
    try {
      if ("children" in ro && Array.isArray((ro as { children?: unknown }).children)) {
        for (const child of ro.children as RenderObject[]) {
          children.push(this.renderObjectToRenderTreeDebugInfo(child));
        }
      }
    } catch {
      // ignore
    }

    return {
      id,
      type,
      constraints,
      size,
      offset,
      needsLayout,
      needsPaint,
      properties,
      debugData,
      elementId,
      children,
    };
  }

  /**
   * Extract combined debugData from element.widget.debugData and
   * renderObject.debugData.
   *
   * 逆向: aA.getDebugData(T, R)
   */
  getDebugData(element: Element, ro: RenderObject): Record<string, unknown> | undefined {
    let data: Record<string, unknown> = {};

    const widgetAny = element.widget as unknown as Record<string, unknown>;
    if ("debugData" in element.widget) {
      const d = widgetAny.debugData as Record<string, unknown> | undefined;
      if (d && Object.keys(d).length > 0) data = { ...data, ...d };
    }

    const effectiveRo: RenderObject | undefined = ro ?? element.renderObject;
    if (effectiveRo) {
      const roAny = effectiveRo as unknown as Record<string, unknown>;
      if ("debugData" in effectiveRo) {
        const d = roAny.debugData as Record<string, unknown> | undefined;
        if (d && Object.keys(d).length > 0) data = { ...data, ...d };
      }
    }

    return Object.keys(data).length > 0 ? data : undefined;
  }

  // ════════════════════════════════════════════════════
  //  Utilities
  // ════════════════════════════════════════════════════

  /**
   * Get or create a stable string ID for an object.
   *
   * 逆向: aA.toId(T) — WeakMap<object, string>, "inspector-<n>" format.
   */
  toId(obj: object): string {
    let id = this.objectToId.get(obj);
    if (id === undefined) {
      id = `inspector-${this.nextId++}`;
      this.objectToId.set(obj, id);
    }
    return id;
  }

  /** Return the latest snapshot (may be null if never scanned). */
  getLatestSnapshot(): WidgetTreeSnapshot | null {
    return this.latestSnapshot;
  }

  /** Force an immediate tree scan outside the periodic interval. */
  forceScan(): void {
    this.scanTree();
  }

  // ════════════════════════════════════════════════════
  //  Focus tree
  // ════════════════════════════════════════════════════

  /**
   * Dump the focus tree from FocusManager.
   *
   * 逆向: aA.startServer uses ic.instance.debugDumpFocusTree().
   * FocusManager does not yet have this method, so we build a minimal
   * representation from the public rootScope.
   */
  private _dumpFocusTree(): { timestamp: number; rootScope: unknown } {
    const fm = FocusManager.instance;
    const root = fm.rootScope;

    const serialize = (node: {
      debugLabel?: string;
      hasFocus?: boolean;
      children?: unknown[];
    }): unknown => {
      return {
        label: node.debugLabel ?? "(unlabeled)",
        hasFocus: node.hasFocus ?? false,
        children: Array.isArray(node.children)
          ? node.children.map((c) =>
              serialize(
                c as {
                  debugLabel?: string;
                  hasFocus?: boolean;
                  children?: unknown[];
                },
              ),
            )
          : [],
      };
    };

    return {
      timestamp: Date.now(),
      rootScope: serialize(
        root as unknown as {
          debugLabel?: string;
          hasFocus?: boolean;
          children?: unknown[];
        },
      ),
    };
  }
}
