#!/usr/bin/env bun
// Agent Test Runner — Main entry point.
//
// Parses .test.md files, dispatches execution to Claude subagents,
// collects results, generates reports, and optionally runs the
// autoresearch-style optimization loop.
//
// Usage:
//   bun run tests/agent/runner.ts run [options]
//   bun run tests/agent/runner.ts generate --plan <plan-id>
//   bun run tests/agent/runner.ts uncertain --latest
//   bun run tests/agent/runner.ts list

import { readFileSync, writeFileSync, appendFileSync, mkdirSync, existsSync, readdirSync } from 'fs';
import { join, basename, relative } from 'path';
import type {
  AgentTestCase,
  AgentTestMeta,
  AgentTestCategory,
  AgentTestPriority,
  CaseResult,
  StepResult,
  CheckpointResult,
  AgentTestReport,
  RunOptions,
  JournalConfig,
  JournalRun,
  JournalDone,
  ExecutionProfile,
} from './types';
import { EXECUTION_PROFILES } from './types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ROOT = join(import.meta.dir, '../..');
const AGENT_DIR = import.meta.dir;
const CASES_DIR = join(AGENT_DIR, 'cases');
const REPORTS_DIR = join(AGENT_DIR, 'reports');
const JOURNAL_PATH = join(AGENT_DIR, 'agent-test.jsonl');
const WORKLOG_PATH = join(AGENT_DIR, 'agent-test.worklog.md');

// ---------------------------------------------------------------------------
// Frontmatter parser (minimal — 20 lines, no external deps)
// ---------------------------------------------------------------------------

interface ParsedFile {
  meta: AgentTestMeta;
  body: string;
}

function parseFrontmatter(content: string): ParsedFile {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) {
    throw new Error('No YAML frontmatter found (expected --- delimiters)');
  }

  const yamlBlock = match[1];
  const body = match[2];

  // Minimal YAML parser — handles flat keys, arrays, and nested objects
  const meta: Record<string, unknown> = {};
  let currentKey = '';
  let currentIndent = 0;
  let nestedObj: Record<string, unknown> = {};
  let inNested = false;

  for (const line of yamlBlock.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const indent = line.length - line.trimStart().length;

    // Nested object value
    if (inNested && indent > currentIndent) {
      const [k, ...rest] = trimmed.split(':');
      const val = rest.join(':').trim();
      if (k && val) {
        nestedObj[k.trim()] = parseYamlValue(val);
      }
      continue;
    } else if (inNested) {
      meta[currentKey] = nestedObj;
      inNested = false;
      nestedObj = {};
    }

    // Top-level key: value
    const colonIdx = trimmed.indexOf(':');
    if (colonIdx === -1) continue;

    const key = trimmed.slice(0, colonIdx).trim();
    const rawVal = trimmed.slice(colonIdx + 1).trim();

    if (!rawVal) {
      // Could be nested object or empty
      currentKey = key;
      currentIndent = indent;
      inNested = true;
      nestedObj = {};
      continue;
    }

    meta[key] = parseYamlValue(rawVal);
  }

  if (inNested) {
    meta[currentKey] = nestedObj;
  }

  return { meta: meta as unknown as AgentTestMeta, body };
}

function parseYamlValue(raw: string): unknown {
  // Array: [a, b, c]
  if (raw.startsWith('[') && raw.endsWith(']')) {
    return raw.slice(1, -1).split(',').map(s => s.trim().replace(/^['"]|['"]$/g, ''));
  }
  // Quoted string
  if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) {
    return raw.slice(1, -1);
  }
  // Number
  if (/^\d+(\.\d+)?$/.test(raw)) return parseFloat(raw);
  // Boolean
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  // Plain string
  return raw;
}

// ---------------------------------------------------------------------------
// Case discovery
// ---------------------------------------------------------------------------

function discoverCases(opts: RunOptions): AgentTestCase[] {
  if (!existsSync(CASES_DIR)) {
    console.error(`No cases directory found at ${CASES_DIR}`);
    return [];
  }

  const cases: AgentTestCase[] = [];

  function scanDir(dir: string) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        scanDir(join(dir, entry.name));
      } else if (entry.name.endsWith('.test.md')) {
        const filePath = join(dir, entry.name);
        try {
          const content = readFileSync(filePath, 'utf-8');
          const { meta, body } = parseFrontmatter(content);
          cases.push({ filePath, meta, body });
        } catch (e) {
          console.error(`Failed to parse ${filePath}: ${(e as Error).message}`);
        }
      }
    }
  }

  scanDir(CASES_DIR);

  // Apply filters
  return cases.filter(c => {
    if (opts.case && c.meta.name !== opts.case) return false;
    if (opts.priority?.length && !opts.priority.includes(c.meta.priority)) return false;
    if (opts.category?.length && !opts.category.includes(c.meta.category)) return false;
    if (opts.linkedPlan?.length) {
      const linked = c.meta['linked-plans'] ?? [];
      if (!opts.linkedPlan.some(p => linked.includes(p))) return false;
    }
    return true;
  });
}

// ---------------------------------------------------------------------------
// Sort + group
// ---------------------------------------------------------------------------

const PRIORITY_ORDER: Record<AgentTestPriority, number> = { P0: 0, P1: 1, P2: 2, P3: 3 };

function sortCases(cases: AgentTestCase[]): AgentTestCase[] {
  return [...cases].sort((a, b) => {
    const pa = PRIORITY_ORDER[a.meta.priority] ?? 9;
    const pb = PRIORITY_ORDER[b.meta.priority] ?? 9;
    if (pa !== pb) return pa - pb;
    return a.meta.name.localeCompare(b.meta.name);
  });
}

// ---------------------------------------------------------------------------
// Subagent prompt builder
// ---------------------------------------------------------------------------

function buildSubagentPrompt(testCase: AgentTestCase, profile: ExecutionProfile, retryContext?: string): string {
  const fixtureInfo = testCase.meta.fixture
    ? `\n## Fixtures Available\n- Session: ${testCase.meta.fixture.session ?? 'none'}\n- Stream: ${testCase.meta.fixture.stream ?? 'none'}\nUse the fixture builders from tests/agent/fixtures/ to load these.`
    : '';

  const retrySection = retryContext
    ? `\n## Previous Attempt Failed\n${retryContext}\nFix the issues and try again.`
    : '';

  return `You are an Agent Test Executor for the flitter project.

## Your Task
Execute the following test case and evaluate every checkpoint. For EACH checkpoint, you MUST provide:
- \`pass\`, \`fail\`, or \`uncertain\` verdict
- The actual observed value
- Your reasoning
- A confidence score (0-1)

## Environment
- Working directory: ${ROOT}
- Test framework: Bun (bun:test for imports, but you write standalone scripts)
- Package: packages/flitter-cli
- Test utilities: packages/flitter-cli/src/test-utils/ (MockProvider, createTestAppState, stream event builders)
- Fixture builders: tests/agent/fixtures/builders.ts

## Execution Profile
${profile.promptContext}
- Timeout: ${profile.timeoutSec}s

## Rules
1. Write TypeScript code, save it to a temp file, and run it with \`bun run\`
2. Do NOT modify any source code — only create temp test scripts
3. Import from the project using relative paths from the temp file location
4. For each step, collect the actual values needed for checkpoint evaluation
5. If a step fails with an error, report the error but continue to subsequent steps
6. Clean up temp files when done
${fixtureInfo}
${retrySection}

## Test Case

${testCase.body}

## Output Format
After executing ALL steps, output a single JSON block (fenced with \`\`\`json) containing your results:

\`\`\`json
{
  "steps": [
    {
      "step": 1,
      "title": "Step title from the test case",
      "checkpoints": [
        {
          "text": "Original checkpoint text",
          "verdict": "pass",
          "actual": "the actual value observed",
          "reasoning": "Why this passes/fails",
          "confidence": 0.95
        }
      ],
      "errors": [],
      "durationMs": 123
    }
  ]
}
\`\`\`

IMPORTANT: The JSON block must be valid JSON. Use double quotes for strings. Escape special characters properly.`;
}

// ---------------------------------------------------------------------------
// Result parser (extract JSON from subagent output)
// ---------------------------------------------------------------------------

function parseSubagentResult(output: string): StepResult[] {
  // Find the last JSON code block in the output
  const jsonBlocks = [...output.matchAll(/```json\s*\n([\s\S]*?)\n```/g)];
  if (jsonBlocks.length === 0) {
    // Try to find raw JSON object
    const rawMatch = output.match(/\{[\s\S]*"steps"[\s\S]*\}/);
    if (rawMatch) {
      try {
        const parsed = JSON.parse(rawMatch[0]);
        return parsed.steps ?? [];
      } catch { /* fall through */ }
    }
    console.error('  ⚠ No JSON result block found in subagent output');
    return [];
  }

  const lastBlock = jsonBlocks[jsonBlocks.length - 1][1];
  try {
    const parsed = JSON.parse(lastBlock);
    return parsed.steps ?? [];
  } catch (e) {
    console.error(`  ⚠ Failed to parse JSON result: ${(e as Error).message}`);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Execute a single case (with retries)
// ---------------------------------------------------------------------------

async function executeCase(testCase: AgentTestCase): Promise<CaseResult> {
  const profile = EXECUTION_PROFILES[testCase.meta.category];
  const maxRetries = profile.maxRetries[testCase.meta.priority];
  const startTime = Date.now();

  let steps: StepResult[] = [];
  let retries = 0;
  let lastError = '';

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (attempt > 0) {
      retries = attempt;
      console.log(`  ↻ Retry ${attempt}/${maxRetries}...`);
    }

    const prompt = buildSubagentPrompt(
      testCase,
      profile,
      attempt > 0 ? lastError : undefined,
    );

    try {
      // Write prompt to a temp file for the subagent
      const promptFile = join(AGENT_DIR, '.tmp-prompt.md');
      writeFileSync(promptFile, prompt);

      // Execute via bun subprocess (simulates subagent execution)
      // In the real GSD integration, this would be a Task() tool call
      const result = await executeViaSubprocess(testCase, prompt, profile.timeoutSec);
      steps = parseSubagentResult(result);

      // Check if all checkpoints passed
      const allPass = steps.every(s =>
        s.checkpoints.every(c => c.verdict === 'pass' || c.verdict === 'uncertain')
      );

      if (allPass || attempt === maxRetries) break;

      // Collect failure info for retry context
      const failures = steps.flatMap(s =>
        s.checkpoints
          .filter(c => c.verdict === 'fail')
          .map(c => `Step ${s.step} "${s.title}": ${c.text} — actual: ${JSON.stringify(c.actual)}, reasoning: ${c.reasoning}`)
      );
      lastError = failures.join('\n');
    } catch (e) {
      lastError = (e as Error).message;
      if (attempt === maxRetries) {
        steps = [{
          step: 0,
          title: 'Execution Error',
          checkpoints: [{
            text: 'Test execution completed without errors',
            verdict: 'fail' as const,
            actual: lastError,
            reasoning: `Subagent execution failed: ${lastError}`,
            confidence: 1.0,
          }],
          errors: [lastError],
          durationMs: Date.now() - startTime,
        }];
      }
    }
  }

  // Determine overall verdict
  const allCheckpoints = steps.flatMap(s => s.checkpoints);
  const hasFail = allCheckpoints.some(c => c.verdict === 'fail');
  const hasUncertain = allCheckpoints.some(c => c.verdict === 'uncertain');
  const verdict = hasFail ? 'fail' : hasUncertain ? 'uncertain' : 'pass';

  return {
    name: testCase.meta.name,
    filePath: testCase.filePath,
    meta: testCase.meta,
    steps,
    verdict,
    durationMs: Date.now() - startTime,
    retries,
  };
}

/**
 * Execute a test case via a Bun subprocess.
 * The subprocess writes and runs a TypeScript test script.
 *
 * In the full GSD integration, this is replaced by a Task() subagent call.
 * This implementation provides a standalone execution path.
 */
async function executeViaSubprocess(
  testCase: AgentTestCase,
  prompt: string,
  timeoutSec: number,
): Promise<string> {
  const scriptPath = join(AGENT_DIR, `.tmp-exec-${testCase.meta.name}.ts`);

  // Create a self-contained test script that the subagent would normally generate.
  // For standalone mode, we generate a minimal script from the test case body.
  const script = generateExecutionScript(testCase);
  writeFileSync(scriptPath, script);

  try {
    const proc = Bun.spawn(['bun', 'run', scriptPath], {
      cwd: ROOT,
      stdout: 'pipe',
      stderr: 'pipe',
      env: { ...process.env, AGENT_TEST_MODE: '1' },
    });

    const timeout = setTimeout(() => proc.kill(), timeoutSec * 1000);

    const stdout = await new Response(proc.stdout).text();
    const stderr = await new Response(proc.stderr).text();

    clearTimeout(timeout);
    const exitCode = await proc.exited;

    if (exitCode !== 0 && !stdout.includes('"steps"')) {
      throw new Error(`Script exited with code ${exitCode}: ${stderr.slice(0, 500)}`);
    }

    return stdout + stderr;
  } finally {
    // Clean up temp file
    try {
      const { unlinkSync } = await import('fs');
      unlinkSync(scriptPath);
    } catch { /* ignore */ }
  }
}

/**
 * Generate a minimal execution script from a test case.
 * This is the standalone fallback — in GSD integration, the subagent
 * writes its own script based on the full prompt.
 */
function generateExecutionScript(testCase: AgentTestCase): string {
  return `// Auto-generated Agent Test execution script
// Case: ${testCase.meta.name}
// This script is a placeholder for standalone mode.
// In GSD integration, the Claude subagent generates the actual test code.

console.log(JSON.stringify({
  steps: [{
    step: 1,
    title: "Standalone mode placeholder",
    checkpoints: [{
      text: "Agent test requires subagent execution (GSD integration)",
      verdict: "uncertain",
      actual: null,
      reasoning: "Running in standalone mode — use GSD integration for full execution",
      confidence: 0.0
    }],
    errors: [],
    durationMs: 0
  }]
}, null, 2));
`;
}

// ---------------------------------------------------------------------------
// Report generation
// ---------------------------------------------------------------------------

function generateReport(cases: CaseResult[]): AgentTestReport {
  const timestamp = new Date().toISOString();
  const summary = {
    total: cases.length,
    pass: cases.filter(c => c.verdict === 'pass').length,
    fail: cases.filter(c => c.verdict === 'fail').length,
    uncertain: cases.filter(c => c.verdict === 'uncertain').length,
  };

  const priorities: AgentTestPriority[] = ['P0', 'P1', 'P2', 'P3'];
  const byPriority = {} as AgentTestReport['byPriority'];
  for (const p of priorities) {
    const pCases = cases.filter(c => c.meta.priority === p);
    byPriority[p] = {
      total: pCases.length,
      pass: pCases.filter(c => c.verdict === 'pass').length,
      fail: pCases.filter(c => c.verdict === 'fail').length,
      uncertain: pCases.filter(c => c.verdict === 'uncertain').length,
    };
  }

  return {
    timestamp,
    cases,
    summary,
    byPriority,
    durationMs: cases.reduce((sum, c) => sum + c.durationMs, 0),
  };
}

function writeMarkdownReport(report: AgentTestReport): string {
  const ts = report.timestamp.replace(/[:.]/g, '-').slice(0, 19);
  const path = join(REPORTS_DIR, `${ts}-report.md`);

  let md = `# Agent Test Report — ${report.timestamp}\n\n`;
  md += `## Summary\n`;
  md += `- Total: ${report.summary.total} cases | ✅ ${report.summary.pass} pass | ❌ ${report.summary.fail} fail | ⚠️ ${report.summary.uncertain} uncertain\n`;

  for (const p of ['P0', 'P1', 'P2', 'P3'] as AgentTestPriority[]) {
    const s = report.byPriority[p];
    if (s.total > 0) {
      md += `- ${p}: ${s.pass}/${s.total} pass`;
      if (s.fail > 0) md += ` | ${s.fail} fail`;
      if (s.uncertain > 0) md += ` | ${s.uncertain} uncertain`;
      md += `\n`;
    }
  }

  md += `- Duration: ${(report.durationMs / 1000).toFixed(1)}s\n\n`;

  // Per-case details
  for (const c of report.cases) {
    const icon = c.verdict === 'pass' ? '✅' : c.verdict === 'fail' ? '❌' : '⚠️';
    md += `## ${icon} ${c.name} (${c.meta.priority})\n\n`;

    for (const step of c.steps) {
      const stepPass = step.checkpoints.every(cp => cp.verdict === 'pass');
      const stepIcon = stepPass ? '✅' : '❌';
      md += `### ${stepIcon} Step ${step.step}: ${step.title} (${step.durationMs}ms)\n\n`;
      md += `| Checkpoint | Verdict | Actual | Confidence |\n`;
      md += `|------------|---------|--------|------------|\n`;

      for (const cp of step.checkpoints) {
        const cpIcon = cp.verdict === 'pass' ? '✅' : cp.verdict === 'fail' ? '❌' : '⚠️';
        const actualStr = typeof cp.actual === 'string' ? cp.actual : JSON.stringify(cp.actual);
        md += `| ${cp.text} | ${cpIcon} ${cp.verdict} | ${actualStr?.slice(0, 60)} | ${cp.confidence} |\n`;
      }

      md += `\n`;
      if (step.errors.length > 0) {
        md += `**Errors:** ${step.errors.join('; ')}\n\n`;
      }
    }

    if (c.retries > 0) {
      md += `*Retries: ${c.retries}*\n\n`;
    }
    md += `---\n\n`;
  }

  // Uncertain section
  const uncertainCases = report.cases.filter(c =>
    c.steps.some(s => s.checkpoints.some(cp => cp.verdict === 'uncertain'))
  );
  if (uncertainCases.length > 0) {
    md += `## ⚠️ Uncertain Checkpoints (Needs Human Review)\n\n`;
    for (const c of uncertainCases) {
      for (const s of c.steps) {
        for (const cp of s.checkpoints.filter(cp => cp.verdict === 'uncertain')) {
          md += `### ${c.name} / Step ${s.step} / "${cp.text}"\n`;
          md += `- **Confidence**: ${cp.confidence}\n`;
          md += `- **Reasoning**: ${cp.reasoning}\n`;
          md += `- **Actual**: ${JSON.stringify(cp.actual)}\n\n`;
        }
      }
    }
  }

  mkdirSync(REPORTS_DIR, { recursive: true });
  writeFileSync(path, md);
  return path;
}

function writeJsonReport(report: AgentTestReport): string {
  const ts = report.timestamp.replace(/[:.]/g, '-').slice(0, 19);
  const path = join(REPORTS_DIR, `${ts}-report.json`);
  mkdirSync(REPORTS_DIR, { recursive: true });
  writeFileSync(path, JSON.stringify(report, null, 2));
  return path;
}

function writeUncertainReport(report: AgentTestReport): string | null {
  const uncertain = report.cases.flatMap(c =>
    c.steps.flatMap(s =>
      s.checkpoints
        .filter(cp => cp.verdict === 'uncertain')
        .map(cp => ({ case: c.name, step: s.step, stepTitle: s.title, checkpoint: cp }))
    )
  );

  if (uncertain.length === 0) return null;

  const ts = report.timestamp.replace(/[:.]/g, '-').slice(0, 19);
  const path = join(REPORTS_DIR, `${ts}-uncertain.md`);

  let md = `# Uncertain Checkpoints — ${report.timestamp}\n\n`;
  md += `${uncertain.length} checkpoint(s) need human review.\n\n`;

  for (const u of uncertain) {
    md += `## ⚠️ ${u.case} / Step ${u.step}: ${u.stepTitle}\n`;
    md += `**Checkpoint**: ${u.checkpoint.text}\n`;
    md += `**Confidence**: ${u.checkpoint.confidence}\n`;
    md += `**Reasoning**: ${u.checkpoint.reasoning}\n`;
    md += `**Actual**: \`${JSON.stringify(u.checkpoint.actual)}\`\n`;
    md += `**Suggestion**: Rewrite this checkpoint as a precise assertion.\n\n`;
  }

  mkdirSync(REPORTS_DIR, { recursive: true });
  writeFileSync(path, md);
  return path;
}

// ---------------------------------------------------------------------------
// Journal (autoresearch-style JSONL)
// ---------------------------------------------------------------------------

function appendJournal(entry: JournalConfig | JournalRun | JournalDone): void {
  appendFileSync(JOURNAL_PATH, JSON.stringify(entry) + '\n');
}

function appendWorklog(content: string): void {
  const header = existsSync(WORKLOG_PATH) ? '' : '# Agent Test Worklog\n\n';
  appendFileSync(WORKLOG_PATH, header + content + '\n\n');
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function parseCliArgs(): { command: string; opts: RunOptions } {
  const args = process.argv.slice(2);
  const command = args[0] ?? 'run';
  const opts: RunOptions = {};

  for (let i = 1; i < args.length; i++) {
    switch (args[i]) {
      case '--linked-plan':
        opts.linkedPlan = opts.linkedPlan ?? [];
        opts.linkedPlan.push(args[++i]);
        break;
      case '--priority':
        opts.priority = opts.priority ?? [];
        opts.priority.push(args[++i] as AgentTestPriority);
        break;
      case '--category':
        opts.category = opts.category ?? [];
        opts.category.push(args[++i] as AgentTestCategory);
        break;
      case '--case':
        opts.case = args[++i];
        break;
      case '--optimize':
        opts.optimize = true;
        break;
      case '--max-iterations':
        opts.maxIterations = parseInt(args[++i], 10);
        break;
      case '--plan':
        // For generate command
        (opts as any).plan = args[++i];
        break;
    }
  }

  return { command, opts };
}

async function cmdRun(opts: RunOptions): Promise<void> {
  console.log('🧪 Agent Test Runner\n');

  const cases = sortCases(discoverCases(opts));
  if (cases.length === 0) {
    console.log('No test cases found matching the given filters.');
    return;
  }

  console.log(`Found ${cases.length} case(s) to run:\n`);
  for (const c of cases) {
    console.log(`  [${c.meta.priority}] ${c.meta.name} (${c.meta.category})`);
  }
  console.log('');

  const results: CaseResult[] = [];

  for (const testCase of cases) {
    const profile = EXECUTION_PROFILES[testCase.meta.category];
    console.log(`▶ ${testCase.meta.name} [${testCase.meta.priority}/${testCase.meta.category}] (timeout: ${profile.timeoutSec}s)`);

    const result = await executeCase(testCase);
    results.push(result);

    const icon = result.verdict === 'pass' ? '✅' : result.verdict === 'fail' ? '❌' : '⚠️';
    const checkpointCount = result.steps.reduce((sum, s) => sum + s.checkpoints.length, 0);
    const passCount = result.steps.reduce((sum, s) => sum + s.checkpoints.filter(c => c.verdict === 'pass').length, 0);
    console.log(`  ${icon} ${result.verdict} — ${passCount}/${checkpointCount} checkpoints (${result.durationMs}ms, ${result.retries} retries)\n`);
  }

  // Generate reports
  const report = generateReport(results);
  const mdPath = writeMarkdownReport(report);
  const jsonPath = writeJsonReport(report);
  const uncPath = writeUncertainReport(report);

  console.log('\n📊 Report generated:');
  console.log(`  Markdown: ${relative(ROOT, mdPath)}`);
  console.log(`  JSON:     ${relative(ROOT, jsonPath)}`);
  if (uncPath) {
    console.log(`  ⚠️ Uncertain: ${relative(ROOT, uncPath)}`);
  }

  // Journal entry
  appendJournal({
    type: 'config',
    session: report.timestamp,
    goal: 'all P0 pass, zero uncertain',
    metric: 'fail_count+uncertain_count',
    direction: 'lower',
  });

  appendJournal({
    type: 'done',
    total_runs: cases.length,
    final: {
      fail: report.summary.fail,
      uncertain: report.summary.uncertain,
      pass: report.summary.pass,
    },
    duration: `${(report.durationMs / 1000).toFixed(1)}s`,
  });

  // Summary
  console.log(`\n${'═'.repeat(50)}`);
  console.log(`Total: ${report.summary.total} | ✅ ${report.summary.pass} | ❌ ${report.summary.fail} | ⚠️ ${report.summary.uncertain}`);
  for (const p of ['P0', 'P1', 'P2', 'P3'] as AgentTestPriority[]) {
    const s = report.byPriority[p];
    if (s.total > 0) console.log(`  ${p}: ${s.pass}/${s.total}`);
  }
  console.log(`${'═'.repeat(50)}\n`);

  // Exit code: P0 failures are fatal
  if (report.byPriority.P0.fail > 0) {
    console.error('❌ P0 failures detected — exiting with code 1');
    process.exit(1);
  }
}

function cmdList(opts: RunOptions): void {
  const cases = sortCases(discoverCases(opts));
  if (cases.length === 0) {
    console.log('No test cases found.');
    return;
  }

  console.log(`Agent Test Cases (${cases.length}):\n`);
  const grouped = new Map<string, AgentTestCase[]>();
  for (const c of cases) {
    const cat = c.meta.category;
    if (!grouped.has(cat)) grouped.set(cat, []);
    grouped.get(cat)!.push(c);
  }

  for (const [category, catCases] of grouped) {
    console.log(`  ${category}/`);
    for (const c of catCases) {
      const linked = c.meta['linked-plans']?.join(', ') ?? '';
      console.log(`    [${c.meta.priority}] ${c.meta.name}${linked ? ` (plans: ${linked})` : ''}`);
    }
  }
}

function cmdUncertain(): void {
  if (!existsSync(REPORTS_DIR)) {
    console.log('No reports directory found.');
    return;
  }

  const files = readdirSync(REPORTS_DIR)
    .filter(f => f.endsWith('-uncertain.md'))
    .sort()
    .reverse();

  if (files.length === 0) {
    console.log('No uncertain reports found. All clear!');
    return;
  }

  const latest = join(REPORTS_DIR, files[0]);
  console.log(readFileSync(latest, 'utf-8'));
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const { command, opts } = parseCliArgs();

  // Ensure directories exist
  mkdirSync(CASES_DIR, { recursive: true });
  mkdirSync(REPORTS_DIR, { recursive: true });

  switch (command) {
    case 'run':
      await cmdRun(opts);
      break;
    case 'list':
      cmdList(opts);
      break;
    case 'uncertain':
      cmdUncertain();
      break;
    case 'generate':
      console.log('Generate command requires GSD integration (Task subagent).');
      console.log('Use: node .claude/get-shit-done/bin/gsd-tools.cjs agent-test generate <plan-id>');
      break;
    default:
      console.log(`Unknown command: ${command}`);
      console.log('Usage: bun run tests/agent/runner.ts [run|list|generate|uncertain] [options]');
      process.exit(1);
  }
}

main().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
