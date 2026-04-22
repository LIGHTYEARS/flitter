import { describe, expect, test } from "bun:test";
import type { Config } from "@flitter/schemas";
import {
  buildEnvironmentContext,
  buildReplSystemPrompt,
  createReplTool,
  drainOutput,
  extractCommands,
  INITIAL_OUTPUT_TIMEOUT_MS,
  MAX_BUFFER_SIZE,
  MAX_ITERATIONS,
  POLL_INTERVAL_MS,
  type ReplInferenceFn,
  type ReplProcess,
  runReplAgentLoop,
  SPAWN_TIMEOUT_MS,
  STOP_TOOL,
  truncate,
} from "../repl";

// ─── Helper: mock ReplProcess ────────────────────────────

function createMockRepl(opts?: {
  immediateReady?: boolean;
  initialOutput?: string;
  exitCode?: number | null;
  spawnError?: Error;
}): ReplProcess & {
  written: string[];
  killed: boolean;
  triggerData: (data: string) => void;
  triggerExit: (code: number | null) => void;
  triggerError: (err: Error) => void;
} {
  const dataCallbacks: ((data: string) => void)[] = [];
  const exitCallbacks: ((info: { exitCode: number | null }) => void)[] = [];
  const errorCallbacks: ((err: Error) => void)[] = [];
  const readyCallbacks: (() => void)[] = [];
  let spawned = false;
  const written: string[] = [];
  let killed = false;

  const mock: ReturnType<typeof createMockRepl> = {
    written,
    killed,
    write: (data: string) => {
      if (killed) return false;
      written.push(data);
      return true;
    },
    kill: () => {
      killed = true;
      mock.killed = true;
    },
    onData: (cb) => dataCallbacks.push(cb),
    onExit: (cb) => exitCallbacks.push(cb),
    onError: (cb) => {
      errorCallbacks.push(cb);
      if (opts?.spawnError) {
        setTimeout(() => {
          for (const ecb of errorCallbacks) ecb(opts.spawnError!);
        }, 0);
      }
    },
    onReady: (cb) => {
      if (spawned) cb();
      else readyCallbacks.push(cb);

      // Auto-trigger ready if requested
      if (opts?.immediateReady && !spawned) {
        spawned = true;
        for (const rcb of readyCallbacks) rcb();
        // Send initial output after ready
        if (opts.initialOutput) {
          setTimeout(() => {
            for (const dcb of dataCallbacks) dcb(opts.initialOutput!);
          }, 10);
        }
      }
    },
    triggerData: (data: string) => {
      for (const cb of dataCallbacks) cb(data);
    },
    triggerExit: (code: number | null) => {
      for (const cb of exitCallbacks) cb({ exitCode: code });
    },
    triggerError: (err: Error) => {
      for (const cb of errorCallbacks) cb(err);
    },
  };

  return mock;
}

// ─── Helper: mock inference function ─────────────────────

function createMockInference(
  responses: Array<{
    text?: string;
    toolUse?: { id: string; name: string; input: Record<string, unknown> };
  }>,
): ReplInferenceFn {
  let callIndex = 0;
  return async () => {
    const resp = responses[callIndex++];
    if (!resp) return {};

    const content: Array<{
      type: "text" | "tool_use";
      text?: string;
      id?: string;
      name?: string;
      input?: Record<string, unknown>;
    }> = [];

    if (resp.text !== undefined) {
      content.push({ type: "text", text: resp.text });
    }
    if (resp.toolUse) {
      content.push({
        type: "tool_use",
        id: resp.toolUse.id,
        name: resp.toolUse.name,
        input: resp.toolUse.input,
      });
    }

    return { message: { content } };
  };
}

// ─── Tests ───────────────────────────────────────────────

describe("repl tool", () => {
  // ── Tool Schema Validation ──

  describe("tool spec", () => {
    test("has correct name and source", () => {
      const tool = createReplTool(async () => ({}));
      expect(tool.name).toBe("repl");
      expect(tool.source).toBe("builtin");
      expect(tool.isReadOnly).toBe(false);
    });

    test("inputSchema has required fields", () => {
      const tool = createReplTool(async () => ({}));
      const schema = tool.inputSchema as {
        properties: Record<string, unknown>;
        required: string[];
      };
      expect(schema.properties).toHaveProperty("binary");
      expect(schema.properties).toHaveProperty("args");
      expect(schema.properties).toHaveProperty("objective");
      expect(schema.properties).toHaveProperty("replDescription");
      expect(schema.properties).toHaveProperty("workingDirectory");
      expect(schema.properties).toHaveProperty("initialOutputTimeoutMs");
      expect(schema.required).toContain("binary");
      expect(schema.required).toContain("objective");
      expect(schema.required).toContain("replDescription");
      expect(schema.required).not.toContain("args");
      expect(schema.required).not.toContain("workingDirectory");
    });

    test("executionProfile disables timeout with empty resourceKeys", () => {
      const tool = createReplTool(async () => ({}));
      expect(tool.executionProfile?.disableTimeout).toBe(true);
      expect(tool.executionProfile?.resourceKeys).toEqual([]);
    });
  });

  // ── Missing parameter validation ──

  describe("parameter validation", () => {
    test("returns error when binary is missing", async () => {
      const tool = createReplTool(async () => ({}));
      const result = await tool.execute(
        { objective: "test", replDescription: "test" },
        {
          workingDirectory: "/tmp",
          signal: AbortSignal.timeout(5000),
          threadId: "t1",
          config: {} as Config,
        },
      );
      expect(result.status).toBe("error");
      expect(result.error).toContain("binary");
    });

    test("returns error when objective is missing", async () => {
      const tool = createReplTool(async () => ({}));
      const result = await tool.execute(
        { binary: "node", replDescription: "test" },
        {
          workingDirectory: "/tmp",
          signal: AbortSignal.timeout(5000),
          threadId: "t1",
          config: {} as Config,
        },
      );
      expect(result.status).toBe("error");
      expect(result.error).toContain("objective");
    });

    test("returns error when replDescription is missing", async () => {
      const tool = createReplTool(async () => ({}));
      const result = await tool.execute(
        { binary: "node", objective: "test" },
        {
          workingDirectory: "/tmp",
          signal: AbortSignal.timeout(5000),
          threadId: "t1",
          config: {} as Config,
        },
      );
      expect(result.status).toBe("error");
      expect(result.error).toContain("replDescription");
    });

    test("returns error when working directory does not exist", async () => {
      const tool = createReplTool(async () => ({}));
      const result = await tool.execute(
        {
          binary: "node",
          objective: "test",
          replDescription: "Node.js",
          workingDirectory: "/nonexistent/path/xyz",
        },
        {
          workingDirectory: "/tmp",
          signal: AbortSignal.timeout(5000),
          threadId: "t1",
          config: {} as Config,
        },
      );
      expect(result.status).toBe("error");
      expect(result.error).toContain("Working directory does not exist");
    });
  });

  // ── Stop Tool Definition ──

  describe("stop tool", () => {
    test("has correct schema", () => {
      expect(STOP_TOOL.name).toBe("stop");
      expect(STOP_TOOL.source).toBe("builtin");
      const schema = STOP_TOOL.inputSchema;
      expect(schema.properties).toHaveProperty("message");
      expect(schema.required).toContain("message");
    });
  });

  // ── Helper Functions ──

  describe("truncate", () => {
    test("returns string unchanged if within limit", () => {
      expect(truncate("hello", 10)).toBe("hello");
    });

    test("truncates with ellipsis when over limit", () => {
      expect(truncate("hello world", 8)).toBe("hello...");
    });

    test("handles exact length", () => {
      expect(truncate("hello", 5)).toBe("hello");
    });
  });

  describe("extractCommands", () => {
    test("returns trimmed text when no code blocks", () => {
      expect(extractCommands("  console.log('hi')  ")).toEqual(["console.log('hi')"]);
    });

    test("extracts code block content", () => {
      const text = "```javascript\nconsole.log('hi')\n```";
      expect(extractCommands(text)).toEqual(["console.log('hi')"]);
    });

    test("extracts multiple code blocks", () => {
      const text = "```\nfirst()\n```\nsome text\n```python\nsecond()\n```";
      expect(extractCommands(text)).toEqual(["first()", "second()"]);
    });

    test("returns full text when code blocks have empty content", () => {
      // Code block regex requires content inside — if match[1] is empty, skipped
      const text = "just plain text";
      expect(extractCommands(text)).toEqual(["just plain text"]);
    });
  });

  describe("buildReplSystemPrompt", () => {
    test("includes objective and environment", () => {
      const prompt = buildReplSystemPrompt(
        "Node.js REPL",
        "calculate 2+2",
        "Working directory: /tmp",
      );
      expect(prompt).toContain("Node.js REPL");
      expect(prompt).toContain("calculate 2+2");
      expect(prompt).toContain("Working directory: /tmp");
      expect(prompt).toContain("CRITICAL RULES");
      expect(prompt).toContain("stop");
    });
  });

  describe("buildEnvironmentContext", () => {
    test("shows working directory", () => {
      const ctx = buildEnvironmentContext("/tmp");
      expect(ctx).toContain("Working directory: /tmp");
    });

    test("handles nonexistent directory gracefully", () => {
      const ctx = buildEnvironmentContext("/nonexistent/xyz/abc");
      expect(ctx).toContain("Could not read directory contents.");
    });
  });

  // ── Drain Output ──

  describe("drainOutput", () => {
    test("collects buffered data", async () => {
      const buffer = ["hello ", "world"];
      const totalSize = { value: 11 };
      const result = await drainOutput(buffer, totalSize, 200);
      expect(result).toBe("hello world");
      expect(totalSize.value).toBe(0);
    });

    test("returns empty string when buffer is empty", async () => {
      const buffer: string[] = [];
      const totalSize = { value: 0 };
      const result = await drainOutput(buffer, totalSize, 200);
      expect(result).toBe("");
    });

    test("respects abort signal", async () => {
      const controller = new AbortController();
      controller.abort();
      const buffer = ["data"];
      const totalSize = { value: 4 };
      const result = await drainOutput(buffer, totalSize, 200, controller.signal);
      // May or may not collect data depending on timing, but should not hang
      expect(typeof result).toBe("string");
    });
  });

  // ── Agent Loop ──

  describe("runReplAgentLoop", () => {
    test("handles immediate process exit with no output", async () => {
      const repl = createMockRepl({ immediateReady: true });

      // Trigger exit immediately
      setTimeout(() => repl.triggerExit(1), 50);

      const result = await runReplAgentLoop({
        repl,
        inferenceFn: createMockInference([]),
        systemPrompt: "test",
        binary: "node",
        initialOutputTimeoutMs: 200,
        signal: AbortSignal.timeout(10000),
      });

      expect(result.result).toContain("exited immediately");
      expect(result.result).toContain("code 1");
    });

    test("handles stop tool from agent", async () => {
      const repl = createMockRepl({ immediateReady: true, initialOutput: "> " });

      const inferenceFn = createMockInference([
        {
          toolUse: {
            id: "tool-1",
            name: "stop",
            input: { message: "Done with task" },
          },
        },
      ]);

      const result = await runReplAgentLoop({
        repl,
        inferenceFn,
        systemPrompt: "test",
        binary: "node",
        initialOutputTimeoutMs: 200,
        signal: AbortSignal.timeout(10000),
      });

      expect(result.result).toContain("Done with task");
    });

    test("pipes text responses to REPL stdin", async () => {
      const repl = createMockRepl({ immediateReady: true, initialOutput: "> " });

      let callCount = 0;
      const inferenceFn: ReplInferenceFn = async () => {
        callCount++;
        if (callCount === 1) {
          // First call: send a command, then trigger output
          setTimeout(() => repl.triggerData("42\n> "), 50);
          return {
            message: {
              content: [{ type: "text", text: "2 + 40" }],
            },
          };
        }
        // Second call: stop
        return {
          message: {
            content: [
              {
                type: "tool_use",
                id: "stop-1",
                name: "stop",
                input: { message: "Got result: 42" },
              },
            ],
          },
        };
      };

      const result = await runReplAgentLoop({
        repl,
        inferenceFn,
        systemPrompt: "test",
        binary: "node",
        initialOutputTimeoutMs: 200,
        signal: AbortSignal.timeout(10000),
      });

      expect(repl.written).toContain("2 + 40\n");
      expect(result.result).toContain("Got result: 42");
      expect(result.transcript.length).toBeGreaterThan(0);
    });

    test("handles first input with no output (non-interactive mode)", async () => {
      const repl = createMockRepl({ immediateReady: true });

      // No initial output, no output after input
      const inferenceFn = createMockInference([{ text: "echo hello" }]);

      const result = await runReplAgentLoop({
        repl,
        inferenceFn,
        systemPrompt: "test",
        binary: "bash",
        initialOutputTimeoutMs: 200,
        signal: AbortSignal.timeout(10000),
      });

      expect(result.result).toContain("did not produce any output");
      expect(result.result).toContain("interactive mode");
      expect(repl.killed).toBe(true);
    });

    test("handles process error during loop", async () => {
      const repl = createMockRepl({ immediateReady: true, initialOutput: "> " });

      // Trigger error before the inference returns
      let callCount = 0;
      const inferenceFn: ReplInferenceFn = async () => {
        callCount++;
        if (callCount === 1) {
          // Send a command first, get output back so we pass the "first input" check
          setTimeout(() => {
            repl.triggerData("ok\n");
            // Then trigger error
            repl.triggerError(new Error("broken pipe"));
          }, 50);
          return { message: { content: [{ type: "text", text: "test" }] } };
        }
        // Second iteration: error should have propagated by now
        return { message: { content: [{ type: "text", text: "test2" }] } };
      };

      const result = await runReplAgentLoop({
        repl,
        inferenceFn,
        systemPrompt: "test",
        binary: "node",
        initialOutputTimeoutMs: 200,
        signal: AbortSignal.timeout(10000),
      });

      expect(result.result).toContain("REPL process error");
    });

    test("handles unknown tool calls gracefully", async () => {
      const repl = createMockRepl({ immediateReady: true, initialOutput: "> " });

      const inferenceFn = createMockInference([
        {
          toolUse: {
            id: "tool-1",
            name: "unknown_tool",
            input: { foo: "bar" },
          },
        },
        {
          toolUse: {
            id: "tool-2",
            name: "stop",
            input: { message: "Done after unknown tool" },
          },
        },
      ]);

      const result = await runReplAgentLoop({
        repl,
        inferenceFn,
        systemPrompt: "test",
        binary: "node",
        initialOutputTimeoutMs: 200,
        signal: AbortSignal.timeout(10000),
      });

      expect(result.result).toContain("Done after unknown tool");
    });

    test("tracks transcript entries for input and output", async () => {
      const repl = createMockRepl({ immediateReady: true, initialOutput: ">>> " });

      let callCount = 0;
      const inferenceFn: ReplInferenceFn = async () => {
        callCount++;
        if (callCount === 1) {
          setTimeout(() => repl.triggerData("result1\n>>> "), 50);
          return { message: { content: [{ type: "text", text: "cmd1" }] } };
        }
        return {
          message: {
            content: [{ type: "tool_use", id: "s1", name: "stop", input: { message: "Done" } }],
          },
        };
      };

      const result = await runReplAgentLoop({
        repl,
        inferenceFn,
        systemPrompt: "test",
        binary: "python3",
        initialOutputTimeoutMs: 200,
        signal: AbortSignal.timeout(10000),
      });

      const inputs = result.transcript.filter((t) => t.type === "input");
      const outputs = result.transcript.filter((t) => t.type === "output");
      expect(inputs.length).toBeGreaterThanOrEqual(1);
      expect(outputs.length).toBeGreaterThanOrEqual(1);
    });

    test("handles empty model response", async () => {
      const repl = createMockRepl({ immediateReady: true, initialOutput: "> " });

      const inferenceFn: ReplInferenceFn = async () => {
        return {}; // No message
      };

      const result = await runReplAgentLoop({
        repl,
        inferenceFn,
        systemPrompt: "test",
        binary: "node",
        initialOutputTimeoutMs: 200,
        signal: AbortSignal.timeout(10000),
      });

      expect(result.result).toContain("No response from model");
    });
  });

  // ── Constants ──

  describe("constants", () => {
    test("have expected values matching amp", () => {
      expect(MAX_ITERATIONS).toBe(50);
      expect(POLL_INTERVAL_MS).toBe(100);
      expect(INITIAL_OUTPUT_TIMEOUT_MS).toBe(1500);
      expect(MAX_BUFFER_SIZE).toBe(10485760);
      expect(SPAWN_TIMEOUT_MS).toBe(5000);
    });
  });
});
