// Capability inspection utilities for ACP agent connections

import type { AgentCapabilities } from '@agentclientprotocol/sdk';

export function hasSessionCapability(
  capabilities: AgentCapabilities | undefined,
  capability: keyof NonNullable<AgentCapabilities['sessionCapabilities']>,
): boolean {
  if (!capabilities) return false;
  const session = capabilities.sessionCapabilities;
  if (!session || typeof session !== 'object') return false;
  return session[capability] != null;
}

export function supportsCloseSession(
  capabilities: AgentCapabilities | undefined,
): boolean {
  return hasSessionCapability(capabilities, 'close');
}
