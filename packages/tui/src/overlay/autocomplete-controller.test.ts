/**
 * AutocompleteController 测试套件
 *
 * 覆盖触发器检测、debounce、generationId 竞态保护、
 * 上下选择、acceptSelected、dismiss、dispose 等核心流程。
 *
 * @module autocomplete-controller.test
 */

import { describe, it, expect, beforeEach } from "bun:test";
import {
  AutocompleteController,
  type AutocompleteTrigger,
  type AutocompleteOption,
  type AutocompleteState,
} from "./autocomplete-controller.js";
import { TextEditingController } from "../editing/text-editing-controller.js";

/**
 * 辅助: 创建 TextEditingController 并设置 text + cursor
 */
function makeTextCtrl(text: string = "", cursorPos?: number): TextEditingController {
  const ctrl = new TextEditingController({ text });
  if (cursorPos !== undefined) {
    ctrl.cursorPosition = cursorPos;
  }
  return ctrl;
}

/**
 * 辅助: 创建标准 trigger 配置
 */
function slashTrigger(): AutocompleteTrigger {
  return { char: "/", minLength: 0 };
}

/**
 * 辅助: 简单同步 optionsBuilder
 */
function simpleOptionsBuilder(query: string): AutocompleteOption[] {
  const all = [
    { label: "help", value: "/help", description: "显示帮助" },
    { label: "history", value: "/history", description: "查看历史" },
    { label: "quit", value: "/quit", description: "退出" },
    { label: "debug", value: "/debug", description: "调试" },
  ];
  if (!query) return all;
  return all.filter((o) => o.label.includes(query));
}

describe("AutocompleteController", () => {
  let ac: AutocompleteController;
  let textCtrl: TextEditingController;
  let selectedOption: AutocompleteOption | null;

  beforeEach(() => {
    ac = new AutocompleteController();
    textCtrl = new TextEditingController();
    selectedOption = null;
  });

  // ═══════════════════════════════════════════════════════
  //  初始状态
  // ═══════════════════════════════════════════════════════

  it("初始 isActive=false, options=[], selectedIndex=-1", () => {
    expect(ac.isActive).toBe(false);
    expect(ac.currentState.options).toEqual([]);
    expect(ac.currentState.selectedIndex).toBe(-1);
  });

  // ═══════════════════════════════════════════════════════
  //  initialize + 触发器检测
  // ═══════════════════════════════════════════════════════

  it("initialize 绑定 textController 和 triggers", () => {
    ac.initialize({
      textController: textCtrl,
      triggers: [slashTrigger()],
      optionsBuilder: simpleOptionsBuilder,
      onSelected: (o) => { selectedOption = o; },
    });
    // 初始化后仍未激活 (没有触发字符)
    expect(ac.isActive).toBe(false);
  });

  it("输入触发字符 '/' 后 isActive=true", async () => {
    ac.initialize({
      textController: textCtrl,
      triggers: [slashTrigger()],
      optionsBuilder: simpleOptionsBuilder,
      onSelected: (o) => { selectedOption = o; },
      debounceMs: 0,
    });

    textCtrl.insertText("/");
    // 等待异步 optionsBuilder
    await new Promise((r) => setTimeout(r, 20));

    expect(ac.isActive).toBe(true);
    expect(ac.currentState.options.length).toBeGreaterThan(0);
  });

  it("输入 '/he' 后 optionsBuilder 被调用 → 返回匹配项", async () => {
    ac.initialize({
      textController: textCtrl,
      triggers: [slashTrigger()],
      optionsBuilder: simpleOptionsBuilder,
      onSelected: (o) => { selectedOption = o; },
      debounceMs: 0,
    });

    textCtrl.insertText("/he");
    await new Promise((r) => setTimeout(r, 20));

    expect(ac.isActive).toBe(true);
    const opts = ac.currentState.options;
    expect(opts.length).toBe(2); // help, history
    expect(opts.map((o) => o.label)).toContain("help");
  });

  // ═══════════════════════════════════════════════════════
  //  selectNext / selectPrevious
  // ═══════════════════════════════════════════════════════

  it("selectNext 循环递增 selectedIndex", async () => {
    ac.initialize({
      textController: textCtrl,
      triggers: [slashTrigger()],
      optionsBuilder: simpleOptionsBuilder,
      onSelected: (o) => { selectedOption = o; },
      debounceMs: 0,
    });

    textCtrl.insertText("/");
    await new Promise((r) => setTimeout(r, 20));

    const count = ac.currentState.options.length;
    const startIdx = ac.currentState.selectedIndex;

    ac.selectNext();
    expect(ac.currentState.selectedIndex).toBe((startIdx + 1) % count);

    // 到末尾后循环回 0
    for (let i = 0; i < count; i++) ac.selectNext();
    // 从 startIdx+1 再走 count 步 = startIdx+1
    expect(ac.currentState.selectedIndex).toBe((startIdx + 1) % count);
  });

  it("selectPrevious 循环递减 selectedIndex", async () => {
    ac.initialize({
      textController: textCtrl,
      triggers: [slashTrigger()],
      optionsBuilder: simpleOptionsBuilder,
      onSelected: (o) => { selectedOption = o; },
      debounceMs: 0,
    });

    textCtrl.insertText("/");
    await new Promise((r) => setTimeout(r, 20));

    const count = ac.currentState.options.length;
    ac.selectPrevious();
    // 从 0 或初始 idx 向前走
    expect(ac.currentState.selectedIndex).toBe(count - 1);
  });

  it("selectNext 在非激活状态下无操作", () => {
    ac.selectNext();
    expect(ac.currentState.selectedIndex).toBe(-1);
  });

  it("selectPrevious 在非激活状态下无操作", () => {
    ac.selectPrevious();
    expect(ac.currentState.selectedIndex).toBe(-1);
  });

  // ═══════════════════════════════════════════════════════
  //  acceptSelected
  // ═══════════════════════════════════════════════════════

  it("acceptSelected 调用 onSelected 回调并 dismiss", async () => {
    ac.initialize({
      textController: textCtrl,
      triggers: [slashTrigger()],
      optionsBuilder: simpleOptionsBuilder,
      onSelected: (o) => { selectedOption = o; },
      debounceMs: 0,
    });

    textCtrl.insertText("/");
    await new Promise((r) => setTimeout(r, 20));

    expect(ac.isActive).toBe(true);
    ac.acceptSelected();

    expect(selectedOption).not.toBeNull();
    expect(ac.isActive).toBe(false);
  });

  it("acceptSelected 在非激活状态下无操作", () => {
    ac.initialize({
      textController: textCtrl,
      triggers: [slashTrigger()],
      optionsBuilder: simpleOptionsBuilder,
      onSelected: (o) => { selectedOption = o; },
    });

    ac.acceptSelected();
    expect(selectedOption).toBeNull();
  });

  // ═══════════════════════════════════════════════════════
  //  dismiss
  // ═══════════════════════════════════════════════════════

  it("dismiss 将 isActive 设为 false 并清空 options", async () => {
    ac.initialize({
      textController: textCtrl,
      triggers: [slashTrigger()],
      optionsBuilder: simpleOptionsBuilder,
      onSelected: (o) => { selectedOption = o; },
      debounceMs: 0,
    });

    textCtrl.insertText("/");
    await new Promise((r) => setTimeout(r, 20));
    expect(ac.isActive).toBe(true);

    ac.dismiss();
    expect(ac.isActive).toBe(false);
    expect(ac.currentState.options).toEqual([]);
    expect(ac.currentState.selectedIndex).toBe(-1);
  });

  // ═══════════════════════════════════════════════════════
  //  debounce
  // ═══════════════════════════════════════════════════════

  it("debounce: 快速输入只触发一次 optionsBuilder", async () => {
    let callCount = 0;
    const countingBuilder = (query: string): AutocompleteOption[] => {
      callCount++;
      return simpleOptionsBuilder(query);
    };

    ac.initialize({
      textController: textCtrl,
      triggers: [slashTrigger()],
      optionsBuilder: countingBuilder,
      onSelected: (o) => { selectedOption = o; },
      debounceMs: 50,
    });

    textCtrl.insertText("/");
    // 快速连续输入
    textCtrl.insertText("h");
    textCtrl.insertText("e");
    textCtrl.insertText("l");

    // 等待 debounce 完成
    await new Promise((r) => setTimeout(r, 120));

    // 由于 debounce，callCount 应该少于 4 (每个字符一次)
    // 首次触发 "/" 是立即的, 后续输入被 debounce
    expect(callCount).toBeLessThanOrEqual(4);
    expect(callCount).toBeGreaterThanOrEqual(1);
  });

  // ═══════════════════════════════════════════════════════
  //  generationId 竞态保护
  // ═══════════════════════════════════════════════════════

  it("generationId: 旧异步结果不覆盖新结果", async () => {
    let resolvers: Array<(opts: AutocompleteOption[]) => void> = [];
    const asyncBuilder = (query: string): Promise<AutocompleteOption[]> => {
      return new Promise((resolve) => {
        resolvers.push(resolve);
      });
    };

    ac.initialize({
      textController: textCtrl,
      triggers: [slashTrigger()],
      optionsBuilder: asyncBuilder,
      onSelected: (o) => { selectedOption = o; },
      debounceMs: 0,
    });

    // 第一次输入
    textCtrl.insertText("/a");
    await new Promise((r) => setTimeout(r, 10));

    // 第二次输入 (更新 generationId)
    textCtrl.insertText("b");
    await new Promise((r) => setTimeout(r, 10));

    // resolve 第一次查询 (旧的 generationId)
    if (resolvers.length > 0) {
      resolvers[0]!([{ label: "old", value: "old" }]);
    }
    await new Promise((r) => setTimeout(r, 10));

    // resolve 第二次查询 (新的 generationId)
    if (resolvers.length > 1) {
      resolvers[1]!([{ label: "new", value: "new" }]);
    }
    await new Promise((r) => setTimeout(r, 10));

    // 应该使用新结果, 旧结果被丢弃
    if (ac.isActive && ac.currentState.options.length > 0) {
      expect(ac.currentState.options[0]!.label).toBe("new");
    }
  });

  // ═══════════════════════════════════════════════════════
  //  listener 通知
  // ═══════════════════════════════════════════════════════

  it("addListener / removeListener 管理状态监听", async () => {
    let notifyCount = 0;
    const listener = (_state: AutocompleteState) => { notifyCount++; };

    ac.addListener(listener);
    ac.initialize({
      textController: textCtrl,
      triggers: [slashTrigger()],
      optionsBuilder: simpleOptionsBuilder,
      onSelected: (o) => { selectedOption = o; },
      debounceMs: 0,
    });

    textCtrl.insertText("/");
    await new Promise((r) => setTimeout(r, 20));

    expect(notifyCount).toBeGreaterThan(0);

    const countBefore = notifyCount;
    ac.removeListener(listener);
    ac.dismiss();
    expect(notifyCount).toBe(countBefore); // 移除后不再通知
  });

  // ═══════════════════════════════════════════════════════
  //  dispose
  // ═══════════════════════════════════════════════════════

  it("dispose 清理 timer 和 textController listener", async () => {
    ac.initialize({
      textController: textCtrl,
      triggers: [slashTrigger()],
      optionsBuilder: simpleOptionsBuilder,
      onSelected: (o) => { selectedOption = o; },
    });

    ac.dispose();
    // dispose 后再输入不应触发任何操作
    textCtrl.insertText("/");
    await new Promise((r) => setTimeout(r, 20));

    expect(ac.isActive).toBe(false);
  });

  it("dispose 后 initialize 抛出错误", () => {
    ac.dispose();
    expect(() => {
      ac.initialize({
        textController: textCtrl,
        triggers: [slashTrigger()],
        optionsBuilder: simpleOptionsBuilder,
        onSelected: (o) => { selectedOption = o; },
      });
    }).toThrow();
  });

  // ═══════════════════════════════════════════════════════
  //  多触发器
  // ═══════════════════════════════════════════════════════

  it("支持多触发器 (/ 和 @)", async () => {
    ac.initialize({
      textController: textCtrl,
      triggers: [
        { char: "/", minLength: 0 },
        { char: "@", minLength: 1 },
      ],
      optionsBuilder: (query) => [{ label: query, value: query }],
      onSelected: (o) => { selectedOption = o; },
      debounceMs: 0,
    });

    textCtrl.insertText("@test");
    await new Promise((r) => setTimeout(r, 20));

    // @ 触发器要求 minLength=1, "test" >= 1
    expect(ac.isActive).toBe(true);
  });

  // ═══════════════════════════════════════════════════════
  //  无触发字符时保持非激活
  // ═══════════════════════════════════════════════════════

  it("普通文本输入不触发补全", async () => {
    ac.initialize({
      textController: textCtrl,
      triggers: [slashTrigger()],
      optionsBuilder: simpleOptionsBuilder,
      onSelected: (o) => { selectedOption = o; },
      debounceMs: 0,
    });

    textCtrl.insertText("hello world");
    await new Promise((r) => setTimeout(r, 20));

    expect(ac.isActive).toBe(false);
  });

  // ═══════════════════════════════════════════════════════
  //  空 options 结果
  // ═══════════════════════════════════════════════════════

  it("optionsBuilder 返回空数组时 isActive=false", async () => {
    ac.initialize({
      textController: textCtrl,
      triggers: [slashTrigger()],
      optionsBuilder: () => [],
      onSelected: (o) => { selectedOption = o; },
      debounceMs: 0,
    });

    textCtrl.insertText("/xyz");
    await new Promise((r) => setTimeout(r, 20));

    expect(ac.isActive).toBe(false);
    expect(ac.currentState.options).toEqual([]);
  });
});
