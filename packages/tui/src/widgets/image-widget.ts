/**
 * Kitty Graphics ImageWidget — 使用 Kitty 终端图形协议显示图像。
 *
 * 通过 APC 分块传输将 PNG base64 数据发送给支持 Kitty 图形协议的终端，
 * 并在布局区域内填充 Unicode 占位符格网，让终端将该区域映射到图像。
 *
 * 逆向: VQT (State) + XQT (RenderObjectWidget) + YQT (RenderBox)
 *   in amp-cli-reversed/modules/1472_tui_components/misc_utils.js:1220-1378
 *
 * 架构:
 *   ImageWidget (StatefulWidget)
 *     └─ ImageState (State)
 *           ├─ 分配 imageId、传输图像
 *           └─ build() → ImageRenderWidget (叶子 RenderObjectWidget)
 *                 └─ RenderImage (RenderBox) — paint 时写占位符格网
 *
 * @module
 */

import { Color } from "../screen/color.js";
import type { Screen } from "../screen/screen.js";
import { TextStyle } from "../screen/text-style.js";
import type { Element, Widget as WidgetInterface } from "../tree/element.js";
import { RenderBox } from "../tree/render-box.js";
import type { RenderObject } from "../tree/render-object.js";
import type { RenderObjectWidget } from "../tree/render-object-element.js";
import { RenderObjectElement } from "../tree/render-object-element.js";
import { State, StatefulWidget } from "../tree/stateful-widget.js";
import type { BuildContext } from "../tree/stateless-widget.js";
import type { Key } from "../tree/widget.js";
import { Widget } from "../tree/widget.js";
import {
  allocateImageId,
  buildPlaceholderGrid,
  encodeKittyGraphicsDelete,
  encodeKittyGraphicsTransmit,
} from "./render-image.js";

// ════════════════════════════════════════════════════
//  LeafRenderObjectElement (local)
// ════════════════════════════════════════════════════

/**
 * 叶子渲染对象元素（无子 Widget）。
 *
 * 逆向: amp Jx extends Tf (无子节点 RenderObjectWidget 的通用 Element)
 */
class LeafRenderObjectElement extends RenderObjectElement {
  override mount(parent?: Element): void {
    super.mount(parent);
    this._dirty = false;
  }

  override update(newWidget: WidgetInterface): void {
    super.update(newWidget);
    this._dirty = false;
  }
}

// ════════════════════════════════════════════════════
//  RenderImage — 绘制占位符格网
// ════════════════════════════════════════════════════

/**
 * RenderImage 的 props（来自 XQT / RenderObjectWidget）。
 *
 * 逆向: YQT.props 中的字段 (misc_utils.js:1332-1378)
 */
interface RenderImageProps {
  imageId: number;
  width: number;
  height: number;
  backgroundColor?: Color;
}

/**
 * Kitty 图像渲染对象 — 在布局区域内绘制占位符格网。
 *
 * 逆向: YQT extends O9 (misc_utils.js:1332-1378)
 *
 * paint 时为每个终端格子写入:
 *   - char: PLACEHOLDER_BASE + 行变音符 + 列变音符
 *   - fg:   Color.indexed(imageId) — 终端通过前景色索引识别图像 ID
 *   - bg:   可选背景色
 */
export class RenderImage extends RenderBox {
  props: RenderImageProps;

  constructor(props: RenderImageProps) {
    super();
    this.props = props;
  }

  /**
   * 逆向: YQT.performLayout — setSize(props.width, props.height)
   */
  override performLayout(): void {
    this.setSize(this.props.width, this.props.height);
  }

  override getMinIntrinsicWidth(_height: number): number {
    return this.props.width;
  }

  override getMaxIntrinsicWidth(_height: number): number {
    return this.props.width;
  }

  override getMinIntrinsicHeight(_width: number): number {
    return this.props.height;
  }

  override getMaxIntrinsicHeight(_width: number): number {
    return this.props.height;
  }

  /**
   * 绘制占位符格网。
   *
   * 逆向: YQT.paint (misc_utils.js:1353-1372)
   * ```js
   * for (let s = 0; s < r; s++) for (let A = 0; A < t; A++) {
   *   let l = this.createPlaceholder(s, A),
   *       o = { fg: { type: "index", value: e } };
   *   if (h) o.bg = h;
   *   T.setChar(i + A, c + s, l, o, 1);
   * }
   * ```
   *
   * Flitter 使用 screen.writeChar() + TextStyle 代替 amp 的 setChar()。
   * 前景色使用 Color.indexed(imageId) 传递图像 ID。
   */
  override performPaint(screen: Screen, offsetX: number, offsetY: number): void {
    const { imageId, width, height, backgroundColor } = this.props;
    const grid = buildPlaceholderGrid(width, height, imageId);
    const fgColor = Color.indexed(imageId);

    for (let row = 0; row < height; row++) {
      for (let col = 0; col < width; col++) {
        const cell = grid[row]?.[col];
        if (!cell) continue;
        const style = new TextStyle({
          foreground: fgColor,
          background: backgroundColor,
        });
        screen.writeChar(offsetX + col, offsetY + row, cell.char, style, 1);
      }
    }
  }
}

// ════════════════════════════════════════════════════
//  ImageRenderWidget — 叶子 RenderObjectWidget
// ════════════════════════════════════════════════════

/**
 * 低层级图像渲染 Widget（叶子节点）。
 *
 * 逆向: XQT extends _t (misc_utils.js:1319-1331)
 *
 * 由 ImageState.build() 创建，封装 RenderImage。
 */
class ImageRenderWidget extends Widget implements RenderObjectWidget {
  readonly props: RenderImageProps;
  readonly child: WidgetInterface | undefined = undefined;

  constructor(props: RenderImageProps & { key?: Key }) {
    super({ key: props.key });
    this.props = props;
  }

  /**
   * 逆向: XQT.createElement() → new Jx(this) (叶子 RenderObjectElement)
   */
  createElement(): Element {
    return new LeafRenderObjectElement(this as unknown as WidgetInterface);
  }

  /**
   * 逆向: XQT.createRenderObject() → new YQT(this.props)
   */
  createRenderObject(): RenderObject {
    return new RenderImage(this.props);
  }

  /**
   * 逆向: XQT.updateRenderObject(T) — 检查 props 变化后更新
   */
  updateRenderObject(renderObject: RenderObject): void {
    if (!(renderObject instanceof RenderImage)) return;
    const prev = renderObject.props;
    if (
      prev.width !== this.props.width ||
      prev.height !== this.props.height ||
      prev.imageId !== this.props.imageId ||
      prev.backgroundColor !== this.props.backgroundColor
    ) {
      renderObject.props = this.props;
      renderObject.markNeedsLayout();
    }
  }
}

// ════════════════════════════════════════════════════
//  SizedBox fallback widget (inline)
// ════════════════════════════════════════════════════

/**
 * 极简占位 Widget，当不支持 Kitty 图形协议时使用。
 *
 * 逆向: VQT.build() — 失败时返回 new XT({ width: R, height: a })
 * XT 是 SizedBox（空白占位盒）。
 */
class _BlankBox extends Widget implements RenderObjectWidget {
  readonly width: number;
  readonly height: number;
  readonly child: WidgetInterface | undefined = undefined;

  constructor(width: number, height: number) {
    super({});
    this.width = width;
    this.height = height;
  }

  createElement(): Element {
    return new LeafRenderObjectElement(this as unknown as WidgetInterface);
  }

  createRenderObject(): RenderObject {
    return new _BlankBoxRender(this.width, this.height);
  }

  updateRenderObject(renderObject: RenderObject): void {
    if (renderObject instanceof _BlankBoxRender) {
      renderObject.setProps(this.width, this.height);
    }
  }
}

class _BlankBoxRender extends RenderBox {
  private _w: number;
  private _h: number;

  constructor(w: number, h: number) {
    super();
    this._w = w;
    this._h = h;
  }

  setProps(w: number, h: number): void {
    if (this._w !== w || this._h !== h) {
      this._w = w;
      this._h = h;
      this.markNeedsLayout();
    }
  }

  override performLayout(): void {
    this.setSize(this._w, this._h);
  }
}

// ════════════════════════════════════════════════════
//  ImageState — StatefulWidget 状态
// ════════════════════════════════════════════════════

/**
 * ImageWidget 的状态，管理图像 ID 分配和 APC 传输。
 *
 * 逆向: VQT extends wR (misc_utils.js:1234-1317)
 *
 * 生命周期:
 *   initState() → 分配 imageId, transmitImage()
 *   didUpdateWidget() → 尺寸变化时 deleteImage() + 重新 transmitImage()
 *   dispose() → deleteImage()
 *   build() → 返回 ImageRenderWidget 或 _BlankBox
 */
class ImageState extends State<ImageWidget> {
  /** 当前分配的图像 ID (1-255)，null 表示未分配 */
  imageId: number | null = null;
  /** 是否已完成 APC 传输 */
  transmitted: boolean = false;
  /** 已传输的宽度（用于检测尺寸变化） */
  transmittedWidth: number = 0;
  /** 已传输的高度 */
  transmittedHeight: number = 0;
  /** 格式转换是否失败 */
  conversionFailed: boolean = false;

  /**
   * 逆向: VQT.initState — 分配 imageId 并传输图像
   */
  override initState(): void {
    super.initState();
    this.imageId = allocateImageId();
    this._transmitImage();
  }

  /**
   * 逆向: VQT.didUpdateWidget — 尺寸变化时重新传输
   */
  override didUpdateWidget(oldWidget: ImageWidget): void {
    super.didUpdateWidget(oldWidget);
    const { width, height } = this.widget;
    if (width !== this.transmittedWidth || height !== this.transmittedHeight) {
      this._deleteImage();
      this.conversionFailed = false;
      this.imageId = allocateImageId();
      this._transmitImage();
    }
  }

  /**
   * 逆向: VQT.dispose — 删除图像资源
   */
  override dispose(): void {
    this._deleteImage();
    super.dispose();
  }

  /**
   * 传输图像 APC 序列到 stdout。
   *
   * 逆向: VQT.transmitImage (misc_utils.js:1267-1296)
   */
  private _transmitImage(): void {
    const { base64Data, width, height, inTmux = false } = this.widget;
    if (!this.imageId) return;

    const seq = encodeKittyGraphicsTransmit(base64Data, {
      id: this.imageId,
      cols: width,
      rows: height,
      inTmux,
    });

    process.stdout.write(seq);
    this.transmitted = true;
    this.transmittedWidth = width;
    this.transmittedHeight = height;
  }

  /**
   * 发送 APC 删除序列，释放终端侧图像资源。
   *
   * 逆向: VQT.deleteImage (misc_utils.js:1298-1299)
   */
  private _deleteImage(): void {
    if (this.imageId !== null && this.transmitted) {
      const { inTmux = false } = this.widget;
      process.stdout.write(encodeKittyGraphicsDelete(this.imageId, inTmux));
      this.imageId = null;
      this.transmitted = false;
    }
  }

  /**
   * 构建子 Widget。
   *
   * 逆向: VQT.build (misc_utils.js:1301-1316)
   * - 失败或无 imageId: 返回空白占位盒
   * - 正常: 返回 ImageRenderWidget (XQT)
   */
  override build(_context: BuildContext): WidgetInterface {
    const { width, height, backgroundColor } = this.widget;

    if (this.conversionFailed || !this.imageId) {
      return new _BlankBox(width, height);
    }

    return new ImageRenderWidget({
      imageId: this.imageId,
      width,
      height,
      backgroundColor,
    });
  }
}

// ════════════════════════════════════════════════════
//  ImageWidget — 对外 StatefulWidget
// ════════════════════════════════════════════════════

/**
 * ImageWidget 构造参数。
 */
export interface ImageWidgetProps {
  /** 可选标识键 */
  key?: Key;
  /** PNG 图像的 base64 编码字符串 */
  base64Data: string;
  /** 图像媒体类型（如 "image/png"），保留供未来格式转换使用 */
  mediaType?: string;
  /** 终端列数（图像宽度，单位: 终端字符列） */
  width: number;
  /** 终端行数（图像高度，单位: 终端字符行） */
  height: number;
  /** 可选背景色 */
  backgroundColor?: Color;
  /** 是否在 tmux 会话内（影响 APC 序列包装方式），默认 false */
  inTmux?: boolean;
}

/**
 * Kitty 图形协议图像 Widget。
 *
 * 使用 Kitty 终端图形协议（APC 序列）在终端中显示图像。
 * 支持 Kitty 图形协议的终端（Kitty、WezTerm 等）会将占位符格网
 * 区域渲染为对应的图像内容；不支持的终端将显示空白区域。
 *
 * 逆向: class using VQT as state (misc_utils.js:1220-1233)
 *
 * @example
 * ```ts
 * new ImageWidget({
 *   base64Data: pngBase64,
 *   mediaType: "image/png",
 *   width: 40,
 *   height: 20,
 * })
 * ```
 */
export class ImageWidget extends StatefulWidget {
  /** PNG base64 数据 */
  readonly base64Data: string;
  /** 媒体类型 */
  readonly mediaType: string | undefined;
  /** 图像宽度（列数） */
  readonly width: number;
  /** 图像高度（行数） */
  readonly height: number;
  /** 背景色 */
  readonly backgroundColor: Color | undefined;
  /** 是否在 tmux 内 */
  readonly inTmux: boolean;

  constructor(props: ImageWidgetProps) {
    super({ key: props.key });
    this.base64Data = props.base64Data;
    this.mediaType = props.mediaType;
    this.width = props.width;
    this.height = props.height;
    this.backgroundColor = props.backgroundColor;
    this.inTmux = props.inTmux ?? false;
  }

  /**
   * 逆向: createState() → new VQT()
   */
  override createState(): State {
    return new ImageState();
  }
}
