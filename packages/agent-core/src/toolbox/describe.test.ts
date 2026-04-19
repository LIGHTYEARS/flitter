/**
 * Toolbox describe probe — unit tests
 *
 * Covers: JSON parsing, legacy text format, args→schema conversion,
 *         timeout handling, error cases.
 *
 * Uses mock spawn functions to simulate script output without real subprocesses.
 */

import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { Readable, Writable } from "node:stream";
import { describe, it } from "node:test";
import {
  convertArgToSchema,
  parseLegacyTextFormat,
  probeToolScript,
  textSpecToToolboxSpec,
} from "./describe";
import type { SpawnFn } from "./describe";

// ─── Mock spawn factory ─────────────────────────────────

/**
 * Create a mock spawn function that returns a fake child process
 * emitting the given stdout, stderr, and exit code.
 */
function createMockSpawn(opts: {
  stdout?: string;
  stderr?: string;
  exitCode?: number;
  delay?: number;
  error?: Error;
}): SpawnFn {
  return (_command, _args, _options) => {
    const child = new EventEmitter() as ReturnType<SpawnFn>;
    const stdoutStream = new Readable({ read() {} });
    const stderrStream = new Readable({ read() {} });
    const stdinStream = new Writable({ write(_chunk, _enc, cb) { cb(); } });

    child.stdout = stdoutStream;
    child.stderr = stderrStream;
    child.stdin = stdinStream;
    child.killed = false;
    child.kill = () => { child.killed = true; return true; };
    child.pid = 12345;

    const emit = () => {
      if (opts.error) {
        child.emit("error", opts.error);
        return;
      }
      if (opts.stdout) stdoutStream.push(Buffer.from(opts.stdout));
      stdoutStream.push(null);
      if (opts.stderr) stderrStream.push(Buffer.from(opts.stderr));
      stderrStream.push(null);
      child.emit("close", opts.exitCode ?? 0);
    };

    if (opts.delay) {
      setTimeout(emit, opts.delay);
    } else {
      // Use setImmediate so listeners are attached before emit
      setImmediate(emit);
    }

    return child;
  };
}

// ─── probeToolScript ─────────────────────────────────────

describe("probeToolScript", () => {
  it("parses valid JSON describe output", async () => {
    const json = JSON.stringify({
      name: "run-tests",
      description: "Run the test suite",
      inputSchema: {
        type: "object",
        properties: { filter: { type: "string" } },
      },
    });

    const result = await probeToolScript("/fake/script", createMockSpawn({ stdout: json }));
    assert.ok(result);
    assert.equal(result.format, "json");
    assert.equal(result.spec.name, "run-tests");
    assert.equal(result.spec.description, "Run the test suite");
    assert.deepEqual(result.spec.inputSchema, {
      type: "object",
      properties: { filter: { type: "string" } },
    });
  });

  it("defaults inputSchema when missing", async () => {
    const json = JSON.stringify({
      name: "simple",
      description: "A simple tool",
    });

    const result = await probeToolScript("/fake/script", createMockSpawn({ stdout: json }));
    assert.ok(result);
    assert.deepEqual(result.spec.inputSchema, {
      type: "object",
      properties: {},
      required: [],
    });
  });

  it("converts legacy args format to inputSchema", async () => {
    const json = JSON.stringify({
      name: "deploy",
      description: "Deploy the app",
      args: {
        env: ["string", "Target environment"],
        force: { type: "boolean", description: "Force deploy" },
      },
    });

    const result = await probeToolScript("/fake/script", createMockSpawn({ stdout: json }));
    assert.ok(result);
    assert.equal(result.format, "json");
    const schema = result.spec.inputSchema as Record<string, unknown>;
    const props = schema.properties as Record<string, { type: string; description: string }>;
    assert.equal(props.env.type, "string");
    assert.equal(props.env.description, "Target environment");
    assert.equal(props.force.type, "boolean");
    assert.equal(props.force.description, "Force deploy");
  });

  it("returns null on non-zero exit code", async () => {
    const result = await probeToolScript(
      "/fake/script",
      createMockSpawn({ stdout: "", exitCode: 1, stderr: "fail" }),
    );
    assert.equal(result, null);
  });

  it("returns null on spawn error", async () => {
    const result = await probeToolScript(
      "/fake/script",
      createMockSpawn({ error: new Error("ENOENT") }),
    );
    assert.equal(result, null);
  });

  it("returns null on timeout", async () => {
    // Delay longer than timeout
    const result = await probeToolScript(
      "/fake/script",
      createMockSpawn({ stdout: "{}", delay: 500 }),
      100, // 100ms timeout
    );
    assert.equal(result, null);
  });

  it("falls back to legacy text format when JSON parse fails", async () => {
    const textOutput = [
      "name: my-tool",
      "description: Does stuff",
      "query: string The search query",
    ].join("\n");

    const result = await probeToolScript("/fake/script", createMockSpawn({ stdout: textOutput }));
    assert.ok(result);
    assert.equal(result.format, "text");
    assert.equal(result.spec.name, "my-tool");
    assert.equal(result.spec.description, "Does stuff");
  });

  it("returns null on unparseable output", async () => {
    const result = await probeToolScript(
      "/fake/script",
      createMockSpawn({ stdout: "random garbage output" }),
    );
    assert.equal(result, null);
  });
});

// ─── parseLegacyTextFormat (逆向: $5R) ──────────────────

describe("parseLegacyTextFormat", () => {
  it("parses name, description, and parameters", () => {
    const text = [
      "name: my-tool",
      "description: A useful tool",
      "query: string The search query",
      "limit: number Max results",
    ].join("\n");

    const result = parseLegacyTextFormat(text);
    assert.ok(result);
    assert.equal(result.name, "my-tool");
    assert.equal(result.description, "A useful tool");
    assert.equal(result.parameters.query.type, "string");
    assert.equal(result.parameters.query.description, "The search query");
    assert.equal(result.parameters.limit.type, "number");
  });

  it("returns null for empty input", () => {
    assert.equal(parseLegacyTextFormat(""), null);
    assert.equal(parseLegacyTextFormat("  \n  "), null);
  });

  it("returns null when no name is present", () => {
    const text = "description: No name here\nquery: string A query";
    assert.equal(parseLegacyTextFormat(text), null);
  });

  it("handles optional parameters with ? suffix", () => {
    const text = "name: test\nfilter: string? Optional filter";
    const result = parseLegacyTextFormat(text);
    assert.ok(result);
    assert.equal(result.parameters.filter.optional, true);
    assert.equal(result.parameters.filter.type, "string");
  });

  it("handles optional keyword in description", () => {
    const text = "name: test\nfilter: string optional The filter";
    const result = parseLegacyTextFormat(text);
    assert.ok(result);
    assert.equal(result.parameters.filter.optional, true);
  });

  it("defaults to string type when type is not recognized", () => {
    const text = "name: test\narg: some description here";
    const result = parseLegacyTextFormat(text);
    assert.ok(result);
    assert.equal(result.parameters.arg.type, "string");
    assert.equal(result.parameters.arg.description, "some description here");
  });

  it("handles multiple description lines", () => {
    const text = "name: test\ndescription: Line one\ndescription: Line two";
    const result = parseLegacyTextFormat(text);
    assert.ok(result);
    assert.equal(result.description, "Line one\nLine two");
  });
});

// ─── textSpecToToolboxSpec (逆向: v5R) ──────────────────

describe("textSpecToToolboxSpec", () => {
  it("converts parameters to inputSchema properties", () => {
    const spec = textSpecToToolboxSpec(
      {
        name: "test",
        description: "Test tool",
        parameters: {
          query: { type: "string", description: "search", optional: false },
          count: { type: "number", description: "limit", optional: true },
        },
      },
      "/path/to/script",
    );

    assert.equal(spec.name, "test");
    const schema = spec.inputSchema as {
      type: string;
      properties: Record<string, { type: string }>;
      required: string[];
      additionalProperties: boolean;
    };
    assert.equal(schema.type, "object");
    assert.equal(schema.properties.query.type, "string");
    assert.equal(schema.properties.count.type, "number");
    assert.deepEqual(schema.required, ["query"]);
    assert.equal(schema.additionalProperties, false);
  });

  it("maps type names correctly", () => {
    const spec = textSpecToToolboxSpec(
      {
        name: "t",
        description: "",
        parameters: {
          a: { type: "boolean", description: "", optional: false },
          b: { type: "integer", description: "", optional: false },
          c: { type: "array", description: "", optional: false },
          d: { type: "object", description: "", optional: false },
          e: { type: "UNKNOWN", description: "", optional: false },
        },
      },
      "/p",
    );

    const props = (spec.inputSchema as Record<string, unknown>).properties as Record<
      string,
      { type: string }
    >;
    assert.equal(props.a.type, "boolean");
    assert.equal(props.b.type, "integer");
    assert.equal(props.c.type, "array");
    assert.equal(props.d.type, "object");
    assert.equal(props.e.type, "string"); // fallback
  });
});

// ─── convertArgToSchema (逆向: E5R) ────────────────────

describe("convertArgToSchema", () => {
  it("handles null/undefined/boolean as generic string", () => {
    for (const val of [null, undefined, true, false]) {
      const result = convertArgToSchema(val);
      assert.equal(result.type, "string");
      assert.equal(result.description, "generic argument - use a sensible value");
    }
  });

  it("handles empty array as generic string", () => {
    const result = convertArgToSchema([]);
    assert.equal(result.type, "string");
  });

  it("handles single-element array as description", () => {
    const result = convertArgToSchema(["The search query"]);
    assert.equal(result.type, "string");
    assert.equal(result.description, "The search query");
  });

  it("handles two-element array as [type, description]", () => {
    const result = convertArgToSchema(["boolean", "Enable verbose mode"]);
    assert.equal(result.type, "boolean");
    assert.equal(result.description, "Enable verbose mode");
  });

  it("handles object with type and description", () => {
    const result = convertArgToSchema({ type: "number", description: "Max count" });
    assert.equal(result.type, "number");
    assert.equal(result.description, "Max count");
  });

  it("defaults missing type in object to string", () => {
    const result = convertArgToSchema({ description: "A thing" });
    assert.equal(result.type, "string");
    assert.equal(result.description, "A thing");
  });

  it("defaults empty object to generic string", () => {
    const result = convertArgToSchema({});
    assert.equal(result.type, "string");
    assert.equal(result.description, "generic argument - use a sensible value");
  });
});
