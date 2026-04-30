import { describe, expect, test } from "bun:test";
import { RichText } from "./rich-text.js";
import { TextSpan } from "./text-span.js";

describe("RichText debugData", () => {
  test("constructor calls sendDebugData with text content", () => {
    const span = new TextSpan({ text: "hello world" });
    const widget = new RichText({ text: span });

    expect(widget.debugData.text).toBe("hello world");
  });

  test("nested TextSpan serializes full text", () => {
    const span = new TextSpan({
      text: "hello ",
      children: [new TextSpan({ text: "world" })],
    });
    const widget = new RichText({ text: span });

    expect(widget.debugData.text).toBe("hello world");
  });
});
