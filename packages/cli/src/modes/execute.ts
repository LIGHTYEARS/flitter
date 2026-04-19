/**
 * 非交互式执行模式
 *
 * 单次执行: 发送 userMessage → 等待完成 → 输出结果
 * 支持 stdin pipe 模式 (无命令行参数时从 stdin 读取全部内容)
 * 支持 --stream-json 模式 (JSON Lines 输出而非纯文本)
 * 支持 --stream-json-thinking (include thinking in JSON stream)
 * 支持 --stream-json-input (multi-turn JSON Lines from stdin)
 * 支持 --stats (JSON result + usage output)
 * 支持 --archive (archive thread after execute)
 * 支持 --label (add labels to thread)
 *
 * 逆向: SB() execute 分支 in cli-entrypoint.js:546-700
 *        Yl0() in 0300_unknown_Yl0.js (stats, labels, archive)
 *        Kl0() in 0297_unknown_Kl0.js (stream-json-thinking, stream-json-input)
 *
 * @example
 * ```bash
 * # 命令行参数模式
 * flitter --execute "explain this code"
 *
 * # stdin pipe 模式
 * echo "explain this code" | flitter
 *
 * # stream-json 模式
 * flitter --execute --stream-json "explain this code"
 *
 * # stats 模式
 * flitter --execute --stats "explain this code"
 *
 * # multi-turn stream-json-input
 * flitter --execute --stream-json --stream-json-input
 * ```
 */

import { createInterface } from "node:readline";
import type { AgentEvent } from "@flitter/agent-core";
import type { ServiceContainer } from "@flitter/flitter";
import type { Message, ThreadMessage, ThreadSnapshot } from "@flitter/schemas";
import type { Subscription } from "@flitter/util";
import type { CliContext } from "../context";
import { resolveSystemPromptText } from "../util/system-prompt";

/**
 * IO 注入选项 (方便测试)
 */
export interface ExecuteIO {
  stdin: NodeJS.ReadableStream;
  stdout: NodeJS.WritableStream;
  stderr: NodeJS.WritableStream;
  /** process 引用 (用于设置 exitCode) */
  processRef?: { exitCode?: number };
}

/**
 * 将数据序列化为 JSON Lines 格式写入流
 *
 * @param stream - 目标写入流
 * @param data - 要序列化的数据
 */
function writeJsonLine(stream: NodeJS.WritableStream, data: unknown): void {
  stream.write(JSON.stringify(data) + "\n");
}

/**
 * 从 stdin 读取全部内容
 *
 * @param stdin - 可读流
 * @returns stdin 的全部文本内容
 */
async function readStdin(stdin: NodeJS.ReadableStream): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of stdin as unknown as AsyncIterable<Buffer | string>) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf-8");
}

/**
 * 从 assistant 消息内容中提取文本
 *
 * 遍历 content 数组, 收集所有 type="text" 块的 text 字段并拼接
 *
 * @param message - assistant 消息对象
 * @returns 拼接后的文本
 */
function extractText(message: { content: Array<Record<string, unknown>> }): string {
  const parts: string[] = [];
  for (const block of message.content) {
    if (block.type === "text" && typeof block.text === "string") {
      parts.push(block.text);
    }
  }
  return parts.join("");
}

/**
 * 获取最后一个 assistant 消息的文本和 usage
 *
 * 逆向: Yl0.js:129-131 — `dt(d, "assistant")` gets last assistant msg,
 *        `kr(C.content).trim()` extracts text, `C.usage` gets token counts.
 */
function getLastAssistantInfo(snapshot: ThreadSnapshot | undefined): {
  text: string;
  usage?: { inputTokens?: number; outputTokens?: number; cacheCreationInputTokens?: number; cacheReadInputTokens?: number };
} {
  if (!snapshot) return { text: "" };
  const lastAssistant = snapshot.messages
    .filter((m: ThreadMessage) => m.role === "assistant")
    .pop();
  if (!lastAssistant) return { text: "" };

  const text = extractText(lastAssistant as { content: Array<Record<string, unknown>> });
  const usage = (lastAssistant as Record<string, unknown>).usage as {
    inputTokens?: number;
    outputTokens?: number;
    cacheCreationInputTokens?: number;
    cacheReadInputTokens?: number;
  } | undefined;

  return { text, usage };
}

/**
 * 运行非交互式执行模式
 *
 * 流程:
 * 1. 获取用户消息 (命令行参数或 stdin pipe)
 * 2. 无消息 (且非 stream-json-input) → exitCode=1
 * 3. 创建 ThreadWorker, 可选订阅 JSON 事件流
 * 4. runInference 执行推理循环
 * 5. 非 stream-json: 输出最终 assistant 文本到 stdout
 * 6. --stats: 输出 JSON { result, usage }
 * 7. --labels: 添加标签到线程快照
 * 8. --archive: 归档线程
 * 9. finally: asyncDispose
 *
 * @param container - 服务容器
 * @param context - CLI 上下文
 * @param io - IO 注入 (默认 process.stdin/stdout/stderr)
 */
export async function runExecuteMode(
  container: ServiceContainer,
  context: CliContext,
  io?: ExecuteIO,
): Promise<void> {
  const stdin = io?.stdin ?? process.stdin;
  const stdout = io?.stdout ?? process.stdout;
  const stderr = io?.stderr ?? process.stderr;
  const proc = (io?.processRef ?? process) as { exitCode?: number };

  // ── stream-json-input mode: multi-turn JSON Lines from stdin ──
  // 逆向: Kl0 `streamJsonInput` (0297_unknown_Kl0.js:195-209) — reads JSON Lines
  // from stdin using `for await (let eT of Vl0(c))`, sends each as user message.
  if (context.streamJsonInput) {
    await runStreamJsonInputMode(container, context, { stdin, stdout, stderr, processRef: proc });
    return;
  }

  // 获取用户消息
  let userMessage = context.userMessage;
  if (!userMessage) {
    // stdin pipe mode: 读取全部 stdin 内容
    userMessage = (await readStdin(stdin)).trim();
  }
  if (!userMessage) {
    stderr.write("Error: no input provided\n");
    proc.exitCode = 1;
    return;
  }

  const threadId = crypto.randomUUID();

  // Build user message and inject into worker via getMessages
  const messages: Message[] = [
    {
      role: "user",
      messageId: Date.now(),
      content: [{ type: "text", text: userMessage }],
    },
  ];

  // 逆向: R3R() system prompt override (1983_unknown_R3R.js:1-4)
  // amp's R3R checks sp/systemPrompt from parsed CLI options and returns the override text.
  // Flitter: if --system-prompt is set, resolve as file path first, then fall back to raw text.
  const systemPromptOverride = context.systemPrompt
    ? await resolveSystemPromptText(context.systemPrompt)
    : undefined;

  const workerOpts: Record<string, unknown> = {
    getMessages: () => messages,
  };

  // Wire --system-prompt: override buildSystemPrompt callback
  if (systemPromptOverride !== undefined) {
    workerOpts.buildSystemPrompt = async () => systemPromptOverride;
  }

  const worker = container.createThreadWorker(
    threadId,
    workerOpts as Parameters<typeof container.createThreadWorker>[1],
  );

  try {
    // 可选: stream-json 模式
    // 逆向: Kl0 includes thinking blocks when `includeThinking: i` is true
    // (0297_unknown_Kl0.js:75 — `Cl0(B, _, null, {includeThinking: i})`)
    let sub: Subscription | null = null;
    if (context.streamJson && !context.print) {
      sub = worker.events$.subscribe((event: AgentEvent) => {
        // 逆向: Kl0 filters out thinking events unless `includeThinking` is true
        // Forward-compat: "thinking" event type will be added when extended thinking lands
        if ((event as { type: string }).type === "thinking" && !context.streamJsonThinking) {
          return;
        }
        writeJsonLine(stdout, event);
      });
    }

    // Wire --max-turns: subscribe to turn completion events, cancel when limit reached.
    // runInference() is recursive (tool_use → executeTools → runInference), so we count
    // inference:complete events to track turns.
    let turnSub: Subscription | null = null;
    if (context.maxTurns !== undefined) {
      let turnCount = 0;
      turnSub = worker.events$.subscribe((event: AgentEvent) => {
        if (event.type === "inference:complete") {
          turnCount++;
          if (turnCount >= context.maxTurns!) {
            // Max turns reached — cancel the inference to stop the recursive loop
            worker.cancelInference();
          }
        }
      });
    }

    // 执行推理循环
    await worker.runInference();

    // ── --stats: output JSON { result, usage } ──
    // 逆向: Yl0.js:133-145 — when stats flag is set, output usage JSON instead of plain text
    if (context.stats) {
      const snapshot = container.threadStore.getThreadSnapshot(threadId);
      const { text, usage } = getLastAssistantInfo(snapshot);
      const statsOutput = {
        result: text.trim(),
        usage: {
          input_tokens: usage?.inputTokens ?? 0,
          output_tokens: usage?.outputTokens ?? 0,
          cache_creation_input_tokens: usage?.cacheCreationInputTokens ?? 0,
          cache_read_input_tokens: usage?.cacheReadInputTokens ?? 0,
        },
      };
      stdout.write(JSON.stringify(statsOutput) + "\n");
    } else if (!context.streamJson || context.print) {
      // --print: 输出最终 assistant 文本 (no JSON, no tool output, no intermediate text)
      // 逆向: amp's --execute outputs last assistant text; --print is Flitter's explicit flag
      // Non-streamJson also outputs last assistant text (backward-compatible).
      const snapshot = container.threadStore.getThreadSnapshot(threadId);
      const lastAssistant = snapshot?.messages
        .filter((m: ThreadMessage) => m.role === "assistant")
        .pop();
      if (lastAssistant) {
        const text = extractText(lastAssistant as { content: Array<Record<string, unknown>> });
        stdout.write(text + "\n");
      }
    }

    // ── --label: add labels to thread snapshot ──
    // 逆向: Kl0.js:128 — `if(o && o.length > 0) await NKT(R, o, r.configService)`
    // Yl0.js:62 — same pattern after execute completes
    // Amp calls a server API to add labels. Flitter stores locally.
    if (context.labels?.length) {
      const snapshot = container.threadStore.getThreadSnapshot(threadId);
      if (snapshot) {
        const updated: ThreadSnapshot = {
          ...snapshot,
          labels: [...(snapshot.labels ?? []), ...context.labels],
        };
        container.threadStore.setCachedThread(updated);
      }
    }

    sub?.unsubscribe();
    turnSub?.unsubscribe();
  } finally {
    // ── --archive: archive thread after execute ──
    // 逆向: 2001_unknown_SB.js:269 — `o.threadService.archive(oT, true)`
    // Placed in finally so archiving occurs even on error
    if (context.archive) {
      const snapshot = container.threadStore.getThreadSnapshot(threadId);
      if (snapshot) {
        const archived: ThreadSnapshot = { ...snapshot, archived: true };
        container.threadStore.setCachedThread(archived);
        if (container.threadPersistence) {
          await container.threadPersistence.save(archived);
        }
      }
    }

    await container.asyncDispose();
  }
}

/**
 * Multi-turn stream JSON input mode.
 *
 * Reads JSON Lines from stdin, each line is a user message:
 *   { "role": "user", "content": "..." }
 *
 * For each line, sends the message and runs inference, streaming events
 * as JSON Lines to stdout.
 *
 * 逆向: Kl0 (0297_unknown_Kl0.js:195-209)
 *   ```
 *   for await (let eT of Vl0(c)) {
 *     await T.sendMessage({ content: eT.contentBlocks, agentMode: p });
 *   }
 *   ```
 *
 * @param container - 服务容器
 * @param context - CLI 上下文
 * @param io - IO 注入
 */
async function runStreamJsonInputMode(
  container: ServiceContainer,
  context: CliContext,
  io: ExecuteIO,
): Promise<void> {
  const { stdin, stdout, stderr } = io;
  const threadId = crypto.randomUUID();

  // Mutable messages array; worker reads via getMessages callback
  const messages: Message[] = [];
  const worker = container.createThreadWorker(threadId, {
    getMessages: () => messages,
  });

  // Subscribe to events — stream JSON Lines to stdout
  const sub: Subscription = worker.events$.subscribe((event: AgentEvent) => {
    // 逆向: Kl0 filters thinking events unless `includeThinking` is true
    // Forward-compat: "thinking" event type will be added when extended thinking lands
    if ((event as { type: string }).type === "thinking" && !context.streamJsonThinking) {
      return;
    }
    writeJsonLine(stdout, event);
  });

  try {
    // If there's an initial user message (from command line args), send it first
    if (context.userMessage) {
      messages.push({
        role: "user",
        messageId: Date.now(),
        content: [{ type: "text", text: context.userMessage }],
      });
      await worker.runInference();
    }

    // Read subsequent messages from stdin as JSON Lines
    const rl = createInterface({ input: stdin as unknown as NodeJS.ReadableStream });
    for await (const line of rl) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed.role === "user" && typeof parsed.content === "string") {
          messages.push({
            role: "user",
            messageId: Date.now(),
            content: [{ type: "text", text: parsed.content }],
          });
          await worker.runInference();
        }
      } catch {
        stderr.write(`Invalid JSON line: ${trimmed}\n`);
      }
    }

    // ── --labels: add labels after all turns complete ──
    if (context.labels?.length) {
      const snapshot = container.threadStore.getThreadSnapshot(threadId);
      if (snapshot) {
        const updated: ThreadSnapshot = {
          ...snapshot,
          labels: [...(snapshot.labels ?? []), ...context.labels],
        };
        container.threadStore.setCachedThread(updated);
      }
    }
  } finally {
    sub.unsubscribe();

    // ── --archive ──
    if (context.archive) {
      const snapshot = container.threadStore.getThreadSnapshot(threadId);
      if (snapshot) {
        const archived: ThreadSnapshot = { ...snapshot, archived: true };
        container.threadStore.setCachedThread(archived);
        if (container.threadPersistence) {
          await container.threadPersistence.save(archived);
        }
      }
    }

    await container.asyncDispose();
  }
}
