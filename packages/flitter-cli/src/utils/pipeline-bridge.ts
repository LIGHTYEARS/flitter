// Pipeline bridge — redirects flitter-core's pipeline debug logs and frame timing
// into flitter-cli's structured NDJSON logger.
//
// Activated at startup via initPipelineBridge(), deactivated on shutdown
// via teardownPipelineBridge(). Uses setPipelineLogSink() from flitter-core
// (already exported) so no core changes are needed.

import { setPipelineLogSink, resetPipelineLogSink } from 'flitter-core';
import { log } from './logger';

/** Frame budget in ms. Frames exceeding this threshold emit a warning. */
const FRAME_BUDGET_MS = 16.67;

/** Regex to parse FRAME pipeline log messages emitted by the frame scheduler. */
const FRAME_LOG_RE =
  /^total=([\d.]+)ms build=([\d.]+)ms layout=([\d.]+)ms paint=([\d.]+)ms render=([\d.]+)ms$/;

/**
 * Pipeline log sink that routes flitter-core diagnostics into the structured logger.
 *
 * - FRAME tags: parsed for timing data; overruns (>16.67ms) emit a structured warning.
 * - All other tags: forwarded as debug-level structured log entries.
 */
function pipelineSink(tag: string, msg: string): void {
  if (tag === 'FRAME') {
    const match = msg.match(FRAME_LOG_RE);
    if (match) {
      const totalMs = parseFloat(match[1]);
      const buildMs = parseFloat(match[2]);
      const layoutMs = parseFloat(match[3]);
      const paintMs = parseFloat(match[4]);
      const renderMs = parseFloat(match[5]);

      if (totalMs > FRAME_BUDGET_MS) {
        log.warn('frame-overrun', {
          totalMs,
          buildMs,
          layoutMs,
          paintMs,
          renderMs,
        });
        return;
      }
    }
  }

  // All other pipeline logs: write as debug-level entries
  log.debug(`[pipeline:${tag}] ${msg}`);
}

/**
 * Activate the pipeline bridge: redirect flitter-core's pipelineLog
 * output into flitter-cli's structured NDJSON logger.
 *
 * Call once at startup, after initLogFile().
 */
export function initPipelineBridge(): void {
  setPipelineLogSink(pipelineSink);
}

/**
 * Deactivate the pipeline bridge: restore flitter-core's default stderr sink.
 *
 * Call on shutdown, before closeLogFile().
 */
export function teardownPipelineBridge(): void {
  resetPipelineLogSink();
}
