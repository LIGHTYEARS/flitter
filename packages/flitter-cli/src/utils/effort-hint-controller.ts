// EffortHintController — manages per-thread "effort level" hints for deep reasoning mode.
//
// S3-4: When deep reasoning is active, displays a one-time hint per thread
// explaining the current effort level. The hint is dismissed after user
// interaction and is not shown again for the same thread.
//
// Design:
//   - Uses a Set<string> to track thread IDs that have already seen the hint.
//   - `canShowHintInCurrentThread(threadID)` returns true only on first call per thread.
//   - `dismissForInteraction()` marks the current hint as dismissed.
//   - `getHintText(level)` returns the display text for a given effort level.

import { log } from './logger';

/**
 * Maps effort level strings to human-readable hint descriptions.
 * These texts explain what each effort level means to the user.
 */
const EFFORT_HINT_TEXTS: Record<string, string> = {
  medium: 'Deep reasoning: medium — balanced speed and thoroughness',
  high: 'Deep reasoning: high — more thorough analysis, may be slower',
  xhigh: 'Deep reasoning: max — most thorough analysis, significantly slower',
};

/**
 * EffortHintController manages the display of one-time effort level hints
 * in the status bar when deep reasoning mode is active.
 *
 * Each thread only sees the hint once. After user interaction (typing,
 * submitting, navigating), the hint is dismissed and won't appear again
 * for that thread.
 */
export class EffortHintController {
  /** Set of thread IDs that have already seen the effort hint. */
  private _shownThreadIDs: Set<string> = new Set();

  /** Whether a hint is currently being displayed (not yet dismissed). */
  private _isShowingHint = false;

  /** The thread ID for which the hint is currently shown. */
  private _currentHintThreadID: string | null = null;

  /**
   * Check whether the effort hint should be shown for the given thread.
   *
   * Returns true only if the thread has not previously seen the hint.
   * Marks the thread as "shown" on first call, and sets internal state
   * to indicate a hint is currently being displayed.
   *
   * @param threadID - The unique identifier of the current thread.
   * @returns True if the hint should be shown, false otherwise.
   */
  canShowHintInCurrentThread(threadID: string): boolean {
    if (this._shownThreadIDs.has(threadID)) {
      return false;
    }

    this._shownThreadIDs.add(threadID);
    this._isShowingHint = true;
    this._currentHintThreadID = threadID;
    log.debug(`EffortHintController: showing hint for thread ${threadID}`);
    return true;
  }

  /**
   * Dismiss the currently displayed hint due to user interaction.
   *
   * Called when the user types, submits a prompt, or navigates away.
   * After dismissal, `canShowHintInCurrentThread` will return false
   * for the same thread ID.
   */
  dismissForInteraction(): void {
    if (this._isShowingHint) {
      log.debug(`EffortHintController: dismissed hint for thread ${this._currentHintThreadID}`);
      this._isShowingHint = false;
      this._currentHintThreadID = null;
    }
  }

  /**
   * Get the hint text for the given effort level.
   *
   * Returns a human-readable description of what the effort level means.
   * Returns an empty string for unknown levels.
   *
   * @param level - The deep reasoning effort level string.
   * @returns The hint text to display in the status bar.
   */
  getHintText(level: string): string {
    return EFFORT_HINT_TEXTS[level] ?? '';
  }

  /**
   * Whether a hint is currently being displayed (not yet dismissed).
   * Used by the status bar to decide whether to render the hint.
   */
  get isShowingHint(): boolean {
    return this._isShowingHint;
  }

  /**
   * Reset all tracked thread IDs and internal state.
   * Useful for testing or when a full session reset occurs.
   */
  reset(): void {
    this._shownThreadIDs.clear();
    this._isShowingHint = false;
    this._currentHintThreadID = null;
  }
}
