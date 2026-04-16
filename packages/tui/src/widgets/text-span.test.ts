/**
 * TextSpan url / onTap 单元测试。
 *
 * @module
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { TextSpan } from "./text-span.js";

describe("TextSpan — url and onTap (amp G alignment)", () => {
  it("accepts url property", () => {
    const span = new TextSpan({ text: "Click me", url: "https://example.com" });
    assert.equal(span.url, "https://example.com");
  });

  it("accepts onTap callback", () => {
    let tapped = false;
    const span = new TextSpan({
      text: "Click me",
      onTap: () => {
        tapped = true;
      },
    });
    assert.ok(span.onTap);
    span.onTap!();
    assert.equal(tapped, true);
  });

  it("url and onTap default to undefined", () => {
    const span = new TextSpan({ text: "plain" });
    assert.equal(span.url, undefined);
    assert.equal(span.onTap, undefined);
  });
});
