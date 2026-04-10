// HandoffService — extracted handoff mode lifecycle from AppState.
//
// Manages the enter/exit/submit/countdown/abort lifecycle for thread handoff.
// Delegates thread creation to ThreadPool and notifies the parent via callbacks.
//
// Matches AMP's pVR() handoff service pattern from 20_thread_management.js:
//   - configService + onFollow callback
//   - followHandoffIfSourceActive() auto-switch
//   - buildHandoffSystemPrompt() for handoff context

import type { ThreadPool } from './thread-pool';
import type { ThreadHandle, HandoffState } from './types';
import { DEFAULT_HANDOFF_STATE } from './types';
import { log } from '../utils/logger';

// ---------------------------------------------------------------------------
// HandoffService Dependencies
// ---------------------------------------------------------------------------

/**
 * Constructor dependencies for HandoffService.
 * Matches AMP's pVR({ configService, onFollow }) pattern.
 */
export interface HandoffServiceDeps {
  /** ThreadPool for creating handoff threads and switching. */
  threadPool: ThreadPool;
  /** Callback invoked when a handoff goal is submitted (creates thread, submits prompt). */
  onSubmit: (text: string) => void;
  /** Callback to notify the parent (AppState) that handoff state has changed. */
  onStateChange: () => void;
}

// ---------------------------------------------------------------------------
// HandoffService
// ---------------------------------------------------------------------------

/** Braille spinner animation frames matching AMP's toBraille() output. */
const BRAILLE_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

/**
 * HandoffService manages the handoff mode lifecycle for the flitter-cli TUI.
 *
 * Extracted from AppState to isolate handoff concerns into a dedicated service,
 * matching AMP's pVR() handoff service pattern. The service owns:
 *   - Handoff UI state (isInHandoffMode, isGeneratingHandoff, countdown, spinner)
 *   - Enter/exit/submit/abort lifecycle
 *   - Countdown timer for auto-submit
 *   - Cross-thread follow logic (followHandoffIfSourceActive)
 *   - Handoff system prompt building
 *
 * AppState delegates all handoff methods to this service.
 */
export class HandoffService {
  /** Current handoff UI state. Read by AppState for rendering. */
  handoffState: HandoffState = { ...DEFAULT_HANDOFF_STATE };

  /** Dependencies injected at construction. */
  private readonly _deps: HandoffServiceDeps;

  /** Interval timer for handoff countdown auto-submit. */
  private _countdownTimer: ReturnType<typeof setInterval> | null = null;

  /** Braille spinner animation frame index. */
  private _spinnerFrame: number = 0;

  constructor(deps: HandoffServiceDeps) {
    this._deps = deps;
  }

  // -------------------------------------------------------------------------
  // Public API — matches AppState's original handoff method signatures
  // -------------------------------------------------------------------------

  /**
   * Enter handoff mode. The InputArea switches to handoff prompt editing.
   * Matches AMP's enterHandoffMode callback passed to InputArea.
   *
   * While in handoff mode (and not generating), the user can change the
   * agent mode for the target thread (canChangeAgentModeInPromptEditor).
   */
  enterHandoffMode(): void {
    if (this.handoffState.isInHandoffMode) return;
    this.handoffState = {
      ...DEFAULT_HANDOFF_STATE,
      isInHandoffMode: true,
    };
    log.info('HandoffService.enterHandoffMode');
    this._deps.onStateChange();
  }

  /**
   * Exit handoff mode, resetting all handoff state to defaults.
   * Clears any active countdown timer and spinner.
   *
   * Called on:
   * - Thread switch (onThreadSwitch -> handoffController?.resetUIState())
   * - Second Escape in abort confirmation
   * - Handoff submission completion
   * - New thread creation
   *
   * Matches AMP's exitHandoffMode / resetUIState pattern.
   */
  exitHandoffMode(): void {
    if (!this.handoffState.isInHandoffMode &&
        !this.handoffState.isGeneratingHandoff &&
        this.handoffState.countdownSeconds === null) {
      return; // Already in default state
    }
    this._clearCountdownTimer();
    this.handoffState = { ...DEFAULT_HANDOFF_STATE };
    this._spinnerFrame = 0;
    log.info('HandoffService.exitHandoffMode');
    this._deps.onStateChange();
  }

  /**
   * Submit the handoff goal. Creates a new thread via ThreadPool.createHandoff()
   * and transitions to generating state.
   *
   * Matches AMP's submit flow:
   * 1. Sets isGeneratingHandoff = true, starts spinner
   * 2. Calls threadPool.createHandoff(goal, options)
   * 3. On completion: exits handoff mode, switches to new thread
   *
   * @param goal - The user's goal text for the new thread
   * @param agentMode - The agent mode for the target thread
   * @param switchToHandle - Callback to switch AppState to the new thread handle
   */
  async submitHandoff(
    goal: string,
    agentMode: string | null,
    switchToHandle: (handle: ThreadHandle) => void,
  ): Promise<void> {
    if (!this.handoffState.isInHandoffMode && this.handoffState.countdownSeconds === null) {
      log.warn('HandoffService.submitHandoff: not in handoff mode');
      return;
    }

    // Transition to generating state
    this._clearCountdownTimer();
    this._spinnerFrame = 0;
    this.handoffState = {
      ...this.handoffState,
      isGeneratingHandoff: true,
      isConfirmingAbortHandoff: false,
      pendingHandoffPrompt: goal,
      spinner: BRAILLE_FRAMES[0],
      countdownSeconds: null,
    };
    log.info(`HandoffService.submitHandoff: goal="${goal.slice(0, 60)}..."`);
    this._deps.onStateChange();

    // Start spinner animation
    const spinnerInterval = setInterval(() => {
      this._spinnerFrame = (this._spinnerFrame + 1) % BRAILLE_FRAMES.length;
      this.handoffState = {
        ...this.handoffState,
        spinner: BRAILLE_FRAMES[this._spinnerFrame],
      };
      this._deps.onStateChange();
    }, 80);

    try {
      // Create handoff thread via ThreadPool
      const handle = this._deps.threadPool.createHandoff(goal, {
        agentMode,
      });

      // Switch to the new thread
      clearInterval(spinnerInterval);
      this.exitHandoffMode();
      switchToHandle(handle);

      log.info(`HandoffService.submitHandoff: complete, switched to ${handle.threadID}`);
      this._deps.onStateChange();
    } catch (err) {
      clearInterval(spinnerInterval);
      this.exitHandoffMode();
      log.error(`HandoffService.submitHandoff: failed`, err);
      this._deps.onStateChange();
    }
  }

  /**
   * Handle Escape key during handoff mode. Two-stage abort:
   * - First call: sets isConfirmingAbortHandoff = true
   * - Second call: exits handoff mode entirely
   *
   * Matches AMP's two-stage abort pattern:
   *   "Esc to abort handoff" -> "Esc again to abort handoff"
   */
  abortHandoffConfirmation(): void {
    if (!this.handoffState.isInHandoffMode && this.handoffState.countdownSeconds === null) return;

    if (this.handoffState.isConfirmingAbortHandoff) {
      // Second Escape: actually exit
      this.exitHandoffMode();
      log.info('HandoffService.abortHandoffConfirmation: confirmed, exiting handoff mode');
    } else {
      // First Escape: enter confirmation state
      this.handoffState = {
        ...this.handoffState,
        isConfirmingAbortHandoff: true,
      };
      log.info('HandoffService.abortHandoffConfirmation: awaiting confirmation');
      this._deps.onStateChange();
    }
  }

  /**
   * Start the handoff countdown timer. Decrements countdownSeconds every
   * second and auto-submits when it reaches 0.
   *
   * Matches AMP's countdown UI: "Auto-submitting in N..." with "type to edit"
   * hint. Typing or editing cancels the countdown.
   *
   * @param seconds - Initial countdown value (typically 10-30)
   * @param goal - The goal text to auto-submit when countdown reaches 0
   * @param agentMode - The agent mode for the target thread
   * @param switchToHandle - Callback to switch to the new thread handle
   */
  startCountdown(
    seconds: number,
    goal: string,
    agentMode: string | null,
    switchToHandle: (handle: ThreadHandle) => void,
  ): void {
    this._clearCountdownTimer();
    this.handoffState = {
      ...this.handoffState,
      countdownSeconds: seconds,
      pendingHandoffPrompt: goal,
    };
    this._deps.onStateChange();

    this._countdownTimer = setInterval(() => {
      const current = this.handoffState.countdownSeconds;
      if (current === null || current <= 1) {
        // Countdown complete: auto-submit
        this._clearCountdownTimer();
        const pendingGoal = this.handoffState.pendingHandoffPrompt;
        if (pendingGoal) {
          this.submitHandoff(pendingGoal, agentMode, switchToHandle).catch(err => {
            log.error('HandoffService.startCountdown: auto-submit failed', err);
          });
        }
      } else {
        this.handoffState = {
          ...this.handoffState,
          countdownSeconds: current - 1,
        };
        this._deps.onStateChange();
      }
    }, 1000);
  }

  /**
   * Cancel the countdown timer without exiting handoff mode.
   * Called when the user starts typing (editing the goal).
   *
   * Matches AMP's "type to edit" behavior that cancels the auto-submit.
   */
  cancelCountdown(): void {
    if (this.handoffState.countdownSeconds === null) return;
    this._clearCountdownTimer();
    this.handoffState = {
      ...this.handoffState,
      countdownSeconds: null,
    };
    log.info('HandoffService.cancelCountdown');
    this._deps.onStateChange();
  }

  // -------------------------------------------------------------------------
  // Cross-thread follow & system prompt (matching AMP pVR pattern)
  // -------------------------------------------------------------------------

  /**
   * Follow a handoff target thread if the source thread is still active.
   * When a handoff creates a new thread, this method checks if the user
   * is still viewing the source thread and auto-switches to the target.
   *
   * Matches AMP's followHandoffIfSourceActive:
   *   if (this.activeThreadContextID !== R.sourceThreadID) return;
   *   await this.switchThread(R.targetThreadID);
   *
   * @param targetThreadID - The handoff target thread to switch to
   */
  followHandoffIfSourceActive(targetThreadID: string): void {
    const pool = this._deps.threadPool;
    const sourceThreadID = pool.getHandoffSourceThreadID(targetThreadID);
    if (!sourceThreadID) return;

    // Only follow if the user is still viewing the source thread
    if (pool.activeThreadContextID !== sourceThreadID) return;

    log.info(`HandoffService.followHandoffIfSourceActive: switching ${sourceThreadID} -> ${targetThreadID}`);
    pool.switchThread(targetThreadID);
    this._deps.onStateChange();
  }

  /**
   * Build a handoff system prompt providing context about the source thread.
   * Used to give the target thread awareness of its handoff origin.
   *
   * @param sourceThreadID - The source thread that initiated the handoff
   * @returns A system prompt string describing the handoff context
   */
  buildHandoffSystemPrompt(sourceThreadID: string): string {
    const pool = this._deps.threadPool;
    const sourceHandle = pool.threadHandleMap.get(sourceThreadID);
    const sourceTitle = sourceHandle?.title ?? sourceThreadID;

    return [
      `This thread was created via handoff from thread "${sourceTitle}" (${sourceThreadID}).`,
      'The user expects you to continue the work described in the handoff goal.',
      'Focus on the goal and avoid re-introducing context already established in the source thread.',
    ].join('\n');
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  /**
   * Clear the internal countdown interval timer.
   * Idempotent — safe to call when no timer is active.
   */
  private _clearCountdownTimer(): void {
    if (this._countdownTimer !== null) {
      clearInterval(this._countdownTimer);
      this._countdownTimer = null;
    }
  }
}
