/**
 * Review command handler
 *
 * Reads diff from argument or `git diff --staged`, creates a system prompt
 * for code review, runs single-turn inference, outputs result.
 *
 * 逆向: amp code_review skill (2026_tail_anonymous.js:9685-9700)
 * amp uses a `code_review` tool backed by a skill. The CLI `review` subcommand
 * provides a non-interactive shortcut that runs a single code review pass.
 *
 * @example
 * ```bash
 * flitter review                    # review staged changes
 * flitter review "$(git diff HEAD)" # review provided diff
 * ```
 */

import { execSync } from "node:child_process";
import type { ServiceContainer } from "@flitter/flitter";
import type { CliContext } from "../context";

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

  try {
    await worker.runInference();

    const snapshot = container.threadStore.getThreadSnapshot(threadId);
    const lastAssistant = snapshot?.messages
      .filter((m: { role: string }) => m.role === "assistant")
      .pop();

    if (!lastAssistant) {
      process.stderr.write("No review output generated.\n");
      process.exitCode = 1;
      return;
    }

    const text = (lastAssistant as { content: Array<Record<string, unknown>> }).content
      .filter((b: Record<string, unknown>) => b.type === "text" && typeof b.text === "string")
      .map((b: Record<string, unknown>) => b.text as string)
      .join("");

    // Format output based on --format flag
    const format = opts.format ?? "text";
    if (format === "json") {
      process.stdout.write(JSON.stringify({ review: text.trim() }) + "\n");
    } else if (format === "markdown") {
      process.stdout.write(`# Code Review\n\n${text.trim()}\n`);
    } else {
      process.stdout.write(text.trim() + "\n");
    }
  } finally {
    await container.asyncDispose();
  }
}
