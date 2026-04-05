// Shared test harness factory for creating fully-wired AppState instances.
//
// Consolidates the createTestAppState / createIntegrationHarness helpers
// that were duplicated across 10+ test files. Provides a single entry point
// with configurable options.

import { MockProvider } from './mock-provider';
import { SessionState } from '../state/session';
import { PromptHistory } from '../state/history';
import { SessionStore } from '../state/session-store';
import { AppState } from '../state/app-state';
import { PromptController } from '../state/prompt-controller';
import type { ToolRegistry } from '../tools/registry';
import type { PermissionRequest, PermissionResult } from '../state/permission-types';

/** Options for creating a test harness. */
export interface TestHarnessOptions {
  /** Session ID. Defaults to 'test-session-id'. */
  sessionId?: string;
  /** Working directory. Defaults to '/test/cwd'. */
  cwd?: string;
  /** Tool registry for agentic loop tests. */
  toolRegistry?: ToolRegistry | null;
  /** System prompt override. */
  systemPrompt?: string | null;
  /** Permission request callback for permission dialog tests. */
  onPermissionRequest?: (request: PermissionRequest) => Promise<PermissionResult>;
  /** Default tool call expansion state (N10). */
  defaultToolExpanded?: boolean;
}

/** The return type of createTestAppState — provides all test-accessible objects. */
export interface TestHarness {
  appState: AppState;
  session: SessionState;
  provider: MockProvider;
  controller: PromptController;
}

/**
 * Creates a fully-wired AppState with MockProvider for unit/integration testing.
 *
 * Constructs SessionState, AppState, MockProvider, and PromptController, wires
 * them together, and returns all objects for test access.
 *
 * Replaces the per-file `createTestAppState()` / `createIntegrationHarness()`
 * functions that were duplicated across the test suite.
 */
export function createTestAppState(opts?: TestHarnessOptions): TestHarness {
  const provider = new MockProvider();
  const session = new SessionState({
    sessionId: opts?.sessionId ?? 'test-session-id',
    cwd: opts?.cwd ?? '/test/cwd',
    model: provider.model,
    defaultToolExpanded: opts?.defaultToolExpanded,
  });
  const appState = new AppState(session, new PromptHistory(), new SessionStore());
  const controller = new PromptController({
    session,
    provider,
    toolRegistry: opts?.toolRegistry ?? null,
    systemPrompt: opts?.systemPrompt ?? null,
    onPermissionRequest: opts?.onPermissionRequest,
  });
  appState.setPromptController(controller);
  return { appState, session, provider, controller };
}
