/**
 * keyboard-tester command — basic unit tests.
 *
 * We only test that the module exports the expected handler function.
 * Full TTY interaction testing requires a real terminal and is not
 * feasible in unit tests. Use tmux E2E testing for interactive verification.
 */

import { describe, expect, it } from "bun:test";
import { handleKeyboardTester } from "./keyboard-tester";

describe("keyboard-tester", () => {
  it("exports handleKeyboardTester as a function", () => {
    expect(typeof handleKeyboardTester).toBe("function");
  });

  it("handleKeyboardTester returns a promise", () => {
    // When stdin is not a TTY (as in test runner), it should
    // return early with exitCode = 1 instead of blocking.
    const result = handleKeyboardTester({ raw: false });
    expect(result).toBeInstanceOf(Promise);
  });

  it("exits gracefully when stdin is not a TTY", async () => {
    // In test runner, stdin.isTTY is false, so handleKeyboardTester
    // should return without blocking and set exitCode to 1.
    await handleKeyboardTester({ raw: false });
    expect(process.exitCode).toBe(1);
    // Restore to 0 so the test runner exits cleanly
    process.exitCode = 0;
  });
});
