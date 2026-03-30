// HeartbeatMonitor — periodic health probing of the agent connection (Gap #58)
//
// Runs a periodic ping against the agent and tracks response latency.
// Transitions through health states: healthy -> degraded -> unhealthy.
// The onHealthChange callback fires on every status transition, allowing
// the TUI to display connection quality indicators.

import { log } from '../utils/logger';

export interface HeartbeatConfig {
  /** Interval between heartbeat pings in milliseconds. */
  intervalMs: number;
  /** Maximum time to wait for a pong response before declaring timeout. */
  timeoutMs: number;
  /** Number of consecutive timeouts before declaring the agent unhealthy. */
  maxMissedBeats: number;
}

export const DEFAULT_HEARTBEAT_CONFIG: HeartbeatConfig = {
  intervalMs: 15_000,      // Ping every 15 seconds
  timeoutMs: 10_000,       // Each ping must respond within 10 seconds
  maxMissedBeats: 3,       // 3 consecutive misses = unhealthy
};

export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unknown';

export interface HealthReport {
  status: HealthStatus;
  lastPingAt: number | null;       // Unix ms of last ping sent
  lastPongAt: number | null;       // Unix ms of last pong received
  lastLatencyMs: number | null;    // RTT of last successful ping
  avgLatencyMs: number | null;     // Rolling average RTT
  consecutiveMisses: number;       // Current miss streak
  totalPings: number;              // Total pings sent since start
  totalTimeouts: number;           // Total pings that timed out
  upSince: number | null;          // Unix ms when status became healthy
}

export type PingFunction = () => Promise<void>;
export type HealthChangeCallback = (report: HealthReport) => void;

export class HeartbeatMonitor {
  private config: HeartbeatConfig;
  private pingFn: PingFunction;
  private onHealthChange: HealthChangeCallback;

  private intervalHandle: ReturnType<typeof setInterval> | null = null;
  private _consecutiveMisses = 0;
  private _totalPings = 0;
  private _totalTimeouts = 0;
  private _lastPingAt: number | null = null;
  private _lastPongAt: number | null = null;
  private _lastLatencyMs: number | null = null;
  private latencyWindow: number[] = [];  // Rolling window for avg calculation
  private _upSince: number | null = null;
  private _status: HealthStatus = 'unknown';
  private _running = false;

  private static readonly LATENCY_WINDOW_SIZE = 10;

  constructor(
    pingFn: PingFunction,
    onHealthChange: HealthChangeCallback,
    config: Partial<HeartbeatConfig> = {},
  ) {
    this.pingFn = pingFn;
    this.onHealthChange = onHealthChange;
    this.config = { ...DEFAULT_HEARTBEAT_CONFIG, ...config };
  }

  /** Start the periodic heartbeat loop. */
  start(): void {
    if (this._running) return;
    this._running = true;
    this._status = 'healthy';
    this._upSince = Date.now();
    log.info(
      `Heartbeat monitor started: interval=${this.config.intervalMs}ms, ` +
      `timeout=${this.config.timeoutMs}ms, maxMissed=${this.config.maxMissedBeats}`
    );

    // Run first ping after one interval (not immediately -- give agent
    // time to settle after initialization).
    this.intervalHandle = setInterval(() => {
      this.tick();
    }, this.config.intervalMs);
  }

  /** Stop the heartbeat loop. Does not fire health change callbacks. */
  stop(): void {
    if (!this._running) return;
    this._running = false;
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
    log.info('Heartbeat monitor stopped');
  }

  /** Whether the monitor is currently running. */
  get running(): boolean {
    return this._running;
  }

  /** Current health status. */
  get status(): HealthStatus {
    return this._status;
  }

  /** Current consecutive miss count. */
  get consecutiveMisses(): number {
    return this._consecutiveMisses;
  }

  /** Total pings sent. */
  get totalPings(): number {
    return this._totalPings;
  }

  /** Total timeouts. */
  get totalTimeouts(): number {
    return this._totalTimeouts;
  }

  /** Get the current health report without sending a ping. */
  getReport(): HealthReport {
    return {
      status: this._status,
      lastPingAt: this._lastPingAt,
      lastPongAt: this._lastPongAt,
      lastLatencyMs: this._lastLatencyMs,
      avgLatencyMs: this.computeAvgLatency(),
      consecutiveMisses: this._consecutiveMisses,
      totalPings: this._totalPings,
      totalTimeouts: this._totalTimeouts,
      upSince: this._upSince,
    };
  }

  /** Reset all counters (call after reconnection). */
  reset(): void {
    this._consecutiveMisses = 0;
    this._totalPings = 0;
    this._totalTimeouts = 0;
    this._lastPingAt = null;
    this._lastPongAt = null;
    this._lastLatencyMs = null;
    this.latencyWindow = [];
    this._upSince = Date.now();
    this._status = 'healthy';
  }

  /** Execute a single heartbeat tick. Exposed for testing. */
  async tick(): Promise<void> {
    if (!this._running) return;

    this._totalPings++;
    this._lastPingAt = Date.now();

    try {
      await this.pingWithTimeout();
      // Ping succeeded
      const latency = Date.now() - this._lastPingAt;
      this._lastPongAt = Date.now();
      this._lastLatencyMs = latency;
      this.latencyWindow.push(latency);
      if (this.latencyWindow.length > HeartbeatMonitor.LATENCY_WINDOW_SIZE) {
        this.latencyWindow.shift();
      }

      if (this._consecutiveMisses > 0) {
        log.info(
          `Heartbeat recovered after ${this._consecutiveMisses} missed beats ` +
          `(latency: ${latency}ms)`
        );
      }
      this._consecutiveMisses = 0;
      this.updateStatus('healthy');
    } catch (err) {
      // Ping failed or timed out
      this._consecutiveMisses++;
      this._totalTimeouts++;
      const message = err instanceof Error ? err.message : String(err);
      log.warn(
        `Heartbeat timeout (miss ${this._consecutiveMisses}/${this.config.maxMissedBeats}): ${message}`
      );

      if (this._consecutiveMisses >= this.config.maxMissedBeats) {
        this.updateStatus('unhealthy');
      } else {
        this.updateStatus('degraded');
      }
    }
  }

  private async pingWithTimeout(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Heartbeat ping timed out after ${this.config.timeoutMs}ms`));
      }, this.config.timeoutMs);

      this.pingFn()
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

  private updateStatus(newStatus: HealthStatus): void {
    const prev = this._status;
    this._status = newStatus;

    if (newStatus === 'healthy' && prev !== 'healthy') {
      this._upSince = Date.now();
    }

    // Always notify on status change; also notify on every miss while
    // degraded so the TUI can update the miss counter display.
    if (newStatus !== prev || newStatus === 'degraded') {
      this.onHealthChange(this.getReport());
    }
  }

  private computeAvgLatency(): number | null {
    if (this.latencyWindow.length === 0) return null;
    const sum = this.latencyWindow.reduce((a, b) => a + b, 0);
    return Math.round(sum / this.latencyWindow.length);
  }
}
