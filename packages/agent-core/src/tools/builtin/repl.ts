/**
 * repl — Interactive REPL subprocess tool
 *
 * Spawns a REPL subprocess (node, python, psql, etc.) and runs an autonomous
 * agent loop against it with `prompt` (send to REPL) and `stop` (terminate) tools.
 *
 * 逆向: amp-cli-reversed/chunk-005.js:117268-117337 (iqT — repl tool spec)
 *   - name: jET (= "repl")
 *   - params: binary (required), args (optional), objective (required),
 *             replDescription (required), workingDirectory (optional),
 *             initialOutputTimeoutMs (optional)
 *   - meta: { disableTimeout: !0 }, executionProfile: { resourceKeys: () => [] }
 *
 * 逆向: amp-cli-reversed/chunk-005.js:19028-19035 (constants)
 *   - DBR = 50 (max iterations), wBR = 2000 (drain timeout ms)
 *   - SmT = 100 (poll interval ms), BBR = 1500 (initial output timeout ms)
 *   - OmT = 10485760 (max buffer 10MB), dmT = 60000 (per-iteration timeout ms)
 *   - EmT = 5000 (spawn timeout ms), NBR = 0.9 (context window threshold)
 *
 * 逆向: amp-cli-reversed/chunk-002.js:23251-23312 (SBR — spawn helper)
 *   - child_process.spawn with pipe stdio, event pub/sub model
 *
 * 逆向: amp-cli-reversed/chunk-002.js:23313-23705 (OBR — main agent loop)
 *   - drain with overflow protection, text→REPL piping, stop tool handling
 *
 * 逆向: amp-cli-reversed/chunk-005.js:117248-117262 (rqT — stop tool def)
 *   - name: "stop", inputSchema: { message: string (required) }
 *
 * 逆向: amp-cli-reversed/chunk-002.js:23706-23709 (dBR — truncate helper)
 * 逆向: amp-cli-reversed/chunk-002.js:23710-23758 (EBR — system prompt builder)
 * 逆向: amp-cli-reversed/chunk-002.js:23760-23789 (CBR — env context builder)
 * 逆向: amp-cli-reversed/chunk-002.js:23791-23799 (LBR — file head reader)
 * 逆向: amp-cli-reversed/chunk-002.js:23800-23807 (MBR — code block extractor)
 *
 * @module
 */

import { type ChildProcess, spawn } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import type { ToolResult, ToolSpec } from "../types";

// ─── Constants ───────────────────────────────────────────
// 逆向: amp-cli-reversed/chunk-005.js:19028-19035

/** Maximum agent loop iterations (DBR) */
export const MAX_ITERATIONS = 50;

/** Drain timeout for normal output in ms (wBR) */
export const DRAIN_TIMEOUT_MS = 2000;

/** Poll interval in ms (SmT) */
export const POLL_INTERVAL_MS = 100;

/** Default initial output timeout in ms (BBR) */
export const INITIAL_OUTPUT_TIMEOUT_MS = 1500;

/** Max output buffer size in bytes (OmT = 10MB) */
export const MAX_BUFFER_SIZE = 10485760;

/** Per-iteration timeout in ms (dmT) */
export const ITERATION_TIMEOUT_MS = 60000;

/** Process spawn timeout in ms (EmT) */
export const SPAWN_TIMEOUT_MS = 5000;

/** Context window usage threshold (NBR) */
export const CONTEXT_WINDOW_THRESHOLD = 0.9;

// ─── REPL Process Wrapper ────────────────────────────────
// 逆向: amp-cli-reversed/chunk-002.js:23251-23312 (SBR)

export interface ReplProcess {
  write(data: string): boolean;
  kill(signal?: string): void;
  onData(cb: (data: string) => void): void;
  onExit(cb: (info: { exitCode: number | null }) => void): void;
  onError(cb: (err: Error) => void): void;
  onReady(cb: () => void): void;
}

/**
 * Spawn a REPL subprocess with pipe stdio.
 *
 * 逆向: SBR (chunk-002.js:23251-23312)
 */
export function spawnReplProcess(binary: string, args: string[], cwd: string): ReplProcess {
  const proc: ChildProcess = spawn(binary, args, {
    cwd,
    stdio: ["pipe", "pipe", "pipe"],
    env: { ...globalThis.process.env },
  });

  const dataCallbacks: ((data: string) => void)[] = [];
  const exitCallbacks: ((info: { exitCode: number | null }) => void)[] = [];
  const errorCallbacks: ((err: Error) => void)[] = [];
  const readyCallbacks: (() => void)[] = [];
  let spawned = false;

  proc.on("spawn", () => {
    spawned = true;
    for (const cb of readyCallbacks) cb();
  });

  proc.on("error", (err) => {
    for (const cb of errorCallbacks) cb(err);
  });

  proc.stdout?.on("data", (chunk) => {
    const str = chunk.toString();
    for (const cb of dataCallbacks) cb(str);
  });

  proc.stderr?.on("data", (chunk) => {
    const str = chunk.toString();
    for (const cb of dataCallbacks) cb(str);
  });

  proc.on("exit", (code) => {
    for (const cb of exitCallbacks) cb({ exitCode: code });
  });

  proc.stdin?.on("error", (err) => {
    for (const cb of errorCallbacks) cb(err);
  });

  return {
    write: (data: string): boolean => {
      if (proc.stdin?.writable) {
        try {
          return proc.stdin.write(data);
        } catch {
          return false;
        }
      }
      return false;
    },
    kill: (signal?: string) => {
      if (!proc.killed) proc.kill((signal as NodeJS.Signals) ?? "SIGTERM");
    },
    onData: (cb) => dataCallbacks.push(cb),
    onExit: (cb) => exitCallbacks.push(cb),
    onError: (cb) => {
      errorCallbacks.push(cb);
    },
    onReady: (cb) => {
      if (spawned) cb();
      else readyCallbacks.push(cb);
    },
  };
}

// ─── Helper Functions ────────────────────────────────────

/**
 * Truncate string to maxLen, appending "..." if truncated.
 *
 * 逆向: dBR (chunk-002.js:23706-23709)
 */
export function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.substring(0, maxLen - 3) + "...";
}

/**
 * Build environment context string showing working directory and files.
 *
 * 逆向: CBR (chunk-002.js:23760-23789)
 */
export function buildEnvironmentContext(cwd: string): string {
  const lines: string[] = [`Working directory: ${cwd}`, ""];

  try {
    const entries = readdirSync(cwd, { withFileTypes: true });
    if (entries.length === 0) {
      lines.push("Directory is empty.");
      return lines.join("\n");
    }

    const visible = entries
      .filter((e) => !e.name.startsWith("."))
      .sort((a, b) => {
        if (a.isDirectory() !== b.isDirectory()) return a.isDirectory() ? -1 : 1;
        return a.name.localeCompare(b.name);
      });

    lines.push("Files in working directory:");
    for (const entry of visible.slice(0, 20)) {
      if (entry.isDirectory()) {
        lines.push(`  ${entry.name}/`);
      } else {
        lines.push(`  ${entry.name}`);
        const filePath = join(cwd, entry.name);
        const head = readFileHead(filePath, 3);
        if (head) {
          lines.push("    ---");
          for (const line of head.split("\n")) {
            lines.push(`    ${line}`);
          }
          lines.push("    ---");
        }
      }
    }
    if (visible.length > 20) {
      lines.push(`  ... and ${visible.length - 20} more files`);
    }
  } catch {
    lines.push("Could not read directory contents.");
  }

  return lines.join("\n");
}

/**
 * Read first N lines of a file, or "" on error.
 *
 * 逆向: LBR (chunk-002.js:23791-23799)
 */
export function readFileHead(filePath: string, lineCount: number): string {
  try {
    return readFileSync(filePath, "utf-8").split("\n").slice(0, lineCount).join("\n");
  } catch {
    return "";
  }
}

/**
 * Build the REPL operator system prompt.
 *
 * 逆向: EBR (chunk-002.js:23710-23758)
 */
export function buildReplSystemPrompt(
  replDescription: string,
  objective: string,
  envContext: string,
): string {
  return `You are a REPL operator. Your text responses are sent DIRECTLY to a ${replDescription}.

CRITICAL RULES:
1. Your response text goes VERBATIM to the REPL - no exceptions
2. ONLY output valid REPL commands/expressions
3. NO explanations, NO commentary, NO markdown, NO prose
4. If you want to explain something, use the REPL's comment syntax
5. One command per response (unless the REPL supports multi-line input)

WRONG (do NOT do this):
\`\`\`
Let me check the date:
new Date()
\`\`\`

CORRECT (do this):
\`\`\`
new Date()
\`\`\`

WRONG:
\`\`\`
I'll define a function to help:
function add(a, b) { return a + b; }
\`\`\`

CORRECT:
\`\`\`
// Define helper function
function add(a, b) { return a + b; }
\`\`\`

**Your Objective:** ${objective}

**Environment:**
${envContext}

**Important:** The REPL runs as a subprocess without a TTY. Some programs require flags to enable interactive mode:
- bash: use \`bash -i\` for interactive mode
- python: use \`python -i\` or \`python -u\` for unbuffered output
- node: works interactively by default

**Protocol:**
- User messages prefixed with [REPL output:] contain REPL output
- Your entire text response is piped to the REPL stdin
- Call the \`stop\` tool when done (with a summary message)

Remember: You are typing INTO the REPL. Act like it.`;
}

/**
 * Extract REPL commands from model text response.
 * If the text contains code blocks, extract their contents.
 * Otherwise, treat the entire text as a command.
 *
 * 逆向: MBR (chunk-002.js:23800-23807)
 */
export function extractCommands(text: string): string[] {
  const codeBlockRegex = /```(?:\w+)?\n([\s\S]*?)```/g;
  const blocks: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = codeBlockRegex.exec(text)) !== null) {
    if (match[1]) blocks.push(match[1].trim());
  }
  if (blocks.length === 0) return [text.trim()];
  return blocks;
}

/**
 * Drain output from the REPL buffer with timeout and overflow protection.
 *
 * 逆向: OBR drain logic (chunk-002.js:23432-23450)
 *   - Wait initial delay, then poll until buffer stops growing
 *   - 5000ms hard cap beyond the initial wait
 *   - Reset totalSize after drain
 */
export async function drainOutput(
  buffer: string[],
  totalSize: { value: number },
  waitMs: number,
  signal?: AbortSignal,
): Promise<string> {
  const start = Date.now();
  await new Promise((resolve) => setTimeout(resolve, Math.min(waitMs, POLL_INTERVAL_MS)));

  let result = "";
  let prevLen = -1;
  const hardCap = waitMs + 5000;

  while (buffer.length > 0 || result.length !== prevLen) {
    if (signal?.aborted) break;
    if (Date.now() - start > hardCap) break;

    prevLen = result.length;
    while (buffer.length > 0) result += buffer.shift();
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }

  totalSize.value = 0;
  return result;
}

// ─── Stop Tool Definition ────────────────────────────────
// 逆向: rqT (chunk-005.js:117248-117262)

export const STOP_TOOL = {
  name: "stop",
  description:
    "Stop the REPL session and end the conversation. Use this when you have completed your objective or cannot proceed further.",
  inputSchema: {
    type: "object" as const,
    properties: {
      message: {
        type: "string",
        description: "A summary of what was accomplished or why you are stopping",
      },
    },
    required: ["message"],
  },
  source: "builtin" as const,
};

// ─── Agent Loop ──────────────────────────────────────────

/**
 * Message in the agent conversation.
 * Simplified representation for the REPL agent loop.
 */
export interface ReplMessage {
  role: "user" | "assistant";
  content: string | ReplContentBlock[];
}

export interface ReplContentBlock {
  type: "text" | "tool_use" | "tool_result";
  text?: string;
  id?: string;
  name?: string;
  input?: Record<string, unknown>;
  tool_use_id?: string;
  content?: string;
}

/** Transcript entry for tracking conversation */
export interface TranscriptEntry {
  type: "input" | "output";
  content: string;
}

/**
 * Inference function type — abstraction over the actual LLM call.
 * Matches the signature needed by the REPL agent loop.
 *
 * 逆向: SwT call in OBR (chunk-002.js:23522-23530)
 */
export type ReplInferenceFn = (
  messages: ReplMessage[],
  tools: Array<{ name: string; description: string; inputSchema: Record<string, unknown> }>,
  systemPrompt: string,
  signal: AbortSignal,
) => Promise<{
  message?: {
    content: ReplContentBlock[];
  };
}>;

/**
 * Run the REPL agent loop.
 *
 * 逆向: OBR (chunk-002.js:23313-23705)
 *
 * This is the core loop that:
 * 1. Waits for initial REPL output
 * 2. Sends output to the LLM
 * 3. Pipes LLM text responses to the REPL stdin
 * 4. Drains REPL output
 * 5. Repeats until stop or error
 */
export async function runReplAgentLoop(opts: {
  repl: ReplProcess;
  inferenceFn: ReplInferenceFn;
  systemPrompt: string;
  binary: string;
  initialOutputTimeoutMs?: number;
  signal: AbortSignal;
}): Promise<{
  result: string;
  transcript: TranscriptEntry[];
}> {
  const { repl, inferenceFn, systemPrompt, binary, signal } = opts;
  const initialTimeout = opts.initialOutputTimeoutMs ?? INITIAL_OUTPUT_TIMEOUT_MS;

  // Output buffer with overflow protection
  // 逆向: OBR lines 23405-23417
  const outputBuffer: string[] = [];
  const totalSize = { value: 0 };
  let overflow = false;

  repl.onData((data) => {
    if (overflow) return;
    totalSize.value += data.length;
    if (totalSize.value > MAX_BUFFER_SIZE) {
      overflow = true;
      return;
    }
    outputBuffer.push(data);
  });

  // Track process state
  // 逆向: OBR lines 23418-23430
  let exited = false;
  let exitCode: number | null = null;
  const processError: { error: Error | null } = { error: null };

  repl.onExit(({ exitCode: code }) => {
    exited = true;
    exitCode = code;
  });
  repl.onError((err) => {
    processError.error = err;
  });

  // Conversation state
  // 逆向: OBR lines 23451-23460
  const messages: ReplMessage[] = [];
  const transcript: TranscriptEntry[] = [];
  let lastOutput = "";
  let reason = "";
  let stopped = false;
  let firstInputSent = false;

  // 1. Wait for initial output
  // 逆向: OBR lines 23461-23479
  const initialOutput = await drainOutput(outputBuffer, totalSize, initialTimeout, signal);

  if (exited && !initialOutput) {
    return {
      result: `The REPL process "${binary}" exited immediately with code ${exitCode} without producing any output. Check that the binary exists and the arguments are correct.`,
      transcript,
    };
  }

  if (initialOutput) {
    messages.push({
      role: "user",
      content: `[REPL started. Initial output:]\n${initialOutput}`,
    });
  } else {
    messages.push({
      role: "user",
      content: "[REPL started. Awaiting your input.]",
    });
  }

  // 2. Agent loop
  // 逆向: OBR lines 23490-23660
  for (let iteration = 0; iteration < MAX_ITERATIONS && !stopped && !signal.aborted; iteration++) {
    // Check termination conditions
    if (exited) {
      reason = `REPL process exited with code ${exitCode}`;
      break;
    }
    if (processError.error) {
      reason = `REPL process error: ${processError.error.message}`;
      break;
    }
    if (overflow) {
      reason = `REPL output exceeded ${MAX_BUFFER_SIZE} bytes limit`;
      break;
    }

    // Per-iteration timeout
    // 逆向: OBR lines 23514-23519
    const iterationController = new AbortController();
    const iterationTimer = setTimeout(() => {
      iterationController.abort();
    }, ITERATION_TIMEOUT_MS);

    const combinedSignal = signal.aborted
      ? signal
      : AbortSignal.any([signal, iterationController.signal]);

    let response: { message?: { content: ReplContentBlock[] } } | undefined;
    try {
      response = await inferenceFn(messages, [STOP_TOOL], systemPrompt, combinedSignal);
    } catch (err) {
      clearTimeout(iterationTimer);
      if (iterationController.signal.aborted && !signal.aborted) {
        reason = `Iteration ${iteration + 1} timed out after ${ITERATION_TIMEOUT_MS}ms`;
        break;
      }
      throw err;
    } finally {
      clearTimeout(iterationTimer);
    }

    if (!response.message) {
      reason = "No response from model";
      break;
    }

    // Check for tool_use (stop tool)
    // 逆向: OBR lines 23557-23586
    const toolUses = response.message.content.filter(
      (b: ReplContentBlock) => b.type === "tool_use",
    );

    if (toolUses.length > 0) {
      const stopCall = toolUses.find((t: ReplContentBlock) => t.name === "stop");
      if (stopCall) {
        reason = (stopCall.input?.message as string) ?? "Session ended";
        stopped = true;
        messages.push({ role: "assistant", content: response.message.content });
        messages.push({
          role: "user",
          content: [
            {
              type: "tool_result",
              tool_use_id: stopCall.id!,
              content: `Session terminated: ${reason}`,
            },
          ],
        });
        break;
      }

      // Unknown tool calls — return error results
      const toolResults = toolUses.map((t: ReplContentBlock) => ({
        type: "tool_result" as const,
        tool_use_id: t.id!,
        content: `Unknown tool: ${t.name}`,
      }));
      messages.push({ role: "assistant", content: response.message.content });
      messages.push({ role: "user", content: toolResults });
      continue;
    }

    // Extract text and pipe to REPL
    // 逆向: OBR lines 23587-23601
    const textParts = response.message.content
      .filter((b: ReplContentBlock) => b.type === "text")
      .map((b: ReplContentBlock) => b.text ?? "")
      .join("");

    let commandText: string | undefined;
    let writeFailed = false;

    if (textParts) {
      const commands = extractCommands(textParts);
      commandText = commands.join("\n");
      for (const cmd of commands) {
        if (!repl.write(cmd + "\n")) {
          writeFailed = true;
          break;
        }
      }
    }

    if (writeFailed) {
      reason = exited
        ? `REPL process exited with code ${exitCode} (write failed)`
        : "Failed to write to REPL stdin";
      break;
    }

    // Track first input
    // 逆向: OBR lines 23603-23618
    const isFirstInput = commandText && !firstInputSent;
    if (commandText) {
      firstInputSent = true;
      transcript.push({ type: "input", content: commandText });
    }

    messages.push({ role: "assistant", content: response.message.content });

    // Drain output
    // 逆向: OBR lines 23621-23659
    const output = await drainOutput(outputBuffer, totalSize, DRAIN_TIMEOUT_MS, signal);

    if (output) {
      lastOutput = output;
      transcript.push({ type: "output", content: output });
      messages.push({
        role: "user",
        content: `[REPL output:]\n${output}`,
      });
    } else if (isFirstInput && !exited) {
      // First input produced no output — likely not interactive mode
      // 逆向: OBR lines 23638-23653
      repl.kill();
      return {
        result: `The REPL process "${binary}" did not produce any output after receiving input. This typically means the program is waiting for input but is not running in interactive mode.

To fix this, try invoking the REPL with flags that enable interactive mode:
- python: use \`python3 -i\` for interactive mode
- bash, zsh: use \`bash -i\` for interactive mode
- irb: use --noautocomplete

If the program requires a TTY, it may not be compatible with this tool.`,
        transcript,
      };
    } else {
      messages.push({
        role: "user",
        content: "[No output received. The REPL may be waiting for more input or processing.]",
      });
    }
  }

  // Build result
  // 逆向: OBR lines 23678-23704
  const parts: string[] = [];
  if (reason) parts.push(reason);
  else parts.push("Session ended");
  if (exited) parts.push(`\nProcess exit code: ${exitCode}`);
  if (lastOutput) parts.push(`\nLast output:\n${lastOutput}`);
  if (overflow) parts.push("\n[Warning: Output was truncated due to buffer overflow]");

  return {
    result: parts.join(""),
    transcript,
  };
}

// ─── Tool Factory ────────────────────────────────────────

/**
 * Create the REPL ToolSpec.
 *
 * Unlike oracle/librarian which use SubAgentManager, the REPL tool manages
 * its own subprocess and agent loop directly (matching amp's OBR pattern).
 *
 * The inferenceFn parameter allows injection of the LLM call for testability.
 *
 * 逆向: iqT (chunk-005.js:117268-117337)
 */
export function createReplTool(inferenceFn: ReplInferenceFn): ToolSpec {
  return {
    name: "repl",
    source: "builtin",
    isReadOnly: false,

    // 逆向: chunk-005.js:117271-117294
    description: `Start a REPL (Read-Eval-Print Loop) subprocess and use an agent to interact with it to accomplish an objective.

This tool spawns a REPL process (like node, python, psql, mysql, redis-cli, etc.) and runs an autonomous agent loop that:
1. Sends commands to the REPL's stdin
2. Reads output from the REPL's stdout
3. Uses an LLM to decide what commands to send next based on the objective

WHEN TO USE THIS TOOL:
- When you need to interactively explore a database (psql, mysql, sqlite3, redis-cli)
- When you need to test code snippets in a REPL (node, python3, irb, ghci)
- When you need to interact with any command-line tool that has a REPL interface
- When the task requires multiple back-and-forth interactions with a subprocess

WHEN NOT TO USE THIS TOOL:
- For simple one-off commands (use Bash instead)
- When you don't need interactive exploration
- When the command exits immediately after output

IMPORTANT NOTES:
- The agent's text responses are sent DIRECTLY to the REPL's stdin
- The agent should only output valid REPL commands, no explanations
- The agent has a "stop" tool it can call when the objective is complete
- The subprocess HAS NO PTY - some programs like python3 or bash need an extra flag in that case, often -i.
- The REPL process is terminated when the agent stops or encounters an error`,

    inputSchema: {
      type: "object",
      properties: {
        binary: {
          type: "string",
          description: 'The REPL binary to run (e.g., "node", "python", "psql", "redis-cli")',
        },
        args: {
          type: "array",
          items: { type: "string" },
          description: "Arguments to pass to the REPL binary",
        },
        objective: {
          type: "string",
          description: "What you want to accomplish in the REPL session",
        },
        replDescription: {
          type: "string",
          description:
            'A description of the REPL being used (e.g., "Node.js JavaScript REPL", "PostgreSQL database shell")',
        },
        workingDirectory: {
          type: "string",
          description: "The working directory to run the REPL in (absolute path)",
        },
        initialOutputTimeoutMs: {
          type: "number",
          description:
            "Timeout in milliseconds to wait for initial REPL output. Do not use this parameter on the first attempt. Only set this if the REPL fails to start due to a timeout, and you need to increase the wait time for slow-starting REPLs.",
        },
      },
      required: ["binary", "objective", "replDescription"],
    },

    executionProfile: {
      resourceKeys: [],
      // 逆向: meta: { disableTimeout: !0 }
      disableTimeout: true,
    },

    async execute(args: Record<string, unknown>, context): Promise<ToolResult> {
      const binary = args.binary as string;
      const binaryArgs = (args.args as string[]) ?? [];
      const objective = args.objective as string;
      const replDescription = args.replDescription as string;
      const workingDirectory = args.workingDirectory as string | undefined;
      const initialOutputTimeoutMs = args.initialOutputTimeoutMs as number | undefined;

      if (!binary) {
        return { status: "error", error: 'Missing required parameter "binary"' };
      }
      if (!objective) {
        return { status: "error", error: 'Missing required parameter "objective"' };
      }
      if (!replDescription) {
        return { status: "error", error: 'Missing required parameter "replDescription"' };
      }

      const cwd = workingDirectory ?? context.workingDirectory ?? globalThis.process.cwd();

      // 逆向: OBR cwd validation (chunk-002.js:23323-23331)
      if (!existsSync(cwd)) {
        return {
          status: "error",
          error: `Working directory does not exist: ${cwd}`,
        };
      }

      // Build system prompt
      // 逆向: OBR lines 23357-23358
      const envContext = buildEnvironmentContext(cwd);
      const systemPrompt = buildReplSystemPrompt(replDescription, objective, envContext);

      // Spawn REPL process
      // 逆向: OBR lines 23360-23373
      let repl: ReplProcess;
      try {
        repl = spawnReplProcess(binary, binaryArgs, cwd);
      } catch (err) {
        return {
          status: "error",
          error: `Failed to start REPL process: ${err}`,
        };
      }

      // Wait for spawn
      // 逆向: OBR lines 23374-23404
      const spawnError: { error: Error | null } = { error: null };
      repl.onError((err) => {
        spawnError.error = err;
      });

      const spawnResult = await Promise.race([
        new Promise<"ready">((resolve) => repl.onReady(() => resolve("ready"))),
        new Promise<"error">((resolve) => repl.onError(() => resolve("error"))),
        new Promise<"timeout">((resolve) => setTimeout(() => resolve("timeout"), SPAWN_TIMEOUT_MS)),
      ]);

      if (spawnResult === "error" || spawnError.error) {
        return {
          status: "error",
          error: `Failed to spawn REPL process "${binary}": ${spawnError.error?.message ?? "Unknown error"}. Check that the binary exists and is executable.`,
        };
      }

      if (spawnResult === "timeout") {
        repl.kill();
        return {
          status: "error",
          error: `REPL process "${binary}" failed to start within ${SPAWN_TIMEOUT_MS}ms.`,
        };
      }

      // Run agent loop
      try {
        const loopResult = await runReplAgentLoop({
          repl,
          inferenceFn,
          systemPrompt,
          binary,
          initialOutputTimeoutMs,
          signal: context.signal,
        });

        return {
          status: "done",
          content: loopResult.result,
          data: { transcript: loopResult.transcript },
        };
      } catch (err) {
        repl.kill();
        return {
          status: "error",
          error: `Agent loop error: ${err instanceof Error ? err.message : String(err)}`,
        };
      } finally {
        repl.kill();
      }
    },
  };
}
