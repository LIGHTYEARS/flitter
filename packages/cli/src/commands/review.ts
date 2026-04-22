/**
 * Review command handler
 *
 * Reads diff from argument or `git diff --staged`, creates a system prompt
 * for code review, runs single-turn inference, outputs result.
 * Optionally discovers and runs check definitions from .flitter/checks/ and
 * .agents/checks/ directories.
 *
 * 逆向: amp code_review skill (2026_tail_anonymous.js:9685-9700)
 * amp uses a `code_review` tool backed by a skill. The CLI `review` subcommand
 * provides a non-interactive shortcut that runs a single code review pass.
 *
 * 逆向: amp review command (2535_unknown_p40.js) — CLI flags:
 *   --check-scope, --check-filter, --checks-only, --summary-only
 *
 * 逆向: amp orchestrator dFR (1440_unknown_dFR.js) — merges main review + checks
 *
 * @example
 * ```bash
 * flitter review                         # review staged changes
 * flitter review "$(git diff HEAD)"      # review provided diff
 * flitter review --checks-only           # only run checks
 * flitter review --check-filter my-check # run specific check
 * flitter review --summary-only          # only show diff summary
 * ```
 */

import { execSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import type { ServiceContainer } from "@flitter/flitter";
import type { CliContext } from "../context";
import {
  buildCheckSystemPrompt,
  buildInitialCheckRunMap,
  type CheckRunEntry,
  discoverAndFilterChecks,
  formatCheckSummary,
  formatReviewComments,
  mergeReviewResults,
  parseCheckResult,
} from "./check-runner";

export interface ReviewOptions {
  /** Diff text to review. If omitted, reads `git diff --staged`. */
  diff?: string;
  /** Output format: text, json, markdown */
  format?: string;
  /**
   * Specific files to scope the review to.
   * 逆向: amp code_review tool `files` parameter (2026_tail_anonymous.js:140331)
   */
  files?: string[];
  /**
   * Additional instructions to guide the review focus.
   * 逆向: amp code_review tool `instructions` parameter
   */
  instructions?: string;
  /**
   * Review depth: "methodical" (thorough, default) or "quick" (fast scan).
   * 逆向: amp code_review tool `thoroughness` parameter
   */
  thoroughness?: "methodical" | "quick";
  /**
   * Directory to scope check discovery to.
   * 逆向: amp review command --check-scope (2535_unknown_p40.js)
   */
  checkScope?: string;
  /**
   * Filter which checks to run by name.
   * 逆向: amp review command --check-filter (2535_unknown_p40.js)
   */
  checkFilter?: string[];
  /**
   * Only run checks, skip the main review agent.
   * 逆向: amp review command --checks-only (2535_unknown_p40.js)
   */
  checksOnly?: boolean;
  /**
   * Only output the diff summary, skip full review.
   * 逆向: amp review command --summary-only (2535_unknown_p40.js)
   */
  summaryOnly?: boolean;
}

/**
 * 逆向: 2026_tail_anonymous.js:9685-9700 (OkR code_review skill prompt)
 * amp's code review prompt instructs the model to review code changes and output
 * structured comments with filename, line numbers, severity, and fixes.
 *
 * When --thoroughness=quick, the model does a fast scan;
 * when --thoroughness=methodical (default), it goes file-by-file with higher reasoning.
 */
function buildReviewSystemPrompt(opts: ReviewOptions): string {
  const depth =
    opts.thoroughness === "quick"
      ? "Do a quick scan — focus only on critical issues and obvious bugs."
      : "Do a thorough, methodical review — go file-by-file through each changed hunk.";

  let instructions = `You are a senior software engineer performing a code review. Analyze the provided diff and give a concise, actionable review.

## Review Depth
${depth}

## Instructions
- Focus on bugs, security issues, performance problems, and code quality
- For each issue, include:
  - **File** and **line range** (e.g., \`src/foo.ts:42-45\`)
  - **Severity**: critical, high, medium, or low
  - **Type**: bug, security, performance, style, or suggestion
  - **Description**: what's wrong and why
  - **Fix**: how to fix it (code snippet if helpful)
- If no issues are found, state that the code looks good
- Be concise and specific — avoid generic advice`;

  if (opts.files && opts.files.length > 0) {
    instructions += `\n\n## File Scope\nFocus your review ONLY on these files: ${opts.files.join(", ")}`;
  }

  if (opts.instructions) {
    instructions += `\n\n## Additional Focus\n${opts.instructions}`;
  }

  return instructions;
}

/**
 * Handle the `flitter review` command
 *
 * 逆向: amp's m40 (2539_unknown_m40.js) — full review command flow:
 *   1. Resolve git root
 *   2. Get diff text
 *   3. Generate summary
 *   4. If summaryOnly, stop
 *   5. Run main review + checks in parallel via dFR orchestrator
 *   6. Format and output results
 *
 * 逆向: amp's code_review tool (2026_tail_anonymous.js:_L = "code_review")
 * runs a review via the tool system. Flitter's CLI shortcut runs it as a
 * single-turn execute-mode inference with a review system prompt.
 */
export async function handleReview(
  container: ServiceContainer,
  context: CliContext,
  opts: ReviewOptions,
): Promise<void> {
  void context;

  // Get diff text
  let diffText = opts.diff;
  if (!diffText) {
    // Build git diff command — scope to specific files if --files provided
    // 逆向: amp's code_review tool passes files as path filters to git diff
    const fileArgs =
      opts.files && opts.files.length > 0 ? ` -- ${opts.files.map((f) => `"${f}"`).join(" ")}` : "";

    try {
      diffText = execSync(`git diff --staged${fileArgs}`, {
        encoding: "utf-8",
        maxBuffer: 10 * 1024 * 1024,
      }).trim();
    } catch {
      // Fall back to unstaged diff
      try {
        diffText = execSync(`git diff${fileArgs}`, {
          encoding: "utf-8",
          maxBuffer: 10 * 1024 * 1024,
        }).trim();
      } catch {
        process.stderr.write("Error: Could not read git diff. Are you in a git repository?\n");
        process.exitCode = 1;
        return;
      }
    }
  }

  if (!diffText) {
    process.stderr.write("No changes to review. Stage some changes or provide a diff.\n");
    process.exitCode = 1;
    return;
  }

  // ── Summary-only mode ──────────────────────────────────────
  // 逆向: m40 (2539_unknown_m40.js:70) — if summaryOnly, output summary and return
  if (opts.summaryOnly) {
    process.stdout.write(`Summary of changes:\n\n${diffText.slice(0, 2000)}\n`);
    return;
  }

  // ── Check discovery ────────────────────────────────────────
  // 逆向: fFR (1436_unknown_fFR.js) — discover and filter checks
  const workingDir = process.cwd();
  const userConfigDir = path.join(os.homedir(), ".config");

  const checks = discoverAndFilterChecks({
    diffDescription: opts.diff ?? "git diff HEAD and newly added untracked files",
    targetFiles: opts.files,
    checkScope: opts.checkScope,
    workingDir,
    userConfigDir,
    checkFilter: opts.checkFilter,
    checksOnly: opts.checksOnly,
    summaryOnly: opts.summaryOnly,
  });

  // ── Checks-only mode ──────────────────────────────────────
  // 逆向: dFR (1440_unknown_dFR.js:23-29) — checksOnly skips main review agent
  if (opts.checksOnly) {
    if (checks.length === 0) {
      process.stdout.write("No checks found.\n");
      return;
    }

    // Run checks (currently synchronous simulation — real subagent execution
    // requires LLM integration which is outside this subsystem's scope)
    const checkRuns = buildInitialCheckRunMap(checks);

    // Run each check as a subagent
    // 逆向: IFR (1437_unknown_IFR.js) — each check runs with Haiku model
    for (const check of checks) {
      try {
        const result = await runSingleCheck(container, check, opts, workingDir);
        checkRuns[check.uri] = {
          check,
          status: { status: "done", result },
        };
      } catch (err) {
        checkRuns[check.uri] = {
          check,
          status: {
            status: "error",
            error: err instanceof Error ? err.message : String(err),
          },
        };
      }
    }

    // Output check results
    const merged = mergeReviewResults(null, checkRuns, workingDir, true);
    const comments = merged.comments.filter((c) => c.severity !== "low");

    process.stdout.write("Review\n");
    process.stdout.write(`${formatReviewComments(comments, workingDir)}\n`);

    process.stdout.write(`\n${formatCheckSummary(checkRuns)}\n`);
    return;
  }

  // ── Full review: main agent + checks in parallel ──────────
  // 逆向: dFR (1440_unknown_dFR.js) — runs main review and checks, merges results

  // Run main review
  const threadId = crypto.randomUUID();
  const userMessage = `Please review the following code changes:\n\n\`\`\`diff\n${diffText}\n\`\`\``;

  const worker = container.createThreadWorker(threadId, {
    getMessages: () => [
      {
        role: "user" as const,
        messageId: Date.now(),
        content: [{ type: "text" as const, text: userMessage }],
      },
    ],
    buildSystemPrompt: async () => [{ type: "text" as const, text: buildReviewSystemPrompt(opts) }],
  });

  // Run checks in parallel with main review
  // 逆向: dFR uses v3 (combineLatest) to run main + checks simultaneously
  const checkRunsPromise =
    checks.length > 0 ? runAllChecks(container, checks, opts, workingDir) : Promise.resolve({});

  try {
    // Run main review and checks in parallel
    const [, checkRuns] = await Promise.all([worker.runInference(), checkRunsPromise]);

    // Get main review output
    const snapshot = container.threadStore.getThreadSnapshot(threadId);
    const lastAssistant = snapshot?.messages
      .filter((m: { role: string }) => m.role === "assistant")
      .pop();

    let mainReviewText: string | null = null;
    if (lastAssistant) {
      mainReviewText = (lastAssistant as { content: Array<Record<string, unknown>> }).content
        .filter((b: Record<string, unknown>) => b.type === "text" && typeof b.text === "string")
        .map((b: Record<string, unknown>) => b.text as string)
        .join("");
    }

    // Merge results
    // 逆向: dFR → v3 pipe → merge main + checks
    const merged = mergeReviewResults(mainReviewText, checkRuns, workingDir, false);

    // Output main review
    if (merged.mainReviewText) {
      const format = opts.format ?? "text";
      if (format === "json") {
        process.stdout.write(
          JSON.stringify({
            review: merged.mainReviewText.trim(),
            checks: Object.fromEntries(
              Object.entries(merged.checks).map(([uri, entry]) => [
                uri,
                {
                  name: entry.check.name,
                  status: entry.status.status,
                },
              ]),
            ),
          }) + "\n",
        );
      } else if (format === "markdown") {
        process.stdout.write(`# Code Review\n\n${merged.mainReviewText.trim()}\n`);
      } else {
        process.stdout.write(merged.mainReviewText.trim() + "\n");
      }
    } else if (!opts.checksOnly) {
      process.stderr.write("No review output generated.\n");
      process.exitCode = 1;
    }

    // Output check results if any checks were run
    // 逆向: m40 (2539_unknown_m40.js:139-144) — output check summary
    // Skip extra text output for JSON format (check info is embedded in JSON above)
    const format = opts.format ?? "text";
    if (format !== "json") {
      if (Object.keys(merged.checks).length > 0) {
        const checkComments = merged.comments.filter((c) => c.severity !== "low");
        if (checkComments.length > 0) {
          process.stdout.write(`\nCheck Issues\n`);
          process.stdout.write(`${formatReviewComments(checkComments, workingDir)}\n`);
        }
        process.stdout.write(`\nThe following checks were run:\n`);
        process.stdout.write(`${formatCheckSummary(merged.checks)}\n`);
      } else {
        process.stdout.write(`\nNo checks were run.\n`);
      }
    }
  } finally {
    await container.asyncDispose();
  }
}

/**
 * Run a single check against the diff using the container's thread worker.
 * 逆向: IFR (1437_unknown_IFR.js) — runs a check as a subagent with Haiku model
 *
 * @param container - Service container
 * @param check - Check definition to run
 * @param opts - Review options
 * @param workingDir - Working directory
 * @returns Parsed check run output
 */
async function runSingleCheck(
  container: ServiceContainer,
  check: import("./check-runner").CheckDefinition,
  opts: ReviewOptions,
  workingDir: string,
): Promise<import("./check-runner").CheckRunOutput> {
  const targetFiles = opts.files ?? [];
  const diffDescription = opts.diff ?? "git diff HEAD and newly added untracked files";

  const systemPrompt = buildCheckSystemPrompt(check, targetFiles, diffDescription, workingDir);

  // 逆向: IFR uses n8.CLAUDE_HAIKU_4_5.name as the model
  const threadId = `check-${check.name}-${crypto.randomUUID()}`;
  const userMsg = `Run the "${check.name}" code review check.`;

  const worker = container.createThreadWorker(threadId, {
    getMessages: () => [
      {
        role: "user" as const,
        messageId: Date.now(),
        content: [{ type: "text" as const, text: userMsg }],
      },
    ],
    buildSystemPrompt: async () => [{ type: "text" as const, text: systemPrompt }],
  });

  await worker.runInference();

  const snapshot = container.threadStore.getThreadSnapshot(threadId);
  const lastAssistant = snapshot?.messages
    .filter((m: { role: string }) => m.role === "assistant")
    .pop();

  if (!lastAssistant) {
    return {
      check,
      result: {
        name: check.name,
        status: "error",
        issuesFound: 0,
        errorMessage: "No output from check agent",
      },
      issues: [],
    };
  }

  const agentOutput = (lastAssistant as { content: Array<Record<string, unknown>> }).content
    .filter((b: Record<string, unknown>) => b.type === "text" && typeof b.text === "string")
    .map((b: Record<string, unknown>) => b.text as string)
    .join("");

  return parseCheckResult(check, agentOutput, workingDir);
}

/**
 * Run all checks in parallel.
 * 逆向: fFR (1436_unknown_fFR.js:22-47) — maps checks to parallel IFR calls
 *
 * @param container - Service container
 * @param checks - Checks to run
 * @param opts - Review options
 * @param workingDir - Working directory
 * @returns Map of check URI to CheckRunEntry
 */
async function runAllChecks(
  container: ServiceContainer,
  checks: import("./check-runner").CheckDefinition[],
  opts: ReviewOptions,
  workingDir: string,
): Promise<Record<string, CheckRunEntry>> {
  const checkRuns = buildInitialCheckRunMap(checks);

  // Run all checks in parallel
  // 逆向: fFR uses xj (merge observable) for parallel execution
  const results = await Promise.allSettled(
    checks.map(async (check) => {
      try {
        const result = await runSingleCheck(container, check, opts, workingDir);
        return { check, result, error: undefined as string | undefined };
      } catch (err) {
        return {
          check,
          result: undefined as import("./check-runner").CheckRunOutput | undefined,
          error: err instanceof Error ? err.message : String(err),
        };
      }
    }),
  );

  for (const settled of results) {
    if (settled.status === "fulfilled") {
      const { check, result, error } = settled.value;
      if (result) {
        checkRuns[check.uri] = {
          check,
          status: { status: "done", result },
        };
      } else {
        checkRuns[check.uri] = {
          check,
          status: { status: "error", error: error ?? "Unknown error" },
        };
      }
    }
  }

  return checkRuns;
}
