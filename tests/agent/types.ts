// Agent Test Framework — Type Definitions
//
// Core types for the markdown-based agent test system.
// Test cases are .test.md files with YAML frontmatter + natural language steps.
// A single Claude subagent executes each case and returns structured results.

/** Test case categories — each has a distinct execution profile. */
export type AgentTestCategory =
  | 'state-machine'    // Pure state transitions, no I/O
  | 'e2e'              // Full user operation chains
  | 'integration'      // Multi-component collaboration
  | 'ui'               // TUI rendering and widget behavior
  | 'performance';     // Latency, memory, throughput

/** Priority levels — determine execution order and failure thresholds. */
export type AgentTestPriority = 'P0' | 'P1' | 'P2' | 'P3';

/** Verdict for a single checkpoint. */
export type CheckpointVerdict = 'pass' | 'fail' | 'uncertain';

/** YAML frontmatter parsed from a .test.md file. */
export interface AgentTestMeta {
  name: string;
  category: AgentTestCategory;
  priority: AgentTestPriority;
  timeout?: string;                  // e.g. '30s', '120s'
  requires?: string[];               // e.g. ['test-harness', 'mock-provider']
  fixture?: {
    session?: string;                // fixture name (no extension)
    stream?: string;
  };
  tags?: string[];
  'linked-plans'?: string[];         // GSD plan IDs
  'generated-by'?: string;           // plan ID that generated this case
}

/** A parsed .test.md file — frontmatter + raw markdown body. */
export interface AgentTestCase {
  /** Absolute file path. */
  filePath: string;
  /** Parsed YAML frontmatter. */
  meta: AgentTestMeta;
  /** Raw markdown body (everything after the frontmatter). */
  body: string;
}

/** Result of a single checkpoint evaluation (returned by subagent). */
export interface CheckpointResult {
  /** Original checkpoint text from the .test.md. */
  text: string;
  /** Pass/fail/uncertain verdict. */
  verdict: CheckpointVerdict;
  /** Actual observed value (for structured assertions). */
  actual: unknown;
  /** Why the subagent judged this way. */
  reasoning: string;
  /** Confidence 0-1 (uncertain when < 0.7). */
  confidence: number;
}

/** Result of a single step (returned by subagent). */
export interface StepResult {
  /** Step number (1-indexed). */
  step: number;
  /** Step title from the .test.md. */
  title: string;
  /** Individual checkpoint results. */
  checkpoints: CheckpointResult[];
  /** Errors encountered during execution (not checkpoint failures). */
  errors: string[];
  /** Duration in milliseconds. */
  durationMs: number;
}

/** Overall result of a single test case. */
export interface CaseResult {
  /** Test case name (from frontmatter). */
  name: string;
  /** File path. */
  filePath: string;
  /** Frontmatter metadata. */
  meta: AgentTestMeta;
  /** Per-step results. */
  steps: StepResult[];
  /** Overall verdict: pass if all checkpoints pass, fail if any P0 fails, etc. */
  verdict: CheckpointVerdict;
  /** Total duration in milliseconds. */
  durationMs: number;
  /** Number of retries used. */
  retries: number;
}

/** Aggregated report for a full run. */
export interface AgentTestReport {
  /** ISO timestamp of the run. */
  timestamp: string;
  /** All case results. */
  cases: CaseResult[];
  /** Summary counts. */
  summary: {
    total: number;
    pass: number;
    fail: number;
    uncertain: number;
  };
  /** Per-priority breakdown. */
  byPriority: Record<AgentTestPriority, { total: number; pass: number; fail: number; uncertain: number }>;
  /** Total duration in milliseconds. */
  durationMs: number;
}

// ---------------------------------------------------------------------------
// Execution profiles — per-category defaults
// ---------------------------------------------------------------------------

/** Execution profile for a category. */
export interface ExecutionProfile {
  /** Default timeout in seconds. */
  timeoutSec: number;
  /** Max retries on failure. Keyed by priority. */
  maxRetries: Record<AgentTestPriority, number>;
  /** Whether fixtures are required. */
  requiresFixture: boolean;
  /** Additional context to inject into the subagent prompt. */
  promptContext: string;
}

/** Default execution profiles per category. */
export const EXECUTION_PROFILES: Record<AgentTestCategory, ExecutionProfile> = {
  'state-machine': {
    timeoutSec: 30,
    maxRetries: { P0: 2, P1: 1, P2: 0, P3: 0 },
    requiresFixture: false,
    promptContext: 'This is a pure state-machine test. Focus on state transitions, event handling, and lifecycle correctness. No I/O or rendering needed.',
  },
  'e2e': {
    timeoutSec: 60,
    maxRetries: { P0: 2, P1: 1, P2: 0, P3: 0 },
    requiresFixture: true,
    promptContext: 'This is an end-to-end test. You need a fully-wired TestHarness with MockProvider. Simulate complete user interaction flows.',
  },
  'integration': {
    timeoutSec: 45,
    maxRetries: { P0: 2, P1: 1, P2: 0, P3: 0 },
    requiresFixture: true,
    promptContext: 'This is an integration test. Multiple components must be wired together. Use createTestAppState() from test-utils.',
  },
  'ui': {
    timeoutSec: 30,
    maxRetries: { P0: 2, P1: 1, P2: 0, P3: 0 },
    requiresFixture: false,
    promptContext: 'This is a UI test. Test widget behavior, build output, and interaction callbacks. You may need to instantiate widgets with mock data.',
  },
  'performance': {
    timeoutSec: 120,
    maxRetries: { P0: 1, P1: 0, P2: 0, P3: 0 },
    requiresFixture: true,
    promptContext: 'This is a performance test. Measure timing with performance.now(), control GC with Bun.gc(true), check memory with process.memoryUsage(). Run the measured operation multiple times and take the median.',
  },
};

// ---------------------------------------------------------------------------
// Optimization loop types (autoresearch-style)
// ---------------------------------------------------------------------------

/** A single entry in agent-test.jsonl. */
export type JournalEntry = JournalConfig | JournalRun | JournalDone;

export interface JournalConfig {
  type: 'config';
  session: string;            // ISO timestamp
  goal: string;
  metric: string;             // e.g. 'fail_count+uncertain_count'
  direction: 'lower' | 'higher';
}

export interface JournalRun {
  type: 'run';
  id: number;
  timestamp: string;
  action: string;             // Description of what was tried
  metric_before: Record<string, number>;
  metric_after: Record<string, number>;
  status: 'keep' | 'discard';
  commit?: string;            // Git SHA if kept
}

export interface JournalDone {
  type: 'done';
  total_runs: number;
  final: Record<string, number>;
  duration: string;
}

// ---------------------------------------------------------------------------
// CLI options
// ---------------------------------------------------------------------------

export interface RunOptions {
  /** Filter by linked plan IDs. */
  linkedPlan?: string[];
  /** Filter by priority. */
  priority?: AgentTestPriority[];
  /** Filter by category. */
  category?: AgentTestCategory[];
  /** Run a single case by name. */
  case?: string;
  /** Enable optimization loop after run. */
  optimize?: boolean;
  /** Max optimization iterations. */
  maxIterations?: number;
}

export interface GenerateOptions {
  /** GSD plan ID to generate tests for. */
  plan: string;
}
