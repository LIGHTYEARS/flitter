/**
 * ScreenBuffer / Screen 单元测试。
 *
 * 使用 node:test + node:assert/strict，覆盖双缓冲、脏追踪、调整尺寸等核心功能。
 *
 * 运行方式：
 * ```bash
 * npx tsx --test packages/tui/src/screen/screen.test.ts
 * ```
 *
 * @module
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { Cell } from "./cell.js";
import { TextStyle } from "./text-style.js";
import { Color } from "./color.js";
import { ScreenBuffer } from "./buffer.js";
import { Screen } from "./screen.js";
import type { DirtyRegion } from "./screen.js";

// ════════════════════════════════════════════════════
//  ScreenBuffer 测试
// ════════════════════════════════════════════════════

describe("ScreenBuffer", () => {
  // ── 1. 构造后全部为 EMPTY ──────────────────────────
  it("构造后所有单元格为 Cell.EMPTY", () => {
    const buf = new ScreenBuffer(5, 3);
    for (let y = 0; y < 3; y++) {
      for (let x = 0; x < 5; x++) {
        assert.ok(buf.getCell(x, y).equals(Cell.EMPTY), `(${x},${y}) 应为 EMPTY`);
      }
    }
  });

  // ── 2. setCell + getCell 往返 ──────────────────────
  it("setCell + getCell 往返一致", () => {
    const buf = new ScreenBuffer(10, 5);
    const style = new TextStyle({ bold: true });
    const cell = new Cell("A", style, 1);
    buf.setCell(3, 2, cell);
    assert.ok(buf.getCell(3, 2).equals(cell));
  });

  // ── 3. getCell 越界返回 EMPTY ──────────────────────
  it("getCell 越界返回 Cell.EMPTY", () => {
    const buf = new ScreenBuffer(5, 5);
    assert.ok(buf.getCell(-1, 0).equals(Cell.EMPTY));
    assert.ok(buf.getCell(0, -1).equals(Cell.EMPTY));
    assert.ok(buf.getCell(5, 0).equals(Cell.EMPTY));
    assert.ok(buf.getCell(0, 5).equals(Cell.EMPTY));
    assert.ok(buf.getCell(100, 100).equals(Cell.EMPTY));
  });

  // ── 4. setCell 越界不崩溃 ──────────────────────────
  it("setCell 越界时静默忽略，不抛出异常", () => {
    const buf = new ScreenBuffer(5, 5);
    const cell = new Cell("X", TextStyle.NORMAL);
    // 以下操作不应抛出
    buf.setCell(-1, 0, cell);
    buf.setCell(0, -1, cell);
    buf.setCell(5, 0, cell);
    buf.setCell(0, 5, cell);
    buf.setCell(999, 999, cell);
  });

  // ── 5. writeChar 单宽字符 ──────────────────────────
  it("writeChar 单宽字符正确写入", () => {
    const buf = new ScreenBuffer(10, 5);
    const style = new TextStyle({ foreground: Color.red() });
    buf.writeChar(2, 1, "B", style);
    const cell = buf.getCell(2, 1);
    assert.equal(cell.char, "B");
    assert.equal(cell.width, 1);
    assert.ok(cell.style.equals(style));
  });

  // ── 6. writeChar 双宽字符 ──────────────────────────
  it("writeChar 双宽字符：主单元格 width=2 + 续位 width=0", () => {
    const buf = new ScreenBuffer(10, 5);
    const style = new TextStyle({ bold: true });
    buf.writeChar(3, 0, "中", style, 2);

    // 主单元格
    const main = buf.getCell(3, 0);
    assert.equal(main.char, "中");
    assert.equal(main.width, 2);
    assert.ok(main.style.equals(style));

    // 续位占位符
    const cont = buf.getCell(4, 0);
    assert.equal(cont.char, "");
    assert.equal(cont.width, 0);
    assert.ok(cont.style.equals(style));
  });

  // ── 7. clear 重置全部为 EMPTY ─────────────────────
  it("clear 将所有单元格重置为 Cell.EMPTY", () => {
    const buf = new ScreenBuffer(5, 3);
    buf.setCell(0, 0, new Cell("X", TextStyle.NORMAL));
    buf.setCell(4, 2, new Cell("Y", TextStyle.NORMAL));
    buf.clear();

    for (let y = 0; y < 3; y++) {
      for (let x = 0; x < 5; x++) {
        assert.ok(buf.getCell(x, y).equals(Cell.EMPTY), `清空后 (${x},${y}) 应为 EMPTY`);
      }
    }
  });

  // ── 8. fill 矩形区域 ──────────────────────────────
  it("fill 正确填充矩形区域", () => {
    const buf = new ScreenBuffer(10, 10);
    const cell = new Cell("#", new TextStyle({ bold: true }));
    buf.fill(2, 3, 4, 2, cell);

    // 区域内
    for (let y = 3; y < 5; y++) {
      for (let x = 2; x < 6; x++) {
        assert.ok(buf.getCell(x, y).equals(cell), `(${x},${y}) 应被填充`);
      }
    }
    // 区域外
    assert.ok(buf.getCell(1, 3).equals(Cell.EMPTY));
    assert.ok(buf.getCell(6, 3).equals(Cell.EMPTY));
    assert.ok(buf.getCell(2, 2).equals(Cell.EMPTY));
    assert.ok(buf.getCell(2, 5).equals(Cell.EMPTY));
  });

  // ── 9. fill 裁剪到边界 ────────────────────────────
  it("fill 超出边界时裁剪，不崩溃", () => {
    const buf = new ScreenBuffer(5, 5);
    const cell = new Cell("@", TextStyle.NORMAL);
    // 从 (-2, -1) 开始，宽 10 高 8——远超边界
    buf.fill(-2, -1, 10, 8, cell);
    for (let y = 0; y < 5; y++) {
      for (let x = 0; x < 5; x++) {
        assert.ok(buf.getCell(x, y).equals(cell), `(${x},${y}) 应被填充`);
      }
    }
  });

  // ── 10. resize 扩大：新区域为 EMPTY ────────────────
  it("resize 扩大时新增区域为 Cell.EMPTY", () => {
    const buf = new ScreenBuffer(3, 3);
    const cell = new Cell("A", TextStyle.NORMAL);
    buf.setCell(0, 0, cell);
    buf.resize(5, 5);

    assert.equal(buf.width, 5);
    assert.equal(buf.height, 5);
    assert.ok(buf.getCell(0, 0).equals(cell));
    assert.ok(buf.getCell(4, 4).equals(Cell.EMPTY));
    assert.ok(buf.getCell(3, 0).equals(Cell.EMPTY));
    assert.ok(buf.getCell(0, 3).equals(Cell.EMPTY));
  });

  // ── 11. resize 缩小：保留交集 ─────────────────────
  it("resize 缩小时保留交集区域内容", () => {
    const buf = new ScreenBuffer(5, 5);
    const cell = new Cell("Z", TextStyle.NORMAL);
    buf.setCell(1, 1, cell);
    buf.setCell(4, 4, cell); // 缩小后会丢失
    buf.resize(3, 3);

    assert.equal(buf.width, 3);
    assert.equal(buf.height, 3);
    assert.ok(buf.getCell(1, 1).equals(cell));
    // 原 (4,4) 现在越界
    assert.ok(buf.getCell(4, 4).equals(Cell.EMPTY));
  });

  // ── 12. resize 保留交集内容 ────────────────────────
  it("resize 保留交集区域的全部现有内容", () => {
    const buf = new ScreenBuffer(4, 4);
    const style = new TextStyle({ italic: true });
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        buf.setCell(x, y, new Cell(String.fromCharCode(65 + y * 4 + x), style));
      }
    }
    buf.resize(3, 6);

    // 交集 3x4 保留
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 3; x++) {
        const expected = String.fromCharCode(65 + y * 4 + x);
        assert.equal(buf.getCell(x, y).char, expected, `(${x},${y}) 应为 '${expected}'`);
      }
    }
    // 新增行为 EMPTY
    assert.ok(buf.getCell(0, 4).equals(Cell.EMPTY));
    assert.ok(buf.getCell(0, 5).equals(Cell.EMPTY));
  });

  // ── 13. copyTo 拷贝全部单元格 ─────────────────────
  it("copyTo 将全部单元格拷贝到目标", () => {
    const src = new ScreenBuffer(4, 3);
    const dst = new ScreenBuffer(4, 3);
    const style = new TextStyle({ bold: true, foreground: Color.green() });
    src.writeChar(0, 0, "H", style);
    src.writeChar(1, 0, "i", style);
    src.writeChar(2, 1, "中", style, 2);

    src.copyTo(dst);

    for (let y = 0; y < 3; y++) {
      for (let x = 0; x < 4; x++) {
        assert.ok(
          dst.getCell(x, y).equals(src.getCell(x, y)),
          `copyTo 后 (${x},${y}) 应相等`
        );
      }
    }
  });

  // ── 14. copyTo 往返验证 ───────────────────────────
  it("copyTo 往返：src → dst → src2，内容一致", () => {
    const src = new ScreenBuffer(5, 5);
    const dst = new ScreenBuffer(5, 5);
    const src2 = new ScreenBuffer(5, 5);
    const cell = new Cell("Q", new TextStyle({ underline: true }));
    src.setCell(2, 3, cell);
    src.setCell(4, 0, cell);

    src.copyTo(dst);
    dst.copyTo(src2);

    for (let y = 0; y < 5; y++) {
      for (let x = 0; x < 5; x++) {
        assert.ok(
          src2.getCell(x, y).equals(src.getCell(x, y)),
          `往返后 (${x},${y}) 应一致`
        );
      }
    }
  });

  // ── 15. 大缓冲区压力测试 ─────────────────────────
  it("大缓冲区 (100x50) 压力测试：写入与读取一致", () => {
    const buf = new ScreenBuffer(100, 50);
    const style = new TextStyle({ bold: true, foreground: Color.rgb(128, 64, 32) });

    // 写入对角线
    for (let i = 0; i < 50; i++) {
      buf.setCell(i, i, new Cell("*", style));
    }

    // 验证对角线
    for (let i = 0; i < 50; i++) {
      const cell = buf.getCell(i, i);
      assert.equal(cell.char, "*");
      assert.ok(cell.style.equals(style));
    }

    // 验证非对角线为 EMPTY
    assert.ok(buf.getCell(0, 1).equals(Cell.EMPTY));
    assert.ok(buf.getCell(49, 48).equals(Cell.EMPTY));
  });
});

// ════════════════════════════════════════════════════
//  Screen 测试
// ════════════════════════════════════════════════════

describe("Screen", () => {
  // ── 16. 初始状态 ──────────────────────────────────
  it("初始状态：全 EMPTY，needsFullRefresh 为 true", () => {
    const scr = new Screen(10, 5);
    assert.equal(scr.needsFullRefresh, true);
    for (let y = 0; y < 5; y++) {
      for (let x = 0; x < 10; x++) {
        assert.ok(scr.getCell(x, y).equals(Cell.EMPTY));
      }
    }
  });

  // ── 17. setCell 写入 back buffer ──────────────────
  it("setCell 将单元格写入 back buffer", () => {
    const scr = new Screen(10, 5);
    const cell = new Cell("A", new TextStyle({ bold: true }));
    scr.setCell(1, 1, cell);
    assert.ok(scr.back.getCell(1, 1).equals(cell));
  });

  // ── 18. setCell 不修改 front buffer ────────────────
  it("setCell 不影响 front buffer", () => {
    const scr = new Screen(10, 5);
    const cell = new Cell("A", new TextStyle({ bold: true }));
    scr.setCell(1, 1, cell);
    assert.ok(scr.front.getCell(1, 1).equals(Cell.EMPTY));
  });

  // ── 19. present 同步 front = back ─────────────────
  it("present() 将 back 同步到 front", () => {
    const scr = new Screen(10, 5);
    const cell = new Cell("X", TextStyle.NORMAL);
    scr.setCell(3, 2, cell);
    scr.present();
    assert.ok(scr.front.getCell(3, 2).equals(cell));
  });

  // ── 20. setCell 相同值不标记脏 ─────────────────────
  it("setCell 写入相同值时不产生脏标记", () => {
    const scr = new Screen(10, 5);
    scr.present(); // 清除初始 fullRefresh

    // back 已全是 EMPTY，再写 EMPTY
    scr.setCell(0, 0, Cell.EMPTY);
    const dirty = scr.getDirtyRegions();
    assert.equal(dirty.length, 0);
  });

  // ── 21. setCell 不同值产生脏标记 ───────────────────
  it("setCell 写入不同值时产生脏标记", () => {
    const scr = new Screen(10, 5);
    scr.present();

    const cell = new Cell("Z", TextStyle.NORMAL);
    scr.setCell(4, 3, cell);
    const dirty = scr.getDirtyRegions();
    assert.equal(dirty.length, 1);
    assert.equal(dirty[0].y, 3);
    assert.equal(dirty[0].cells.length, 1);
    assert.equal(dirty[0].cells[0].x, 4);
    assert.ok(dirty[0].cells[0].cell.equals(cell));
  });

  // ── 22. getDirtyRegions 返回正确的脏单元格 ─────────
  it("getDirtyRegions 返回所有脏单元格", () => {
    const scr = new Screen(10, 5);
    scr.present();

    const cellA = new Cell("A", TextStyle.NORMAL);
    const cellB = new Cell("B", TextStyle.NORMAL);
    scr.setCell(0, 0, cellA);
    scr.setCell(5, 3, cellB);

    const dirty = scr.getDirtyRegions();
    assert.equal(dirty.length, 2);

    // 行 0
    const row0 = dirty.find((r) => r.y === 0);
    assert.ok(row0);
    assert.equal(row0.cells.length, 1);
    assert.equal(row0.cells[0].x, 0);

    // 行 3
    const row3 = dirty.find((r) => r.y === 3);
    assert.ok(row3);
    assert.equal(row3.cells.length, 1);
    assert.equal(row3.cells[0].x, 5);
  });

  // ── 23. getDirtyRegions 跳过干净行 ─────────────────
  it("getDirtyRegions 不包含没有脏单元格的行", () => {
    const scr = new Screen(10, 5);
    scr.present();

    scr.setCell(0, 2, new Cell("M", TextStyle.NORMAL));
    const dirty = scr.getDirtyRegions();

    // 仅行 2 有脏标记
    assert.equal(dirty.length, 1);
    assert.equal(dirty[0].y, 2);
  });

  // ── 24. present 清除脏追踪 ────────────────────────
  it("present() 清除脏追踪状态", () => {
    const scr = new Screen(10, 5);
    scr.present();

    scr.setCell(1, 1, new Cell("P", TextStyle.NORMAL));
    assert.ok(scr.getDirtyRegions().length > 0);

    scr.present();
    const dirty = scr.getDirtyRegions();
    assert.equal(dirty.length, 0);
  });

  // ── 25. present 后 getDirtyRegions 返回空 ──────────
  it("present() 后无新操作，getDirtyRegions 返回空数组", () => {
    const scr = new Screen(10, 5);
    scr.setCell(0, 0, new Cell("T", TextStyle.NORMAL));
    scr.present();
    assert.deepEqual(scr.getDirtyRegions(), []);
  });

  // ── 26. needsFullRefresh 时返回全部单元格 ──────────
  it("needsFullRefresh 时 getDirtyRegions 返回 back 中全部单元格", () => {
    const scr = new Screen(3, 2);
    const cell = new Cell("F", TextStyle.NORMAL);
    scr.setCell(1, 0, cell);

    assert.equal(scr.needsFullRefresh, true);
    const dirty = scr.getDirtyRegions();
    // 全量刷新：应返回全部行
    assert.equal(dirty.length, 2); // 2 行
    assert.equal(dirty[0].cells.length, 3); // 每行 3 列
    assert.equal(dirty[1].cells.length, 3);

    // 检查 (1,0) 确实是我们设置的 cell
    const row0 = dirty[0];
    assert.equal(row0.y, 0);
    assert.ok(row0.cells[1].cell.equals(cell));
  });

  // ── 27. resize 触发 needsFullRefresh ──────────────
  it("resize 触发 needsFullRefresh", () => {
    const scr = new Screen(10, 5);
    scr.present();
    assert.equal(scr.needsFullRefresh, false);

    scr.resize(20, 10);
    assert.equal(scr.needsFullRefresh, true);
    assert.equal(scr.width, 20);
    assert.equal(scr.height, 10);
  });

  // ── 28. resize 保留交集内容 ────────────────────────
  it("resize 保留交集区域内容", () => {
    const scr = new Screen(10, 5);
    const cell = new Cell("R", new TextStyle({ italic: true }));
    scr.setCell(2, 2, cell);
    scr.present();

    scr.resize(5, 3);
    // back buffer 中 (2,2) 应保留
    assert.ok(scr.getCell(2, 2).equals(cell));
    // front buffer 中也应保留
    assert.ok(scr.front.getCell(2, 2).equals(cell));
  });

  // ── 29. clear 设置 needsFullRefresh ────────────────
  it("clear 设置 needsFullRefresh 为 true", () => {
    const scr = new Screen(10, 5);
    scr.present();
    assert.equal(scr.needsFullRefresh, false);

    scr.clear();
    assert.equal(scr.needsFullRefresh, true);
  });

  // ── 30. writeChar 双宽标记两个脏单元格 ─────────────
  it("writeChar 双宽字符标记两个脏单元格", () => {
    const scr = new Screen(10, 5);
    scr.present();

    scr.writeChar(3, 1, "中", new TextStyle({ bold: true }), 2);
    const dirty = scr.getDirtyRegions();
    assert.equal(dirty.length, 1);
    assert.equal(dirty[0].y, 1);

    const xs = dirty[0].cells.map((c) => c.x);
    assert.ok(xs.includes(3), "主单元格 x=3 应标记为脏");
    assert.ok(xs.includes(4), "续位 x=4 应标记为脏");
  });

  // ── 31. 多帧：脏追踪各帧独立 ─────────────────────
  it("多帧场景：set→present→set→present 脏追踪各帧独立", () => {
    const scr = new Screen(10, 5);
    scr.present();

    // 帧 1
    scr.setCell(0, 0, new Cell("1", TextStyle.NORMAL));
    const dirty1 = scr.getDirtyRegions();
    assert.equal(dirty1.length, 1);
    assert.equal(dirty1[0].cells[0].cell.char, "1");
    scr.present();

    // 帧 2
    scr.setCell(5, 3, new Cell("2", TextStyle.NORMAL));
    const dirty2 = scr.getDirtyRegions();
    assert.equal(dirty2.length, 1);
    assert.equal(dirty2[0].y, 3);
    assert.equal(dirty2[0].cells[0].x, 5);
    assert.equal(dirty2[0].cells[0].cell.char, "2");

    // 帧 1 的脏标记不应出现
    assert.ok(!dirty2.some((r) => r.y === 0));
    scr.present();

    // 帧 3：无操作
    assert.deepEqual(scr.getDirtyRegions(), []);
  });

  // ── 32. 光标位置 get/set ──────────────────────────
  it("cursorPosition 初始为 null，可设置和读取", () => {
    const scr = new Screen(10, 5);
    assert.equal(scr.cursorPosition, null);

    scr.cursorPosition = { x: 5, y: 3 };
    assert.deepEqual(scr.cursorPosition, { x: 5, y: 3 });

    scr.cursorPosition = null;
    assert.equal(scr.cursorPosition, null);
  });

  // ── 33. 光标可见性 get/set ────────────────────────
  it("cursorVisible 初始为 true，可切换", () => {
    const scr = new Screen(10, 5);
    assert.equal(scr.cursorVisible, true);

    scr.cursorVisible = false;
    assert.equal(scr.cursorVisible, false);

    scr.cursorVisible = true;
    assert.equal(scr.cursorVisible, true);
  });

  // ── 34. getDirtyRegions cells 按 x 排序 ────────────
  it("getDirtyRegions 中每行的 cells 按 x 升序排列", () => {
    const scr = new Screen(10, 5);
    scr.present();

    // 故意反序写入
    scr.setCell(8, 2, new Cell("C", TextStyle.NORMAL));
    scr.setCell(2, 2, new Cell("A", TextStyle.NORMAL));
    scr.setCell(5, 2, new Cell("B", TextStyle.NORMAL));

    const dirty = scr.getDirtyRegions();
    assert.equal(dirty.length, 1);
    const xs = dirty[0].cells.map((c) => c.x);
    assert.deepEqual(xs, [2, 5, 8]);
  });

  // ── 35. 同一行多个脏单元格 ────────────────────────
  it("同一行多个脏单元格全部返回", () => {
    const scr = new Screen(20, 5);
    scr.present();

    for (let x = 0; x < 10; x++) {
      scr.setCell(x, 0, new Cell(String.fromCharCode(65 + x), TextStyle.NORMAL));
    }

    const dirty = scr.getDirtyRegions();
    assert.equal(dirty.length, 1);
    assert.equal(dirty[0].y, 0);
    assert.equal(dirty[0].cells.length, 10);
    // 验证内容
    for (let i = 0; i < 10; i++) {
      assert.equal(dirty[0].cells[i].x, i);
      assert.equal(dirty[0].cells[i].cell.char, String.fromCharCode(65 + i));
    }
  });

  // ── 36. 多行脏区域 ───────────────────────────────
  it("多行脏区域按行索引升序返回", () => {
    const scr = new Screen(10, 10);
    scr.present();

    // 在行 7、行 1、行 4 写入（故意乱序）
    scr.setCell(0, 7, new Cell("C", TextStyle.NORMAL));
    scr.setCell(0, 1, new Cell("A", TextStyle.NORMAL));
    scr.setCell(0, 4, new Cell("B", TextStyle.NORMAL));

    const dirty = scr.getDirtyRegions();
    assert.equal(dirty.length, 3);
    assert.deepEqual(
      dirty.map((r) => r.y),
      [1, 4, 7]
    );
  });

  // ── 37. writeChar 单宽通过 getCell 可读 ────────────
  it("writeChar 单宽字符通过 getCell 可读", () => {
    const scr = new Screen(10, 5);
    const style = new TextStyle({ foreground: Color.cyan() });
    scr.writeChar(7, 4, "W", style);
    const cell = scr.getCell(7, 4);
    assert.equal(cell.char, "W");
    assert.ok(cell.style.equals(style));
    assert.equal(cell.width, 1);
  });

  // ── 38. clear 后 back 全为 EMPTY ──────────────────
  it("clear 后 back buffer 全部为 Cell.EMPTY", () => {
    const scr = new Screen(5, 3);
    scr.setCell(0, 0, new Cell("X", TextStyle.NORMAL));
    scr.setCell(4, 2, new Cell("Y", TextStyle.NORMAL));
    scr.clear();

    for (let y = 0; y < 3; y++) {
      for (let x = 0; x < 5; x++) {
        assert.ok(scr.getCell(x, y).equals(Cell.EMPTY), `清空后 (${x},${y}) 应为 EMPTY`);
      }
    }
  });

  // ── 39. needsFullRefresh 全量返回包含 EMPTY 单元格 ─
  it("needsFullRefresh 全量返回包含 EMPTY 单元格", () => {
    const scr = new Screen(2, 2);
    // 不做任何写入，needsFullRefresh 仍为 true
    const dirty = scr.getDirtyRegions();
    // 应返回 2 行 x 2 列的全部单元格（均为 EMPTY）
    assert.equal(dirty.length, 2);
    assert.equal(dirty[0].cells.length, 2);
    assert.equal(dirty[1].cells.length, 2);
    assert.ok(dirty[0].cells[0].cell.equals(Cell.EMPTY));
  });

  // ── 40. present 设置 needsFullRefresh 为 false ─────
  it("present() 将 needsFullRefresh 设为 false", () => {
    const scr = new Screen(10, 5);
    assert.equal(scr.needsFullRefresh, true);
    scr.present();
    assert.equal(scr.needsFullRefresh, false);
  });

  // ── 41. copyTo 尺寸不匹配时抛出 ───────────────────
  it("ScreenBuffer.copyTo 尺寸不匹配时抛出 Error", () => {
    const a = new ScreenBuffer(5, 5);
    const b = new ScreenBuffer(3, 3);
    assert.throws(() => a.copyTo(b), Error);
  });
});
