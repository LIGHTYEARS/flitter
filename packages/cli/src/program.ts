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
    .option(
      "--mcp-config <json-or-path>",
      "Extra MCP servers (inline JSON object or path to JSON file)",
    )
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
    // ── CLI flag forwarding (Gap #7-12) ──
    // 逆向: i$T dangerouslyAllowAll (chunk-006.js) → bypasses permission checks
    .option("--dangerously-allow-all", "Bypass permission checks (dangerous)")
    // 逆向: i$T allowedTools/disallowedTools → tool filter lists
    .option("--allowed-tools <tools>", "Comma-separated list of allowed tools")
    .option("--disallowed-tools <tools>", "Comma-separated list of disallowed tools")
    .option("--disable-shell", "Disable shell command execution")
    .option("--toolbox <path>", "Path to toolbox scripts directory")
    .option("--include-co-authors", "Include co-author attribution in output")
    .option("--output-format <format>", "Output format: text, json, markdown (default: text)")
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

  // 逆向: amp-cli-reversed/chunk-005.js:4879 — threads group aliases
  const threads = program
    .command("threads")
    .alias("t")
    .alias("thread")
    .description("Manage conversation threads");

  threads
    .command("list")
    .alias("l")
    .alias("ls")
    .description("List all threads")
    .option("--limit <n>", "Max threads to show", "20")
    .option("--format <fmt>", "Output format (table|json)", "table")
    .option("--include-archived", "Include archived threads in the list");

  threads
    .command("new")
    .alias("n")
    .description("Create a new thread")
    .option("--model <model>", "LLM model to use");

  threads
    .command("continue")
    .alias("c")
    .description("Continue an existing thread")
    .argument("[id]", "Thread ID or URL to continue")
    .option("--last", "Continue the most recent thread directly");

  threads
    .command("archive")
    .description("Archive a thread")
    .argument("<id>", "Thread ID to archive")
    // 逆向: amp has separate archive/unarchive commands; flitter uses a flag
    .option("--unarchive", "Unarchive the thread instead of archiving");

  threads.command("delete").description("Delete a thread").argument("<id>", "Thread ID to delete");

  // 逆向: oF0 in 2013_unknown_oF0.js — threads share command
  threads
    .command("share")
    .description("Share a thread / set visibility")
    .argument("<id>", "Thread ID or URL to share")
    .option(
      "--visibility <level>",
      "Visibility level: private, unlisted, public, workspace, group",
    );

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

  // 逆向: e0R:202-244 (dashboard/thread list in command palette)
  threads
    .command("dashboard")
    .description("Show threads dashboard (table view)")
    .option("--limit <n>", "Max threads to show", "50")
    .option("--format <fmt>", "Output format (table|json)", "table");

  // 逆向: amp-cli-reversed/chunk-005.js:4962 — `threads handoff [id]`
  threads
    .command("handoff [threadIDOrURL]")
    .alias("h")
    .description("Create a handoff thread from an existing thread with a goal/prompt")
    .option("-g, --goal <goal>", "Goal/prompt for the handoff (alternative to stdin)")
    .option("-p, --print", "Print the thread ID instead of opening the TUI", false);

  // ─── Review ────────────────────────────────────────────

  program
    .command("review [diff]")
    .description("Run AI code review on staged changes or provided diff")
    .option("--format <fmt>", "Output format (text|json|markdown)", "text");

  // ─── Config 管理 ────────────────────────────────────────

  const config = program.command("config").description("Manage configuration");

  config.command("get").description("Get a config value").argument("<key>", "Config key to get");

  config
    .command("set")
    .description("Set a config value")
    .argument("<key>", "Config key to set")
    .argument("<value>", "Config value to set");

  config.command("list").description("List all config values");

  // ─── Secret 管理 ────────────────────────────────────────

  const secret = program.command("secret").description("Manage stored secrets");

  secret
    .command("set")
    .description("Store a secret value")
    .argument("<key>", "Secret key (e.g., sync-auth-token)")
    .argument("<value>", "Secret value to store");

  secret
    .command("get")
    .description("Show a stored secret (masked)")
    .argument("<key>", "Secret key to show");

  secret
    .command("delete")
    .description("Delete a stored secret")
    .argument("<key>", "Secret key to delete");

  secret.command("list").description("List all stored secrets (masked)");

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

  // 逆向: jPR doctor pattern — iterate servers, test connectivity
  mcp.command("doctor").description("Check health of all configured MCP servers");

  // 逆向: e0R permissions-enable/disable pattern applied to MCP trust
  mcp.command("approve <name>").description("Add an MCP server to the trusted list");

  const mcpOauth = mcp.command("oauth").description("Manage MCP OAuth authentication");

  mcpOauth.command("login <server>").description("Authenticate with an MCP server via OAuth");

  mcpOauth.command("logout <server>").description("Remove OAuth tokens for an MCP server");

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

  // 逆向: amp-cli-reversed/modules/2435_unknown_MQT.js — permissions edit in $EDITOR
  perms
    .command("edit")
    .description("Edit permission rules in your editor")
    .option("-w, --workspace", "Edit workspace-scoped rules", false);

  // ─── Tools 检查 ──────────────────────────────────────────

  const tools = program.command("tools").description("Inspect available tools");

  tools
    .command("list")
    .alias("ls")
    .description("List all registered tools")
    .option("--json", "Output as JSON", false);

  tools.command("show <name>").description("Show details of a specific tool");

  // 逆向: amp-cli-reversed/chunk-004.js:25484 — _M0 registers `use` command
  tools
    .command("use <tool-name>")
    .description("Invoke a tool directly from CLI")
    .option("--only <field>", "Extract a single field from the result")
    .option("--stream", "Output events as JSON lines", false)
    .allowUnknownOption(true)
    .allowExcessArguments(true);

  // 逆向: amp-cli-reversed/modules/2597_unknown_pM0.js — `tools make` command
  tools
    .command("make <tool-name>")
    .description("Scaffold a new toolbox tool script")
    .option("--force", "Overwrite an existing tool if it already exists", false)
    .option("--bun", "Create a Bun/TypeScript tool (default)", false)
    .option("--bash", "Create a Bash shell script tool", false)
    .option("--zsh", "Create a Zsh shell script tool", false);

  // ─── Skills 管理 ─────────────────────────────────────────
  // 逆向: amp-cli-reversed/chunk-004.js:23716 (g40 — `skill` command group)

  const skill = program
    .command("skill")
    .alias("skills")
    .description("Manage skills from GitHub or local sources")
    .action(() => {
      skill.help();
    });

  skill
    .command("list")
    .alias("ls")
    .option("--json", "Output as JSON", false)
    .description("List all available skills");

  skill
    .command("info")
    .argument("<name>", "Name of the skill")
    .option("--json", "Output as JSON", false)
    .description("Show information about a skill");

  skill
    .command("remove")
    .alias("rm")
    .argument("<name>", "Name of the skill to remove")
    .description("Remove an installed skill");

  skill
    .command("add")
    .argument("<source>", "Skill source (local path, @user/skill, owner/repo)")
    .option("--name <name>", "Install with a custom local name")
    .option("--overwrite", "Overwrite existing skill with the same name", false)
    .option("--global", "Install to global skills directory (~/.config/flitter/skills/)", false)
    .description("Install skills from a source");

  return program;
}
