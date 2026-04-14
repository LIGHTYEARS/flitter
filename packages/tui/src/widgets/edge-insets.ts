/**
 * 四方向间距值对象。
 *
 * {@link EdgeInsets} 是不可变的四方向间距描述，用于 Padding 等布局组件。
 * 通过静态工厂方法创建实例，所有实例使用 Object.freeze 保证不可变性。
 *
 * @module
 */

// ════════════════════════════════════════════════════
//  EdgeInsets
// ════════════════════════════════════════════════════

/**
 * 四方向间距值对象（不可变）。
 *
 * 描述上下左右四个方向的间距值，常用于 Padding 等布局组件。
 * 实例通过静态工厂方法创建，使用 Object.freeze 确保不可变。
 */
export class EdgeInsets {
  /** 左侧间距 */
  readonly left: number;

  /** 上侧间距 */
  readonly top: number;

  /** 右侧间距 */
  readonly right: number;

  /** 下侧间距 */
  readonly bottom: number;

  /**
   * 创建 EdgeInsets 实例（私有构造函数）。
   *
   * 外部应使用静态工厂方法创建实例。
   *
   * @param left - 左侧间距
   * @param top - 上侧间距
   * @param right - 右侧间距
   * @param bottom - 下侧间距
   */
  private constructor(left: number, top: number, right: number, bottom: number) {
    this.left = left;
    this.top = top;
    this.right = right;
    this.bottom = bottom;
    Object.freeze(this);
  }

  // ════════════════════════════════════════════════════
  //  静态工厂方法
  // ════════════════════════════════════════════════════

  /** 四边间距均为零的常量实例。 */
  static readonly zero: EdgeInsets = new EdgeInsets(0, 0, 0, 0);

  /**
   * 创建四边相同间距的 EdgeInsets。
   *
   * @param value - 四边统一的间距值
   * @returns 新的 EdgeInsets 实例
   */
  static all(value: number): EdgeInsets {
    return new EdgeInsets(value, value, value, value);
  }

  /**
   * 创建水平/垂直对称间距的 EdgeInsets。
   *
   * @param opts - 可选的 horizontal（左右）和 vertical（上下）间距
   * @returns 新的 EdgeInsets 实例
   */
  static symmetric(opts: { horizontal?: number; vertical?: number }): EdgeInsets {
    const h = opts.horizontal ?? 0;
    const v = opts.vertical ?? 0;
    return new EdgeInsets(h, v, h, v);
  }

  /**
   * 创建仅水平方向（左右）间距的 EdgeInsets。
   *
   * @param value - 水平间距值
   * @returns 新的 EdgeInsets 实例
   */
  static horizontal(value: number): EdgeInsets {
    return new EdgeInsets(value, 0, value, 0);
  }

  /**
   * 创建仅垂直方向（上下）间距的 EdgeInsets。
   *
   * @param value - 垂直间距值
   * @returns 新的 EdgeInsets 实例
   */
  static vertical(value: number): EdgeInsets {
    return new EdgeInsets(0, value, 0, value);
  }

  /**
   * 创建可分别指定每个方向间距的 EdgeInsets。
   *
   * @param opts - 可选的 left、top、right、bottom 间距
   * @returns 新的 EdgeInsets 实例
   */
  static only(opts: { left?: number; top?: number; right?: number; bottom?: number }): EdgeInsets {
    return new EdgeInsets(opts.left ?? 0, opts.top ?? 0, opts.right ?? 0, opts.bottom ?? 0);
  }

  // ════════════════════════════════════════════════════
  //  计算属性
  // ════════════════════════════════════════════════════

  /**
   * 水平方向总间距（左 + 右）。
   *
   * @returns 水平间距总和
   */
  get horizontal(): number {
    return this.left + this.right;
  }

  /**
   * 垂直方向总间距（上 + 下）。
   *
   * @returns 垂直间距总和
   */
  get vertical(): number {
    return this.top + this.bottom;
  }

  // ════════════════════════════════════════════════════
  //  实例方法
  // ════════════════════════════════════════════════════

  /**
   * 判断两个 EdgeInsets 是否相等（四个方向的值完全相同）。
   *
   * @param other - 待比较的 EdgeInsets
   * @returns 所有方向值都相等时返回 true
   */
  equals(other: EdgeInsets): boolean {
    return (
      this.left === other.left &&
      this.top === other.top &&
      this.right === other.right &&
      this.bottom === other.bottom
    );
  }

  /**
   * 返回可读的调试字符串。
   *
   * @returns 调试字符串
   */
  toString(): string {
    return `EdgeInsets(left: ${this.left}, top: ${this.top}, right: ${this.right}, bottom: ${this.bottom})`;
  }
}
