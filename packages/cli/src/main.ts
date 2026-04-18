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

import os from "node:os";
import path from "node:path";
import { FileSettingsStorage } from "@flitter/data";
import { createContainer, type SecretStorage, type ServiceContainer } from "@flitter/flitter";
import { createLogger } from "@flitter/util";
import { handleLogin, handleLogout } from "./commands/auth";
import { handleConfigGet, handleConfigList, handleConfigSet } from "./commands/config";
import { handleMcpAdd, handleMcpList, handleMcpRemove } from "./commands/mcp";
import {
  handlePermissionsAdd,
  handlePermissionsList,
  handlePermissionsTest,
} from "./commands/permissions";
import {
  handleThreadsArchive,
  handleThreadsContinue,
  handleThreadsDelete,
  handleThreadsList,
  handleThreadsNew,
} from "./commands/threads";
import { handleToolsList, handleToolsShow } from "./commands/tools";
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
    log.info("Starting Flitter CLI", { version });

    // 3. 日志级别 (从 argv 提前检测 --verbose)
    const argv = opts?.argv ?? process.argv;
    if (argv.includes("--verbose") || argv.includes("-v")) {
      log.info("Verbose mode enabled");
    }

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
        continueCmd.action(async (threadId: string) => {
          const c = await ensureContainer();
          const ctx = resolveCliContext(program);
          await handleThreadsContinue({ threadStore: c.threadStore }, ctx, threadId);
        });
      }
      const archiveCmd = threadsCmd.commands.find((c) => c.name() === "archive");
      if (archiveCmd) {
        archiveCmd.action(async (threadId: string) => {
          const c = await ensureContainer();
          const ctx = resolveCliContext(program);
          await handleThreadsArchive(
            { threadStore: c.threadStore, threadPersistence: c.threadPersistence },
            ctx,
            threadId,
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
