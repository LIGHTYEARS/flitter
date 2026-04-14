/**
 * FrameStatsOverlay 性能叠加层渲染测试。
 *
 * 覆盖: toggle/show/hide、draw 在隐藏时不修改 screen、draw 绘制边框和标题、
 * 颜色阈值、数值格式化、面板位置计算。
 *
 * @module
 */

import { beforeEach, describe, expect, it } from "vitest";
import { Screen } from "../screen/screen.js";
import { FrameStatsOverlay } from "./frame-stats-overlay.js";
import { PerformanceTracker } from "./performance-tracker.js";

describe("FrameStatsOverlay", () => {
  let overlay: FrameStatsOverlay;
  let tracker: PerformanceTracker;
  let screen: Screen;

  beforeEach(() => {
    overlay = new FrameStatsOverlay();
    tracker = new PerformanceTracker();
    screen = new Screen(80, 24);
  });

  // ── toggle/show/hide ──────────────────────────────

  it("默认不可见", () => {
    expect(overlay.visible).toBe(false);
  });

  it("toggle 切换可见性", () => {
    overlay.toggle();
    expect(overlay.visible).toBe(true);
    overlay.toggle();
    expect(overlay.visible).toBe(false);
  });

  it("show 设置可见", () => {
    overlay.show();
    expect(overlay.visible).toBe(true);
  });

  it("hide 设置不可见", () => {
    overlay.show();
    overlay.hide();
    expect(overlay.visible).toBe(false);
  });

  // ── draw when hidden ──────────────────────────────

  it("draw 在 visible=false 时不修改 screen", () => {
    // 记录 screen 的初始状态
    const cellBefore = screen.getCell(0, 0);
    overlay.draw(screen, tracker);
    const cellAfter = screen.getCell(0, 0);
    // back buffer 不应有任何变化
    expect(cellBefore.equals(cellAfter)).toBe(true);
  });

  // ── draw when visible ─────────────────────────────

  it("draw 在 visible=true 时在 screen 上写入边框字符", () => {
    overlay.show();
    tracker.recordFrame(5.0);
    tracker.recordPhase("build", 1.0);
    tracker.recordPhase("layout", 1.0);
    tracker.recordPhase("paint", 1.0);
    tracker.recordPhase("render", 1.0);
    overlay.draw(screen, tracker);

    // 面板位置: x = 80 - 34 - 2 = 44, y = 1
    // 左上角应有 ╭ 字符
    const topLeft = screen.getCell(44, 1);
    expect(topLeft.char).toBe("╭");
  });

  it("draw 绘制 Gotta Go Fast 标题", () => {
    overlay.show();
    overlay.draw(screen, tracker);

    // 标题在第一行边框中间
    // 面板 x 从 44 开始, 标题 " Gotta Go Fast " 共 16 字符
    // 标题偏移: Math.floor((34 - 16) / 2) = 9
    // 标题起始位置: 44 + 9 = 53, 第一个 "G" 在 col 54 (偏移 9 后 " " 在 53, "G" 在 54)
    // 找到 "G" 字符
    let foundG = false;
    for (let x = 44; x < 78; x++) {
      if (screen.getCell(x, 1).char === "G") {
        foundG = true;
        break;
      }
    }
    expect(foundG).toBe(true);
  });

  it("draw 绘制右上角 ╮ 字符", () => {
    overlay.show();
    overlay.draw(screen, tracker);

    // 右上角: x = 44 + 34 - 1 = 77, y = 1
    const topRight = screen.getCell(77, 1);
    expect(topRight.char).toBe("╮");
  });

  it("draw 绘制左下角 ╰ 字符", () => {
    overlay.show();
    overlay.draw(screen, tracker);

    // 左下角: x = 44, y = 1 + 14 - 1 = 14
    const bottomLeft = screen.getCell(44, 14);
    expect(bottomLeft.char).toBe("╰");
  });

  it("draw 绘制右下角 ╯ 字符", () => {
    overlay.show();
    overlay.draw(screen, tracker);

    // 右下角: x = 77, y = 14
    const bottomRight = screen.getCell(77, 14);
    expect(bottomRight.char).toBe("╯");
  });

  // ── 面板尺寸常量 ──────────────────────────────────

  it("WIDTH 为 34, HEIGHT 为 14", () => {
    expect(overlay.WIDTH).toBe(34);
    expect(overlay.HEIGHT).toBe(14);
  });

  // ── 面板位置计算 ──────────────────────────────────

  it("面板位置在右上角", () => {
    overlay.show();
    overlay.draw(screen, tracker);

    // x = screenWidth - WIDTH - 2 = 80 - 34 - 2 = 44
    // y = 1
    const cell = screen.getCell(44, 1);
    expect(cell.char).toBe("╭");
  });

  it("屏幕太小时不绘制", () => {
    const smallScreen = new Screen(30, 24);
    overlay.show();
    overlay.draw(smallScreen, tracker);

    // x = 30 - 34 - 2 = -6 < 0, 不应绘制
    const cell = smallScreen.getCell(0, 1);
    expect(cell.char).toBe(" "); // 保持空白
  });

  // ── 自定义帧预算 ──────────────────────────────────

  it("可自定义 frameBudgetMs", () => {
    const customOverlay = new FrameStatsOverlay({ frameBudgetMs: 8.33 });
    expect(customOverlay.visible).toBe(false);
    // 只要不抛异常即可
    customOverlay.show();
    customOverlay.draw(screen, tracker);
  });

  // ── 颜色阈值 ──────────────────────────────────────

  it("getTimingColor: 正常值返回 foreground 色", () => {
    const color = overlay.getTimingColor(5.0);
    // 正常值 < 70% of 16.67 = 11.67
    expect(color).toBeDefined();
  });

  it("getTimingColor: >= 70% 帧预算返回 warning 色", () => {
    const normalColor = overlay.getTimingColor(5.0);
    const warningColor = overlay.getTimingColor(12.0); // >= 11.67
    // warning 色应该不同于正常色
    expect(warningColor).toBeDefined();
    expect(warningColor.equals(normalColor)).toBe(false);
  });

  it("getTimingColor: >= 100% 帧预算返回 destructive 色", () => {
    const warningColor = overlay.getTimingColor(12.0);
    const destructiveColor = overlay.getTimingColor(17.0); // >= 16.67
    // destructive 色应该不同于 warning 色
    expect(destructiveColor).toBeDefined();
    expect(destructiveColor.equals(warningColor)).toBe(false);
  });

  it("getPercentColor: 正常值返回 foreground 色", () => {
    const color = overlay.getPercentColor(10.0);
    expect(color).toBeDefined();
  });

  it("getPercentColor: >= 20% 返回 warning 色", () => {
    const normalColor = overlay.getPercentColor(10.0);
    const warningColor = overlay.getPercentColor(25.0);
    expect(warningColor.equals(normalColor)).toBe(false);
  });

  it("getPercentColor: >= 50% 返回 destructive 色", () => {
    const warningColor = overlay.getPercentColor(25.0);
    const destructiveColor = overlay.getPercentColor(55.0);
    expect(destructiveColor.equals(warningColor)).toBe(false);
  });

  // ── formatValue ────────────────────────────────────

  it("formatValue ms: 保留 2 位小数", () => {
    const result = overlay.formatValue(1.234, "ms");
    expect(result).toBe(" 1.23");
  });

  it("formatValue percent: 保留 1 位小数 + %", () => {
    const result = overlay.formatValue(5.26, "percent");
    expect(result).toBe(" 5.3%");
  });

  it("formatValue bytes: 小值直接显示", () => {
    const result = overlay.formatValue(500, "bytes");
    expect(result).toBe("  500");
  });

  it("formatValue bytes: >= 1000 显示 k 后缀", () => {
    const result = overlay.formatValue(1500, "bytes");
    expect(result).toBe(" 1.5k");
  });

  it("formatValue bytes: >= 10000 显示整数 k", () => {
    const result = overlay.formatValue(15000, "bytes");
    expect(result).toBe("  15k");
  });
});
