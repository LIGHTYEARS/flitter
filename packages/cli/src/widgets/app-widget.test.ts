/**
 * AppWidget + ThreadStateWidget 测试。
 *
 * 验证:
 * - AppWidget.createState 返回 AppWidgetState
 * - AppWidgetState.build 返回 ThemeController 根节点
 * - ThemeController child 为 AppThemeController
 * - AppThemeController child 为 ConfigProvider
 * - ConfigProvider child 为 config.child
 * - ThreadStateWidget.createState 返回 ThreadStateWidgetState
 * - ThreadStateWidgetState.build 返回 config.child
 * - setState 调用 context.element.markNeedsRebuild
 * - setState 在 unmounted 时抛出 Error
 *
 * @module
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Column, State, StatefulWidget } from "@flitter/tui";
import { AppThemeController } from "./app-theme-controller.js";
import { AppWidget, AppWidgetState } from "./app-widget.js";
import { ConfigProvider } from "./config-provider.js";
import { ThemeController, type ThemeData } from "./theme-controller.js";
import { ThreadStateWidget, ThreadStateWidgetState } from "./thread-state-widget.js";

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
    assert.ok(widget instanceof StatefulWidget);
  });

  it("createState 返回 AppWidgetState", () => {
    const child = new StubWidget();
    const widget = new AppWidget({
      themeData: createThemeData(),
      configService: {},
      child,
    });
    const state = widget.createState();
    assert.ok(state instanceof AppWidgetState);
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
    assert.ok(built instanceof ThemeController);
  });

  it("ThemeController child 为 AppThemeController", () => {
    const child = new StubWidget();
    const themeData = createThemeData();
    const configService = { key: "value" };
    const widget = new AppWidget({ themeData, configService, child });
    const state = widget.createState() as AppWidgetState;

    (state as unknown as { _widget: typeof widget })._widget = widget;
    (state as unknown as { _mounted: boolean })._mounted = true;

    const built = state.build({} as never) as ThemeController;
    assert.ok((built as unknown as { child: unknown }).child instanceof AppThemeController);
  });

  it("AppThemeController child 为 ConfigProvider", () => {
    const child = new StubWidget();
    const themeData = createThemeData();
    const configService = { key: "value" };
    const widget = new AppWidget({ themeData, configService, child });
    const state = widget.createState() as AppWidgetState;

    (state as unknown as { _widget: typeof widget })._widget = widget;
    (state as unknown as { _mounted: boolean })._mounted = true;

    const built = state.build({} as never) as ThemeController;
    const appThemeCtrl = (built as unknown as { child: unknown }).child as AppThemeController;
    assert.ok((appThemeCtrl as unknown as { child: unknown }).child instanceof ConfigProvider);
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
    const appThemeCtrl = (built as unknown as { child: unknown }).child as AppThemeController;
    const configProvider = (appThemeCtrl as unknown as { child: unknown }).child as ConfigProvider;
    assert.equal((configProvider as unknown as { child: unknown }).child, child);
  });
});

// ════════════════════════════════════════════════════
//  ThreadStateWidget 测试
// ════════════════════════════════════════════════════

describe("ThreadStateWidget", () => {
  it("继承 StatefulWidget", () => {
    const widget = new ThreadStateWidget({
      threadStore: { observeThread: () => undefined },
      threadWorker: { events$: { subscribe: () => ({ unsubscribe: () => {}, closed: false }) } },
      threadId: "test",
      onSubmit: () => {},
    });
    assert.ok(widget instanceof StatefulWidget);
  });

  it("createState 返回 ThreadStateWidgetState", () => {
    const widget = new ThreadStateWidget({
      threadStore: { observeThread: () => undefined },
      threadWorker: { events$: { subscribe: () => ({ unsubscribe: () => {}, closed: false }) } },
      threadId: "test",
      onSubmit: () => {},
    });
    const state = widget.createState();
    assert.ok(state instanceof ThreadStateWidgetState);
  });

  it("build 返回 Column 布局", () => {
    const widget = new ThreadStateWidget({
      threadStore: { observeThread: () => undefined },
      threadWorker: { events$: { subscribe: () => ({ unsubscribe: () => {}, closed: false }) } },
      threadId: "test-thread",
      onSubmit: () => {},
    });
    const state = widget.createState() as ThreadStateWidgetState;

    (state as unknown as { _widget: typeof widget })._widget = widget;
    (state as unknown as { _mounted: boolean })._mounted = true;

    const built = state.build({} as never);
    assert.ok(built instanceof Column);
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

    let rebuildCount = 0;
    const markNeedsRebuild = () => {
      rebuildCount++;
    };
    (state as unknown as { _widget: typeof widget })._widget = widget;
    (state as unknown as { _mounted: boolean })._mounted = true;
    (state as unknown as { _element: unknown })._element = { markNeedsRebuild };

    let called = false;
    state.setState(() => {
      called = true;
    });

    assert.ok(called);
    assert.equal(rebuildCount, 1);
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
    assert.throws(() => state.setState());
  });
});
