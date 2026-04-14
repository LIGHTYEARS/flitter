/**
 * @flitter/cli widgets 模块导出。
 *
 * 提供 ThemeController 和 ConfigProvider — 真正的 InheritedWidget 子类，
 * 替代 interactive.ts 中的 stub 对象。
 *
 * @example
 * ```ts
 * import { ThemeController, ConfigProvider, type ThemeData } from "./widgets";
 *
 * const root = new ThemeController({
 *   data: themeData,
 *   child: new ConfigProvider({
 *     configService,
 *     child: appWidget,
 *   }),
 * });
 * ```
 *
 * @module
 */

export { ThemeController, type ThemeData } from "./theme-controller.js";
export { ConfigProvider } from "./config-provider.js";
