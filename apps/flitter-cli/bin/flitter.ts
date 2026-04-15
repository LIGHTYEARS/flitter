#!/usr/bin/env bun
/**
 * Flitter CLI 全局安装入口
 *
 * 第一行 #!/usr/bin/env bun 使得全局安装后可以直接执行:
 *   $ flitter "hello"
 *   $ flitter --headless
 *
 * 逆向: cli-entrypoint.js 的顶层入口调用 aF0()
 *
 * @example
 * ```bash
 * # 全局安装
 * bun install -g flitter-cli-app
 *
 * # 直接运行
 * flitter "explain this code"
 * ```
 */
import { main } from "@flitter/cli";

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.stack || err.message : String(err);
  process.stderr.write(`Fatal: ${message}\n`);
  process.exit(2);
});
