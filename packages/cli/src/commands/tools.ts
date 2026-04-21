/**
 * Tool introspection and invocation CLI commands
 *
 * 逆向: amp-cli-reversed/chunk-004.js:25484 (_M0 — `tools use` command)
 * 逆向: amp-cli-reversed/chunk-004.js:25196 (eM0 — tool resolution)
 * 逆向: amp-cli-reversed/chunk-003.js:18645 (Gk — minimal execution context)
 */

import type { ToolContext, ToolRegistry, ToolResult, ToolSpec } from "@flitter/agent-core";
import type { Config } from "@flitter/schemas";

// ─── Deps ──────────────────────────────────────────────────

export interface ToolsCommandDeps {
  toolRegistry?: ToolRegistry;
}

// ─── Helpers ───────────────────────────────────────────────

function formatSource(source: unknown): string {
  if (source === "builtin") return "builtin";
  if (typeof source === "object" && source !== null) {
    if ("mcp" in source) return `mcp:${(source as { mcp: string }).mcp}`;
    if ("toolbox" in source) return `toolbox:${(source as { toolbox: string }).toolbox}`;
  }
  return String(source);
}

// ─── Handlers ──────────────────────────────────────────────

/**
 * `flitter tools list`
 */
export async function handleToolsList(
  deps: ToolsCommandDeps,
  options: { json?: boolean },
): Promise<void> {
  const { toolRegistry } = deps;
  if (!toolRegistry) {
    process.stderr.write("Error: ToolRegistry not available\n");
    process.exitCode = 1;
    return;
  }

  const tools = toolRegistry.list();

  if (options.json) {
    const data = tools.map((t) => ({
      name: t.name,
      description: t.description,
      source: t.source,
      isReadOnly: t.isReadOnly ?? false,
    }));
    process.stdout.write(`${JSON.stringify(data, null, 2)}\n`);
    return;
  }

  if (tools.length === 0) {
    process.stdout.write("No tools registered.\n");
    return;
  }

  const maxNameLen = Math.max(...tools.map((t) => t.name.length), 4);
  const maxSrcLen = Math.max(...tools.map((t) => formatSource(t.source).length), 6);

  process.stdout.write(
    `${"NAME".padEnd(maxNameLen)}  ${"SOURCE".padEnd(maxSrcLen)}  DESCRIPTION\n`,
  );
  process.stdout.write(`${"─".repeat(maxNameLen)}  ${"─".repeat(maxSrcLen)}  ${"─".repeat(30)}\n`);

  for (const tool of tools) {
    const src = formatSource(tool.source);
    const desc = (tool.description ?? "").slice(0, 60);
    process.stdout.write(`${tool.name.padEnd(maxNameLen)}  ${src.padEnd(maxSrcLen)}  ${desc}\n`);
  }
}

/**
 * `flitter tools show <name>`
 */
export async function handleToolsShow(deps: ToolsCommandDeps, name: string): Promise<void> {
  const { toolRegistry } = deps;
  if (!toolRegistry) {
    process.stderr.write("Error: ToolRegistry not available\n");
    process.exitCode = 1;
    return;
  }

  const tool = toolRegistry.get(name);
  if (!tool) {
    process.stderr.write(`Error: Tool "${name}" not found.\n`);
    process.exitCode = 1;
    return;
  }

  process.stdout.write(`Name: ${tool.name}\n`);
  process.stdout.write(`Source: ${formatSource(tool.source)}\n`);
  process.stdout.write(`Read-only: ${tool.isReadOnly ?? false}\n`);
  process.stdout.write(`Description: ${tool.description ?? "(none)"}\n`);
  process.stdout.write("\nInput Schema:\n");
  process.stdout.write(`${JSON.stringify(tool.inputSchema, null, 2)}\n`);
}

// ─── `tools use` ──────────────────────────────────────────

export interface ToolsUseDeps {
  toolRegistry: ToolRegistry;
  config: Config;
  workingDirectory: string;
}

export interface ToolsUseOptions {
  only?: string;
  stream?: boolean;
}

/**
 * Parse raw CLI args (`["--path", "/foo", "--count", "3"]`) into an input object.
 *
 * 逆向: amp-cli-reversed/chunk-004.js:25377 — sM0(rawArgs)
 *   Parses `["--key", "val", "--key2", "val2"]` into `{ key: "val", key2: "val2" }`.
 *   Duplicate keys produce arrays.
 */
export function parseCliArgsToInput(rawArgs: string[]): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  let i = 0;
  while (i < rawArgs.length) {
    const arg = rawArgs[i]!;
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const next = rawArgs[i + 1];
      if (next !== undefined && !next.startsWith("--")) {
        // Key-value pair
        const existing = result[key];
        if (existing !== undefined) {
          // Duplicate key → array
          result[key] = Array.isArray(existing) ? [...existing, next] : [existing, next];
        } else {
          result[key] = next;
        }
        i += 2;
      } else {
        // Boolean flag (no value)
        result[key] = true;
        i += 1;
      }
    } else {
      i += 1;
    }
  }
  return result;
}

/**
 * Coerce string values to match schema types (number, boolean).
 *
 * 逆向: amp-cli-reversed/chunk-004.js:25377 — tM0 coerces via VF
 *   Reads the tool's inputSchema properties and converts string→number/boolean.
 */
function coerceToSchemaTypes(
  input: Record<string, unknown>,
  schema: Record<string, unknown>,
): Record<string, unknown> {
  const properties = schema.properties as Record<string, { type?: string }> | undefined;
  if (!properties) return input;

  const result = { ...input };
  for (const [key, value] of Object.entries(result)) {
    if (typeof value !== "string") continue;
    const propSchema = properties[key];
    if (!propSchema?.type) continue;

    if (propSchema.type === "number" || propSchema.type === "integer") {
      const num = Number(value);
      if (!Number.isNaN(num)) result[key] = num;
    } else if (propSchema.type === "boolean") {
      result[key] = value === "true" || value === "1";
    }
  }
  return result;
}

/**
 * Read JSON input from stdin (non-TTY mode).
 *
 * 逆向: amp-cli-reversed/chunk-004.js:25374 — cM0()
 *   `!process.stdin.isTTY && process.stdin.readable` → read all stdin, JSON.parse
 */
async function readStdinJson(): Promise<Record<string, unknown> | null> {
  // Only read from stdin if it's piped (non-TTY) and readable
  if (process.stdin.isTTY || !process.stdin.readable) return null;

  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    let resolved = false;

    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        resolve(null);
      }
    }, 100); // Short timeout: if no data arrives, skip stdin

    process.stdin.once("readable", () => {
      let chunk: Buffer | null;
      while ((chunk = process.stdin.read() as Buffer | null) !== null) {
        chunks.push(chunk);
      }
      clearTimeout(timer);
      if (!resolved) {
        resolved = true;
        const raw = Buffer.concat(chunks).toString("utf-8").trim();
        if (!raw) {
          resolve(null);
          return;
        }
        try {
          resolve(JSON.parse(raw) as Record<string, unknown>);
        } catch {
          resolve(null);
        }
      }
    });

    process.stdin.once("end", () => {
      clearTimeout(timer);
      if (!resolved) {
        resolved = true;
        const raw = Buffer.concat(chunks).toString("utf-8").trim();
        if (!raw) {
          resolve(null);
          return;
        }
        try {
          resolve(JSON.parse(raw) as Record<string, unknown>);
        } catch {
          resolve(null);
        }
      }
    });
  });
}

/**
 * `flitter tools use <name> [--flag value ...]`
 *
 * Invoke a registered tool directly from the CLI.
 *
 * 逆向: amp-cli-reversed/chunk-004.js:25484-25511 (_M0 — `tools use` command)
 *   - Resolves tool by name
 *   - Two arg paths: stdin JSON or --flag CLI args
 *   - `--only <field>` extracts a single field from result
 *   - `--stream` emits events as JSON lines
 *   - Minimal execution context (no full thread)
 */
export async function handleToolsUse(
  deps: ToolsUseDeps,
  toolName: string,
  rawArgs: string[],
  options: ToolsUseOptions,
): Promise<void> {
  const { toolRegistry, config, workingDirectory } = deps;

  // ─── Step 1: Resolve tool by name ──────────────────
  // 逆向: eM0 at line 25196 — find(y => y.spec.name === R)
  const tool: ToolSpec | undefined = toolRegistry.get(toolName);
  if (!tool) {
    process.stderr.write(`Error: Tool "${toolName}" not found.\n`);
    const available = toolRegistry.list().map((t) => t.name);
    if (available.length > 0) {
      process.stderr.write(`Available tools: ${available.join(", ")}\n`);
    }
    process.exitCode = 1;
    return;
  }

  // ─── Step 2: Build input ───────────────────────────
  // 逆向: cM0 — stdin JSON vs CLI arg parsing
  let input: Record<string, unknown>;
  const stdinInput = await readStdinJson();
  if (stdinInput) {
    input = stdinInput;
  } else {
    input = parseCliArgsToInput(rawArgs);
    input = coerceToSchemaTypes(input, tool.inputSchema);
  }

  // Apply preprocessArgs if available
  if (tool.preprocessArgs) {
    input = tool.preprocessArgs(input);
  }

  // ─── Step 3: Create minimal execution context ──────
  // 逆向: Gk (chunk-003.js:18645) — stub thread, no real thread service
  const context: ToolContext = {
    workingDirectory,
    signal: new AbortController().signal,
    threadId: "cli-direct-invocation",
    config,
  };

  // ─── Step 4: Execute ──────────────────────────────
  // 逆向: aM0(A.invokeTool(...)) with SIGINT cancellation
  try {
    const resultOrObservable = tool.execute(input, context);

    // Handle Observable vs Promise
    if (
      resultOrObservable &&
      typeof (resultOrObservable as Promise<ToolResult>).then === "function"
    ) {
      // Promise path
      const result = await (resultOrObservable as Promise<ToolResult>);
      outputResult(result, options);
    } else {
      // Observable path — not handled for simplicity
      // 逆向: with --stream, amp subscribes via LnR + cET
      process.stderr.write("Warning: Observable tool results not yet supported in CLI mode.\n");
    }
  } catch (err) {
    process.stderr.write(
      `Error executing tool "${toolName}": ${err instanceof Error ? err.message : String(err)}\n`,
    );
    process.exitCode = 1;
  }
}

/**
 * Format and output the tool result.
 *
 * 逆向: amp-cli-reversed/chunk-004.js:25262 — `--only` field extraction
 */
function outputResult(result: ToolResult, options: ToolsUseOptions): void {
  if (options.stream) {
    // 逆向: --stream emits JSON lines with { status, result?, error? }
    process.stdout.write(
      `${JSON.stringify({ status: result.status, result: result.content ?? result.data, error: result.error })}\n`,
    );
    return;
  }

  // --only: extract a single field
  // 逆向: chunk-004.js:25262 — `if (t && u && typeof u === "object" && !Array.isArray(u) && t in u) P = u[t]`
  if (
    options.only &&
    result.data &&
    typeof result.data === "object" &&
    !Array.isArray(result.data)
  ) {
    const field = result.data[options.only];
    if (field !== undefined) {
      process.stdout.write(
        typeof field === "string" ? `${field}\n` : `${JSON.stringify(field, null, 2)}\n`,
      );
      return;
    }
  }

  // Default output
  if (result.status === "error") {
    process.stderr.write(`Error: ${result.error ?? "Unknown error"}\n`);
    process.exitCode = 1;
    return;
  }

  if (result.content) {
    process.stdout.write(`${result.content}\n`);
  } else if (result.data) {
    process.stdout.write(`${JSON.stringify(result.data, null, 2)}\n`);
  }
}
