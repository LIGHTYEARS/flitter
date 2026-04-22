/**
 * Unit tests for ThreadNavigationHistory.
 *
 * 逆向: SrT navigation logic (2633_unknown_SrT.js:88-121)
 */

import { describe, expect, test } from "bun:test";
import { ThreadNavigationHistory } from "../thread-navigation.js";

describe("ThreadNavigationHistory", () => {
  test("initial state: canNavigateBack and canNavigateForward are both false", () => {
    const nav = new ThreadNavigationHistory();
    expect(nav.canNavigateBack()).toBe(false);
    expect(nav.canNavigateForward()).toBe(false);
  });

  test("initial getCurrentThread returns null", () => {
    const nav = new ThreadNavigationHistory();
    expect(nav.getCurrentThread()).toBeNull();
  });

  test("setCurrentThread updates the current ID", () => {
    const nav = new ThreadNavigationHistory();
    nav.setCurrentThread("thread-1");
    expect(nav.getCurrentThread()).toBe("thread-1");
  });

  // ─── recordNavigation ──────────────────────────────────────

  test("recordNavigation pushes to backStack and enables canNavigateBack", () => {
    const nav = new ThreadNavigationHistory();
    nav.setCurrentThread("thread-1");
    nav.recordNavigation("thread-1");
    expect(nav.canNavigateBack()).toBe(true);
    expect(nav.canNavigateForward()).toBe(false);
  });

  test("recordNavigation clears forwardStack", () => {
    const nav = new ThreadNavigationHistory();
    nav.setCurrentThread("thread-A");
    nav.recordNavigation("thread-A"); // A -> B
    nav.setCurrentThread("thread-B");
    nav.recordNavigation("thread-B"); // B -> C
    nav.setCurrentThread("thread-C");
    nav.navigateBack(); // back to B, forwardStack=[C]
    expect(nav.canNavigateForward()).toBe(true);

    // Now navigate somewhere new — forward should be cleared
    nav.recordNavigation(nav.getCurrentThread()!); // B -> D (new branch)
    expect(nav.canNavigateForward()).toBe(false);
  });

  // ─── navigateBack ──────────────────────────────────────────

  test("navigateBack returns null when stack is empty", () => {
    const nav = new ThreadNavigationHistory();
    expect(nav.navigateBack()).toBeNull();
  });

  test("navigateBack pops from backStack and returns thread ID", () => {
    const nav = new ThreadNavigationHistory();
    nav.setCurrentThread("thread-B");
    nav.recordNavigation("thread-A"); // back=[A], forward=[]
    const result = nav.navigateBack();
    expect(result).toBe("thread-A");
  });

  test("navigateBack pushes current to forwardStack", () => {
    const nav = new ThreadNavigationHistory();
    nav.setCurrentThread("thread-B");
    nav.recordNavigation("thread-A"); // back=[A]
    nav.navigateBack(); // back=[], forward=[B]
    expect(nav.canNavigateForward()).toBe(true);
    expect(nav.canNavigateBack()).toBe(false);
  });

  test("navigateBack updates getCurrentThread to the popped ID", () => {
    const nav = new ThreadNavigationHistory();
    nav.setCurrentThread("thread-B");
    nav.recordNavigation("thread-A");
    nav.navigateBack();
    expect(nav.getCurrentThread()).toBe("thread-A");
  });

  // ─── navigateForward ───────────────────────────────────────

  test("navigateForward returns null when forward stack is empty", () => {
    const nav = new ThreadNavigationHistory();
    expect(nav.navigateForward()).toBeNull();
  });

  test("navigateForward pops from forwardStack and returns thread ID", () => {
    const nav = new ThreadNavigationHistory();
    nav.setCurrentThread("thread-B");
    nav.recordNavigation("thread-A"); // back=[A]
    nav.navigateBack(); // back=[], forward=[B], current=A
    const result = nav.navigateForward(); // back=[A], forward=[], current=B
    expect(result).toBe("thread-B");
  });

  test("navigateForward pushes current to backStack", () => {
    const nav = new ThreadNavigationHistory();
    nav.setCurrentThread("thread-B");
    nav.recordNavigation("thread-A");
    nav.navigateBack(); // at A, forward=[B]
    nav.navigateForward(); // at B, back=[A]
    expect(nav.canNavigateBack()).toBe(true);
  });

  test("navigateForward updates getCurrentThread to the popped ID", () => {
    const nav = new ThreadNavigationHistory();
    nav.setCurrentThread("thread-B");
    nav.recordNavigation("thread-A");
    nav.navigateBack(); // at A
    nav.navigateForward(); // at B
    expect(nav.getCurrentThread()).toBe("thread-B");
  });

  // ─── Full navigation cycle ─────────────────────────────────

  test("full A->B->C cycle: back to B, forward to C", () => {
    const nav = new ThreadNavigationHistory();

    // Simulate: start at A, navigate to B, then C
    nav.setCurrentThread("A");
    nav.recordNavigation("A"); // back=[A], navigating to B
    nav.setCurrentThread("B");
    nav.recordNavigation("B"); // back=[A, B], navigating to C
    nav.setCurrentThread("C");

    // Back: should go to B
    expect(nav.canNavigateBack()).toBe(true);
    expect(nav.navigateBack()).toBe("B");
    expect(nav.getCurrentThread()).toBe("B");
    expect(nav.canNavigateForward()).toBe(true); // C is in forward

    // Forward: should go back to C
    expect(nav.navigateForward()).toBe("C");
    expect(nav.getCurrentThread()).toBe("C");
    expect(nav.canNavigateForward()).toBe(false);
  });

  test("multiple back navigations in sequence", () => {
    const nav = new ThreadNavigationHistory();

    nav.setCurrentThread("A");
    nav.recordNavigation("A");
    nav.setCurrentThread("B");
    nav.recordNavigation("B");
    nav.setCurrentThread("C");
    nav.recordNavigation("C");
    nav.setCurrentThread("D");

    // Back: D -> C -> B -> A
    expect(nav.navigateBack()).toBe("C");
    expect(nav.navigateBack()).toBe("B");
    expect(nav.navigateBack()).toBe("A");
    expect(nav.canNavigateBack()).toBe(false);
    expect(nav.navigateBack()).toBeNull();
  });

  test("forward is cleared after new navigation from middle of stack", () => {
    const nav = new ThreadNavigationHistory();

    // Navigate A -> B -> C
    nav.setCurrentThread("A");
    nav.recordNavigation("A");
    nav.setCurrentThread("B");
    nav.recordNavigation("B");
    nav.setCurrentThread("C");

    // Go back to B
    nav.navigateBack();
    expect(nav.canNavigateForward()).toBe(true); // C in forward

    // Navigate from B to D (new branch)
    nav.recordNavigation(nav.getCurrentThread()!);
    nav.setCurrentThread("D");

    // Forward should be cleared
    expect(nav.canNavigateForward()).toBe(false);
    // Back should still work (B is in back)
    expect(nav.canNavigateBack()).toBe(true);
  });

  test("navigateBack with null currentThread does not push null to forwardStack", () => {
    const nav = new ThreadNavigationHistory();
    // Back stack has an entry, but current is null (never set)
    nav.recordNavigation("thread-X"); // back=[X]
    const result = nav.navigateBack(); // should navigate to X
    expect(result).toBe("thread-X");
    // Forward should be empty since current was null
    expect(nav.canNavigateForward()).toBe(false);
  });
});
