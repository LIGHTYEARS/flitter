// InputArea — multi-line text input widget for flitter-cli TUI.
//
// Provides Amp-parity editing experience:
//   Stack (fit: 'passthrough')
//     Container (bordered, padded, auto-expanding height, gap-aware border)
//       Autocomplete (@-trigger for file mentions, extensible)
//         TextField (submitOnEnter, block cursor, multi-line)
//     Positioned (top:0) — shimmer overlay (BorderShimmer)
//     Positioned (top:0, left:1) — top-left border overlay (context usage)
//     Positioned (top:0, right:1) — top-right border overlay (mode + skills)
//     Positioned (bottom:0, left:1) — bottom-left border overlay (status)
//     Positioned (bottom:0, right:1) — bottom-right border overlay (cwd + branch)
//     Positioned (top:0, left:0, right:0) — drag resize MouseRegion (height:1)
//
// Features:
//   - Shell mode detection ($ → shell, $$ → background)
//   - Auto-expanding height based on line count
//   - Manual drag-resize via top border mouse region
//   - Rich border with gap-aware decoration and overlay text at all 4 positions
//   - BorderShimmer animation on agent mode change (agentModePulseSeq trigger)
//   - Processing spinner / dim when isProcessing
//   - Submit guards (empty text, whitespace-only, double-submit)
//   - @ autocomplete trigger for file mentions (Plan 17-04)
//
// Phase 23, Plan 03. Extends Plan 16/17 with rich borders and metadata overlays.

import {
  StatefulWidget,
  State,
  Widget,
  type BuildContext,
} from '../../../flitter-core/src/framework/widget';
import { TextField, TextEditingController } from '../../../flitter-core/src/widgets/text-field';
import { Container } from '../../../flitter-core/src/widgets/container';
import { Border, BorderSide, BoxDecoration } from '../../../flitter-core/src/layout/render-decorated';
import { Stack, Positioned } from '../../../flitter-core/src/widgets/stack';
import { Column } from '../../../flitter-core/src/widgets/flex';
import { Autocomplete, type AutocompleteTrigger, type AutocompleteOption } from '../../../flitter-core/src/widgets/autocomplete';
import { MouseRegion } from '../../../flitter-core/src/widgets/mouse-region';
import { basename } from 'node:path';
import { SizedBox } from '../../../flitter-core/src/widgets/sized-box';
import { Color } from '../../../flitter-core/src/core/color';
import { EdgeInsets } from '../../../flitter-core/src/layout/edge-insets';
import type { UsageInfo } from '../state/types';
import { CliThemeProvider, agentModeColor } from '../themes';
import {
  buildTopLeftOverlay,
  buildTopRightOverlay,
  buildBottomLeftOverlay,
  buildBottomRightOverlay,
} from './border-builders';
import { BorderShimmer } from './border-shimmer';

// ---------------------------------------------------------------------------
// Step 10: BorderOverlayText — exported type for downstream consumers
// ---------------------------------------------------------------------------

/**
 * Overlay text positioned on the input area border.
 * @deprecated Use the four border builder functions from border-builders.ts instead.
 * This interface is retained for backward compatibility only.
 */
export interface BorderOverlayText {
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  child: Widget;
}

// ---------------------------------------------------------------------------
// Step 2: Shell mode detection
// ---------------------------------------------------------------------------

export type ShellMode = 'shell' | 'background' | null;

/** Detect shell mode from input text prefix. */
export function detectShellMode(text: string): ShellMode {
  if (text.startsWith('$$')) return 'background';
  if (text.startsWith('$'))  return 'shell';
  return null;
}

/**
 * Parse a shell command from input text with `$` or `$$` prefix.
 * Matches AMP's `zS()` function — strips the prefix and returns
 * the command string plus visibility ('shell' or 'hidden').
 * Returns null for non-shell input.
 */
export function parseShellCommand(text: string): { cmd: string; visibility: 'shell' | 'hidden' } | null {
  if (text.startsWith('$$')) {
    return { cmd: text.slice(2).trim(), visibility: 'hidden' };
  }
  if (text.startsWith('$')) {
    return { cmd: text.slice(1).trim(), visibility: 'shell' };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Step 3: Auto-expanding height constants
// ---------------------------------------------------------------------------

/** Minimum container height: 3 content lines + 2 border rows. */
export const MIN_HEIGHT = 5;

/**
 * Extra content lines required by ShortcutHelpInline topWidget.
 * 6 shortcut rows + 1 SizedBox + 1 tmux hint + 1 divider = 9 (tmux).
 * Non-tmux: 6 shortcut rows + 1 divider = 7.
 * Subtract 1 because baseHeight already includes a minimum input line.
 * This yields a total height matching AMP's 13-row InputArea with help.
 */
const TOP_WIDGET_LINES = 8;

// ---------------------------------------------------------------------------
// Step 1: InputArea props and StatefulWidget
// ---------------------------------------------------------------------------

/** Props for the InputArea widget. */
interface InputAreaProps {
  onSubmit: (text: string) => void;
  isProcessing: boolean;
  mode: string | null;
  controller?: TextEditingController;
  maxExpandLines?: number;
  /**
   * @deprecated Use the four border builder props instead.
   * Kept for backward compatibility — not rendered if border builder props are set.
   */
  overlayTexts?: BorderOverlayText[];
  /** File list provider for @ autocomplete trigger (Plan 17-04). */
  getFiles?: () => Promise<string[]>;
  /** Callback fired when @@ (special command) trigger is typed. */
  onSpecialCommandTrigger?: () => void;
  /** Callback fired when @: (commit) trigger is typed. */
  onCommitTrigger?: () => void;
  /** Callback fired when ? is typed into an empty input. */
  onQuestionMarkTrigger?: () => void;
  /** Callback fired when / is typed into an empty input. */
  onSlashTrigger?: () => void;
  // --- Border feature props (Phase 23) ---
  /** Current token usage from the session. */
  tokenUsage?: UsageInfo | null;
  /** Accumulated cost in USD. */
  costUsd?: number;
  /** Elapsed milliseconds since the current prompt started. */
  elapsedMs?: number;
  /** Context window usage as percentage 0-100. */
  contextWindowPercent?: number;
  /** Whether the last response was interrupted. */
  isInterrupted?: boolean;
  /** Whether a conversation has been started (hasConversation=false → top-left overlay hidden). */
  hasConversation?: boolean;
  /** Current working directory for bottom-right overlay. */
  cwd?: string;
  /** Git branch name for bottom-right overlay. */
  gitBranch?: string;
  /** Whether the session is actively streaming. */
  isStreaming?: boolean;
  /** Whether a tool command is currently executing. */
  isExecutingCommand?: boolean;
  /** Whether a shell command is currently running. */
  isRunningShell?: boolean;
  /** Shell mode status for top-left border indicator ('shell', 'hidden', or null). */
  shellModeStatus?: 'shell' | 'hidden' | null;
  /** Whether the session is auto-compacting. */
  isAutoCompacting?: boolean;
  /** Whether a handoff is in progress. */
  isHandingOff?: boolean;
  /** Custom status message for bottom-left overlay. */
  statusMessage?: string;
  /** Monotonically-incrementing sequence number that bumps on agent mode change.
   * Triggers the BorderShimmer animation sweep. */
  agentModePulseSeq?: number;
  /** Total number of loaded skills for top-right overlay. */
  skillCount?: number;
  /** Number of skills with warnings. */
  skillWarningCount?: number;
  /** Click handler for the skill count section in top-right overlay. */
  onSkillCountClick?: () => void;
  /** Terminal screen height in rows for dynamic drag-resize max height. */
  screenHeight?: number;
  /** Externally-persisted drag height (bottomGridUserHeight global state).
   * When provided, overrides the component-local dragHeight on mount. */
  userHeight?: number | null;
  /** Callback fired when the user finishes dragging to a new height.
   * Parent uses this to persist bottomGridUserHeight across rebuilds. */
  onHeightChange?: (height: number | null) => void;
  /** Optional widget rendered above the text field inside the InputArea border.
   * Used for shortcut help inline display (AMP v9T topWidget pattern). */
  topWidget?: Widget;
  /** Callback fired when shell mode changes ($ prefix detection).
   * Parent uses this to update AppState.currentShellModeStatus. */
  onShellModeChange?: (mode: ShellMode) => void;
  /** 是否有正在运行或等待显示的 bash invocations。 */
  isRunningBashInvocations?: boolean;
  /** 是否正在确认取消处理（二次 Esc 确认状态）。 */
  isConfirmingCancelProcessing?: boolean;
}

/**
 * Multi-line input area widget with auto-expanding height, drag-resize,
 * shell mode detection, and rich border overlays at all four positions.
 *
 * Auto-expand: height grows with content line count up to maxExpandLines.
 * Drag-resize: user can drag the top border to manually set height,
 * clamped between MIN_HEIGHT (5) and half-screen.
 * Rich border: gap-aware border with overlay text at four corners showing
 * context usage (top-left), mode+skills (top-right), status (bottom-left),
 * and cwd+branch (bottom-right).
 */
export class InputArea extends StatefulWidget {
  readonly onSubmit: (text: string) => void;
  readonly isProcessing: boolean;
  readonly mode: string | null;
  readonly externalController?: TextEditingController;
  readonly maxExpandLines: number;
  readonly overlayTexts: BorderOverlayText[];
  /** File list provider for @ autocomplete. Null means no file trigger. */
  readonly getFiles?: () => Promise<string[]>;
  /** Callback fired when @@ (special command) trigger is typed. */
  readonly onSpecialCommandTrigger?: () => void;
  /** Callback fired when @: (commit) trigger is typed. */
  readonly onCommitTrigger?: () => void;
  /** Callback fired when ? is typed into an empty input. */
  readonly onQuestionMarkTrigger?: () => void;
  /** Callback fired when / is typed into an empty input. */
  readonly onSlashTrigger?: () => void;
  // Border feature props
  readonly tokenUsage?: UsageInfo | null;
  readonly costUsd: number;
  readonly elapsedMs: number;
  readonly contextWindowPercent: number;
  readonly isInterrupted: boolean;
  readonly hasConversation: boolean;
  readonly cwd?: string;
  readonly gitBranch?: string;
  readonly isStreaming: boolean;
  readonly isExecutingCommand: boolean;
  readonly isRunningShell: boolean;
  /** Shell mode status for top-left border indicator. */
  readonly shellModeStatus: 'shell' | 'hidden' | null;
  readonly isAutoCompacting: boolean;
  readonly isHandingOff: boolean;
  readonly statusMessage?: string;
  readonly agentModePulseSeq: number;
  readonly skillCount: number;
  readonly skillWarningCount: number;
  readonly onSkillCountClick?: () => void;
  readonly screenHeight?: number;
  /** Externally-persisted drag height (bottomGridUserHeight global state). */
  readonly userHeight?: number | null;
  /** Callback to persist drag height in parent global state. */
  readonly onHeightChange?: (height: number | null) => void;
  /** Optional widget rendered above the text field inside the InputArea border.
   * Used for shortcut help inline display (AMP v9T topWidget pattern). */
  readonly topWidget?: Widget;
  /** Callback fired when shell mode changes ($ prefix detection). */
  readonly onShellModeChange?: (mode: ShellMode) => void;
  /** 是否有正在运行或等待显示的 bash invocations。 */
  readonly isRunningBashInvocations: boolean;
  /** 是否正在确认取消处理（二次 Esc 确认状态）。 */
  readonly isConfirmingCancelProcessing: boolean;

  constructor(props: InputAreaProps) {
    super();
    this.onSubmit = props.onSubmit;
    this.isProcessing = props.isProcessing;
    this.mode = props.mode;
    this.externalController = props.controller;
    this.maxExpandLines = props.maxExpandLines ?? 10;
    this.overlayTexts = props.overlayTexts ?? [];
    this.getFiles = props.getFiles;
    this.onSpecialCommandTrigger = props.onSpecialCommandTrigger;
    this.onCommitTrigger = props.onCommitTrigger;
    this.onQuestionMarkTrigger = props.onQuestionMarkTrigger;
    this.onSlashTrigger = props.onSlashTrigger;
    // Border feature props
    this.tokenUsage = props.tokenUsage;
    this.costUsd = props.costUsd ?? 0;
    this.elapsedMs = props.elapsedMs ?? 0;
    this.contextWindowPercent = props.contextWindowPercent ?? 0;
    this.isInterrupted = props.isInterrupted ?? false;
    this.hasConversation = props.hasConversation ?? false;
    this.cwd = props.cwd;
    this.gitBranch = props.gitBranch;
    this.isStreaming = props.isStreaming ?? false;
    this.isExecutingCommand = props.isExecutingCommand ?? false;
    this.isRunningShell = props.isRunningShell ?? false;
    this.shellModeStatus = props.shellModeStatus ?? null;
    this.isAutoCompacting = props.isAutoCompacting ?? false;
    this.isHandingOff = props.isHandingOff ?? false;
    this.statusMessage = props.statusMessage;
    this.agentModePulseSeq = props.agentModePulseSeq ?? 0;
    this.skillCount = props.skillCount ?? 0;
    this.skillWarningCount = props.skillWarningCount ?? 0;
    this.onSkillCountClick = props.onSkillCountClick;
    this.screenHeight = props.screenHeight;
    this.userHeight = props.userHeight;
    this.onHeightChange = props.onHeightChange;
    this.topWidget = props.topWidget;
    this.onShellModeChange = props.onShellModeChange;
    this.isRunningBashInvocations = props.isRunningBashInvocations ?? false;
    this.isConfirmingCancelProcessing = props.isConfirmingCancelProcessing ?? false;
  }

  createState(): InputAreaState {
    return new InputAreaState();
  }
}

// ---------------------------------------------------------------------------
// InputAreaState — manages controller, shell mode, height, drag state
// ---------------------------------------------------------------------------

class InputAreaState extends State<InputArea> {
  private controller!: TextEditingController;
  private ownsController = false;
  /** Cached text for detecting shell mode / line count transitions. */
  private currentText = '';
  /** User-overridden height via drag; null means auto-expand is active. */
  private dragHeight: number | null = null;
  private dragStartY: number | null = null;
  private dragStartHeight: number | null = null;

  // --- File list cache for @ autocomplete (Plan 17-04) ---

  /** Cached file list from the getFiles provider. */
  private _cachedFiles: string[] = [];
  /** Timestamp of the last cache refresh. */
  private _cacheTimestamp = 0;
  /** Whether a cache refresh is in flight. */
  private _cacheLoading = false;
  /** Cache TTL in milliseconds. */
  private static CACHE_TTL_MS = 5000;

  // --- Lifecycle ---

  override initState(): void {
    super.initState();
    if (this.widget.externalController) {
      this.controller = this.widget.externalController;
      this.ownsController = false;
    } else {
      this.controller = new TextEditingController();
      this.ownsController = true;
    }
    this.controller.addListener(this._onTextChanged);
    // BORDER-08: restore persisted bottomGridUserHeight on mount
    if (this.widget.userHeight != null) {
      this.dragHeight = this.widget.userHeight;
    }
  }

  /** Handle external controller swap across rebuilds. */
  override didUpdateWidget(oldWidget: InputArea): void {
    const oldCtrl = oldWidget.externalController;
    const newCtrl = this.widget.externalController;

    if (oldCtrl !== newCtrl) {
      this.controller.removeListener(this._onTextChanged);

      if (this.ownsController) {
        this.controller.dispose();
      }

      if (newCtrl) {
        this.controller = newCtrl;
        this.ownsController = false;
      } else {
        this.controller = new TextEditingController();
        this.ownsController = true;
      }

      this.controller.addListener(this._onTextChanged);
    }
  }

  override dispose(): void {
    this.controller.removeListener(this._onTextChanged);
    if (this.ownsController) {
      this.controller.dispose();
    }
    super.dispose();
  }

  // --- Step 3: Height computation ---

  /** Compute the number of content lines (at least 1). */
  private _lineCount(): number {
    const text = this.controller.text;
    if (text.length === 0) return 1;
    return text.split('\n').length;
  }

  /**
   * Compute the container height: 2 (border rows) + visible content lines.
   * When dragHeight is set the user's manual resize wins; otherwise
   * auto-expand kicks in, clamped to [MIN_HEIGHT, maxExpandLines + 2].
   * When topWidget is present (e.g. ShortcutHelpInline), add its line
   * count so the container is tall enough to avoid overflow.
   */
  private _computeHeight(): number {
    if (this.dragHeight !== null) {
      return this.dragHeight;
    }
    const contentLines = Math.max(this._lineCount(), 1);
    const visibleLines = Math.min(contentLines, this.widget.maxExpandLines);
    const baseHeight = Math.max(visibleLines + 2, MIN_HEIGHT);
    // When topWidget is displayed, expand to fit its content plus input line
    if (this.widget.topWidget) {
      return baseHeight + TOP_WIDGET_LINES;
    }
    return baseHeight;
  }

  // --- Step 6: Text change handler ---

  /**
   * Listen to controller text changes.
   * Only triggers setState when visual properties actually change
   * (shell mode transition or line count change) to avoid unnecessary rebuilds.
   */
  private _onTextChanged = (): void => {
    const newText = this.controller.text;
    if (newText !== this.currentText) {
      const oldText = this.currentText;
      const oldShell = detectShellMode(oldText);
      const newShell = detectShellMode(newText);
      const oldLineCount = oldText.split('\n').length;
      const newLineCount = newText.split('\n').length;
      this.currentText = newText;

      // Fire shell mode change callback when shell mode transitions
      if (oldShell !== newShell && this.widget.onShellModeChange) {
        this.widget.onShellModeChange(newShell);
      }

      // Priority trigger detection: @@ and @: before plain @
      if (newText.endsWith('@@') && this.widget.onSpecialCommandTrigger) {
        this.widget.onSpecialCommandTrigger();
      } else if (newText.endsWith('@:') && this.widget.onCommitTrigger) {
        this.widget.onCommitTrigger();
      }

      if (newText === '?' && oldText === '') {
        this.controller.clear();
        this.widget.onQuestionMarkTrigger?.();
        return;
      }

      if (newText === '/' && oldText === '') {
        this.controller.clear();
        this.widget.onSlashTrigger?.();
        return;
      }

      if (oldShell !== newShell || oldLineCount !== newLineCount) {
        this.setState(() => {});
      }
    }
  };

  // --- Step 5: Submit handler ---

  /**
   * Handle text submission from TextField.
   * Guards: empty/whitespace-only text -> no-op; isProcessing -> no-op (double-submit prevention).
   * On valid submit: calls onSubmit, clears controller, resets dragHeight.
   */
  private _handleSubmit = (text: string): void => {
    if (text.trim().length > 0 && !this.widget.isProcessing) {
      this.widget.onSubmit(text.trim());
      this.controller.clear();
      this.dragHeight = null;
    }
  };

  // --- Step 8: Drag resize support ---

  /**
   * Handle mouse events on the top border for drag-resize.
   * Press: record starting Y and current computed height.
   * Drag: compute delta, clamp to [MIN_HEIGHT, floor(screenHeight/2)].
   * Release: clear drag tracking state.
   */
  private _handleDragPress = (_e: { x: number; y: number }): void => {
    this.dragStartY = _e.y;
    this.dragStartHeight = this._computeHeight();
  };

  private _handleDragMove = (_e: { x: number; y: number }): void => {
    if (this.dragStartY !== null && this.dragStartHeight !== null) {
      const delta = this.dragStartY - _e.y;
      // D-12/D-13: Use actual terminal screen height for dynamic max height.
      const maxHeight = Math.max(MIN_HEIGHT, Math.floor((this.widget.screenHeight ?? 50) / 2));
      const newHeight = Math.max(MIN_HEIGHT, Math.min(this.dragStartHeight + delta, maxHeight));
      if (newHeight !== this.dragHeight) {
        this.dragHeight = newHeight;
        this.setState(() => {});
      }
    }
  };

  private _handleDragRelease = (_e: { x: number; y: number }): void => {
    this.dragStartY = null;
    this.dragStartHeight = null;
    // BORDER-08: persist final drag height to parent's bottomGridUserHeight global state
    this.widget.onHeightChange?.(this.dragHeight);
  };

  // --- Step 4 / Step 7 / Step 8 / Step 9: Build method ---

  // --- File autocomplete helpers (Plan 17-04) ---

  /**
   * Get file options for autocomplete, using a cached file list.
   * Refreshes the cache if it is older than CACHE_TTL_MS.
   * Returns the currently cached files (may be stale for one cycle while
   * the async refresh is in flight).
   */
  private _getFileOptions = (_query: string): AutocompleteOption[] => {
    const now = Date.now();
    if (now - this._cacheTimestamp > InputAreaState.CACHE_TTL_MS && !this._cacheLoading) {
      this._refreshFileCache();
    }
    return this._cachedFiles.map((f) => ({
      label: basename(f),
      value: f,
      description: f,
    }));
  };

  /**
   * Asynchronously refresh the file list cache.
   * Calls the widget's getFiles provider and updates cache state.
   */
  private _refreshFileCache(): void {
    const getFiles = this.widget.getFiles;
    if (!getFiles) return;
    this._cacheLoading = true;
    getFiles()
      .then((files) => {
        this._cachedFiles = files;
        this._cacheTimestamp = Date.now();
        this._cacheLoading = false;
      })
      .catch(() => {
        this._cacheLoading = false;
      });
  }

  /**
   * Build the InputArea widget tree:
   *   Stack (fit: 'passthrough')
   *     Container (bordered with gap-aware decoration, padded, height computed)
   *       Autocomplete (@ file trigger when getFiles is provided)
   *         TextField (autofocus, submitOnEnter, block cursor)
   *     Positioned (top:0) — shimmer overlay (BorderShimmer, on top border)
   *     Positioned (top:0, left:1) — top-left overlay (context usage, null when idle)
   *     Positioned (top:0, right:1) — top-right overlay (mode + skills)
   *     Positioned (bottom:0, left:1) — bottom-left overlay (status, null when idle)
   *     Positioned (bottom:0, right:1) — bottom-right overlay (cwd + branch)
   *     Positioned (top:0, left:0, right:0) — drag resize MouseRegion
   */
  build(context: BuildContext): Widget {
    const shellMode = detectShellMode(this.controller.text);
    const isProcessing = this.widget.isProcessing;

    // Border color: cyan for shell mode, brightBlack default
    const borderColor = shellMode ? Color.cyan : Color.brightBlack;

    const border = Border.all(
      new BorderSide({ color: borderColor, width: 1, style: 'rounded' }),
    );

    // Step 4: TextField
    const textField = new TextField({
      controller: this.controller,
      autofocus: true,
      cursorChar: '\u2588',
      submitOnEnter: true,
      onSubmit: this._handleSubmit,
    });

    // Step 9: Autocomplete with @ file trigger (Plan 17-04)
    const triggers: AutocompleteTrigger[] = [];
    if (this.widget.getFiles) {
      triggers.push({
        triggerCharacter: '@',
        optionsBuilder: this._getFileOptions,
      });
    }

    const autocompleteWrapped = new Autocomplete({
      child: textField,
      controller: this.controller,
      triggers,
      maxOptionsVisible: 10,
    });

    // --- Phase 23: Rich border overlays ---
    // Get theme for border builders. Fall back to null-safe access.
    const theme = CliThemeProvider.maybeOf(context);

    let topLeft = null;
    let topRight = null;
    let bottomLeft = null;
    let bottomRight = null;

    if (theme) {
      // D-04: Build top-left overlay (context usage — null when no conversation)
      topLeft = buildTopLeftOverlay({
        contextWindowPercent: this.widget.contextWindowPercent,
        contextWindowSize: this.widget.tokenUsage?.size ?? 0,
        costUsd: this.widget.costUsd,
        elapsedMs: this.widget.elapsedMs,
        isProcessing,
        hasConversation: this.widget.hasConversation,
        theme,
        shellModeStatus: this.widget.shellModeStatus,
      });

      // D-05: Build top-right overlay (mode + skills)
      const effectiveMode = this.widget.mode ?? 'smart';
      topRight = buildTopRightOverlay({
        mode: effectiveMode,
        skillCount: this.widget.skillCount,
        skillWarningCount: this.widget.skillWarningCount,
        onSkillCountClick: this.widget.onSkillCountClick,
        theme,
      });

      // D-06: Build bottom-left overlay (status — null when idle)
      bottomLeft = buildBottomLeftOverlay({
        isProcessing,
        isStreaming: this.widget.isStreaming,
        isInterrupted: this.widget.isInterrupted,
        isExecutingCommand: this.widget.isExecutingCommand,
        isRunningShell: this.widget.isRunningShell,
        isAutoCompacting: this.widget.isAutoCompacting,
        isHandingOff: this.widget.isHandingOff,
        statusMessage: this.widget.statusMessage,
        theme,
        isRunningBashInvocations: this.widget.isRunningBashInvocations,
        isConfirmingCancelProcessing: this.widget.isConfirmingCancelProcessing,
      });

      // D-07: Build bottom-right overlay (cwd + branch)
      bottomRight = buildBottomRightOverlay({
        cwd: this.widget.cwd || process.cwd(),
        gitBranch: this.widget.gitBranch,
        theme,
      });
    }

    // Compute gap ranges from overlay textWidths (D-02).
     // We use a conservative container width estimate: terminal width or 80 cols.
     // The exact width isn't available pre-layout; gaps clamp automatically at paint time.
     const containerWidth = process.stdout.columns || 80;

     const topGaps: Array<{ start: number; end: number }> = [];
     if (topLeft) {
       // Left gap starts at column 1 (after corner), spans textWidth chars.
       topGaps.push({ start: 1, end: 1 + topLeft.textWidth });
     }
     if (topRight) {
       // Right gap ends at column containerWidth-1 (before corner).
       const end = containerWidth - 1;
       const start = Math.max(1, end - topRight.textWidth);
       topGaps.push({ start, end });
     }

     const bottomGaps: Array<{ start: number; end: number }> = [];
     if (bottomLeft) {
       bottomGaps.push({ start: 1, end: 1 + bottomLeft.textWidth });
     }
     if (bottomRight) {
       const end = containerWidth - 1;
       const start = Math.max(1, end - bottomRight.textWidth);
       bottomGaps.push({ start, end });
     }

     const borderGaps = {
       top: topGaps.length > 0 ? topGaps : undefined,
       bottom: bottomGaps.length > 0 ? bottomGaps : undefined,
     };

    // Bordered container with auto-expanding height and gap-aware decoration
    // When topWidget is present (e.g. shortcut help), stack it above the text field
    const containerChild = this.widget.topWidget
      ? new Column({
          crossAxisAlignment: 'stretch',
          mainAxisSize: 'min',
          children: [this.widget.topWidget, autocompleteWrapped],
        })
      : autocompleteWrapped;

    const borderedInput = new Container({
      decoration: new BoxDecoration({
        border,
        borderGaps,
      }),
      padding: EdgeInsets.symmetric({ horizontal: 1 }),
      height: this._computeHeight(),
      child: containerChild,
    });

    // Build overlay widgets array — order matters for Z-order in Stack.
    const overlayChildren: Widget[] = [borderedInput];

    // Shimmer overlay: positioned on the top border line.
    // Placed before text overlays so text paints on top of shimmer.
    if (theme) {
      const effectiveMode = this.widget.mode ?? 'smart';
      const modeColor = agentModeColor(effectiveMode, theme);
      const shimmerRight = topRight ? topRight.textWidth + 2 : 1;
      overlayChildren.push(
        new Positioned({
          top: 0,
          left: 1,
          right: shimmerRight,
          child: new BorderShimmer({
            color: modeColor,
            backgroundColor: borderColor,
            trigger: this.widget.agentModePulseSeq,
            trail: 5,
            direction: 'right-to-left',
          }),
        }),
      );
    }

    // Top-left overlay (context usage — null when no conversation)
    if (topLeft) {
      overlayChildren.push(
        new Positioned({
          top: 0,
          left: 1,
          child: topLeft.widget,
        }),
      );
    }

    // Top-right overlay (mode + skills) — always present when theme is available
    if (topRight) {
      overlayChildren.push(
        new Positioned({
          top: 0,
          right: 1,
          child: topRight.widget,
        }),
      );
    }

    // Bottom-left overlay (status — null when idle)
    if (bottomLeft) {
      overlayChildren.push(
        new Positioned({
          bottom: 0,
          left: 1,
          child: bottomLeft.widget,
        }),
      );
    }

    // Bottom-right overlay (cwd + branch) — always present when theme is available
    if (bottomRight) {
      overlayChildren.push(
        new Positioned({
          bottom: 0,
          right: 1,
          child: bottomRight.widget,
        }),
      );
    }

    // Step 8: Drag resize mouse region at top border
    const dragMouseRegion = new Positioned({
      top: 0,
      left: 0,
      right: 0,
      child: new MouseRegion({
        cursor: 'ns-resize',
        onClick: this._handleDragPress,
        onDrag: this._handleDragMove,
        onRelease: this._handleDragRelease,
        child: new SizedBox({ height: 1 }),
      }),
    });
    overlayChildren.push(dragMouseRegion);

    return new Stack({
      fit: 'passthrough',
      children: overlayChildren,
    });
  }
}
