/**
 * InputField adaptive width tests.
 *
 * Verifies:
 * - InputField accepts an optional `width` config prop
 * - When `width` is provided, it overrides the default
 * - When `width` is omitted, it defaults to undefined (uses MediaQuery at render time)
 *
 * Amp cross-reference: Gm (TextField) in actions_intents.js line 704 has `maxWidth` prop.
 * Width calculation (line 903): `(this.widget.maxWidth || renderObjectWidth) - border*2 - padding`.
 *
 * @module
 */

import { afterEach, describe, expect, it } from "bun:test";
import type { BuildContext } from "@flitter/tui";
import { FocusManager, RichText } from "@flitter/tui";
import type { InputFieldConfig, InputFieldState } from "../input-field.js";
import { InputField } from "../input-field.js";

/**
 * Mount helper: creates InputFieldState and simulates the lifecycle.
 */
function mountInputField(config: InputFieldConfig): {
  widget: InputField;
  state: InputFieldState;
} {
  const widget = new InputField(config);
  const state = widget.createState();

  const mockElement = { markNeedsRebuild: () => {} };
  const s = state as Record<string, unknown>;
  s._widget = widget;
  s._element = mockElement;
  s._mounted = true;
  state.initState();

  return { widget, state };
}

/**
 * Extract all plain text from a Widget tree.
 */
function extractAllText(widget: Record<string, unknown>): string {
  let result = "";
  if (widget instanceof RichText) {
    result += widget.text.toPlainText();
  }
  if (Array.isArray(widget.children)) {
    for (const child of widget.children) {
      result += extractAllText(child as Record<string, unknown>);
    }
  }
  if (widget.child) {
    result += extractAllText(widget.child as Record<string, unknown>);
  }
  return result;
}

describe("InputField adaptive width", () => {
  afterEach(() => {
    try {
      FocusManager.instance.dispose();
    } catch {
      /* ignore */
    }
  });

  it("accepts an optional width prop that overrides the default", () => {
    const field = new InputField({ onSubmit: () => {}, width: 120 });
    expect(field.config.width).toBe(120);
  });

  it("defaults to undefined width (uses MediaQuery at render time)", () => {
    const field = new InputField({ onSubmit: () => {} });
    expect(field.config.width).toBeUndefined();
  });

  it("uses width prop for border rendering when provided", () => {
    const { state } = mountInputField({ onSubmit: () => {}, width: 40 });
    const built = state.build({} as BuildContext);
    const allText = extractAllText(built as unknown as Record<string, unknown>);

    // The top border should be ┌ + 40 x ─ + ┐ = 42 chars total
    const topBorderMatch = allText.match(/\u250C(\u2500+)\u2510/);
    expect(topBorderMatch).not.toBeNull();
    expect(topBorderMatch![1].length).toBe(40);

    state.dispose();
  });

  it("uses default width (78) when no width prop and no MediaQuery", () => {
    const { state } = mountInputField({ onSubmit: () => {} });
    // build with empty context -- MediaQuery.of will throw, fallback to default
    const built = state.build({} as BuildContext);
    const allText = extractAllText(built as unknown as Record<string, unknown>);

    const topBorderMatch = allText.match(/\u250C(\u2500+)\u2510/);
    expect(topBorderMatch).not.toBeNull();
    expect(topBorderMatch![1].length).toBe(78);

    state.dispose();
  });
});
