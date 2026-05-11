import { describe, it, expect, beforeEach, afterEach, mock } from "bun:test";
import { JetBrainsWheelFilter, isJetBrainsTerminal } from "./jetbrains-wheel-filter.js";
import type { MouseEvent } from "./types.js";

const MODIFIERS_NONE = { shift: false, alt: false, ctrl: false, meta: false };

function createWheelEvent(action: "wheel_up" | "wheel_down"): MouseEvent {
  return {
    type: "mouse",
    x: 10,
    y: 5,
    button: "none",
    action,
    modifiers: MODIFIERS_NONE,
  };
}

function createClickEvent(): MouseEvent {
  return {
    type: "mouse",
    x: 10,
    y: 5,
    button: "left",
    action: "press",
    modifiers: MODIFIERS_NONE,
  };
}

describe("JetBrainsWheelFilter", () => {
  let emittedEvents: MouseEvent[] = [];
  let filter: JetBrainsWheelFilter;

  beforeEach(() => {
    emittedEvents = [];
    filter = new JetBrainsWheelFilter((event) => {
      emittedEvents.push(event);
    });
  });

  afterEach(() => {
    filter.dispose();
  });

  describe("非滚轮事件", () => {
    it("应该立即放行点击事件", () => {
      const event = createClickEvent();
      const result = filter.handleWheelEvent(event);
      expect(result).toBe(true);
    });
  });

  describe("缓冲机制", () => {
    it("滚轮事件在缓冲期内不放行", () => {
      const event = createWheelEvent("wheel_up");
      const result = filter.handleWheelEvent(event);
      expect(result).toBe(false);
      expect(emittedEvents).toHaveLength(0);
    });

    it("缓冲期后发射所有同方向事件", async () => {
      const event1 = createWheelEvent("wheel_up");
      const event2 = createWheelEvent("wheel_up");

      filter.handleWheelEvent(event1);
      filter.handleWheelEvent(event2);

      expect(emittedEvents).toHaveLength(0);

      await new Promise((resolve) => setTimeout(resolve, 60));

      expect(emittedEvents).toHaveLength(2);
      expect(emittedEvents[0]?.action).toBe("wheel_up");
      expect(emittedEvents[1]?.action).toBe("wheel_up");
    });
  });

  describe("方向决策", () => {
    it("缓冲期内有 wheel_down 时锁定为 wheel_down", async () => {
      const event1 = createWheelEvent("wheel_up");
      const event2 = createWheelEvent("wheel_down");
      const event3 = createWheelEvent("wheel_up");

      filter.handleWheelEvent(event1);
      filter.handleWheelEvent(event2);
      filter.handleWheelEvent(event3);

      await new Promise((resolve) => setTimeout(resolve, 60));

      expect(emittedEvents).toHaveLength(1);
      expect(emittedEvents[0]?.action).toBe("wheel_down");
    });

    it("缓冲期内只有 wheel_up 时锁定为 wheel_up", async () => {
      const event1 = createWheelEvent("wheel_up");
      const event2 = createWheelEvent("wheel_up");

      filter.handleWheelEvent(event1);
      filter.handleWheelEvent(event2);

      await new Promise((resolve) => setTimeout(resolve, 60));

      expect(emittedEvents).toHaveLength(2);
      expect(emittedEvents.every((e) => e.action === "wheel_up")).toBe(true);
    });
  });

  describe("方向锁定", () => {
    it("锁定后同方向事件立即放行", async () => {
      filter.handleWheelEvent(createWheelEvent("wheel_up"));
      await new Promise((resolve) => setTimeout(resolve, 60));
      expect(emittedEvents).toHaveLength(1);

      const result = filter.handleWheelEvent(createWheelEvent("wheel_up"));
      expect(result).toBe(true);
    });

    it("锁定后反向事件被丢弃", async () => {
      filter.handleWheelEvent(createWheelEvent("wheel_up"));
      await new Promise((resolve) => setTimeout(resolve, 60));
      expect(emittedEvents).toHaveLength(1);

      const result = filter.handleWheelEvent(createWheelEvent("wheel_down"));
      expect(result).toBe(false);
    });

    it("锁定超时后解除锁定", async () => {
      filter.handleWheelEvent(createWheelEvent("wheel_up"));
      await new Promise((resolve) => setTimeout(resolve, 60));
      expect(emittedEvents).toHaveLength(1);

      await new Promise((resolve) => setTimeout(resolve, 210));

      const result = filter.handleWheelEvent(createWheelEvent("wheel_down"));
      expect(result).toBe(false);

      await new Promise((resolve) => setTimeout(resolve, 60));
      expect(emittedEvents).toHaveLength(2);
      expect(emittedEvents[1]?.action).toBe("wheel_down");
    });
  });

  describe("边界噪声抑制", () => {
    it("交替的 wheel_up/wheel_down 噪声被抑制", async () => {
      for (let i = 0; i < 5; i++) {
        filter.handleWheelEvent(createWheelEvent("wheel_up"));
        filter.handleWheelEvent(createWheelEvent("wheel_down"));
      }

      await new Promise((resolve) => setTimeout(resolve, 60));

      expect(emittedEvents.every((e) => e.action === "wheel_down")).toBe(true);
    });
  });

  describe("dispose", () => {
    it("取消待处理的计时器", async () => {
      filter.handleWheelEvent(createWheelEvent("wheel_up"));
      filter.dispose();

      await new Promise((resolve) => setTimeout(resolve, 60));
      expect(emittedEvents).toHaveLength(0);
    });
  });
});

describe("isJetBrainsTerminal", () => {
  it("TERMINAL_EMULATOR 包含 JetBrains 时返回 true", () => {
    expect(isJetBrainsTerminal({ TERMINAL_EMULATOR: "JetBrains-JediTerm" })).toBe(true);
    expect(isJetBrainsTerminal({ TERMINAL_EMULATOR: "JetBrains IDEA" })).toBe(true);
  });

  it("TERMINAL_EMULATOR 不包含 JetBrains 时返回 false", () => {
    expect(isJetBrainsTerminal({ TERMINAL_EMULATOR: "iTerm.app" })).toBe(false);
    expect(isJetBrainsTerminal({ TERMINAL_EMULATOR: "WezTerm" })).toBe(false);
  });

  it("TERMINAL_EMULATOR 未设置时返回 false", () => {
    expect(isJetBrainsTerminal({})).toBe(false);
    expect(isJetBrainsTerminal({ TERMINAL_EMULATOR: undefined })).toBe(false);
  });
});
