/**
 * ThemeController + ConfigProvider 单元测试。
 *
 * 覆盖 ThemeController 和 ConfigProvider 作为 InheritedWidget 子类的:
 * - createElement 返回 InheritedElement
 * - updateShouldNotify 判断
 * - of() 静态方法上下文查找
 * - of() 无祖先时抛出 Error
 *
 * 运行方式:
 * ```bash
 * npx tsx --test packages/cli/src/widgets/theme-controller.test.ts
 * ```
 *
 * @module
 */

import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { InheritedElement } from "@flitter/tui";
import type { Key, Widget } from "@flitter/tui";
import { Element } from "@flitter/tui";
import { setBuildOwner, type BuildOwnerLike } from "@flitter/tui";
import { ThemeController, type ThemeData } from "./theme-controller.js";
import { ConfigProvider } from "./config-provider.js";

// ════════════════════════════════════════════════════
//  测试辅助
// ════════════════════════════════════════════════════

/** 最小 Widget 实现，用于作为 InheritedWidget 的 child */
class TestWidget implements Widget {
  key: Key | undefined;

  constructor(opts?: { key?: Key }) {
    this.key = opts?.key;
  }

  canUpdate(other: Widget): boolean {
    return this.constructor === other.constructor;
  }

  createElement(): Element {
    return new TestElement(this);
  }
}

/** 最小 Element 实现 */
class TestElement extends Element {
  rebuildCount = 0;

  override performRebuild(): void {
    super.performRebuild();
    this.rebuildCount++;
  }
}

/** 创建测试用 ThemeData */
function makeThemeData(name = "test-theme"): ThemeData {
  return {
    name,
    primary: "#ff0000",
    secondary: "#00ff00",
    surface: "#111111",
    background: "#000000",
    error: "#ff0000",
    text: "#ffffff",
    mutedText: "#888888",
    border: "#333333",
    accent: "#ff00ff",
    success: "#00ff00",
    warning: "#ffff00",
  };
}

afterEach(() => {
  setBuildOwner(undefined);
});

// ════════════════════════════════════════════════════
//  ThemeController
// ════════════════════════════════════════════════════

describe("ThemeController", () => {
  it("createElement 返回 InheritedElement 实例", () => {
    const child = new TestWidget();
    const data = makeThemeData();
    const tc = new ThemeController({ data, child });
    const element = tc.createElement();

    assert.ok(element instanceof InheritedElement);
  });

  it("updateShouldNotify: 不同 data 引用返回 true", () => {
    const child = new TestWidget();
    const data1 = makeThemeData("dark");
    const data2 = makeThemeData("light");
    const tc1 = new ThemeController({ data: data1, child });
    const tc2 = new ThemeController({ data: data2, child });

    assert.strictEqual(tc2.updateShouldNotify(tc1), true);
  });

  it("updateShouldNotify: 同一 data 引用返回 false", () => {
    const child = new TestWidget();
    const data = makeThemeData();
    const tc1 = new ThemeController({ data, child });
    const tc2 = new ThemeController({ data, child });

    assert.strictEqual(tc2.updateShouldNotify(tc1), false);
  });

  it("of: 在祖先树中找到 ThemeData", () => {
    const child = new TestWidget();
    const data = makeThemeData("dark-theme");
    const tc = new ThemeController({ data, child });

    const element = tc.createElement() as InheritedElement;
    element.mount(undefined);

    const leafElement = element.children[0]!;
    const result = ThemeController.of(leafElement);

    assert.strictEqual(result, data);
    assert.strictEqual(result.name, "dark-theme");
  });

  it("of: 无 ThemeController 时抛出 Error", () => {
    const widget = new TestWidget();
    const element = widget.createElement();
    element.mount(undefined);

    assert.throws(
      () => ThemeController.of(element),
      (err: Error) => err.message.includes("ThemeController not found"),
    );
  });
});

// ════════════════════════════════════════════════════
//  ConfigProvider
// ════════════════════════════════════════════════════

describe("ConfigProvider", () => {
  it("createElement 返回 InheritedElement 实例", () => {
    const child = new TestWidget();
    const configService = { get: () => ({}) };
    const cp = new ConfigProvider({ configService, child });
    const element = cp.createElement();

    assert.ok(element instanceof InheritedElement);
  });

  it("of: 正确获取 configService", () => {
    const child = new TestWidget();
    const mockService = { get: () => ({ settings: {} }), reload: () => {} };
    const cp = new ConfigProvider({ configService: mockService, child });

    const element = cp.createElement() as InheritedElement;
    element.mount(undefined);

    const leafElement = element.children[0]!;
    const result = ConfigProvider.of(leafElement);

    assert.strictEqual(result, mockService);
  });

  it("of: 无 ConfigProvider 时抛出 Error", () => {
    const widget = new TestWidget();
    const element = widget.createElement();
    element.mount(undefined);

    assert.throws(
      () => ConfigProvider.of(element),
      (err: Error) => err.message.includes("ConfigProvider not found"),
    );
  });
});
