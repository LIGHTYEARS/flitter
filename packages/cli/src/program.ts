/**
 * Commander.js 命令树定义
 *
 * 创建 Flitter CLI 的完整命令结构，包括全局选项、
 * 子命令（login/logout/threads/config/update）及其参数定义。
 *
 * 逆向参考: Yz0() in claude-config-system.js:1436-1448
 *
 * @example
 * ```typescript
 * import { createProgram } from "./program";
 * const program = createProgram("1.0.0");
 * program.parse(process.argv);
 * ```
 */
import { Command } from "commander";

/**
 * 创建 Commander.js 命令树
 *
 * 命令结构:
 *   flitter [message]          默认: 交互式 TUI 或执行模式
 *   flitter login              API Key / OAuth 登录
 *   flitter logout             清除凭据
 *   flitter threads list       列出 thread
 *   flitter threads new        创建新 thread
 *   flitter threads continue   继续 thread
 *   flitter threads archive    归档 thread
 *   flitter threads delete     删除 thread
 *   flitter config get <key>   获取配置
 *   flitter config set <k> <v> 设置配置
 *   flitter config list        列出配置
 *   flitter update             检查更新
 *
 * @param version - 版本号, 从 package.json 读取
 * @returns Commander.js Command 实例
 */
export function createProgram(version: string): Command {
  const program = new Command()
    .name("flitter")
    .version(version)
    .description("Flitter — AI Agent in your terminal")
    .argument("[message...]", "Message to send (execute mode)")
    .option("-e, --execute", "Run in non-interactive execute mode")
    .option("--headless", "Run in headless JSON stream mode")
    .option("--stream-json", "Output JSON event stream to stdout")
    .option("--no-color", "Disable color output")
    .option("-v, --verbose", "Enable verbose logging")
    // 默认动作: 无子命令时根据模式判定进入 interactive 或 execute 模式
    // 必须注册 action 否则 Commander 在有子命令时默认输出 help 并退出
    .action(() => {
      // 实际处理逻辑由调用方在 parse 后根据 CliContext 决定
    });

  // 未知子命令不报错 — 静默处理，交给 message 参数 (PIT-C1)
  // Commander 默认对未知子命令抛异常，用 command:* 事件拦截
  program.on("command:*", (_operands: string[]) => {
    // 未知命令静默处理，由调用方决定是否输出帮助
  });

  // ─── Auth 命令 ──────────────────────────────────────────

  program.command("login").description("Authenticate with API key or OAuth");

  program.command("logout").description("Remove stored credentials");

  // ─── Thread 管理 ────────────────────────────────────────

  const threads = program.command("threads").description("Manage conversation threads");

  threads
    .command("list")
    .description("List all threads")
    .option("--limit <n>", "Max threads to show", "20")
    .option("--format <fmt>", "Output format (table|json)", "table");

  threads
    .command("new")
    .description("Create a new thread")
    .option("--model <model>", "LLM model to use");

  threads
    .command("continue")
    .description("Continue an existing thread")
    .argument("<id>", "Thread ID to continue");

  threads
    .command("archive")
    .description("Archive a thread")
    .argument("<id>", "Thread ID to archive");

  threads.command("delete").description("Delete a thread").argument("<id>", "Thread ID to delete");

  // ─── Config 管理 ────────────────────────────────────────

  const config = program.command("config").description("Manage configuration");

  config.command("get").description("Get a config value").argument("<key>", "Config key to get");

  config
    .command("set")
    .description("Set a config value")
    .argument("<key>", "Config key to set")
    .argument("<value>", "Config value to set");

  config.command("list").description("List all config values");

  // ─── Update ─────────────────────────────────────────────

  program
    .command("update")
    .description("Check for and install updates")
    .option("--target-version <version>", "Install specific version");

  return program;
}
