/**
 * ListView —— 懒加载虚拟化列表 Widget。
 *
 * {@link ListView} 是 TUI 框架中最重要的列表展示组件。
 * 支持 builder 模式懒加载子项和视口裁剪，只构建视口内 + 缓冲区的子项，
 * 即使 itemCount=100000 也不会一次构建全部 Widget。
 *
 * 适用场景：对话消息列表、文件列表、命令输出等需要高性能虚拟化列表的场景。
 *
 * 对应逆向工程中 widget-property-system.js 的列表构建相关逻辑。
 *
 * @module
 */

import { ScrollController } from "./scroll-controller.js";

// ════════════════════════════════════════════════════
//  类型定义
// ════════════════════════════════════════════════════

/**
 * ListView 构造选项。
 *
 * @example
 * ```ts
 * const props: ListViewProps = {
 *   itemCount: 100,
 *   itemBuilder: (i) => ({ type: "text", content: `Item ${i}` }),
 *   itemExtent: 1,
 *   cacheExtent: 5,
 * };
 * ```
 */
export interface ListViewProps {
  /** 列表项总数 */
  itemCount: number;

  /** 按需构建列表项的回调函数，只在项进入视口+缓冲区时调用 */
  itemBuilder: (index: number) => unknown;

  /** 固定行高（可选，不提供则需要通过 itemHeightProvider 按需查询） */
  itemExtent?: number;

  /** 外部提供的滚动控制器（可选，不提供时自动创建并管理） */
  controller?: ScrollController;

  /** 视口外缓冲行数，默认 5 */
  cacheExtent?: number;
}

/**
 * 可见范围信息。
 */
export interface VisibleRange {
  /** 第一个可见项的 index */
  first: number;
  /** 最后一个可见项的 index */
  last: number;
}

// ════════════════════════════════════════════════════
//  ListView Widget
// ════════════════════════════════════════════════════

/**
 * 懒加载虚拟化列表 Widget。
 *
 * 核心特性：
 * - builder 模式：只在子项进入视口+缓冲区时调用 itemBuilder
 * - 视口裁剪：即使有 100000 个子项也只渲染可见范围
 * - 固定行高模式：通过 itemExtent 快速计算可见范围（O(1)）
 * - 可变行高模式：通过 itemHeightProvider 逐项计算（O(n)）
 * - ScrollController 集成：自动计算并同步 maxScrollExtent
 * - 越界保护：所有 index 通过 Math.max/Math.min clamp 到 [0, itemCount-1]
 *
 * @example
 * ```ts
 * // 固定行高模式
 * const listView = new ListView({
 *   itemCount: 1000,
 *   itemBuilder: (i) => ({ type: "text", content: `Line ${i}` }),
 *   itemExtent: 1,
 *   cacheExtent: 5,
 * });
 * listView.performLayout(20, 80); // viewport=20行, width=80列
 *
 * // 可变行高模式
 * const listView2 = new ListView({
 *   itemCount: 50,
 *   itemBuilder: (i) => ({ type: "block", index: i }),
 * });
 * listView2.setItemHeightProvider((i) => i % 2 === 0 ? 1 : 3);
 * listView2.performLayout(20, 80);
 * ```
 */
export class ListView {
  // ════════════════════════════════════════════════════
  //  私有字段
  // ════════════════════════════════════════════════════

  /** 列表项总数 */
  private _itemCount: number;

  /** 按需构建列表项的回调 */
  private _itemBuilder: (index: number) => unknown;

  /** 固定行高（undefined 时为可变行高模式） */
  private _itemExtent: number | undefined;

  /** 滚动控制器 */
  private _controller: ScrollController;

  /** 是否自管理 controller（自动创建时为 true） */
  private _ownsController: boolean;

  /** 视口外缓冲项数 */
  private _cacheExtent: number;

  /** 可变行高查询函数（可选） */
  private _itemHeightProvider: ((index: number) => number) | undefined;

  /** 最近一次 layout 后的第一个可见项 index */
  private _firstVisibleIndex: number = 0;

  /** 最近一次 layout 后的最后一个可见项 index */
  private _lastVisibleIndex: number = -1;

  /** 最近一次 layout 产出的子项列表 */
  private _builtItems: unknown[] = [];

  // ════════════════════════════════════════════════════
  //  构造函数
  // ════════════════════════════════════════════════════

  /**
   * 创建 ListView 实例。
   *
   * @param props - 构造选项
   */
  constructor(props: ListViewProps) {
    this._itemCount = props.itemCount;
    this._itemBuilder = props.itemBuilder;
    this._itemExtent = props.itemExtent;
    this._cacheExtent = props.cacheExtent ?? 5;

    if (props.controller) {
      this._controller = props.controller;
      this._ownsController = false;
    } else {
      this._controller = new ScrollController();
      this._controller.disableFollowMode();
      this._ownsController = true;
    }
  }

  // ════════════════════════════════════════════════════
  //  属性访问器
  // ════════════════════════════════════════════════════

  /**
   * 获取关联的滚动控制器。
   *
   * @returns ScrollController 实例
   */
  get controller(): ScrollController {
    return this._controller;
  }

  /**
   * 获取列表项总数。
   *
   * @returns itemCount
   */
  get itemCount(): number {
    return this._itemCount;
  }

  /**
   * 获取最近一次 layout 产出的子项列表。
   *
   * @returns 已构建的子项数组
   */
  get builtItems(): readonly unknown[] {
    return this._builtItems;
  }

  // ════════════════════════════════════════════════════
  //  可变行高支持
  // ════════════════════════════════════════════════════

  /**
   * 设置可变行高查询函数。
   *
   * 当不提供 itemExtent 时，ListView 使用此函数查询每项高度。
   *
   * @param provider - 根据 index 返回该项高度的函数
   */
  setItemHeightProvider(provider: (index: number) => number): void {
    this._itemHeightProvider = provider;
  }

  // ════════════════════════════════════════════════════
  //  布局
  // ════════════════════════════════════════════════════

  /**
   * 执行布局计算。
   *
   * 计算可见范围，只对视口+缓冲区内的子项调用 itemBuilder，
   * 并更新 controller 的 maxScrollExtent。
   *
   * @param viewportHeight - 视口高度（行数）
   * @param viewportWidth - 视口宽度（列数）
   */
  performLayout(viewportHeight: number, _viewportWidth: number): void {
    // 空列表快速路径
    if (this._itemCount === 0) {
      this._controller.updateMaxScrollExtent(0);
      this._builtItems = [];
      this._firstVisibleIndex = 0;
      this._lastVisibleIndex = -1;
      return;
    }

    const offset = this._controller.offset;

    if (this._itemExtent !== undefined) {
      // ────────────────────────────
      //  固定行高模式 (O(1))
      // ────────────────────────────
      this._layoutFixedExtent(offset, viewportHeight);
    } else {
      // ────────────────────────────
      //  可变行高模式 (O(n))
      // ────────────────────────────
      this._layoutVariableExtent(offset, viewportHeight);
    }
  }

  /**
   * 固定行高布局。
   *
   * 通过简单算术计算可见范围，时间复杂度 O(1)。
   *
   * @param offset - 当前滚动偏移量
   * @param viewportHeight - 视口高度
   */
  private _layoutFixedExtent(offset: number, viewportHeight: number): void {
    const itemExtent = this._itemExtent!;
    const totalHeight = this._itemCount * itemExtent;
    const maxScrollExtent = Math.max(0, totalHeight - viewportHeight);

    // 更新 controller 的 maxScrollExtent
    this._controller.updateMaxScrollExtent(maxScrollExtent);

    // 计算可见范围
    const firstVisible = Math.floor(offset / itemExtent);
    const lastVisible = Math.min(
      this._itemCount - 1,
      Math.ceil((offset + viewportHeight) / itemExtent) - 1,
    );

    // 扩展缓冲区，clamp 到 [0, itemCount-1] (T-06-04 越界保护)
    const firstWithCache = Math.max(0, firstVisible - this._cacheExtent);
    const lastWithCache = Math.min(this._itemCount - 1, lastVisible + this._cacheExtent);

    // 记录纯可见范围（不含 cache）
    this._firstVisibleIndex = Math.max(0, firstVisible);
    this._lastVisibleIndex = Math.min(this._itemCount - 1, lastVisible);

    // 只构建视口+缓冲区内的子项 (T-06-03 懒加载)
    this._builtItems = [];
    for (let i = firstWithCache; i <= lastWithCache; i++) {
      this._builtItems.push(this._itemBuilder(i));
    }
  }

  /**
   * 可变行高布局。
   *
   * 遍历所有 item 计算累积高度，确定可见范围。
   * 需要通过 setItemHeightProvider 提供高度查询函数。
   *
   * @param offset - 当前滚动偏移量
   * @param viewportHeight - 视口高度
   */
  private _layoutVariableExtent(offset: number, viewportHeight: number): void {
    const heightProvider = this._itemHeightProvider;

    // 计算所有项的累积偏移和总高度
    let totalHeight = 0;
    const itemOffsets: number[] = [];

    for (let i = 0; i < this._itemCount; i++) {
      itemOffsets.push(totalHeight);
      const h = heightProvider ? heightProvider(i) : 1;
      totalHeight += h;
    }

    const maxScrollExtent = Math.max(0, totalHeight - viewportHeight);
    this._controller.updateMaxScrollExtent(maxScrollExtent);

    // 二分搜索确定第一个可见项
    const firstVisible = this._binarySearchFirstVisible(itemOffsets, offset);

    // 确定最后一个可见项
    let lastVisible = firstVisible;
    const endOffset = offset + viewportHeight;
    for (let i = firstVisible; i < this._itemCount; i++) {
      if (itemOffsets[i]! >= endOffset) break;
      lastVisible = i;
    }

    // 扩展缓冲区，clamp 到 [0, itemCount-1]
    const firstWithCache = Math.max(0, firstVisible - this._cacheExtent);
    const lastWithCache = Math.min(this._itemCount - 1, lastVisible + this._cacheExtent);

    this._firstVisibleIndex = Math.max(0, firstVisible);
    this._lastVisibleIndex = Math.min(this._itemCount - 1, lastVisible);

    // 构建可见+缓冲区的子项
    this._builtItems = [];
    for (let i = firstWithCache; i <= lastWithCache; i++) {
      this._builtItems.push(this._itemBuilder(i));
    }
  }

  /**
   * 二分搜索：找到第一个 offset >= targetOffset 的项 index。
   *
   * @param itemOffsets - 每项的累积偏移量数组
   * @param targetOffset - 目标偏移量
   * @returns 第一个可见项的 index
   */
  private _binarySearchFirstVisible(itemOffsets: number[], targetOffset: number): number {
    let low = 0;
    let high = itemOffsets.length - 1;

    while (low < high) {
      const mid = (low + high) >>> 1;
      if (itemOffsets[mid]! < targetOffset) {
        low = mid + 1;
      } else {
        high = mid;
      }
    }

    // 如果所有项偏移都小于 targetOffset，回退到最后一项
    if (low < itemOffsets.length && itemOffsets[low]! > targetOffset && low > 0) {
      low--;
    }

    return Math.max(0, Math.min(low, itemOffsets.length - 1));
  }

  // ════════════════════════════════════════════════════
  //  查询 API
  // ════════════════════════════════════════════════════

  /**
   * 获取最近一次 layout 后的可见范围。
   *
   * @returns 可见范围 { first, last }
   */
  getVisibleRange(): VisibleRange {
    return {
      first: this._firstVisibleIndex,
      last: this._lastVisibleIndex,
    };
  }

  // ════════════════════════════════════════════════════
  //  生命周期
  // ════════════════════════════════════════════════════

  /**
   * 释放资源。
   *
   * 如果 controller 是自管理的（未外部提供），则一并释放 controller。
   * 外部提供的 controller 不会被释放。
   */
  dispose(): void {
    if (this._ownsController) {
      this._controller.dispose();
    }
    this._builtItems = [];
    this._itemHeightProvider = undefined;
  }
}
