/**
 * 命中测试 — HitTestEntry + HitTestResult。
 *
 * 提供鼠标事件的递归命中检测能力。{@link HitTestResult} 累积命中条目，
 * 静态工厂 {@link HitTestResult.hitTest} 从根节点开始递归测试。
 *
 * 逆向参考:
 * - `oXT` (tui-widget-framework.js:1852-1856) — HitTestEntry 静态工厂
 * - `nXT` (tui-widget-framework.js:1858-1877) — HitTestResult 累积器
 *
 * @example
 * ```ts
 * import { HitTestResult } from "@flitter/tui";
 *
 * const result = HitTestResult.hitTest(rootRenderObject, { x: 10, y: 5 });
 * for (const entry of result.hits) {
 *   console.log(entry.target, entry.localPosition);
 * }
 * ```
 *
 * @module
 */

import type { RenderObject } from "../tree/render-object.js";

/**
 * 命中测试条目。
 *
 * 记录被命中的渲染对象及命中点在该对象局部坐标系中的位置。
 */
export interface HitTestEntry {
  /** 被命中的渲染对象 */
  target: RenderObject;
  /** 命中点在目标对象局部坐标系中的位置 */
  localPosition: { x: number; y: number };
}

/**
 * HitTestResult — 命中测试结果累积器。
 *
 * 维护命中条目列表，支持按偏移量计算局部坐标。
 * 通过静态方法 {@link HitTestResult.hitTest} 从根节点启动递归命中测试。
 *
 * 逆向: nXT in tui-widget-framework.js:1858-1877
 */
export class HitTestResult {
  private _hits: HitTestEntry[] = [];

  /**
   * 获取命中条目只读列表。
   *
   * @returns 命中条目数组的只读视图
   */
  get hits(): readonly HitTestEntry[] {
    return this._hits;
  }

  /**
   * 添加命中条目。
   *
   * @param entry - 命中条目
   */
  add(entry: HitTestEntry): void {
    this._hits.push(entry);
  }

  /**
   * 按绘制偏移量计算局部坐标后添加命中条目。
   *
   * localPosition = position - offset
   *
   * @param target - 被命中的渲染对象
   * @param offset - 绘制偏移量
   * @param position - 全局命中位置
   */
  addWithPaintOffset(
    target: RenderObject,
    offset: { x: number; y: number },
    position: { x: number; y: number },
  ): void {
    const localPosition = {
      x: position.x - offset.x,
      y: position.y - offset.y,
    };
    this.add({ target, localPosition });
  }

  /**
   * 静态工厂: 创建 HitTestResult 并从 root 开始命中测试。
   *
   * 逆向: oXT.hitTest in tui-widget-framework.js:1852-1856
   *
   * @param root - 渲染树根节点
   * @param position - 测试点的全局坐标
   * @returns 包含所有命中条目的 HitTestResult
   *
   * @example
   * ```ts
   * const result = HitTestResult.hitTest(rootRenderObject, { x: 10, y: 5 });
   * console.log(result.hits.length); // 命中的节点数
   * ```
   */
  static hitTest(
    root: RenderObject,
    position: { x: number; y: number },
  ): HitTestResult {
    const result = new HitTestResult();
    root.hitTest(result, position);
    return result;
  }
}
