/**
 * Intent 基类 — 纯数据标记类，标识用户意图。
 *
 * 逆向: amp H8 — Intent 子类是标记类，可携带可选数据。
 * Actions 系统通过 intent.constructor（类引用）查找对应的 Action。
 *
 * @module
 */

/**
 * Intent 基类。
 *
 * 子类用作纯数据标记，描述用户意图（如 ScrollDownIntent, CopyIntent）。
 * Actions 系统通过 intent.constructor（类引用）查找匹配的 Action。
 */
export abstract class Intent {}
