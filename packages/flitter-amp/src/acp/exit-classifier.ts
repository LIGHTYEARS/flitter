// Exit classification for agent process exits (Gap #57)
//
// Determines whether an agent exit warrants automatic reconnection.
// Returns true for exits that are likely transient (crashes, OOM kills).
// Returns false for exits that indicate permanent problems (missing binary,
// configuration errors, clean shutdowns, user-initiated termination).

/**
 * Determine whether an agent exit warrants automatic reconnection.
 */
export function shouldAutoReconnect(
  code: number | null,
  signal: string | null,
): boolean {
  // If we killed it ourselves (SIGTERM from cleanup()), do not reconnect
  if (signal === 'SIGTERM') return false;

  // Clean exit (code 0) -- intentional shutdown, do not reconnect
  if (code === 0) return false;

  // Exit code 127 -- command not found. Permanent, do not reconnect.
  if (code === 127) return false;

  // SIGKILL (9) -- typically OOM killer. Transient, reconnect.
  if (signal === 'SIGKILL') return true;

  // SIGSEGV (11) -- crash. Transient if caused by race condition.
  if (signal === 'SIGSEGV') return true;

  // SIGABRT (6) -- assertion failure. Potentially transient.
  if (signal === 'SIGABRT') return true;

  // All other non-zero exits: default to reconnect. The attempt limit
  // in ReconnectionManager provides the safety net.
  return true;
}
