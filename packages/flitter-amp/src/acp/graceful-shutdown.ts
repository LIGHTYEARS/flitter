// Graceful shutdown orchestrator (Gap #60)
//
// Provides a single async function that performs an orderly teardown of the
// ACP session, agent process, and local resources within a hard deadline.
//
// Shutdown sequence:
// 1. Persist session to disk (sync)
// 2. Send closeSession RPC (if agent supports it) with timeout
// 3. Cleanup client terminals
// 4. Kill agent subprocess (SIGTERM, then SIGKILL after 3s)
// 5. Close log file
//
// An overall 8-second deadline prevents the UI from hanging if the agent
// or I/O gets stuck.

import { log, closeLogFile } from '../utils/logger';
import { resetPipelineLogSink } from 'flitter-core';
import { closeSession } from './connection';
import type { ConnectionHandle } from './connection';

/** Default overall deadline for the full shutdown sequence. */
export const SHUTDOWN_DEADLINE_MS = 8_000;

export interface ShutdownDeps {
  /** The active connection handle (connection, client, agent). */
  handle: ConnectionHandle;
  /** Synchronous callback to persist the current session state. */
  saveSession: () => void;
}

/**
 * Perform an orderly shutdown of the ACP session and agent process.
 *
 * Returns a boolean indicating whether the shutdown completed gracefully
 * within the deadline.
 *
 * NEVER throws -- all errors are caught and logged.
 */
export async function gracefulShutdown(
  deps: ShutdownDeps,
  deadlineMs: number = SHUTDOWN_DEADLINE_MS,
): Promise<boolean> {
  const start = Date.now();

  const deadlinePromise = new Promise<'timeout'>((resolve) => {
    setTimeout(() => resolve('timeout'), deadlineMs);
  });

  const shutdownWork = async (): Promise<'done'> => {
    // Phase 1: Persist session to disk (synchronous)
    try {
      log.info('Shutdown phase 1: saving session...');
      deps.saveSession();
      log.info('Session saved');
    } catch (err) {
      log.warn('Session save failed during shutdown', err instanceof Error ? { error: err.message } : undefined);
    }

    // Phase 2: Send closeSession RPC (if supported)
    // closeSession() already handles its own timeout and never throws.
    const remaining = deadlineMs - (Date.now() - start);
    if (remaining > 1_000) {
      log.info('Shutdown phase 2: sending closeSession...');
      await closeSession(
        deps.handle.connection,
        deps.handle.sessionId,
        deps.handle.capabilities,
        Math.min(remaining - 500, 5_000), // leave headroom for subsequent phases
      );
    } else {
      log.info('Shutdown phase 2: skipping closeSession (insufficient time)');
    }

    // Phase 3: Cleanup client-managed terminals
    try {
      log.info('Shutdown phase 3: cleaning up terminals...');
      deps.handle.client.cleanup();
    } catch (err) {
      log.warn('Terminal cleanup failed during shutdown', err instanceof Error ? { error: err.message } : undefined);
    }

    // Phase 4: Kill agent subprocess
    try {
      log.info('Shutdown phase 4: killing agent process...');
      deps.handle.agent.kill();
    } catch (err) {
      log.warn('Agent kill failed during shutdown', err instanceof Error ? { error: err.message } : undefined);
    }

    // Phase 5: Close log file
    log.info(`Shutdown complete in ${Date.now() - start}ms`);
    resetPipelineLogSink();
    closeLogFile();

    return 'done';
  };

  const result = await Promise.race([shutdownWork(), deadlinePromise]);

  if (result === 'timeout') {
    // Deadline exceeded -- force-kill what we can
    try {
      deps.handle.client.cleanup();
    } catch { /* swallow */ }
    try {
      deps.handle.agent.kill();
    } catch { /* swallow */ }
    closeLogFile();
    return false;
  }

  return true;
}
