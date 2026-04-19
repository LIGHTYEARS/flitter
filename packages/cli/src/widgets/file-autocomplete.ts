/**
 * FileAutocomplete — 文件路径自动补全控制器。
 *
 * 当用户在输入框中键入 "@" 时，触发文件路径自动补全。
 * 列出当前工作目录下的文件，支持模糊搜索。
 * 选中后将文件路径插入输入框。
 *
 * 逆向参考:
 * - "@" 触发: amp 输入框中 "@" 触发文件补全, "@@" 触发线程提及
 *   (快捷键帮助: "@ / @@ mention files/threads", data_structures.js:189-196)
 * - 补全控制器: uZT 类 (micromark-parser.js:11486-11640) — "@" 触发器
 * - 文件选择后插入路径到输入文本
 *
 * @module file-autocomplete
 *
 * @example
 * ```ts
 * const fileAc = new FileAutocomplete({
 *   textController: inputController,
 *   cwd: process.cwd(),
 * });
 * // 用户键入 "@" → 文件列表弹出
 * // 选择文件 → 路径插入输入框
 * fileAc.dispose();
 * ```
 */

import {
  AutocompleteController,
  type AutocompleteOption,
  type TextEditingController,
} from "@flitter/tui";
import { readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

// ════════════════════════════════════════════════════
//  @-mention detection (standalone utility)
// ════════════════════════════════════════════════════

/**
 * Parsed @-mention in text.
 */
export interface AtMention {
  /** Index of the @ character in the text */
  triggerIndex: number;
  /** Text typed after @ (the fuzzy search query) */
  query: string;
}

/**
 * Detect an active @-mention at the cursor position.
 * Returns null if the cursor is not inside an @-mention.
 *
 * An @-mention is triggered when:
 * 1. There's an @ preceded by a space or at position 0
 * 2. The cursor is between the @ and the next space (or end of text)
 *
 * 逆向: ef class trigger in PZT (1472_tui_components/actions_intents.js)
 */
export function detectAtMention(text: string, cursorPosition: number): AtMention | null {
  const beforeCursor = text.slice(0, cursorPosition);

  let atIndex = -1;
  for (let i = beforeCursor.length - 1; i >= 0; i--) {
    if (beforeCursor[i] === "@") {
      if (i === 0 || beforeCursor[i - 1] === " " || beforeCursor[i - 1] === "\n") {
        atIndex = i;
        break;
      }
      return null;
    }
    if (beforeCursor[i] === " " || beforeCursor[i] === "\n") {
      break;
    }
  }

  if (atIndex === -1) return null;

  const query = beforeCursor.slice(atIndex + 1);
  if (query.includes(" ")) return null;

  return { triggerIndex: atIndex, query };
}

// ════════════════════════════════════════════════════
//  FileAutocompleteConfig
// ════════════════════════════════════════════════════

/**
 * FileAutocomplete 配置。
 */
export interface FileAutocompleteConfig {
  /** 绑定的文本编辑控制器 */
  textController: TextEditingController;
  /** 当前工作目录 (用于文件列表) */
  cwd?: string;
  /** 最大结果数，默认 20 */
  maxResults?: number;
}

// ════════════════════════════════════════════════════
//  FileAutocomplete
// ════════════════════════════════════════════════════

/**
 * 文件路径自动补全控制器。
 *
 * 以 "@" 作为触发字符。触发后读取 cwd 下的文件列表,
 * 按输入文本模糊过滤。选中后将文件路径替换触发区域文本。
 *
 * 逆向: amp 的 "@" 文件提及机制 — 在输入中键入 @filename,
 * 补全面板显示匹配文件, 选中后插入完整路径。
 */
export class FileAutocomplete {
  /** @internal 自动补全控制器 */
  private _autocomplete: AutocompleteController;

  /** @internal 文本编辑控制器 */
  private _textController: TextEditingController;

  /** @internal 当前工作目录 */
  private _cwd: string;

  /** @internal 最大结果数 */
  private _maxResults: number;

  /** @internal 是否已释放 */
  private _disposed: boolean = false;

  /** @internal 文件列表缓存 (避免频繁 readdir) */
  private _cachedFiles: string[] | null = null;

  /** @internal 缓存时间戳 */
  private _cacheTimestamp: number = 0;

  /** 缓存有效期 (5 秒) */
  private static readonly CACHE_TTL_MS = 5000;

  /**
   * 创建文件路径自动补全控制器。
   *
   * @param config - 配置选项
   */
  constructor(config: FileAutocompleteConfig) {
    this._textController = config.textController;
    this._cwd = config.cwd ?? process.cwd();
    this._maxResults = config.maxResults ?? 20;
    this._autocomplete = new AutocompleteController();

    this._autocomplete.initialize({
      textController: this._textController,
      triggers: [{ char: "@", minLength: 0 }],
      optionsBuilder: (query) => this._buildOptions(query),
      onSelected: (option) => this._onFileSelected(option),
      debounceMs: 100,
    });
  }

  /**
   * 获取自动补全控制器。
   */
  get autocompleteController(): AutocompleteController {
    return this._autocomplete;
  }

  /**
   * 当前是否处于激活状态。
   */
  get isActive(): boolean {
    return this._autocomplete.isActive;
  }

  /**
   * 关闭补全面板。
   */
  dismiss(): void {
    this._autocomplete.dismiss();
  }

  /**
   * 释放资源。
   */
  dispose(): void {
    if (this._disposed) return;
    this._disposed = true;
    this._autocomplete.dispose();
  }

  // ════════════════════════════════════════════════════
  //  内部方法
  // ════════════════════════════════════════════════════

  /**
   * @internal 获取文件列表 (带缓存)。
   */
  private _getFileList(): string[] {
    const now = Date.now();
    if (this._cachedFiles && now - this._cacheTimestamp < FileAutocomplete.CACHE_TTL_MS) {
      return this._cachedFiles;
    }

    try {
      const entries = readdirSync(this._cwd, { withFileTypes: true });
      const files: string[] = [];
      for (const entry of entries) {
        // 跳过隐藏文件和 node_modules
        if (entry.name.startsWith(".") || entry.name === "node_modules") continue;
        if (entry.isDirectory()) {
          files.push(entry.name + "/");
        } else {
          files.push(entry.name);
        }
      }
      files.sort();
      this._cachedFiles = files;
      this._cacheTimestamp = now;
      return files;
    } catch {
      return [];
    }
  }

  /**
   * @internal 根据查询文本构建文件选项列表。
   */
  private _buildOptions(query: string): AutocompleteOption[] {
    const files = this._getFileList();
    const q = query.toLowerCase();
    const matches = files
      .filter((f) => !q || f.toLowerCase().includes(q))
      .slice(0, this._maxResults);

    return matches.map((f) => ({
      label: f,
      value: f,
      description: f.endsWith("/") ? "directory" : "file",
    }));
  }

  /**
   * @internal 文件选中回调 — 将路径插入输入框。
   *
   * 将触发器 "@" 及之后的查询文本替换为 "@filepath "。
   */
  private _onFileSelected(option: AutocompleteOption): void {
    const state = this._autocomplete.currentState;
    if (!state.trigger) return;

    const text = this._textController.text;
    const triggerStart = state.trigger.start;
    const triggerEnd = triggerStart + 1 + state.trigger.query.length; // "@" + query

    // 替换 @query 为 @filepath (带尾部空格)
    const before = text.slice(0, triggerStart);
    const after = text.slice(triggerEnd);
    const replacement = `@${option.value} `;
    const newText = before + replacement + after;

    this._textController.text = newText;
    this._textController.cursorPosition = (before + replacement).length;
  }
}
