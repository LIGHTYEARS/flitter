/**
 * 非交互式执行模式
 *
 * 单次执行: 发送 userMessage → 等待完成 → 输出结果
 * 支持 stdin pipe 模式 (无命令行参数时从 stdin 读取全部内容)
 * 支持 --stream-json 模式 (JSON Lines 输出而非纯文本)
 *
 * 逆向: SB() execute 分支 in cli-entrypoint.js:546-700
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
 * ```
 */

import type { AgentEvent } from "@flitter/agent-core";
import type { ServiceContainer } from "@flitter/flitter";
import type { Message, ThreadMessage } from "@flitter/schemas";
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
 * 运行非交互式执行模式
 *
 * 流程:
 * 1. 获取用户消息 (命令行参数或 stdin pipe)
 * 2. 无消息 → exitCode=1
 * 3. 创建 ThreadWorker, 可选订阅 JSON 事件流
 * 4. runInference 执行推理循环
 * 5. 非 stream-json: 输出最终 assistant 文本到 stdout
 * 6. finally: asyncDispose
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
  const proc = io?.processRef ?? process;

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
    let sub: Subscription | null = null;
    if (context.streamJson && !context.print) {
      sub = worker.events$.subscribe((event: AgentEvent) => {
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

    // --print: 输出最终 assistant 文本 (no JSON, no tool output, no intermediate text)
    // 逆向: amp's --execute outputs last assistant text; --print is Flitter's explicit flag
    // for this behavior (implies --execute).
    // Non-streamJson also outputs last assistant text (backward-compatible).
    if (!context.streamJson || context.print) {
      const snapshot = container.threadStore.getThreadSnapshot(threadId);
      const lastAssistant = snapshot?.messages
        .filter((m: ThreadMessage) => m.role === "assistant")
        .pop();
      if (lastAssistant) {
        const text = extractText(lastAssistant as { content: Array<Record<string, unknown>> });
        stdout.write(text + "\n");
      }
    }

    sub?.unsubscribe();
    turnSub?.unsubscribe();
  } finally {
    await container.asyncDispose();
  }
}
