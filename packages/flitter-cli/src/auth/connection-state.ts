// Connection phase state machine for OAuth flows (N4).
//
// Tracks the current connection phase and validates transitions
// between phases to prevent invalid state changes.

/** Discrete connection phases for OAuth / provider connections. */
export type ConnectionPhase =
  | 'disconnected'
  | 'connecting'
  | 'authenticating'
  | 'connected'
  | 'error';

/** Valid transitions: source -> Set of allowed target phases. */
const VALID_TRANSITIONS: Record<ConnectionPhase, ReadonlyArray<ConnectionPhase>> = {
  disconnected: ['connecting'],
  connecting: ['authenticating', 'connected', 'error', 'disconnected'],
  authenticating: ['connected', 'error', 'disconnected'],
  connected: ['disconnected', 'error'],
  error: ['disconnected', 'connecting'],
};

/**
 * ConnectionStateMachine tracks and validates connection phase transitions.
 *
 * Only allows transitions defined in the VALID_TRANSITIONS map.
 * Invalid transitions are rejected (return false) without modifying state.
 */
export class ConnectionStateMachine {
  private _phase: ConnectionPhase;

  constructor(initial: ConnectionPhase = 'disconnected') {
    this._phase = initial;
  }

  /** Current connection phase. */
  get phase(): ConnectionPhase {
    return this._phase;
  }

  /**
   * Attempt to transition to a new phase.
   * Returns true if the transition was valid and applied, false otherwise.
   */
  transition(to: ConnectionPhase): boolean {
    const allowed = VALID_TRANSITIONS[this._phase];
    if (allowed.includes(to)) {
      this._phase = to;
      return true;
    }
    return false;
  }

  /** Reset to disconnected state (always succeeds). */
  reset(): void {
    this._phase = 'disconnected';
  }
}
