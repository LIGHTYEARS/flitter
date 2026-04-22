/**
 * Cross-thread coordination tools — thread_status and send_message_to_thread
 *
 * These tools enable LLM threads to coordinate with each other:
 *   - thread_status: Check the current state of another thread
 *   - send_message_to_thread: Send a message to another running thread
 *
 * 逆向: amp-cli-reversed/modules/1246_ThreadWorkerService_QWT.js
 *   - QWT.get(T) returns the worker for a thread (or undefined)
 *   - QWT.statuses returns an Observable of thread status objects
 *   - f3T(thread, workerStatus) computes full status with interactionState + toolState
 *
 * 逆向: amp-cli-reversed/modules/1066_unknown_f3T.js
 *   function f3T(T, R) {
 *     let a = T && R?.state === "active" && R.inferenceState !== "running"
 *       ? E4R(T) : { running: 0, blocked: 0 };
 *     let e = R?.state === "active" ? R.handoff : void 0;
 *     return { ...R, interactionState: ..., toolState: a };
 *   }
 *
 * 逆向: amp-cli-reversed/modules/1067_unknown_E4R.js — counts in-progress / blocked tools
 * 逆向: amp-cli-reversed/modules/1068_unknown_IUT.js — computes interaction state
 *
 * 逆向: Mode lists:
 *   - thread_status is in SiT (deep tools) — chunk-005.js:67177
 *   - send_message_to_thread is in jiT (aggman tools) — chunk-005.js:67177
 *   - Both are in SET (master tool list) — unknown-P0.js
 *   - thread_status is hidden in TUI: _x0 = new Set(["thread_status"]) — chunk-006.js:5318
 *
 * 逆向: chunk-005.js:111947 (K7R)
 *   PmT = ["Commit and merge the changes ... updating thread_status as you go."]
 *   — thread_status is referenced in the canonical merge prompt, implying it's
 *     used by execution threads to report status during long-running operations.
 *
 * 逆向: modules/1208_unknown_V7R.js (Agg Man system prompt)
 *   - Uses ${zf} (send_message_to_thread) to continue existing work in threads
 *   - Uses workflow parameter for merge/review prompts
 *   - "After calling ${yiT} or ${zf}, respond to the user and stop. Do NOT poll."
 *
 * @module
 */

import type { ThreadSnapshot } from "@flitter/schemas";
import { createLogger } from "@flitter/util";
import type { ToolResult, ToolSpec } from "../types.js";

const log = createLogger("tool:thread-coordination");

// ─── thread_status ─────────────────────────────────────

/**
 * Callbacks for the thread_status tool.
 *
 * 逆向: amp's thread_status reads from ThreadWorkerService.statuses
 *   which maps each worker → f3T(thread, workerStatus).
 *   Flitter uses a callback to decouple from the concrete service.
 */
export interface ThreadStatusCallbacks {
  /**
   * Get the status of a thread by ID.
   *
   * Returns undefined if the thread worker is not active.
   * Returns a status object with inference state, tool counts, and message info.
   */
  getThreadStatus: (threadId: string) => ThreadStatusInfo | undefined;

  /**
   * Get the snapshot of a thread (for message count, title, etc.).
   *
   * 逆向: amp's f3T uses thread.messages for tool state counting.
   */
  getThreadSnapshot: (threadId: string) => ThreadSnapshot | undefined;

  /**
   * List all active thread IDs (for error messages / discovery).
   */
  getActiveThreadIds: () => string[];
}

/**
 * Thread status info — matches the output shape of amp's f3T().
 *
 * 逆向: modules/1066_unknown_f3T.js
 *   Returns { ...R, interactionState, toolState: { running, blocked } }
 *
 * 逆向: modules/1068_unknown_IUT.js
 *   interactionState: "user-message-initial" | "user-message-reply" |
 *     "user-tool-approval" | "tool-running" | "handoff" | false
 */
export interface ThreadStatusInfo {
  /** Thread inference state: "idle" | "running" | "cancelled" */
  inferenceState: string;

  /**
   * Tool execution state.
   * 逆向: E4R(T) — counts in-progress and blocked-on-user tools
   */
  toolState: {
    running: number;
    blocked: number;
  };

  /**
   * Interaction state — what kind of input the thread is waiting for.
   * false means not waiting for interaction.
   * 逆向: IUT(T, R, a) — derived from messages and inference state
   */
  interactionState: string | false;
}

// 逆向: thread_status description is not in the client code (defined server-side
// in amp's aggman backend). Inferred from usage context in the merge prompt
// (K7R: "updating thread_status as you go") and its inclusion in deep tools (SiT).
const THREAD_STATUS_DESCRIPTION = `Check the status of another thread.

Returns the current state of the specified thread including:
- Whether the thread is running, idle, or cancelled
- Number of tools currently running or blocked
- What kind of interaction the thread is waiting for (if any)
- Thread title and message count

Use this tool to monitor the progress of background threads, check if a handed-off task is complete, or verify thread state before sending a message.`;

/**
 * Create the thread_status tool spec.
 *
 * 逆向: thread_status is in SiT (deep tools) and SET (master list).
 *   Hidden from TUI via _x0 = new Set(["thread_status"]).
 *
 * @param callbacks - Thread status query callbacks (provided by container wiring)
 */
export function createThreadStatusTool(callbacks: ThreadStatusCallbacks): ToolSpec {
  return {
    name: "thread_status",
    description: THREAD_STATUS_DESCRIPTION,
    source: "builtin",
    isReadOnly: true,
    executionProfile: {
      resourceKeys: [],
    },
    inputSchema: {
      type: "object",
      properties: {
        thread_id: {
          type: "string",
          description: "The ID of the thread to check status for",
        },
      },
      required: ["thread_id"],
    },

    async execute(args: Record<string, unknown>): Promise<ToolResult> {
      const threadId = args.thread_id as string;

      if (!threadId || typeof threadId !== "string") {
        return {
          status: "error",
          error: "Missing required parameter: thread_id",
        };
      }

      log.debug("thread_status called", { threadId });

      // 1. Try to get active worker status
      // 逆向: amp's f3T(T, R) — combines thread snapshot + worker status
      const workerStatus = callbacks.getThreadStatus(threadId);
      const snapshot = callbacks.getThreadSnapshot(threadId);

      if (!workerStatus && !snapshot) {
        // Thread not found at all
        const activeIds = callbacks.getActiveThreadIds();
        return {
          status: "error",
          error: `Thread "${threadId}" not found. Active threads: ${activeIds.length > 0 ? activeIds.slice(0, 10).join(", ") : "none"}`,
        };
      }

      // 2. Build status response
      // 逆向: amp returns full f3T result including interactionState + toolState
      const messageCount = snapshot?.messages?.length ?? 0;
      const title = snapshot?.title ?? null;

      const statusInfo: Record<string, unknown> = {
        thread_id: threadId,
        title,
        message_count: messageCount,
      };

      if (workerStatus) {
        // Thread has an active worker
        statusInfo.state = "active";
        statusInfo.inference_state = workerStatus.inferenceState;
        statusInfo.tools_running = workerStatus.toolState.running;
        statusInfo.tools_blocked = workerStatus.toolState.blocked;
        statusInfo.interaction_state = workerStatus.interactionState;
      } else {
        // Thread exists in store but has no active worker
        statusInfo.state = "inactive";
        statusInfo.inference_state = "idle";
        statusInfo.tools_running = 0;
        statusInfo.tools_blocked = 0;
        statusInfo.interaction_state = false;
      }

      const content = JSON.stringify(statusInfo, null, 2);
      log.debug("thread_status result", { threadId, state: statusInfo.state });

      return {
        status: "done",
        content,
        data: statusInfo,
      };
    },
  };
}

// ─── send_message_to_thread ─────────────────────────────

/**
 * Callbacks for the send_message_to_thread tool.
 *
 * 逆向: amp's Agg Man uses send_message_to_thread to enqueue messages
 *   on execution threads. The tool:
 *   1. Finds the thread worker via ThreadWorkerService.get(threadId)
 *   2. Enqueues a user message via worker.handle({ type: "user:message", message: { content } })
 *   3. Supports "workflow" parameter for canonical prompts (merge_changes, code_review)
 *
 * 逆向: modules/1208_unknown_V7R.js (Agg Man prompt):
 *   - "Use ${yiT} for clean-slate execution and ${zf} to continue existing work."
 *   - workflow: "merge_changes" sends canonical merge prompt (PmT)
 *   - workflow: "code_review" sends canonical review prompt (F7R)
 */
export interface SendMessageToThreadCallbacks {
  /**
   * Send a message to the specified thread.
   *
   * @param threadId - Target thread ID
   * @param message - Message text to send
   * @param workflow - Optional workflow identifier (e.g., "merge_changes", "code_review")
   * @returns true if the message was sent, false if the thread was not found
   */
  sendMessage: (threadId: string, message: string, workflow?: string) => Promise<boolean>;

  /**
   * Check if a thread worker exists (for validation).
   */
  hasThread: (threadId: string) => boolean;
}

// 逆向: send_message_to_thread description is server-side in amp.
// Reconstructed from Agg Man prompt (V7R) and usage patterns.
const SEND_MESSAGE_DESCRIPTION = `Send a message to another running thread.

This tool sends a user message to the specified thread, which will be processed by that thread's agent. Use this to:
- Continue existing work in a thread ("fix this test", "add error handling")
- Trigger specific workflows (merge, code review) via the workflow parameter
- Ask a thread for a status update or results

The message will be enqueued on the target thread. If the thread is currently idle, it will begin processing the message. If the thread is busy, the message will be queued.

After calling this tool, respond to the user and stop. Do NOT poll or loop to check progress.`;

/**
 * Create the send_message_to_thread tool spec.
 *
 * 逆向: zf = "send_message_to_thread" (chunk-005.js:13240)
 *   Included in jiT (aggman tools).
 *
 * 逆向: modules/1208_unknown_V7R.js — Agg Man system prompt:
 *   - workflow: "merge_changes" sends PmT (canonical merge prompt)
 *   - workflow: "code_review" sends F7R (canonical review prompt)
 *
 * @param callbacks - Message sending callbacks (provided by container wiring)
 */
export function createSendMessageToThreadTool(callbacks: SendMessageToThreadCallbacks): ToolSpec {
  return {
    name: "send_message_to_thread",
    description: SEND_MESSAGE_DESCRIPTION,
    source: "builtin",
    executionProfile: {
      resourceKeys: [],
    },
    inputSchema: {
      type: "object",
      properties: {
        thread_id: {
          type: "string",
          description: "The ID of the thread to send the message to",
        },
        message: {
          type: "string",
          description:
            "The message text to send to the thread. Should be a clear instruction or question.",
        },
        workflow: {
          type: "string",
          description:
            'Optional workflow to trigger. Supported values: "merge_changes", "code_review". When set, the tool sends a canonical workflow-specific prompt instead of the message text.',
        },
      },
      required: ["thread_id", "message"],
    },

    async execute(args: Record<string, unknown>): Promise<ToolResult> {
      const threadId = args.thread_id as string;
      const message = args.message as string;
      const workflow = args.workflow as string | undefined;

      if (!threadId || typeof threadId !== "string") {
        return {
          status: "error",
          error: "Missing required parameter: thread_id",
        };
      }

      if (!message || typeof message !== "string") {
        return {
          status: "error",
          error: "Missing required parameter: message",
        };
      }

      log.debug("send_message_to_thread called", { threadId, workflow });

      // Check if thread exists before trying to send
      // 逆向: amp checks threadWorkerService.get(threadId) — returns undefined if not found
      if (!callbacks.hasThread(threadId)) {
        return {
          status: "error",
          error: `Thread "${threadId}" not found or not active. The thread must have an active worker to receive messages.`,
        };
      }

      try {
        const sent = await callbacks.sendMessage(threadId, message, workflow);

        if (!sent) {
          return {
            status: "error",
            error: `Failed to send message to thread "${threadId}". The thread may have been disposed.`,
          };
        }

        const workflowNote = workflow ? ` (workflow: ${workflow})` : "";
        return {
          status: "done",
          content: `Message sent to thread "${threadId}"${workflowNote}. The thread will process it asynchronously.`,
          data: {
            success: true,
            thread_id: threadId,
            workflow: workflow ?? null,
          },
        };
      } catch (err) {
        return {
          status: "error",
          error: `Failed to send message to thread "${threadId}": ${err instanceof Error ? err.message : String(err)}`,
        };
      }
    },
  };
}
