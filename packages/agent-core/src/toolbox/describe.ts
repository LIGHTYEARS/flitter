/**
 * @flitter/agent-core — Toolbox describe probe
 *
 * Spawns a toolbox script with TOOLBOX_ACTION=describe and parses
 * the JSON (or legacy text-format) output into a ToolboxToolSpec.
 *
 * 逆向: chunk-002.js:30464-30546 — C5R() describe probe
 *       chunk-002.js:30430-30463 — E5R() args→inputSchema conversion
 *       chunk-002.js:30120-30172 — $5R() legacy text parser
 *       chunk-002.js:30173-30214 — v5R() text spec → tool spec
 */

import { type ChildProcess, spawn as cpSpawn } from "node:child_process";
import { createLogger } from "@flitter/util";
import type {
  DescribeResult,
  LegacyTextSpec,
  ToolboxToolSpec,
} from "./types";
import { DESCRIBE_TIMEOUT_MS } from "./toolbox-utils";

const log = createLogger("toolbox:describe");

// ─── Spawn type (injectable for testing) ─────────────────

export type SpawnFn = (
  command: string,
  args: string[],
  options: { env: Record<string, string | undefined>; stdio: string[] },
) => ChildProcess;

// ─── Main probe function ─────────────────────────────────

/**
 * Probe a toolbox script by spawning it with TOOLBOX_ACTION=describe.
 *
 * Returns the parsed ToolboxToolSpec + format, or null if the script
 * fails, times out, or produces unparseable output.
 *
 * 逆向: C5R(T) in chunk-002.js:30464-30546
 */
export async function probeToolScript(
  scriptPath: string,
  spawn: SpawnFn = defaultSpawn,
  timeoutMs: number = DESCRIBE_TIMEOUT_MS,
): Promise<DescribeResult | null> {
  try {
    const env: Record<string, string | undefined> = {
      ...process.env,
      TOOLBOX_ACTION: "describe",
      AGENT: "flitter",
    };

    const child = spawn(scriptPath, [], {
      env,
      stdio: ["pipe", "pipe", "pipe"],
    });

    const result = await spawnWithTimeout(child, timeoutMs);

    if (result.exitCode !== 0) {
      log.info("Failed to collect tool definition", {
        path: scriptPath,
        stderr: result.stderr,
        exitCode: result.exitCode,
      });
      return null;
    }

    // 逆向: C5R tries JSON.parse first, falls back to $5R (text format)
    try {
      return parseJsonDescribe(result.stdout, scriptPath);
    } catch (jsonError) {
      // Try legacy text format
      const textSpec = parseLegacyTextFormat(result.stdout);
      if (textSpec) {
        return {
          spec: textSpecToToolboxSpec(textSpec, scriptPath),
          format: "text",
        };
      }

      log.debug("Failed to parse tool definition as JSON or text", {
        path: scriptPath,
        jsonError: String(jsonError),
        stdout:
          result.stdout.substring(0, 200) +
          (result.stdout.length > 200 ? "..." : ""),
      });
      return null;
    }
  } catch (err) {
    log.info(`toolboxes.collectDefinition failed for ${scriptPath}`, {
      path: scriptPath,
      error: err,
    });
    return null;
  }
}

// ─── JSON describe parser ────────────────────────────────

/**
 * Parse JSON describe output and normalize it.
 *
 * 逆向: C5R inner try block (chunk-002.js:30498-30527)
 *   - Converts legacy `args` map → `inputSchema` via E5R()
 *   - Defaults empty inputSchema if missing
 */
function parseJsonDescribe(
  stdout: string,
  scriptPath: string,
): DescribeResult {
  const parsed = JSON.parse(stdout) as ToolboxToolSpec;

  // Convert legacy "args" format to inputSchema
  // 逆向: chunk-002.js:30499-30504
  if (parsed.args && typeof parsed.args === "object") {
    const properties: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(parsed.args)) {
      properties[key] = convertArgToSchema(value);
    }
    parsed.inputSchema = {
      type: "object",
      properties,
    };
    delete parsed.args;
    log.debug("Toolbox tool schema converted to", parsed.inputSchema);
  }

  // Default to empty inputSchema if missing
  // 逆向: chunk-002.js:30506-30510
  if (!parsed.inputSchema) {
    parsed.inputSchema = {
      type: "object",
      properties: {},
      required: [],
    };
    log.debug("Toolbox tool defaulted to empty inputSchema");
  }

  return {
    spec: {
      name: parsed.name,
      description: parsed.description,
      inputSchema: parsed.inputSchema,
      meta: parsed.meta,
    },
    format: "json",
  };
}

// ─── Legacy text format parser ──────────────────────────

/**
 * Parse legacy text-format describe output.
 * Line-based key:value format.
 *
 * 逆向: chunk-002.js:30120-30172 — $5R(T)
 */
export function parseLegacyTextFormat(stdout: string): LegacyTextSpec | null {
  const lines = stdout
    .trim()
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l);

  if (lines.length === 0) return null;

  let name = "";
  const descriptionParts: string[] = [];
  const parameters: Record<
    string,
    { type: string; description: string; optional: boolean }
  > = {};

  for (const line of lines) {
    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) continue;

    const key = line.substring(0, colonIdx).trim();
    const value = line.substring(colonIdx + 1).trim();
    if (!key || !value) continue;

    if (key === "name" && !name) {
      name = value;
    } else if (key === "description") {
      descriptionParts.push(value);
    } else {
      // Parameter definition
      const spaceIdx = value.indexOf(" ");
      if (spaceIdx === -1) {
        parameters[key] = { type: "string", description: value, optional: false };
      } else {
        let typePart = value.substring(0, spaceIdx);
        let descPart = value.substring(spaceIdx + 1).trim();
        const validTypes = [
          "string",
          "boolean",
          "number",
          "integer",
          "array",
          "object",
        ];
        let isOptional = false;

        if (typePart.endsWith("?")) {
          isOptional = true;
          typePart = typePart.slice(0, -1);
        }

        if (validTypes.includes(typePart.toLowerCase())) {
          if (/^(\()?optional(\))?(\s|$)/i.test(descPart)) {
            isOptional = true;
          }
          parameters[key] = {
            type: typePart,
            description: descPart,
            optional: isOptional,
          };
        } else {
          // Type not recognized — treat entire value as description, type = string
          if (/^(\()?optional(\))?(\s|$)/i.test(value)) {
            isOptional = true;
          }
          parameters[key] = {
            type: "string",
            description: value,
            optional: isOptional,
          };
        }
      }
    }
  }

  if (!name) return null;

  return {
    name,
    description: descriptionParts.join("\n"),
    parameters,
  };
}

/**
 * Convert a LegacyTextSpec into a ToolboxToolSpec with proper inputSchema.
 *
 * 逆向: chunk-002.js:30173-30214 — v5R(T, R)
 */
export function textSpecToToolboxSpec(
  textSpec: LegacyTextSpec,
  scriptPath: string,
): ToolboxToolSpec {
  const properties: Record<string, unknown> = {};
  const required: string[] = [];

  for (const [key, param] of Object.entries(textSpec.parameters)) {
    let schemaType: string;
    switch (param.type.toLowerCase()) {
      case "boolean":
        schemaType = "boolean";
        break;
      case "number":
      case "integer":
        schemaType = param.type.toLowerCase();
        break;
      case "array":
        schemaType = "array";
        break;
      case "object":
        schemaType = "object";
        break;
      default:
        schemaType = "string";
    }

    properties[key] = {
      type: schemaType,
      description: param.description,
    };

    if (!param.optional) {
      required.push(key);
    }
  }

  return {
    name: textSpec.name,
    description: textSpec.description,
    inputSchema: {
      type: "object",
      properties,
      required,
      additionalProperties: false,
    },
  };
}

// ─── Args conversion ────────────────────────────────────

/**
 * Convert a single legacy "args" entry to a JSON Schema property.
 *
 * 逆向: chunk-002.js:30430-30463 — E5R(T)
 *
 * Handles:
 * - undefined/null/boolean → {type:"string", description:"generic argument..."}
 * - [] → same
 * - [desc] → {type:"string", description: desc}
 * - [type, desc] → {type, description: desc}
 * - {type?, description?} → uses given values
 */
export function convertArgToSchema(
  arg: unknown,
): { type: string; description: string } {
  if (arg === undefined || arg === null || arg === false || arg === true) {
    return { type: "string", description: "generic argument - use a sensible value" };
  }

  if (Array.isArray(arg)) {
    switch (arg.length) {
      case 0:
        return {
          type: "string",
          description: "generic argument - use a sensible value",
        };
      case 1:
        return { type: "string", description: String(arg[0]) };
      default:
        return { type: String(arg[0]), description: String(arg[1]) };
    }
  }

  if (typeof arg === "object" && Object.keys(arg as object).length > 0) {
    const obj = arg as Record<string, unknown>;
    return {
      type: (obj.type as string) || "string",
      description:
        (obj.description as string) || "generic argument - use a sensible value",
    };
  }

  return { type: "string", description: "generic argument - use a sensible value" };
}

// ─── Spawn helpers ──────────────────────────────────────

interface SpawnResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

function defaultSpawn(
  command: string,
  args: string[],
  options: { env: Record<string, string | undefined>; stdio: string[] },
): ChildProcess {
  return cpSpawn(command, args, {
    env: options.env,
    stdio: options.stdio as ("pipe" | "inherit" | "ignore")[],
  });
}

/**
 * Wait for a child process to exit with a timeout.
 * Kills the process if it exceeds the deadline.
 *
 * 逆向: C5R uses Gl(EuT) (rxjs timeout) and kills the process on timeout.
 */
function spawnWithTimeout(
  child: ChildProcess,
  timeoutMs: number,
): Promise<SpawnResult> {
  return new Promise((resolve, reject) => {
    let stdout = "";
    let stderr = "";
    let settled = false;

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        if (!child.killed) child.kill("SIGKILL");
        reject(
          new Error(`Toolbox describe timed out after ${timeoutMs}ms`),
        );
      }
    }, timeoutMs);

    child.stdout?.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });

    child.stderr?.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    child.on("error", (err) => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        reject(err);
      }
    });

    child.on("close", (code) => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        resolve({ stdout, stderr, exitCode: code ?? -1 });
      }
    });
  });
}
