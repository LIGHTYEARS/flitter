/**
 * Padding 布局组件。
 *
 * 包含 {@link EdgeInsets} 间距描述、{@link RenderPadding} 渲染对象、
 * {@link Padding} Widget 以及 {@link SingleChildRenderObjectElement} 单子元素。
 *
 * @module
 */

import { BoxConstraints } from "../tree/constraints.js";
import type { Element, Widget as WidgetInterface } from "../tree/element.js";
import { RenderBox } from "../tree/render-box.js";
import type { RenderObject } from "../tree/render-object.js";
import type { RenderObjectWidget } from "../tree/render-object-element.js";
import { RenderObjectElement } from "../tree/render-object-element.js";
import type { Key } from "../tree/widget.js";
import { Widget } from "../tree/widget.js";
import type { EdgeInsets } from "./edge-insets.js";

// ════════════════════════════════════════════════════
//  SingleChildRenderObjectElement
// ════════════════════════════════════════════════════

/**
 * 单子渲染对象元素接口。
 *
 * 实现此接口的 Widget 可拥有至多一个子 Widget。
 */
export interface SingleChildRenderObjectWidgetInterface extends RenderObjectWidget {
  /** 可选的子 Widget */
  readonly child: WidgetInterface | undefined;
}

/**
 * 单子渲染对象元素。
 *
 * 继承 {@link RenderObjectElement}，管理一个可选的子 Widget。
 * 在挂载时创建子元素并将子渲染对象收养到自身渲染对象下；
 * 在卸载时逆向清理。
 */
export class SingleChildRenderObjectElement extends RenderObjectElement {
  /** 当前子元素引用 */
  private _child: Element | undefined = undefined;

  /**
   * 挂载到元素树。
   *
   * 1. 调用父类 mount（创建自身渲染对象并插入渲染树）
   * 2. 如果 Widget 有子 Widget，创建子元素并挂载
   * 3. 将子元素的渲染对象收养到自身渲染对象下
   *
   * @param parent - 父元素
   */
  override mount(parent?: Element): void {
    super.mount(parent);
    const w = this.widget as unknown as SingleChildRenderObjectWidgetInterface;
    if (w.child !== undefined) {
      const childElement = w.child.createElement();
      childElement.mount(this);
      this.addChild(childElement);
      this._child = childElement;

      // 收养子元素的渲染对象
      const childRO = childElement.findRenderObject();
      if (childRO !== undefined && this._renderObject !== undefined) {
        this._renderObject.adoptChild(childRO);
      }
    }
    this._dirty = false;
  }

  /**
   * 用新 Widget 更新当前元素。
   *
   * 更新自身渲染对象配置，并协调子元素。
   *
   * @param newWidget - 新的 Widget 实例
   */
  override update(newWidget: WidgetInterface): void {
    super.update(newWidget);
    const w = newWidget as unknown as SingleChildRenderObjectWidgetInterface;
    this._child = this._updateChild(this._child, w.child);
    this._dirty = false;
  }

  /**
   * 从元素树卸载。
   *
   * 1. 从渲染对象中移除子渲染对象
   * 2. 卸载并移除子元素
   * 3. 调用父类 unmount
   */
  override unmount(): void {
    if (this._child !== undefined) {
      // 先移除子渲染对象
      const childRO = this._child.findRenderObject();
      if (childRO !== undefined && this._renderObject !== undefined) {
        this._renderObject.dropChild(childRO);
      }
      this._child.unmount();
      this.removeChild(this._child);
      this._child = undefined;
    }
    super.unmount();
  }

  /**
   * 协调子元素更新。
   *
   * @param child - 当前子元素
   * @param newWidget - 新的子 Widget
   * @returns 更新后的子元素
   */
  private _updateChild(
    child: Element | undefined,
    newWidget: WidgetInterface | undefined,
  ): Element | undefined {
    // 移除旧子
    if (newWidget === undefined) {
      if (child !== undefined) {
        const childRO = child.findRenderObject();
        if (childRO !== undefined && this._renderObject !== undefined) {
          this._renderObject.dropChild(childRO);
        }
        child.unmount();
        this.removeChild(child);
      }
      return undefined;
    }

    // 复用
    if (child?.widget.canUpdate(newWidget)) {
      child.update(newWidget);
      return child;
    }

    // 替换
    if (child !== undefined) {
      const oldRO = child.findRenderObject();
      if (oldRO !== undefined && this._renderObject !== undefined) {
        this._renderObject.dropChild(oldRO);
      }
      child.unmount();
      this.removeChild(child);
    }

    const newElement = newWidget.createElement();
    newElement.mount(this);
    this.addChild(newElement);

    const newRO = newElement.findRenderObject();
    if (newRO !== undefined && this._renderObject !== undefined) {
      this._renderObject.adoptChild(newRO);
    }

    return newElement;
  }
}

// ════════════════════════════════════════════════════
//  RenderPadding
// ════════════════════════════════════════════════════

/**
 * Padding 渲染对象。
 *
 * 在子节点周围添加指定的间距。布局时将约束收缩（deflate）去除间距部分后
 * 传给子节点，自身尺寸为子节点尺寸加上间距。
 */
export class RenderPadding extends RenderBox {
  /** 内边距 */
  private _padding: EdgeInsets;

  /**
   * 创建 Padding 渲染对象。
   *
   * @param padding - 四方向间距
   */
  constructor(padding: EdgeInsets) {
    super();
    this._padding = padding;
  }

  /**
   * 获取当前内边距。
   *
   * @returns 当前 EdgeInsets
   */
  get padding(): EdgeInsets {
    return this._padding;
  }

  /**
   * 设置内边距。
   *
   * 如果值发生变化则标记需要重新布局。
   *
   * @param value - 新的 EdgeInsets
   */
  set padding(value: EdgeInsets) {
    if (!this._padding.equals(value)) {
      this._padding = value;
      this.markNeedsLayout();
    }
  }

  /**
   * 执行布局。
   *
   * 1. 将约束收缩（减去间距）后传给子节点
   * 2. 自身尺寸 = 子节点尺寸 + 间距
   * 3. 子节点偏移 = (left, top)
   *
   * 若无子节点，则尺寸为间距本身经约束限定后的结果。
   */
  performLayout(): void {
    const constraints = this._constraints!;
    const padding = this._padding;

    // 收缩约束
    const deflatedConstraints = new BoxConstraints({
      minWidth: Math.max(0, constraints.minWidth - padding.horizontal),
      maxWidth: Math.max(0, constraints.maxWidth - padding.horizontal),
      minHeight: Math.max(0, constraints.minHeight - padding.vertical),
      maxHeight: Math.max(0, constraints.maxHeight - padding.vertical),
    });

    if (this._children.length > 0) {
      const child = this._children[0] as RenderBox;
      child.layout(deflatedConstraints);
      this.size = constraints.constrain(
        child.size.width + padding.horizontal,
        child.size.height + padding.vertical,
      );
      child.offset = { x: padding.left, y: padding.top };
    } else {
      this.size = constraints.constrain(padding.horizontal, padding.vertical);
    }
  }
}

// ════════════════════════════════════════════════════
//  Padding Widget
// ════════════════════════════════════════════════════

/** Padding 构造函数参数。 */
interface PaddingArgs {
  /** 可选标识键 */
  key?: Key;
  /** 内边距 */
  padding: EdgeInsets;
  /** 可选子 Widget */
  child?: WidgetInterface;
}

/**
 * Padding Widget。
 *
 * 在子 Widget 周围添加指定的内边距。
 * 创建 {@link RenderPadding} 作为渲染对象。
 */
export class Padding extends Widget implements RenderObjectWidget {
  /** 内边距 */
  readonly padding: EdgeInsets;

  /** 子 Widget */
  readonly child: WidgetInterface | undefined;

  /**
   * 创建 Padding Widget。
   *
   * @param args - 配置参数
   */
  constructor(args: PaddingArgs) {
    super({ key: args.key });
    this.padding = args.padding;
    this.child = args.child;
  }

  /**
   * 创建关联的元素。
   *
   * @returns 新的 SingleChildRenderObjectElement 实例
   */
  createElement(): Element {
    return new SingleChildRenderObjectElement(this as unknown as WidgetInterface);
  }

  /**
   * 创建渲染对象。
   *
   * @returns 新的 RenderPadding 实例
   */
  createRenderObject(): RenderObject {
    return new RenderPadding(this.padding);
  }

  /**
   * 用当前 Widget 配置更新已有的渲染对象。
   *
   * @param renderObject - 待更新的渲染对象
   */
  updateRenderObject(renderObject: RenderObject): void {
    (renderObject as RenderPadding).padding = this.padding;
  }
}
