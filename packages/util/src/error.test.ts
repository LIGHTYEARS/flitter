import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { TimeoutError, callWithTimeout, type Result } from "./error.ts";

describe("TimeoutError", () => {
  it("is an instance of Error", () => {
    const err = new TimeoutError("test", 1000);
    assert.ok(err instanceof Error);
  });

  it("is an instance of TimeoutError", () => {
    const err = new TimeoutError("test", 1000);
    assert.ok(err instanceof TimeoutError);
  });

  it("has the configured timeout value", () => {
    const err = new TimeoutError("test", 5000);
    assert.equal(err.timeout, 5000);
  });

  it("has name set to 'TimeoutError'", () => {
    const err = new TimeoutError("test", 1000);
    assert.equal(err.name, "TimeoutError");
  });

  it("has the provided message", () => {
    const err = new TimeoutError("my custom message", 1000);
    assert.equal(err.message, "my custom message");
  });
});

describe("callWithTimeout", () => {
  it("resolves when promise completes before timeout", async () => {
    const result = await callWithTimeout(Promise.resolve(42), 1000);
    assert.equal(result, 42);
  });

  it("rejects with TimeoutError when timeout is exceeded", async () => {
    const slow = new Promise<string>((resolve) => {
      setTimeout(() => resolve("too late"), 5000);
    });
    await assert.rejects(
      () => callWithTimeout(slow, 50),
      (err: unknown) => {
        assert.ok(err instanceof TimeoutError);
        assert.equal(err.timeout, 50);
        return true;
      },
    );
  });

  it("uses custom message when provided", async () => {
    const slow = new Promise<void>((resolve) => {
      setTimeout(resolve, 5000);
    });
    await assert.rejects(
      () => callWithTimeout(slow, 50, "custom timeout msg"),
      (err: unknown) => {
        assert.ok(err instanceof TimeoutError);
        assert.equal(err.message, "custom timeout msg");
        return true;
      },
    );
  });

  it("uses default message when no custom message provided", async () => {
    const slow = new Promise<void>((resolve) => {
      setTimeout(resolve, 5000);
    });
    await assert.rejects(
      () => callWithTimeout(slow, 100),
      (err: unknown) => {
        assert.ok(err instanceof TimeoutError);
        assert.match(err.message, /timed out after 100ms/i);
        return true;
      },
    );
  });

  it("clears timer after successful resolution", async () => {
    const result = await callWithTimeout(Promise.resolve("fast"), 1000);
    assert.equal(result, "fast");
    // No lingering timer — if it leaked, the process would hang (test runner catches this)
  });
});

describe("Result type", () => {
  it("works with ok variant", () => {
    const result: Result<number> = { ok: true, value: 42 };
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.value, 42);
    }
  });

  it("works with error variant", () => {
    const result: Result<number> = { ok: false, error: new Error("fail") };
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.error.message, "fail");
    }
  });
});
