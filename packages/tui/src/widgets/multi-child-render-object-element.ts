/**
 * 多子节点渲染对象元素。
 *
 * {@link MultiChildRenderObjectElement} 继承 {@link RenderObjectElement}，
 * 管理一组子元素，并将对应的渲染对象同步到父渲染对象的子节点列表中。
 * Row / Column / Stack 等多子节点 Widget 共用此元素类型。
 *
 * @module
 */

import type { Element, Widget } from "../tree/element.js";
import { RenderObjectElement, type RenderObjectWidget } from "../tree/render-object-element.js";

// ════════════════════════════════════════════════════
//  MultiChildRenderObjectWidget 接口
// ════════════════════════════════════════════════════

/**
 * 多子节点 Widget 接口。
 *
 * 继承 {@link RenderObjectWidget}，额外要求提供子 Widget 列表。
 */
export interface MultiChildRenderObjectWidget extends RenderObjectWidget {
  /** 子 Widget 列表。 */
  readonly children: Widget[];
}

// ════════════════════════════════════════════════════
//  ParentDataWidget 接口
// ════════════════════════════════════════════════════

/**
 * 父数据 Widget 接口。
 *
 * 实现此接口的 Widget（如 Flexible）可以在子渲染对象被收养后
 * 将自身携带的数据（flex、fit 等）写入子渲染对象的 parentData。
 */
export interface ParentDataWidgetLike {
  /** 将父数据应用到子渲染对象的 parentData 上。 */
  applyParentData(childRenderObject: import("../tree/render-object.js").RenderObject): void;
  /** 被包裹的子 Widget。 */
  readonly child: Widget;
}

/**
 * 判断一个 Widget 是否实现了 ParentDataWidgetLike 接口。
 *
 * @param widget - 待检查的 Widget
 * @returns 如果实现了 ParentDataWidgetLike 接口则返回 true
 */
function isParentDataWidget(widget: unknown): widget is ParentDataWidgetLike {
  return (
    widget !== null &&
    typeof widget === "object" &&
    "applyParentData" in widget &&
    "child" in widget &&
    typeof (widget as ParentDataWidgetLike).applyParentData === "function"
  );
}

// ════════════════════════════════════════════════════
//  MultiChildRenderObjectElement
// ════════════════════════════════════════════════════

/**
 * 多子节点渲染对象元素。
 *
 * 管理一组子元素，并将对应的渲染对象同步到父渲染对象的子节点列表中。
 * 在挂载时为每个子 Widget 创建元素并收养其渲染对象；
 * 如果子 Widget 是 ParentDataWidget（如 Flexible），还会将父数据写入渲染对象。
 */
export class MultiChildRenderObjectElement extends RenderObjectElement {
  /** 子元素列表。 */
  protected _childElements: Element[] = [];

  // ════════════════════════════════════════════════════
  //  生命周期
  // ════════════════════════════════════════════════════

  /**
   * 挂载到元素树。
   *
   * 1. 调用父类 mount 创建渲染对象
   * 2. 为每个子 Widget 创建元素、挂载并收养其渲染对象
   * 3. 对 ParentDataWidget 子节点应用父数据
   *
   * @param parent - 父元素，根节点为 undefined
   */
  override mount(parent?: Element): void {
    super.mount(parent);
    const widget = this.widget as unknown as MultiChildRenderObjectWidget;
    this._mountChildren(widget.children);
  }

  /**
   * 用新 Widget 更新当前元素。
   *
   * 简化的协调策略：移除所有旧子节点，重新挂载新子节点。
   *
   * @param newWidget - 新的 Widget 实例
   */
  override update(newWidget: Widget): void {
    super.update(newWidget);
    // 移除所有旧子节点
    this._unmountChildren();
    // 挂载新子节点
    const widget = this.widget as unknown as MultiChildRenderObjectWidget;
    this._mountChildren(widget.children);
  }

  /**
   * 从元素树卸载。
   *
   * 先移除所有子节点，然后调用父类 unmount。
   */
  override unmount(): void {
    this._unmountChildren();
    super.unmount();
  }

  // ════════════════════════════════════════════════════
  //  内部方法
  // ════════════════════════════════════════════════════

  /**
   * 挂载子 Widget 列表。
   *
   * 对于每个子 Widget：
   * - 如果是 ParentDataWidget，则使用其内部 child 创建元素，
   *   挂载后再应用父数据到子渲染对象
   * - 否则直接创建元素并挂载
   *
   * 子元素的 mount() 会自动通过 insertRenderObjectChild() 将子渲染对象
   * 收养到最近的 RenderObjectElement 祖先（即本元素）的渲染对象中，
   * 因此无需手动调用 adoptChild。
   *
   * @param childWidgets - 子 Widget 列表
   */
  private _mountChildren(childWidgets: Widget[]): void {
    for (const childWidget of childWidgets) {
      let actualWidget: Widget;
      let parentDataWidget: ParentDataWidgetLike | undefined;

      if (isParentDataWidget(childWidget)) {
        parentDataWidget = childWidget;
        actualWidget = childWidget.child;
      } else {
        actualWidget = childWidget;
      }

      const childElement = actualWidget.createElement();
      childElement.mount(this);
      this.addChild(childElement);

      // 子元素的 mount() 已通过 insertRenderObjectChild() 完成 adoptChild，
      // 此处仅需在 ParentDataWidget 场景下设置弹性属性
      if (parentDataWidget) {
        const childRO = childElement.findRenderObject();
        if (childRO) {
          parentDataWidget.applyParentData(childRO);
        }
      }
      this._childElements.push(childElement);
    }
  }

  /**
   * 卸载所有子元素。
   *
   * 子元素的 unmount() 会自动通过 removeRenderObjectChild() 将子渲染对象
   * 从父渲染对象中移除，因此无需手动调用 dropChild。
   */
  private _unmountChildren(): void {
    for (const childElem of this._childElements) {
      childElem.unmount();
      this.removeChild(childElem);
    }
    this._childElements = [];
  }

  /**
   * 覆盖基类的 insertRenderObjectChild，
   * 多子节点元素自行管理子渲染对象的收养，不需要基类的自动收养逻辑。
   */
  override insertRenderObjectChild(): void {
    // 多子节点元素在 mount 中由 findAncestorRenderObjectElement 完成
    // 自身渲染对象插入到祖先的逻辑
    const ancestor = this.findAncestorRenderObjectElement();
    if (
      ancestor !== null &&
      ancestor.renderObject !== undefined &&
      this._renderObject !== undefined
    ) {
      ancestor.renderObject.adoptChild(this._renderObject);
    }
  }
}
