/**
 * scroll 模块统一导出。
 *
 * 提供滚动系统的完整公共 API：
 * - {@link ScrollController} — 滚动偏移量管理器
 * - {@link ScrollPhysics} / {@link ClampingScrollPhysics} — 滚动物理特性
 * - {@link Scrollable} — 可滚动容器 Widget
 * - {@link ScrollKeyHandler} — 键盘/鼠标事件处理器
 * - {@link ListView} — 懒加载虚拟化列表 Widget
 *
 * @module
 */

export * from "./scroll-controller.js";
export * from "./scroll-physics.js";
export * from "./scrollable.js";
export * from "./scroll-key-handler.js";
export * from "./list-view.js";
