/**
 * ThreadNavigator test suite.
 *
 * 逆向: SrT in modules/2633_unknown_SrT.js
 * Tests the back/forward navigation stack matching amp's behavior.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ThreadNavigator } from "./thread-navigator.js";

describe("ThreadNavigator", () => {
  it("initially cannot go back or forward", () => {
    const nav = new ThreadNavigator();
    assert.equal(nav.canGoBack(), false);
    assert.equal(nav.canGoForward(), false);
    assert.equal(nav.back(), null);
    assert.equal(nav.forward(), null);
  });

  it("push sets current thread", () => {
    const nav = new ThreadNavigator();
    nav.push("t1");
    assert.equal(nav.getCurrentThreadId(), "t1");
    assert.equal(nav.canGoBack(), false);
  });

  it("push to a different thread enables back navigation", () => {
    const nav = new ThreadNavigator();
    nav.push("t1");
    nav.push("t2");
    assert.equal(nav.getCurrentThreadId(), "t2");
    assert.equal(nav.canGoBack(), true);
    assert.equal(nav.canGoForward(), false);
  });

  it("back returns previous thread and enables forward", () => {
    const nav = new ThreadNavigator();
    nav.push("t1");
    nav.push("t2");

    const result = nav.back();
    assert.equal(result, "t1");
    assert.equal(nav.getCurrentThreadId(), "t1");
    assert.equal(nav.canGoBack(), false);
    assert.equal(nav.canGoForward(), true);
  });

  it("forward returns next thread after back", () => {
    const nav = new ThreadNavigator();
    nav.push("t1");
    nav.push("t2");

    nav.back(); // back to t1
    const result = nav.forward();
    assert.equal(result, "t2");
    assert.equal(nav.getCurrentThreadId(), "t2");
    assert.equal(nav.canGoBack(), true);
    assert.equal(nav.canGoForward(), false);
  });

  // 逆向: SrT.recordNavigation clears forward stack (line 564)
  it("push after back clears forward stack", () => {
    const nav = new ThreadNavigator();
    nav.push("t1");
    nav.push("t2");
    nav.push("t3");

    nav.back(); // t2
    nav.back(); // t1
    assert.equal(nav.canGoForward(), true);
    assert.equal(nav.forwardStackSize, 2);

    // Push a new thread — forward stack should be cleared
    nav.push("t4");
    assert.equal(nav.canGoForward(), false);
    assert.equal(nav.forwardStackSize, 0);
    assert.equal(nav.canGoBack(), true);
  });

  it("handles deep navigation chain", () => {
    const nav = new ThreadNavigator();
    nav.push("t1");
    nav.push("t2");
    nav.push("t3");
    nav.push("t4");

    assert.equal(nav.backStackSize, 3);

    assert.equal(nav.back(), "t3");
    assert.equal(nav.back(), "t2");
    assert.equal(nav.back(), "t1");
    assert.equal(nav.back(), null); // exhausted

    assert.equal(nav.forwardStackSize, 3);
    assert.equal(nav.forward(), "t2");
    assert.equal(nav.forward(), "t3");
    assert.equal(nav.forward(), "t4");
    assert.equal(nav.forward(), null); // exhausted
  });

  it("push same thread is a no-op for stacks", () => {
    const nav = new ThreadNavigator();
    nav.push("t1");
    nav.push("t1"); // same thread — should not push to back stack
    assert.equal(nav.canGoBack(), false);
    assert.equal(nav.backStackSize, 0);
  });

  it("reset clears all state", () => {
    const nav = new ThreadNavigator();
    nav.push("t1");
    nav.push("t2");
    nav.push("t3");
    nav.back();

    nav.reset();
    assert.equal(nav.canGoBack(), false);
    assert.equal(nav.canGoForward(), false);
    assert.equal(nav.getCurrentThreadId(), null);
    assert.equal(nav.backStackSize, 0);
    assert.equal(nav.forwardStackSize, 0);
  });

  it("interleaved back/forward/push", () => {
    const nav = new ThreadNavigator();
    nav.push("t1");
    nav.push("t2");
    nav.push("t3");

    // Go back twice
    nav.back(); // → t2
    nav.back(); // → t1

    // Go forward once
    nav.forward(); // → t2

    // Push new thread (should clear forward to t3)
    nav.push("t4");
    assert.equal(nav.getCurrentThreadId(), "t4");
    assert.equal(nav.canGoForward(), false);
    assert.equal(nav.canGoBack(), true);

    // Back should go to t2 → t1
    assert.equal(nav.back(), "t2");
    assert.equal(nav.back(), "t1");
    assert.equal(nav.back(), null);
  });
});
