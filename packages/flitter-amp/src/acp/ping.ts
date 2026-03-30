// Lightweight ping probe over the ACP connection (Gap #58)
//
// Uses the SDK's extMethod() to send a custom '$/ping' JSON-RPC request.
// The agent may respond with:
// - A pong result (if it supports the extension)
// - A -32601 "method not found" error (standard JSON-RPC behavior)
//
// Either response confirms the agent is alive and processing messages.
// Throws if the agent does not respond at all (connection dead).

import type * as acp from '@agentclientprotocol/sdk';
import { log } from '../utils/logger';

/**
 * Send a lightweight ping over the ACP connection.
 *
 * Either a success or a -32601 "method not found" error confirms the
 * agent is alive. Only transport-level errors (stream closed) propagate.
 */
export async function pingAgent(
  connection: acp.ClientSideConnection,
): Promise<void> {
  try {
    // Use the SDK's extMethod for extension RPCs -- no cast needed.
    await connection.extMethod('$/ping', { timestamp: Date.now() });
  } catch (err: unknown) {
    // A JSON-RPC error response (-32601) still means the agent is alive.
    // Only re-throw if it is a transport-level error (stream closed, etc.)
    const errObj = err as { code?: number; message?: string };
    if (errObj?.code === -32601 || errObj?.message?.includes('Method not found')) {
      log.debug('Ping received MethodNotFound -- agent is alive');
      return;
    }
    throw err;
  }
}
