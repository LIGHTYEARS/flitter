/**
 * ThreadVisibilitySelector -- fuzzy-picker overlay for changing thread visibility.
 *
 * Wraps a FuzzyPicker with the five visibility options (private, workspace,
 * group, unlisted, public). The currently-active visibility is disabled in the
 * picker and shown with a "(current)" suffix.
 *
 * 逆向: JRR (StatefulWidget) / T0R (State)
 *   - amp-cli-reversed/modules/1472_tui_components/misc_utils.js:5169-5178
 *     JRR extends NR (StatefulWidget), createState() returns new T0R()
 *   - amp-cli-reversed/modules/1472_tui_components/interactive_widgets.js:1081-1152
 *     T0R extends wR (State)
 *     - state fields: result, isLoading, isLoadingCurrentVisibility, currentVisibility
 *     - build: renders a FuzzyPicker (we) with visibility options
 *     - items: ["private","workspace","unlisted","public"] (+ "group" when workspace has groups)
 *     - getLabel: "Label - Description" with " (current)" suffix for active
 *     - isItemDisabled: item === currentVisibility
 *     - title: "Select Thread Visibility"
 *     - onAccept: calls execute(item), then shows result message
 *     - onDismiss: widget.props.onDismiss
 *
 * Simplification vs amp: amp's T0R is stateful because it loads current
 * visibility asynchronously and has loading/updating/result phases. Our
 * implementation receives currentVisibility as a prop, so the widget is
 * stateless -- the FuzzyPicker handles all interaction state internally.
 *
 * @module
 */

import type { BuildContext, Widget as WidgetInterface } from "@flitter/tui";
import {
  BoxDecoration,
  Color,
  Container,
  EdgeInsets,
  FuzzyPicker,
  RichText,
  StatelessWidget,
  TextSpan,
  TextStyle,
} from "@flitter/tui";

// ════════════════════════════════════════════════════
//  Types
// ════════════════════════════════════════════════════

/**
 * Visibility level for a thread.
 *
 * 逆向: interactive_widgets.js:1114
 *   amp items array: ["private", "workspace", "group", "unlisted", "public"]
 */
export type VisibilityOption = "private" | "workspace" | "group" | "unlisted" | "public";

/** A single visibility option with label and description. */
export interface VisibilityItem {
  key: VisibilityOption;
  label: string;
  description: string;
}

/**
 * Props for ThreadVisibilitySelector.
 *
 * 逆向: JRR.props (misc_utils.js:5170-5173)
 *   amp props: threadService, threadID, workspace, execute, onDismiss
 *   Simplified: currentVisibility replaces async threadService.get(),
 *   onSelect replaces execute().
 */
export interface ThreadVisibilityConfig {
  /** Current visibility of the thread. */
  currentVisibility: VisibilityOption;
  /** Whether workspace has groups (controls whether "group" option shows). */
  hasGroups?: boolean;
  /** Called when a visibility is selected. */
  onSelect: (visibility: VisibilityOption) => void;
  /** Called when dismissed (Escape). */
  onDismiss: () => void;
}

// ════════════════════════════════════════════════════
//  Visibility options data
// ════════════════════════════════════════════════════

/**
 * All available visibility options with labels and descriptions.
 *
 * 逆向: T0R.build (interactive_widgets.js:1119-1131)
 *   amp getLabel switch statement maps each key to "Label - Description"
 */
export const VISIBILITY_OPTIONS: VisibilityItem[] = [
  { key: "private", label: "Private", description: "Only you can see this thread" },
  { key: "workspace", label: "Workspace", description: "Visible to workspace members" },
  { key: "group", label: "Group", description: "Visible to group members" },
  { key: "unlisted", label: "Unlisted", description: "Anyone with the link can view" },
  { key: "public", label: "Public", description: "Searchable and on your public profile" },
];

// ════════════════════════════════════════════════════
//  ThreadVisibilitySelector
// ════════════════════════════════════════════════════

/**
 * ThreadVisibilitySelector -- renders a FuzzyPicker for selecting thread visibility.
 *
 * 逆向: JRR/T0R (misc_utils.js:5169 / interactive_widgets.js:1081-1152)
 *   Simplified to StatelessWidget since currentVisibility is a prop, not async state.
 */
export class ThreadVisibilitySelector extends StatelessWidget {
  readonly config: ThreadVisibilityConfig;

  constructor(config: ThreadVisibilityConfig) {
    super();
    this.config = config;
  }

  /**
   * 逆向: T0R.build (interactive_widgets.js:1102-1151)
   *   amp build has four branches: loading → picker → updating → result.
   *   We only need the picker branch since loading/updating/result are
   *   handled externally.
   */
  build(_context: BuildContext): WidgetInterface {
    const { currentVisibility, hasGroups, onSelect, onDismiss } = this.config;

    // 逆向: interactive_widgets.js:1113-1115
    //   a = ["private", "workspace", "unlisted", "public"]
    //   e = workspace?.groups?.length > 0
    //       ? ["private", "workspace", "group", "unlisted", "public"]
    //       : a
    const items = hasGroups
      ? VISIBILITY_OPTIONS
      : VISIBILITY_OPTIONS.filter((item) => item.key !== "group");

    return new FuzzyPicker<VisibilityItem>({
      // 逆向: interactive_widgets.js:1134
      title: "Select Thread Visibility",

      items,

      // 逆向: interactive_widgets.js:1119-1131
      //   getLabel: r => { switch(r) { case "private": return t("Private - ...", r); ... } }
      //   t = (r, h) => h === this.currentVisibility ? `${r} (current)` : r
      getLabel: (item) => {
        const base = `${item.label} - ${item.description}`;
        return item.key === currentVisibility ? `${base} (current)` : base;
      },

      // 逆向: interactive_widgets.js:1135-1143
      //   onAccept: async r => { setState(() => isLoading = true); ... execute(r); ... }
      //   Simplified: just call onSelect with the key.
      onAccept: (item) => {
        onSelect(item.key);
      },

      // 逆向: interactive_widgets.js:1144
      onDismiss,

      // 逆向: interactive_widgets.js:1133
      //   isItemDisabled: r => r === this.currentVisibility
      isItemDisabled: (item) => item.key === currentVisibility,

      // Custom renderItem: label bold + description dim, "(current)" suffix if disabled.
      // 逆向: amp does NOT use a custom renderItem -- it relies on the default FuzzyPicker
      // renderer with getLabel. We add a renderItem for richer formatting (bold label +
      // dim description) since the default renderer shows plain text.
      renderItem: (
        item: VisibilityItem,
        isSelected: boolean,
        isDisabled: boolean,
        _ctx: BuildContext,
      ): WidgetInterface => {
        const bgColor = isSelected ? Color.rgb(50, 50, 80) : Color.default();

        const spans: TextSpan[] = [
          new TextSpan({
            text: item.label,
            style: new TextStyle({ bold: true, dim: isDisabled }),
          }),
          new TextSpan({
            text: ` - ${item.description}`,
            style: new TextStyle({ dim: true }),
          }),
        ];

        if (isDisabled) {
          spans.push(
            new TextSpan({
              text: " (current)",
              style: new TextStyle({ dim: true }),
            }),
          );
        }

        return new Container({
          decoration: new BoxDecoration({ color: bgColor }),
          padding: EdgeInsets.symmetric({ horizontal: 1 }),
          child: new RichText({
            text: new TextSpan({ children: spans }),
          }) as unknown as WidgetInterface,
        }) as unknown as WidgetInterface;
      },
    }) as unknown as WidgetInterface;
  }
}
