/**
 * WidgetREPLServer — Unix socket REPL for runtime widget tree inspection.
 *
 * 逆向: modules/2649_unknown_WidgetREPLServer.js
 *
 * Connect with: nc -U /tmp/flitter-widget-repl-<pid>.sock
 */

import * as fs from "node:fs";
import * as net from "node:net";
import * as os from "node:os";
import * as path from "node:path";
import * as readline from "node:readline";
import type { Element } from "../tree/element.js";
import { Logger, logger } from "./logger.js";

// ════════════════════════════════════════════════════
//  WidgetDebugAPI
// ════════════════════════════════════════════════════

/**
 * Debug API object exposed as `$` inside the REPL.
 *
 * 逆向: modules/2647_unknown_LJT.js — class LJT
 */
export class WidgetDebugAPI {
  rootElement: Element | null;

  constructor(rootElement: Element | null) {
    this.rootElement = rootElement;
  }

  updateRoot(root: Element | null): void {
    this.rootElement = root;
  }

  // ── tree ──────────────────────────────────────────

  /**
   * Serialize the widget tree to a formatted string.
   *
   * 逆向: LJT.tree / LJT.formatTree
   */
  tree(maxDepth = 100): string {
    if (!this.rootElement) return "(no root)\n";
    return this._formatTree(this.rootElement, 0, maxDepth);
  }

  private _formatTree(element: Element, depth: number, maxDepth: number): string {
    if (depth > maxDepth) return `${"  ".repeat(depth)}...\n`;
    const indent = "  ".repeat(depth);
    const typeName = element.widget.constructor.name;
    const stateMark = "state" in element ? " [S]" : "";
    const dirtyMark = element.dirty ? " [dirty]" : "";
    let out = `${indent}${typeName}${stateMark}${dirtyMark}\n`;
    for (const child of element.children) {
      out += this._formatTree(child, depth + 1, maxDepth);
    }
    return out;
  }

  // ── walk ──────────────────────────────────────────

  private _walkTree(element: Element, visitor: (el: Element) => void): void {
    visitor(element);
    for (const child of element.children) {
      this._walkTree(child, visitor);
    }
  }

  // ── find ──────────────────────────────────────────

  /**
   * Find elements whose widget type name includes `name` (case-insensitive).
   *
   * 逆向: LJT.findByType
   */
  findByType(name: string): Element[] {
    if (!this.rootElement) return [];
    const needle = name.toLowerCase();
    const results: Element[] = [];
    this._walkTree(this.rootElement, (el) => {
      if (el.widget.constructor.name.toLowerCase().includes(needle)) {
        results.push(el);
      }
    });
    return results;
  }

  /**
   * Get the first element whose widget type name includes `name`.
   *
   * 逆向: LJT.getFirstByType
   */
  getFirstByType(name: string): Element | null {
    return this.findByType(name)[0] ?? null;
  }

  // ── state / props ─────────────────────────────────

  /**
   * Get the `state` property from a StatefulElement.
   *
   * 逆向: LJT.getState — checks `"state" in T`
   */
  getState(element: Element): unknown {
    if ("state" in element) return (element as Element & { state: unknown }).state ?? null;
    return null;
  }

  /**
   * Convenience: find first element by type and return its state.
   *
   * 逆向: LJT.getStateOf
   */
  getStateOf(typeName: string): unknown {
    const el = this.getFirstByType(typeName);
    if (el) return this.getState(el);
    return null;
  }

  /**
   * Get all non-function, non-private properties of the element's widget.
   *
   * 逆向: LJT.props
   */
  props(element: Element): Record<string, unknown> {
    const widget = element.widget as unknown as Record<string, unknown>;
    const result: Record<string, unknown> = {};
    for (const key of Object.getOwnPropertyNames(widget)) {
      if (key.startsWith("_") || key === "constructor" || key === "key") continue;
      try {
        const value = widget[key];
        if (typeof value !== "function") result[key] = value;
      } catch {
        // skip inaccessible properties
      }
    }
    return result;
  }

  // ── summary ───────────────────────────────────────

  /**
   * Return brief statistics about the widget tree.
   *
   * 逆向: LJT.summary
   */
  summary(): {
    totalCount: number;
    countByType: Record<string, number>;
    statefulCount: number;
    dirtyCount: number;
  } {
    const countByType: Record<string, number> = {};
    let totalCount = 0;
    let statefulCount = 0;
    let dirtyCount = 0;

    if (this.rootElement) {
      this._walkTree(this.rootElement, (el) => {
        totalCount++;
        const typeName = el.widget.constructor.name;
        countByType[typeName] = (countByType[typeName] ?? 0) + 1;
        if ("state" in el) statefulCount++;
        if (el.dirty) dirtyCount++;
      });
    }

    return { totalCount, countByType, statefulCount, dirtyCount };
  }

  // ── focused ───────────────────────────────────────

  /**
   * Return the element that currently has focus (if any).
   *
   * 逆向: LJT.focused — checks `focusNode.hasFocus`
   */
  focused(): Element | null {
    if (!this.rootElement) return null;
    let focused: Element | null = null;
    this._walkTree(this.rootElement, (el) => {
      if ("focusNode" in el.widget) {
        const node = (el.widget as Record<string, unknown>).focusNode as
          | { hasFocus?: boolean }
          | null
          | undefined;
        if (node?.hasFocus) focused = el;
      }
    });
    return focused;
  }
}

// ════════════════════════════════════════════════════
//  WidgetREPLServer
// ════════════════════════════════════════════════════

/**
 * Unix socket REPL server that exposes a `$` debug API for live widget tree inspection.
 *
 * 逆向: modules/2649_unknown_WidgetREPLServer.js — class WidgetREPLServer
 */
export class WidgetREPLServer {
  private _server: net.Server | null = null;
  private _api: WidgetDebugAPI;
  private _socketPath: string;
  private readonly _log: Logger;

  constructor(rootElement: Element | null = null, customLogger?: Logger) {
    this._api = new WidgetDebugAPI(rootElement);
    this._socketPath = path.join(os.tmpdir(), `flitter-widget-repl-${process.pid}.sock`);
    this._log = (customLogger ?? logger).scoped("widget-repl");
  }

  /** Update the root element (call after framework re-roots). */
  updateRoot(root: Element | null): void {
    this._api.updateRoot(root);
  }

  /** Path of the Unix socket. */
  getSocketPath(): string {
    return this._socketPath;
  }

  /**
   * Start the REPL server, creating the Unix socket.
   *
   * 逆向: WidgetREPLServer.start — unlink existing socket, createServer, chmod 0600
   */
  start(rootElement?: Element): void {
    if (rootElement) this._api.updateRoot(rootElement);

    // Remove stale socket from a previous run.
    try {
      if (fs.existsSync(this._socketPath)) fs.unlinkSync(this._socketPath);
    } catch {
      // ignore
    }

    this._server = net.createServer((socket) => {
      this._handleConnection(socket);
    });

    this._server.listen(this._socketPath, () => {
      // chmod 0600 = 384 decimal — matches amp's `fs.chmodSync(path, 384)`
      try {
        fs.chmodSync(this._socketPath, 0o600);
      } catch {
        this._log.warn("Failed to chmod REPL socket; leaving default permissions");
      }
      this._log.info(`Widget REPL listening on ${this._socketPath}`);
      this._log.info(`Connect with: nc -U ${this._socketPath}`);
    });

    this._server.on("error", (err) => {
      this._log.error("Widget REPL server error:", err);
    });
  }

  /**
   * Stop the REPL server and remove the socket file.
   *
   * 逆向: WidgetREPLServer.stop
   */
  stop(): void {
    if (this._server) {
      this._server.close();
      this._server = null;
    }
    try {
      if (fs.existsSync(this._socketPath)) fs.unlinkSync(this._socketPath);
    } catch {
      // ignore
    }
  }

  /**
   * Handle an incoming REPL connection.
   *
   * 逆向: WidgetREPLServer.handleConnection — readline interface, eval with `$` in scope
   */
  private _handleConnection(socket: net.Socket): void {
    const rl = readline.createInterface({
      input: socket,
      output: socket,
      terminal: false,
    });

    socket.write("Widget REPL connected. Use $ to access the debugger API.\n");
    socket.write('Examples: $.tree(), $.findByType("TextField"), $.summary()\n');
    socket.write("> ");

    rl.on("line", (line) => {
      const trimmed = line.trim();

      if (!trimmed) {
        socket.write("> ");
        return;
      }

      if (trimmed === "help") {
        socket.write("Available commands:\n");
        socket.write("  $.tree(maxDepth?)       - Print widget tree\n");
        socket.write("  $.findByType(name)      - Find elements by widget type\n");
        socket.write("  $.getFirstByType(name)  - Get first element of type\n");
        socket.write("  $.getState(element)     - Get state from StatefulElement\n");
        socket.write("  $.getStateOf(typeName)  - Get state of first element of type\n");
        socket.write("  $.props(element)        - Get widget properties\n");
        socket.write("  $.summary()             - Get tree statistics\n");
        socket.write("  $.focused()             - Get focused element\n");
        socket.write("  help                    - Show this help\n");
        socket.write("  exit                    - Close connection\n");
        socket.write("> ");
        return;
      }

      if (trimmed === "exit" || trimmed === "quit") {
        socket.write("Goodbye!\n");
        socket.end();
        return;
      }

      // Evaluate the expression with `$` bound to the debug API.
      try {
        const $ = this._api;
        void $; // `$` is referenced by eval'd user input
        // biome-ignore lint/security/noGlobalEval: intentional REPL — debug tool only
        const result = eval(trimmed);
        if (result === undefined) {
          socket.write("undefined\n");
        } else if (typeof result === "string") {
          socket.write(`${result}\n`);
        } else {
          try {
            socket.write(`${JSON.stringify(result, null, 2)}\n`);
          } catch {
            socket.write(`${String(result)}\n`);
          }
        }
      } catch (err) {
        socket.write(`Error: ${err instanceof Error ? err.message : String(err)}\n`);
      }

      socket.write("> ");
    });

    rl.on("close", () => {
      socket.end();
    });

    socket.on("error", (err) => {
      this._log.debug("Widget REPL socket error:", err);
    });
  }
}
