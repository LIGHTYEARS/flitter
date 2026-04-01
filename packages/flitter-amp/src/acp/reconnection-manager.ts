// Reconnection manager with exponential backoff (Gap #57)
//
// Encapsulates the reconnect lifecycle: backoff-and-retry loop, abort,
// reset, and phase change notifications. Deliberately separate from
// connectToAgent() to keep the initial connection path simple.

import { connectToAgent, type ConnectionHandle } from './connection';
import type { ClientCallbacks } from './client';
import type { ConnectionPhase } from '../state/connection-state';
import { log } from '../utils/logger';

export interface ReconnectionConfig {
  /** Maximum number of consecutive reconnect attempts before giving up. */
  maxAttempts: number;
  /** Base delay in milliseconds for exponential backoff. */
  baseDelayMs: number;
  /** Maximum delay cap in milliseconds. */
  maxDelayMs: number;
  /** Jitter factor (0-1). Multiplied by the computed delay and added randomly. */
  jitterFactor: number;
}

export const DEFAULT_RECONNECTION_CONFIG: ReconnectionConfig = {
  maxAttempts: 5,
  baseDelayMs: 1000,
  maxDelayMs: 30_000,
  jitterFactor: 0.3,
};

export type PhaseCallback = (
  phase: ConnectionPhase,
  attempt: number,
  error?: string,
  nextRetryAt?: number,
) => void;

export class ReconnectionManager {
  private config: ReconnectionConfig;
  private agentCommand: string;
  private agentArgs: string[];
  private cwd: string;
  private callbacks: ClientCallbacks;
  private onPhaseChange: PhaseCallback;

  private _attempt = 0;
  private _aborted = false;
  private currentTimer: ReturnType<typeof setTimeout> | null = null;
  private sleepResolve: (() => void) | null = null;

  /** Injected for testing -- allows replacing connectToAgent. */
  connectFn: typeof connectToAgent;

  /** Injected for testing -- allows replacing the random source. */
  randomFn: () => number;

  constructor(
    agentCommand: string,
    agentArgs: string[],
    cwd: string,
    callbacks: ClientCallbacks,
    onPhaseChange: PhaseCallback,
    config: Partial<ReconnectionConfig> = {},
  ) {
    this.agentCommand = agentCommand;
    this.agentArgs = agentArgs;
    this.cwd = cwd;
    this.callbacks = callbacks;
    this.onPhaseChange = onPhaseChange;
    this.config = { ...DEFAULT_RECONNECTION_CONFIG, ...config };
    this.connectFn = connectToAgent;
    this.randomFn = Math.random;
  }

  /**
   * Begin the reconnection loop. Returns the new ConnectionHandle on
   * success, or null if all attempts are exhausted or abort() was called.
   */
  async reconnect(): Promise<ConnectionHandle | null> {
    this._attempt = 0;
    this._aborted = false;

    while (this._attempt < this.config.maxAttempts && !this._aborted) {
      this._attempt++;
      const delay = this.computeDelay(this._attempt);
      const nextRetryAt = Date.now() + delay;

      this.onPhaseChange('reconnecting', this._attempt, undefined, nextRetryAt);
      log.info(`Reconnection attempt ${this._attempt}/${this.config.maxAttempts}`);
      log.info(`Waiting ${delay}ms before reconnect attempt`);

      await this.sleep(delay);

      if (this._aborted) break;

      try {
        const handle = await this.connectFn(
          this.agentCommand,
          this.agentArgs,
          this.cwd,
          this.callbacks,
        );
        log.info('Reconnection successful');
        this._attempt = 0;
        this.onPhaseChange('connected', 0);
        return handle;
      } catch (err) {
        log.error(`Reconnect attempt ${this._attempt} failed`, err);
        const message = err instanceof Error ? err.message : String(err);
        this.onPhaseChange('reconnecting', this._attempt, message);
      }
    }

    if (!this._aborted) {
      this.onPhaseChange('disconnected', this._attempt, 'All reconnection attempts exhausted');
    }
    return null;
  }

  /** Abort any in-progress reconnection. */
  abort(): void {
    this._aborted = true;
    if (this.currentTimer) {
      clearTimeout(this.currentTimer);
      this.currentTimer = null;
    }
    // Resolve any pending sleep so the reconnect loop exits promptly
    if (this.sleepResolve) {
      this.sleepResolve();
      this.sleepResolve = null;
    }
  }

  /** Reset attempt counter (call after a successful user-initiated retry). */
  reset(): void {
    this._attempt = 0;
    this._aborted = false;
  }

  /** Expose config for TUI display purposes. */
  get maxAttempts(): number {
    return this.config.maxAttempts;
  }

  /** Current attempt number (for testing). */
  get attempt(): number {
    return this._attempt;
  }

  /** Whether abort has been called (for testing). */
  get aborted(): boolean {
    return this._aborted;
  }

  computeDelay(attempt: number): number {
    // Exponential backoff: base * 2^(attempt-1), capped at maxDelay
    const exponential = this.config.baseDelayMs * Math.pow(2, attempt - 1);
    const capped = Math.min(exponential, this.config.maxDelayMs);
    const jitter = capped * this.config.jitterFactor * this.randomFn();
    return Math.round(capped + jitter);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => {
      this.sleepResolve = resolve;
      this.currentTimer = setTimeout(() => {
        this.currentTimer = null;
        this.sleepResolve = null;
        resolve();
      }, ms);
    });
  }
}
