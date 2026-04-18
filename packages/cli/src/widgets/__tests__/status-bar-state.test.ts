/**
 * StatusBarState model + deriveStatusMessage unit tests.
 *
 * Cross-references amp source: amp-cli-reversed/modules/2731_unknown_yB.js
 * - yB() priority chain: compacting > approval > tools > inference > cancelled > context
 * - Threshold logic from GN0/KN0 in amp-cli-reversed/modules/2730_unknown_GN0.js
 *
 * @module
 */

import { describe, expect, it } from "bun:test";
import {
  CONTEXT_DANGER,
  CONTEXT_RECOMMENDATION,
  CONTEXT_WARNING,
  deriveStatusMessage,
  type StatusBarState,
} from "../status-bar.js";

// ════════════════════════════════════════════════════
//  Helper: create a default idle state
// ════════════════════════════════════════════════════

function makeState(overrides: Partial<StatusBarState> = {}): StatusBarState {
  return {
    modelName: "claude-sonnet-4-20250514",
    inferenceState: "idle",
    hasStartedStreaming: false,
    tokenUsage: { inputTokens: 100, outputTokens: 50, maxInputTokens: 10000 },
    compactionState: "idle",
    runningToolCount: 0,
    waitingForApproval: false,
    ...overrides,
  };
}

// ════════════════════════════════════════════════════
//  deriveStatusMessage tests
// ════════════════════════════════════════════════════

describe("deriveStatusMessage", () => {
  it("returns 'Streaming response...' when running + streaming", () => {
    const state = makeState({
      inferenceState: "running",
      hasStartedStreaming: true,
    });
    expect(deriveStatusMessage(state)).toBe("Streaming response...");
  });

  it("returns 'Waiting for response...' when running + not streaming", () => {
    const state = makeState({
      inferenceState: "running",
      hasStartedStreaming: false,
    });
    expect(deriveStatusMessage(state)).toBe("Waiting for response...");
  });

  it("returns 'Waiting for approval...' when waitingForApproval is true", () => {
    const state = makeState({
      waitingForApproval: true,
    });
    expect(deriveStatusMessage(state)).toBe("Waiting for approval...");
  });

  it("returns 'Running N tools...' when runningToolCount > 1", () => {
    const state = makeState({
      runningToolCount: 3,
    });
    expect(deriveStatusMessage(state)).toBe("Running 3 tools...");
  });

  it("returns 'Running tools...' when runningToolCount === 1", () => {
    const state = makeState({
      runningToolCount: 1,
    });
    expect(deriveStatusMessage(state)).toBe("Running tools...");
  });

  it("returns 'Auto-compacting...' when compacting", () => {
    const state = makeState({
      compactionState: "compacting",
    });
    expect(deriveStatusMessage(state)).toBe("Auto-compacting...");
  });

  it("returns 'Cancelled' when inference is cancelled", () => {
    const state = makeState({
      inferenceState: "cancelled",
    });
    expect(deriveStatusMessage(state)).toBe("Cancelled");
  });

  it("returns 'Context near full.' when idle with danger threshold (ratio >= 0.9)", () => {
    // ratio = 9000/10000 = 0.9 which is >= CONTEXT_DANGER
    const state = makeState({
      tokenUsage: { inputTokens: 9000, outputTokens: 50, maxInputTokens: 10000 },
    });
    expect(deriveStatusMessage(state)).toBe("Context near full.");
  });

  it("returns null when idle with low usage", () => {
    const state = makeState({
      tokenUsage: { inputTokens: 100, outputTokens: 50, maxInputTokens: 10000 },
    });
    expect(deriveStatusMessage(state)).toBeNull();
  });
});

// ════════════════════════════════════════════════════
//  Threshold constants (sanity)
// ════════════════════════════════════════════════════

describe("Context thresholds", () => {
  it("has correct ordering: recommendation < warning < danger", () => {
    expect(CONTEXT_RECOMMENDATION).toBeLessThan(CONTEXT_WARNING);
    expect(CONTEXT_WARNING).toBeLessThan(CONTEXT_DANGER);
  });
});
