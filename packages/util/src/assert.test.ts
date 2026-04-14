import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { assertDefined, assertNever, assert as utilAssert } from "./assert.ts";

describe("assert", () => {
  it("does not throw for true", () => {
    utilAssert(true);
  });

  it("throws with default message for false", () => {
    assert.throws(() => utilAssert(false), {
      message: "Assertion failed",
    });
  });

  it("throws with custom message for false", () => {
    assert.throws(() => utilAssert(false, "custom error"), {
      message: "custom error",
    });
  });

  it("does not throw for truthy values: non-empty string", () => {
    utilAssert("hello");
  });

  it("does not throw for truthy values: number", () => {
    utilAssert(1);
    utilAssert(-1);
    utilAssert(42);
  });

  it("does not throw for truthy values: object", () => {
    utilAssert({});
    utilAssert([]);
  });

  it("throws for falsy value: 0", () => {
    assert.throws(() => utilAssert(0));
  });

  it("throws for falsy value: empty string", () => {
    assert.throws(() => utilAssert(""));
  });

  it("throws for falsy value: null", () => {
    assert.throws(() => utilAssert(null));
  });

  it("throws for falsy value: undefined", () => {
    assert.throws(() => utilAssert(undefined));
  });
});

describe("assertNever", () => {
  it("always throws", () => {
    assert.throws(() => assertNever("unexpected" as never));
  });

  it("includes unexpected value in default message", () => {
    assert.throws(
      () => assertNever("bad_value" as never),
      (err: unknown) => {
        assert.ok(err instanceof Error);
        assert.match(err.message, /bad_value/);
        return true;
      },
    );
  });

  it("uses custom message when provided", () => {
    assert.throws(() => assertNever("x" as never, "should not happen"), {
      message: "should not happen",
    });
  });
});

describe("assertDefined", () => {
  it("returns value when defined", () => {
    assert.equal(assertDefined(42), 42);
    assert.equal(assertDefined("hello"), "hello");
    assert.equal(assertDefined(0), 0);
    assert.equal(assertDefined(""), "");
    assert.equal(assertDefined(false), false);
  });

  it("throws for null", () => {
    assert.throws(
      () => assertDefined(null),
      (err: unknown) => {
        assert.ok(err instanceof Error);
        assert.match(err.message, /null/);
        return true;
      },
    );
  });

  it("throws for undefined", () => {
    assert.throws(
      () => assertDefined(undefined),
      (err: unknown) => {
        assert.ok(err instanceof Error);
        assert.match(err.message, /undefined/);
        return true;
      },
    );
  });

  it("uses custom message when provided", () => {
    assert.throws(() => assertDefined(null, "value required"), { message: "value required" });
  });
});
