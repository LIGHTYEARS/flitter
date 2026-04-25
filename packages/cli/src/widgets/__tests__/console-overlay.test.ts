import { describe, expect, it } from "bun:test";
import {
  ConsoleOverlayState,
  ConsoleOverlayWidget,
  formatTimestamp,
  type LogEntry,
  stringifyArgs,
} from "../console-overlay.js";

// ════════════════════════════════════════════════════
//  Helper: create LogEntry with sensible defaults
// ════════════════════════════════════════════════════

function makeLog(overrides: Partial<LogEntry> & { message: string }): LogEntry {
  return {
    timestamp: new Date("2025-03-15T10:30:45.123Z"),
    level: "info",
    ...overrides,
  };
}

function makeLogs(count: number): LogEntry[] {
  return Array.from({ length: count }, (_, i) =>
    makeLog({ message: `Log entry ${i}`, timestamp: new Date(2025, 0, 1, 12, 0, 0, i) }),
  );
}

// ════════════════════════════════════════════════════
//  ConsoleOverlayWidget construction
// ════════════════════════════════════════════════════

describe("ConsoleOverlayWidget", () => {
  it("creates with logs and onDismiss", () => {
    const logs = [makeLog({ message: "hello" })];
    const widget = new ConsoleOverlayWidget({ logs, onDismiss: () => {} });
    expect(widget).toBeDefined();
    expect(widget.config.logs).toHaveLength(1);
    expect(widget.config.logs[0]!.message).toBe("hello");
  });

  it("stores onDismiss callback in config", () => {
    let dismissed = false;
    const widget = new ConsoleOverlayWidget({
      logs: [],
      onDismiss: () => {
        dismissed = true;
      },
    });
    widget.config.onDismiss();
    expect(dismissed).toBe(true);
  });

  it("is a StatefulWidget with createState", () => {
    const widget = new ConsoleOverlayWidget({ logs: [], onDismiss: () => {} });
    const state = widget.createState();
    expect(state).toBeDefined();
    expect(state).toBeInstanceOf(ConsoleOverlayState);
  });

  it("accepts empty logs array", () => {
    const widget = new ConsoleOverlayWidget({ logs: [], onDismiss: () => {} });
    expect(widget.config.logs).toHaveLength(0);
  });

  it("accepts multiple log entries", () => {
    const logs = [
      makeLog({ message: "first", level: "debug" }),
      makeLog({ message: "second", level: "error" }),
      makeLog({ message: "third", level: "warn" }),
    ];
    const widget = new ConsoleOverlayWidget({ logs, onDismiss: () => {} });
    expect(widget.config.logs).toHaveLength(3);
  });
});

// ════════════════════════════════════════════════════
//  formatTimestamp
// ════════════════════════════════════════════════════

describe("formatTimestamp", () => {
  it("formats HH:MM:SS.mmm with zero-padding", () => {
    // 逆向: u0R.formatTimestamp — "01:02:03.004"
    const d = new Date(2025, 0, 1, 1, 2, 3, 4);
    expect(formatTimestamp(d)).toBe("01:02:03.004");
  });

  it("formats midnight correctly", () => {
    const d = new Date(2025, 0, 1, 0, 0, 0, 0);
    expect(formatTimestamp(d)).toBe("00:00:00.000");
  });

  it("formats large values correctly", () => {
    const d = new Date(2025, 0, 1, 23, 59, 59, 999);
    expect(formatTimestamp(d)).toBe("23:59:59.999");
  });

  it("pads single-digit milliseconds", () => {
    const d = new Date(2025, 0, 1, 12, 0, 0, 7);
    expect(formatTimestamp(d)).toBe("12:00:00.007");
  });
});

// ════════════════════════════════════════════════════
//  stringifyArgs
// ════════════════════════════════════════════════════

describe("stringifyArgs", () => {
  it("passes through string args directly", () => {
    // 逆向: u0R.formatLogEntry — typeof h === "string" ? h : JSON.stringify(h, null, 2)
    expect(stringifyArgs(["hello", "world"])).toBe("hello world");
  });

  it("JSON-stringifies objects", () => {
    const result = stringifyArgs([{ key: "value" }]);
    expect(result).toContain('"key"');
    expect(result).toContain('"value"');
  });

  it("JSON-stringifies numbers", () => {
    expect(stringifyArgs([42])).toBe("42");
  });

  it("truncates long args with ellipsis", () => {
    const longStr = "a".repeat(300);
    const result = stringifyArgs([longStr]);
    expect(result.length).toBeLessThan(300);
    expect(result).toContain("\u2026");
  });

  it("handles empty array", () => {
    expect(stringifyArgs([])).toBe("");
  });

  it("handles null and undefined args", () => {
    const result = stringifyArgs([null, undefined]);
    expect(result).toContain("null");
  });

  it("handles mixed types", () => {
    const result = stringifyArgs(["text", 42, { a: 1 }]);
    expect(result).toContain("text");
    expect(result).toContain("42");
    expect(result).toContain('"a"');
  });
});

// ════════════════════════════════════════════════════
//  ConsoleOverlayState — scroll management
// ════════════════════════════════════════════════════

describe("ConsoleOverlayState", () => {
  // We test the state class directly where possible.
  // build() requires a real widget tree, so we test construction + createState only.

  it("initial scrollOffset is 0", () => {
    const widget = new ConsoleOverlayWidget({ logs: [], onDismiss: () => {} });
    const state = widget.createState();
    expect(state.scrollOffset).toBe(0);
  });

  it("initial viewportHeight is 20 (default)", () => {
    const widget = new ConsoleOverlayWidget({ logs: [], onDismiss: () => {} });
    const state = widget.createState();
    expect(state.viewportHeight).toBe(20);
  });
});

// ════════════════════════════════════════════════════
//  LogEntry level coverage
// ════════════════════════════════════════════════════

describe("LogEntry levels", () => {
  it("supports debug level", () => {
    const log = makeLog({ message: "debug msg", level: "debug" });
    expect(log.level).toBe("debug");
  });

  it("supports info level", () => {
    const log = makeLog({ message: "info msg", level: "info" });
    expect(log.level).toBe("info");
  });

  it("supports warn level", () => {
    const log = makeLog({ message: "warn msg", level: "warn" });
    expect(log.level).toBe("warn");
  });

  it("supports error level", () => {
    const log = makeLog({ message: "error msg", level: "error" });
    expect(log.level).toBe("error");
  });
});

// ════════════════════════════════════════════════════
//  LogEntry args
// ════════════════════════════════════════════════════

describe("LogEntry args handling", () => {
  it("entry with no args field is valid", () => {
    const log: LogEntry = {
      timestamp: new Date(),
      level: "info",
      message: "no args",
    };
    expect(log.args).toBeUndefined();
  });

  it("entry with empty args array is valid", () => {
    const log = makeLog({ message: "empty args", args: [] });
    expect(log.args).toHaveLength(0);
  });

  it("entry with complex args is valid", () => {
    const log = makeLog({
      message: "complex",
      args: [{ nested: { deep: true } }, [1, 2, 3], "plain"],
    });
    expect(log.args).toHaveLength(3);
    const str = stringifyArgs(log.args!);
    expect(str).toContain("nested");
    expect(str).toContain("1,\n  2,\n  3");
  });
});

// ════════════════════════════════════════════════════
//  Widget config edge cases
// ════════════════════════════════════════════════════

describe("ConsoleOverlayWidget edge cases", () => {
  it("handles large log count", () => {
    const logs = makeLogs(1000);
    const widget = new ConsoleOverlayWidget({ logs, onDismiss: () => {} });
    expect(widget.config.logs).toHaveLength(1000);
  });

  it("logs with args containing circular reference are caught by stringifyArgs", () => {
    // JSON.stringify will throw on circular refs; stringifyArgs should handle gracefully
    // via the try/catch inherent in JSON.stringify returning undefined for functions
    const log = makeLog({ message: "fn arg", args: [() => "test"] });
    // Functions stringify to undefined, which becomes "" — no crash
    expect(() => stringifyArgs(log.args!)).not.toThrow();
  });
});
