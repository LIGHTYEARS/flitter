// Capability inspection utilities for ACP agent connections

import type * as acp from '@agentclientprotocol/sdk';

/**
 * Check whether the connected agent advertises a specific session capability.
 *
 * The ACP AgentCapabilities object can contain a `session` sub-object with
 * boolean flags for optional session lifecycle features. This helper
 * safely navigates the nested structure.
 */
export function hasSessionCapability(
  capabilities: acp.AgentCapabilities | undefined,
  capability: string,
): boolean {
  if (!capabilities) return false;
  const session = (capabilities as Record<string, unknown>).session;
  if (!session || typeof session !== 'object') return false;
  return (session as Record<string, unknown>)[capability] === true;
}

/**
 * Check whether the agent supports the session.close capability.
 *
 * When true, the client can call `unstable_closeSession` to request
 * graceful session teardown before killing the agent process.
 */
export function supportsCloseSession(
  capabilities: acp.AgentCapabilities | undefined,
): boolean {
  return hasSessionCapability(capabilities, 'close');
}
