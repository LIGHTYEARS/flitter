// InputArea — multi-line text input widget for flitter-cli TUI.
//
// Provides Amp-parity editing experience:
//   Stack (fit: 'passthrough')
//     Container (bordered, padded, auto-expanding height)
//       Autocomplete (@-trigger for file mentions, extensible)
//         TextField (submitOnEnter, block cursor, multi-line)
//     Positioned (top:0, right:1) — mode badge overlay
//     Positioned (top:0, left:0, right:0) — drag resize MouseRegion (height:1)
//
// Features:
//   - Shell mode detection ($ → shell, $$ → background)
//   - Auto-expanding height based on line count
//   - Manual drag-resize via top border mouse region
//   - Mode badge (agent mode or shell label) at top-right
//   - Processing spinner / dim when isProcessing
//   - Submit guards (empty text, whitespace-only, double-submit)
//   - BorderOverlayText extension point for downstream consumers
//   - @ autocomplete trigger for file mentions (Plan 17-04)
//
// Phase 16, Plan 01. Colors are hardcoded defaults — Phase 20 adds theme.

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
import { Autocomplete, type AutocompleteTrigger, type AutocompleteOption } from '../../../flitter-core/src/widgets/autocomplete';
import { MouseRegion } from '../../../flitter-core/src/widgets/mouse-region';
import { basename } from 'node:path';
import { SizedBox } from '../../../flitter-core/src/widgets/sized-box';
import { Text } from '../../../flitter-core/src/widgets/text';
import { TextSpan } from '../../../flitter-core/src/core/text-span';
import { TextStyle } from '../../../flitter-core/src/core/text-style';
import { Color } from '../../../flitter-core/src/core/color';
import { EdgeInsets } from '../../../flitter-core/src/layout/edge-insets';

// ---------------------------------------------------------------------------
// Step 10: BorderOverlayText — exported type for downstream consumers
// ---------------------------------------------------------------------------

/** Overlay text positioned on the input area border. */
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

// ---------------------------------------------------------------------------
// Step 3: Auto-expanding height constants
// ---------------------------------------------------------------------------

/** Minimum container height: 1 content line + 2 border rows. */
export const MIN_HEIGHT = 3;

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
  overlayTexts?: BorderOverlayText[];
  /** File list provider for @ autocomplete trigger (Plan 17-04). */
  getFiles?: () => Promise<string[]>;
}

/**
 * Multi-line input area widget with auto-expanding height, drag-resize,
 * shell mode detection, and mode badge overlay.
 *
 * Auto-expand: height grows with content line count up to maxExpandLines.
 * Drag-resize: user can drag the top border to manually set height,
 * clamped between MIN_HEIGHT (3) and half-screen.
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

  constructor(props: InputAreaProps) {
    super();
    this.onSubmit = props.onSubmit;
    this.isProcessing = props.isProcessing;
    this.mode = props.mode;
    this.externalController = props.controller;
    this.maxExpandLines = props.maxExpandLines ?? 10;
    this.overlayTexts = props.overlayTexts ?? [];
    this.getFiles = props.getFiles;
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
   */
  private _computeHeight(): number {
    if (this.dragHeight !== null) {
      return this.dragHeight;
    }
    const contentLines = Math.max(this._lineCount(), 1);
    const visibleLines = Math.min(contentLines, this.widget.maxExpandLines);
    return Math.max(visibleLines + 2, MIN_HEIGHT);
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
      const oldShell = detectShellMode(this.currentText);
      const newShell = detectShellMode(newText);
      const oldLineCount = this.currentText.split('\n').length;
      const newLineCount = newText.split('\n').length;
      this.currentText = newText;
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
      // Use a reasonable max height estimate (half of 50 rows as fallback)
      const maxHeight = Math.max(MIN_HEIGHT, Math.floor(50 / 2));
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
   *     Container (bordered, padded, height computed)
   *       Autocomplete (@ file trigger when getFiles is provided)
   *         TextField (autofocus, submitOnEnter, block cursor)
   *     Positioned (top:0, right:1) — mode badge (optional)
   *     Positioned (top:0, left:0, right:0) — drag resize MouseRegion
   *     ...any additional overlayTexts
   */
  build(_context: BuildContext): Widget {
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

    // Bordered container with auto-expanding height
    const borderedInput = new Container({
      decoration: new BoxDecoration({ border }),
      padding: EdgeInsets.symmetric({ horizontal: 1 }),
      height: this._computeHeight(),
      child: autocompleteWrapped,
    });

    // Build overlay widgets array
    const overlays: Widget[] = [];

    // Step 7: Mode badge overlay at top-right
    const shellLabel = shellMode === 'background'
      ? 'Background shell'
      : shellMode === 'shell'
        ? 'Shell mode'
        : null;
    const effectiveLabel = shellLabel ?? this.widget.mode;

    if (effectiveLabel) {
      const labelColor = shellLabel ? Color.cyan : Color.green;
      const labelText = isProcessing && !shellLabel
        ? ` \u25CF ${effectiveLabel} `
        : ` ${effectiveLabel} `;
      overlays.push(
        new Positioned({
          top: 0,
          right: 1,
          child: new Text({
            text: new TextSpan({
              text: labelText,
              style: new TextStyle({
                foreground: labelColor,
                dim: isProcessing && !shellLabel,
              }),
            }),
          }),
        }),
      );
    }

    // Step 10: Additional overlay texts from props
    for (const overlay of this.widget.overlayTexts) {
      const pos: Record<string, number> = {};
      if (overlay.position.startsWith('top'))    pos.top = 0;
      if (overlay.position.startsWith('bottom')) pos.bottom = 0;
      if (overlay.position.endsWith('left'))     pos.left = 1;
      if (overlay.position.endsWith('right'))    pos.right = 1;

      overlays.push(
        new Positioned({
          ...pos,
          child: overlay.child,
        }),
      );
    }

    // Step 8: Drag resize mouse region at top border
    overlays.push(
      new Positioned({
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
      }),
    );

    return new Stack({
      fit: 'passthrough',
      children: [borderedInput, ...overlays],
    });
  }
}
