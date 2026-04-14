/**
 * AutocompleteController — 自动补全状态管理。
 *
 * 监听 {@link TextEditingController} 的文本变更，
 * 根据触发器字符和查询文本异步获取选项列表，
 * 支持 debounce 限流和 generationId 竞态保护。
 *
 * 还原自逆向工程代码中的 uZT 类 (micromark-parser.js:11486-11640)。
 *
 * @module autocomplete-controller
 *
 * @example
 * ```ts
 * const ac = new AutocompleteController();
 * ac.initialize({
 *   textController: ctrl,
 *   triggers: [{ char: "/", minLength: 0 }],
 *   optionsBuilder: (query) => filterCommands(query),
 *   onSelected: (opt) => executeCommand(opt.value),
 * });
 * ```
 */

import type { TextEditingController } from "../editing/text-editing-controller.js";

/**
 * 自动补全触发器配置。
 *
 * 定义触发字符和最小查询长度。
 */
export interface AutocompleteTrigger {
  /** 触发字符 (如 "/", "@") */
  char: string;
  /** 最小查询长度才开始搜索，默认 0 */
  minLength?: number;
}

/**
 * 自动补全选项。
 */
export interface AutocompleteOption {
  /** 显示文本 */
  label: string;
  /** 选中后的值 */
  value: string;
  /** 描述文字 */
  description?: string;
}

/**
 * 自动补全状态。
 */
export interface AutocompleteState {
  /** 当前触发信息 (触发字符位置 + 查询文本) */
  trigger: { query: string; start: number; triggerChar: string } | null;
  /** 匹配的选项列表 */
  options: AutocompleteOption[];
  /** 当前选中索引 (-1 表示无选中) */
  selectedIndex: number;
  /** 是否处于激活状态 */
  isActive: boolean;
  /** 异步请求 generation 标识，用于竞态保护 */
  generationId: number;
}

/**
 * AutocompleteController 初始化选项。
 */
export interface AutocompleteInitOptions {
  /** 绑定的文本编辑控制器 */
  textController: TextEditingController;
  /** 触发器配置列表 */
  triggers: AutocompleteTrigger[];
  /** 选项构建函数 (同步或异步) */
  optionsBuilder: (query: string) => AutocompleteOption[] | Promise<AutocompleteOption[]>;
  /** 选中回调 */
  onSelected: (option: AutocompleteOption) => void;
  /** debounce 间隔 (毫秒)，默认 100 */
  debounceMs?: number;
}

/**
 * 自动补全控制器。
 *
 * 监听 TextEditingController 的文本变更，检测触发字符，
 * 通过 debounce 异步调用 optionsBuilder，管理选项列表和选中状态。
 * generationId 机制确保旧的异步结果不会覆盖新的。
 *
 * 还原自逆向代码 uZT 类:
 * - _state: BehaviorSubject 风格状态
 * - _handleTextChange: 文本变更处理
 * - _buildOptions: 异步构建选项 + generationId 保护
 * - _scheduleDebouncedBuild: debounce 调度
 */
export class AutocompleteController {
  /** @internal 当前状态 */
  private _state: AutocompleteState;

  /** @internal 绑定的文本编辑控制器 */
  private _textController: TextEditingController | null = null;

  /** @internal 上次文本快照 */
  private _lastText: string = "";

  /** @internal 触发器列表 */
  private _triggers: AutocompleteTrigger[] = [];

  /** @internal 选项构建函数 */
  private _optionsBuilder:
    | ((query: string) => AutocompleteOption[] | Promise<AutocompleteOption[]>)
    | null = null;

  /** @internal 选中回调 */
  private _onSelected: ((option: AutocompleteOption) => void) | null = null;

  /** @internal 状态变更监听器 */
  private _listeners: Set<(state: AutocompleteState) => void> = new Set();

  /** @internal debounce 定时器 */
  private _debounceTimer: ReturnType<typeof setTimeout> | null = null;

  /** @internal debounce 间隔 */
  private _debounceMs: number = 100;

  /** @internal 异步请求 generation 计数器 */
  private _generationId: number = 0;

  /** @internal 是否已释放 */
  private _disposed: boolean = false;

  /**
   * 创建 AutocompleteController。
   *
   * 初始状态: isActive=false, options=[], selectedIndex=-1
   */
  constructor() {
    this._state = {
      trigger: null,
      options: [],
      selectedIndex: -1,
      isActive: false,
      generationId: 0,
    };
  }

  /**
   * 获取当前状态的只读引用。
   *
   * @returns 当前 {@link AutocompleteState}
   */
  get currentState(): Readonly<AutocompleteState> {
    return this._state;
  }

  /**
   * 是否处于激活状态。
   *
   * @returns 激活时返回 true
   */
  get isActive(): boolean {
    return this._state.isActive;
  }

  /**
   * 初始化控制器。
   *
   * 绑定 textController、触发器、optionsBuilder 和回调。
   * 初始化后开始监听文本变更。
   *
   * @param options - 初始化选项
   * @throws 已 dispose 后调用则抛出错误
   */
  initialize(options: AutocompleteInitOptions): void {
    if (this._disposed) {
      throw new Error("Cannot initialize disposed AutocompleteController");
    }

    this._cleanup();
    this._textController = options.textController;
    this._lastText = options.textController.text;
    this._triggers = options.triggers;
    this._optionsBuilder = options.optionsBuilder;
    this._onSelected = options.onSelected ?? null;
    this._debounceMs = options.debounceMs ?? 100;

    this._textController.addListener(this._handleTextChange);
  }

  /**
   * 选中下一个选项。
   *
   * 循环递增 selectedIndex。非激活或无选项时忽略。
   */
  selectNext(): void {
    const state = this._state;
    if (!state.isActive || state.options.length === 0) return;

    const next = state.selectedIndex < state.options.length - 1 ? state.selectedIndex + 1 : 0;
    this._updateState({ selectedIndex: next });
  }

  /**
   * 选中上一个选项。
   *
   * 循环递减 selectedIndex。非激活或无选项时忽略。
   */
  selectPrevious(): void {
    const state = this._state;
    if (!state.isActive || state.options.length === 0) return;

    const prev = state.selectedIndex > 0 ? state.selectedIndex - 1 : state.options.length - 1;
    this._updateState({ selectedIndex: prev });
  }

  /**
   * 确认选中当前选项。
   *
   * 调用 onSelected 回调并 dismiss。
   * 非激活或无有效选中时忽略。
   */
  acceptSelected(): void {
    const state = this._state;
    if (!state.isActive || state.selectedIndex < 0 || state.selectedIndex >= state.options.length)
      return;

    const option = state.options[state.selectedIndex];
    if (!option) return;

    this.dismiss();
    if (this._onSelected) {
      this._onSelected(option);
    }
  }

  /**
   * 关闭补全面板。
   *
   * 清除 debounce 定时器，重置状态为非激活。
   */
  dismiss(): void {
    this._clearDebounceTimer();
    this._updateState({
      trigger: null,
      options: [],
      selectedIndex: -1,
      isActive: false,
    });
  }

  /**
   * 注册状态变更监听器。
   *
   * @param fn - 监听回调
   */
  addListener(fn: (state: AutocompleteState) => void): void {
    this._listeners.add(fn);
  }

  /**
   * 移除状态变更监听器。
   *
   * @param fn - 要移除的回调
   */
  removeListener(fn: (state: AutocompleteState) => void): void {
    this._listeners.delete(fn);
  }

  /**
   * 释放控制器资源。
   *
   * 清理 textController listener 和 debounce timer。
   * dispose 后不可再 initialize。
   */
  dispose(): void {
    this._disposed = true;
    this._cleanup();
  }

  // ════════════════════════════════════════════════════
  //  内部方法
  // ════════════════════════════════════════════════════

  /**
   * @internal 文本变更处理函数 (arrow function 保持 this 绑定)。
   *
   * 1. 检查光标前是否有触发字符
   * 2. 提取 query = 触发字符到光标之间的文本
   * 3. debounce 后调用 optionsBuilder(query)
   * 4. 更新 state, 通知 listeners
   */
  private _handleTextChange = (): void => {
    if (!this._textController || !this._optionsBuilder) return;

    const text = this._textController.text;
    const textChanged = text !== this._lastText;
    this._lastText = text;

    if (!textChanged && !this._state.isActive) return;

    const cursorPos = this._textController.cursorPosition;

    // 检测触发器
    const detected = this._detectTrigger(text, cursorPos);

    if (!detected) {
      if (this._state.isActive) {
        this.dismiss();
      } else {
        this._clearDebounceTimer();
      }
      return;
    }

    // 增加 generationId
    const genId = this._state.generationId + 1;

    // 判断是否需要 debounce
    const shouldDebounce = textChanged && this._debounceMs > 0;

    this._updateState({
      trigger: detected,
      generationId: genId,
      selectedIndex: -1,
    });

    if (shouldDebounce) {
      this._scheduleDebouncedBuild(detected.query, genId);
      return;
    }

    this._clearDebounceTimer();
    this._buildOptions(detected.query, genId);
  };

  /**
   * @internal 检测触发器。
   *
   * 在文本中查找光标前最近的触发字符，提取 query 文本。
   */
  private _detectTrigger(
    text: string,
    cursorPos: number,
  ): { query: string; start: number; triggerChar: string } | null {
    // 将文本转为字符数组以支持 grapheme 处理
    const chars = [...text];
    // cursorPos 是 grapheme index, 但 TextEditingController.text 返回原始字符串
    // 这里简化处理: 在字符串中从光标位置向前搜索触发字符
    const textBeforeCursor = chars.slice(0, cursorPos).join("");

    let bestMatch: { query: string; start: number; triggerChar: string } | null = null;

    for (const trigger of this._triggers) {
      const lastTriggerIdx = textBeforeCursor.lastIndexOf(trigger.char);
      if (lastTriggerIdx === -1) continue;

      // 确保触发字符到光标之间没有空白字符 (行为简化)
      const query = textBeforeCursor.slice(lastTriggerIdx + trigger.char.length);
      if (query.includes(" ") || query.includes("\n") || query.includes("\t")) continue;

      const minLen = trigger.minLength ?? 0;
      if (query.length < minLen) continue;

      // 选择最近的（start 值最大的）触发器
      if (!bestMatch || lastTriggerIdx > bestMatch.start) {
        bestMatch = { query, start: lastTriggerIdx, triggerChar: trigger.char };
      }
    }

    return bestMatch;
  }

  /**
   * @internal 异步构建选项列表。
   *
   * 调用 optionsBuilder 后检查 generationId 是否匹配，
   * 不匹配则丢弃结果（竞态保护）。
   */
  private async _buildOptions(query: string, genId: number): Promise<void> {
    if (!this._optionsBuilder) return;

    try {
      const options = await this._optionsBuilder(query);

      // generationId 竞态保护
      if (this._state.generationId === genId && !this._disposed) {
        this._updateState({
          options,
          selectedIndex: options.length > 0 ? 0 : -1,
          isActive: options.length > 0,
        });
      }
    } catch (err) {
      console.error("Error building autocomplete options:", err);
      if (this._state.generationId === genId && !this._disposed) {
        this._updateState({
          options: [],
          selectedIndex: -1,
          isActive: false,
        });
      }
    }
  }

  /**
   * @internal 调度 debounce 构建。
   */
  private _scheduleDebouncedBuild(query: string, genId: number): void {
    this._clearDebounceTimer();
    this._debounceTimer = setTimeout(() => {
      this._debounceTimer = null;
      this._buildOptions(query, genId);
    }, this._debounceMs);
  }

  /**
   * @internal 清除 debounce 定时器。
   */
  private _clearDebounceTimer(): void {
    if (this._debounceTimer) {
      clearTimeout(this._debounceTimer);
      this._debounceTimer = null;
    }
  }

  /**
   * @internal 更新状态并通知 listeners。
   */
  private _updateState(partial: Partial<AutocompleteState>): void {
    if (this._disposed) return;
    this._state = { ...this._state, ...partial };
    for (const fn of this._listeners) {
      try {
        fn(this._state);
      } catch (err) {
        console.error("Error in AutocompleteController listener:", err);
      }
    }
  }

  /**
   * @internal 清理资源。
   */
  private _cleanup(): void {
    this._clearDebounceTimer();
    if (this._textController) {
      this._textController.removeListener(this._handleTextChange);
    }
  }
}
