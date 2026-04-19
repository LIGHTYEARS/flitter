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
  // Helper for repeatable options (Commander.js collector)
  const collect = (value: string, previous: string[]) => [...previous, value];

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
    // ── 逆向: i$T flag definitions (chunk-006.js:38263-38279) ──
    // amp defines apiKey, sp, systemPrompt, mode as hidden options.
    // Flitter exposes a subset as user-facing CLI flags.
    .option("--model <model>", "LLM model to use (e.g., claude-sonnet-4-20250514)")
    .option("--mode <mode>", "Agent mode: smart, fast, deep, auto")
    .option("--api-key <key>", "API key (overrides stored credentials for this session)")
    .option("--system-prompt <text>", "Custom system prompt text or file path")
    .option("--max-turns <n>", "Maximum number of inference turns (default: unlimited)")
    .option("-p, --print", "Output only the final assistant text (implies --execute)")
    .option("--pipe", "Read prompt from stdin, output result to stdout (implies --execute)")
    // ── 逆向: Yz0 stream-json-thinking (line 611-612) ──
    .option(
      "--stream-json-thinking",
      "Include thinking blocks in stream JSON output (implies --stream-json)",
    )
    // ── 逆向: Yz0 stream-json-input (line 613-614) ──
    .option(
      "--stream-json-input",
      "Read JSON Lines user messages from stdin (requires --execute and --stream-json)",
    )
    // ── 逆向: Yz0 --stats (line 615-616) ──
    .option("--stats", "Output JSON with result and token usage data (implies --execute)")
    // ── 逆向: Yz0 --archive (line 617-618) ──
    .option("--archive", "Archive the thread after execute finishes")
    // ── 逆向: Yz0 -l/--label repeatable (line 619-622) ──
    .option("-l, --label <label>", "Add label(s) to thread (repeatable)", collect, [])
    // ── 逆向: i$T dangerouslyAllowAll (chunk-006.js:38207-38211) ──
    // amp: type "switch", default false. Disables all command confirmation prompts.
    .option(
      "--dangerously-allow-all",
      "Disable all command confirmation prompts (agent will execute all commands without asking)",
    )
    // ── 逆向: no direct amp equivalent; Flitter extension for tool filtering ──
    .option(
      "--allowedTools <list>",
      "Comma-separated list of tool names to allow (whitelist)",
    )
    .option(
      "--disallowedTools <list>",
      "Comma-separated list of tool names to disallow (blacklist)",
    )
    // ── 逆向: no direct amp flag; Flitter convenience for disabling Bash tool ──
    .option("--no-shell-cmd", "Disable the Bash/shell tool")
    // ── 逆向: toolbox.path in amp config (chunk-005.js:158919-158922) ──
    .option("--toolbox", "Enable ToolboxService scanning for user shell-script tools")
    // ── 逆向: git.commit.coauthor.enabled in amp config (chunk-005.js:158815-158817) ──
    .option(
      "--include-co-authors",
      "Enable git commit co-author injection (Co-Authored-By trailer)",
    )
    // ── Flitter extension: output format selection ──
    .option(
      "--output-format <fmt>",
      "Output format: text, json, markdown (default: text)",
    )
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

  // 逆向: sF0 in 2012_unknown_sF0.js
  threads
    .command("export")
    .description("Export a thread as JSON")
    .argument("<id>", "Thread ID or URL to export");

  // 逆向: cF0 in 2011_unknown_cF0.js → KN() in 1866_unknown_KN.js
  threads
    .command("markdown")
    .alias("md")
    .description("Render thread as markdown")
    .argument("<id>", "Thread ID or URL to render");

  // 逆向: uF0 in 2023_unknown_uF0.js
  threads
    .command("search")
    .alias("find")
    .description("Search threads")
    .argument("<query>", "Search query")
    .option("-n, --limit <number>", "Maximum number of threads to return", "20")
    .option("--offset <number>", "Number of results to skip (for pagination)", "0")
    .option("--json", "Output as JSON", false);

  // 逆向: rF0 in 2008_unknown_rF0.js
  threads
    .command("rename")
    .alias("r")
    .description("Rename a thread")
    .argument("<id>", "Thread ID or URL to rename")
    .argument("<newName>", "New thread name");

  // 逆向: nF0 in 2014_unknown_nF0.js → BKT in 0289_unknown_BKT.js
  threads
    .command("label")
    .description("Add labels to a thread")
    .argument("<id>", "Thread ID or URL to label")
    .argument("<labels...>", "Labels to add");

  // 逆向: OL0 in 2576_unknown_OL0.js → dL0 in 2577_unknown_dL0.js
  threads
    .command("usage")
    .description("Show usage information for a thread")
    .argument("<id>", "Thread ID or URL");

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

  // ─── MCP 管理 ────────────────────────────────────────────

  const mcp = program.command("mcp").description("Manage MCP servers");

  mcp
    .command("add <name> [args...]")
    .description("Add an MCP server")
    .option("-e, --env <KEY=VALUE>", "Environment variable (repeatable)", collect, [])
    .option(
      "-H, --header <KEY=VALUE>",
      "HTTP header for URL-based servers (repeatable)",
      collect,
      [],
    )
    .option("-w, --workspace", "Save to workspace settings", false);

  mcp
    .command("list")
    .alias("ls")
    .description("List configured MCP servers")
    .option("--json", "Output as JSON", false);

  mcp
    .command("remove <name>")
    .alias("rm")
    .description("Remove an MCP server")
    .option("-w, --workspace", "Remove from workspace settings", false);

  // 逆向: amp mcp doctor — diagnoses MCP server connections
  mcp
    .command("doctor")
    .description("Diagnose MCP server connections (test status, latency, errors)");

  // 逆向: amp mcp approve — approve workspace-scoped MCP server
  mcp
    .command("approve <name>")
    .description("Approve/trust a workspace-scoped MCP server")
    .option("-w, --workspace", "Apply to workspace settings", false);

  // 逆向: amp mcp oauth — MCP server OAuth authentication
  const mcpOauth = mcp.command("oauth").description("MCP server OAuth authentication");
  mcpOauth
    .command("login <server>")
    .description("Authenticate with an MCP server via OAuth");
  mcpOauth
    .command("logout <server>")
    .description("Remove OAuth credentials for an MCP server");

  // ─── Permissions 管理 ───────────────────────────────────

  const perms = program
    .command("permissions")
    .alias("permission")
    .description("Manage permission rules");

  perms
    .command("list")
    .alias("ls")
    .description("List configured permission rules")
    .option("--json", "Output as JSON", false)
    .option("--builtin", "Show info about built-in defaults", false)
    .option("-w, --workspace", "Show workspace-scoped rules", false);

  perms
    .command("test <tool-name> [args...]")
    .description("Test if a tool invocation would be permitted")
    .option("--json", "Output as JSON", false)
    .option("-q, --quiet", "Exit code only (0=allowed, 1=denied)", false)
    .allowUnknownOption(true);

  perms
    .command("add <action> <tool> [matchers...]")
    .description("Add a permission rule (prepended, takes precedence)")
    .option("-w, --workspace", "Save to workspace settings", false)
    .allowUnknownOption(true);

  // ─── Tools 检查 ──────────────────────────────────────────

  const tools = program.command("tools").description("Inspect available tools");

  tools
    .command("list")
    .alias("ls")
    .description("List all registered tools")
    .option("--json", "Output as JSON", false);

  tools.command("show <name>").description("Show details of a specific tool");

  // ─── Review 命令 ────────────────────────────────────────
  // 逆向: amp chunk-005.js review command — spawns ThreadWorker with review system prompt

  program
    .command("review [diff]")
    .description("Run code review on a diff or staged changes")
    .option("--checks <checks>", "Comma-separated list of checks to run")
    .option("--files <files>", "Comma-separated list of files to review")
    .option("--instructions <text>", "Additional review instructions");

  // ─── Thread Dashboard ──────────────────────────────────
  // 逆向: amp's thread picker / continue command palette (e0R:202-244)

  threads
    .command("dashboard")
    .alias("dash")
    .description("Interactive thread switcher (TUI fuzzy picker)")
    .option("--limit <n>", "Max threads to show", "50");

  return program;
}
