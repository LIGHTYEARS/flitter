/**
 * @flitter/llm — MCP Stdio Transport
 *
 * Spawns a child process and communicates via stdin/stdout using
 * newline-delimited JSON-RPC. Direct translation from reversed TDT.
 */

import { spawn, type ChildProcess } from "node:child_process";
import { ReadBuffer } from "./read-buffer";
import { serializeMessage } from "../protocol";
import type { MCPTransport, JSONRPCMessage } from "../types";

export interface StdioTransportOptions {
  command: string;
  args?: string[];
  env?: Record<string, string>;
  cwd?: string;
}

/**
 * MCP transport over stdio (stdin/stdout) to a child process.
 * The child process must read JSON-RPC from stdin and write responses to stdout.
 */
export class StdioTransport implements MCPTransport {
  private _process: ChildProcess | undefined;
  private _readBuffer = new ReadBuffer();
  private _serverParams: StdioTransportOptions;

  onmessage?: (message: JSONRPCMessage) => void;
  onclose?: () => void;
  onerror?: (error: Error) => void;

  constructor(options: StdioTransportOptions) {
    this._serverParams = options;
  }

  async start(): Promise<void> {
    if (this._process) {
      throw new Error("StdioTransport already started!");
    }

    return new Promise<void>((resolve, reject) => {
      const env = { ...process.env, ...this._serverParams.env };

      this._process = spawn(
        this._serverParams.command,
        this._serverParams.args ?? [],
        {
          env,
          stdio: ["pipe", "pipe", "pipe"],
          shell: false,
          cwd: this._serverParams.cwd,
        },
      );

      this._process.on("error", (err) => {
        reject(err);
        this.onerror?.(err);
      });

      this._process.on("spawn", () => {
        resolve();
      });

      this._process.on("close", () => {
        this._process = undefined;
        this.onclose?.();
      });

      this._process.stdin?.on("error", (err) => {
        this.onerror?.(err);
      });

      this._process.stdout?.on("data", (chunk: Buffer) => {
        this._readBuffer.append(chunk);
        this._processReadBuffer();
      });

      this._process.stdout?.on("error", (err) => {
        this.onerror?.(err);
      });
    });
  }

  /** Get the child process PID, or null if not running */
  get pid(): number | null {
    return this._process?.pid ?? null;
  }

  /** Get the stderr stream of the child process */
  get stderr(): NodeJS.ReadableStream | null {
    return this._process?.stderr ?? null;
  }

  private _processReadBuffer(): void {
    while (true) {
      try {
        const message = this._readBuffer.readMessage();
        if (message === null) break;
        this.onmessage?.(message);
      } catch (err) {
        this.onerror?.(err instanceof Error ? err : new Error(String(err)));
      }
    }
  }

  async send(message: JSONRPCMessage): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      if (!this._process?.stdin) {
        reject(new Error("Not connected"));
        return;
      }

      const data = serializeMessage(message);

      if (this._process.stdin.write(data)) {
        resolve();
      } else {
        this._process.stdin.once("drain", resolve);
      }
    });
  }

  async close(): Promise<void> {
    if (this._process) {
      const proc = this._process;
      this._process = undefined;

      const closed = new Promise<void>((resolve) => {
        proc.once("close", () => resolve());
      });

      // Step 1: Close stdin gracefully
      try {
        proc.stdin?.end();
      } catch {
        // ignore
      }

      // Step 2: Wait up to 2s for graceful exit
      await Promise.race([closed, new Promise<void>((r) => setTimeout(r, 2000))]);

      // Step 3: SIGTERM if still running
      if (proc.exitCode === null) {
        try {
          proc.kill("SIGTERM");
        } catch {
          // ignore
        }
        await Promise.race([closed, new Promise<void>((r) => setTimeout(r, 2000))]);
      }

      // Step 4: SIGKILL if still running
      if (proc.exitCode === null) {
        try {
          proc.kill("SIGKILL");
        } catch {
          // ignore
        }
      }
    }

    this._readBuffer.clear();
  }
}
