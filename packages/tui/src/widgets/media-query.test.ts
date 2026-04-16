/**
 * MediaQuery + MediaQueryData 测试。
 *
 * 测试覆盖:
 * - MediaQueryData 构造与属性访问
 * - MediaQueryData 便捷 getter (supportsEmojiWidth, supportsSyncOutput)
 * - MediaQuery.createElement 返回 InheritedElement
 * - MediaQuery.updateShouldNotify (size/capabilities 变化检测)
 * - MediaQuery.of / sizeOf / capabilitiesOf 静态方法
 *
 * @module
 */

import { describe, expect, test } from "bun:test";
import type { Key, Widget } from "../tree/element.js";
import { Element } from "../tree/element.js";
import { InheritedElement } from "../tree/inherited-element.js";
import type { TerminalCapabilities } from "../tui/tui-controller.js";
import { MediaQuery, MediaQueryData } from "./media-query.js";

// ════════════════════════════════════════════════════
//  测试辅助
// ════════════════════════════════════════════════════

/** 创建默认终端能力 */
function defaultCaps(overrides: Partial<TerminalCapabilities> = {}): TerminalCapabilities {
  return {
    emojiWidth: false,
    syncOutput: false,
    kittyKeyboard: false,
    colorPaletteNotifications: false,
    xtversion: null,
    ...overrides,
  };
}

/** 创建默认尺寸 */
function defaultSize(w = 80, h = 24): { width: number; height: number } {
  return { width: w, height: h };
}

/** 创建 MediaQueryData */
function makeData(
  size?: { width: number; height: number },
  caps?: TerminalCapabilities,
): MediaQueryData {
  return new MediaQueryData(size ?? defaultSize(), caps ?? defaultCaps());
}

/** 最小占位子 Widget */
class DummyWidget implements Widget {
  key: Key | undefined = undefined;
  canUpdate(other: Widget): boolean {
    return other.constructor === this.constructor;
  }
  createElement(): Element {
    return new DummyElement(this);
  }
}

class DummyElement extends Element {}

// ════════════════════════════════════════════════════
//  MediaQueryData 测试
// ════════════════════════════════════════════════════

describe("MediaQueryData", () => {
  test("构造: size 和 capabilities 正确设置", () => {
    const size = { width: 120, height: 40 };
    const caps = defaultCaps({ emojiWidth: true });
    const data = new MediaQueryData(size, caps);

    expect(data.size).toBe(size);
    expect(data.size.width).toBe(120);
    expect(data.size.height).toBe(40);
    expect(data.capabilities).toBe(caps);
    expect(data.capabilities.emojiWidth).toBe(true);
  });

  test("supportsEmojiWidth getter: emojiWidth=true 时返回 true", () => {
    const data = makeData(undefined, defaultCaps({ emojiWidth: true }));
    expect(data.supportsEmojiWidth).toBe(true);
  });

  test("supportsEmojiWidth getter: emojiWidth=false 时返回 false", () => {
    const data = makeData(undefined, defaultCaps({ emojiWidth: false }));
    expect(data.supportsEmojiWidth).toBe(false);
  });

  test("supportsSyncOutput getter: syncOutput=true 时返回 true", () => {
    const data = makeData(undefined, defaultCaps({ syncOutput: true }));
    expect(data.supportsSyncOutput).toBe(true);
  });

  test("supportsSyncOutput getter: syncOutput=false 时返回 false", () => {
    const data = makeData(undefined, defaultCaps({ syncOutput: false }));
    expect(data.supportsSyncOutput).toBe(false);
  });
});

// ════════════════════════════════════════════════════
//  MediaQuery 测试
// ════════════════════════════════════════════════════

describe("MediaQuery", () => {
  test("createElement 返回 InheritedElement", () => {
    const data = makeData();
    const child = new DummyWidget();
    const mq = new MediaQuery({ data, child });
    const el = mq.createElement();
    expect(el).toBeInstanceOf(InheritedElement);
  });

  test("updateShouldNotify: size width 变化返回 true", () => {
    const child = new DummyWidget();
    const oldMq = new MediaQuery({ data: makeData(defaultSize(80, 24)), child });
    const newMq = new MediaQuery({ data: makeData(defaultSize(120, 24)), child });
    expect(newMq.updateShouldNotify(oldMq)).toBe(true);
  });

  test("updateShouldNotify: size height 变化返回 true", () => {
    const child = new DummyWidget();
    const oldMq = new MediaQuery({ data: makeData(defaultSize(80, 24)), child });
    const newMq = new MediaQuery({ data: makeData(defaultSize(80, 40)), child });
    expect(newMq.updateShouldNotify(oldMq)).toBe(true);
  });

  test("updateShouldNotify: capabilities emojiWidth 变化返回 true", () => {
    const child = new DummyWidget();
    const oldMq = new MediaQuery({
      data: makeData(undefined, defaultCaps({ emojiWidth: false })),
      child,
    });
    const newMq = new MediaQuery({
      data: makeData(undefined, defaultCaps({ emojiWidth: true })),
      child,
    });
    expect(newMq.updateShouldNotify(oldMq)).toBe(true);
  });

  test("updateShouldNotify: capabilities syncOutput 变化返回 true", () => {
    const child = new DummyWidget();
    const oldMq = new MediaQuery({
      data: makeData(undefined, defaultCaps({ syncOutput: false })),
      child,
    });
    const newMq = new MediaQuery({
      data: makeData(undefined, defaultCaps({ syncOutput: true })),
      child,
    });
    expect(newMq.updateShouldNotify(oldMq)).toBe(true);
  });

  test("updateShouldNotify: 相同数据返回 false", () => {
    const child = new DummyWidget();
    const caps = defaultCaps({ emojiWidth: true, syncOutput: true });
    const size = defaultSize(100, 30);
    const oldMq = new MediaQuery({
      data: new MediaQueryData(size, caps),
      child,
    });
    // 使用相同值的新对象
    const newMq = new MediaQuery({
      data: new MediaQueryData({ width: 100, height: 30 }, { ...caps }),
      child,
    });
    expect(newMq.updateShouldNotify(oldMq)).toBe(false);
  });

  test("of: 在祖先树中找到 MediaQuery 并返回 data", () => {
    const data = makeData(defaultSize(120, 40));
    const child = new DummyWidget();
    const mq = new MediaQuery({ data, child });

    // 构建简易树: MediaQuery(InheritedElement) -> DummyElement
    const mqElement = mq.createElement();
    mqElement.mount(undefined);

    // 取出挂载后的子元素 (InheritedElement.mount 自动创建并挂载 child)
    const childElement = mqElement.children[0]!;
    expect(childElement).toBeDefined();

    // 通过子元素的 dependOnInheritedWidgetOfExactType 查找 MediaQuery
    const result = MediaQuery.of(childElement);
    expect(result).toBe(data);
    expect(result.size.width).toBe(120);
    expect(result.size.height).toBe(40);
  });

  test("of: 无 MediaQuery 时抛出 Error", () => {
    const child = new DummyWidget();
    const childElement = child.createElement();
    childElement.mount(undefined);

    expect(() => MediaQuery.of(childElement)).toThrow("MediaQuery not found in ancestor tree");
  });

  test("sizeOf: 便捷方法正确返回 size", () => {
    const size = { width: 200, height: 50 };
    const data = new MediaQueryData(size, defaultCaps());
    const child = new DummyWidget();
    const mq = new MediaQuery({ data, child });

    const mqElement = mq.createElement();
    mqElement.mount(undefined);
    const childElement = mqElement.children[0]!;

    const result = MediaQuery.sizeOf(childElement);
    expect(result).toBe(size);
    expect(result.width).toBe(200);
    expect(result.height).toBe(50);
  });

  test("capabilitiesOf: 便捷方法正确返回 capabilities", () => {
    const caps = defaultCaps({ emojiWidth: true, syncOutput: true });
    const data = new MediaQueryData(defaultSize(), caps);
    const child = new DummyWidget();
    const mq = new MediaQuery({ data, child });

    const mqElement = mq.createElement();
    mqElement.mount(undefined);
    const childElement = mqElement.children[0]!;

    const result = MediaQuery.capabilitiesOf(childElement);
    expect(result).toBe(caps);
    expect(result.emojiWidth).toBe(true);
    expect(result.syncOutput).toBe(true);
  });
});
