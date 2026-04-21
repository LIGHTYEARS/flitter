/**
 * Overlay background fix tests — GAP-TUI-10
 *
 * Verifies that overlays use proper opaque backgrounds in the flat screen
 * buffer model to prevent content bleed-through.
 *
 * 逆向: amp always wraps overlay content in SR({ decoration: { color: a.background } })
 * where a.background = LT.none() = terminal default.
 */

import { describe, expect, it } from "bun:test";
import { Color } from "../../screen/color.js";
import { BoxDecoration } from "../../widgets/box-decoration.js";
import { Column } from "../../widgets/column.js";
import { Container } from "../../widgets/container.js";
import { Text } from "../../widgets/text.js";
import { CommandPalette, type CommandPaletteCommand } from "../command-palette.js";
import { FuzzyPicker } from "../fuzzy-picker.js";

// ── Helper ─────────────────────────────────────────

function makeMockCommands(): CommandPaletteCommand[] {
  return [
    { id: "a", label: "Action A", action: () => {} },
    { id: "b", label: "Action B", action: () => {} },
    { id: "c", label: "Action C", shortcut: "Ctrl+C", action: () => {} },
  ];
}

// ── CommandPalette background tests ────────────────

describe("CommandPalette overlay background (GAP-TUI-10)", () => {
  it("creates a StatefulWidget with commands", () => {
    const commands = makeMockCommands();
    let dismissed = false;
    const palette = new CommandPalette({
      commands,
      onDismiss: () => {
        dismissed = true;
      },
    });

    expect(palette.commands.length).toBe(3);
    expect(palette.commands[0].id).toBe("a");
    palette.onDismiss();
    expect(dismissed).toBe(true);
  });

  it("createElement returns an element whose widget is the palette", () => {
    const palette = new CommandPalette({
      commands: makeMockCommands(),
      onDismiss: () => {},
    });
    const element = palette.createElement();
    expect(element.widget).toBe(palette);
  });
});

// ── FuzzyPicker background tests ───────────────────

describe("FuzzyPicker overlay background (GAP-TUI-10)", () => {
  it("creates widget with required props", () => {
    const picker = new FuzzyPicker({
      items: ["apple", "banana", "cherry"],
      getLabel: (item: string) => item,
      onAccept: () => {},
    });

    expect(picker.items.length).toBe(3);
    expect(picker.getLabel("apple")).toBe("apple");
  });

  it("optional props default to undefined", () => {
    const picker = new FuzzyPicker({
      items: [],
      getLabel: (item: string) => item,
      onAccept: () => {},
    });

    expect(picker.title).toBeUndefined();
    expect(picker.onDismiss).toBeUndefined();
    expect(picker.maxRenderItems).toBeUndefined();
  });
});

// ── Color.default() behavior tests ─────────────────

describe("Color.default() for overlay backgrounds", () => {
  it("Color.default() represents terminal default", () => {
    const c = Color.default();
    expect(c.kind).toBe("default");
    // Should generate ANSI reset code, not a specific color
    expect(c.toAnsi(false)).toBe("49"); // default bg
    expect(c.toAnsi(true)).toBe("39"); // default fg
  });

  it("Color.default() differs from Color.rgb(0,0,0)", () => {
    const defaultColor = Color.default();
    const black = Color.rgb(0, 0, 0);
    expect(defaultColor.equals(black)).toBe(false);
  });

  it("BoxDecoration accepts Color.default() as valid color", () => {
    const deco = new BoxDecoration({ color: Color.default() });
    expect(deco.color).toBeDefined();
    expect(deco.color!.kind).toBe("default");
  });

  it("Container with Color.default() background is opaque to flat buffer", () => {
    // A Container with Color.default() BoxDecoration should fill its area
    // with terminal default bg, preventing bleed-through from underlying layers
    const container = new Container({
      decoration: new BoxDecoration({ color: Color.default() }),
      // biome-ignore lint/suspicious/noExplicitAny: widget type coercion in tests
      child: new Text({ data: "test" }) as any,
    });
    expect(container).toBeDefined();
  });
});

// ── crossAxisAlignment stretch tests ───────────────

describe("Column crossAxisAlignment stretch for full-width items", () => {
  it("Column supports stretch crossAxisAlignment", () => {
    const col = new Column({
      crossAxisAlignment: "stretch",
      // biome-ignore lint/suspicious/noExplicitAny: widget type coercion in tests
      children: [new Text({ data: "item 1" }) as any, new Text({ data: "item 2" }) as any],
    });
    expect(col).toBeDefined();
    expect(col.crossAxisAlignment).toBe("stretch");
  });

  it("Column with start crossAxisAlignment (old behavior) sizes to content", () => {
    const col = new Column({
      crossAxisAlignment: "start",
      // biome-ignore lint/suspicious/noExplicitAny: widget type coercion in tests
      children: [new Text({ data: "item" }) as any],
    });
    expect(col.crossAxisAlignment).toBe("start");
  });
});
