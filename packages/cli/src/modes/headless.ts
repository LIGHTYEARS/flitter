/**
 * Headless JSON 流模式
 *
 * 输入: stdin JSON Lines -- 每行 { role: "user", content: "..." }
 * 输出: stdout JSON Lines -- 每行 AgentEvent
 *
 * Headless 模式用于脚本化/自动化集成:
 * - 所有 JSON 事件走 stdout (可被管道消费)
 * - 日志和错误走 stderr (不污染 JSON 流)
 * - stdin EOF 触发 graceful shutdown
 *
 * 逆向: SB() stream-json 分支 in cli-entrypoint.js:700-813
 *
 * @example
 * ```bash
 * echo '{"role":"user","content":"hello"}' | flitter --headless
 * # 输出: {"type":"inference:start"}\n{"type":"inference:delta",...}\n...
 * ```
 */

import { createInterface } from "node:readline";
import type { AgentEvent } from "@flitter/agent-core";
import type { ServiceContainer } from "@flitter/flitter";
import type { Subscription } from "@flitter/util";
import type { CliContext } from "../context";

/**
 * IO 注入选项 (方便测试)
 */
export interface HeadlessIO {
  stdin: NodeJS.ReadableStream;
  stdout: NodeJS.WritableStream;
  stderr: NodeJS.WritableStream;
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
 * 运行 Headless JSON 流模式
 *
 * 流程:
 * 1. 创建 ThreadWorker 并订阅 AgentEvent → JSON Lines 输出到 stdout
 * 2. 如有初始 userMessage (命令行参数), 先执行推理
 * 3. 持续读取 stdin JSON Lines, 每行触发 runInference
 * 4. stdin EOF → graceful shutdown
 * 5. finally: 取消订阅 + asyncDispose
 *
 * @param container - 服务容器
 * @param context - CLI 上下文
 * @param io - IO 注入 (默认 process.stdin/stdout/stderr)
 */
export async function runHeadlessMode(
  container: ServiceContainer,
  context: CliContext,
  io?: HeadlessIO,
): Promise<void> {
  const stdin = io?.stdin ?? process.stdin;
  const stdout = io?.stdout ?? process.stdout;
  const stderr = io?.stderr ?? process.stderr;

  const threadId = crypto.randomUUID();
  const worker = container.createThreadWorker(threadId);

  // 订阅 AgentEvent → JSON Lines 输出到 stdout
  const sub: Subscription = worker.events$.subscribe((event: AgentEvent) => {
    writeJsonLine(stdout, event);
  });

  try {
    // 如果有初始消息 (命令行参数), 先执行推理
    if (context.userMessage) {
      await worker.runInference();
    }

    // 持续读 stdin JSON Lines
    const rl = createInterface({ input: stdin as unknown as NodeJS.ReadableStream });
    for await (const line of rl) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        const msg = JSON.parse(trimmed);
        if (msg.role === "user" && typeof msg.content === "string") {
          // 触发推理循环 (用户消息已通过 JSON 传入)
          await worker.runInference();
        }
      } catch {
        stderr.write(`Warning: invalid JSON line: ${trimmed}\n`);
      }
    }
  } finally {
    sub.unsubscribe();
    await container.asyncDispose();
  }
}
