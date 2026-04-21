/**
 * MCP extended command handler tests
 *
 * Tests for `flitter mcp doctor`, `mcp approve`, `mcp oauth login/logout`
 */

import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import type { McpApproveDeps, McpExtendedDeps } from "../mcp-extended";
import {
  handleMcpApprove,
  handleMcpDoctor,
  handleMcpOAuthLogin,
  handleMcpOAuthLogout,
} from "../mcp-extended";

// ─── Output capture ─────────────────────────────────────

function captureOutput() {
  const stdout: string[] = [];
  const stderr: string[] = [];
  const origStdoutWrite = process.stdout.write;
  const origStderrWrite = process.stderr.write;

  process.stdout.write = ((chunk: string | Uint8Array) => {
    stdout.push(String(chunk));
    return true;
  }) as typeof process.stdout.write;

  process.stderr.write = ((chunk: string | Uint8Array) => {
    stderr.push(String(chunk));
    return true;
  }) as typeof process.stderr.write;

  return {
    stdout,
    stderr,
    restore() {
      process.stdout.write = origStdoutWrite;
      process.stderr.write = origStderrWrite;
    },
  };
}

// ─── handleMcpDoctor ────────────────────────────────────

describe("handleMcpDoctor", () => {
  let output: ReturnType<typeof captureOutput>;

  beforeEach(() => {
    output = captureOutput();
    process.exitCode = undefined;
  });

  afterEach(() => {
    output.restore();
    process.exitCode = undefined;
  });

  it("should report no servers when none configured", async () => {
    await handleMcpDoctor({
      configService: {
        get: () => ({ settings: {} }),
      } as unknown as McpExtendedDeps["configService"],
    });
    expect(output.stdout.join("")).toContain("No MCP servers configured");
  });

  it("should list configured servers", async () => {
    await handleMcpDoctor({
      configService: {
        get: () => ({
          settings: {
            "mcp.servers": {
              "test-server": { command: "node", args: ["server.js"] },
              "http-server": { url: "https://example.com/mcp" },
            },
          },
        }),
      } as unknown as McpExtendedDeps["configService"],
    });
    const out = output.stdout.join("");
    expect(out).toContain("test-server");
    expect(out).toContain("stdio");
    expect(out).toContain("http-server");
    expect(out).toContain("HTTP");
  });
});

// ─── handleMcpApprove ───────────────────────────────────

describe("handleMcpApprove", () => {
  let output: ReturnType<typeof captureOutput>;

  beforeEach(() => {
    output = captureOutput();
    process.exitCode = undefined;
  });

  afterEach(() => {
    output.restore();
    process.exitCode = undefined;
  });

  it("should approve a configured server", async () => {
    const updateFn = mock(() => {});
    await handleMcpApprove(
      {
        configService: {
          get: () => ({
            settings: {
              "mcp.servers": { "my-server": { command: "node" } },
            },
          }),
          updateSettings: updateFn,
        } as unknown as McpApproveDeps["configService"],
      },
      "my-server",
    );
    expect(output.stdout.join("")).toContain("approved");
    expect(updateFn).toHaveBeenCalled();
  });

  it("should error for non-configured server", async () => {
    await handleMcpApprove(
      {
        configService: {
          get: () => ({ settings: { "mcp.servers": {} } }),
        } as unknown as McpApproveDeps["configService"],
      },
      "nonexistent",
    );
    expect(process.exitCode).toBe(1);
    expect(output.stderr.join("")).toContain("not configured");
  });

  it("should report already trusted", async () => {
    await handleMcpApprove(
      {
        configService: {
          get: () => ({
            settings: {
              "mcp.servers": { "my-server": { command: "node" } },
              "mcp.trustedServers": ["my-server"],
            },
          }),
        } as unknown as McpApproveDeps["configService"],
      },
      "my-server",
    );
    expect(output.stdout.join("")).toContain("already trusted");
  });
});

// ─── handleMcpOAuthLogin ────────────────────────────────

describe("handleMcpOAuthLogin", () => {
  let output: ReturnType<typeof captureOutput>;

  beforeEach(() => {
    output = captureOutput();
    process.exitCode = undefined;
  });

  afterEach(() => {
    output.restore();
    process.exitCode = undefined;
  });

  it("should error for non-configured server", async () => {
    await handleMcpOAuthLogin(
      {
        configService: {
          get: () => ({ settings: { "mcp.servers": {} } }),
        } as unknown as McpExtendedDeps["configService"],
      },
      "nonexistent",
    );
    expect(process.exitCode).toBe(1);
    expect(output.stderr.join("")).toContain("not configured");
  });

  it("should error for non-URL server", async () => {
    await handleMcpOAuthLogin(
      {
        configService: {
          get: () => ({
            settings: {
              "mcp.servers": { "my-server": { command: "node" } },
            },
          }),
        } as unknown as McpExtendedDeps["configService"],
      },
      "my-server",
    );
    expect(process.exitCode).toBe(1);
    expect(output.stderr.join("")).toContain("not URL-based");
  });

  it("should suggest interactive mode for URL server without manager", async () => {
    await handleMcpOAuthLogin(
      {
        configService: {
          get: () => ({
            settings: {
              "mcp.servers": { "my-server": { url: "https://example.com" } },
            },
          }),
        } as unknown as McpExtendedDeps["configService"],
      },
      "my-server",
    );
    expect(output.stdout.join("")).toContain("interactive mode");
  });
});

// ─── handleMcpOAuthLogout ───────────────────────────────

describe("handleMcpOAuthLogout", () => {
  let output: ReturnType<typeof captureOutput>;

  beforeEach(() => {
    output = captureOutput();
    process.exitCode = undefined;
  });

  afterEach(() => {
    output.restore();
    process.exitCode = undefined;
  });

  it("should clear OAuth tokens for configured server", async () => {
    const updateFn = mock(() => {});
    await handleMcpOAuthLogout(
      {
        configService: {
          get: () => ({
            settings: {
              "mcp.servers": { "my-server": { url: "https://example.com" } },
            },
          }),
          updateSettings: updateFn,
        } as unknown as McpExtendedDeps["configService"],
      },
      "my-server",
    );
    expect(output.stdout.join("")).toContain("tokens cleared");
    expect(updateFn).toHaveBeenCalled();
  });

  it("should error for non-configured server", async () => {
    await handleMcpOAuthLogout(
      {
        configService: {
          get: () => ({ settings: { "mcp.servers": {} } }),
        } as unknown as McpExtendedDeps["configService"],
      },
      "nonexistent",
    );
    expect(process.exitCode).toBe(1);
    expect(output.stderr.join("")).toContain("not configured");
  });
});
