/**
 * FuzzyPicker — 通用模糊搜索选择器 Widget。
 *
 * 逆向: amp we (widget) in misc_utils.js:2393,
 *       amp NZT (state) in actions_intents.js:2644
 *
 * 组合 TextField + 可滚动列表 + 键盘/鼠标导航。
 * 可用于命令面板、文件选择器、符号选择器等场景。
 *
 * @module
 */

import { Action } from "../actions/action.js";
import { Actions } from "../actions/actions.js";
import { Intent } from "../actions/intent.js";
import { KeyActivator } from "../actions/key-activator.js";
import { Shortcuts } from "../actions/shortcuts.js";
import { TextEditingController } from "../editing/text-editing-controller.js";
import { TextField } from "../editing/text-field.js";
import { FocusNode } from "../focus/focus-node.js";
import { Color } from "../screen/color.js";
import { TextStyle } from "../screen/text-style.js";
import { ScrollController } from "../scroll/scroll-controller.js";
import { ScrollViewport } from "../scroll/scrollable.js";
import type { BuildContext, Widget as WidgetInterface } from "../tree/element.js";
import { State, StatefulWidget } from "../tree/stateful-widget.js";
import { StatelessWidget } from "../tree/stateless-widget.js";
import type { Widget } from "../tree/widget.js";
import { Border } from "../widgets/border.js";
import { BorderSide } from "../widgets/border-side.js";
import { BoxDecoration } from "../widgets/box-decoration.js";
import { Column } from "../widgets/column.js";
import { Container } from "../widgets/container.js";
import { EdgeInsets } from "../widgets/edge-insets.js";
import { Expanded } from "../widgets/flexible.js";
import { MouseRegion } from "../widgets/mouse-region.js";
import { Row } from "../widgets/row.js";
import { SizedBox } from "../widgets/sized-box.js";
import { Text } from "../widgets/text.js";
import { fuzzyMatch } from "./fuzzy-match.js";

// ════════════════════════════════════════════════════
//  Intent classes
// ════════════════════════════════════════════════════

/**
 * 逆向: amp qy (modules/2487_unknown_qy.js) — 向下移动选择。
 */
export class MoveDownIntent extends Intent {}

/**
 * 逆向: amp zy (modules/2488_unknown_zy.js) — 向上移动选择。
 */
export class MoveUpIntent extends Intent {}

/**
 * 逆向: amp FM (modules/2489_unknown_FM.js) — 接受/确认选择。
 */
export class AcceptIntent extends Intent {}

/**
 * 逆向: amp GM (modules/2490_unknown_GM.js) — 关闭/取消。
 */
export class DismissIntent extends Intent {}

// ════════════════════════════════════════════════════
//  ContextCapture helper
// ════════════════════════════════════════════════════

/**
 * 在 build 期间捕获 BuildContext 的辅助 Widget。
 *
 * 逆向: amp wZT (StatefulWidget) / BZT (State) in text_rendering.js:2008 / misc_utils.js:2388
 * BZT.build(T) { return this.widget.onContext(T), this.widget.child; }
 *
 * 用于 ensureSelectedItemVisible() 定位每个条目的渲染对象。
 * 简化为 StatelessWidget，功能等价。
 */
class ContextCapture extends StatelessWidget {
  readonly child: WidgetInterface;
  readonly onBuild: (ctx: BuildContext) => void;

  constructor(child: WidgetInterface, onBuild: (ctx: BuildContext) => void) {
    super();
    this.child = child;
    this.onBuild = onBuild;
  }

  build(context: BuildContext): WidgetInterface {
    this.onBuild(context);
    return this.child;
  }
}

// ════════════════════════════════════════════════════
//  Types
// ════════════════════════════════════════════════════

/** Scored item — intermediate type during filtering pipeline. */
export interface ScoredItem<T> {
  item: T;
  score: number;
  matches: boolean;
}

/** FuzzyPicker controller for external state sync. */
export class FuzzyPickerController {
  query = "";
  selectedItem: unknown = null;
}

/** FuzzyPicker construction props. */
export interface FuzzyPickerProps<T> {
  items: T[];
  getLabel: (item: T) => string;
  renderItem?: (
    item: T,
    isSelected: boolean,
    isDisabled: boolean,
    ctx: BuildContext,
  ) => WidgetInterface;
  onAccept: (item: T, info: { hasUserInteracted: boolean }) => void;
  onDismiss?: () => void;
  onSelectionChange?: (item: T | null) => void;
  sortItems?: (a: ScoredItem<T>, b: ScoredItem<T>, query: string) => number;
  filterItem?: (item: T, query: string) => boolean;
  isItemDisabled?: (item: T) => boolean;
  normalizeQuery?: (query: string) => string;
  title?: string;
  maxRenderItems?: number;
  controller?: FuzzyPickerController;
}

// ════════════════════════════════════════════════════
//  FuzzyPicker Widget
// ════════════════════════════════════════════════════

/**
 * FuzzyPicker — 通用模糊搜索选择器 StatefulWidget。
 *
 * 逆向: amp we in misc_utils.js:2393
 */
export class FuzzyPicker<T> extends StatefulWidget {
  readonly items: T[];
  readonly getLabel: (item: T) => string;
  readonly renderItem?: (
    item: T,
    isSelected: boolean,
    isDisabled: boolean,
    ctx: BuildContext,
  ) => WidgetInterface;
  readonly onAccept: (item: T, info: { hasUserInteracted: boolean }) => void;
  readonly onDismiss?: () => void;
  readonly onSelectionChange?: (item: T | null) => void;
  readonly sortItems?: (a: ScoredItem<T>, b: ScoredItem<T>, query: string) => number;
  readonly filterItem?: (item: T, query: string) => boolean;
  readonly isItemDisabled?: (item: T) => boolean;
  readonly normalizeQuery?: (query: string) => string;
  readonly title?: string;
  readonly maxRenderItems?: number;
  readonly controller?: FuzzyPickerController;

  constructor(props: FuzzyPickerProps<T>) {
    super();
    this.items = props.items;
    this.getLabel = props.getLabel;
    this.renderItem = props.renderItem;
    this.onAccept = props.onAccept;
    this.onDismiss = props.onDismiss;
    this.onSelectionChange = props.onSelectionChange;
    this.sortItems = props.sortItems;
    this.filterItem = props.filterItem;
    this.isItemDisabled = props.isItemDisabled;
    this.normalizeQuery = props.normalizeQuery;
    this.title = props.title;
    this.maxRenderItems = props.maxRenderItems;
    this.controller = props.controller;
  }

  createState(): State {
    return new FuzzyPickerState<T>();
  }
}

// ════════════════════════════════════════════════════
//  FuzzyPickerState
// ════════════════════════════════════════════════════

/**
 * FuzzyPicker 状态管理。
 *
 * 逆向: amp NZT in actions_intents.js:2644
 */
class FuzzyPickerState<T> extends State<FuzzyPicker<T>> {
  private textController!: TextEditingController;
  private focusNode!: FocusNode;
  private scrollController!: ScrollController;
  private selectedIndex = 0;
  private hasUserInteracted = false;
  private cachedQuery = "";
  private cachedItemsRef: T[] | null = null;
  private cachedFiltered: T[] = [];
  private itemContexts: BuildContext[] = [];

  // ── Lifecycle ──

  /**
   * 逆向: NZT.initState (actions_intents.js:2654)
   */
  override initState(): void {
    super.initState();

    this.textController = new TextEditingController({
      text: this.widget.controller?.query ?? "",
    });
    this.focusNode = new FocusNode({
      debugLabel: "FuzzyPicker",
    });
    this.scrollController = new ScrollController();

    // 逆向: NZT line 2655 — scrollController.disableFollowMode()
    this.scrollController.disableFollowMode();

    // 逆向: NZT line 2657-2663 — textController.addListener
    this.textController.addListener(() => {
      this.hasUserInteracted = true;
      this.selectedIndex = 0;
      this.recomputeFilteredItems();
      this.setState();
      // Sync to external controller
      if (this.widget.controller) {
        this.widget.controller.query = this.textController.text;
      }
      this.syncSelection();
    });

    this.recomputeFilteredItems();

    // 逆向: NZT line 2664-2667 — restore selectedItem from controller
    if (this.widget.controller?.selectedItem) {
      const idx = this.cachedFiltered.indexOf(this.widget.controller?.selectedItem as T);
      if (idx >= 0) this.selectedIndex = idx;
    }

    this.clampSelectedIndex();
    this.syncSelection();
  }

  /**
   * 逆向: NZT.dispose (actions_intents.js:2679)
   */
  override dispose(): void {
    this.widget.onSelectionChange?.(null);
    this.textController.dispose();
    this.focusNode.dispose();
    this.scrollController.dispose();
    super.dispose();
  }

  // ── Filtering pipeline ──

  /**
   * 逆向: NZT.recomputeFilteredItems (actions_intents.js:2724)
   */
  private recomputeFilteredItems(): void {
    const query = this.textController.text;
    const items = this.widget.items;
    const normalizedQuery = this.widget.normalizeQuery?.(query) ?? query;
    const { getLabel, filterItem, sortItems, maxRenderItems } = this.widget;

    const scored: ScoredItem<T>[] = items
      .filter((item) => !filterItem || filterItem(item, query))
      .map((item) => ({
        item,
        ...fuzzyMatch(normalizedQuery, getLabel(item)),
      }))
      .filter((entry) => entry.matches)
      .sort(sortItems ? (a, b) => sortItems(a, b, query) : (a, b) => b.score - a.score);

    const filtered = scored.map((s) => s.item);
    this.cachedQuery = query;
    this.cachedItemsRef = items;
    this.cachedFiltered = maxRenderItems != null ? filtered.slice(0, maxRenderItems) : filtered;
  }

  /**
   * 逆向: NZT.getFilteredItems (actions_intents.js:2734)
   * 缓存检查 — 仅在 query 或 items 改变时重新计算。
   */
  private getFilteredItems(): T[] {
    const query = this.textController.text;
    const items = this.widget.items;
    if (this.cachedQuery === query && this.cachedItemsRef === items) {
      return this.cachedFiltered;
    }
    this.recomputeFilteredItems();
    return this.cachedFiltered;
  }

  private clampSelectedIndex(): void {
    const maxIdx = this.cachedFiltered.length - 1;
    if (maxIdx < 0) {
      this.selectedIndex = 0;
      return;
    }
    this.selectedIndex = Math.max(0, Math.min(this.selectedIndex, maxIdx));
  }

  // ── Intent handling ──

  /**
   * 逆向: NZT.invoke (actions_intents.js:2682)
   * Arrow function to preserve `this` binding — matches amp's `invoke = T => { ... }`.
   */
  private invoke = (intent: Intent): "handled" | "ignored" => {
    if (intent instanceof MoveDownIntent) {
      const items = this.getFilteredItems();
      if (items.length > 0 && this.selectedIndex < items.length - 1) {
        this.hasUserInteracted = true;
        this.selectedIndex++;
        this.setState();
        this.syncSelection();
      }
      return "handled";
    }
    if (intent instanceof MoveUpIntent) {
      const items = this.getFilteredItems();
      if (items.length > 0 && this.selectedIndex > 0) {
        this.hasUserInteracted = true;
        this.selectedIndex--;
        this.setState();
        this.syncSelection();
      }
      return "handled";
    }
    if (intent instanceof AcceptIntent) {
      const items = this.getFilteredItems();
      if (items.length > 0 && this.selectedIndex < items.length) {
        const item = items[this.selectedIndex];
        if (item != null) {
          if (!(this.widget.isItemDisabled?.(item) ?? false)) {
            this.widget.onAccept(item, {
              hasUserInteracted: this.hasUserInteracted,
            });
          }
        }
      }
      return "handled";
    }
    if (intent instanceof DismissIntent) {
      this.widget.onDismiss?.();
      return "handled";
    }
    return "ignored";
  };

  /**
   * 逆向: NZT.syncSelection (actions_intents.js:2711)
   */
  private syncSelection(): void {
    const item = this.cachedFiltered[this.selectedIndex] ?? null;
    if (this.widget.controller) {
      this.widget.controller.selectedItem = item;
    }
    this.widget.onSelectionChange?.(item);
  }

  // ── Mouse handling ──

  /**
   * 逆向: NZT.handleScroll (actions_intents.js:2754)
   * Uses direction field from ScrollEvent (amp: T.direction === "down").
   */
  private handleScroll = (event: {
    type: string;
    direction?: string;
    [key: string]: unknown;
  }): boolean => {
    const items = this.getFilteredItems();
    if (items.length === 0) return false;
    const prevIndex = this.selectedIndex;
    if (event.direction === "down") {
      if (this.selectedIndex < items.length - 1) {
        this.hasUserInteracted = true;
        this.selectedIndex++;
      } else {
        return false;
      }
    } else {
      if (this.selectedIndex > 0) {
        this.hasUserInteracted = true;
        this.selectedIndex--;
      } else {
        return false;
      }
    }
    this.setState();
    this.syncSelection();
    return this.selectedIndex !== prevIndex;
  };

  /**
   * 逆向: NZT.handleItemClick (actions_intents.js:2765)
   * amp: handleItemClick = (T, R) => { ... } where T=index, R=clickCount
   */
  private handleItemClick = (index: number, clickCount: number): void => {
    const items = this.getFilteredItems();
    if (index >= 0 && index < items.length) {
      const item = items[index];
      const isDisabled = item ? (this.widget.isItemDisabled?.(item) ?? false) : false;
      if (clickCount === 1) {
        this.hasUserInteracted = true;
        this.selectedIndex = index;
        this.setState();
        this.syncSelection();
      } else if (clickCount === 2 && !isDisabled) {
        if (item) {
          this.hasUserInteracted = true;
          this.widget.onAccept(item, {
            hasUserInteracted: this.hasUserInteracted,
          });
        }
      }
    }
  };

  // ── Build ──

  /**
   * 逆向: NZT.build (actions_intents.js:2777)
   */
  build(_context: BuildContext): WidgetInterface {
    const filteredItems = this.getFilteredItems();

    // 逆向: NZT line 2783 — border = h9.all(new e9(...))
    const border = Border.all(new BorderSide(Color.white()));

    // ── TextField with shortcuts and actions ──

    // 逆向: NZT line 2789-2799 — TextField
    const textField = new TextField({
      controller: this.textController,
      focusNode: this.focusNode,
      autofocus: true,
      maxLines: 1,
    });

    // 逆向: NZT line 2800-2810 — Shortcuts wrapping TextField
    // amp passes focusNode to Shortcuts (line 2809)
    const shortcuts = new Shortcuts({
      shortcuts: new Map<KeyActivator, Intent>([
        [KeyActivator.key("ArrowDown"), new MoveDownIntent()],
        [KeyActivator.key("ArrowUp"), new MoveUpIntent()],
        [KeyActivator.key("Tab"), new MoveDownIntent()],
        [new KeyActivator("Tab", { shift: true }), new MoveUpIntent()],
        [new KeyActivator("n", { ctrl: true }), new MoveDownIntent()],
        [new KeyActivator("p", { ctrl: true }), new MoveUpIntent()],
        [KeyActivator.key("Enter"), new AcceptIntent()],
        [KeyActivator.key("Escape"), new DismissIntent()],
      ]),
      focusNode: this.focusNode,
      child: textField as unknown as WidgetInterface,
    });

    // 逆向: NZT line 2811-2814 — Actions wrapping Shortcuts
    const actions = new Actions({
      actions: new Map<abstract new (...args: never[]) => Intent, Action>([
        [MoveDownIntent, new CallbackAction(this.invoke)],
        [MoveUpIntent, new CallbackAction(this.invoke)],
        [AcceptIntent, new CallbackAction(this.invoke)],
        [DismissIntent, new CallbackAction(this.invoke)],
      ]),
      child: shortcuts as unknown as WidgetInterface,
    });

    // 逆向: NZT line 2815-2828 — prompt row: "> " + TextField
    const promptRow = new Row({
      children: [
        new Container({
          decoration: new BoxDecoration({}),
          child: new Text({
            data: ">",
            style: new TextStyle({}),
          }) as unknown as WidgetInterface,
        }) as unknown as Widget,
        new Expanded({
          child: actions as unknown as Widget,
        }) as unknown as Widget,
      ],
    });

    // ── Build item widgets ──
    // 逆向: NZT line 2829 — this.itemContexts = []
    this.itemContexts = [];

    let listContent: WidgetInterface;

    if (filteredItems.length === 0 && this.textController.text.length > 0) {
      // 逆向: NZT line 2843-2851 — empty state
      listContent = new Expanded({
        child: new Text({
          data: "No matches",
          style: new TextStyle({ dim: true }),
        }) as unknown as Widget,
      }) as unknown as WidgetInterface;
    } else {
      // 逆向: NZT line 2853-2883 — item list
      const itemWidgets: Widget[] = filteredItems.map((item, index) => {
        const isSelected = index === this.selectedIndex;
        const isDisabled = this.widget.isItemDisabled?.(item) ?? false;

        let rendered: WidgetInterface;
        if (this.widget.renderItem) {
          rendered = this.widget.renderItem(item, isSelected, isDisabled, _context);
        } else {
          rendered = this.defaultRenderItem(item, isSelected, isDisabled);
        }

        // 逆向: NZT line 2873-2878 — ContextCapture wrapping MouseRegion
        return new ContextCapture(
          new MouseRegion({
            onClick: (event: { clickCount?: number; [key: string]: unknown }) => {
              this.handleItemClick(
                index,
                (event as unknown as { clickCount: number }).clickCount ?? 1,
              );
            },
            child: rendered as unknown as WidgetInterface,
          }) as unknown as WidgetInterface,
          (ctx) => {
            this.itemContexts[index] = ctx;
          },
        ) as unknown as Widget;
      });

      // 逆向: NZT line 2880-2883 — Column of items with crossAxisAlignment start
      const itemColumn = new Column({
        crossAxisAlignment: "start",
        children: itemWidgets,
      });

      listContent = new Expanded({
        child: new MouseRegion({
          onScroll: (event) => {
            this.handleScroll(
              event as { type: string; direction?: string; [key: string]: unknown },
            );
          },
          opaque: false,
          child: new ScrollViewport({
            controller: this.scrollController,
            child: itemColumn as unknown as WidgetInterface,
          }) as unknown as WidgetInterface,
        }) as unknown as Widget,
      }) as unknown as WidgetInterface;
    }

    // ── Build column children ──
    // 逆向: NZT line 2894 — n = []
    const columnChildren: Widget[] = [];

    // 逆向: NZT line 2895-2906 — optional title
    if (this.widget.title) {
      columnChildren.push(
        new Container({
          padding: EdgeInsets.symmetric({ horizontal: 1 }),
          child: new Text({
            data: this.widget.title,
            style: new TextStyle({ bold: true }),
          }) as unknown as WidgetInterface,
        }) as unknown as Widget,
      );
    }

    // 逆向: NZT line 2907-2909 — prompt row + spacer
    columnChildren.push(promptRow as unknown as Widget);
    columnChildren.push(new SizedBox({ height: 1 }) as unknown as Widget);

    // 逆向: NZT line 2913-2932 — results list (Expanded with scroll)
    columnChildren.push(listContent as unknown as Widget);

    // 逆向: NZT line 2934-2941 — outer container with border
    return new Container({
      decoration: new BoxDecoration({
        border,
        color: Color.rgb(0, 0, 0),
      }),
      padding: EdgeInsets.symmetric({ horizontal: 1 }),
      child: new Column({ children: columnChildren }) as unknown as WidgetInterface,
    }) as unknown as WidgetInterface;
  }

  /**
   * Default item renderer when no renderItem prop is provided.
   *
   * 逆向: NZT line 2857-2871 — default render with selection highlight
   */
  private defaultRenderItem(item: T, isSelected: boolean, isDisabled: boolean): WidgetInterface {
    const bgColor = isSelected ? Color.rgb(50, 50, 80) : undefined;

    return new Container({
      decoration: bgColor ? new BoxDecoration({ color: bgColor }) : undefined,
      padding: EdgeInsets.symmetric({ horizontal: 2 }),
      child: new Text({
        data: this.widget.getLabel(item),
        style: new TextStyle({
          dim: isDisabled,
        }),
      }) as unknown as WidgetInterface,
    }) as unknown as WidgetInterface;
  }
}

// ════════════════════════════════════════════════════
//  CallbackAction helper
// ════════════════════════════════════════════════════

/**
 * Simple Action that delegates to a callback.
 *
 * 逆向: amp x9 — CallbackAction wrapping a function.
 * Used by FuzzyPickerState to map intents to the single `invoke` handler.
 */
class CallbackAction extends Action {
  private readonly callback: (intent: Intent) => "handled" | "ignored" | void;

  constructor(callback: (intent: Intent) => "handled" | "ignored" | void) {
    super();
    this.callback = callback;
  }

  invoke(intent: Intent): "handled" | "ignored" | void {
    return this.callback(intent);
  }
}
