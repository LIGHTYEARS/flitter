/**
 * VT 事件类型与输入事件类型的单元测试。
 *
 * 使用 node:test + node:assert/strict，覆盖辅助工具函数和类型判别。
 *
 * 运行方式：
 * ```bash
 * npx tsx --test packages/tui/src/vt/types.test.ts
 * ```
 *
 * @module
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { InputEvent, Modifiers, VtEvent } from "./types.js";
import { hasModifier, MODIFIERS_NONE, modifierFromCsiParam } from "./types.js";

// ════════════════════════════════════════════════════
//  MODIFIERS_NONE 测试
// ════════════════════════════════════════════════════

describe("MODIFIERS_NONE", () => {
  // ── 1. 所有字段均为 false ─────────────────────────
  it("所有字段均为 false", () => {
    assert.equal(MODIFIERS_NONE.shift, false);
    assert.equal(MODIFIERS_NONE.alt, false);
    assert.equal(MODIFIERS_NONE.ctrl, false);
    assert.equal(MODIFIERS_NONE.meta, false);
  });

  // ── 2. hasModifier 返回 false ─────────────────────
  it("hasModifier(MODIFIERS_NONE) 返回 false", () => {
    assert.equal(hasModifier(MODIFIERS_NONE), false);
  });
});

// ════════════════════════════════════════════════════
//  hasModifier 测试
// ════════════════════════════════════════════════════

describe("hasModifier", () => {
  // ── 3. shift=true 返回 true ───────────────────────
  it("shift=true 时返回 true", () => {
    const m: Modifiers = { shift: true, alt: false, ctrl: false, meta: false };
    assert.equal(hasModifier(m), true);
  });

  // ── 4. ctrl=true 返回 true ────────────────────────
  it("ctrl=true 时返回 true", () => {
    const m: Modifiers = { shift: false, alt: false, ctrl: true, meta: false };
    assert.equal(hasModifier(m), true);
  });
});

// ════════════════════════════════════════════════════
//  modifierFromCsiParam 测试
// ════════════════════════════════════════════════════

describe("modifierFromCsiParam", () => {
  // ── 5. param 1 → 无修饰键 ────────────────────────
  it("param 1 → 无修饰键（MODIFIERS_NONE）", () => {
    const m = modifierFromCsiParam(1);
    assert.equal(m.shift, false);
    assert.equal(m.alt, false);
    assert.equal(m.ctrl, false);
    assert.equal(m.meta, false);
    assert.equal(hasModifier(m), false);
  });

  // ── 6. param 2 → Shift ────────────────────────────
  it("param 2 → Shift", () => {
    const m = modifierFromCsiParam(2);
    assert.equal(m.shift, true);
    assert.equal(m.alt, false);
    assert.equal(m.ctrl, false);
    assert.equal(m.meta, false);
  });

  // ── 7. param 3 → Alt ─────────────────────────────
  it("param 3 → Alt", () => {
    const m = modifierFromCsiParam(3);
    assert.equal(m.shift, false);
    assert.equal(m.alt, true);
    assert.equal(m.ctrl, false);
    assert.equal(m.meta, false);
  });

  // ── 8. param 5 → Ctrl ────────────────────────────
  it("param 5 → Ctrl", () => {
    const m = modifierFromCsiParam(5);
    assert.equal(m.shift, false);
    assert.equal(m.alt, false);
    assert.equal(m.ctrl, true);
    assert.equal(m.meta, false);
  });

  // ── 9. param 6 → Ctrl+Shift ──────────────────────
  it("param 6 → Ctrl+Shift", () => {
    const m = modifierFromCsiParam(6);
    assert.equal(m.shift, true);
    assert.equal(m.alt, false);
    assert.equal(m.ctrl, true);
    assert.equal(m.meta, false);
  });

  // ── 10. param 7 → Ctrl+Alt ───────────────────────
  it("param 7 → Ctrl+Alt", () => {
    const m = modifierFromCsiParam(7);
    assert.equal(m.shift, false);
    assert.equal(m.alt, true);
    assert.equal(m.ctrl, true);
    assert.equal(m.meta, false);
  });

  // ── 11. param 8 → Ctrl+Alt+Shift ─────────────────
  it("param 8 → Ctrl+Alt+Shift", () => {
    const m = modifierFromCsiParam(8);
    assert.equal(m.shift, true);
    assert.equal(m.alt, true);
    assert.equal(m.ctrl, true);
    assert.equal(m.meta, false);
  });

  // ── 12. param 9 → Meta ───────────────────────────
  it("param 9 → Meta", () => {
    const m = modifierFromCsiParam(9);
    assert.equal(m.shift, false);
    assert.equal(m.alt, false);
    assert.equal(m.ctrl, false);
    assert.equal(m.meta, true);
  });
});

// ════════════════════════════════════════════════════
//  类型判别（Discriminated Union）测试
// ════════════════════════════════════════════════════

describe("类型判别", () => {
  // ── 13. VtEvent type="csi" 可正确窄化 ────────────
  it("VtEvent type='csi' 可正确窄化并访问 params/final", () => {
    const evt: VtEvent = {
      type: "csi",
      params: [{ value: 1 }, { value: 2 }],
      intermediates: "",
      private_marker: "",
      final: "A",
    };

    if (evt.type === "csi") {
      // 窄化后可访问 CSI 特有字段
      assert.equal(evt.final, "A");
      assert.equal(evt.params.length, 2);
      assert.equal(evt.params[0].value, 1);
      assert.equal(evt.intermediates, "");
      assert.equal(evt.private_marker, "");
    } else {
      assert.fail("期望 type 为 'csi'");
    }
  });

  // ── 14. InputEvent type="key" 可正确窄化 ─────────
  it("InputEvent type='key' 可正确窄化并访问 key/modifiers", () => {
    const evt: InputEvent = {
      type: "key",
      key: "Enter",
      modifiers: MODIFIERS_NONE,
    };

    if (evt.type === "key") {
      // 窄化后可访问 KeyEvent 特有字段
      assert.equal(evt.key, "Enter");
      assert.equal(evt.modifiers.shift, false);
      assert.equal(hasModifier(evt.modifiers), false);
    } else {
      assert.fail("期望 type 为 'key'");
    }
  });
});
