/**
 * @flitter/data — ThreadNavigator: back/forward navigation history
 *
 * 逆向: SrT in modules/2633_unknown_SrT.js
 *   - threadBackStack: string[] (line 30)
 *   - threadForwardStack: string[] (line 31)
 *   - canNavigateBack(): boolean (line 88-89)
 *   - canNavigateForward(): boolean (line 91-92)
 *   - navigateBack(): async (line 94-106)
 *   - navigateForward(): async (line 108-120)
 *   - recordNavigation(T): void (line 563-564)
 *
 * amp's ThreadPool (SrT) manages a back/forward stack of thread IDs.
 * When switching threads with recordNavigation=true, the current thread
 * is pushed onto the back stack and the forward stack is cleared.
 * navigateBack pops from back, pushes current onto forward.
 * navigateForward pops from forward, pushes current onto back.
 * On error, both operations roll back the stack changes.
 *
 * This standalone ThreadNavigator extracts the navigation data layer
 * so it can be wired into CLI commands (/back, /forward) and
 * keyboard shortcuts (Alt+Left, Alt+Right).
 */

/**
 * ThreadNavigator manages a browser-like back/forward history
 * of thread IDs visited in the current session.
 *
 * 逆向: SrT.threadBackStack, SrT.threadForwardStack in modules/2633_unknown_SrT.js
 */
export class ThreadNavigator {
  /**
   * Stack of thread IDs for "go back" navigation.
   * 逆向: SrT.threadBackStack = [] (line 30)
   */
  private backStack: string[] = [];

  /**
   * Stack of thread IDs for "go forward" navigation.
   * 逆向: SrT.threadForwardStack = [] (line 31)
   */
  private forwardStack: string[] = [];

  /**
   * The current active thread ID, if any.
   */
  private currentThreadId: string | null = null;

  /**
   * Record a navigation to a new thread.
   * Pushes the current thread onto the back stack and clears the forward stack.
   *
   * 逆向: SrT.recordNavigation(T) at line 563-564:
   *   this.threadBackStack.push(T), this.threadForwardStack = []
   *
   * 逆向: SrT.switchToWorker at line 556-558:
   *   if (R.recordNavigation && T.thread.id !== a) this.recordNavigation(a)
   *
   * @param threadId - the thread ID being navigated to
   */
  push(threadId: string): void {
    if (this.currentThreadId !== null && this.currentThreadId !== threadId) {
      this.backStack.push(this.currentThreadId);
      this.forwardStack = [];
    }
    this.currentThreadId = threadId;
  }

  /**
   * Navigate back to the previous thread.
   * Returns the thread ID to navigate to, or null if the back stack is empty.
   *
   * 逆向: SrT.navigateBack() at lines 94-106:
   *   let T = this.currentWorker.thread.id,
   *       R = this.threadBackStack.pop();
   *   if (!R) return;
   *   this.threadForwardStack.push(T);
   *   // switch to R
   *   // on error: this.threadForwardStack.pop(), this.threadBackStack.push(R)
   *
   * @returns previous thread ID, or null
   */
  back(): string | null {
    if (!this.canGoBack()) return null;
    const target = this.backStack.pop()!;
    if (this.currentThreadId !== null) {
      this.forwardStack.push(this.currentThreadId);
    }
    this.currentThreadId = target;
    return target;
  }

  /**
   * Navigate forward to the next thread (after having gone back).
   * Returns the thread ID to navigate to, or null if the forward stack is empty.
   *
   * 逆向: SrT.navigateForward() at lines 108-120:
   *   let T = this.currentWorker.thread.id,
   *       R = this.threadForwardStack.pop();
   *   if (!R) return;
   *   this.threadBackStack.push(T);
   *   // switch to R
   *   // on error: this.threadBackStack.pop(), this.threadForwardStack.push(R)
   *
   * @returns next thread ID, or null
   */
  forward(): string | null {
    if (!this.canGoForward()) return null;
    const target = this.forwardStack.pop()!;
    if (this.currentThreadId !== null) {
      this.backStack.push(this.currentThreadId);
    }
    this.currentThreadId = target;
    return target;
  }

  /**
   * Whether back navigation is possible.
   *
   * 逆向: SrT.canNavigateBack() at line 88-89:
   *   return this.threadBackStack.length > 0
   */
  canGoBack(): boolean {
    return this.backStack.length > 0;
  }

  /**
   * Whether forward navigation is possible.
   *
   * 逆向: SrT.canNavigateForward() at line 91-92:
   *   return this.threadForwardStack.length > 0
   */
  canGoForward(): boolean {
    return this.forwardStack.length > 0;
  }

  /**
   * Get the current thread ID.
   */
  getCurrentThreadId(): string | null {
    return this.currentThreadId;
  }

  /**
   * Get the back stack depth (for testing/debugging).
   */
  get backStackSize(): number {
    return this.backStack.length;
  }

  /**
   * Get the forward stack depth (for testing/debugging).
   */
  get forwardStackSize(): number {
    return this.forwardStack.length;
  }

  /**
   * Reset all navigation state.
   */
  reset(): void {
    this.backStack = [];
    this.forwardStack = [];
    this.currentThreadId = null;
  }
}
