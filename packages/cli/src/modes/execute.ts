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
import type { ThreadMessage } from "@flitter/schemas";
import type { Subscription } from "@flitter/util";
import type { CliContext } from "../context";

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
  const worker = container.createThreadWorker(threadId);

  try {
    // 可选: stream-json 模式
    let sub: Subscription | null = null;
    if (context.streamJson) {
      sub = worker.events$.subscribe((event: AgentEvent) => {
        writeJsonLine(stdout, event);
      });
    }

    // 执行推理循环 (userMessage 已通过 context 传入 worker)
    await worker.runInference();

    // 非 stream-json: 输出最终文本
    if (!context.streamJson) {
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
  } finally {
    await container.asyncDispose();
  }
}
