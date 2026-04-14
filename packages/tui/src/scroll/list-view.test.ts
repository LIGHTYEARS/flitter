/**
 * ListView Widget 单元测试。
 *
 * TDD RED: 先编写全部测试用例，再实现功能代码。
 * 覆盖场景：固定行高、可变行高、空列表、缓冲区、controller 生命周期、越界保护。
 *
 * @module
 */

import { describe, expect, it } from "bun:test";
import { ListView } from "./list-view.js";
import { ScrollController } from "./scroll-controller.js";

// ════════════════════════════════════════════════════
//  辅助工具
// ════════════════════════════════════════════════════

/** 跟踪 itemBuilder 调用的 index 集合 */
function createTrackingBuilder(): {
  builder: (index: number) => { type: "item"; index: number };
  calledIndices: number[];
} {
  const calledIndices: number[] = [];
  const builder = (index: number) => {
    calledIndices.push(index);
    return { type: "item" as const, index };
  };
  return { builder, calledIndices };
}

// ════════════════════════════════════════════════════
//  ListView — 固定 itemExtent 场景
// ════════════════════════════════════════════════════

describe("ListView", () => {
  describe("fixed itemExtent", () => {
    it("should calculate maxScrollExtent correctly (100 items * 1 row - 20 viewport = 80)", () => {
      const controller = new ScrollController();
      controller.disableFollowMode();
      const { builder } = createTrackingBuilder();

      const listView = new ListView({
        itemCount: 100,
        itemBuilder: builder,
        itemExtent: 1,
        controller,
      });

      // performLayout 需要 viewportHeight
      listView.performLayout(20, 80);

      expect(controller.maxScrollExtent).toBe(80);
      controller.dispose();
    });

    it("should only build visible + buffer items at offset=0 (viewport=20, cache=5)", () => {
      const controller = new ScrollController();
      controller.disableFollowMode();
      const { builder, calledIndices } = createTrackingBuilder();

      const listView = new ListView({
        itemCount: 100,
        itemBuilder: builder,
        itemExtent: 1,
        controller,
        cacheExtent: 5,
      });

      controller.jumpTo(0);
      listView.performLayout(20, 80);

      // offset=0, viewport=20, cache=5: 应构建 index 0..24
      // firstVisible=0, lastVisible=19, 扩展 cache: max(0, 0-5)..min(99, 19+5) = 0..24
      expect(calledIndices.length).toBe(25);
      expect(calledIndices[0]).toBe(0);
      expect(calledIndices[calledIndices.length - 1]).toBe(24);
      controller.dispose();
    });

    it("should only build visible + buffer items at offset=50 (viewport=20, cache=5)", () => {
      const controller = new ScrollController();
      controller.disableFollowMode();
      const { builder, calledIndices } = createTrackingBuilder();

      const listView = new ListView({
        itemCount: 100,
        itemBuilder: builder,
        itemExtent: 1,
        controller,
        cacheExtent: 5,
      });

      // 先设置 maxScrollExtent 以允许 jumpTo
      controller.updateMaxScrollExtent(80);
      controller.jumpTo(50);
      listView.performLayout(20, 80);

      // offset=50, viewport=20: visible 50..69, cache=5: 45..74
      expect(calledIndices.length).toBe(30); // 45..74 inclusive = 30 items
      expect(calledIndices[0]).toBe(45);
      expect(calledIndices[calledIndices.length - 1]).toBe(74);
      controller.dispose();
    });

    it("should clamp visible range to [0, itemCount-1] at offset near end", () => {
      const controller = new ScrollController();
      controller.disableFollowMode();
      const { builder, calledIndices } = createTrackingBuilder();

      const listView = new ListView({
        itemCount: 100,
        itemBuilder: builder,
        itemExtent: 1,
        controller,
        cacheExtent: 5,
      });

      controller.updateMaxScrollExtent(80);
      controller.jumpTo(80); // 滚到最底部
      listView.performLayout(20, 80);

      // offset=80, viewport=20: visible 80..99, cache=5: 75..99 (clamp at 99)
      expect(calledIndices[0]).toBe(75);
      expect(calledIndices[calledIndices.length - 1]).toBe(99);
      expect(calledIndices.length).toBe(25); // 75..99 = 25 items
      controller.dispose();
    });

    it("should handle itemCount < viewport (no scrolling needed)", () => {
      const controller = new ScrollController();
      controller.disableFollowMode();
      const { builder, calledIndices } = createTrackingBuilder();

      const listView = new ListView({
        itemCount: 5,
        itemBuilder: builder,
        itemExtent: 1,
        controller,
      });

      listView.performLayout(20, 80);

      expect(controller.maxScrollExtent).toBe(0);
      expect(calledIndices.length).toBe(5); // 所有 5 个都可见
      controller.dispose();
    });

    it("should handle itemExtent > 1 (multi-row items)", () => {
      const controller = new ScrollController();
      controller.disableFollowMode();
      const { builder, calledIndices } = createTrackingBuilder();

      const listView = new ListView({
        itemCount: 50,
        itemBuilder: builder,
        itemExtent: 3,
        controller,
        cacheExtent: 2,
      });

      controller.jumpTo(0);
      listView.performLayout(20, 80);

      // totalHeight = 50 * 3 = 150
      // maxScrollExtent = 150 - 20 = 130
      expect(controller.maxScrollExtent).toBe(130);

      // offset=0, viewport=20, itemExtent=3:
      // firstVisible = floor(0/3) = 0
      // lastVisible = min(49, ceil((0+20)/3)-1) = min(49, 6) = 6
      // cache=2: max(0, 0-2)..min(49, 6+2) = 0..8
      expect(calledIndices[0]).toBe(0);
      expect(calledIndices[calledIndices.length - 1]).toBe(8);
      controller.dispose();
    });
  });

  // ════════════════════════════════════════════════════
  //  空列表
  // ════════════════════════════════════════════════════

  describe("empty list", () => {
    it("should handle itemCount=0 with maxScrollExtent=0", () => {
      const controller = new ScrollController();
      controller.disableFollowMode();
      const { builder, calledIndices } = createTrackingBuilder();

      const listView = new ListView({
        itemCount: 0,
        itemBuilder: builder,
        itemExtent: 1,
        controller,
      });

      listView.performLayout(20, 80);

      expect(controller.maxScrollExtent).toBe(0);
      expect(calledIndices.length).toBe(0);
      controller.dispose();
    });

    it("should handle itemCount=0 without itemExtent", () => {
      const controller = new ScrollController();
      controller.disableFollowMode();
      const { builder, calledIndices } = createTrackingBuilder();

      const listView = new ListView({
        itemCount: 0,
        itemBuilder: builder,
        controller,
      });

      listView.performLayout(20, 80);

      expect(controller.maxScrollExtent).toBe(0);
      expect(calledIndices.length).toBe(0);
      controller.dispose();
    });
  });

  // ════════════════════════════════════════════════════
  //  controller 管理
  // ════════════════════════════════════════════════════

  describe("controller management", () => {
    it("should auto-create controller when not provided", () => {
      const { builder } = createTrackingBuilder();

      const listView = new ListView({
        itemCount: 10,
        itemBuilder: builder,
        itemExtent: 1,
      });

      expect(listView.controller).toBeDefined();
      expect(listView.controller).toBeInstanceOf(ScrollController);

      // 自管理 controller dispose 由 ListView.dispose 处理
      listView.dispose();
    });

    it("should use external controller when provided", () => {
      const controller = new ScrollController();
      const { builder } = createTrackingBuilder();

      const listView = new ListView({
        itemCount: 10,
        itemBuilder: builder,
        itemExtent: 1,
        controller,
      });

      expect(listView.controller).toBe(controller);
      controller.dispose();
    });

    it("should dispose auto-created controller on ListView.dispose()", () => {
      const { builder } = createTrackingBuilder();

      const listView = new ListView({
        itemCount: 10,
        itemBuilder: builder,
        itemExtent: 1,
      });

      const ctrl = listView.controller;
      expect(ctrl.disposed).toBe(false);

      listView.dispose();
      expect(ctrl.disposed).toBe(true);
    });

    it("should NOT dispose external controller on ListView.dispose()", () => {
      const controller = new ScrollController();
      const { builder } = createTrackingBuilder();

      const listView = new ListView({
        itemCount: 10,
        itemBuilder: builder,
        itemExtent: 1,
        controller,
      });

      listView.dispose();
      expect(controller.disposed).toBe(false);
      controller.dispose();
    });
  });

  // ════════════════════════════════════════════════════
  //  默认 cacheExtent
  // ════════════════════════════════════════════════════

  describe("default cacheExtent", () => {
    it("should default cacheExtent to 5", () => {
      const controller = new ScrollController();
      controller.disableFollowMode();
      const { builder, calledIndices } = createTrackingBuilder();

      const listView = new ListView({
        itemCount: 100,
        itemBuilder: builder,
        itemExtent: 1,
        controller,
      });

      controller.jumpTo(0);
      listView.performLayout(20, 80);

      // default cacheExtent=5: items 0..24 = 25 items
      expect(calledIndices.length).toBe(25);
      controller.dispose();
    });
  });

  // ════════════════════════════════════════════════════
  //  越界防护 (T-06-04)
  // ════════════════════════════════════════════════════

  describe("index bounds protection (T-06-04)", () => {
    it("should clamp firstVisibleIndex >= 0", () => {
      const controller = new ScrollController();
      controller.disableFollowMode();
      const { builder, calledIndices } = createTrackingBuilder();

      const listView = new ListView({
        itemCount: 3,
        itemBuilder: builder,
        itemExtent: 1,
        controller,
        cacheExtent: 10, // cache 远大于 itemCount
      });

      controller.jumpTo(0);
      listView.performLayout(20, 80);

      // 所有 3 项都应可见，不应有负数 index
      expect(calledIndices.every((i) => i >= 0)).toBe(true);
      expect(calledIndices.every((i) => i < 3)).toBe(true);
      controller.dispose();
    });

    it("should clamp lastVisibleIndex <= itemCount-1", () => {
      const controller = new ScrollController();
      controller.disableFollowMode();
      const { builder, calledIndices } = createTrackingBuilder();

      const listView = new ListView({
        itemCount: 10,
        itemBuilder: builder,
        itemExtent: 1,
        controller,
        cacheExtent: 100, // cache 远大于 itemCount
      });

      controller.jumpTo(0);
      listView.performLayout(20, 80);

      // 所有 10 项都可见，不应超出 itemCount
      expect(calledIndices.every((i) => i >= 0)).toBe(true);
      expect(calledIndices.every((i) => i < 10)).toBe(true);
      expect(calledIndices.length).toBe(10);
      controller.dispose();
    });
  });

  // ════════════════════════════════════════════════════
  //  可变行高 (无 itemExtent) 场景
  // ════════════════════════════════════════════════════

  describe("variable item height (no itemExtent)", () => {
    it("should layout items with variable heights and compute maxScrollExtent", () => {
      const controller = new ScrollController();
      controller.disableFollowMode();

      // 模拟可变高度: 每项高度 = index + 1
      // item 0: height=1, item 1: height=2, ..., item 9: height=10
      // totalHeight = 1+2+3+...+10 = 55
      const heights = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const calledIndices: number[] = [];
      const builder = (index: number) => {
        calledIndices.push(index);
        return { type: "item" as const, index, height: heights[index]! };
      };

      const listView = new ListView({
        itemCount: 10,
        itemBuilder: builder,
        controller,
        // 不提供 itemExtent → 可变高度模式
        // 使用 itemHeightProvider 或通过 builder 返回值中的 height 属性
      });

      // 提供一个 itemHeight 查询函数
      listView.setItemHeightProvider((index: number) => heights[index]!);
      listView.performLayout(20, 80);

      // totalHeight = 55, viewport = 20
      // maxScrollExtent = 55 - 20 = 35
      expect(controller.maxScrollExtent).toBe(35);
      controller.dispose();
    });
  });

  // ════════════════════════════════════════════════════
  //  getVisibleRange API
  // ════════════════════════════════════════════════════

  describe("getVisibleRange", () => {
    it("should return correct visible index range", () => {
      const controller = new ScrollController();
      controller.disableFollowMode();
      const { builder } = createTrackingBuilder();

      const listView = new ListView({
        itemCount: 100,
        itemBuilder: builder,
        itemExtent: 1,
        controller,
      });

      controller.updateMaxScrollExtent(80);
      controller.jumpTo(30);
      listView.performLayout(20, 80);

      const range = listView.getVisibleRange();
      expect(range.first).toBe(30);
      expect(range.last).toBe(49);
      controller.dispose();
    });
  });

  // ════════════════════════════════════════════════════
  //  大数据量懒加载 (T-06-03)
  // ════════════════════════════════════════════════════

  describe("large dataset lazy loading (T-06-03)", () => {
    it("should only build viewport + buffer items even with 100000 total items", () => {
      const controller = new ScrollController();
      controller.disableFollowMode();
      const { builder, calledIndices } = createTrackingBuilder();

      const listView = new ListView({
        itemCount: 100000,
        itemBuilder: builder,
        itemExtent: 1,
        controller,
        cacheExtent: 5,
      });

      controller.updateMaxScrollExtent(99980);
      controller.jumpTo(50000);
      listView.performLayout(20, 80);

      // 应该只构建 ~30 个 Widget (viewport 20 + cache 5*2)
      expect(calledIndices.length).toBeLessThanOrEqual(35);
      expect(calledIndices.length).toBeGreaterThanOrEqual(25);
      // 不应构建全部 100000 个
      expect(calledIndices.length).toBeLessThan(100);
      controller.dispose();
    });
  });
});
