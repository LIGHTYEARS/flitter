/**
 * @flitter/agent-core — Plugin runtime template generator
 *
 * 逆向: amp-cli-reversed/chunk-005.js:19668-19746 (UWR runtime template, TqR() extraction)
 * 逆向: amp-cli-reversed/chunk-002.js:27163-27165 (TqR wraps UWR)
 * 逆向: amp-cli-reversed/chunk-005.js:145762-145771 (getRuntimeLaunchPath writes template to temp file)
 *
 * In amp, the runtime template is a huge self-contained bundle (parsimmon + zod + SDK).
 * For Flitter, we generate a simpler shim that:
 * 1. Imports the user's plugin file
 * 2. Sets up JSON-RPC stdin reader
 * 3. Calls the plugin's event handlers
 * 4. Emits "runtime.ready" when loaded
 *
 * The subprocess reads JSON-RPC requests from stdin (one per line)
 * and writes JSON-RPC responses/events to stdout (one per line).
 *
 * @example
 * ```ts
 * import { generatePluginRuntime } from './plugin-runtime';
 * const code = generatePluginRuntime('/path/to/my-plugin.ts');
 * // Write `code` to a temp file and run with `bun run <tempFile>`
 * ```
 */

import { PLUGIN_READY_EVENT } from "./types";

/**
 * Generate the runtime shim code that wraps a user plugin.
 *
 * The generated code:
 * 1. Imports the plugin's default export (expected to be an object with event handlers)
 * 2. Reads stdin line-by-line for JSON-RPC messages
 * 3. Dispatches requests to the plugin's handlers
 * 4. Writes responses/events to stdout as JSON lines
 * 5. Emits "runtime.ready" on startup
 *
 * 逆向: TqR() returns the runtime template string.
 * In amp, this is a massive self-contained bundle. We generate a lightweight shim instead
 * because Flitter plugins run in Bun which can import .ts files directly.
 *
 * @param pluginPath - Absolute path to the user's plugin file
 * @returns Generated TypeScript source code for the runtime shim
 */
export function generatePluginRuntime(pluginPath: string): string {
  // Escape the plugin path for embedding in generated code
  const escapedPath = pluginPath.replace(/\\/g, "\\\\").replace(/'/g, "\\'");

  return `#!/usr/bin/env bun
// Flitter plugin runtime shim
// Generated for: ${escapedPath}
// 逆向: amp-cli-reversed/chunk-005.js:19668 (UWR runtime template)

import { createInterface } from "node:readline";

// ─── JSON-RPC helpers ─────────────────────────────────────

function serialize(msg) {
  return JSON.stringify(msg) + "\\n";
}

function sendEvent(event, data) {
  process.stdout.write(serialize({ type: "event", event, data }));
}

function sendResponse(id, result, error) {
  const msg = { type: "response", id };
  if (error !== undefined) msg.error = error;
  else msg.result = result;
  process.stdout.write(serialize(msg));
}

// ─── Plugin loading ───────────────────────────────────────

let plugin;
try {
  const mod = await import('${escapedPath}');
  plugin = mod.default ?? mod;
} catch (err) {
  process.stderr.write("Failed to load plugin: " + (err?.message ?? String(err)) + "\\n");
  process.exit(1);
}

// ─── Event handler registry ──────────────────────────────

// The plugin is expected to export an object with event handler functions:
// { "tool.call": async (params) => { ... }, "tool.result": async (params) => { ... } }
// Or register them dynamically via plugin.registeredEvents

const registeredEvents = new Set(Object.keys(plugin).filter(k => typeof plugin[k] === "function"));

// ─── Request handling ─────────────────────────────────────

async function handleRequest(msg) {
  const { id, method, params } = msg;

  try {
    // Special built-in methods
    if (method === "events.list") {
      sendResponse(id, [...registeredEvents]);
      return;
    }
    if (method === "tool.list") {
      sendResponse(id, []);
      return;
    }
    if (method === "command.list") {
      sendResponse(id, []);
      return;
    }

    // Dispatch to plugin handler
    const handler = plugin[method];
    if (typeof handler !== "function") {
      sendResponse(id, undefined, "No handler for method: " + method);
      return;
    }

    const result = await handler(params);
    sendResponse(id, result);
  } catch (err) {
    sendResponse(id, undefined, err instanceof Error ? err.message : String(err));
  }
}

// ─── stdin reader ─────────────────────────────────────────

const rl = createInterface({ input: process.stdin });
rl.on("line", (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;
  try {
    const msg = JSON.parse(trimmed);
    if (msg.type === "request") {
      handleRequest(msg);
    } else if (msg.type === "response") {
      // Host responding to a plugin-initiated request (future use)
    }
  } catch {
    // Ignore malformed input
  }
});

// ─── Signal ready ─────────────────────────────────────────
// 逆向: QWR = "runtime.ready" (chunk-005.js:19746)

sendEvent("${PLUGIN_READY_EVENT}");
`;
}

/**
 * Validate that a generated runtime template has the expected structure.
 * Useful for testing.
 */
export function validateRuntimeTemplate(code: string): {
  hasReadyEvent: boolean;
  hasStdinReader: boolean;
  hasSerialize: boolean;
  hasPluginImport: boolean;
} {
  return {
    hasReadyEvent: code.includes(PLUGIN_READY_EVENT),
    hasStdinReader: code.includes("createInterface"),
    hasSerialize: code.includes("serialize"),
    hasPluginImport: code.includes("import("),
  };
}
