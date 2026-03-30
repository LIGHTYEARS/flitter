# Gap U04: Dialog Data Class in flitter-core Is Unused/Unconnected

## Status: Proposal
## Affected packages: `flitter-core`, `flitter-amp`

---

## 1. Current Behavior Analysis

### 1.1 The Dialog Data Class Today

The `Dialog` class in `/home/gem/workspace/flitter/packages/flitter-core/src/widgets/dialog.ts` is a plain data class (NOT a widget) that holds configuration for rendering dialogs. It was implemented as requirement MWDG-04, faithfully reproducing the Amp `ab` class from the reverse-engineered source (amp-strings.txt line 530811).

```typescript
export class Dialog {
  readonly title: string;
  readonly type: DialogType;          // 'info' | 'warning' | 'error' | 'confirm' | 'custom'
  readonly subtitle?: string;
  readonly body?: Widget;
  readonly footerStyle: FooterStyle;  // 'buttons' | 'text' | 'none'
  readonly buttons?: readonly DialogButton[];
  readonly dimensions?: DialogDimensions;
  readonly border: boolean;

  constructor(opts: { ... })
  copyWith(overrides: { ... }): Dialog
  toString(): string
}
```

The class is:
- Exported from `flitter-core/src/index.ts` (line 35-36) as a public API surface member
- Covered by a thorough test suite at `flitter-core/src/widgets/__tests__/dialog.test.ts` (192 lines, tests for construction, defaults, `copyWith`, immutability, `toString`)
- Documented with JSDoc and Amp reference comments

### 1.2 The Intended Architecture (Amp Reference)

Per `.reference/widgets-catalog.md` (lines 918-936), the Amp `ab` class is described as:

> `ab` is a dialog data container, NOT a widget itself. It carries the content widget, title, and metadata. The actual dialog rendering is handled by the **application shell** which overlays the `ab.widget` content in a bordered Container.

The Amp architecture has two distinct dialog-related classes:
1. **`ab` (Dialog)** -- a data class holding dialog configuration (title, type, footer style, dimensions, body widget)
2. **`ap` (SelectionList)** -- a StatefulWidget that provides the interactive selection UI inside dialogs (keyboard navigation, Enter/Escape handling)

The `ab` data class was intended to be consumed by the application shell layer (the equivalent of `flitter-amp`'s `App` widget), which would read its properties and construct a bordered overlay containing the dialog's body widget.

### 1.3 What Actually Happens in flitter-amp

The `flitter-amp` package implements dialog overlays **without using the `Dialog` data class at all**:

**PermissionDialog** (`/home/gem/workspace/flitter/packages/flitter-amp/src/widgets/permission-dialog.ts`):
- Directly builds its own widget tree: `Stack > [Positioned(mask), FocusScope > Column > Container > Column > [Text, Text, SelectionList]]`
- Hard-codes its layout, styling, and structure
- Does NOT import or reference `Dialog` from `flitter-core`

**App overlay pattern** (`/home/gem/workspace/flitter/packages/flitter-amp/src/app.ts`, lines 274-350):
- Uses `Stack + Positioned` to overlay `PermissionDialog`, `CommandPalette`, and `FilePicker`
- Each overlay widget independently builds its own bordered container, background mask, and content layout
- The `Dialog` data class plays no role in this pipeline

**dialog-demo.ts** (`/home/gem/workspace/flitter/packages/flitter-core/examples/dialog-demo.ts`):
- Despite being named "dialog-demo", this example also does NOT use the `Dialog` data class
- It builds its own Stack/Positioned/Container overlay manually

### 1.4 Import/Usage Audit

A codebase-wide search for `Dialog` across all `.ts` files yields exactly 4 files:

| File | Usage |
|------|-------|
| `flitter-core/src/widgets/dialog.ts` | Definition |
| `flitter-core/src/widgets/__tests__/dialog.test.ts` | Unit tests |
| `flitter-core/src/index.ts` | Re-export |
| `flitter-core/examples/dialog-demo.ts` | Name collision only -- does NOT import Dialog |

**Zero consumers** exist outside the definition and its test file. The class is exported but never imported by any application code, any other widget, or any rendering pipeline.

---

## 2. Root Cause

The gap has two contributing factors:

1. **Premature extraction**: The `Dialog` data class was implemented as a standalone requirement (MWDG-04) without the corresponding "dialog rendering bridge" that would consume it. In Amp, the shell layer reads `ab` instances to determine what overlay to show, but this consumption code was never built in flitter.

2. **Divergent overlay pattern**: When `flitter-amp` implemented actual dialog overlays (PermissionDialog, CommandPalette, FilePicker), each overlay widget was built as a self-contained `StatelessWidget` that constructs its own complete widget tree. This ad-hoc approach bypassed the need for a centralized `Dialog` data class intermediary.

---

## 3. Impact Assessment

| Dimension | Assessment |
|-----------|------------|
| **Dead code** | 129 lines of source + 192 lines of tests that serve no functional purpose |
| **Public API pollution** | 5 exports (`Dialog`, `DialogType`, `FooterStyle`, `DialogButton`, `DialogDimensions`) that suggest a capability that does not exist |
| **Developer confusion** | A developer seeing `Dialog` in the API might attempt to use it and discover it connects to nothing |
| **Amp fidelity** | The Amp `ab` class is faithfully reproduced in form but not in function -- the intended shell consumption is absent |
| **Bundle size** | Minimal -- the class is small, but it is dead weight |

---

## 4. Proposed Solution: Connect the Dialog Class via a `DialogOverlay` Widget

### 4.1 Rationale for Connecting (Not Removing)

Removing the class would be the simpler option, but connecting it is recommended for the following reasons:

1. **Amp fidelity mandate**: The project's CLAUDE.md explicitly states "Every implementation in this codebase MUST faithfully reproduce the architecture from the Amp CLI reverse-engineered source." The `ab` class exists in Amp and is consumed by the shell. Removing it moves further from fidelity.

2. **DRY principle**: Currently, `PermissionDialog`, `CommandPalette`, and `FilePicker` in `flitter-amp` each independently duplicate the same overlay construction pattern (Stack + Positioned + background mask + bordered container + centered content). A `DialogOverlay` widget parameterized by `Dialog` would eliminate this repetition.

3. **Extensibility**: Future dialogs (error alerts, confirmation prompts, info panels) would benefit from a standardized data-driven dialog system rather than requiring a new widget class for each dialog type.

### 4.2 Design: `DialogOverlay` StatelessWidget

Create a new widget in `flitter-core` that consumes a `Dialog` data class and produces the standard overlay widget tree:

```typescript
// File: flitter-core/src/widgets/dialog-overlay.ts

import { StatelessWidget, Widget, type BuildContext } from '../framework/widget';
import { Dialog } from './dialog';
import { Stack, Positioned } from './stack';
import { Column } from './flex';
import { Container } from './container';
import { Text } from './text';
import { FocusScope } from './focus-scope';
import { SizedBox } from './sized-box';
import { Divider } from './divider';
import { TextSpan } from '../core/text-span';
import { TextStyle } from '../core/text-style';
import { Color } from '../core/color';
import { BoxDecoration, Border, BorderSide } from '../layout/render-decorated';
import { EdgeInsets } from '../layout/edge-insets';
import { BoxConstraints } from '../core/box-constraints';

/**
 * Configuration for DialogOverlay appearance.
 * Allows the application shell to customize border color,
 * background mask opacity, max width, etc.
 */
export interface DialogOverlayStyle {
  readonly borderColor?: Color;
  readonly maskColor?: Color;
  readonly titleStyle?: TextStyle;
  readonly subtitleStyle?: TextStyle;
  readonly maxWidth?: number;
  readonly padding?: EdgeInsets;
}

/**
 * A widget that renders a Dialog data class as a full-screen modal overlay.
 *
 * Produces the standard Amp overlay pattern:
 *   Stack(fit: expand)
 *     Positioned(all: 0) -> Container(semi-transparent mask)
 *     FocusScope(autofocus) -> Column(center) -> Container(bordered) -> content
 *
 * The Dialog's body widget is rendered inside the bordered container,
 * along with the title, optional subtitle, and optional button footer.
 *
 * Amp ref: application shell consumption of ab data class
 */
export class DialogOverlay extends StatelessWidget {
  readonly dialog: Dialog;
  readonly style: DialogOverlayStyle;

  constructor(opts: {
    dialog: Dialog;
    style?: DialogOverlayStyle;
  }) {
    super();
    this.dialog = opts.dialog;
    this.style = opts.style ?? {};
  }

  build(_context: BuildContext): Widget {
    const { dialog, style } = this;

    const borderColor = style.borderColor ?? Color.cyan;
    const maskColor = style.maskColor ?? Color.rgba(0, 0, 0, 0.6);
    const maxWidth = style.maxWidth ?? 60;
    const padding = style.padding ?? EdgeInsets.symmetric({ horizontal: 2, vertical: 1 });
    const titleTextStyle = style.titleStyle ?? new TextStyle({ bold: true, foreground: borderColor });
    const subtitleTextStyle = style.subtitleStyle ?? new TextStyle({ dim: true });

    // Build content children: title, optional subtitle, optional body, optional footer
    const contentChildren: Widget[] = [];

    // Title
    contentChildren.push(new Text({
      text: new TextSpan({ text: dialog.title, style: titleTextStyle }),
    }));

    // Optional subtitle
    if (dialog.subtitle) {
      contentChildren.push(new Text({
        text: new TextSpan({ text: dialog.subtitle, style: subtitleTextStyle }),
      }));
    }

    // Spacer + divider before body
    if (dialog.body) {
      contentChildren.push(new SizedBox({ height: 1 }));
      contentChildren.push(dialog.body);
    }

    // Build the bordered container
    const side = new BorderSide({ color: borderColor, width: 1, style: 'rounded' as any });
    const borderedContainer = new Container({
      decoration: dialog.border
        ? new BoxDecoration({ border: Border.all(side) })
        : new BoxDecoration(),
      padding,
      constraints: new BoxConstraints({ maxWidth }),
      child: new Column({
        mainAxisSize: 'min',
        crossAxisAlignment: 'start',
        children: contentChildren,
      }),
    });

    // Assemble the overlay: mask + centered dialog
    return new Stack({
      fit: 'expand',
      children: [
        new Positioned({
          top: 0, left: 0, right: 0, bottom: 0,
          child: new Container({ color: maskColor }),
        }),
        new FocusScope({
          autofocus: true,
          child: new Column({
            mainAxisAlignment: 'center',
            crossAxisAlignment: 'center',
            children: [borderedContainer],
          }),
        }),
      ],
    });
  }
}
```

### 4.3 Refactor PermissionDialog to Use Dialog + DialogOverlay

The existing `PermissionDialog` in `flitter-amp` would be refactored to construct a `Dialog` instance and pass it to `DialogOverlay`:

```typescript
// flitter-amp/src/widgets/permission-dialog.ts (refactored)

import { StatelessWidget, Widget, type BuildContext } from 'flitter-core/src/framework/widget';
import { Dialog } from 'flitter-core/src/widgets/dialog';
import { DialogOverlay } from 'flitter-core/src/widgets/dialog-overlay';
import { SelectionList } from 'flitter-core/src/widgets/selection-list';
import type { SelectionItem } from 'flitter-core/src/widgets/selection-list';
import { Color } from 'flitter-core/src/core/color';
import { TextStyle } from 'flitter-core/src/core/text-style';
import { AmpThemeProvider } from '../themes';
import type { PermissionRequest } from '../acp/client';

export class PermissionDialog extends StatelessWidget {
  private readonly request: PermissionRequest;
  private readonly onSelect: (optionId: string) => void;
  private readonly onCancel: () => void;

  constructor(props: { request: PermissionRequest; onSelect: (optionId: string) => void; onCancel: () => void }) {
    super({});
    this.request = props.request;
    this.onSelect = props.onSelect;
    this.onCancel = props.onCancel;
  }

  build(context: BuildContext): Widget {
    const { toolCall, options } = this.request;
    const theme = AmpThemeProvider.maybeOf(context);
    const warningColor = theme?.base.warning ?? Color.brightYellow;

    const items: SelectionItem[] = options.map((opt) => ({
      label: opt.name,
      value: opt.optionId,
      description: opt.kind.replace(/_/g, ' '),
    }));

    const dialog = new Dialog({
      title: 'Permission Required',
      type: 'warning',
      subtitle: `${toolCall.title} (${toolCall.kind})`,
      body: new SelectionList({
        items,
        onSelect: this.onSelect,
        onCancel: this.onCancel,
        showDescription: true,
      }),
      border: true,
    });

    return new DialogOverlay({
      dialog,
      style: {
        borderColor: warningColor,
        titleStyle: new TextStyle({ foreground: warningColor, bold: true }),
        subtitleStyle: new TextStyle({
          foreground: theme?.base.foreground ?? Color.white,
        }),
      },
    });
  }
}
```

### 4.4 Export the New Widget

Add to `flitter-core/src/index.ts`:

```typescript
export { DialogOverlay } from './widgets/dialog-overlay';
export type { DialogOverlayStyle } from './widgets/dialog-overlay';
```

### 4.5 Update the dialog-demo Example

Refactor `/home/gem/workspace/flitter/packages/flitter-core/examples/dialog-demo.ts` to use `Dialog` + `DialogOverlay` for its popup, demonstrating the intended usage pattern.

---

## 5. Implementation Plan

### Step 1: Create `DialogOverlay` widget in flitter-core

- File: `flitter-core/src/widgets/dialog-overlay.ts`
- Consumes a `Dialog` data class instance
- Produces the standard Amp overlay pattern (Stack + mask + centered bordered container)
- Respects all `Dialog` fields: title, type, subtitle, body, border, dimensions
- Accepts a `DialogOverlayStyle` for theme-driven customization

### Step 2: Add tests for `DialogOverlay`

- File: `flitter-core/src/widgets/__tests__/dialog-overlay.test.ts`
- Test that the widget tree is correctly assembled from Dialog properties
- Test default styling, custom styling, with/without subtitle, with/without body
- Test that `dialog.border = false` omits border decoration
- Test that dimensions constraints are applied when specified

### Step 3: Export from flitter-core public API

- Add `DialogOverlay` and `DialogOverlayStyle` to `flitter-core/src/index.ts`

### Step 4: Refactor `PermissionDialog` in flitter-amp

- Replace the manually constructed overlay tree with `Dialog` + `DialogOverlay`
- Verify the visual output remains identical
- Keep the same `PermissionDialogProps` interface for backward compatibility

### Step 5: Update the dialog-demo example

- Use `Dialog` + `DialogOverlay` instead of manual Stack/Positioned construction
- This validates the public API and serves as documentation

### Step 6: Consider refactoring CommandPalette and FilePicker

- `CommandPalette` and `FilePicker` in `flitter-amp` follow the same overlay pattern
- They could optionally be refactored to use `DialogOverlay` as well
- This is lower priority since they have more specialized layout needs

---

## 6. Alternative: Remove the Dialog Class

If the decision is made to not invest in the connection layer, the simpler alternative is removal:

### Files to delete:
- `/home/gem/workspace/flitter/packages/flitter-core/src/widgets/dialog.ts` (129 lines)
- `/home/gem/workspace/flitter/packages/flitter-core/src/widgets/__tests__/dialog.test.ts` (192 lines)

### Files to edit:
- `/home/gem/workspace/flitter/packages/flitter-core/src/index.ts` -- remove lines 35-36 (Dialog exports)

### Risks of removal:
- **Amp fidelity regression**: The `ab` class exists in Amp and removing it moves further from the reference architecture
- **Future re-implementation cost**: If a dialog rendering bridge is needed later, the data class would need to be recreated
- **Requirement regression**: MWDG-04 would become un-checked

---

## 7. Recommendation

**Connect, do not remove.** The `Dialog` data class is architecturally correct per the Amp reference -- the gap is the missing bridge between data and rendering. Creating a `DialogOverlay` widget:

1. Closes the gap with approximately 100 lines of new code
2. Eliminates duplicated overlay construction patterns across `flitter-amp`
3. Restores Amp architectural fidelity (shell consuming `ab` data)
4. Provides a clean, composable API for future dialog types
5. Preserves the existing test investment in the `Dialog` class

The implementation is low-risk (the `DialogOverlay` is a pure `StatelessWidget` with no state management) and directly addresses the root cause: a missing bridge between the data class and the widget tree.

---

## 8. Files Referenced in This Analysis

| File | Role |
|------|------|
| `/home/gem/workspace/flitter/packages/flitter-core/src/widgets/dialog.ts` | The unused Dialog data class (129 lines) |
| `/home/gem/workspace/flitter/packages/flitter-core/src/widgets/__tests__/dialog.test.ts` | Dialog test suite (192 lines) |
| `/home/gem/workspace/flitter/packages/flitter-core/src/index.ts` | Public API exports (lines 35-36) |
| `/home/gem/workspace/flitter/packages/flitter-core/examples/dialog-demo.ts` | Example that does NOT use Dialog |
| `/home/gem/workspace/flitter/packages/flitter-amp/src/widgets/permission-dialog.ts` | Actual dialog overlay (does NOT use Dialog) |
| `/home/gem/workspace/flitter/packages/flitter-amp/src/app.ts` | App shell with overlay patterns (lines 274-350) |
| `/home/gem/workspace/flitter/packages/flitter-core/.reference/widgets-catalog.md` | Amp reference for `ab` class (lines 918-936) |
| `/home/gem/workspace/flitter/packages/flitter-core/.planning/REQUIREMENTS.md` | MWDG-04 requirement (line 72) |
| `/home/gem/workspace/flitter/packages/flitter-core/src/widgets/container-with-overlays.ts` | Related overlay widget (ContainerWithOverlays) |
| `/home/gem/workspace/flitter/packages/flitter-core/src/widgets/selection-list.ts` | SelectionList widget used inside dialogs |
