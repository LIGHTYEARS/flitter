/**
 * 文本输入 Widget
 *
 * 基于 StatefulWidget 的多行文本输入组件，委托 TextEditingController
 * 处理文本操作和光标管理。键盘输入处理由外部协调层完成。
 *
 * 还原自逆向工程代码中 TextField 相关 Widget (tui-widget-library.js)。
 *
 * @module text-field
 *
 * @example
 * ```ts
 * const ctrl = new TextEditingController();
 * const field = new TextField({ controller: ctrl });
 * ```
 */

import { State, StatefulWidget } from "../tree/stateful-widget.js";
import type { BuildContext } from "../tree/stateless-widget.js";
import type { Widget } from "../tree/widget.js";
import { TextEditingController } from "./text-editing-controller.js";

/**
 * TextField 构造属性
 */
export interface TextFieldProps {
  /** 外部文本编辑控制器（不传则内部自建） */
  controller?: TextEditingController;
  /** 占位文本 */
  placeholder?: string;
  /** 是否只读 */
  readOnly?: boolean;
}

/**
 * 多行文本输入 Widget
 *
 * 是 StatefulWidget 子类，管理 TextEditingController 的生命周期。
 * 当外部未传 controller 时内部自动创建并在 dispose 时释放。
 *
 * 注意: build 方法当前返回简化的占位 Widget 树，
 * 完整的 RichText 渲染和键盘事件处理将在后续 plan 中实现。
 *
 * @example
 * ```ts
 * const field = new TextField({ placeholder: "输入命令..." });
 * ```
 */
export class TextField extends StatefulWidget {
  /** @internal 构造属性 */
  readonly props: TextFieldProps;

  constructor(props: TextFieldProps = {}) {
    super();
    this.props = props;
  }

  createState(): State<TextField> {
    return new TextFieldState();
  }
}

/**
 * TextField 的状态管理
 *
 * 负责:
 * - 管理 TextEditingController 生命周期（自建 vs 外部传入）
 * - 订阅 controller 变更通知，触发 setState 重建
 * - build 方法生成 Widget 树
 */
class TextFieldState extends State<TextField> {
  /** 文本编辑控制器 */
  private _controller!: TextEditingController;
  /** 是否自管理 controller（需在 dispose 时释放） */
  private _ownsController: boolean = false;
  /** 变更监听回调 */
  private _listener!: () => void;

  /**
   * 初始化状态
   *
   * 设置 controller 和 listener
   */
  override initState(): void {
    super.initState();
    this._listener = () => {
      if (this.mounted) {
        this.setState();
      }
    };

    if (this.widget.props.controller) {
      this._controller = this.widget.props.controller;
      this._ownsController = false;
    } else {
      this._controller = new TextEditingController();
      this._ownsController = true;
    }

    this._controller.addListener(this._listener);
  }

  /**
   * Widget 配置变更时更新 controller
   */
  override didUpdateWidget(oldWidget: TextField): void {
    super.didUpdateWidget(oldWidget);
    if (this.widget.props.controller !== oldWidget.props.controller) {
      // 旧 controller 取消订阅
      this._controller.removeListener(this._listener);
      if (this._ownsController) {
        this._controller.dispose();
      }
      // 新 controller 订阅
      if (this.widget.props.controller) {
        this._controller = this.widget.props.controller;
        this._ownsController = false;
      } else {
        this._controller = new TextEditingController();
        this._ownsController = true;
      }
      this._controller.addListener(this._listener);
    }
  }

  /**
   * 释放资源
   */
  override dispose(): void {
    this._controller.removeListener(this._listener);
    if (this._ownsController) {
      this._controller.dispose();
    }
    super.dispose();
  }

  /**
   * 构建 Widget 树
   *
   * 当前返回简化实现。完整的 RichText + 光标渲染将在后续 plan 中补充。
   *
   * @param context - 构建上下文
   * @returns Widget 树
   */
  build(_context: BuildContext): Widget {
    // 简化实现: 返回一个占位 Widget
    // 完整实现需要 RichText + TextSpan + 光标渲染，依赖 InheritedWidget 等
    // 此处提供最小可编译实现
    const { Text } = require("../widgets/text.js");
    const displayText = this._controller.text || this.widget.props.placeholder || "";
    return new Text(displayText);
  }

  /**
   * 获取控制器（供外部使用）
   */
  get controller(): TextEditingController {
    return this._controller;
  }
}
