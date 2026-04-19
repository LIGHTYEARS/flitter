/**
 * @flitter/agent-core — PluginHost: manages a single plugin subprocess
 *
 * 逆向: amp-cli-reversed/chunk-005.js:145495-145772 (vaT class)
 * 逆向: amp-cli-reversed/chunk-002.js:26937-27067 ($aT base class — sendRequest, requestToolCall, etc.)
 * 逆向: amp-cli-reversed/chunk-002.js:27067-27078 (nuT/NWR — message serialization/deserialization)
 *
 * Manages a single plugin subprocess communicating via JSON-RPC over stdin/stdout.
 * Each line of stdout from the subprocess is a JSON message (request, response, or event).
 * Messages are serialized as JSON + newline on stdin.
 *
 * @example
 * ```ts
 * const host = new PluginHost('/path/to/plugin.ts', { onEvent: (e, d) => {} });
 * await host.start();
 * const action = await host.requestToolCall({ tool: 'bash', input: { cmd: 'ls' } });
 * await host.dispose();
 * ```
 */

import { spawn, type ChildProcess } from "node:child_process";
import { createInterface } from "node:readline";
import { createLogger } from "@flitter/util";

import type {
  JsonRpcEvent,
  JsonRpcMessage,
  JsonRpcRequest,
  JsonRpcResponse,
  PluginAction,
  PluginHostOptions,
  PluginStateChange,
  PluginToolCallEvent,
  PluginToolResultEvent,
  PluginToolResultOverride,
} from "./types";
import {
  MAX_AUTO_RESTARTS,
  PLUGIN_READY_EVENT,
  PLUGIN_READY_TIMEOUT_MS,
  REQUEST_TIMEOUT_MS,
  RESTART_DELAY_MS,
  SHUTDOWN_GRACE_PERIOD_MS,
} from "./types";

const log = createLogger("plugins:host");

interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (reason: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

/**
 * PluginHost manages a single plugin subprocess.
 * 逆向: vaT class (chunk-005.js:145495-145772)
 */
export class PluginHost {
  readonly pluginFile: string;

  private process: ChildProcess | null = null;
  private pendingRequests = new Map<string, PendingRequest>();
  private requestIdCounter = 0;
  private disposed = false;
  private startPromise: Promise<void> | null = null;
  private restartTimer: ReturnType<typeof setTimeout> | null = null;
  private restartAttempts = 0;
  private terminalFailure: Error | null = null;
  private hasReachedReadyState = false;
  private disposePromise: Promise<void> | null = null;

  // Ready-state promise wiring (逆向: 145594-145604)
  private readyPromise: Promise<void> | null = null;
  private readyResolve: (() => void) | null = null;
  private readyReject: ((err: Error) => void) | null = null;

  // Options (逆向: 145518-145521)
  private readonly onStderr?: (data: string) => void;
  private readonly onRequest?: Record<
    string,
    (params: unknown) => Promise<unknown>
  >;
  private readonly onEvent?: (event: string, data: unknown) => void;
  private readonly onStateChange?: (state: PluginStateChange) => void;
  private readonly maxAutoRestarts: number;
  private readonly restartDelayMs: number;
  private readonly shutdownGracePeriodMs: number;
  private readonly requestTimeoutMs: number;

  constructor(pluginFile: string, options?: PluginHostOptions) {
    this.pluginFile = pluginFile;
    this.onStderr = options?.onStderr;
    this.onRequest = options?.onRequest;
    this.onEvent = options?.onEvent;
    this.onStateChange = options?.onStateChange;
    this.maxAutoRestarts = options?.maxAutoRestarts ?? MAX_AUTO_RESTARTS;
    this.restartDelayMs = options?.restartDelayMs ?? RESTART_DELAY_MS;
    this.shutdownGracePeriodMs =
      options?.shutdownGracePeriodMs ?? SHUTDOWN_GRACE_PERIOD_MS;
    this.requestTimeoutMs = options?.requestTimeoutMs ?? REQUEST_TIMEOUT_MS;
  }

  // ─── Lifecycle ──────────────────────────────────────────

  /**
   * Start the plugin subprocess.
   * 逆向: chunk-005.js:145522-145531
   */
  async start(): Promise<void> {
    if (this.disposed) throw new Error("Plugin process is disposed");
    if (this.terminalFailure) throw this.terminalFailure;
    if (this.process) return;
    if (this.startPromise) return this.startPromise;

    if (this.restartTimer) {
      clearTimeout(this.restartTimer);
      this.restartTimer = null;
    }

    this.startPromise = this.startInternal().finally(() => {
      this.startPromise = null;
    });
    return this.startPromise;
  }

  /**
   * Internal start logic: spawn subprocess, wire stdio, wait for ready.
   * 逆向: chunk-005.js:145532-145578
   */
  private async startInternal(): Promise<void> {
    if (this.disposed) throw new Error("Plugin process is disposed");

    // Spawn the plugin with bun run
    // 逆向: GWR/FWR (chunk-002.js:27101-27117) — tries bun first
    const child = spawn("bun", ["run", this.pluginFile], {
      cwd: this.pluginFile.replace(/\/[^/]+$/, ""),
      stdio: ["pipe", "pipe", "pipe"],
    });

    this.process = child;
    this.createReadyPromise();

    // Error handling (逆向: 145542-145548)
    child.on("error", (err: Error) => {
      log.debug("Plugin process error", {
        pluginFile: this.pluginFile,
        error: err,
      });
      this.rejectPendingRequests(err);
      this.rejectReadyPromise(err);
    });

    // Exit handling (逆向: 145549-145558)
    child.on("exit", (code, signal) => {
      log.debug("Plugin process exited", {
        pluginFile: this.pluginFile,
        code,
        signal,
        pendingCount: this.pendingRequests.size,
        restartAttempts: this.restartAttempts,
      });

      if (this.process === child) this.process = null;

      this.rejectPendingRequests(
        new Error(`Plugin process exited (code=${code}, signal=${signal})`),
      );
      this.rejectReadyPromise(
        new Error(
          `Plugin process exited before readiness (code=${code}, signal=${signal})`,
        ),
      );

      if (this.hasReachedReadyState) {
        this.scheduleAutoRestart(
          new Error(
            `Plugin process exited unexpectedly (code=${code}, signal=${signal})`,
          ),
        );
      }
    });

    // Stderr handling (逆向: 145559-145565)
    if (child.stderr) {
      child.stderr.on("data", (chunk: Buffer) => {
        const text = chunk.toString();
        log.debug("Plugin stderr", { pluginFile: this.pluginFile, data: text });
        this.onStderr?.(text);
      });
    }

    // Stdout line-based JSON-RPC reading (逆向: 145566-145570 — BWR line reader)
    if (child.stdout) {
      const rl = createInterface({ input: child.stdout });
      rl.on("line", (line: string) => {
        this.handleMessage(line);
      });
    }

    // Wait for ready event (逆向: 145571-145578)
    try {
      await this.waitForReady();
      this.hasReachedReadyState = true;
      this.onStateChange?.({ type: "ready" });
    } catch (err) {
      if (this.process === child) {
        this.sendTerminationSignal(child, "SIGTERM");
      }
      throw err;
    }
  }

  // ─── Ready-state management ─────────────────────────────

  /**
   * Wait for ready event with timeout.
   * 逆向: chunk-005.js:145580-145593
   */
  private waitForReady(): Promise<void> {
    const promise = this.readyPromise;
    if (!promise) throw new Error("Plugin readiness waiter not initialized");

    return new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error("Plugin process did not become ready in time"));
      }, PLUGIN_READY_TIMEOUT_MS);

      promise
        .then(() => {
          clearTimeout(timer);
          resolve();
        })
        .catch((err) => {
          clearTimeout(timer);
          reject(err);
        });
    });
  }

  /** 逆向: chunk-005.js:145594-145598 */
  private createReadyPromise(): void {
    this.readyPromise = new Promise<void>((resolve, reject) => {
      this.readyResolve = resolve;
      this.readyReject = reject;
    });
  }

  /** 逆向: chunk-005.js:145599-145601 */
  private resolveReadyPromise(): void {
    this.readyResolve?.();
    this.readyResolve = null;
    this.readyReject = null;
    this.readyPromise = null;
  }

  /** 逆向: chunk-005.js:145602-145604 */
  private rejectReadyPromise(err: Error): void {
    this.readyReject?.(err);
    this.readyResolve = null;
    this.readyReject = null;
    this.readyPromise = null;
  }

  // ─── Pending request management ─────────────────────────

  /** 逆向: chunk-005.js:145605-145607 */
  private rejectPendingRequests(err: Error): void {
    for (const [id, pending] of this.pendingRequests) {
      clearTimeout(pending.timer);
      pending.reject(err);
      this.pendingRequests.delete(id);
    }
  }

  // ─── Auto-restart ───────────────────────────────────────

  /**
   * Schedule an auto-restart with exponential backoff.
   * 逆向: chunk-005.js:145608-145636
   */
  private scheduleAutoRestart(error: Error): void {
    if (this.disposed || this.terminalFailure) return;
    if (this.restartTimer) return;

    if (this.restartAttempts >= this.maxAutoRestarts) {
      const termErr = new Error(
        `Plugin crashed too many times (${this.maxAutoRestarts} restarts): ${error.message}`,
      );
      this.terminalFailure = termErr;
      this.onStateChange?.({ type: "failed", error: termErr });
      return;
    }

    this.restartAttempts += 1;
    const delay = this.restartDelayMs * 2 ** (this.restartAttempts - 1);
    const attempt = this.restartAttempts;

    this.onStateChange?.({ type: "restarting", attempt, delayMs: delay, error });

    this.restartTimer = setTimeout(() => {
      this.restartTimer = null;
      this.start().catch((restartErr) => {
        log.debug("Plugin auto-restart failed", {
          pluginFile: this.pluginFile,
          attempt,
          error: restartErr,
        });
        if (
          !this.process &&
          !this.disposed &&
          !this.terminalFailure &&
          !this.restartTimer
        ) {
          this.scheduleAutoRestart(
            restartErr instanceof Error ? restartErr : new Error(String(restartErr)),
          );
        }
      });
    }, delay);
  }

  // ─── Message handling ───────────────────────────────────

  /**
   * Parse and handle a JSON line from plugin stdout.
   * 逆向: chunk-005.js:145637-145643
   */
  private handleMessage(line: string): void {
    const msg = this.parseMessage(line);
    if (!msg) return;

    if (msg.type === "response") {
      const pending = this.pendingRequests.get(msg.id);
      if (pending) {
        this.pendingRequests.delete(pending ? msg.id : "");
        clearTimeout(pending.timer);
        if (msg.error) {
          pending.reject(new Error(msg.error));
        } else {
          pending.resolve(msg.result);
        }
      }
    } else if (msg.type === "request") {
      this.handleIncomingRequest(msg as JsonRpcRequest);
    } else if (msg.type === "event") {
      this.handleIncomingEvent(
        (msg as JsonRpcEvent).event,
        (msg as JsonRpcEvent).data,
      );
    }
  }

  /**
   * Parse a JSON string into a message.
   * 逆向: NWR (chunk-002.js:27071-27078)
   */
  private parseMessage(line: string): JsonRpcMessage | null {
    const trimmed = line.trim();
    if (!trimmed) return null;
    try {
      return JSON.parse(trimmed);
    } catch {
      return null;
    }
  }

  /**
   * Handle an incoming JSON-RPC request from the plugin.
   * 逆向: chunk-005.js:145645-145651
   */
  private handleIncomingRequest(msg: JsonRpcRequest): void {
    if (!this.onRequest) {
      this.sendResponseToPlugin(
        msg.id,
        undefined,
        `No handler for method: ${msg.method}`,
      );
      return;
    }

    const handler = this.onRequest[msg.method];
    if (!handler) {
      this.sendResponseToPlugin(
        msg.id,
        undefined,
        `No handler for plugin request method: ${msg.method}`,
      );
      return;
    }

    handler(msg.params)
      .then((result) => this.sendResponseToPlugin(msg.id, result))
      .catch((err) =>
        this.sendResponseToPlugin(
          msg.id,
          undefined,
          err instanceof Error ? err.message : String(err),
        ),
      );
  }

  /**
   * Handle an incoming event from the plugin.
   * 逆向: chunk-005.js:145652-145658 — runtime.ready resolves readiness
   */
  private handleIncomingEvent(event: string, data: unknown): void {
    if (event === PLUGIN_READY_EVENT) {
      this.resolveReadyPromise();
      return;
    }
    this.onEvent?.(event, data);
  }

  /**
   * Send a JSON-RPC response back to the plugin's stdin.
   * 逆向: chunk-005.js:145659-145667
   */
  private sendResponseToPlugin(
    id: string,
    result?: unknown,
    error?: string,
  ): void {
    if (!this.process?.stdin) return;

    const msg: JsonRpcResponse = { type: "response", id };
    if (error) {
      msg.error = error;
    } else {
      msg.result = result;
    }
    this.process.stdin.write(this.serialize(msg));
  }

  // ─── Outbound requests to plugin ────────────────────────

  /**
   * Send a JSON-RPC request to the plugin and await a response.
   * 逆向: chunk-005.js:145668-145689 (sendRequest)
   */
  async sendRequest(method: string, params?: unknown): Promise<unknown> {
    if (this.disposed) throw new Error("Plugin process is disposed");
    if (this.terminalFailure) throw this.terminalFailure;

    if (!this.process?.stdin) {
      await this.start();
    }
    if (!this.process?.stdin) {
      throw new Error("Plugin process not started");
    }

    const id = String(++this.requestIdCounter);
    const msg: JsonRpcRequest = {
      type: "request",
      id,
      method,
      params,
    };

    return new Promise<unknown>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(
          new Error(
            `Plugin request timed out after ${this.requestTimeoutMs}ms (method=${method})`,
          ),
        );
      }, this.requestTimeoutMs);

      this.pendingRequests.set(id, { resolve, reject, timer });
      this.process!.stdin!.write(this.serialize(msg));
    });
  }

  // ─── High-level protocol methods ────────────────────────
  // (mirrors $aT base class: chunk-002.js:26937-27067)

  /**
   * Emit an event to the plugin (fire-and-forget request).
   * 逆向: $aT.emitEvent (chunk-002.js:26938-26944)
   */
  async emitEvent(event: string, data?: unknown): Promise<void> {
    await this.sendRequest("event", { event, data });
  }

  /**
   * Request a tool.call decision from the plugin.
   * 逆向: $aT.requestToolCall (chunk-002.js:26952-26961)
   */
  async requestToolCall(event: PluginToolCallEvent): Promise<PluginAction> {
    const result = await this.sendRequest("tool.call", event);
    if (
      result &&
      typeof result === "object" &&
      "action" in result &&
      typeof (result as PluginAction).action === "string"
    ) {
      return result as PluginAction;
    }
    return { action: "allow" };
  }

  /**
   * Request a tool.result override from the plugin.
   * 逆向: $aT.requestToolResult (chunk-002.js:26963-26974)
   */
  async requestToolResult(
    event: PluginToolResultEvent,
  ): Promise<PluginToolResultOverride | undefined> {
    const result = await this.sendRequest("tool.result", event);
    if (result && typeof result === "object") {
      const r = result as PluginToolResultOverride;
      if (r.status === "done" || r.status === "error" || r.status === "cancelled") {
        return r;
      }
    }
    return undefined;
  }

  /**
   * List events the plugin has registered for.
   * 逆向: $aT.listRegisteredEvents (chunk-002.js:27033-27038)
   */
  async listRegisteredEvents(): Promise<string[]> {
    const result = await this.sendRequest("events.list");
    if (Array.isArray(result)) return result;
    return [];
  }

  // ─── Dispose ────────────────────────────────────────────

  /**
   * Dispose the plugin subprocess gracefully.
   * 逆向: chunk-005.js:145690-145699
   */
  async dispose(): Promise<void> {
    if (this.disposePromise) return this.disposePromise;

    this.disposed = true;

    if (this.restartTimer) {
      clearTimeout(this.restartTimer);
      this.restartTimer = null;
    }

    this.rejectReadyPromise(new Error("Plugin process disposed"));
    this.rejectPendingRequests(new Error("Plugin process disposed"));

    const proc = this.process;
    this.process = null;

    if (!proc) return;

    this.disposePromise = this.terminateProcessGracefully(proc).finally(() => {
      this.disposePromise = null;
    });
    return this.disposePromise;
  }

  /**
   * Try SIGINT first, then SIGKILL after grace period.
   * 逆向: chunk-005.js:145700-145725
   */
  private async terminateProcessGracefully(
    proc: ChildProcess,
  ): Promise<void> {
    if (proc.exitCode !== null || proc.signalCode !== null) return;

    return new Promise<void>((resolve) => {
      let settled = false;

      const cleanup = () => {
        if (settled) return;
        settled = true;
        clearTimeout(forceKillTimer);
        proc.off("exit", onExit);
        resolve();
      };

      const onExit = () => cleanup();
      proc.once("exit", onExit);

      const forceKillTimer = setTimeout(() => {
        log.debug("Plugin did not exit after SIGINT; forcing kill", {
          pluginFile: this.pluginFile,
          shutdownGracePeriodMs: this.shutdownGracePeriodMs,
        });
        if (!this.sendTerminationSignal(proc, "SIGKILL")) {
          log.debug("Failed to SIGKILL plugin process", {
            pluginFile: this.pluginFile,
          });
        }
        cleanup();
      }, this.shutdownGracePeriodMs);

      if (!this.sendTerminationSignal(proc, "SIGINT")) {
        log.debug("Failed to SIGINT plugin process", {
          pluginFile: this.pluginFile,
        });
        cleanup();
      }
    });
  }

  /**
   * Send a signal to the process.
   * 逆向: chunk-005.js:145726-145747
   */
  private sendTerminationSignal(
    proc: ChildProcess,
    signal: NodeJS.Signals,
  ): boolean {
    try {
      return proc.kill(signal);
    } catch {
      log.debug("Failed to signal plugin process", {
        pluginFile: this.pluginFile,
        signal,
        pid: proc.pid,
      });
      return false;
    }
  }

  // ─── Serialization ──────────────────────────────────────

  /**
   * Serialize a message to JSON + newline (the wire format).
   * 逆向: nuT (chunk-002.js:27067-27069)
   */
  private serialize(msg: JsonRpcMessage): string {
    return JSON.stringify(msg) + "\n";
  }

  // ─── Getters for testing / inspection ───────────────────

  get isDisposed(): boolean {
    return this.disposed;
  }

  get isRunning(): boolean {
    return this.process !== null;
  }

  get pendingRequestCount(): number {
    return this.pendingRequests.size;
  }
}
