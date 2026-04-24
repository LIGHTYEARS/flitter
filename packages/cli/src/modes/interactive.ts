/**
 * 交互式 TUI 模式入口
 *
 * 组装真正的 Widget 组件树、启动 runApp、连接 ThreadWorker 事件到 UI。
 * ThreadStateWidget 拥有完整的布局 (ConversationView + StatusBar + InputField)，
 * 不再在此处传递 InputField 作为 child。
 *
 * 组件树:
 *   AppWidget (ThemeController -> ConfigProvider -> child)
 *     └── ThreadStateWidget (对话状态 + 完整布局)
 *         ├── Expanded > Scrollable > ConversationView
 *         ├── StatusBar
 *         └── InputField
 *
 * 逆向: _70() in html-sanitizer-repl.js:1327-1388
 *
 * @example
 * ```typescript
 * import { launchInteractiveMode } from "./interactive";
 * import { createContainer } from "@flitter/flitter";
 *
 * const container = await createContainer(opts);
 * const context = resolveCliContext(program);
 * await launchInteractiveMode(container, context);
 * ```
 */

import { SessionCostTracker } from "@flitter/agent-core";
import type { ServiceContainer } from "@flitter/flitter";
import type { ThreadSnapshot } from "@flitter/schemas";
import {
  Clipboard,
  parsedThemeToThemeSpec,
  runApp,
  scanThemeDirectory,
  WidgetsBinding,
} from "@flitter/tui";
import { defaultOpenBrowser } from "../commands/auth.js";
import { createBuiltinCommands } from "../commands/slash-handlers.js";
import type { SlashCommandContext } from "../commands/slash-registry.js";
import { SlashCommandRegistry } from "../commands/slash-registry.js";
import {
  type UserVisibilityLevel,
  VALID_VISIBILITY_LEVELS,
  visibilityToMeta,
} from "../commands/threads.js";
import type { CliContext } from "../context.js";
import { resolveSystemPromptText } from "../util/system-prompt.js";
import { AppWidget } from "../widgets/app-widget.js";
import { parseCommandInput } from "../widgets/command-detection.js";
import type { ThemeData } from "../widgets/theme-controller.js";
import { ThemeController } from "../widgets/theme-controller.js";
import { ThreadStateWidget } from "../widgets/thread-state-widget.js";
import { ToastManager } from "../widgets/toast-manager.js";

// ─── 日志 ─────────────────────────────────────────────────

/**
 * 轻量日志辅助 (避免直接依赖 @flitter/util 运行时)
 */
const log = {
  info: (msg: string, meta?: Record<string, unknown>) => {
    if (process.env.FLITTER_DEBUG) {
      const suffix = meta ? ` ${JSON.stringify(meta)}` : "";
      process.stderr.write(`[interactive] ${msg}${suffix}\n`);
    }
  },
};

// ─── 默认主题 ─────────────────────────────────────────────

/**
 * 默认终端主题数据
 *
 * 使用 "terminal" 风格的暗色方案作为默认主题。
 * 与 ThemeController InheritedWidget 使用的 ThemeData 接口兼容。
 *
 * 逆向: 默认 terminal 主题色 (html-sanitizer-repl.js)
 */
export const defaultThemeData: ThemeData = {
  name: "terminal",
  primary: "#7aa2f7",
  secondary: "#9ece6a",
  surface: "#1a1b26",
  background: "#16161e",
  error: "#f7768e",
  text: "#a9b1d6",
  mutedText: "#565f89",
  border: "#3b4261",
  accent: "#bb9af7",
  success: "#9ece6a",
  warning: "#e0af68",
};

/**
 * Resolve ThemeData from a theme name.
 *
 * Attempts to look up the theme from ThemeRegistry (if available on the container),
 * otherwise returns defaultThemeData with the name overridden.
 *
 * 逆向: amp's reactive theme subscription rebuilds the widget tree when
 *   configService changes `terminal.theme`. The palette is resolved from the
 *   ThemeRegistry and converted to ThemeData via ThemeController.paletteToThemeData().
 */
export function resolveThemeData(themeName: string): ThemeData {
  // Map well-known theme names to palettes
  const THEME_PALETTES: Record<string, Partial<ThemeData>> = {
    terminal: {},
    dark: {
      primary: "#569cd6",
      secondary: "#4ec9b0",
      surface: "#1e1e1e",
      background: "#181818",
      error: "#f44747",
      text: "#d4d4d4",
      mutedText: "#808080",
      border: "#404040",
      accent: "#c586c0",
      success: "#6a9955",
      warning: "#ce9178",
    },
    light: {
      primary: "#0451a5",
      secondary: "#267f99",
      surface: "#ffffff",
      background: "#f5f5f5",
      error: "#cd3131",
      text: "#333333",
      mutedText: "#999999",
      border: "#d4d4d4",
      accent: "#af00db",
      success: "#388a34",
      warning: "#bf8803",
    },
    catppuccin: {
      primary: "#cba6f7",
      secondary: "#94e2d5",
      surface: "#1e1e2e",
      background: "#11111b",
      error: "#f38ba8",
      text: "#cdd6f4",
      mutedText: "#6c7086",
      border: "#45475a",
      accent: "#f5c2e7",
      success: "#a6e3a1",
      warning: "#f9e2af",
    },
  };

  const palette = THEME_PALETTES[themeName];
  if (palette) {
    return { ...defaultThemeData, ...palette, name: themeName };
  }
  return { ...defaultThemeData, name: themeName };
}

// ─── 核心函数 ─────────────────────────────────────────────

/** Resolve short CWD display (逆向: chunk-006.js:37949) */
function shortCwd(): string {
  const cwd = process.cwd();
  const home = process.env.HOME ?? "";
  if (home && cwd.startsWith(home)) {
    return `~${cwd.slice(home.length)}`;
  }
  return cwd;
}

/** Resolve git branch (逆向: chunk-006.js:36749) */
async function resolveGitBranch(): Promise<string | undefined> {
  try {
    const proc = Bun.spawn(["git", "rev-parse", "--abbrev-ref", "HEAD"], {
      stdout: "pipe",
      stderr: "ignore",
    });
    const text = await new Response(proc.stdout).text();
    return text.trim() || undefined;
  } catch {
    return undefined;
  }
}

/**
 * 解析要使用的 thread
 *
 * - context.threadId 指定 -> 恢复已有 thread
 * - context.continueThread -> 恢复最近的 thread
 * - 否则 -> 新建 thread
 *
 * 逆向: _70 内 thread 解析逻辑 (D-13)
 */
async function resolveThread(
  container: ServiceContainer,
  context: CliContext & { threadId?: string; continueThread?: boolean },
): Promise<string> {
  // 指定 threadId -> 直接恢复
  if (context.threadId) {
    log.info("Resuming thread", { threadId: context.threadId });
    return context.threadId;
  }

  // --continue 标志: 恢复最近的 thread
  if (context.continueThread) {
    try {
      const recentIds = container.threadStore.listRecentThreadIds(1);
      if (recentIds.length > 0) {
        log.info("Continuing most recent thread", { threadId: recentIds[0] });
        return recentIds[0];
      }
    } catch {
      // listRecentThreadIds may not be available — fall through to create new
    }
  }

  // 创建新 thread
  const id = crypto.randomUUID();
  container.threadStore.setCachedThread({
    id,
    v: 0,
    messages: [],
    relationships: [],
  } as unknown as ThreadSnapshot);
  log.info("Created new thread", { threadId: id });
  return id;
}

/**
 * 启动交互式 TUI 模式
 *
 * 完整流程:
 * 1. 读取主题设置
 * 2. 创建或恢复 thread
 * 3. 创建 ThreadWorker
 * 4. 组装真实 Widget 树 (AppWidget -> ThreadStateWidget)
 *    ThreadStateWidget 内部拥有完整布局 (ConversationView + StatusBar + InputField)
 * 5. 启动 TUI (runApp)
 * 6. 清理资源 (finally)
 * 7. 输出 thread URL (如有消息)
 *
 * 逆向: _70() in html-sanitizer-repl.js:1327-1388
 */
export async function launchInteractiveMode(
  container: ServiceContainer,
  context: CliContext & { threadId?: string; continueThread?: boolean },
): Promise<void> {
  log.info("Launching interactive TUI mode...");

  // 1. 解析主题数据
  // 逆向: amp has reactive theme subscription that rebuilds widget tree on config change.
  //   Amp's themeController listens to configService changes and calls setState() to
  //   rebuild with new palette. We subscribe to config changes and update themeData.

  // Load custom TOML themes from ~/.config/flitter/themes/ and register them.
  // 逆向: s70() + qD0() at chunk-004.js:30057-30087, 29509-29524
  //   amp calls s70() in _70() before resolving the active theme name.
  //   s70 scans the themes dir, o70 parses each colors.toml, qD0 registers in drT map.
  {
    const customThemes = scanThemeDirectory();
    for (const parsed of customThemes) {
      ThemeController.registry.registerCustom(parsedThemeToThemeSpec(parsed));
    }
    log.info("Custom themes loaded", { count: customThemes.length });
  }

  const config = container.configService.get();
  // Detect whether the user has explicitly set a theme (non-default value).
  // 逆向: amp chunk-004.js:30208 — `r.settings["terminal.theme"] ?? "terminal"`
  //   When the user has not configured a theme, the value is undefined/"terminal".
  //   We track whether an explicit theme was set so auto-detection can override "terminal".
  const configuredTheme = (config.settings as Record<string, unknown>)["terminal.theme"] as
    | string
    | undefined;
  const userExplicitTheme = configuredTheme !== undefined && configuredTheme !== "terminal";
  const themeName = configuredTheme ?? "terminal";
  let themeData: ThemeData = resolveThemeData(themeName);

  // Resolve CWD and git branch for InputField border overlays
  // 逆向: chunk-006.js:37949-37963 (bottom-right label: "{cwd} ({branch})")
  const cwdDisplay = shortCwd();
  const gitBranch = await resolveGitBranch();

  // 2. 创建或恢复 thread
  const threadId = await resolveThread(container, context);
  log.info("Thread resolved", { threadId });

  // Apply --visibility to newly created threads.
  // 逆向: chunk-005.js:5952 — `if (a) await e.threadService.updateThreadMeta(h, MA(a))`
  //   amp calls updateThreadMeta immediately after OS(h, "interactive") for new threads.
  //   Only applied when creating a new thread (not resuming an existing one).
  if (context.visibility && !context.threadId && !context.continueThread) {
    const level = context.visibility.toLowerCase();
    if (VALID_VISIBILITY_LEVELS.includes(level as UserVisibilityLevel)) {
      const meta = visibilityToMeta(level as UserVisibilityLevel);
      try {
        await container.threadStore.updateThreadMeta(threadId, meta);
        log.info("Applied visibility to new thread", { threadId, visibility: level });
      } catch {
        // Remote unavailable — fall back to local setVisibility
        (
          container.threadStore as typeof container.threadStore & {
            setVisibility?: (id: string, v: unknown) => void;
          }
        ).setVisibility?.(threadId, meta.visibility);
        log.info("Applied visibility locally (remote unavailable)", {
          threadId,
          visibility: level,
        });
      }
    } else {
      process.stderr.write(
        `Warning: Invalid visibility "${context.visibility}". Must be one of: ${VALID_VISIBILITY_LEVELS.join(", ")}\n`,
      );
    }
  }

  // 3. 创建 ThreadWorker
  // 逆向: R3R() system prompt override (1983_unknown_R3R.js:1-4)
  // If --system-prompt is set, resolve as file path or raw text and override buildSystemPrompt.
  const systemPromptOverride = context.systemPrompt
    ? await resolveSystemPromptText(context.systemPrompt)
    : undefined;

  const workerOpts: Record<string, unknown> = {};
  if (systemPromptOverride !== undefined) {
    workerOpts.buildSystemPrompt = async () => systemPromptOverride;
  }

  // ── Task 5: Forward context flags to worker/container ──
  // 逆向: i$T flag forwarding in S8() context builder (2002_unknown_S8.js)

  // agentMode → worker option (逆向: i$T mode flag selects agent mode)
  if (context.agentMode) {
    workerOpts.agentMode = context.agentMode;
  }

  // includeCoAuthors → worker metadata
  if (context.includeCoAuthors) {
    workerOpts.includeCoAuthors = true;
  }

  // dangerouslyAllowAll → container runtime override
  // 逆向: e0R:1173-1183 — Ms("dangerouslyAllowAll", true)
  if (context.dangerouslyAllowAll) {
    container.configService.updateSettings("global", "dangerouslyAllowAll", true);
  }

  // allowedTools / disallowedTools / noShellCmd → CLI tool filters on registry
  // 逆向: amp uses tools.enable / tools.disable config keys, not tools.allowed / tools.disallowed.
  // The CliToolFilters layer on ToolRegistry is the correct place for CLI-level filtering.
  if (context.allowedTools || context.disallowedTools) {
    container.toolRegistry.setCliFilters({
      allowedTools: context.allowedTools,
      disallowedTools: context.disallowedTools,
    });
  }
  if (context.noShellCmd) {
    container.configService.updateSettings("global", "tools.noShellCmd", true);
  }

  // toolbox → container runtime override to gate ToolboxService
  if (context.toolbox) {
    container.configService.updateSettings("global", "toolbox.path", context.toolbox);
  }

  const worker = container.createThreadWorker(
    threadId,
    Object.keys(workerOpts).length > 0
      ? (workerOpts as Parameters<typeof container.createThreadWorker>[1])
      : undefined,
  );

  // Wire SessionCostTracker to the worker's event stream
  // 逆向: chunk-002.js:1331-1351 (_K / mergeUsage accumulator pattern)
  const costTracker = new SessionCostTracker(worker.events$);

  // 逆向: toastController = new BQT() (chunk-006.js:34489)
  const toastManager = new ToastManager();

  // Theme hot-reload: subscribe to config changes and update themeData.
  // 逆向: amp has reactive theme subscription (configService.observe changes)
  //   that rebuilds the widget tree on theme change. When terminal.theme changes,
  //   amp resolves the new palette from ThemeRegistry and calls setState to trigger rebuild.
  let themeChangeCleanup: (() => void) | undefined;
  // Note: hot-reload subscriber captures `appWidgetRef` to update the live widget.
  // We initialize it below after appWidget is constructed.
  const appWidgetRef: { current: AppWidget | null } = { current: null };
  try {
    const configObs = container.configService.observe?.();
    if (configObs) {
      const sub = configObs.subscribe((newConfig: { settings: Record<string, unknown> }) => {
        const newThemeName =
          ((newConfig.settings as Record<string, unknown>)["terminal.theme"] as string) ??
          "terminal";
        const currentName = appWidgetRef.current?.config.themeData.name ?? themeData.name;
        if (newThemeName !== currentName) {
          log.info("Theme changed", { from: currentName, to: newThemeName });
          const newThemeData = resolveThemeData(newThemeName);
          themeData = newThemeData;
          // Update the live AppWidget so ThemeController.updateShouldNotify detects the change.
          if (appWidgetRef.current) {
            appWidgetRef.current.config.themeData = newThemeData;
          }
        }
      });
      themeChangeCleanup = () => sub.unsubscribe();
    }
  } catch {
    // configService.observe() may not be available — theme won't hot-reload
  }

  // Slash command registry
  // 逆向: e0R construction in amp (2785_unknown_e0R.js:17-18)
  const slashRegistry = new SlashCommandRegistry();
  createBuiltinCommands(slashRegistry);

  // Clipboard instance shared between slash commands and selection.
  // setCapabilities() is called in onCapabilitiesReady to enable OSC 52
  // on supported terminals (ghostty, kitty, wezterm, foot, alacritty, iterm2, tmux).
  // 逆向: eA (KXT) in chunk-004.js:3713 — setCapabilities() called from XXT.finishInitialization
  const clipboard = new Clipboard();

  // 4-5. 组装真实 Widget 树并启动 runApp
  // ThreadStateWidget 拥有完整布局 (ConversationView + StatusBar + InputField)
  // Build the AppWidget before runApp; onCapabilitiesReady may mutate themeData before mount.
  const appWidget = new AppWidget({
    themeData,
    configService: container.configService,
    child: new ThreadStateWidget({
      threadStore: container.threadStore,
      threadWorker: worker,
      threadId,
      onSubmit: (text: string) => {
        // Intercept slash commands before sending to LLM
        // 逆向: amp intercepts "/" prefix in editor submit action (e0R.execute)
        const parsed = parseCommandInput(text);
        if (parsed) {
          const ctx: SlashCommandContext = {
            threadId,
            threadStore: container.threadStore,
            threadWorker: worker,
            configService: container.configService,
            showMessage: (msg: string) => {
              // Append as a system message in the thread for display
              const snapshot = container.threadStore.getThreadSnapshot(threadId);
              if (snapshot) {
                container.threadStore.setCachedThread({
                  ...snapshot,
                  messages: [
                    ...snapshot.messages,
                    {
                      role: "assistant",
                      content: [{ type: "text", text: msg }],
                      state: { type: "complete" },
                    },
                  ],
                  // biome-ignore lint/suspicious/noExplicitAny: state field not in schema
                } as any);
              }
            },
            clearInput: () => {
              // InputField clears on submit automatically
            },
            costTracker,
            toolboxService: container.toolboxService,
            skillService: container.skillService,
            compactThread: async () => {
              const snapshot = container.threadStore.getThreadSnapshot(threadId);
              if (!snapshot) {
                return {
                  compacted: false,
                  thread: { messages: [] } as unknown as ThreadSnapshot,
                  tokensBefore: 0,
                  tokensAfter: 0,
                };
              }
              const result = await container.contextManager.checkAndCompact(snapshot);
              if (result.compacted) {
                container.threadStore.setCachedThread(result.thread, { scheduleUpload: true });
              }
              return result;
            },
            // /open-in-browser: open a URL in the default browser
            // 逆向: Wb() (chunk-002.js:24072) — darwin→open, win32→start "", default→xdg-open
            openUrl: defaultOpenBrowser,
            // Clipboard write for slash commands (/copy-url, /copy-id, /copy-markdown)
            // 逆向: d9.instance.tuiInstance.clipboard.writeText(a) in e0R (amp slash handlers)
            writeClipboard: (text: string) => clipboard.writeText(text),
          };
          slashRegistry.dispatch(parsed.command, parsed.args, ctx).catch((err) => {
            log.info("Slash command error", { error: err });
          });
          return;
        }

        // Not a slash command: send to LLM
        // 将用户消息追加到线程快照 (per KD-47)
        const snapshot = container.threadStore.getThreadSnapshot(threadId);
        if (snapshot) {
          container.threadStore.setCachedThread(
            {
              ...snapshot,
              messages: [...snapshot.messages, { role: "user", content: [{ type: "text", text }] }],
            } as ThreadSnapshot,
            { scheduleUpload: true },
          );
        }
        // 触发推理循环
        worker.runInference();
      },
      modelName:
        ((config.settings as Record<string, unknown>)["llm.model"] as string) ??
        "claude-sonnet-4-20250514",
      tokenCount: 0,
      toastManager,
      cwdDisplay,
      gitBranch,
      modeName: (context.agentMode as string | undefined) ?? "smart",
      // biome-ignore lint/suspicious/noExplicitAny: skillService type varies by container version
      skillCount: (container.skillService as any)?.list?.()?.length as number | undefined,
    }),
  });
  // Wire appWidget into the hot-reload ref so config changes can update it.
  appWidgetRef.current = appWidget;

  // Wire hyperlink click → browser open.
  // 逆向: je(T, url) in chunk-004.js:20890 — Wb() cross-platform opener
  //   In amp, hyperlink widgets have onClick: () => je(T, url).
  //   In flitter, Cell.url holds the OSC 8 hyperlink; WidgetsBinding checks
  //   the screen buffer on click and calls this opener.
  WidgetsBinding.instance.setOpenUrl(defaultOpenBrowser);

  try {
    await runApp(appWidget, {
      onCapabilitiesReady: (capabilities) => {
        // Auto-select light/dark theme based on terminal background luminance,
        // but only if the user has NOT explicitly configured a theme.
        // 逆向: amp uses IH() (background luminance) within theme rendering at
        //   chunk-004.js:9088 and chunk-003.js:22076. Flitter extends this by
        //   using the luminance to select an appropriate built-in theme variant
        //   when no explicit theme is configured.
        if (!userExplicitTheme && capabilities.background === "light") {
          log.info("Auto-selecting light theme based on terminal background luminance");
          appWidget.config.themeData = resolveThemeData("light");
        }
        // Wire OSC 52 capability into clipboard.
        // 逆向: eA.setCapabilities(T) called from XXT.finishInitialization (chunk-004.js:3719)
        //   Enables OSC 52 writes for known terminals (ghostty, kitty, wezterm, etc.)
        //   and triggers tmux set-clipboard detection when running inside tmux.
        clipboard.setCapabilities(capabilities);
        log.info("Clipboard capabilities set", { osc52: capabilities.osc52 });
      },
      onRootElementMounted: (rootElement) => {
        // 将根元素绑定到容器，供后续逻辑使用
        log.info("Root element mounted");
        (container as unknown as Record<string, unknown>)._rootElement = rootElement;
      },
    });
  } finally {
    // 6. 清理
    log.info("TUI exited, cleaning up...");
    themeChangeCleanup?.();
    toastManager.dispose();
    await container.asyncDispose();

    // 7. 退出前输出 thread URL
    const thread = container.threadStore.getThreadSnapshot(threadId);
    if (thread && thread.messages?.length > 0) {
      process.stdout.write(`\nThread: /threads/${threadId}\n`);
    }
  }
}

// ─── 测试辅助导出 ─────────────────────────────────────────

/**
 * 测试用内部方法导出
 *
 * 允许测试直接调用内部函数进行验证
 */
export const _testing = {
  /** 暴露 resolveThread 供测试直接调用 */
  resolveThread,
};
