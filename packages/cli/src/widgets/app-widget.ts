/**
 * AppWidget — 应用根 Widget。
 *
 * {@link AppWidget} 扩展 {@link StatefulWidget}，管理应用级状态，
 * 构建 ThemeController -> ConfigProvider -> child 的 InheritedWidget 嵌套树。
 *
 * 替代 interactive.ts 中的 stub AppWidget 类。
 *
 * 逆向参考: _70 (html-sanitizer-repl.js ~1327-1388) — launchTuiApp 创建 AppWidget 树
 *
 * @example
 * ```ts
 * import { AppWidget } from "./app-widget.js";
 * import { ThemeController, type ThemeData } from "./theme-controller.js";
 *
 * const app = new AppWidget({
 *   themeData: myThemeData,
 *   configService: container.configService,
 *   child: new ThreadStateWidget({ ... }),
 * });
 * ```
 *
 * @module
 */

import { StatefulWidget, State } from "@flitter/tui";
import type { Widget } from "@flitter/tui";
import type { BuildContext } from "@flitter/tui";
import { ThemeController, type ThemeData } from "./theme-controller.js";
import { ConfigProvider } from "./config-provider.js";

// ════════════════════════════════════════════════════
//  AppWidgetConfig 接口
// ════════════════════════════════════════════════════

/**
 * AppWidget 配置。
 *
 * @property themeData - 主题数据，传递给 ThemeController
 * @property configService - 配置服务引用，传递给 ConfigProvider
 * @property child - 子 Widget (通常是 ThreadStateWidget)
 */
export interface AppWidgetConfig {
  /** 主题数据 */
  themeData: ThemeData;
  /** 配置服务引用 (实际类型为 @flitter/data ConfigService) */
  configService: unknown;
  /** 子 Widget */
  child: Widget;
}

// ════════════════════════════════════════════════════
//  AppWidget
// ════════════════════════════════════════════════════

/**
 * 应用根 Widget — 构建 InheritedWidget 嵌套树。
 *
 * 组件树结构:
 *   ThemeController (主题注入)
 *     └── ConfigProvider (配置注入)
 *         └── child (通常是 ThreadStateWidget)
 *
 * 逆向: QJT (html-sanitizer-repl.js ~900)
 */
export class AppWidget extends StatefulWidget {
  /** Widget 配置 */
  readonly config: AppWidgetConfig;

  /**
   * 创建 AppWidget。
   *
   * @param config - 应用 Widget 配置
   */
  constructor(config: AppWidgetConfig) {
    super();
    this.config = config;
  }

  /**
   * 创建关联的 AppWidgetState。
   *
   * @returns 新创建的 AppWidgetState 实例
   */
  createState(): AppWidgetState {
    return new AppWidgetState();
  }
}

// ════════════════════════════════════════════════════
//  AppWidgetState
// ════════════════════════════════════════════════════

/**
 * AppWidget 的状态管理。
 *
 * 负责构建 ThemeController -> ConfigProvider -> child 的嵌套 Widget 树。
 * 后续可扩展 initState/dispose 以管理应用级生命周期。
 *
 * 逆向: wR 基类 (tui-widget-framework.js 1784-1813)
 */
export class AppWidgetState extends State<AppWidget> {
  /**
   * 构建子 Widget 树。
   *
   * 返回 ThemeController -> ConfigProvider -> child 的嵌套结构。
   *
   * @param _context - 构建上下文
   * @returns ThemeController 根节点
   */
  build(_context: BuildContext): Widget {
    return new ThemeController({
      data: this.widget.config.themeData,
      child: new ConfigProvider({
        configService: this.widget.config.configService,
        child: this.widget.config.child,
      }),
    });
  }
}
