/**
 * BoxConstraints -- Flutter 核心布局约束数据结构的 TypeScript 实现。
 *
 * @module
 */

/**
 * 不可变的二维尺寸。
 */
export interface Size {
  readonly width: number;
  readonly height: number;
}

/** 将 value 限定在 [min, max] 范围内。 */
function clamp(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

/** BoxConstraints 构造函数参数。 */
interface BoxConstraintsArgs {
  minWidth?: number;
  maxWidth?: number;
  minHeight?: number;
  maxHeight?: number;
}

/**
 * 盒约束模型，描述子组件可接受的最小/最大宽高范围。
 *
 * 所有实例均为不可变（readonly + Object.freeze）。
 */
export class BoxConstraints {
  /** 最小宽度，默认 0。 */
  readonly minWidth: number;
  /** 最大宽度，默认 Infinity。 */
  readonly maxWidth: number;
  /** 最小高度，默认 0。 */
  readonly minHeight: number;
  /** 最大高度，默认 Infinity。 */
  readonly maxHeight: number;

  /**
   * 创建盒约束。
   *
   * @param args - 可选的约束参数，未指定的字段使用默认值
   * @throws 当 min > max 或任何值为负数时抛出错误
   */
  constructor(args?: BoxConstraintsArgs) {
    const minWidth = args?.minWidth ?? 0;
    const maxWidth = args?.maxWidth ?? Infinity;
    const minHeight = args?.minHeight ?? 0;
    const maxHeight = args?.maxHeight ?? Infinity;

    if (minWidth < 0) {
      throw new Error(`minWidth 不能为负数，收到: ${minWidth}`);
    }
    if (maxWidth < 0) {
      throw new Error(`maxWidth 不能为负数，收到: ${maxWidth}`);
    }
    if (minHeight < 0) {
      throw new Error(`minHeight 不能为负数，收到: ${minHeight}`);
    }
    if (maxHeight < 0) {
      throw new Error(`maxHeight 不能为负数，收到: ${maxHeight}`);
    }
    if (minWidth > maxWidth) {
      throw new Error(`minWidth (${minWidth}) 不能大于 maxWidth (${maxWidth})`);
    }
    if (minHeight > maxHeight) {
      throw new Error(`minHeight (${minHeight}) 不能大于 maxHeight (${maxHeight})`);
    }

    this.minWidth = minWidth;
    this.maxWidth = maxWidth;
    this.minHeight = minHeight;
    this.maxHeight = maxHeight;

    Object.freeze(this);
  }

  // ════════════════════════════════════════════════════
  //  静态工厂方法
  // ════════════════════════════════════════════════════

  /**
   * 创建紧约束：min === max === 给定值。
   *
   * @param width - 固定宽度
   * @param height - 固定高度
   */
  static tight(width: number, height: number): BoxConstraints {
    return new BoxConstraints({
      minWidth: width,
      maxWidth: width,
      minHeight: height,
      maxHeight: height,
    });
  }

  /**
   * 创建松约束：min = 0，max = 给定值。
   *
   * @param width - 最大宽度
   * @param height - 最大高度
   */
  static loose(width: number, height: number): BoxConstraints {
    return new BoxConstraints({
      minWidth: 0,
      maxWidth: width,
      minHeight: 0,
      maxHeight: height,
    });
  }

  /**
   * 对指定维度创建紧约束，未指定的维度使用 0..Infinity。
   *
   * @param opts - 可选的 width 和 height
   */
  static tightFor(opts: { width?: number; height?: number }): BoxConstraints {
    return new BoxConstraints({
      minWidth: opts.width ?? 0,
      maxWidth: opts.width ?? Infinity,
      minHeight: opts.height ?? 0,
      maxHeight: opts.height ?? Infinity,
    });
  }

  // ════════════════════════════════════════════════════
  //  计算属性
  // ════════════════════════════════════════════════════

  /** 最大宽度是否有限。 */
  get hasBoundedWidth(): boolean {
    return this.maxWidth !== Infinity;
  }

  /** 最大高度是否有限。 */
  get hasBoundedHeight(): boolean {
    return this.maxHeight !== Infinity;
  }

  /** 宽度是否为紧约束（minWidth >= maxWidth）。 */
  get hasTightWidth(): boolean {
    return this.minWidth >= this.maxWidth;
  }

  /** 高度是否为紧约束（minHeight >= maxHeight）。 */
  get hasTightHeight(): boolean {
    return this.minHeight >= this.maxHeight;
  }

  /** 宽高两个维度是否都是紧约束。 */
  get isTight(): boolean {
    return this.hasTightWidth && this.hasTightHeight;
  }

  /** 约束允许的最大尺寸。 */
  get biggest(): Size {
    return { width: this.maxWidth, height: this.maxHeight };
  }

  /** 约束允许的最小尺寸。 */
  get smallest(): Size {
    return { width: this.minWidth, height: this.minHeight };
  }

  // ════════════════════════════════════════════════════
  //  实例方法
  // ════════════════════════════════════════════════════

  /**
   * 将给定的宽高限定在当前约束范围 [min, max] 内。
   *
   * @param width - 期望宽度
   * @param height - 期望高度
   * @returns 限定后的尺寸
   */
  constrain(width: number, height: number): Size {
    return {
      width: clamp(width, this.minWidth, this.maxWidth),
      height: clamp(height, this.minHeight, this.maxHeight),
    };
  }

  /**
   * 将当前约束的 min/max 限定到 other 约束的范围内。
   *
   * @param other - 外部约束
   * @returns 新的约束实例，其 min/max 被 clamp 到 other 的范围
   */
  enforce(other: BoxConstraints): BoxConstraints {
    const newMinWidth = clamp(this.minWidth, other.minWidth, other.maxWidth);
    const newMaxWidth = clamp(this.maxWidth, other.minWidth, other.maxWidth);
    const newMinHeight = clamp(this.minHeight, other.minHeight, other.maxHeight);
    const newMaxHeight = clamp(this.maxHeight, other.minHeight, other.maxHeight);

    return new BoxConstraints({
      minWidth: newMinWidth,
      maxWidth: newMaxWidth,
      minHeight: newMinHeight,
      maxHeight: newMaxHeight,
    });
  }

  /**
   * 放松约束：将 min 归零，保留 max 不变。
   *
   * @returns 新的松约束实例
   */
  loosen(): BoxConstraints {
    return new BoxConstraints({
      minWidth: 0,
      maxWidth: this.maxWidth,
      minHeight: 0,
      maxHeight: this.maxHeight,
    });
  }

  /**
   * 收紧约束：将指定维度变为紧约束（给定值 clamp 到当前范围后，min = max = 该值）。
   *
   * @param opts - 可选的 width 和 height
   * @returns 新的约束实例
   */
  tighten(opts: { width?: number; height?: number }): BoxConstraints {
    let minW = this.minWidth;
    let maxW = this.maxWidth;
    let minH = this.minHeight;
    let maxH = this.maxHeight;

    if (opts.width !== undefined) {
      const w = clamp(opts.width, this.minWidth, this.maxWidth);
      minW = w;
      maxW = w;
    }

    if (opts.height !== undefined) {
      const h = clamp(opts.height, this.minHeight, this.maxHeight);
      minH = h;
      maxH = h;
    }

    return new BoxConstraints({
      minWidth: minW,
      maxWidth: maxW,
      minHeight: minH,
      maxHeight: maxH,
    });
  }

  /**
   * 判断两个约束是否相等（四个字段全部相同）。
   *
   * @param other - 要比较的约束
   * @returns 是否相等
   */
  equals(other: BoxConstraints): boolean {
    return (
      this.minWidth === other.minWidth &&
      this.maxWidth === other.maxWidth &&
      this.minHeight === other.minHeight &&
      this.maxHeight === other.maxHeight
    );
  }

  /**
   * 返回可读的调试字符串，包含四个字段的信息。
   *
   * @returns 调试字符串
   */
  toString(): string {
    return `BoxConstraints(minWidth: ${this.minWidth}, maxWidth: ${this.maxWidth}, minHeight: ${this.minHeight}, maxHeight: ${this.maxHeight})`;
  }
}
