/**
 * KeyActivator — 匹配键盘事件与按键组合。
 *
 * 逆向: amp x0 (2104_unknown_x0.js) — accepts(event) 精确匹配 key + 修饰键。
 *
 * @module
 */

import type { KeyEvent } from "../vt/types.js";

/**
 * KeyActivator — 描述一个键盘快捷键组合。
 *
 * 逆向: amp x0 in 2104_unknown_x0.js
 *
 * {@link accepts} 精确匹配 key 名称和所有四个修饰键。
 * 提供静态工厂方法 {@link key}, {@link ctrl}, {@link shift}, {@link alt}, {@link meta}
 * 用于快速创建常见组合。
 */
export class KeyActivator {
  readonly key: string;
  readonly shift: boolean;
  readonly ctrl: boolean;
  readonly alt: boolean;
  readonly meta: boolean;

  constructor(
    key: string,
    modifiers?: { shift?: boolean; ctrl?: boolean; alt?: boolean; meta?: boolean },
  ) {
    this.key = key;
    this.shift = modifiers?.shift ?? false;
    this.ctrl = modifiers?.ctrl ?? false;
    this.alt = modifiers?.alt ?? false;
    this.meta = modifiers?.meta ?? false;
  }

  /**
   * 逆向: amp x0.accepts — 精确匹配 key 和所有修饰键。
   *
   * 使用 $k0 规范化: a-z 单字符用 event.key，
   * 其他键使用 event.key（我们的 KeyEvent 没有 .code 字段）。
   */
  accepts(event: KeyEvent): boolean {
    return (
      event.key === this.key &&
      event.modifiers.ctrl === this.ctrl &&
      event.modifiers.shift === this.shift &&
      event.modifiers.alt === this.alt &&
      event.modifiers.meta === this.meta
    );
  }

  /**
   * 逆向: amp x0 — 返回当前激活的修饰键名称列表。
   * 顺序: Meta → Ctrl → Alt → Shift
   */
  modifierNames(): string[] {
    const result: string[] = [];
    if (this.meta) result.push("Meta");
    if (this.ctrl) result.push("Ctrl");
    if (this.alt) result.push("Alt");
    if (this.shift) result.push("Shift");
    return result;
  }

  toString(): string {
    const mods = this.modifierNames();
    if (mods.length > 0) return `${mods.join("+")}+${this.key}`;
    return this.key;
  }

  // ────────────────────────────────────────────────
  //  静态工厂方法
  // ────────────────────────────────────────────────

  /** 无修饰键 */
  static key(k: string): KeyActivator {
    return new KeyActivator(k);
  }

  /** Ctrl + key */
  static ctrl(k: string): KeyActivator {
    return new KeyActivator(k, { ctrl: true });
  }

  /** Shift + key */
  static shift(k: string): KeyActivator {
    return new KeyActivator(k, { shift: true });
  }

  /** Alt + key */
  static alt(k: string): KeyActivator {
    return new KeyActivator(k, { alt: true });
  }

  /** Meta + key */
  static meta(k: string): KeyActivator {
    return new KeyActivator(k, { meta: true });
  }
}
