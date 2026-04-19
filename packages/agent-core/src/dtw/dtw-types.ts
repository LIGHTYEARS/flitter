/**
 * @flitter/agent-core — DTW (Durable Thread Worker) type definitions
 *
 * 逆向: chunk-005.js:4470-4534 (Fz0, Gz0, Kz0, Vz0, Xz0 functions)
 * 逆向: chunk-005.js:4569-4620 (dtw-curl command options/actions)
 * 逆向: chunk-005.js:2445-2492 (DTW message ID references)
 *
 * Defines the TypeScript types for the DTW client transport and protocol.
 * Server-side implementation is out of scope — these types support the client only.
 */

/**
 * DTW connection configuration.
 * 逆向: chunk-005.js:4479 (fetch `${T.ampURL}/api/durable-thread-workers`)
 */
export interface DTWConnectionConfig {
  /** Base URL for the DTW service (e.g. "https://ampcode.com") */
  serviceUrl: string;
  /** API key / Bearer token for authentication */
  apiKey: string;
  /** Optional agent mode to use for thread creation */
  agentMode?: string;
  /** Optional repository URL for context */
  repositoryUrl?: string;
}

/**
 * DTW client state.
 * 逆向: chunk-005.js:4113 (DTW mode checks, dtwEnabled flag)
 */
export type DTWClientState =
  | "disconnected"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "error";

/**
 * Message sent from client to DTW server.
 * 逆向: chunk-005.js:4682 (add-message action)
 */
export interface DTWSendMessage {
  type: "add-message";
  content: string;
  /** Optional agent mode override */
  agentMode?: string;
}

/**
 * Response message from DTW server (streaming assistant response).
 * 逆向: chunk-005.js:2445 (DTW message ID format)
 */
export interface DTWResponseMessage {
  type: "message";
  /** Server-assigned message ID (dtwMessageID format) */
  messageId: string;
  role: "assistant";
  content: DTWContentBlock[];
  state: DTWMessageState;
}

/**
 * Content block in a DTW response.
 */
export interface DTWContentBlock {
  type: "text" | "tool_use" | "thinking";
  text?: string;
  id?: string;
  name?: string;
  input?: Record<string, unknown>;
}

/**
 * Message state from DTW.
 */
export interface DTWMessageState {
  type: "streaming" | "complete" | "error";
  stopReason?: string;
  error?: string;
}

/**
 * Thread state sync event from DTW.
 * 逆向: chunk-005.js:4585 (get-transcript action)
 */
export interface DTWThreadSync {
  type: "thread-sync";
  threadId: string;
  messages: DTWResponseMessage[];
  title?: string;
  version: number;
}

/**
 * Events emitted by the DTW client.
 */
export interface DTWClientEvents {
  /** Connection state changed */
  stateChange: (state: DTWClientState) => void;
  /** Received a response message */
  message: (msg: DTWResponseMessage) => void;
  /** Thread state synced from server */
  threadSync: (sync: DTWThreadSync) => void;
  /** Error occurred */
  error: (err: Error) => void;
}

/**
 * Create thread response.
 * 逆向: chunk-005.js:4492 (e.threadId validation)
 */
export interface DTWCreateResponse {
  threadId: string;
}

/**
 * Durable object ID response.
 * 逆向: chunk-005.js:4496 (Gz0 validation — requires durableObjectId string)
 */
export interface DTWDurableObjectIdResponse {
  durableObjectId: string;
}
