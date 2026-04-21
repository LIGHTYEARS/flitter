/**
 * `threads handoff [id]` — create a handoff thread from an existing thread
 *
 * 逆向: amp-cli-reversed/chunk-005.js:4962-4981 — handoff command registration
 * 逆向: amp-cli-reversed/modules/2015_unknown_lF0.js — lF0 handler
 *   - Resolves thread ID (n$T), falls back to last-used thread
 *   - Goal from --goal flag or stdin
 *   - Calls ct.handoff() → creates child thread with condensed context
 *   - Flushes both threads to server
 *   - Opens TUI or prints new thread ID
 *
 * Flitter adaptation: Since we don't have the full LLM summarization path
 * (amp's b4R summarizer), we create a simplified handoff that:
 * 1. Extracts the last N messages from the parent as context
 * 2. Creates a new thread with a system-level goal message
 * 3. Wires the parent-child relationship
 */
import { randomUUID } from "node:crypto";
import type { ThreadWorkerService } from "@flitter/agent-core";
import type { ThreadStore } from "@flitter/data";
import type { ThreadSnapshot } from "@flitter/schemas";

// ─── Types ──────────────────────────────────────────────

export interface HandoffDeps {
  threadStore: ThreadStore;
  threadWorkerService: ThreadWorkerService;
}

export interface HandoffOptions {
  goal?: string;
  print?: boolean;
}

// ─── Helpers ────────────────────────────────────────────

/**
 * Read goal from stdin (piped, non-TTY).
 * 逆向: amp fS() — reads piped stdin for goal text
 */
async function readGoalFromStdin(): Promise<string | null> {
  if (process.stdin.isTTY || !process.stdin.readable) return null;

  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    let resolved = false;

    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        resolve(null);
      }
    }, 200);

    process.stdin.once("readable", () => {
      let chunk: Buffer | null;
      while ((chunk = process.stdin.read() as Buffer | null) !== null) {
        chunks.push(chunk);
      }
      clearTimeout(timer);
      if (!resolved) {
        resolved = true;
        const raw = Buffer.concat(chunks).toString("utf-8").trim();
        resolve(raw || null);
      }
    });

    process.stdin.once("end", () => {
      clearTimeout(timer);
      if (!resolved) {
        resolved = true;
        const raw = Buffer.concat(chunks).toString("utf-8").trim();
        resolve(raw || null);
      }
    });
  });
}

/**
 * Build a condensed context summary from parent thread messages.
 * Takes the last few messages to provide continuity in the child thread.
 *
 * 逆向: amp's b4R summarizer does a full LLM call to condense context.
 * We do a simpler extraction: take the last 10 message pairs as context.
 */
function buildContextSummary(parentThread: ThreadSnapshot, maxMessages = 20): string {
  const messages = parentThread.messages.slice(-maxMessages);
  if (messages.length === 0) return "(No prior context)";

  const lines: string[] = [];
  for (const msg of messages) {
    const role = msg.role === "user" ? "Human" : "Assistant";
    // Extract text content
    const textBlocks = (msg.content as Array<{ type: string; text?: string }>)
      .filter((b) => b.type === "text" && b.text)
      .map((b) => b.text!);
    if (textBlocks.length > 0) {
      const text = textBlocks.join("\n").slice(0, 500); // Cap per-message length
      lines.push(`[${role}]: ${text}`);
    }
  }
  return lines.join("\n\n");
}

// ─── Handler ────────────────────────────────────────────

/**
 * `flitter threads handoff [id]`
 *
 * 逆向: lF0(ctx, config, threadID, goal, openTUI, command, T)
 *   1. Resolve thread ID
 *   2. Get goal from --goal or stdin
 *   3. Create child thread with context + goal
 *   4. Wire parent-child relationship
 *   5. Print new thread ID or open TUI
 */
export async function handleThreadsHandoff(
  deps: HandoffDeps,
  threadId: string | undefined,
  options: HandoffOptions,
): Promise<void> {
  const { threadStore, threadWorkerService } = deps;

  // Step 1: Resolve parent thread ID
  let parentId = threadId;
  if (!parentId) {
    // Fall back to most recent thread
    const recent = threadStore.listRecentThreadIds(1);
    if (recent.length === 0) {
      process.stderr.write("Error: No threads available. Create a thread first.\n");
      process.exitCode = 1;
      return;
    }
    parentId = recent[0]!;
  }

  // Verify parent exists
  const parentSnapshot = threadStore.getThreadSnapshot(parentId);
  if (!parentSnapshot) {
    process.stderr.write(`Error: Thread "${parentId}" not found.\n`);
    process.exitCode = 1;
    return;
  }

  // Step 2: Get goal
  let goal = options.goal;
  if (!goal) {
    goal = (await readGoalFromStdin()) ?? undefined;
  }
  if (!goal) {
    process.stderr.write(
      "Error: A goal is required for handoff.\n" +
        "Provide via --goal <goal> or pipe through stdin:\n" +
        '  echo "Continue working on X" | flitter threads handoff [id]\n',
    );
    process.exitCode = 1;
    return;
  }

  // Step 3: Create child thread
  const childId = `T-${randomUUID().slice(0, 8)}`;
  const contextSummary = buildContextSummary(parentSnapshot);

  // Create initial snapshot for child thread
  const childSnapshot: ThreadSnapshot = {
    id: childId,
    v: 1,
    messages: [],
    title: `Handoff: ${goal.slice(0, 50)}${goal.length > 50 ? "..." : ""}`,
    env: parentSnapshot.env,
    agentMode: parentSnapshot.agentMode,
    relationships: [],
    meta: parentSnapshot.meta,
  };

  threadStore.setCachedThread(childSnapshot, { scheduleUpload: true });

  // Step 4: Seed with context + goal messages
  const seedMessages = [
    {
      role: "user" as const,
      messageId: 1,
      content: [
        {
          type: "text" as const,
          text: `# Handoff from thread ${parentId}\n\n## Context\n${contextSummary}\n\n## Goal\n${goal}`,
        },
      ],
    },
  ];

  await threadWorkerService.seedThreadMessages(childId, seedMessages as never);

  // Step 5: Wire parent-child relationship
  await threadWorkerService.applyParentRelationship(childId, parentId, "handoff");

  // Step 6: Output
  if (options.print) {
    process.stdout.write(`${childId}\n`);
  } else {
    process.stdout.write(
      [
        `Handoff thread created: ${childId}`,
        `  Parent: ${parentId}`,
        `  Goal: ${goal}`,
        "",
        `Continue with: flitter threads continue ${childId}`,
        "",
      ].join("\n"),
    );
  }
}
