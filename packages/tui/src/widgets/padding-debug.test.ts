import { describe, expect, test } from "bun:test";
import { BoxConstraints } from "../tree/constraints.js";
import { EdgeInsets } from "./edge-insets.js";
import { Padding } from "./padding.js";

describe("RenderPadding debugData", () => {
  test("performLayout calls sendDebugData with padding", () => {
    const padding = EdgeInsets.all(8);
    const widget = new Padding({ padding });
    const ro = widget.createRenderObject();

    // Layout the render object so performLayout runs
    const constraints = new BoxConstraints({
      minWidth: 0,
      maxWidth: 80,
      minHeight: 0,
      maxHeight: 24,
    });
    (ro as any).layout(constraints);

    expect(ro.debugData).toBeDefined();
    expect(ro.debugData.padding).toEqual(padding);
  });
});
