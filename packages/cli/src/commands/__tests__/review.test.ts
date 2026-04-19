/**
 * Review command handler tests
 *
 * Tests for the `flitter review` command handler
 */

import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import type { ServiceContainer } from "@flitter/flitter";
import type { CliContext } from "../../context";
import { handleReview } from "../review";

// ─── Mock ServiceContainer ────────────────────────────────

function createMockContainer(overrides?: Partial<Record<string, unknown>>): ServiceContainer {
  const mockWorker = {
    events$: { subscribe: () => ({ unsubscribe: () => {} }) },
    runInference: mock(async () => {}),
    cancelInference: mock(() => {}),
  };

  return {
    configService: {
      get: () => ({ settings: {} }),
      updateSettings: mock(() => {}),
    },
    threadStore: {
      setCachedThread: mock(() => {}),
      getThreadSnapshot: () => ({
        id: "test-thread",
        v: 1,
        messages: [
          { role: "user", content: [{ type: "text", text: "review this" }] },
          {
            role: "assistant",
            content: [{ type: "text", text: "Code looks good. No issues found." }],
          },
        ],
        relationships: [],
      }),
    },
    createThreadWorker: () => mockWorker,
    asyncDispose: mock(async () => {}),
    ...overrides,
  } as unknown as ServiceContainer;
}

const ctx: CliContext = {
  executeMode: true,
  isTTY: false,
  headless: false,
  streamJson: false,
  verbose: false,
  print: false,
  pipe: false,
};

describe("handleReview", () => {
  let stdoutChunks: string[];
  let stderrChunks: string[];
  let origStdout: typeof process.stdout.write;
  let origStderr: typeof process.stderr.write;

  beforeEach(() => {
    stdoutChunks = [];
    stderrChunks = [];
    origStdout = process.stdout.write;
    origStderr = process.stderr.write;
    process.stdout.write = ((chunk: string) => {
      stdoutChunks.push(String(chunk));
      return true;
    }) as typeof process.stdout.write;
    process.stderr.write = ((chunk: string) => {
      stderrChunks.push(String(chunk));
      return true;
    }) as typeof process.stderr.write;
    process.exitCode = undefined;
  });

  afterEach(() => {
    process.stdout.write = origStdout;
    process.stderr.write = origStderr;
    process.exitCode = undefined;
  });

  it("should review provided diff text", async () => {
    const container = createMockContainer();
    await handleReview(container, ctx, { diff: "diff --git a/file.ts\n+new line" });

    const out = stdoutChunks.join("");
    expect(out).toContain("Code looks good");
    expect(container.asyncDispose).toHaveBeenCalled();
  });

  it("should output JSON format when requested", async () => {
    const container = createMockContainer();
    await handleReview(container, ctx, {
      diff: "diff --git a/file.ts\n+new line",
      format: "json",
    });

    const out = stdoutChunks.join("");
    const parsed = JSON.parse(out);
    expect(parsed.review).toContain("Code looks good");
  });

  it("should output markdown format when requested", async () => {
    const container = createMockContainer();
    await handleReview(container, ctx, {
      diff: "diff --git a/file.ts\n+new line",
      format: "markdown",
    });

    const out = stdoutChunks.join("");
    expect(out).toContain("# Code Review");
    expect(out).toContain("Code looks good");
  });

  it("should error when no diff provided and not in git repo", async () => {
    const container = createMockContainer();
    // Pass empty diff and let git fail
    await handleReview(container, ctx, { diff: "" });

    expect(process.exitCode).toBe(1);
    expect(stderrChunks.join("")).toContain("No changes to review");
  });
});
