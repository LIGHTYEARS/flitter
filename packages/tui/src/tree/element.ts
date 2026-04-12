/**
 * 元素树抽象基类。
 *
 * {@link Element} 是元素树的核心节点，负责管理 Widget 与 RenderObject 之间的桥梁，
 * 维护父子关系、脏标记传播、生命周期（mount/unmount）及查找等行为。
 *
 * @module
 */

import { getBuildOwner } from "./types.js";
import type { RenderObject } from "./render-object.js";

// ════════════════════════════════════════════════════
//  前置接口声明
// ════════════════════════════════════════════════════

/**
 * 用于标识 Widget 的键接口。
 *
 * 可选实现 {@link equals} 方法以自定义比较逻辑。
 */
export interface Key {
  /** 判断两个 Key 是否相等。 */
  equals?(other: Key): boolean;
}

/**
 * Widget 最小前置声明接口。
 *
 * 在 Plan 04-05 之前作为占位使用。
 */
export interface Widget {
  /** 可选标识键 */
  key: Key | undefined;
  /** 判断当前 Widget 是否能用 other 更新。 */
  canUpdate(other: Widget): boolean;
  /** 创建与此 Widget 关联的 Element。 */
  createElement(): Element;
}

// ════════════════════════════════════════════════════
//  Element 抽象基类
// ════════════════════════════════════════════════════

/**
 * 元素树节点抽象基类。
 *
 * 维护 Widget 引用、父子关系树、脏标记与挂载状态。
 * 通过 {@link addChild} / {@link removeChild} 管理子节点，
 * 通过 {@link markNeedsRebuild} 请求重新构建。
 */
export abstract class Element {
  /** 当前关联的 Widget */
  protected _widget: Widget;

  /** 父元素引用 */
  protected _parent: Element | undefined = undefined;

  /** 子元素列表 */
  protected _children: Element[] = [];

  /** 是否需要重新构建（新元素默认为 true） */
  protected _dirty: boolean = true;

  /** 是否已挂载到元素树 */
  protected _mounted: boolean = false;

  /** 在元素树中的深度 */
  protected _depth: number = 0;

  // ════════════════════════════════════════════════════
  //  属性访问器
  // ════════════════════════════════════════════════════

  /** 获取当前关联的 Widget。 */
  get widget(): Widget {
    return this._widget;
  }

  /** 设置当前关联的 Widget。 */
  set widget(value: Widget) {
    this._widget = value;
  }

  /** 父元素，未挂载时为 undefined。 */
  get parent(): Element | undefined {
    return this._parent;
  }

  /** 子元素只读视图。 */
  get children(): readonly Element[] {
    return this._children;
  }

  /** 是否需要重新构建。 */
  get dirty(): boolean {
    return this._dirty;
  }

  /** 是否已挂载到元素树。 */
  get mounted(): boolean {
    return this._mounted;
  }

  /** 在元素树中的深度。 */
  get depth(): number {
    return this._depth;
  }

  /** 关联的渲染对象，基类默认返回 undefined，RenderObjectElement 子类会覆盖。 */
  get renderObject(): RenderObject | undefined {
    return undefined;
  }

  // ════════════════════════════════════════════════════
  //  构造函数
  // ════════════════════════════════════════════════════

  /**
   * 创建 Element 实例。
   *
   * @param widget - 关联的 Widget
   */
  constructor(widget: Widget) {
    this._widget = widget;
  }

  // ════════════════════════════════════════════════════
  //  树操作
  // ════════════════════════════════════════════════════

  /**
   * 添加子元素。
   *
   * 设置子元素的父引用和深度，并将其加入子元素列表。
   *
   * @param child - 待添加的子元素
   */
  addChild(child: Element): void {
    child._parent = this;
    child._depth = this._depth + 1;
    this._children.push(child);
  }

  /**
   * 移除子元素。
   *
   * 从子元素列表中移除并清除其父引用。
   *
   * @param child - 待移除的子元素
   */
  removeChild(child: Element): void {
    const index = this._children.indexOf(child);
    if (index !== -1) {
      this._children.splice(index, 1);
    }
    child._parent = undefined;
  }

  /**
   * 移除所有子元素。
   *
   * 迭代副本逐一调用 {@link removeChild}。
   */
  removeAllChildren(): void {
    const copy = [...this._children];
    for (const child of copy) {
      this.removeChild(child);
    }
  }

  // ════════════════════════════════════════════════════
  //  生命周期
  // ════════════════════════════════════════════════════

  /**
   * 挂载到元素树。
   *
   * 设置父引用、计算深度、标记为已挂载。
   *
   * @param parent - 父元素，根节点为 undefined
   */
  mount(parent?: Element): void {
    this._parent = parent ?? undefined;
    this._depth = parent ? parent.depth + 1 : 0;
    this._mounted = true;
  }

  /**
   * 从元素树卸载。
   *
   * 递归卸载所有子元素，清除挂载状态和父引用。
   */
  unmount(): void {
    const copy = [...this._children];
    for (const child of copy) {
      child.unmount();
    }
    this._mounted = false;
    this._parent = undefined;
  }

  /**
   * 用新 Widget 更新当前元素。
   *
   * @param newWidget - 新的 Widget 实例
   */
  update(newWidget: Widget): void {
    this._widget = newWidget;
  }

  // ════════════════════════════════════════════════════
  //  重新构建
  // ════════════════════════════════════════════════════

  /**
   * 标记当前元素需要重新构建。
   *
   * 如果已经是脏状态则提前返回，否则设置脏标记并通知
   * BuildOwner 调度重建。
   */
  markNeedsRebuild(): void {
    if (this._dirty) {
      return;
    }
    this._dirty = true;
    getBuildOwner()?.scheduleBuildFor(this);
  }

  /**
   * 执行重新构建。
   *
   * 清除脏标记。子类应覆盖此方法以实现实际的构建逻辑。
   */
  performRebuild(): void {
    this._dirty = false;
  }

  // ════════════════════════════════════════════════════
  //  查找
  // ════════════════════════════════════════════════════

  /**
   * 向上查找指定类型的祖先元素。
   *
   * 沿父链向上遍历，返回第一个匹配 instanceof 检查的祖先元素。
   *
   * @param type - 目标元素的构造函数
   * @returns 匹配的祖先元素，未找到时返回 null
   */
  findAncestorElementOfType(type: Function): Element | null {
    let current = this._parent;
    while (current !== undefined) {
      if (current instanceof (type as new (...args: unknown[]) => Element)) {
        return current;
      }
      current = current._parent;
    }
    return null;
  }

  /**
   * 查找关联的渲染对象。
   *
   * 如果当前元素有渲染对象则直接返回，否则深度优先搜索子元素。
   *
   * @returns 找到的渲染对象，未找到时返回 undefined
   */
  findRenderObject(): RenderObject | undefined {
    if (this.renderObject !== undefined) {
      return this.renderObject;
    }
    for (const child of this._children) {
      const result = child.findRenderObject();
      if (result !== undefined) {
        return result;
      }
    }
    return undefined;
  }
}
