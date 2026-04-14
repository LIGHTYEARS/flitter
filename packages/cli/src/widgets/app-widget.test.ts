/**
 * AppWidget + ThreadStateWidget 测试。
 *
 * 验证:
 * - AppWidget.createState 返回 AppWidgetState
 * - AppWidgetState.build 返回 ThemeController 根节点
 * - ThemeController child 为 ConfigProvider
 * - ConfigProvider child 为 config.child
 * - ThreadStateWidget.createState 返回 ThreadStateWidgetState
 * - ThreadStateWidgetState.build 返回 config.child
 * - setState 调用 context.element.markNeedsRebuild
 * - setState 在 unmounted 时抛出 Error
 *
 * @module
 */

import { describe, it, expect, mock } from "bun:test";
import { AppWidget, AppWidgetState } from "./app-widget.js";
import { ThreadStateWidget, ThreadStateWidgetState } from "./thread-state-widget.js";
import { ThemeController, type ThemeData } from "./theme-controller.js";
import { ConfigProvider } from "./config-provider.js";
import { StatefulWidget, State } from "@flitter/tui";

// ─── 测试辅助 ─────────────────────────────────────────

/** 创建虚拟 ThemeData */
function createThemeData(): ThemeData {
  return {
    name: "test",
    primary: "#ff0000",
    secondary: "#00ff00",
    surface: "#ffffff",
    background: "#000000",
    error: "#ff0000",
    text: "#ffffff",
    mutedText: "#888888",
    border: "#333333",
    accent: "#0000ff",
    success: "#00ff00",
    warning: "#ffff00",
  };
}

/** 创建 stub child Widget */
class StubWidget extends StatefulWidget {
  createState(): State {
    return new StubState();
  }
}

class StubState extends State<StubWidget> {
  build() {
    return new StubWidget();
  }
}

// ════════════════════════════════════════════════════
//  AppWidget 测试
// ════════════════════════════════════════════════════

describe("AppWidget", () => {
  it("继承 StatefulWidget", () => {
    const child = new StubWidget();
    const widget = new AppWidget({
      themeData: createThemeData(),
      configService: {},
      child,
    });
    expect(widget).toBeInstanceOf(StatefulWidget);
  });

  it("createState 返回 AppWidgetState", () => {
    const child = new StubWidget();
    const widget = new AppWidget({
      themeData: createThemeData(),
      configService: {},
      child,
    });
    const state = widget.createState();
    expect(state).toBeInstanceOf(AppWidgetState);
  });

  it("build 返回 ThemeController 根节点", () => {
    const child = new StubWidget();
    const themeData = createThemeData();
    const configService = { key: "value" };
    const widget = new AppWidget({ themeData, configService, child });
    const state = widget.createState() as AppWidgetState;

    // 模拟 State 内部挂载
    (state as unknown as { _widget: typeof widget })._widget = widget;
    (state as unknown as { _mounted: boolean })._mounted = true;

    const built = state.build({} as never);
    expect(built).toBeInstanceOf(ThemeController);
  });

  it("ThemeController child 为 ConfigProvider", () => {
    const child = new StubWidget();
    const themeData = createThemeData();
    const configService = { key: "value" };
    const widget = new AppWidget({ themeData, configService, child });
    const state = widget.createState() as AppWidgetState;

    (state as unknown as { _widget: typeof widget })._widget = widget;
    (state as unknown as { _mounted: boolean })._mounted = true;

    const built = state.build({} as never) as ThemeController;
    // ThemeController 的 child 应该是 ConfigProvider
    expect((built as unknown as { _child: unknown })._child).toBeInstanceOf(ConfigProvider);
  });

  it("ConfigProvider child 为 config.child", () => {
    const child = new StubWidget();
    const themeData = createThemeData();
    const configService = { key: "value" };
    const widget = new AppWidget({ themeData, configService, child });
    const state = widget.createState() as AppWidgetState;

    (state as unknown as { _widget: typeof widget })._widget = widget;
    (state as unknown as { _mounted: boolean })._mounted = true;

    const built = state.build({} as never) as ThemeController;
    const configProvider = (built as unknown as { _child: unknown })._child as ConfigProvider;
    expect((configProvider as unknown as { _child: unknown })._child).toBe(child);
  });
});

// ════════════════════════════════════════════════════
//  ThreadStateWidget 测试
// ════════════════════════════════════════════════════

describe("ThreadStateWidget", () => {
  it("继承 StatefulWidget", () => {
    const child = new StubWidget();
    const widget = new ThreadStateWidget({
      threadStore: {},
      threadWorker: {},
      child,
    });
    expect(widget).toBeInstanceOf(StatefulWidget);
  });

  it("createState 返回 ThreadStateWidgetState", () => {
    const child = new StubWidget();
    const widget = new ThreadStateWidget({
      threadStore: {},
      threadWorker: {},
      child,
    });
    const state = widget.createState();
    expect(state).toBeInstanceOf(ThreadStateWidgetState);
  });

  it("build 返回 config.child", () => {
    const child = new StubWidget();
    const widget = new ThreadStateWidget({
      threadStore: {},
      threadWorker: {},
      child,
    });
    const state = widget.createState() as ThreadStateWidgetState;

    (state as unknown as { _widget: typeof widget })._widget = widget;
    (state as unknown as { _mounted: boolean })._mounted = true;

    const built = state.build({} as never);
    expect(built).toBe(child);
  });
});

// ════════════════════════════════════════════════════
//  State 公共行为测试
// ════════════════════════════════════════════════════

describe("State 公共行为", () => {
  it("setState 在 mounted 时调用 markNeedsRebuild", () => {
    const child = new StubWidget();
    const widget = new AppWidget({
      themeData: createThemeData(),
      configService: {},
      child,
    });
    const state = widget.createState() as AppWidgetState;

    const markNeedsRebuild = mock(() => {});
    (state as unknown as { _widget: typeof widget })._widget = widget;
    (state as unknown as { _mounted: boolean })._mounted = true;
    (state as unknown as { _element: unknown })._element = { markNeedsRebuild };

    let called = false;
    state.setState(() => { called = true; });

    expect(called).toBe(true);
    expect(markNeedsRebuild).toHaveBeenCalledTimes(1);
  });

  it("setState 在 unmounted 时抛出 Error", () => {
    const child = new StubWidget();
    const widget = new AppWidget({
      themeData: createThemeData(),
      configService: {},
      child,
    });
    const state = widget.createState() as AppWidgetState;

    // _mounted 默认是 false
    expect(() => state.setState()).toThrow();
  });
});
