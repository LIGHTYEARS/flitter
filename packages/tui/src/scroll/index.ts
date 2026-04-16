/**
 * scroll 模块统一导出。
 *
 * 提供滚动系统的完整公共 API：
 * - {@link ScrollController} — 滚动偏移量管理器
 * - {@link ScrollPhysics} / {@link ClampingScrollPhysics} — 滚动物理特性
 * - {@link Scrollable} / {@link ScrollableState} — 高层级可滚动 StatefulWidget
 * - {@link ScrollViewport} — 低层级滚动视口 RenderObjectWidget
 * - {@link ScrollBehavior} — 键盘/鼠标滚动行为（amp P1T 对齐）
 * - {@link ScrollKeyHandler} — 旧版键盘/鼠标事件处理器（保留向后兼容）
 * - {@link ListView} — 懒加载虚拟化列表 Widget
 *
 * @module
 */

export * from "./list-view.js";
export * from "./render-scrollable.js";
export * from "./scroll-behavior.js";
export * from "./scroll-controller.js";
export * from "./scroll-key-handler.js";
export * from "./scroll-physics.js";
export * from "./scrollable.js";
