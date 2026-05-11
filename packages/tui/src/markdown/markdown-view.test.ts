/**
 * MarkdownView Widget 测试。
 *
 * @module
 */

import { describe, expect, it } from "bun:test";
import { MarkdownView } from "./markdown-view.js";
import { StatelessWidget } from "../tree/stateless-widget.js";
import { Key } from "../tree/widget.js";

describe("MarkdownView", () => {
  it("是 StatelessWidget 的实例", () => {
    const view = new MarkdownView({ content: "hello" });
    expect(view).toBeInstanceOf(StatelessWidget);
  });

  it("保存 content 属性", () => {
    const view = new MarkdownView({ content: "# Title\n\nParagraph" });
    expect(view.content).toBe("# Title\n\nParagraph");
  });

  it("streaming 默认为 false", () => {
    const view = new MarkdownView({ content: "text" });
    expect(view.streaming).toBe(false);
  });

  it("接受 streaming 和 colorTransform 参数", () => {
    const transform = (offset: number, color: any) => color;
    const view = new MarkdownView({
      content: "text",
      streaming: true,
      colorTransform: transform,
    });
    expect(view.streaming).toBe(true);
    expect(view.colorTransform).toBe(transform);
  });

  it("接受 key 参数", () => {
    const key = new Key("md-1");
    const view = new MarkdownView({ content: "x", key });
    expect(view.key).toBe(key);
    expect(view.key?.value).toBe("md-1");
  });

  it("无 key 时 key 为 undefined", () => {
    const view = new MarkdownView({ content: "x" });
    expect(view.key).toBeUndefined();
  });
});
