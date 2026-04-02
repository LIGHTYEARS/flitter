// SelectionList widget — interactive selection dialog with keyboard/mouse support
// Amp ref: ap class — StatefulWidget for item selection
// Source: .reference/widgets-catalog.md

import { Key } from '../core/key';
import { TextStyle } from '../core/text-style';
import { TextSpan } from '../core/text-span';
import {
  Widget,
  StatefulWidget,
  State,
  type BuildContext,
} from '../framework/widget';
import { Column, Row } from './flex';
import { Expanded } from './flexible';
import { Text } from './text';
import { FocusScope } from './focus-scope';
import { SingleChildScrollView } from './scroll-view';
import { ScrollController } from './scroll-controller';
import { Scrollbar } from './scrollbar';
import type { KeyEvent, KeyEventResult } from '../input/events';

// ---------------------------------------------------------------------------
// SelectionItem
// ---------------------------------------------------------------------------

/**
 * An item in a SelectionList.
 */
export interface SelectionItem {
  readonly label: string;
  readonly value: string;
  readonly disabled?: boolean;
  readonly description?: string;
}

// ---------------------------------------------------------------------------
// SelectionList (Amp: ap)
// ---------------------------------------------------------------------------

/**
 * A StatefulWidget for interactive selection dialogs.
 *
 * Supports keyboard navigation (ArrowUp/ArrowDown/j/k, Tab to cycle,
 * Enter to confirm, Escape to cancel) and optional mouse interaction.
 *
 * When the list exceeds the available viewport, it auto-scrolls to keep the
 * selected item visible. An optional ScrollController can be provided for
 * external scroll control.
 *
 * Usage:
 *   new SelectionList({
 *     items: [
 *       { label: 'Option A', value: 'a' },
 *       { label: 'Option B', value: 'b', description: 'Second option' },
 *       { label: 'Option C', value: 'c', disabled: true },
 *     ],
 *     onSelect: (value) => console.log('Selected:', value),
 *     onCancel: () => console.log('Cancelled'),
 *   })
 *
 * Amp ref: ap class — selection list widget
 */
export class SelectionList extends StatefulWidget {
  readonly items: readonly SelectionItem[];
  readonly onSelect: (value: string) => void;
  readonly onCancel?: () => void;
  readonly initialIndex?: number;
  readonly enableMouseInteraction: boolean;
  readonly showDescription: boolean;
  readonly scrollController?: ScrollController;
  readonly showScrollbar: boolean;

  constructor(opts: {
    key?: Key;
    items: readonly SelectionItem[];
    onSelect: (value: string) => void;
    onCancel?: () => void;
    initialIndex?: number;
    enableMouseInteraction?: boolean;
    showDescription?: boolean;
    scrollController?: ScrollController;
    showScrollbar?: boolean;
  }) {
    super(opts.key !== undefined ? { key: opts.key } : undefined);
    this.items = opts.items;
    this.onSelect = opts.onSelect;
    this.onCancel = opts.onCancel;
    this.initialIndex = opts.initialIndex;
    this.enableMouseInteraction = opts.enableMouseInteraction ?? true;
    this.showDescription = opts.showDescription ?? true;
    this.scrollController = opts.scrollController;
    this.showScrollbar = opts.showScrollbar ?? true;
  }

  createState(): State<SelectionList> {
    return new SelectionListState();
  }
}

// ---------------------------------------------------------------------------
// SelectionListState
// ---------------------------------------------------------------------------

/**
 * State for SelectionList. Manages selected index, keyboard/mouse input,
 * and auto-scroll to keep the selected item visible.
 *
 * Navigation:
 * - ArrowUp / k: Move selection up (wraps, skips disabled)
 * - ArrowDown / j: Move selection down (wraps, skips disabled)
 * - Tab: Cycle forward through items (wraps, skips disabled)
 * - Enter: Confirm selection -> calls onSelect
 * - Escape: Cancel -> calls onCancel
 *
 * Mouse (when enableMouseInteraction is true):
 * - Click on an item -> select + confirm (calls onSelect)
 *
 * Auto-scroll:
 * - Internally wraps the item column with SingleChildScrollView
 * - When selectedIndex changes, adjusts scroll offset to keep the
 *   selected item within the visible viewport
 */
export class SelectionListState extends State<SelectionList> {
  private _selectedIndex: number = 0;
  private _ownScrollController?: ScrollController;

  /** Current selected index (0-based). */
  get selectedIndex(): number {
    return this._selectedIndex;
  }

  /**
   * Returns the effective scroll controller — either the one provided by the
   * widget or the internally-created one.
   */
  get scrollController(): ScrollController {
    return this.widget.scrollController ?? this._ownScrollController!;
  }

  initState(): void {
    super.initState();
    const items = this.widget.items;

    if (!this.widget.scrollController) {
      this._ownScrollController = new ScrollController();
    }

    if (this.widget.initialIndex !== undefined) {
      // Use the provided initial index, clamped to bounds
      this._selectedIndex = Math.max(0, Math.min(this.widget.initialIndex, items.length - 1));
    }

    // If the current index points to a disabled item, advance to next enabled
    if (items.length > 0 && items[this._selectedIndex]?.disabled) {
      this._moveToNextEnabled(1);
    }
  }

  dispose(): void {
    if (this._ownScrollController) {
      this._ownScrollController.dispose();
      this._ownScrollController = undefined;
    }
    super.dispose();
  }

  didUpdateWidget(oldWidget: SelectionList): void {
    // If items changed, ensure selected index is still valid
    if (this._selectedIndex >= this.widget.items.length) {
      this._selectedIndex = Math.max(0, this.widget.items.length - 1);
    }
    // If current item is disabled, move to next enabled
    if (this.widget.items.length > 0 && this.widget.items[this._selectedIndex]?.disabled) {
      this._moveToNextEnabled(1);
    }
  }

  /**
   * Handle a key event for selection navigation.
   * Returns 'handled' if the key was consumed, 'ignored' otherwise.
   *
   * Amp ref: ap keyboard handling — supports ArrowUp/Down, j/k, Tab/Shift+Tab,
   * Ctrl+n/Ctrl+p, Enter, Escape
   */
  handleKeyEvent(event: KeyEvent): KeyEventResult {
    const key = event.key;
    const ctrl = event.ctrlKey === true;
    const shift = event.shiftKey === true;

    // Ctrl+n — move next (Amp ref: ap Ctrl+n)
    if (ctrl && key === 'n') {
      this._moveNext();
      return 'handled';
    }

    // Ctrl+p — move previous (Amp ref: ap Ctrl+p)
    if (ctrl && key === 'p') {
      this._movePrevious();
      return 'handled';
    }

    // Shift+Tab — cycle backward (Amp ref: ap Shift+Tab)
    if (shift && key === 'Tab') {
      this._movePrevious();
      return 'handled';
    }

    switch (key) {
      case 'ArrowUp':
      case 'k':
        this._movePrevious();
        return 'handled';

      case 'ArrowDown':
      case 'j':
        this._moveNext();
        return 'handled';

      case 'Tab':
        this._moveNext();
        return 'handled';

      case 'Enter':
        this._confirmSelection();
        return 'handled';

      case 'Escape':
        this.widget.onCancel?.();
        return 'handled';

      default:
        return 'ignored';
    }
  }

  /**
   * Handle mouse click at a given item index.
   * Selects the item and confirms immediately.
   */
  handleMouseClick(index: number): void {
    if (!this.widget.enableMouseInteraction) return;
    if (index < 0 || index >= this.widget.items.length) return;
    if (this.widget.items[index]?.disabled) return;

    this.setState(() => {
      this._selectedIndex = index;
    });
    this._confirmSelection();
  }

  build(_context: BuildContext): Widget {
    const items = this.widget.items;
    const children: Widget[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i]!;
      const isSelected = i === this._selectedIndex;
      const isDisabled = item.disabled === true;

      let labelText = isSelected ? `> ${item.label}` : `  ${item.label}`;
      if (this.widget.showDescription && item.description) {
        labelText += ` - ${item.description}`;
      }

      const style = this._getItemStyle(isSelected, isDisabled);
      children.push(
        new Text({
          text: new TextSpan({ text: labelText, style }),
        }),
      );
    }

    const column = new Column({
      children,
      crossAxisAlignment: 'start',
      mainAxisSize: 'min',
    });

    const scrollChild = new SingleChildScrollView({
      controller: this.scrollController,
      child: column,
    });

    let scrollContent: Widget;
    if (this.widget.showScrollbar) {
      scrollContent = new Row({
        children: [
          new Expanded({ child: scrollChild }),
          new Scrollbar({ controller: this.scrollController }),
        ],
      });
    } else {
      scrollContent = scrollChild;
    }

    return new FocusScope({
      autofocus: true,
      onKey: (event: KeyEvent): KeyEventResult => {
        return this.handleKeyEvent(event);
      },
      child: scrollContent,
    });
  }

  // -- Private helpers --

  /**
   * Move selection to the previous enabled item, wrapping around.
   * After moving, adjusts scroll to keep the selected item visible.
   */
  private _movePrevious(): void {
    this.setState(() => {
      this._moveToNextEnabled(-1);
      this._ensureSelectedVisible();
    });
  }

  /**
   * Move selection to the next enabled item, wrapping around.
   * After moving, adjusts scroll to keep the selected item visible.
   */
  private _moveNext(): void {
    this.setState(() => {
      this._moveToNextEnabled(1);
      this._ensureSelectedVisible();
    });
  }

  /**
   * Confirm the current selection by calling onSelect with the selected value.
   */
  private _confirmSelection(): void {
    const items = this.widget.items;
    if (items.length === 0) return;

    const selectedItem = items[this._selectedIndex];
    if (selectedItem && !selectedItem.disabled) {
      this.widget.onSelect(selectedItem.value);
    }
  }

  /**
   * Move the selected index in the given direction (+1 or -1),
   * skipping disabled items and wrapping around.
   * If all items are disabled, stays at the current position.
   */
  private _moveToNextEnabled(direction: 1 | -1): void {
    const items = this.widget.items;
    if (items.length === 0) return;

    let candidate = this._selectedIndex;
    for (let attempts = 0; attempts < items.length; attempts++) {
      candidate = (candidate + direction + items.length) % items.length;
      if (!items[candidate]?.disabled) {
        this._selectedIndex = candidate;
        return;
      }
    }
    // All items disabled — stay at current index
  }

  /**
   * Adjust scroll offset so the currently selected item is visible within
   * the viewport. Each item occupies 1 row of height. If the viewport
   * size is not yet known (0), this is a no-op.
   */
  private _ensureSelectedVisible(): void {
    const ctrl = this.scrollController;
    const viewportSize = ctrl.viewportSize;
    if (viewportSize <= 0) return;

    const itemTop = this._selectedIndex;
    const itemBottom = this._selectedIndex + 1;
    const currentOffset = ctrl.offset;

    if (itemTop < currentOffset) {
      ctrl.jumpTo(itemTop);
    } else if (itemBottom > currentOffset + viewportSize) {
      ctrl.jumpTo(itemBottom - viewportSize);
    }
  }

  /**
   * Get the TextStyle for an item based on selection and disabled state.
   */
  private _getItemStyle(isSelected: boolean, isDisabled: boolean): TextStyle {
    if (isDisabled) {
      return new TextStyle({ dim: true });
    }
    if (isSelected) {
      return new TextStyle({ bold: true, inverse: true });
    }
    return new TextStyle();
  }
}
