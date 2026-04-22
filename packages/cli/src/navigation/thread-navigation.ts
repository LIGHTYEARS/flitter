/**
 * Thread navigation history — back/forward stack management.
 *
 * 逆向: SrT class in amp-cli-reversed/modules/2633_unknown_SrT.js:30-121
 *
 * Amp keeps two parallel stacks (threadBackStack, threadForwardStack) on the
 * SrT pool class. When the user navigates to a new thread, the current thread
 * is pushed onto the back-stack and the forward-stack is cleared.
 * navigateBack() pops the back-stack, pushes current to forward-stack, and
 * switches to the popped ID. navigateForward() does the mirror operation.
 *
 * Both navigation methods roll back the stack change on switch failure, so
 * the stacks stay consistent even if the worker fails to load. Flitter omits
 * the rollback since the navigation layer is independent of the worker here —
 * callers own error handling.
 */

export class ThreadNavigationHistory {
  private backStack: string[] = [];
  private forwardStack: string[] = [];
  private currentThreadId: string | null = null;

  /**
   * Record a navigation from the given thread.
   *
   * 逆向: SrT.recordNavigation() (2633_unknown_SrT.js:563-565)
   * Amp: `this.threadBackStack.push(T); this.threadForwardStack = []`
   * Push prevId onto backStack, then clear forwardStack (new branch invalidates forward history).
   */
  recordNavigation(fromThreadId: string): void {
    this.backStack.push(fromThreadId);
    this.forwardStack = [];
  }

  /**
   * Navigate back: pop from backStack, push current to forwardStack.
   *
   * 逆向: SrT.navigateBack() (2633_unknown_SrT.js:94-107)
   * Amp: pops threadBackStack, pushes currentWorker.thread.id to forwardStack,
   *   then calls switchToThreadByID with recordNavigation: false.
   *   On failure: pops forwardStack and pushes back to backStack (rollback).
   *
   * Returns the thread ID to switch to, or null if the stack is empty.
   */
  navigateBack(): string | null {
    if (!this.canNavigateBack()) return null;
    const targetId = this.backStack.pop()!;
    if (this.currentThreadId !== null) {
      this.forwardStack.push(this.currentThreadId);
    }
    this.currentThreadId = targetId;
    return targetId;
  }

  /**
   * Navigate forward: pop from forwardStack, push current to backStack.
   *
   * 逆向: SrT.navigateForward() (2633_unknown_SrT.js:108-121)
   * Amp: pops threadForwardStack, pushes currentWorker.thread.id to backStack,
   *   then calls switchToThreadByID with recordNavigation: false.
   *   On failure: pops backStack and pushes back to forwardStack (rollback).
   *
   * Returns the thread ID to switch to, or null if the stack is empty.
   */
  navigateForward(): string | null {
    if (!this.canNavigateForward()) return null;
    const targetId = this.forwardStack.pop()!;
    if (this.currentThreadId !== null) {
      this.backStack.push(this.currentThreadId);
    }
    this.currentThreadId = targetId;
    return targetId;
  }

  /**
   * Returns true when there is at least one entry in the back-stack.
   *
   * 逆向: SrT.canNavigateBack() (2633_unknown_SrT.js:88-90)
   * Amp: `return this.threadBackStack.length > 0`
   */
  canNavigateBack(): boolean {
    return this.backStack.length > 0;
  }

  /**
   * Returns true when there is at least one entry in the forward-stack.
   *
   * 逆向: SrT.canNavigateForward() (2633_unknown_SrT.js:91-93)
   * Amp: `return this.threadForwardStack.length > 0`
   */
  canNavigateForward(): boolean {
    return this.forwardStack.length > 0;
  }

  /**
   * Set the current thread ID (e.g. after external navigation or initial load).
   *
   * This does NOT push anything onto the stacks — it simply records which
   * thread is "active" so that navigateBack/Forward can push the correct ID.
   */
  setCurrentThread(threadId: string): void {
    this.currentThreadId = threadId;
  }

  /**
   * Returns the current thread ID as tracked by this history object.
   */
  getCurrentThread(): string | null {
    return this.currentThreadId;
  }
}
