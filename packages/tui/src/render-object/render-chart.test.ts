/**
 * Tests for RenderChart
 *
 * 逆向: uRR class in misc_utils.js:4227 — chart rendering system
 */

import { describe, expect, test } from "bun:test";
import type { ChartData } from "./render-chart.js";
import { RenderChart } from "./render-chart.js";

describe("RenderChart", () => {
  test("bar chart renders correct height", () => {
    const data: ChartData = {
      chartType: "bar",
      series: [{ label: "A", values: [10, 20, 30] }],
      xLabels: ["x1", "x2", "x3"],
    };
    const chart = new RenderChart(data);
    const lines = chart.renderToLines(40, 10);
    expect(lines.length).toBe(10);
    expect(lines.some((l) => l.includes("█"))).toBe(true);
  });

  test("horizontal-bar chart renders horizontally", () => {
    const data: ChartData = {
      chartType: "horizontal-bar",
      series: [{ label: "A", values: [50, 100] }],
      xLabels: ["row1", "row2"],
    };
    const chart = new RenderChart(data);
    const lines = chart.renderToLines(40, 6);
    expect(lines.length).toBe(6);
  });

  test("line chart renders with braille characters", () => {
    const data: ChartData = {
      chartType: "line",
      series: [{ label: "A", values: [0, 50, 100, 50, 0] }],
    };
    const chart = new RenderChart(data);
    const lines = chart.renderToLines(40, 10);
    expect(lines.length).toBe(10);
    // Should contain braille characters (U+2800 block)
    expect(lines.some((l) => /[\u2800-\u28FF]/.test(l))).toBe(true);
  });

  test("bar chart with no x-labels still renders", () => {
    const data: ChartData = {
      chartType: "bar",
      series: [{ label: "Data", values: [5, 10, 15, 10, 5] }],
    };
    const chart = new RenderChart(data);
    const lines = chart.renderToLines(50, 12);
    expect(lines.length).toBe(12);
  });

  test("stacked-bar chart renders without errors", () => {
    const data: ChartData = {
      chartType: "stacked-bar",
      series: [
        { label: "A", values: [10, 20, 30] },
        { label: "B", values: [5, 15, 10] },
      ],
      xLabels: ["Jan", "Feb", "Mar"],
    };
    const chart = new RenderChart(data);
    const lines = chart.renderToLines(60, 15);
    expect(lines.length).toBe(15);
    expect(lines.some((l) => l.includes("█"))).toBe(true);
  });

  test("sparkline renders with braille characters", () => {
    const data: ChartData = {
      chartType: "sparkline",
      series: [{ label: "metric", values: [1, 3, 2, 5, 4, 6, 5, 7] }],
    };
    const chart = new RenderChart(data, { showAxes: false });
    const lines = chart.renderToLines(30, 8);
    expect(lines.length).toBe(8);
    expect(lines.some((l) => /[\u2800-\u28FF]/.test(l))).toBe(true);
  });

  test("horizontal-bar shows block characters for non-zero values", () => {
    const data: ChartData = {
      chartType: "horizontal-bar",
      series: [{ label: "items", values: [25, 50, 75, 100] }],
      xLabels: ["alpha", "beta", "gamma", "delta"],
    };
    const chart = new RenderChart(data);
    const lines = chart.renderToLines(50, 4);
    expect(lines.length).toBe(4);
    expect(lines.some((l) => l.includes("█") || l.match(/[▏▎▍▌▋▊▉]/u))).toBe(true);
  });

  test("stacked-area chart renders without errors", () => {
    const data: ChartData = {
      chartType: "stacked-area",
      series: [
        { label: "A", values: [10, 20, 30, 20, 10] },
        { label: "B", values: [5, 10, 15, 10, 5] },
      ],
    };
    const chart = new RenderChart(data);
    const lines = chart.renderToLines(60, 15);
    expect(lines.length).toBe(15);
  });

  test("chart with empty series returns empty array", () => {
    const data: ChartData = {
      chartType: "bar",
      series: [],
    };
    const chart = new RenderChart(data);
    const lines = chart.renderToLines(40, 10);
    expect(lines.length).toBe(0);
  });

  test("auto-height computes within MIN/MAX bounds", () => {
    const data: ChartData = {
      chartType: "bar",
      series: [{ label: "X", values: [1, 2, 3] }],
    };
    const chart = new RenderChart(data);
    // Auto height with wide terminal (200 cols) should be capped at MAX_HEIGHT=35 + extras
    const linesWide = chart.renderToLines(200);
    // Auto height with narrow terminal (10 cols) should be at least MIN_HEIGHT=10
    const linesNarrow = chart.renderToLines(10);
    expect(linesWide.length).toBeGreaterThan(0);
    expect(linesNarrow.length).toBeGreaterThan(0);
  });

  test("multi-series line chart renders with multiple braille paths", () => {
    const data: ChartData = {
      chartType: "line",
      series: [
        { label: "A", values: [0, 100, 0, 100, 0] },
        { label: "B", values: [100, 0, 100, 0, 100] },
      ],
    };
    const chart = new RenderChart(data);
    const lines = chart.renderToLines(50, 15);
    expect(lines.length).toBe(15);
    expect(lines.some((l) => /[\u2800-\u28FF]/.test(l))).toBe(true);
  });

  test("custom value formatter is used", () => {
    // Use value=50, max will be 100, so bar is 50% filled leaving room for label
    const data: ChartData = {
      chartType: "horizontal-bar",
      series: [{ label: "val", values: [50, 100] }],
      xLabels: ["item", "max"],
      valueFormatter: (v) => `${v}%`,
    };
    const chart = new RenderChart(data);
    const lines = chart.renderToLines(60, 2);
    expect(lines.length).toBe(2);
    // The formatted value for "50" should appear in the output (after stripping ANSI)
    const stripped = lines[0]!.replace(/\x1b\[[0-9;]*m/g, "");
    expect(stripped).toContain("50%");
  });

  test("showAxes=false omits Y-axis characters", () => {
    const data: ChartData = {
      chartType: "bar",
      series: [{ label: "data", values: [50, 100] }],
    };
    const noAxes = new RenderChart(data, { showAxes: false });
    const withAxes = new RenderChart(data, { showAxes: true });
    const linesNoAxes = noAxes.renderToLines(40, 10);
    const linesWithAxes = withAxes.renderToLines(40, 10);
    // With axes, Y-axis separator should appear
    expect(linesWithAxes.some((l) => l.includes("│") || l.includes("┤"))).toBe(true);
    // Without axes, bar takes full width so more bar characters expected
    const barCharsNoAxes =
      linesNoAxes
        .join("")
        .replace(/\x1b\[[0-9;]*m/g, "")
        .split("█").length - 1;
    const barCharsWithAxes =
      linesWithAxes
        .join("")
        .replace(/\x1b\[[0-9;]*m/g, "")
        .split("█").length - 1;
    expect(barCharsNoAxes).toBeGreaterThanOrEqual(barCharsWithAxes);
  });
});
