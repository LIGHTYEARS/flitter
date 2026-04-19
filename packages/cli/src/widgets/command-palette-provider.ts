/**
 * FlitterCommandPaletteProvider — 命令面板命令注册表。
 *
 * 管理应用级命令的注册、注销和执行。
 * 命令列表使用 amp 的 noun/verb 语义: category 对应 noun (如 "amp", "mode", "thread"),
 * label 对应 verb (如 "help", "use smart", "toggle")。
 *
 * 逆向参考:
 * - 命令注册: e0R 类 (modules/2785_unknown_e0R.js:2094) — register() 方法
 * - 命令结构: noun/verb/shortcut/execute 字段 (chunk-004.js:34746+)
 * - 顶级命令: QZT.getCommandPaletteCommands() (chunk-006.js:15582)
 * - 模式命令: createAgentModeCommand() 使用 M0T 模式列表 (chunk-004.js:36018)
 * - 命令面板 UI: qZT widget (chunk-006.js:14771) — commands + onDismiss
 * - 面板布局: tmux-capture/screens/amp/slash-command-popup/plain-63x244.golden
 *   显示左对齐 category, 右侧 verb, 最右 shortcut
 *
 * @module command-palette-provider
 *
 * @example
 * ```ts
 * const provider = new FlitterCommandPaletteProvider();
 * provider.registerCommand({
 *   id: "custom-cmd",
 *   label: "do something",
 *   category: "tools",
 *   description: "Do something custom",
 *   action: () => console.log("custom action"),
 *   priority: 50,
 * });
 * provider.executeCommand("custom-cmd");
 * ```
 */

import type { CommandPaletteCommand } from "@flitter/tui";

// ════════════════════════════════════════════════════
//  默认命令列表
// ════════════════════════════════════════════════════

/**
 * Flitter 默认命令面板命令列表。
 *
 * 逆向: amp 的命令面板显示以下分类和命令
 * (tmux-capture/screens/amp/slash-command-popup/plain-63x244.golden):
 *   amp   help
 *   mode  use rush / use large / use deep / set / toggle  (Ctrl+S)
 *   thread  switch / new / map / switch to cluster / set visibility
 *   prompt  open in editor (Ctrl+G) / paste image from clipboard (Ctrl+V)
 *   context  analyze
 *   news  open in browser
 *
 * 命令 action 默认为空函数占位 — 实际动作在上层 Widget (AppWidget/ThreadStateWidget) 中绑定。
 */
const FLITTER_COMMANDS: CommandPaletteCommand[] = [
  {
    id: "help",
    label: "help",
    category: "amp",
    description: "Show help",
    shortcut: "?",
    action: () => {},
    enabled: true,
    priority: 100,
  },
  {
    id: "mode-smart",
    label: "use smart",
    category: "mode",
    description: "Switch to smart mode",
    action: () => {},
    enabled: true,
    priority: 90,
  },
  {
    id: "mode-fast",
    label: "use fast",
    category: "mode",
    description: "Switch to fast mode (rush)",
    action: () => {},
    enabled: true,
    priority: 90,
  },
  {
    id: "mode-deep",
    label: "use deep",
    category: "mode",
    description: "Enable deep reasoning",
    action: () => {},
    enabled: true,
    priority: 90,
  },
  {
    id: "mode-large",
    label: "use large",
    category: "mode",
    description: "Use large context model",
    action: () => {},
    enabled: true,
    priority: 90,
  },
  {
    id: "mode-toggle",
    label: "toggle",
    category: "mode",
    description: "Toggle current mode",
    shortcut: "Ctrl+S",
    action: () => {},
    enabled: true,
    priority: 85,
  },
  {
    id: "thread-new",
    label: "new",
    category: "thread",
    description: "Start new thread",
    action: () => {},
    enabled: true,
    priority: 80,
  },
  {
    id: "thread-switch",
    label: "switch",
    category: "thread",
    description: "Switch thread",
    action: () => {},
    enabled: true,
    priority: 80,
  },
  {
    id: "prompt-editor",
    label: "open in editor",
    category: "prompt",
    description: "Edit in $EDITOR",
    shortcut: "Ctrl+G",
    action: () => {},
    enabled: true,
    priority: 70,
  },
  {
    id: "prompt-paste-image",
    label: "paste image from clipboard",
    category: "prompt",
    description: "Paste image",
    shortcut: "Ctrl+V",
    action: () => {},
    enabled: true,
    priority: 70,
  },
  {
    id: "context-analyze",
    label: "analyze",
    category: "context",
    description: "Analyze context usage",
    action: () => {},
    enabled: true,
    priority: 60,
  },
  {
    id: "thread-map",
    label: "map",
    category: "thread",
    description: "Show thread map",
    action: () => {},
    enabled: true,
    priority: 60,
  },
];

// ════════════════════════════════════════════════════
//  FlitterCommandPaletteProvider
// ════════════════════════════════════════════════════

/**
 * 命令面板提供者 — 管理应用级命令注册表。
 *
 * 逆向: amp 的命令注册使用 Map<string, Command> (e0R.commands, modules/2785_unknown_e0R.js:2094)。
 * register() 将命令存入 Map，getAll() 返回按 priority 降序排列的列表。
 *
 * amp 中命令面板通过 d1T toggle 控制器 (chunk-004.js:6831) 切换显示:
 *   - toggle() 翻转 _value, 触发 setState
 *   - isEnabled() / isDisabled() 检查状态
 *   - disable 箭头函数用作 onDismiss 回调
 */
export class FlitterCommandPaletteProvider {
  /** @internal 命令注册表 (id -> command) */
  private _commands: Map<string, CommandPaletteCommand>;

  /**
   * 创建 FlitterCommandPaletteProvider。
   *
   * 用默认命令列表初始化注册表。
   */
  constructor() {
    this._commands = new Map();
    for (const cmd of FLITTER_COMMANDS) {
      this._commands.set(cmd.id, cmd);
    }
  }

  /**
   * 获取所有已注册的命令，按 priority 降序排列。
   *
   * 仅返回 enabled !== false 的命令。
   *
   * @returns 命令列表 (按 priority 降序)
   */
  getCommands(): CommandPaletteCommand[] {
    const commands: CommandPaletteCommand[] = [];
    for (const cmd of this._commands.values()) {
      if (cmd.enabled !== false) {
        commands.push(cmd);
      }
    }
    commands.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
    return commands;
  }

  /**
   * 注册一个命令。
   *
   * 如果 id 已存在，覆盖旧命令。
   *
   * @param cmd - 要注册的命令
   */
  registerCommand(cmd: CommandPaletteCommand): void {
    this._commands.set(cmd.id, cmd);
  }

  /**
   * 注销一个命令。
   *
   * @param id - 要移除的命令 id
   * @returns 成功移除返回 true，不存在返回 false
   */
  unregisterCommand(id: string): boolean {
    return this._commands.delete(id);
  }

  /**
   * 按 id 查找并执行命令。
   *
   * @param id - 命令 id
   * @returns 成功执行返回 true，命令不存在或 disabled 返回 false
   */
  executeCommand(id: string): boolean {
    const cmd = this._commands.get(id);
    if (!cmd || cmd.enabled === false) {
      return false;
    }
    cmd.action();
    return true;
  }

  /**
   * 按 id 获取命令。
   *
   * @param id - 命令 id
   * @returns 命令对象，不存在返回 undefined
   */
  getCommand(id: string): CommandPaletteCommand | undefined {
    return this._commands.get(id);
  }

  /**
   * 获取注册的命令数量。
   *
   * @returns 命令总数
   */
  get commandCount(): number {
    return this._commands.size;
  }
}
