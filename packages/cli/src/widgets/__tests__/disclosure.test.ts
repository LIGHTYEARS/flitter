import { describe, expect, it } from "bun:test";
import { Disclosure } from "@flitter/tui";

describe("Disclosure widget", () => {
  it("can be instantiated with title and child", () => {
    const widget = new Disclosure({
      title: null as any,
      child: null as any,
      expanded: false,
    });
    expect(widget).toBeDefined();
    expect(widget.config.expanded).toBe(false);
  });

  it("accepts onChanged callback", () => {
    let changed = false;
    const widget = new Disclosure({
      title: null as any,
      child: null as any,
      expanded: true,
      onChanged: (val: boolean) => {
        changed = val;
      },
    });
    expect(widget.config.expanded).toBe(true);
    widget.config.onChanged?.(false);
    expect(changed).toBe(false);
  });
});
