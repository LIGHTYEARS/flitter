// IdeClient — Background IDE connection manager
//
// Manages a background connection to an IDE instance. Currently a placeholder
// implementation that logs connection attempts and state transitions but does
// not perform actual IDE communication. Designed to be swapped out for real
// IDE protocol adapters (LSP, DAP, JetBrains Gateway, etc.) in the future.
//
// Uses an event listener pattern (onStatusChange) to notify consumers
// of connection state transitions, consistent with TransportConnection's approach.

import { log } from './logger';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Possible connection states for the IDE client. */
export type IdeConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

/** Handler invoked when the IDE connection status changes. */
type StatusChangeHandler = (status: IdeConnectionStatus) => void;

// ---------------------------------------------------------------------------
// IdeClient
// ---------------------------------------------------------------------------

/**
 * Manages a background connection to an IDE.
 *
 * Properties:
 *   connectionStatus — current connection state
 *   ideId            — identifier of the currently connected IDE (null if disconnected)
 *
 * Methods:
 *   connect(ideId)                   — initiate connection to the specified IDE
 *   disconnect()                     — tear down the connection
 *   navigateToFile(filePath, line?)  — send a file navigation command to the IDE
 *   isConnected()                    — convenience check for 'connected' status
 *
 * Event registration:
 *   onStatusChange(handler)          — register a callback for status transitions
 *   removeStatusChangeHandler(handler) — unregister a previously added handler
 *
 * This is a placeholder implementation: all operations log their intent
 * but do not perform actual IDE communication.
 */
export class IdeClient {
  /** Current connection status. */
  private _connectionStatus: IdeConnectionStatus = 'disconnected';

  /** Identifier of the currently connected IDE (null when disconnected). */
  private _ideId: string | null = null;

  /** Registered status change handlers. */
  private _statusChangeHandlers: StatusChangeHandler[] = [];

  // -------------------------------------------------------------------------
  // Public accessors
  // -------------------------------------------------------------------------

  /** Current connection status. */
  get connectionStatus(): IdeConnectionStatus {
    return this._connectionStatus;
  }

  /** Identifier of the currently connected IDE, or null if disconnected. */
  get ideId(): string | null {
    return this._ideId;
  }

  // -------------------------------------------------------------------------
  // Connection management
  // -------------------------------------------------------------------------

  /**
   * Initiate a connection to the specified IDE.
   *
   * Placeholder implementation: transitions through 'connecting' -> 'connected'
   * states with a simulated delay, logging each step.
   *
   * @param ideId - Identifier of the IDE to connect to (e.g. 'vscode', 'intellij')
   */
  connect(ideId: string): void {
    const startMs = performance.now();
    log.info('IdeClient: connect requested', { ideId, previousIde: this._ideId });

    // Disconnect existing connection first
    if (this._connectionStatus !== 'disconnected') {
      this.disconnect();
    }

    this._ideId = ideId;
    this._setStatus('connecting');

    // Placeholder: simulate async connection with a short delay
    setTimeout(() => {
      if (this._ideId === ideId && this._connectionStatus === 'connecting') {
        this._setStatus('connected');
        const elapsedMs = performance.now() - startMs;
        log.info('IdeClient: connected (placeholder)', {
          ideId,
          elapsedMs: elapsedMs.toFixed(2),
        });
      }
    }, 100);
  }

  /**
   * Disconnect from the current IDE.
   *
   * Resets the connection status and clears the IDE identifier.
   */
  disconnect(): void {
    const previousIde = this._ideId;
    log.info('IdeClient: disconnect', { previousIde });

    this._ideId = null;
    this._setStatus('disconnected');
  }

  /**
   * Send a file navigation command to the connected IDE.
   *
   * Placeholder implementation: logs the navigation intent but does not
   * perform actual file opening. Returns false if not connected.
   *
   * @param filePath - Absolute or relative path to the file to open
   * @param line     - Optional 1-based line number to navigate to
   * @returns true if the command was dispatched, false if not connected
   */
  navigateToFile(filePath: string, line?: number): boolean {
    if (!this.isConnected()) {
      log.warn('IdeClient: navigateToFile called while not connected', { filePath, line });
      return false;
    }

    log.info('IdeClient: navigateToFile (placeholder)', {
      ideId: this._ideId,
      filePath,
      line: line ?? null,
    });

    // Placeholder: actual implementation would send an IDE-specific command
    // (e.g., VS Code CLI `code --goto file:line`, JetBrains remote protocol, etc.)
    return true;
  }

  /**
   * Check whether the client is currently connected to an IDE.
   */
  isConnected(): boolean {
    return this._connectionStatus === 'connected';
  }

  // -------------------------------------------------------------------------
  // Event registration
  // -------------------------------------------------------------------------

  /**
   * Register a handler to be called when the connection status changes.
   *
   * @param handler - Callback invoked with the new status value
   */
  onStatusChange(handler: StatusChangeHandler): void {
    this._statusChangeHandlers.push(handler);
  }

  /**
   * Remove a previously registered status change handler.
   *
   * @param handler - The handler reference to remove
   */
  removeStatusChangeHandler(handler: StatusChangeHandler): void {
    const idx = this._statusChangeHandlers.indexOf(handler);
    if (idx !== -1) {
      this._statusChangeHandlers.splice(idx, 1);
    }
  }

  // -------------------------------------------------------------------------
  // Internal helpers
  // -------------------------------------------------------------------------

  /**
   * Update the connection status and notify all registered handlers.
   */
  private _setStatus(status: IdeConnectionStatus): void {
    const previous = this._connectionStatus;
    if (previous === status) return;

    this._connectionStatus = status;
    log.debug('IdeClient: status change', { from: previous, to: status, ideId: this._ideId });

    for (const handler of this._statusChangeHandlers) {
      try {
        handler(status);
      } catch (err) {
        log.error(`IdeClient: status change handler threw: ${err}`);
      }
    }
  }
}
