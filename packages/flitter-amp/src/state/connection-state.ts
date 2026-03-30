// Connection state machine types for reconnection lifecycle (Gap #57)

export type ConnectionPhase =
  | 'connecting'      // Initial connection or reconnect in progress
  | 'connected'       // Agent is live, session is active
  | 'reconnecting'    // Agent died, auto-reconnect in progress
  | 'disconnected';   // All retries exhausted or user-initiated disconnect

export interface ConnectionStatus {
  phase: ConnectionPhase;
  attempt: number;         // Current retry attempt (0 when connected)
  maxAttempts: number;     // Configured retry ceiling
  lastError: string | null;
  nextRetryAt: number | null; // Unix ms timestamp of next retry
}
