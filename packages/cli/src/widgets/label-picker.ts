/**
 * LabelPicker widget — fuzzy-filterable label selector with inline creation.
 *
 * 逆向: amp URR (StatefulWidget) at misc_utils.js:4937
 * 逆向: amp NRR (State) at misc_utils.js:4814
 *
 * @module
 */

import type { BuildContext, Element, Widget as WidgetInterface } from "@flitter/tui";
import {
  BoxDecoration,
  Color,
  Container,
  EdgeInsets,
  FuzzyPicker,
  type FuzzyPickerProps,
  RichText,
  type ScoredItem,
  SpinnerOverlay,
  type SpinnerOverlayColors,
  State,
  StatefulWidget,
  TextSpan,
  TextStyle,
} from "@flitter/tui";

import { type AppTheme, AppThemeController } from "./app-theme-controller.js";

// ════════════════════════════════════════════════════
//  Types
// ════════════════════════════════════════════════════

/** Label data as provided by the API. */
export interface LabelData {
  id: string;
  name: string;
}

/** LabelPicker configuration. */
export interface LabelPickerConfig {
  /** Labels already applied to the current thread (will be filtered out). */
  currentLabels: string[];
  /** All available labels. In amp this is fetched from API; we accept them as props. */
  labels: LabelData[];
  /** Whether labels are still loading. */
  isLoading?: boolean;
  /** Called when a label is selected or created. */
  onSelect: (labelName: string) => void;
  /** Called when dismissed. */
  onDismiss: () => void;
}

// ════════════════════════════════════════════════════
//  Label validation — 逆向: NRR.getValidationError / isValidLabelName (misc_utils.js:4837-4845)
// ════════════════════════════════════════════════════

const LABEL_MAX_LENGTH = 32;
const LABEL_PATTERN = /^[a-z0-9][a-z0-9-]*$/;

/** Return a validation error message for a label name, or null if valid/empty. */
export function getLabelValidationError(name: string): string | null {
  const normalized = name.trim().toLowerCase();
  if (normalized.length === 0) return null;
  if (normalized.length > LABEL_MAX_LENGTH) {
    return "Label name cannot exceed 32 characters";
  }
  if (!LABEL_PATTERN.test(normalized)) {
    return "Label must be alphanumeric with hyphens, starting with a letter or number";
  }
  return null;
}

/** Check whether a label name is valid (non-empty and passes validation). */
export function isValidLabelName(name: string): boolean {
  return getLabelValidationError(name) === null && name.trim().length > 0;
}

// ════════════════════════════════════════════════════
//  Create-marker sentinel — 逆向: misc_utils.js:4869-4873
// ════════════════════════════════════════════════════

interface CreateMarker extends LabelData {
  __isCreateMarker: true;
}

const CREATE_SENTINEL: CreateMarker = {
  id: "__create__",
  name: "__create_placeholder__",
  __isCreateMarker: true,
};

function isCreateMarker(item: LabelData): item is CreateMarker {
  return "__isCreateMarker" in item && (item as CreateMarker).__isCreateMarker === true;
}

// ════════════════════════════════════════════════════
//  LabelPicker StatefulWidget — 逆向: URR at misc_utils.js:4937-4946
// ════════════════════════════════════════════════════

export class LabelPicker extends StatefulWidget {
  readonly config: LabelPickerConfig;

  constructor(config: LabelPickerConfig) {
    super();
    this.config = config;
  }

  createState(): State<LabelPicker> {
    return new LabelPickerState();
  }
}

// ════════════════════════════════════════════════════
//  LabelPickerState — 逆向: NRR at misc_utils.js:4814-4935
// ════════════════════════════════════════════════════

export class LabelPickerState extends State<LabelPicker> {
  /** 逆向: NRR.currentQuery = "" (misc_utils.js:4817) */
  private currentQuery = "";

  /** 逆向: NRR.getAvailableLabels (misc_utils.js:4847-4849) */
  private getAvailableLabels(): LabelData[] {
    const applied = this.widget.config.currentLabels ?? [];
    return this.widget.config.labels.filter((label) => !applied.includes(label.name));
  }

  /** 逆向: NRR.shouldShowCreateMarker (misc_utils.js:4851-4858) */
  private shouldShowCreateMarker(query: string): boolean {
    if (query.length === 0 || this.widget.config.isLoading) return false;
    const normalized = query.trim().toLowerCase();
    if (!isValidLabelName(normalized)) return false;
    const applied = this.widget.config.currentLabels ?? [];
    const existsInAll = this.widget.config.labels.some((l) => l.name === normalized);
    const alreadyApplied = applied.includes(normalized);
    return !existsInAll && !alreadyApplied;
  }

  /** 逆向: NRR.build (misc_utils.js:4860-4935) */
  build(context: BuildContext): WidgetInterface {
    // 逆向: let R = $R.of(T), { app: a, colors: e } = R
    let appTheme: AppTheme | null = null;
    try {
      appTheme = AppThemeController.maybeOf(context as unknown as Element);
    } catch {
      // fallback
    }

    // Loading state → SpinnerOverlay
    if (this.widget.config.isLoading) {
      const spinnerColors: SpinnerOverlayColors = {
        processing: appTheme?.processing ?? Color.cyan(),
        foreground: Color.default(),
        background: appTheme?.selectionBackground ?? Color.rgb(30, 30, 46),
        info: appTheme?.keybind ?? Color.blue(),
      };
      return new SpinnerOverlay({
        message: "Loading labels...",
        onCancel: this.widget.config.onDismiss,
        colors: spinnerColors,
      }) as unknown as WidgetInterface;
    }

    // Prepare items — 逆向: misc_utils.js:4868-4874
    const currentNormalized = this.currentQuery.trim().toLowerCase();
    const _validationError =
      currentNormalized.length > 0 ? getLabelValidationError(currentNormalized) : null;
    const availableLabels = this.getAvailableLabels();
    const items: LabelData[] = [CREATE_SENTINEL as LabelData, ...availableLabels];

    // Color setup — 逆向: let o = s ? a.selectionBackground : void 0
    const selectionBg = appTheme?.selectionBackground ?? Color.rgb(50, 50, 80);
    const selectionFg = appTheme?.selectionForeground ?? Color.default();
    const defaultFg = Color.default();

    // FuzzyPicker — 逆向: new we({ title: "Add Label", ... })
    const pickerProps: FuzzyPickerProps<LabelData> = {
      title: "Add Label",
      items,

      // 逆向: getLabel (misc_utils.js:4878-4880)
      getLabel: (item: LabelData): string => {
        if (isCreateMarker(item)) return this.currentQuery.trim().toLowerCase();
        return item.name;
      },

      // 逆向: onAccept (misc_utils.js:4882-4884)
      onAccept: (item: LabelData): void => {
        if (isCreateMarker(item)) {
          this.widget.config.onSelect(this.currentQuery.trim().toLowerCase());
        } else {
          this.widget.config.onSelect(item.name);
        }
      },

      onDismiss: this.widget.config.onDismiss,

      // 逆向: renderItem (misc_utils.js:4889-4920)
      renderItem: (
        item: LabelData,
        isSelected: boolean,
        _isDisabled: boolean,
        _ctx: BuildContext,
      ): WidgetInterface => {
        const bgColor = isSelected ? selectionBg : undefined;
        const fgColor = isSelected ? selectionFg : defaultFg;

        if (isCreateMarker(item)) {
          // 逆向: "Create new label: " + bold(query)
          const queryText = this.currentQuery.trim().toLowerCase();
          return new Container({
            decoration: bgColor ? new BoxDecoration({ color: bgColor }) : undefined,
            padding: EdgeInsets.symmetric({ horizontal: 2 }),
            child: new RichText({
              text: new TextSpan({
                children: [
                  new TextSpan({
                    text: "Create new label: ",
                    style: new TextStyle({ foreground: fgColor }),
                  }),
                  new TextSpan({
                    text: queryText,
                    style: new TextStyle({ foreground: fgColor, bold: true }),
                  }),
                ],
              }),
            }) as unknown as WidgetInterface,
          }) as unknown as WidgetInterface;
        }

        // Regular label
        return new Container({
          decoration: bgColor ? new BoxDecoration({ color: bgColor }) : undefined,
          padding: EdgeInsets.symmetric({ horizontal: 2 }),
          child: new RichText({
            text: new TextSpan({
              text: item.name,
              style: new TextStyle({ foreground: fgColor }),
            }),
          }) as unknown as WidgetInterface,
        }) as unknown as WidgetInterface;
      },

      // 逆向: filterItem (misc_utils.js:4921-4925)
      filterItem: (item: LabelData, query: string): boolean => {
        // Side-effect: sync currentQuery → setState for create marker display
        if (this.currentQuery !== query) {
          this.currentQuery = query;
          setTimeout(() => this.setState(() => {}), 0);
        }
        if (isCreateMarker(item)) return this.shouldShowCreateMarker(query);
        const normalized = query.trim().toLowerCase();
        return normalized.length === 0 || item.name.includes(normalized);
      },

      // 逆向: sortItems (misc_utils.js:4927-4933)
      sortItems: (a: ScoredItem<LabelData>, b: ScoredItem<LabelData>, _query: string): number => {
        const aIsCreate = isCreateMarker(a.item);
        const bIsCreate = isCreateMarker(b.item);
        if (aIsCreate && !bIsCreate) return -1;
        if (!aIsCreate && bIsCreate) return 1;
        return b.score - a.score;
      },
    };

    return new FuzzyPicker(pickerProps) as unknown as WidgetInterface;
  }
}
