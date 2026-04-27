/**
 * Flitter CLI 主入口
 *
 * main() 异步函数是完整的 CLI 入口: 初始化 -> 解析命令 -> 执行 -> 清理。
 *
 * 流程:
 * 1. 全局错误处理注册 (unhandledRejection)
 * 2. SIGINT/SIGTERM 信号处理
 * 3. 版本信息 + 日志初始化
 * 4. 创建 Commander 程序
 * 5. 创建 ServiceContainer (懒加载)
 * 6. 注册子命令 action handlers (login/logout/threads/config/update)
 * 7. 注册默认 action (模式路由: interactive/headless/execute)
 * 8. parseAsync 解析并执行
 * 9. finally: container.asyncDispose() 清理
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

import { readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { FileSettingsStorage } from "@flitter/data";
import { createContainer, type SecretStorage, type ServiceContainer } from "@flitter/flitter";
import { createLogger, setLogLevel, setLogOutput } from "@flitter/util";
import { handleLogin, handleLogout } from "./commands/auth";
import { handleConfigGet, handleConfigList, handleConfigSet } from "./commands/config";
import { handleInstall } from "./commands/install";
import { handleKeyboardTester } from "./commands/keyboard-tester";
import { handleMcpAdd, handleMcpList, handleMcpRemove } from "./commands/mcp";
import {
  handleMcpApprove,
  handleMcpDoctor,
  handleMcpOAuthLogin,
  handleMcpOAuthLogout,
} from "./commands/mcp-extended";
import {
  handlePermissionsAdd,
  handlePermissionsEdit,
  handlePermissionsList,
  handlePermissionsTest,
} from "./commands/permissions";
import { registerPluginsCommand } from "./commands/plugins";
import { handleReview } from "./commands/review";
import {
  handleSecretDelete,
  handleSecretGet,
  handleSecretList,
  handleSecretSet,
} from "./commands/secret";
import {
  handleSkillAdd,
  handleSkillInfo,
  handleSkillList,
  handleSkillRemove,
} from "./commands/skills";
import {
  handleThreadsArchive,
  handleThreadsContinue,
  handleThreadsDashboard,
  handleThreadsDelete,
  handleThreadsExport,
  handleThreadsLabel,
  handleThreadsList,
  handleThreadsMarkdown,
  handleThreadsNew,
  handleThreadsRename,
  handleThreadsSearch,
  handleThreadsShare,
  handleThreadsUsage,
} from "./commands/threads";
import { handleThreadsHandoff } from "./commands/threads-handoff";
import {
  handleToolsList,
  handleToolsMake,
  handleToolsShow,
  handleToolsUse,
} from "./commands/tools";
import { handleUpdate } from "./commands/update";
import { resolveCliContext } from "./context";
import { runExecuteMode } from "./modes/execute";
import { runHeadlessMode } from "./modes/headless";
import { launchInteractiveMode } from "./modes/interactive";
import { createProgram } from "./program";
import { FileSecretStorage } from "./storage/file-secret-storage.js";

const log = createLogger("cli");

/**
 * 信号处理器注册守卫 (防止重复注册 — WR-02)
 *
 * 在多次调用 main() 的测试场景中, 防止监听器泄漏。
 */
let signalHandlersInstalled = false;

/**
 * main() 调用选项
 *
 * 支持注入 argv (用于测试)、_testThrow (用于模拟异常)、
 * _testContainer (跳过 createContainer)、_testSecrets (注入 SecretStorage)。
 */
export interface MainOptions {
  /** 自定义 argv (默认 process.argv) */
  argv?: string[];
  /** 测试用: 注入异常用于验证错误处理路径 */
  _testThrow?: Error;
  /** 测试用: 注入 ServiceContainer (跳过 createContainer) */
  _testContainer?: ServiceContainer;
  /** 测试用: 注入 SecretStorage */
  _testSecrets?: SecretStorage;
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
 * 1. 全局错误处理注册 (带守卫防止重复注册)
 * 2. 初始化日志
 * 3. 创建 Commander 程序
 * 4. 注册所有子命令 action handlers
 * 5. 注册默认 action (模式路由)
 * 6. parseAsync 解析并执行
 * 7. finally: asyncDispose 清理容器
 *
 * 退出码:
 * - 0 = 成功
 * - 1 = 用户错误
 * - 2 = 运行时错误
 * - 130 = SIGINT (Ctrl+C)
 *
 * @param opts - 可选配置 (argv 注入、容器注入等, 用于测试)
 */
export async function main(opts?: MainOptions): Promise<void> {
  // 1. 全局错误处理 (逆向 pc0) + 信号处理器 (带守卫)
  let disposing = false;
  const handleSignal = async () => {
    if (disposing) return; // 防止重入
    disposing = true;
    log.info("Signal received, shutting down...");
    process.exitCode = 130; // Standard SIGINT exit code
    // 通知 TUI 停止 (如果正在运行), 使 runApp().waitForExit() resolve
    try {
      const { WidgetsBinding } = await import("@flitter/tui");
      WidgetsBinding.instance.stop();
    } catch {
      // WidgetsBinding 未初始化或 TUI 未启动 — 忽略
    }
  };

  if (!signalHandlersInstalled) {
    process.on("unhandledRejection", (err) => {
      log.error("Unhandled rejection", { error: err });
      process.exitCode = 2;
    });
    process.on("SIGINT", handleSignal);
    process.on("SIGTERM", handleSignal);
    signalHandlersInstalled = true;
  }

  // 容器引用 (用于 finally 清理)
  let container: ServiceContainer | null = opts?._testContainer ?? null;

  try {
    // 测试注入: 模拟异常
    if (opts?._testThrow) {
      throw opts._testThrow;
    }

    // 2. 版本和日志
    const version = getVersion();

    // 3. 日志级别 (从 argv 提前检测 --verbose, --log-level, --log-file, execute mode flags)
    // 逆向: RF0 (modules/2004_unknown_RF0.js) — logLevel from flag → env → "info",
    //        logFile from flag → env → default
    const argv = opts?.argv ?? process.argv;
    const isVerbose = argv.includes("--verbose") || argv.includes("-v");
    const isExecuteMode =
      argv.includes("--execute") ||
      argv.includes("-e") ||
      argv.includes("--print") ||
      argv.includes("-p") ||
      argv.includes("--pipe") ||
      argv.includes("--stats") ||
      argv.includes("--headless");

    // --log-level <level> (supports both --log-level=val and --log-level val)
    let explicitLogLevel: string | undefined;
    for (let i = 0; i < argv.length; i++) {
      if (argv[i].startsWith("--log-level=")) {
        explicitLogLevel = argv[i].slice("--log-level=".length);
      } else if (argv[i] === "--log-level" && i + 1 < argv.length) {
        explicitLogLevel = argv[i + 1];
      }
    }
    // Validate level (fall back to FLITTER_LOG_LEVEL env if flag not given)
    const validLevels = new Set(["debug", "info", "warn", "error"]);
    const resolvedLevel = explicitLogLevel ?? process.env.FLITTER_LOG_LEVEL;

    // --log-file <path> (supports both --log-file=val and --log-file val)
    let logFilePath: string | undefined;
    for (let i = 0; i < argv.length; i++) {
      if (argv[i].startsWith("--log-file=")) {
        logFilePath = argv[i].slice("--log-file=".length);
      } else if (argv[i] === "--log-file" && i + 1 < argv.length) {
        logFilePath = argv[i + 1];
      }
    }
    logFilePath = logFilePath ?? process.env.FLITTER_LOG_FILE;

    // Redirect log output to file if specified
    if (logFilePath) {
      const resolvedPath = path.resolve(logFilePath);
      const { createWriteStream } = await import("node:fs");
      const stream = createWriteStream(resolvedPath, { flags: "a" });
      setLogOutput((line: string) => {
        stream.write(`${line}\n`);
      });
    }

    // Resolve log level: explicit flag > env > mode-based defaults
    if (resolvedLevel && validLevels.has(resolvedLevel)) {
      setLogLevel(resolvedLevel as "debug" | "info" | "warn" | "error");
    } else if (isVerbose) {
      setLogLevel("debug");
    } else if (isExecuteMode) {
      // In execute/pipe/headless mode, suppress info/debug logs to keep stderr clean.
      setLogLevel("warn");
    } else {
      setLogLevel("info");
    }

    log.info("Starting Flitter CLI", { version });

    // 4. 创建 Commander 程序
    const program = createProgram(version);

    // 避免 Commander 在 --help/--version 时调用 process.exit
    program.exitOverride();

    // ── 依赖准备 ──────────────────────────────────────────

    const configDir = path.join(os.homedir(), ".config", "flitter");
    const baseSecrets: SecretStorage =
      opts?._testSecrets ?? new FileSecretStorage(path.join(configDir, "data"));

    // 逆向: amp i$T apiKey flag (chunk-006.js:38263-38267) passes through to
    // otT() which builds the secret store, with CLI --api-key taking precedence.
    // We check for --api-key early by peeking at argv before Commander parses,
    // then wrap the SecretStorage to return the CLI-provided key.
    const cliApiKey = extractCliApiKey(argv);
    const secrets: SecretStorage = cliApiKey
      ? wrapSecretsWithApiKey(baseSecrets, cliApiKey)
      : baseSecrets;

    const settings = new FileSettingsStorage({
      globalPath: path.join(configDir, "settings.json"),
    });

    // 逆向: amp mode/model override is applied in S8() context builder (2002_unknown_S8.js)
    // Flitter: peek at --model from argv before Commander parse, wire into container post-creation
    const cliModel = extractCliModel(argv);

    // 逆向: amp-cli-reversed/modules/2509_unknown_EC0.js — --mcp-config inline JSON or file path
    const cliMcpConfigRaw = extractCliMcpConfig(argv);
    const cliMcpConfig = cliMcpConfigRaw ? parseMcpConfigValue(cliMcpConfigRaw) : undefined;

    async function ensureContainer(): Promise<ServiceContainer> {
      if (!container) {
        container = await createContainer({
          settings,
          secrets,
          workspaceRoot: process.cwd(),
          dataDir: path.join(configDir, "data"),
          homeDir: os.homedir(),
          configDir,
        });

        // Wire --model override into config service settings
        if (cliModel) {
          container.configService.updateSettings("global", "internal.model", cliModel);
        }

        // Wire --mcp-config: merge CLI-provided servers into runtime config
        // 逆向: amp-cli-reversed/modules/2510_unknown_CC0.js — CC0 merges with _target: "flag"
        if (cliMcpConfig) {
          const existing = container.configService.get().settings.mcpServers ?? {};
          const merged = { ...existing, ...cliMcpConfig };
          container.configService.setRuntimeOverride("mcpServers", merged);
          container.mcpServerManager.refresh();
        }
      }
      return container;
    }

    // ── 注册子命令 action handlers ────────────────────────

    // login 命令
    const loginCmd = program.commands.find((c) => c.name() === "login");
    if (loginCmd) {
      loginCmd.action(async () => {
        const c = await ensureContainer();
        const ctx = resolveCliContext(program);
        await handleLogin({ secrets: c.secrets }, ctx);
      });
    }

    // logout 命令
    const logoutCmd = program.commands.find((c) => c.name() === "logout");
    if (logoutCmd) {
      logoutCmd.action(async () => {
        const c = await ensureContainer();
        const ctx = resolveCliContext(program);
        await handleLogout({ secrets: c.secrets }, ctx);
      });
    }

    // update 命令
    const updateCmd = program.commands.find((c) => c.name() === "update");
    if (updateCmd) {
      updateCmd.action(async (cmdOpts: Record<string, unknown>) => {
        const c = await ensureContainer();
        const ctx = resolveCliContext(program);
        await handleUpdate({ configService: c.configService }, ctx, {
          targetVersion: cmdOpts?.targetVersion as string | undefined,
        });
      });
    }

    // install 命令 (hidden) — 逆向: 0473_unknown__m0.js, 0437_unknown_gb0.js
    // 安装 ripgrep 到 $FLITTER_HOME/bin (or ~/.config/flitter/bin)
    const installCmd = program.commands.find((c) => c.name() === "install");
    if (installCmd) {
      installCmd.action(async (cmdOpts: Record<string, unknown>) => {
        await handleInstall(
          {},
          {
            force: cmdOpts?.force as boolean | undefined,
            verbose: cmdOpts?.verbose as boolean | undefined,
          },
        );
        // 逆向: 0473_unknown__m0.js:3 — amp calls process.exit() after install
        process.exit(process.exitCode ?? 0);
      });
    }

    // keyboard-tester 命令 (hidden) — 逆向: 0525_unknown_sy0.js
    // Stream parsed terminal input events as JSONL for diagnostics
    const kbTestCmd = program.commands.find((c) => c.name() === "keyboard-tester");
    if (kbTestCmd) {
      kbTestCmd.action(async (cmdOpts: Record<string, unknown>) => {
        await handleKeyboardTester({
          raw: cmdOpts?.raw === true,
        });
        // 逆向: chunk-005.js:4776 — amp calls process.exit() after keyboard-tester
        process.exit(process.exitCode ?? 0);
      });
    }

    // threads 子命令
    const threadsCmd = program.commands.find((c) => c.name() === "threads");
    if (threadsCmd) {
      const listCmd = threadsCmd.commands.find((c) => c.name() === "list");
      if (listCmd) {
        listCmd.action(async (cmdOpts: Record<string, unknown>) => {
          const c = await ensureContainer();
          const ctx = resolveCliContext(program);
          await handleThreadsList({ threadStore: c.threadStore }, ctx, {
            limit: (cmdOpts?.limit as string) ?? "20",
            format: (cmdOpts?.format as "table" | "json") ?? "table",
            includeArchived: cmdOpts?.includeArchived === true,
          });
        });
      }
      const newCmd = threadsCmd.commands.find((c) => c.name() === "new");
      if (newCmd) {
        newCmd.action(async (cmdOpts: Record<string, unknown>) => {
          const c = await ensureContainer();
          const ctx = resolveCliContext(program);
          await handleThreadsNew({ threadStore: c.threadStore }, ctx, {
            model: cmdOpts?.model as string | undefined,
          });
        });
      }
      const continueCmd = threadsCmd.commands.find((c) => c.name() === "continue");
      if (continueCmd) {
        continueCmd.action(async (threadId: string | undefined, opts: { last?: boolean }) => {
          const c = await ensureContainer();
          const ctx = resolveCliContext(program);
          await handleThreadsContinue({ threadStore: c.threadStore }, ctx, threadId, opts);
        });
      }
      const archiveCmd = threadsCmd.commands.find((c) => c.name() === "archive");
      if (archiveCmd) {
        archiveCmd.action(async (threadId: string, cmdOpts?: { unarchive?: boolean }) => {
          const c = await ensureContainer();
          const ctx = resolveCliContext(program);
          await handleThreadsArchive(
            { threadStore: c.threadStore, threadPersistence: c.threadPersistence },
            ctx,
            threadId,
            { unarchive: cmdOpts?.unarchive === true },
          );
        });
      }
      const deleteCmd = threadsCmd.commands.find((c) => c.name() === "delete");
      if (deleteCmd) {
        deleteCmd.action(async (threadId: string) => {
          const c = await ensureContainer();
          const ctx = resolveCliContext(program);
          await handleThreadsDelete(
            { threadStore: c.threadStore, threadPersistence: c.threadPersistence },
            ctx,
            threadId,
          );
        });
      }
      // 逆向: oF0 in 2013_unknown_oF0.js — threads share
      const shareCmd = threadsCmd.commands.find((c) => c.name() === "share");
      if (shareCmd) {
        shareCmd.action(async (threadId: string, cmdOpts?: { visibility?: string }) => {
          const c = await ensureContainer();
          const ctx = resolveCliContext(program);
          await handleThreadsShare(
            { threadStore: c.threadStore, threadPersistence: c.threadPersistence },
            ctx,
            threadId,
            { visibility: cmdOpts?.visibility },
          );
        });
      }

      // ── Task 1: Wire 6 existing thread handlers ──────────
      const exportCmd = threadsCmd.commands.find((c) => c.name() === "export");
      if (exportCmd) {
        exportCmd.action(async (threadId: string) => {
          const c = await ensureContainer();
          const ctx = resolveCliContext(program);
          await handleThreadsExport(
            { threadStore: c.threadStore, threadPersistence: c.threadPersistence },
            ctx,
            threadId,
          );
        });
      }
      const markdownCmd = threadsCmd.commands.find((c) => c.name() === "markdown");
      if (markdownCmd) {
        markdownCmd.action(async (threadId: string) => {
          const c = await ensureContainer();
          const ctx = resolveCliContext(program);
          await handleThreadsMarkdown(
            { threadStore: c.threadStore, threadPersistence: c.threadPersistence },
            ctx,
            threadId,
          );
        });
      }
      const searchCmd = threadsCmd.commands.find((c) => c.name() === "search");
      if (searchCmd) {
        searchCmd.action(async (query: string, cmdOpts: Record<string, unknown>) => {
          const c = await ensureContainer();
          const ctx = resolveCliContext(program);
          await handleThreadsSearch({ threadStore: c.threadStore }, ctx, query, {
            limit: (cmdOpts?.limit as string) ?? "20",
            offset: (cmdOpts?.offset as string) ?? "0",
            json: cmdOpts?.json as boolean,
          });
        });
      }
      const renameCmd = threadsCmd.commands.find((c) => c.name() === "rename");
      if (renameCmd) {
        renameCmd.action(async (threadId: string, newName: string) => {
          const c = await ensureContainer();
          const ctx = resolveCliContext(program);
          await handleThreadsRename(
            { threadStore: c.threadStore, threadPersistence: c.threadPersistence },
            ctx,
            threadId,
            newName,
          );
        });
      }
      const labelCmd = threadsCmd.commands.find((c) => c.name() === "label");
      if (labelCmd) {
        labelCmd.action(async (threadId: string, labels: string[]) => {
          const c = await ensureContainer();
          const ctx = resolveCliContext(program);
          await handleThreadsLabel(
            { threadStore: c.threadStore, threadPersistence: c.threadPersistence },
            ctx,
            threadId,
            labels,
          );
        });
      }
      const usageCmd = threadsCmd.commands.find((c) => c.name() === "usage");
      if (usageCmd) {
        usageCmd.action(async (threadId: string) => {
          const c = await ensureContainer();
          const ctx = resolveCliContext(program);
          await handleThreadsUsage(
            { threadStore: c.threadStore, threadPersistence: c.threadPersistence },
            ctx,
            threadId,
          );
        });
      }
      // ── Task 4: Dashboard handler ──────────────────────
      const dashboardCmd = threadsCmd.commands.find((c) => c.name() === "dashboard");
      if (dashboardCmd) {
        dashboardCmd.action(async (cmdOpts: Record<string, unknown>) => {
          const c = await ensureContainer();
          const ctx = resolveCliContext(program);
          await handleThreadsDashboard({ threadStore: c.threadStore }, ctx, {
            limit: (cmdOpts?.limit as string) ?? "50",
            format: (cmdOpts?.format as "table" | "json") ?? "table",
          });
        });
      }
      // 逆向: amp-cli-reversed/chunk-005.js:4962 — `threads handoff [id]`
      const handoffCmd = threadsCmd.commands.find((c) => c.name() === "handoff");
      if (handoffCmd) {
        handoffCmd.action(
          async (threadId: string | undefined, cmdOpts: Record<string, unknown>) => {
            const c = await ensureContainer();
            await handleThreadsHandoff(
              {
                threadStore: c.threadStore,
                threadWorkerService: c.threadWorkerService,
              },
              threadId,
              {
                goal: cmdOpts.goal as string | undefined,
                print: cmdOpts.print as boolean | undefined,
              },
            );
          },
        );
      }
    }

    // config 子命令
    const configCmd = program.commands.find((c) => c.name() === "config");
    if (configCmd) {
      const getCmd = configCmd.commands.find((c) => c.name() === "get");
      if (getCmd) {
        getCmd.action(async (key: string) => {
          const c = await ensureContainer();
          const ctx = resolveCliContext(program);
          await handleConfigGet({ configService: c.configService }, ctx, key);
        });
      }
      const setCmd = configCmd.commands.find((c) => c.name() === "set");
      if (setCmd) {
        setCmd.action(async (key: string, value: string) => {
          const c = await ensureContainer();
          const ctx = resolveCliContext(program);
          await handleConfigSet({ configService: c.configService }, ctx, key, value);
        });
      }
      const listConfigCmd = configCmd.commands.find((c) => c.name() === "list");
      if (listConfigCmd) {
        listConfigCmd.action(async () => {
          const c = await ensureContainer();
          const ctx = resolveCliContext(program);
          await handleConfigList({ configService: c.configService }, ctx);
        });
      }
    }

    // secret 子命令 — uses baseSecrets directly, no container needed
    const secretCmd = program.commands.find((c) => c.name() === "secret");
    if (secretCmd) {
      const secretSetCmd = secretCmd.commands.find((c) => c.name() === "set");
      if (secretSetCmd) {
        secretSetCmd.action(async (key: string, value: string) => {
          await handleSecretSet(secrets, key, value);
        });
      }
      const secretGetCmd = secretCmd.commands.find((c) => c.name() === "get");
      if (secretGetCmd) {
        secretGetCmd.action(async (key: string) => {
          await handleSecretGet(secrets, key);
        });
      }
      const secretDeleteCmd = secretCmd.commands.find((c) => c.name() === "delete");
      if (secretDeleteCmd) {
        secretDeleteCmd.action(async (key: string) => {
          await handleSecretDelete(secrets, key);
        });
      }
      const secretListCmd = secretCmd.commands.find((c) => c.name() === "list");
      if (secretListCmd) {
        secretListCmd.action(async () => {
          await handleSecretList(secrets);
        });
      }
    }

    // plugins 子命令 — uses deferred container reference for pluginService
    registerPluginsCommand(program, () => container?.pluginService ?? null);

    // mcp 子命令
    const mcpCmd = program.commands.find((c) => c.name() === "mcp");
    if (mcpCmd) {
      const mcpAddCmd = mcpCmd.commands.find((c) => c.name() === "add");
      if (mcpAddCmd) {
        mcpAddCmd.action(async (name: string, args: string[], opts: Record<string, unknown>) => {
          const c = await ensureContainer();
          await handleMcpAdd({ configService: c.configService }, name, args, {
            env: opts.env as string[] | undefined,
            header: opts.header as string[] | undefined,
            workspace: opts.workspace as boolean | undefined,
          });
        });
      }
      const mcpListCmd = mcpCmd.commands.find((c) => c.name() === "list");
      if (mcpListCmd) {
        mcpListCmd.action(async (opts: Record<string, unknown>) => {
          const c = await ensureContainer();
          await handleMcpList({ configService: c.configService }, { json: opts.json as boolean });
        });
      }
      const mcpRemoveCmd = mcpCmd.commands.find((c) => c.name() === "remove");
      if (mcpRemoveCmd) {
        mcpRemoveCmd.action(async (name: string, opts: Record<string, unknown>) => {
          const c = await ensureContainer();
          await handleMcpRemove({ configService: c.configService }, name, {
            workspace: opts.workspace as boolean | undefined,
          });
        });
      }
      // ── Task 3: MCP extended commands ──────────────────
      const mcpDoctorCmd = mcpCmd.commands.find((c) => c.name() === "doctor");
      if (mcpDoctorCmd) {
        mcpDoctorCmd.action(async () => {
          const c = await ensureContainer();
          await handleMcpDoctor({
            configService: c.configService,
            mcpServerManager: c.mcpServerManager,
          });
        });
      }
      const mcpApproveCmd = mcpCmd.commands.find((c) => c.name() === "approve");
      if (mcpApproveCmd) {
        mcpApproveCmd.action(async (name: string) => {
          const c = await ensureContainer();
          await handleMcpApprove({ configService: c.configService }, name);
        });
      }
      const mcpOauthCmd = mcpCmd.commands.find((c) => c.name() === "oauth");
      if (mcpOauthCmd) {
        const oauthLoginCmd = mcpOauthCmd.commands.find(
          (c: { name: () => string }) => c.name() === "login",
        );
        if (oauthLoginCmd) {
          oauthLoginCmd.action(async (server: string) => {
            const c = await ensureContainer();
            await handleMcpOAuthLogin(
              { configService: c.configService, mcpServerManager: c.mcpServerManager },
              server,
            );
          });
        }
        const oauthLogoutCmd = mcpOauthCmd.commands.find(
          (c: { name: () => string }) => c.name() === "logout",
        );
        if (oauthLogoutCmd) {
          oauthLogoutCmd.action(async (server: string) => {
            const c = await ensureContainer();
            await handleMcpOAuthLogout(
              { configService: c.configService, mcpServerManager: c.mcpServerManager },
              server,
            );
          });
        }
      }
    }

    // permissions 子命令
    const permsCmd = program.commands.find((c) => c.name() === "permissions");
    if (permsCmd) {
      const permsListCmd = permsCmd.commands.find((c) => c.name() === "list");
      if (permsListCmd) {
        permsListCmd.action(async (opts: Record<string, unknown>) => {
          const c = await ensureContainer();
          await handlePermissionsList(
            { configService: c.configService, permissionEngine: c.permissionEngine },
            {
              json: opts.json as boolean,
              workspace: opts.workspace as boolean,
              builtin: opts.builtin as boolean,
            },
          );
        });
      }
      const permsTestCmd = permsCmd.commands.find((c) => c.name() === "test");
      if (permsTestCmd) {
        permsTestCmd.action(
          async (toolName: string, args: string[], opts: Record<string, unknown>) => {
            const c = await ensureContainer();
            await handlePermissionsTest(
              { configService: c.configService, permissionEngine: c.permissionEngine },
              toolName,
              args,
              { json: opts.json as boolean, quiet: opts.quiet as boolean },
            );
          },
        );
      }
      const permsAddCmd = permsCmd.commands.find((c) => c.name() === "add");
      if (permsAddCmd) {
        permsAddCmd.action(
          async (
            action: string,
            tool: string,
            matchers: string[],
            opts: Record<string, unknown>,
          ) => {
            const c = await ensureContainer();
            await handlePermissionsAdd({ configService: c.configService }, action, tool, matchers, {
              workspace: opts.workspace as boolean | undefined,
            });
          },
        );
      }
      // 逆向: amp-cli-reversed/modules/2435_unknown_MQT.js — permissions edit
      const permsEditCmd = permsCmd.commands.find((c) => c.name() === "edit");
      if (permsEditCmd) {
        permsEditCmd.action(async (opts: Record<string, unknown>) => {
          const c = await ensureContainer();
          await handlePermissionsEdit(
            { configService: c.configService },
            {
              workspace: opts.workspace as boolean | undefined,
            },
          );
        });
      }
    }

    // tools 子命令
    const toolsCmd = program.commands.find((c) => c.name() === "tools");
    if (toolsCmd) {
      const toolsListCmd = toolsCmd.commands.find((c) => c.name() === "list");
      if (toolsListCmd) {
        toolsListCmd.action(async (opts: Record<string, unknown>) => {
          const c = await ensureContainer();
          await handleToolsList({ toolRegistry: c.toolRegistry }, { json: opts.json as boolean });
        });
      }
      const toolsShowCmd = toolsCmd.commands.find((c) => c.name() === "show");
      if (toolsShowCmd) {
        toolsShowCmd.action(async (name: string) => {
          const c = await ensureContainer();
          await handleToolsShow({ toolRegistry: c.toolRegistry }, name);
        });
      }
      // 逆向: amp-cli-reversed/chunk-004.js:25484 — `tools use <name>`
      const toolsUseCmd = toolsCmd.commands.find((c) => c.name() === "use");
      if (toolsUseCmd) {
        toolsUseCmd.action(
          async (toolName: string, opts: Record<string, unknown>, cmd: { args: string[] }) => {
            const c = await ensureContainer();
            // Raw args are everything after the tool name
            const rawArgs = cmd.args.slice(1);
            await handleToolsUse(
              {
                toolRegistry: c.toolRegistry,
                config: c.configService.get(),
                workingDirectory: process.cwd(),
              },
              toolName,
              rawArgs,
              { only: opts.only as string | undefined, stream: opts.stream as boolean | undefined },
            );
          },
        );
      }
      // 逆向: amp-cli-reversed/modules/2597_unknown_pM0.js — `tools make`
      const toolsMakeCmd = toolsCmd.commands.find((c) => c.name() === "make");
      if (toolsMakeCmd) {
        toolsMakeCmd.action((toolName: string, opts: Record<string, unknown>) => {
          handleToolsMake(toolName, {
            force: opts.force as boolean | undefined,
            bun: opts.bun as boolean | undefined,
            bash: opts.bash as boolean | undefined,
            zsh: opts.zsh as boolean | undefined,
          });
        });
      }
    }

    // ── skill 子命令 ──────────────────────────────────────
    // 逆向: amp-cli-reversed/chunk-004.js:23716 (g40 — skill command group)
    const skillCmd = program.commands.find((c) => c.name() === "skill");
    if (skillCmd) {
      const skillListCmd = skillCmd.commands.find((c) => c.name() === "list");
      if (skillListCmd) {
        skillListCmd.action(async (opts: Record<string, unknown>) => {
          const c = await ensureContainer();
          await handleSkillList({ skillService: c.skillService }, { json: opts.json as boolean });
        });
      }
      const skillInfoCmd = skillCmd.commands.find((c) => c.name() === "info");
      if (skillInfoCmd) {
        skillInfoCmd.action(async (name: string, opts: Record<string, unknown>) => {
          const c = await ensureContainer();
          await handleSkillInfo({ skillService: c.skillService }, name, {
            json: opts.json as boolean,
          });
        });
      }
      const skillRemoveCmd = skillCmd.commands.find((c) => c.name() === "remove");
      if (skillRemoveCmd) {
        skillRemoveCmd.action(async (name: string) => {
          const c = await ensureContainer();
          await handleSkillRemove({ skillService: c.skillService }, name);
        });
      }
      const skillAddCmd = skillCmd.commands.find((c) => c.name() === "add");
      if (skillAddCmd) {
        skillAddCmd.action(async (source: string, opts: Record<string, unknown>) => {
          const c = await ensureContainer();
          await handleSkillAdd({ skillService: c.skillService }, source, {
            name: opts.name as string | undefined,
            overwrite: opts.overwrite as boolean | undefined,
          });
        });
      }
    }

    // ── Task 2: Review command ────────────────────────────
    // 逆向: p40 (2535_unknown_p40.js) — review command with check runner flags
    const reviewCmd = program.commands.find((c) => c.name() === "review");
    if (reviewCmd) {
      reviewCmd.action(async (diff: string | undefined, cmdOpts: Record<string, unknown>) => {
        const c = await ensureContainer();
        const ctx = resolveCliContext(program);
        await handleReview(c, ctx, {
          diff: diff as string | undefined,
          format: (cmdOpts?.format as string) ?? "text",
          files: (cmdOpts?.files as string[]) ?? [],
          instructions: cmdOpts?.instructions as string | undefined,
          thoroughness: (cmdOpts?.thoroughness as "methodical" | "quick") ?? "methodical",
          checkScope: cmdOpts?.checkScope as string | undefined,
          checkFilter: cmdOpts?.checkFilter as string[] | undefined,
          checksOnly: cmdOpts?.checksOnly === true,
          summaryOnly: cmdOpts?.summaryOnly === true,
        });
      });
    }

    // ── 默认 action: 模式路由 ─────────────────────────────
    // 覆盖 program.ts 中的空 .action(() => {}) — Commander 最后注册的 action 生效
    program.action(async () => {
      const c = await ensureContainer();
      const ctx = resolveCliContext(program);

      if (ctx.headless) {
        await runHeadlessMode(c, ctx);
      } else if (ctx.executeMode) {
        await runExecuteMode(c, ctx);
      } else {
        // 逆向: i$T ide flag (chunk-006.js:38220-38226)
        // IDE connection is enabled by default; --no-ide disables it.
        if (ctx.ide) {
          log.debug("cli", "IDE connection enabled (no IDE client implemented yet)");
        }
        await launchInteractiveMode(c, { ...ctx });
      }
    });

    // 5. 解析并执行 (try/finally 确保容器清理)
    try {
      await program.parseAsync(argv);
    } finally {
      // 清理: 如果容器已创建, asyncDispose (幂等, 重复调用安全)
      if (container) {
        await container.asyncDispose();
      }
    }
  } catch (err) {
    // Commander exitOverride 抛出的退出异常 (help/version)
    if (
      err &&
      typeof err === "object" &&
      "exitCode" in err &&
      (err as { exitCode: unknown }).exitCode === 0
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

// ── Helper functions for CLI flag wiring ──────────────────

/**
 * Extract --api-key value from argv before Commander parses.
 *
 * 逆向: amp i$T apiKey flag (chunk-006.js:38263-38267)
 * In amp, the apiKey is passed through the parsed options object.
 * Flitter peeks at argv to get it early for SecretStorage wrapping.
 */
function extractCliApiKey(argv: string[]): string | undefined {
  const idx = argv.indexOf("--api-key");
  if (idx !== -1 && idx + 1 < argv.length) {
    return argv[idx + 1];
  }
  return undefined;
}

/**
 * Extract --model value from argv before Commander parses.
 *
 * 逆向: amp uses --mode flag (chunk-006.js:38237-38243) to select model/prompt combo.
 * Flitter uses a direct --model flag for explicit model selection.
 */
function extractCliModel(argv: string[]): string | undefined {
  const idx = argv.indexOf("--model");
  if (idx !== -1 && idx + 1 < argv.length) {
    return argv[idx + 1];
  }
  return undefined;
}

/**
 * Wrap a SecretStorage to intercept apiKey reads with a CLI-provided override.
 *
 * 逆向: amp's otT() builds the secret store (S8 context builder, 2002_unknown_S8.js:75).
 * When --api-key is provided, the CLI key takes precedence over stored credentials.
 *
 * @param base - Underlying secret storage
 * @param apiKey - CLI-provided API key override
 * @returns Wrapped SecretStorage that returns the CLI key for "apiKey" reads
 */
function wrapSecretsWithApiKey(base: SecretStorage, apiKey: string): SecretStorage {
  return {
    async get(key: string, scope?: string): Promise<string | undefined> {
      if (key === "apiKey") return apiKey;
      return base.get(key, scope);
    },
    async set(key: string, value: string, scope?: string): Promise<void> {
      return base.set(key, value, scope);
    },
    async delete(key: string, scope?: string): Promise<void> {
      return base.delete(key, scope);
    },
  };
}

/**
 * Extract --mcp-config value from argv before Commander parses.
 *
 * 逆向: amp-cli-reversed/modules/1472_tail_anonymous.js:6750 — mcpConfig flag
 */
function extractCliMcpConfig(argv: string[]): string | undefined {
  const idx = argv.indexOf("--mcp-config");
  if (idx !== -1 && idx + 1 < argv.length) {
    return argv[idx + 1];
  }
  return undefined;
}

/**
 * Parse --mcp-config value: inline JSON or file path → Record<string, MCPServerSpec>.
 *
 * 逆向: amp-cli-reversed/modules/2509_unknown_EC0.js
 *   - If value starts with `{`, treat as inline JSON
 *   - Otherwise treat as file path, read contents
 *   - JSON.parse the result, validate shape
 *
 * @param value - Raw CLI flag value (JSON string or file path)
 * @returns Parsed MCP server map, or undefined if parsing fails (error printed to stderr)
 */
function parseMcpConfigValue(value: string): Record<string, Record<string, unknown>> | undefined {
  let raw: string;
  if (value.trim().startsWith("{")) {
    raw = value;
  } else {
    try {
      raw = readFileSync(value, "utf-8");
    } catch (err) {
      process.stderr.write(
        `Failed to read --mcp-config file: ${err instanceof Error ? err.message : String(err)}\n`,
      );
      return undefined;
    }
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    process.stderr.write(
      `Failed to parse --mcp-config as JSON: ${err instanceof Error ? err.message : String(err)}\n`,
    );
    return undefined;
  }

  // Basic shape validation: must be Record<string, object>
  // 逆向: dC0 = z.record(z.string(), OC0) where OC0 = union of command/url server specs
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    process.stderr.write(
      "Invalid --mcp-config: expected a JSON object mapping server names to specs.\n",
    );
    return undefined;
  }

  return parsed as Record<string, Record<string, unknown>>;
}
