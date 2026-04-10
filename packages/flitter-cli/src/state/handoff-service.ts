// handoff-service.ts -- Independent service managing the handoff lifecycle.
//
// Extracted from AppState (F17) to separate the handoff lifecycle (enter,
// exit, submit, abort, countdown) from the monolithic AppState class.
// Builds system prompts containing source thread context for handoffs
// and checks whether the source thread worker is still active.
//
// Uses ThreadPool's async createThread (Plan 04) and createHandoff APIs.

import { log } from '../utils/logger';
import type { ThreadPool } from './thread-pool';
import type { HandoffState, ThreadHandle } from './types';
import { DEFAULT_HANDOFF_STATE } from './types';

/**
 * Dependencies injected by AppState when constructing HandoffService.
 * These callbacks allow HandoffService to read/write AppState's handoff
 * state without a direct circular import.
 */
export interface HandoffServiceDeps {
  threadPool: ThreadPool;
  getHandoffState: () => HandoffState;
  setHandoffState: (state: HandoffState) => void;
  getActiveThreadID: () => string | null;
  getCurrentMode: () => string | null;
  notifyListeners: () => void;
}

/** Braille spinner animation frames matching AMP's toBraille() output. */
const BRAILLE_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

/**
 * HandoffService manages the handoff lifecycle independently from AppState.
 *
 * Responsibilities:
 * - Enter/exit handoff mode
 * - Submit handoff goals (creates new thread via ThreadPool)
 * - Two-stage abort confirmation (Escape x2)
 * - Countdown timer with auto-submit
 * - Build system prompts with source thread context
 * - Check if source thread worker is still active
 */
export class HandoffService {
  private _deps: HandoffServiceDeps;
  private _countdownTimer: ReturnType<typeof setInterval> | null = null;
  private _spinnerFrame: number = 0;

  constructor(deps: HandoffServiceDeps) {
    this._deps = deps;
  }

  // ---------------------------------------------------------------------------
  // System Prompt Building
  // ---------------------------------------------------------------------------

  /**
   * Build a system prompt for a handoff target thread that includes
   * context from the source thread's recent messages.
   *
   * @param sourceThreadID - The thread that initiated the handoff
   * @param goal - The user's goal text for the new thread
   * @returns A formatted system prompt string with context and goal
   */
  buildSystemPrompt(sourceThreadID: string, goal: string): string {
    const threadPool = this._deps.threadPool;
    const sourceHandle = threadPool.threadHandleMap.get(sourceThreadID);
    if (!sourceHandle) return goal;

    const items = sourceHandle.session.items;
    const contextSummary = items
      .filter(item => item.type === 'user_message' || item.type === 'assistant_message')
      .slice(-5) // Last 5 messages for context
      .map(item => {
        const role = item.type === 'user_message' ? 'User' : 'Assistant';
        const text = (item as any).text?.slice(0, 200) ?? '';
        return `${role}: ${text}`;
      })
      .join('\n');

    if (!contextSummary) return goal;

    return `Handoff from thread ${sourceThreadID}:\n\nContext:\n${contextSummary}\n\nGoal: ${goal}`;
  }

  // ---------------------------------------------------------------------------
  // Handoff Mode Lifecycle
  // ---------------------------------------------------------------------------

  /**
   * Enter handoff mode. The InputArea switches to handoff prompt editing.
   * Matches AMP's enterHandoffMode callback passed to InputArea.
   */
  enterHandoffMode(): void {
    const state = this._deps.getHandoffState();
    if (state.isInHandoffMode) return;
    this._deps.setHandoffState({
      ...DEFAULT_HANDOFF_STATE,
      isInHandoffMode: true,
    });
    log.info('HandoffService.enterHandoffMode');
    this._deps.notifyListeners();
  }

  /**
   * Exit handoff mode, resetting all handoff state to defaults.
   * Clears any active countdown timer and spinner.
   *
   * Matches AMP's exitHandoffMode / resetUIState pattern.
   */
  exitHandoffMode(): void {
    const state = this._deps.getHandoffState();
    if (!state.isInHandoffMode &&
        !state.isGeneratingHandoff &&
        state.countdownSeconds === null) {
      return; // Already in default state
    }
    this._clearCountdownTimer();
    this._deps.setHandoffState({ ...DEFAULT_HANDOFF_STATE });
    this._spinnerFrame = 0;
    log.info('HandoffService.exitHandoffMode');
    this._deps.notifyListeners();
  }

  /**
   * Submit the handoff goal. Creates a new thread via ThreadPool.createHandoff()
   * and transitions to generating state.
   *
   * Uses the async createThread API from Plan 04 via createHandoff.
   *
   * @param goal - The user's goal text for the new thread
   * @returns The newly created ThreadHandle, or null if the handoff was aborted
   */
  async submitHandoff(goal: string): Promise<ThreadHandle | null> {
    const state = this._deps.getHandoffState();
    if (!state.isInHandoffMode && state.countdownSeconds === null) {
      log.warn('HandoffService.submitHandoff: not in handoff mode');
      return null;
    }

    // Transition to generating state
    this._clearCountdownTimer();
    this._spinnerFrame = 0;
    this._deps.setHandoffState({
      ...state,
      isGeneratingHandoff: true,
      isConfirmingAbortHandoff: false,
      pendingHandoffPrompt: goal,
      spinner: BRAILLE_FRAMES[0],
      countdownSeconds: null,
    });
    log.info(`HandoffService.submitHandoff: goal="${goal.slice(0, 60)}..."`);
    this._deps.notifyListeners();

    // Start spinner animation
    const spinnerInterval = setInterval(() => {
      this._spinnerFrame = (this._spinnerFrame + 1) % BRAILLE_FRAMES.length;
      const current = this._deps.getHandoffState();
      this._deps.setHandoffState({
        ...current,
        spinner: BRAILLE_FRAMES[this._spinnerFrame],
      });
      this._deps.notifyListeners();
    }, 80);

    try {
      // Create handoff thread via ThreadPool (uses async createThread from Plan 04)
      const handle = await this._deps.threadPool.createHandoff(goal, {
        agentMode: this._deps.getCurrentMode(),
      });

      // Clean up and exit handoff mode
      clearInterval(spinnerInterval);
      this.exitHandoffMode();

      log.info(`HandoffService.submitHandoff: complete, new thread ${handle.threadID}`);
      return handle;
    } catch (err) {
      clearInterval(spinnerInterval);
      this.exitHandoffMode();
      log.error(`HandoffService.submitHandoff: failed`, err);
      return null;
    }
  }

  /**
   * Handle Escape key during handoff mode. Two-stage abort:
   * - First call: sets isConfirmingAbortHandoff = true
   * - Second call: exits handoff mode entirely
   *
   * Matches AMP's two-stage abort pattern.
   */
  abortHandoffConfirmation(): void {
    const state = this._deps.getHandoffState();
    if (!state.isInHandoffMode && state.countdownSeconds === null) return;

    if (state.isConfirmingAbortHandoff) {
      // Second Escape: actually exit
      this.exitHandoffMode();
      log.info('HandoffService.abortHandoffConfirmation: confirmed, exiting handoff mode');
    } else {
      // First Escape: enter confirmation state
      this._deps.setHandoffState({
        ...state,
        isConfirmingAbortHandoff: true,
      });
      log.info('HandoffService.abortHandoffConfirmation: awaiting confirmation');
      this._deps.notifyListeners();
    }
  }

  // ---------------------------------------------------------------------------
  // Countdown Timer
  // ---------------------------------------------------------------------------

  /**
   * Start the handoff countdown timer. Decrements countdownSeconds every
   * second and auto-submits when it reaches 0.
   *
   * @param seconds - Initial countdown value (typically 10-30)
   * @param goal - The goal text to auto-submit when countdown reaches 0
   */
  startCountdown(seconds: number, goal: string): void {
    this._clearCountdownTimer();
    const state = this._deps.getHandoffState();
    this._deps.setHandoffState({
      ...state,
      countdownSeconds: seconds,
      pendingHandoffPrompt: goal,
    });
    this._deps.notifyListeners();

    this._countdownTimer = setInterval(() => {
      const current = this._deps.getHandoffState().countdownSeconds;
      if (current === null || current <= 1) {
        // Countdown complete: auto-submit
        this._clearCountdownTimer();
        const pendingGoal = this._deps.getHandoffState().pendingHandoffPrompt;
        if (pendingGoal) {
          this.submitHandoff(pendingGoal).catch(err => {
            log.error('HandoffService.startCountdown: auto-submit failed', err);
          });
        }
      } else {
        const s = this._deps.getHandoffState();
        this._deps.setHandoffState({
          ...s,
          countdownSeconds: current - 1,
        });
        this._deps.notifyListeners();
      }
    }, 1000);
  }

  /**
   * Cancel the countdown timer without exiting handoff mode.
   * Called when the user starts typing (editing the goal).
   */
  cancelCountdown(): void {
    const state = this._deps.getHandoffState();
    if (state.countdownSeconds === null) return;
    this._clearCountdownTimer();
    this._deps.setHandoffState({
      ...state,
      countdownSeconds: null,
    });
    log.info('HandoffService.cancelCountdown');
    this._deps.notifyListeners();
  }

  // ---------------------------------------------------------------------------
  // Source Thread Queries
  // ---------------------------------------------------------------------------

  /**
   * Check if the source thread of a handoff is still actively running.
   *
   * @param sourceThreadID - The thread ID of the handoff source
   * @returns true if the source thread's worker is currently running
   */
  followHandoffIfSourceActive(sourceThreadID: string): boolean {
    const threadPool = this._deps.threadPool;
    const worker = threadPool.getOrCreateWorker(sourceThreadID);
    return worker.isRunning;
  }

  // ---------------------------------------------------------------------------
  // Cleanup
  // ---------------------------------------------------------------------------

  /**
   * Clear the internal countdown interval timer.
   * Idempotent -- safe to call when no timer is active.
   */
  private _clearCountdownTimer(): void {
    if (this._countdownTimer !== null) {
      clearInterval(this._countdownTimer);
      this._countdownTimer = null;
    }
  }

  /**
   * Dispose of all resources held by the HandoffService.
   * Clears the countdown timer.
   */
  dispose(): void {
    this._clearCountdownTimer();
  }
}
