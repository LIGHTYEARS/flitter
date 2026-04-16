/**
 * 渲染对象元素基类。
 *
 * {@link RenderObjectElement} 继承 {@link Element}，负责创建和管理
 * 与之关联的 {@link RenderObject}，并在挂载/卸载时维护渲染树的父子关系。
 *
 * @module
 */

import type { Key, Widget } from "./element.js";
import { Element } from "./element.js";
import type { RenderObject } from "./render-object.js";

// ════════════════════════════════════════════════════
//  RenderObjectWidget 接口
// ════════════════════════════════════════════════════

/**
 * 可创建渲染对象的 Widget 接口。
 *
 * 继承 Widget 的基本能力，并扩展了 createRenderObject 和
 * updateRenderObject 方法以管理渲染对象的生命周期。
 */
export interface RenderObjectWidget {
  /** 可选标识键 */
  key: Key | undefined;
  /** 判断当前 Widget 是否能用 other 更新。 */
  canUpdate(other: Widget): boolean;
  /** 创建与此 Widget 关联的 Element。 */
  createElement(): Element;
  /** 创建与此 Widget 关联的渲染对象。 */
  createRenderObject(): RenderObject;
  /** 用当前 Widget 的配置更新已有的渲染对象。 */
  updateRenderObject(renderObject: RenderObject): void;
}

// ════════════════════════════════════════════════════
//  RenderObjectElement 抽象基类
// ════════════════════════════════════════════════════

/**
 * 渲染对象元素抽象基类。
 *
 * 在 {@link Element} 基础上管理一个关联的 {@link RenderObject}，
 * 并在挂载时将其插入渲染树、在卸载时从渲染树移除。
 */
export abstract class RenderObjectElement extends Element {
  /** 关联的渲染对象 */
  protected _renderObject: RenderObject | undefined = undefined;

  // ════════════════════════════════════════════════════
  //  属性访问器
  // ════════════════════════════════════════════════════

  /**
   * 获取关联的渲染对象。
   *
   * @returns 关联的渲染对象实例，未创建时返回 undefined
   */
  override get renderObject(): RenderObject | undefined {
    return this._renderObject;
  }

  // ════════════════════════════════════════════════════
  //  生命周期
  // ════════════════════════════════════════════════════

  /**
   * 挂载到元素树。
   *
   * 1. 调用父类 mount 设置父引用和挂载状态
   * 2. 通过 Widget 创建渲染对象
   * 3. 将渲染对象插入渲染树
   * 4. 清除脏标记
   *
   * @param parent - 父元素，根节点为 undefined
   */
  override mount(parent?: Element): void {
    super.mount(parent);
    this._renderObject = (this.widget as unknown as RenderObjectWidget).createRenderObject();
    // 逆向: amp RenderObjectElement.mount (chunk-005.js:164087)
    // amp calls _renderObject.attach() immediately after creation.
    // This sets _attached=true, enabling markNeedsLayout/markNeedsPaint
    // to propagate correctly during subsequent frames.
    this._renderObject.attach();
    this.insertRenderObjectChild();
    this._dirty = false;
  }

  /**
   * 用新 Widget 更新当前元素。
   *
   * 1. 调用父类 update 更新 Widget 引用
   * 2. 调用新 Widget 的 updateRenderObject 更新渲染对象
   * 3. 清除脏标记
   *
   * @param newWidget - 新的 Widget 实例
   */
  override update(newWidget: Widget): void {
    super.update(newWidget);
    (this.widget as unknown as RenderObjectWidget).updateRenderObject(this._renderObject!);
    this._dirty = false;
  }

  /**
   * 从元素树卸载。
   *
   * 1. 从渲染树中移除渲染对象
   * 2. 清除渲染对象引用
   * 3. 调用父类 unmount 完成卸载
   */
  override unmount(): void {
    this.removeRenderObjectChild();
    this._renderObject = undefined;
    super.unmount();
  }

  // ════════════════════════════════════════════════════
  //  渲染树桥接
  // ════════════════════════════════════════════════════

  /**
   * 将渲染对象插入到祖先的渲染对象中。
   *
   * 向上查找最近的 RenderObjectElement 祖先，
   * 将当前渲染对象作为其渲染对象的子节点。
   */
  insertRenderObjectChild(): void {
    const ancestor = this.findAncestorRenderObjectElement();
    if (
      ancestor !== null &&
      ancestor.renderObject !== undefined &&
      this._renderObject !== undefined
    ) {
      ancestor.renderObject.adoptChild(this._renderObject);
    }
  }

  /**
   * 从祖先的渲染对象中移除当前渲染对象。
   *
   * 向上查找最近的 RenderObjectElement 祖先，
   * 从其渲染对象中移除当前渲染对象。
   */
  removeRenderObjectChild(): void {
    const ancestor = this.findAncestorRenderObjectElement();
    if (
      ancestor !== null &&
      ancestor.renderObject !== undefined &&
      this._renderObject !== undefined
    ) {
      ancestor.renderObject.dropChild(this._renderObject);
    }
  }

  /**
   * 查找最近的 RenderObjectElement 祖先。
   *
   * 沿父链向上遍历，返回第一个 RenderObjectElement 实例。
   *
   * @returns 最近的 RenderObjectElement 祖先，未找到时返回 null
   */
  findAncestorRenderObjectElement(): RenderObjectElement | null {
    let current = this._parent;
    while (current !== undefined) {
      if (current instanceof RenderObjectElement) {
        return current;
      }
      current = (current as unknown as { _parent: typeof current })._parent;
    }
    return null;
  }
}
