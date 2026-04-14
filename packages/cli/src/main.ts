/**
 * Flitter CLI 主入口
 *
 * main() 异步函数是完整的 CLI 入口: 初始化 → 解析命令 → 执行 → 清理。
 *
 * 流程:
 * 1. 全局错误处理注册 (unhandledRejection)
 * 2. SIGINT/SIGTERM 信号处理
 * 3. 版本信息 + 日志初始化
 * 4. 创建 Commander 程序
 * 5. 注册子命令 action handlers
 * 6. parseAsync 解析并执行
 * 7. 异常处理 → stderr + exitCode
 *
 * 逆向: aF0() in cli-entrypoint.js:1013-1031
 *
 * @example
 * ```typescript
 * import { main } from "@flitter/cli";
 *
 * main().catch((err) => {
 *   process.stderr.write(`Fatal: ${err?.message ?? err}\n`);
 *   process.exit(2);
 * });
 * ```
 */
import { createProgram } from "./program";
import { createLogger } from "@flitter/util";

const log = createLogger("cli");

/**
 * main() 调用选项
 *
 * 支持注入 argv (用于测试) 和 _testThrow (用于模拟异常)
 */
export interface MainOptions {
  /** 自定义 argv (默认 process.argv) */
  argv?: string[];
  /** 测试用: 注入异常用于验证错误处理路径 */
  _testThrow?: Error;
}

/**
 * 获取 CLI 版本号
 *
 * 从 package.json 读取 version 字段。
 * 读取失败时 fallback 到 "0.0.0-dev"。
 *
 * 逆向: aF0 内版本读取逻辑
 *
 * @returns 版本号字符串
 */
export function getVersion(): string {
  try {
    // 使用 require 读取最近的 package.json
    // @flitter/cli 的 package.json 在上一级
    const pkg = require("../package.json");
    return pkg.version ?? "0.0.0-dev";
  } catch {
    return "0.0.0-dev";
  }
}

/**
 * Flitter CLI 主入口
 *
 * 逆向: aF0() in cli-entrypoint.js:1013-1031
 *
 * 流程:
 * 1. 全局错误处理注册
 * 2. 初始化日志
 * 3. 解析命令行 (Commander.js)
 * 4. 路由到子命令或默认动作
 * 5. 清理
 *
 * 退出码:
 * - 0 = 成功
 * - 1 = 用户错误
 * - 2 = 运行时错误
 *
 * @param opts - 可选配置 (argv 注入用于测试)
 */
export async function main(opts?: MainOptions): Promise<void> {
  // 1. 全局错误处理 (逆向 pc0)
  process.on("unhandledRejection", (err) => {
    log.error("Unhandled rejection", { error: err });
    process.exitCode = 2;
  });

  // 2. SIGINT/SIGTERM 信号处理
  let disposing = false;
  const handleSignal = async () => {
    if (disposing) return; // 防止重入
    disposing = true;
    log.info("Signal received, shutting down...");
    process.exitCode = 130; // Standard SIGINT exit code
  };
  process.on("SIGINT", handleSignal);
  process.on("SIGTERM", handleSignal);

  try {
    // 测试注入: 模拟异常
    if (opts?._testThrow) {
      throw opts._testThrow;
    }

    // 3. 版本和日志
    const version = getVersion();
    log.info("Starting Flitter CLI", { version });

    // 4. 日志级别 (从 argv 提前检测 --verbose)
    const argv = opts?.argv ?? process.argv;
    if (argv.includes("--verbose") || argv.includes("-v")) {
      log.info("Verbose mode enabled");
    }

    // 5. 创建 Commander 程序
    const program = createProgram(version);

    // 避免 Commander 在 --help/--version 时调用 process.exit
    program.exitOverride();

    // 6. 解析并执行
    await program.parseAsync(argv);
  } catch (err) {
    // Commander exitOverride 抛出的退出异常 (help/version)
    if (
      err &&
      typeof err === "object" &&
      "exitCode" in err &&
      (err as any).exitCode === 0
    ) {
      // --help 或 --version 正常退出
      return;
    }

    if (err instanceof Error) {
      process.stderr.write(`Error: ${err.message}\n`);
      log.error("CLI error", { error: err });
    } else {
      process.stderr.write(`Error: ${String(err)}\n`);
    }
    process.exitCode = process.exitCode || 1;
  }
}
