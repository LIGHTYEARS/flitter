/**
 * @flitter/agent-core — DTW protocol message definitions
 *
 * 逆向: chunk-005.js:4470-4534 (HTTP API endpoints)
 * 逆向: chunk-005.js:4569-4620 (dtw-curl actions)
 *
 * Defines the wire protocol messages for DTW client-server communication.
 * The DTW service uses HTTP for RPC and WebSocket for streaming.
 */

/**
 * DTW API endpoints.
 * 逆向: chunk-005.js:4479 — POST /api/durable-thread-workers
 * 逆向: chunk-005.js:4499 — GET /threads/{id}/durable-object-id
 * 逆向: chunk-005.js:4517 — POST /threads/{id}/spawn
 */
export const DTW_ENDPOINTS = {
  /** Create a new DTW thread */
  create: "/api/durable-thread-workers",
  /** Get durable object ID for a thread */
  durableObjectId: (threadId: string) => `/threads/${threadId}/durable-object-id`,
  /** Add a message to a thread */
  addMessage: (threadId: string) => `/threads/${threadId}/messages`,
  /** Get full transcript of a thread */
  getTranscript: (threadId: string) => `/threads/${threadId}/transcript`,
  /** Spawn a sandbox for a thread */
  spawn: (threadId: string) => `/threads/${threadId}/spawn`,
  /** Dump thread state as sqlite */
  dump: (threadId: string) => `/threads/${threadId}/dump`,
} as const;

/**
 * DTW thread ID validation.
 * 逆向: chunk-005.js:4492 (Vt function — threadId format check)
 *
 * Thread IDs follow the pattern: T-{uuid}
 */
export function isValidThreadId(id: string): boolean {
  return /^T-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

/**
 * Durable object ID validation.
 * 逆向: chunk-005.js:4496 (Gz0 function)
 */
export function isValidDurableObjectId(response: unknown): boolean {
  return (
    typeof response === "object" &&
    response !== null &&
    "durableObjectId" in response &&
    typeof (response as Record<string, unknown>).durableObjectId === "string" &&
    ((response as Record<string, unknown>).durableObjectId as string).length > 0
  );
}

/**
 * UUID v4 validation for durable object IDs.
 * 逆向: chunk-005.js:4513-4514 (Vz0 function)
 */
export function isValidUUID(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}
