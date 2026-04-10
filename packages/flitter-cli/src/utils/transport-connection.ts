// TransportConnection — manages a WebSocket connection for DTW mode.
//
// Provides connect/disconnect/send/onMessage lifecycle with automatic
// reconnection using exponential backoff (1s → 2s → 4s → 8s → max 30s).
//
// Since the project does not have a `ws` dependency, this is a placeholder
// implementation that logs connection attempts without establishing actual
// WebSocket connections. Once a WebSocket library is added (or Node.js 22+
// built-in WebSocket is available), the placeholder can be replaced.

import { log } from './logger';

// ---------------------------------------------------------------------------
// Connection status type
// ---------------------------------------------------------------------------

/** Possible states of the transport connection lifecycle. */
export type TransportConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'error';

// ---------------------------------------------------------------------------
// Reconnect constants
// ---------------------------------------------------------------------------

/** Initial reconnect delay in milliseconds. */
const INITIAL_RECONNECT_DELAY_MS = 1000;

/** Maximum reconnect delay in milliseconds. */
const MAX_RECONNECT_DELAY_MS = 30_000;

/** Multiplier applied to the delay on each successive reconnect attempt. */
const RECONNECT_BACKOFF_FACTOR = 2;

// ---------------------------------------------------------------------------
// Event listener types
// ---------------------------------------------------------------------------

/** Handler invoked when a message is received from the remote end. */
type MessageHandler = (data: string) => void;

/** Handler invoked when the connection status changes. */
type StatusChangeHandler = (status: TransportConnectionStatus) => void;

// ---------------------------------------------------------------------------
// TransportConnection class
// ---------------------------------------------------------------------------

/**
 * TransportConnection manages a WebSocket connection for DTW mode transport.
 *
 * Features:
 *   - connect(url): initiates a connection to the given WebSocket URL
 *   - disconnect(): cleanly tears down the connection
 *   - send(message): sends a text message (no-op if not connected)
 *   - onMessage(handler): registers a message callback
 *   - onStatusChange(handler): registers a status change callback
 *   - Automatic reconnection with exponential backoff
 *
 * This is currently a placeholder implementation. Connection attempts are
 * logged but no actual WebSocket is created (no `ws` dependency available).
 */
export class TransportConnection {
  /** Current connection status. */
  private _status: TransportConnectionStatus = 'disconnected';

  /** The WebSocket URL to connect to, or null if never connected. */
  private _url: string | null = null;

  /** Registered message handlers. */
  private _messageHandlers: MessageHandler[] = [];

  /** Registered status change handlers. */
  private _statusChangeHandlers: StatusChangeHandler[] = [];

  /** Current reconnect delay in ms (doubles on each attempt, capped at MAX). */
  private _reconnectDelay: number = INITIAL_RECONNECT_DELAY_MS;

  /** Timer handle for the pending reconnect attempt, or null. */
  private _reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  /** Number of consecutive reconnect attempts since last successful connect. */
  private _reconnectAttempts: number = 0;

  // -------------------------------------------------------------------------
  // Public accessors
  // -------------------------------------------------------------------------

  /** Current connection status (read-only). */
  get status(): TransportConnectionStatus {
    return this._status;
  }

  /** The URL this connection targets, or null if never connected. */
  get url(): string | null {
    return this._url;
  }

  // -------------------------------------------------------------------------
  // Connection lifecycle
  // -------------------------------------------------------------------------

  /**
   * Initiate a WebSocket connection to the given URL.
   *
   * Placeholder: logs the connection attempt and transitions status to
   * 'connecting' then immediately to 'connected'. Replace with actual
   * WebSocket logic when a library becomes available.
   *
   * @param url - The WebSocket URL to connect to (e.g. ws://localhost:8080)
   */
  connect(url: string): void {
    if (this._status === 'connecting' || this._status === 'connected') {
      log.info(`TransportConnection.connect: already ${this._status}, disconnect first`);
      return;
    }

    this._url = url;
    this._setStatus('connecting');
    this._reconnectAttempts = 0;
    this._reconnectDelay = INITIAL_RECONNECT_DELAY_MS;

    log.info(`TransportConnection.connect: attempting connection to ${url} (placeholder — no actual WebSocket)`);

    // Placeholder: simulate successful connection after a microtask
    queueMicrotask(() => {
      if (this._status === 'connecting') {
        this._setStatus('connected');
        log.info(`TransportConnection.connect: placeholder connected to ${url}`);
      }
    });
  }

  /**
   * Disconnect from the current WebSocket connection.
   *
   * Cancels any pending reconnect timer, resets reconnect state, and
   * transitions to 'disconnected'.
   */
  disconnect(): void {
    this._cancelReconnect();
    this._url = null;
    this._reconnectAttempts = 0;
    this._reconnectDelay = INITIAL_RECONNECT_DELAY_MS;
    this._setStatus('disconnected');
    log.info('TransportConnection.disconnect: disconnected');
  }

  /**
   * Send a text message over the connection.
   *
   * No-op if the connection is not in 'connected' state.
   *
   * @param message - The text message to send
   */
  send(message: string): void {
    if (this._status !== 'connected') {
      log.warn(`TransportConnection.send: cannot send in status "${this._status}"`);
      return;
    }

    log.info(`TransportConnection.send: placeholder send (${message.length} chars)`);
    // Placeholder: actual WebSocket.send(message) would go here
  }

  // -------------------------------------------------------------------------
  // Event registration
  // -------------------------------------------------------------------------

  /**
   * Register a handler to be called when a message is received.
   *
   * @param handler - Callback invoked with the message data string
   */
  onMessage(handler: MessageHandler): void {
    this._messageHandlers.push(handler);
  }

  /**
   * Register a handler to be called when the connection status changes.
   *
   * @param handler - Callback invoked with the new status value
   */
  onStatusChange(handler: StatusChangeHandler): void {
    this._statusChangeHandlers.push(handler);
  }

  // -------------------------------------------------------------------------
  // Reconnection logic (exponential backoff)
  // -------------------------------------------------------------------------

  /**
   * Schedule a reconnection attempt using exponential backoff.
   *
   * Delay sequence: 1s, 2s, 4s, 8s, 16s, 30s (capped).
   * Called internally when the connection drops unexpectedly.
   */
  scheduleReconnect(): void {
    if (!this._url) {
      log.warn('TransportConnection.scheduleReconnect: no URL to reconnect to');
      return;
    }

    this._cancelReconnect();
    this._setStatus('reconnecting');
    this._reconnectAttempts++;

    const delay = Math.min(this._reconnectDelay, MAX_RECONNECT_DELAY_MS);
    log.info(`TransportConnection.scheduleReconnect: attempt #${this._reconnectAttempts} in ${delay}ms`);

    this._reconnectTimer = setTimeout(() => {
      this._reconnectTimer = null;
      if (this._url && this._status === 'reconnecting') {
        log.info(`TransportConnection.scheduleReconnect: reconnecting to ${this._url}`);
        this._setStatus('connecting');

        // Placeholder: simulate reconnect success
        queueMicrotask(() => {
          if (this._status === 'connecting') {
            this._setStatus('connected');
            this._reconnectDelay = INITIAL_RECONNECT_DELAY_MS;
            this._reconnectAttempts = 0;
            log.info('TransportConnection.scheduleReconnect: placeholder reconnected');
          }
        });
      }
    }, delay);

    // Increase delay for next attempt (exponential backoff)
    this._reconnectDelay = Math.min(
      this._reconnectDelay * RECONNECT_BACKOFF_FACTOR,
      MAX_RECONNECT_DELAY_MS,
    );
  }

  // -------------------------------------------------------------------------
  // Internal helpers
  // -------------------------------------------------------------------------

  /**
   * Update the connection status and notify all registered status change handlers.
   *
   * @param status - The new connection status
   */
  private _setStatus(status: TransportConnectionStatus): void {
    if (this._status === status) return;
    const previous = this._status;
    this._status = status;
    log.info(`TransportConnection._setStatus: ${previous} -> ${status}`);
    for (const handler of this._statusChangeHandlers) {
      try {
        handler(status);
      } catch (err) {
        log.error(`TransportConnection: status change handler threw: ${err}`);
      }
    }
  }

  /**
   * Dispatch a received message to all registered message handlers.
   *
   * Called internally when the underlying transport receives data.
   * Exposed as protected so placeholder/test subclasses can simulate
   * incoming messages.
   *
   * @param data - The raw message data string
   */
  protected dispatchMessage(data: string): void {
    for (const handler of this._messageHandlers) {
      try {
        handler(data);
      } catch (err) {
        log.error(`TransportConnection: message handler threw: ${err}`);
      }
    }
  }

  /**
   * Cancel any pending reconnect timer.
   */
  private _cancelReconnect(): void {
    if (this._reconnectTimer !== null) {
      clearTimeout(this._reconnectTimer);
      this._reconnectTimer = null;
    }
  }
}
