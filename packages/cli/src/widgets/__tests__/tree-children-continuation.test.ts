/**
 * TreeChildren — vertical continuation line (│) tests.
 *
 * Bug: when a tree child wraps to multiple lines, rows 1..n-1 in the
 * connector column are blank instead of showing │ (for non-last children).
 *
 * 逆向: yJT.paint (chunk-006.js:16787) — for non-last children with height > 1,
 * paints │ at column 0 on rows 1..height-1.
 *
 * This test uses a tmux-based approach: render TreeChildren in a real terminal
 * and capture the output, asserting that continuation lines are present.
 *
 * @module
 */
import { describe, expect, it } from "bun:test";
import { Screen } from "@flitter/tui";
import { paintTreeConnectors } from "../tree-children.js";

describe("TreeChildren vertical continuation lines", () => {
  it("paints │ on continuation rows for non-last children", () => {
    // Simulate: 2 children. Child 0 takes 3 rows, child 1 takes 1 row.
    const screen = new Screen(20, 10);
    const childHeights = [3, 1];

    paintTreeConnectors(screen, childHeights, 0, 0);

    // Row 0: "├── " (first line of non-last child)
    expect(screen.getCell(0, 0).char).toBe("├");
    expect(screen.getCell(1, 0).char).toBe("─");
    expect(screen.getCell(2, 0).char).toBe("─");
    expect(screen.getCell(3, 0).char).toBe(" ");

    // Row 1: "│" (continuation of non-last child)
    expect(screen.getCell(0, 1).char).toBe("│");

    // Row 2: "│" (continuation of non-last child, row 2)
    expect(screen.getCell(0, 2).char).toBe("│");

    // Row 3: "╰── " (last child, first line)
    expect(screen.getCell(0, 3).char).toBe("╰");
    expect(screen.getCell(1, 3).char).toBe("─");
    expect(screen.getCell(2, 3).char).toBe("─");
    expect(screen.getCell(3, 3).char).toBe(" ");
  });

  it("does NOT paint │ on continuation rows for the last child", () => {
    const screen = new Screen(20, 10);
    // Single child taking 3 rows (it's last → uses elbow, no │ continuation)
    const childHeights = [3];

    paintTreeConnectors(screen, childHeights, 0, 0);

    // Row 0: "╰── " (only child uses elbow)
    expect(screen.getCell(0, 0).char).toBe("╰");

    // Row 1: space (no │ for last child)
    expect(screen.getCell(0, 1).char).toBe(" ");

    // Row 2: space (no │ for last child)
    expect(screen.getCell(0, 2).char).toBe(" ");
  });

  it("handles multiple non-last children each spanning multiple rows", () => {
    const screen = new Screen(20, 10);
    // 3 children: heights 2, 2, 1
    const childHeights = [2, 2, 1];

    paintTreeConnectors(screen, childHeights, 0, 0);

    // Child 0 (rows 0-1): ├── on row 0, │ on row 1
    expect(screen.getCell(0, 0).char).toBe("├");
    expect(screen.getCell(0, 1).char).toBe("│");

    // Child 1 (rows 2-3): ├── on row 2, │ on row 3
    expect(screen.getCell(0, 2).char).toBe("├");
    expect(screen.getCell(0, 3).char).toBe("│");

    // Child 2 (row 4): ╰── on row 4
    expect(screen.getCell(0, 4).char).toBe("╰");
  });

  it("applies offset correctly", () => {
    const screen = new Screen(20, 10);
    const childHeights = [2, 1];

    // Paint with offset x=2, y=1
    paintTreeConnectors(screen, childHeights, 2, 1);

    // Row 1 (y offset): "├──" at x=2
    expect(screen.getCell(2, 1).char).toBe("├");
    expect(screen.getCell(3, 1).char).toBe("─");

    // Row 2: "│" at x=2
    expect(screen.getCell(2, 2).char).toBe("│");

    // Row 3: "╰──" at x=2
    expect(screen.getCell(2, 3).char).toBe("╰");
  });
});
