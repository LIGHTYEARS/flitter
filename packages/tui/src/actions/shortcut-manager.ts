/**
 * ShortcutManager — 映射 KeyActivator 到 Intent。
 *
 * 逆向: amp CtT (2105_unknown_CtT.js) — handleKeyEvent 遍历 shortcuts Map,
 * 第一个 activator.accepts(event) 匹配即返回对应 Intent。
 *
 * @module
 */

import type { KeyEvent } from "../vt/types.js";
import type { Intent } from "./intent.js";
import type { KeyActivator } from "./key-activator.js";

/**
 * ShortcutManager — 管理 KeyActivator→Intent 映射。
 *
 * 逆向: amp CtT in 2105_unknown_CtT.js
 *
 * {@link handleKeyEvent} 遍历 shortcuts Map（按插入顺序），
 * 返回第一个 activator.accepts(event) 匹配的 Intent。
 */
export class ShortcutManager {
  private readonly _shortcuts: Map<KeyActivator, Intent>;

  /**
   * 逆向: amp CtT constructor — 复制 Map 避免共享可变状态。
   */
  constructor(shortcuts: Map<KeyActivator, Intent> = new Map()) {
    this._shortcuts = new Map(shortcuts);
  }

  /**
   * 逆向: amp CtT.handleKeyEvent — 第一个匹配的 activator 返回对应 Intent。
   */
  handleKeyEvent(event: KeyEvent): Intent | null {
    for (const [activator, intent] of this._shortcuts) {
      if (activator.accepts(event)) return intent;
    }
    return null;
  }

  /**
   * 逆向: amp CtT.addShortcut — 添加快捷键映射。
   */
  addShortcut(activator: KeyActivator, intent: Intent): void {
    this._shortcuts.set(activator, intent);
  }

  /**
   * 逆向: amp CtT.removeShortcut — 移除快捷键映射。
   */
  removeShortcut(activator: KeyActivator): boolean {
    return this._shortcuts.delete(activator);
  }

  /**
   * 逆向: amp CtT.getAllShortcuts — 返回快捷键映射的浅拷贝。
   */
  getAllShortcuts(): Map<KeyActivator, Intent> {
    return new Map(this._shortcuts);
  }

  /**
   * 逆向: amp CtT.copyWith — 返回合并了额外快捷键的新 ShortcutManager。
   */
  copyWith(additionalShortcuts: Map<KeyActivator, Intent>): ShortcutManager {
    return new ShortcutManager(new Map([...this._shortcuts, ...additionalShortcuts]));
  }
}
