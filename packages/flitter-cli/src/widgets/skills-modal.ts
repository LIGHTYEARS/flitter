// SkillsModal — overlay widget for browsing and managing skills.
//
// StatefulWidget matching AMP's m9T (widget) and f9T (state) exactly:
//   - 03_skills_modal_m9T.js: widget props (skills, errors, warnings, callbacks)
//   - 03_skills_modal_state_f9T.js: state with scroll controllers, grouping, build logic
//
// Plan 30-01: List view (grouping, empty state, errors, warnings, footer, scroll)
// Plan 30-02: Detail panel (2/5:3/5 split, frontmatter, file list, invoke button)
//             Keyboard navigation (Escape/i/a/o), error+warning sections, "Create your own:"
//
// Width computation, title bar, grouping, empty state, errors, warnings,
// footer, scroll+scrollbar, detail panel, and keyboard all match AMP values exactly.
//
// AMP variable mapping:
//   R9.of(R).colorScheme -> theme.base
//   $T.of(R).app         -> theme.app
//   S9.of(R)             -> MediaQuery.of(context)

import {
  StatefulWidget,
  State,
  Widget,
  type BuildContext,
} from '../../../flitter-core/src/framework/widget';
import type { KeyEvent, KeyEventResult } from '../../../flitter-core/src/input/events';
import { Column, Row } from '../../../flitter-core/src/widgets/flex';
import { Expanded } from '../../../flitter-core/src/widgets/flexible';
import { Center } from '../../../flitter-core/src/widgets/center';
import { Container } from '../../../flitter-core/src/widgets/container';
import { Padding } from '../../../flitter-core/src/widgets/padding';
import { SizedBox } from '../../../flitter-core/src/widgets/sized-box';
import { Text } from '../../../flitter-core/src/widgets/text';
import { FocusScope } from '../../../flitter-core/src/widgets/focus-scope';
import { MouseRegion } from '../../../flitter-core/src/widgets/mouse-region';
import { SingleChildScrollView } from '../../../flitter-core/src/widgets/scroll-view';
import { ScrollController } from '../../../flitter-core/src/widgets/scroll-controller';
import { Scrollbar } from '../../../flitter-core/src/widgets/scrollbar';
import { TextSpan } from '../../../flitter-core/src/core/text-span';
import { TextStyle } from '../../../flitter-core/src/core/text-style';
import { BoxConstraints } from '../../../flitter-core/src/core/box-constraints';
import { EdgeInsets } from '../../../flitter-core/src/layout/edge-insets';
import { BoxDecoration, Border, BorderSide } from '../../../flitter-core/src/layout/render-decorated';
import { ConstrainedBox } from '../../../flitter-core/src/widgets/constrained-box';
import { MediaQuery } from '../../../flitter-core/src/widgets/media-query';
import { CliThemeProvider } from '../themes';
import type { CliBaseTheme, CliAppColors } from '../themes';
import type { SkillDefinition, SkillError, SkillWarning } from '../state/skill-types';
import { groupSkillsByPath, relativizePath } from '../state/skill-service';
import { SkillPreview, type SkillPreviewData } from './skill-preview';

// ---------------------------------------------------------------------------
// SkillsModal Props — matching AMP m9T constructor exactly
// ---------------------------------------------------------------------------

/** Props for SkillsModal widget, matching AMP m9T field-for-field. */
export interface SkillsModalProps {
  readonly skills: SkillDefinition[];
  readonly errors: SkillError[];
  readonly warnings: SkillWarning[];
  readonly onDismiss: () => void;
  readonly onAddSkill?: () => void;
  readonly onDocs?: () => void;
  readonly onInsertPrompt?: (prompt: string) => void;
  readonly onInvokeSkill?: (name: string) => void;
  readonly cwd: string;
}

// ---------------------------------------------------------------------------
// SkillsModal — StatefulWidget (AMP m9T)
// ---------------------------------------------------------------------------

/**
 * Skills modal overlay widget.
 *
 * Renders a bordered panel showing all loaded skills grouped by
 * Local/Global/Built-in, with errors, warnings, empty state,
 * and an "Escape to close" footer. Matches AMP's m9T widget class.
 */
export class SkillsModal extends StatefulWidget {
  readonly skills: SkillDefinition[];
  readonly errors: SkillError[];
  readonly warnings: SkillWarning[];
  readonly onDismiss: () => void;
  readonly onAddSkill?: () => void;
  readonly onDocs?: () => void;
  readonly onInsertPrompt?: (prompt: string) => void;
  readonly onInvokeSkill?: (name: string) => void;
  readonly cwd: string;

  constructor(props: SkillsModalProps) {
    super();
    this.skills = props.skills;
    this.errors = props.errors;
    this.warnings = props.warnings;
    this.onDismiss = props.onDismiss;
    this.onAddSkill = props.onAddSkill;
    this.onDocs = props.onDocs;
    this.onInsertPrompt = props.onInsertPrompt;
    this.onInvokeSkill = props.onInvokeSkill;
    this.cwd = props.cwd;
  }

  createState(): SkillsModalState {
    return new SkillsModalState();
  }
}

// ---------------------------------------------------------------------------
// SkillsModalState — State (AMP f9T)
// ---------------------------------------------------------------------------

/**
 * State for the SkillsModal widget.
 *
 * Manages scroll controllers, selection state, and the full build method
 * for the list view. Matches AMP's f9T state class field-for-field.
 */
export class SkillsModalState extends State<SkillsModal> {
  /** Scroll controller for the skill list area. followMode = false. */
  listScrollController = new ScrollController();

  /** Scroll controller for the detail panel. followMode = false. */
  detailScrollController = new ScrollController();

  /** Currently selected skill, or null. Drives detail panel visibility. */
  selectedSkill: SkillDefinition | null = null;

  /** Default viewport height for scroll info calculation. */
  _viewportHeight = 20;

  initState(): void {
    super.initState();
    this.listScrollController.disableFollowMode();
    this.detailScrollController.disableFollowMode();
  }

  dispose(): void {
    this.listScrollController.dispose();
    this.detailScrollController.dispose();
    super.dispose();
  }

  // -----------------------------------------------------------------------
  // Key handling — matching AMP f9T.handleKeyEvent
  // -----------------------------------------------------------------------

  /**
   * Handle key events for the skills modal.
   *
   * AMP f9T key bindings:
   *   Escape: clear selection if selected, else dismiss
   *   i: invoke selected skill (only with selection)
   *   a: add skill (only without selection — list view)
   *   o: open docs (only without selection — list view)
   */
  handleKeyEvent = (event: KeyEvent): KeyEventResult => {
    switch (event.key) {
      case 'Escape':
        if (this.selectedSkill) {
          this.setState(() => { this.selectedSkill = null; });
          return 'handled';
        }
        this.widget.onDismiss();
        return 'handled';

      case 'i':
        if (this.selectedSkill && this.widget.onInvokeSkill) {
          this.widget.onInvokeSkill(this.selectedSkill.name);
          this.widget.onDismiss();
          return 'handled';
        }
        return 'ignored';

      case 'a':
        if (!this.selectedSkill && this.widget.onAddSkill) {
          this.widget.onAddSkill();
          return 'handled';
        }
        return 'ignored';

      case 'o':
        if (!this.selectedSkill && this.widget.onDocs) {
          this.widget.onDocs();
          return 'handled';
        }
        return 'ignored';

      default:
        return 'ignored';
    }
  };

  // -----------------------------------------------------------------------
  // Selection — matching AMP f9T.selectSkill
  // -----------------------------------------------------------------------

  /** Select a skill and reset detail scroll position. */
  selectSkill = (skill: SkillDefinition): void => {
    this.setState(() => {
      this.selectedSkill = skill;
      this.detailScrollController.jumpTo(0);
    });
  };

  // -----------------------------------------------------------------------
  // Build — matching AMP f9T.build() for LIST VIEW ONLY
  // -----------------------------------------------------------------------

  build(context: BuildContext): Widget {
    // --- Read theme and screen data matching AMP's R9.of(R), $T.of(R), S9.of(R) ---
    const theme = CliThemeProvider.maybeOf(context);
    const base = theme?.base;
    const app = theme?.app;
    const mq = MediaQuery.maybeOf(context);

    // --- Define text styles matching AMP f9T variables r,h,t,i,c,o,C,g,l,n,y ---
    // r = primary bold
    const primaryBold = new TextStyle({
      foreground: base?.primary,
      bold: true,
    });
    // h = secondary bold
    const secondaryBold = new TextStyle({
      foreground: base?.secondary,
      bold: true,
    });
    // t = command
    const commandStyle = new TextStyle({
      foreground: app?.command,
    });
    // i = command bold
    const commandBold = new TextStyle({
      foreground: app?.command,
      bold: true,
    });
    // c = foreground
    const foregroundStyle = new TextStyle({
      foreground: base?.foreground,
    });
    // o = foreground dim
    const foregroundDim = new TextStyle({
      foreground: base?.foreground,
      dim: true,
    });
    // C = destructive bold
    const destructiveBold = new TextStyle({
      foreground: base?.destructive,
      bold: true,
    });
    // g = destructive
    const destructiveStyle = new TextStyle({
      foreground: base?.destructive,
    });
    // l = warning bold
    const warningBold = new TextStyle({
      foreground: base?.warning,
      bold: true,
    });
    // n = keybind
    const keybindStyle = new TextStyle({
      foreground: app?.keybind,
    });
    // y = foreground dim (same as o, used for footer)
    const dimStyle = foregroundDim;
    // v = secondary (for button text)
    const secondaryStyle = new TextStyle({
      foreground: base?.secondary,
    });
    // O = secondary dim (for parentheses in keybind buttons)
    const secondaryDimStyle = new TextStyle({
      foreground: base?.secondary,
      dim: true,
    });

    // --- Screen dimensions matching AMP: u=width, b=height, k=u-4, d=b-4 ---
    const screenWidth = mq?.size.width ?? 80;
    const screenHeight = mq?.size.height ?? 24;
    const available = screenWidth - 4;        // k = u - 4
    const maxHeight = screenHeight - 4;       // d = b - 4

    // --- Width computation matching AMP exactly ---
    const hasSelection = this.selectedSkill !== null;
    // S=hasSelection, x=totalWidth, I=listWidth
    const totalWidth = hasSelection
      ? Math.max(100, Math.min(150, available))
      : Math.max(60, Math.min(90, available));
    // I = listWidth: detail panel gets (totalWidth - listWidth) via ConstrainedBox
    const listWidth = hasSelection ? Math.floor(totalWidth * 2 / 5) : 0;

    // --- Split skills into builtin and nonBuiltin matching AMP ---
    const builtinSkills = this.widget.skills.filter(
      (s) => s.baseDir.startsWith('builtin://'),
    );
    const nonBuiltinSkills = this.widget.skills.filter(
      (s) => !s.baseDir.startsWith('builtin://'),
    );

    // j: show empty state when only builtin skills and no errors
    const onlyBuiltins = this.widget.skills.length > 0 &&
      nonBuiltinSkills.length === 0 &&
      this.widget.errors.length === 0;

    // --- Build list items array (s) ---
    const listItems: Widget[] = [];

    // m = total skill count for title
    const totalCount = nonBuiltinSkills.length + builtinSkills.length;
    // f = title string
    const titleText = nonBuiltinSkills.length > 0 ? `Skills (${totalCount})` : 'Skills';

    // --- Title bar (N) matching AMP exactly ---
    // Row: [SizedBox(w:2), Expanded(title), ownerManualBtn, "  ", addBtn, SizedBox(w:2)]
    const titleBar = this._buildTitleBar(
      titleText,
      primaryBold,
      secondaryStyle,
      secondaryDimStyle,
      keybindStyle,
      foregroundStyle,
    );

    // --- Empty state matching AMP condition ---
    if (
      (this.widget.skills.length === 0 && this.widget.errors.length === 0) ||
      onlyBuiltins
    ) {
      this._buildEmptyState(
        listItems,
        foregroundDim,
        secondaryBold,
        foregroundStyle,
      );
    }

    // --- Group rendering helper (L function in AMP) ---
    const renderGroup = (
      skills: SkillDefinition[],
      label: string,
      pathHint?: string | null,
    ): void => {
      if (skills.length === 0) return;

      // Group header: Padding(h:2) -> Text("Label pathHint")
      const headerChildren: TextSpan[] = [];
      if (pathHint) {
        headerChildren.push(new TextSpan({
          text: pathHint,
          style: foregroundDim,
        }));
      }
      listItems.push(new Padding({
        padding: EdgeInsets.symmetric({ horizontal: 2 }),
        child: new Text({
          text: new TextSpan({
            text: `${label} `,
            style: secondaryBold,
            children: headerChildren,
          }),
        }),
      }));

      // Each skill: Padding(h:6) -> Row [Expanded(flex:1, name), SizedBox(w:2), Expanded(flex:2, desc)]
      for (const skill of skills) {
        const nameStyle = this.selectedSkill?.name === skill.name ? commandBold : commandStyle;
        const nameWidget = this.widget.onInvokeSkill
          ? new MouseRegion({
              cursor: 'pointer',
              onClick: () => this.widget.onInvokeSkill!(skill.name),
              child: new Text({
                text: new TextSpan({ text: skill.name, style: nameStyle }),
                maxLines: 1,
                overflow: 'ellipsis',
              }),
            })
          : new Text({
              text: new TextSpan({ text: skill.name, style: nameStyle }),
              maxLines: 1,
              overflow: 'ellipsis',
            });

        // Description: strip leading/trailing whitespace, matching AMP's Aq0
        const descText = skill.description ? cleanDescription(skill.description) : '';
        const descWidget = new MouseRegion({
          cursor: 'pointer',
          onClick: () => this.selectSkill(skill),
          child: new Text({
            text: new TextSpan({ text: descText, style: foregroundStyle }),
            maxLines: 1,
            overflow: 'ellipsis',
          }),
        });

        listItems.push(new Padding({
          padding: EdgeInsets.symmetric({ horizontal: 6 }),
          child: new Row({
            crossAxisAlignment: 'start',
            children: [
              new Expanded({ flex: 1, child: nameWidget }),
              new SizedBox({ width: 2 }),
              new Expanded({ flex: 2, child: descWidget }),
            ],
          }),
        }));
      }

      listItems.push(new SizedBox({ height: 1 }));
    };

    // --- Render nonBuiltin groups first, then builtin ---
    if (nonBuiltinSkills.length > 0) {
      const groups = groupSkillsByPath(nonBuiltinSkills, this.widget.cwd);
      for (const group of groups) {
        renderGroup(group.skills, group.label, group.pathHint);
      }
    }
    if (builtinSkills.length > 0) {
      renderGroup(builtinSkills, 'Built-in');
    }

    // --- Errors section matching AMP ---
    if (this.widget.errors.length > 0) {
      if (this.widget.skills.length > 0) {
        listItems.push(new SizedBox({ height: 1 }));
      }
      listItems.push(new Padding({
        padding: EdgeInsets.symmetric({ horizontal: 2 }),
        child: new Text({
          text: new TextSpan({
            text: `Skipped skills with errors (${this.widget.errors.length}):`,
            style: destructiveBold,
          }),
        }),
      }));
      listItems.push(new SizedBox({ height: 1 }));

      for (const err of this.widget.errors) {
        const parts = err.path.split('/');
        const dirName = parts[parts.length - 2] || 'unknown';

        listItems.push(new Padding({
          padding: EdgeInsets.symmetric({ horizontal: 2 }),
          child: new Text({
            text: new TextSpan({ text: `\u26A0 ${dirName}`, style: warningBold }),
          }),
        }));
        listItems.push(new Padding({
          padding: EdgeInsets.only({ left: 4 }),
          child: new Text({
            text: new TextSpan({ text: err.error, style: destructiveStyle }),
          }),
        }));
        if (err.hint) {
          listItems.push(new Padding({
            padding: EdgeInsets.only({ left: 4 }),
            child: new Text({
              text: new TextSpan({
                text: err.hint.split('\n')[0],
                style: foregroundStyle,
              }),
            }),
          }));
        }
        const relPath = relativizePath(err.path, this.widget.cwd);
        listItems.push(new Padding({
          padding: EdgeInsets.only({ left: 4 }),
          child: new Text({
            text: new TextSpan({ text: relPath, style: foregroundDim }),
          }),
        }));
      }
      listItems.push(new SizedBox({ height: 1 }));
    }

    // --- Warnings section matching AMP ---
    if (this.widget.warnings.length > 0) {
      listItems.push(new Padding({
        padding: EdgeInsets.symmetric({ horizontal: 2 }),
        child: new Text({
          text: new TextSpan({
            text: `Skill warnings (${this.widget.warnings.length}):`,
            style: warningBold,
          }),
        }),
      }));
      listItems.push(new SizedBox({ height: 1 }));

      for (const warn of this.widget.warnings) {
        const relPath = relativizePath(warn.path, this.widget.cwd);
        listItems.push(new Padding({
          padding: EdgeInsets.symmetric({ horizontal: 2 }),
          child: new Text({
            text: new TextSpan({ text: `\u26A0 ${relPath}`, style: commandStyle }),
          }),
        }));
        listItems.push(new Padding({
          padding: EdgeInsets.only({ left: 4 }),
          child: new Text({
            text: new TextSpan({ text: warn.error, style: foregroundStyle }),
          }),
        }));
      }
      listItems.push(new SizedBox({ height: 1 }));
    }

    // --- "Create your own" section shown when nonBuiltin skills exist ---
    if (nonBuiltinSkills.length > 0) {
      listItems.push(new Padding({
        padding: EdgeInsets.symmetric({ horizontal: 2 }),
        child: new Text({
          text: new TextSpan({ text: 'Create your own:', style: secondaryBold }),
        }),
      }));

      const examplePrompts = [
        'Create a skill for searching our production logs',
        'Create a user skill for my preferred commit message style',
      ];
      for (const prompt of examplePrompts) {
        const promptText = new Text({
          text: new TextSpan({ text: `  "${prompt}"`, style: foregroundStyle }),
        });
        listItems.push(new Padding({
          padding: EdgeInsets.symmetric({ horizontal: 2 }),
          child: this.widget.onInsertPrompt
            ? new MouseRegion({
                cursor: 'pointer',
                onClick: () => this.widget.onInsertPrompt!(prompt),
                child: promptText,
              })
            : promptText,
        }));
      }
    }

    // --- Build list column (V in AMP) ---
    const listColumn = new Column({
      crossAxisAlignment: 'stretch',
      mainAxisSize: 'min',
      children: listItems,
    });

    // --- Scroll area (W) matching AMP: Expanded -> Padding -> Row [Expanded(ScrollView), Scrollbar] ---
    const scrollArea = new Expanded({
      child: new Padding({
        padding: hasSelection ? EdgeInsets.only({ right: 1 }) : EdgeInsets.all(0),
        child: new Row({
          crossAxisAlignment: 'stretch',
          children: [
            new Expanded({
              child: new SingleChildScrollView({
                controller: this.listScrollController,
                child: listColumn,
              }),
            }),
            new Scrollbar({
              controller: this.listScrollController,
              thumbColor: app?.scrollbarThumb,
              trackColor: app?.scrollbarTrack,
            }),
          ],
        }),
      }),
    });

    // --- Footer (eR) matching AMP: Center -> Text("Escape to close") ---
    const footer = new Center({
      child: new Text({
        text: new TextSpan({
          text: '',
          style: dimStyle,
          children: [
            new TextSpan({ text: 'Escape', style: keybindStyle }),
            new TextSpan({ text: ' to close', style: dimStyle }),
          ],
        }),
      }),
    });

    // --- List area wrapper (tR) matching AMP ---
    // tR = Expanded(Container(padding: symmetric(1,0), Row(stretch, [W])))
    const listArea = new Expanded({
      child: new Container({
        padding: EdgeInsets.symmetric({ vertical: 1, horizontal: 0 }),
        child: new Row({
          crossAxisAlignment: 'stretch',
          children: [scrollArea],
        }),
      }),
    });

    // --- Detail panel (Q) matching AMP f9T exactly ---
    let detailPanel: Widget | null = null;
    if (this.selectedSkill) {
      detailPanel = this._buildDetailPanel(
        this.selectedSkill,
        listWidth,
        primaryBold,
        secondaryBold,
        secondaryStyle,
        secondaryDimStyle,
        commandStyle,
        foregroundStyle,
        foregroundDim,
        keybindStyle,
        base,
        app,
      );
    }

    // --- Assemble main column (aR) ---
    // Expanded(Column(stretch, [titleBar, SizedBox(1), listArea, SizedBox(1), footer]))
    const mainContent: Widget[] = [
      new Expanded({
        child: new Column({
          crossAxisAlignment: 'stretch',
          children: [
            titleBar,
            new SizedBox({ height: 1 }),
            listArea,
            new SizedBox({ height: 1 }),
            footer,
          ],
        }),
      }),
    ];
    // Append detail panel when a skill is selected
    if (detailPanel) {
      mainContent.push(detailPanel);
    }

    const contentRow = new Row({
      crossAxisAlignment: 'stretch',
      children: mainContent,
    });

    // --- Outer wrapper matching AMP exactly ---
    // FocusScope(autofocus, onKey) -> Center -> Container(constraints, decoration, padding) -> contentRow
    return new FocusScope({
      autofocus: true,
      onKey: this.handleKeyEvent,
      child: new Center({
        child: new Container({
          constraints: new BoxConstraints({
            minWidth: totalWidth,
            maxWidth: totalWidth,
            minHeight: 0,
            maxHeight: maxHeight,
          }),
          decoration: new BoxDecoration({
            color: base?.background,
            border: Border.all(
              new BorderSide({ color: base?.primary, width: 1, style: 'rounded' }),
            ),
          }),
          padding: EdgeInsets.all(1),
          child: contentRow,
        }),
      }),
    });
  }

  // -----------------------------------------------------------------------
  // Title bar builder — matching AMP N variable
  // -----------------------------------------------------------------------

  /**
   * Build the title bar row matching AMP's N variable exactly:
   *   Row: [SizedBox(w:2), Expanded(Skills (N)), ownerManualBtn, "  ", addBtn, SizedBox(w:2)]
   *
   * Button text uses parenthesized keybind style: "(o)wner's manual", "(a)dd"
   */
  private _buildTitleBar(
    titleText: string,
    primaryBold: TextStyle,
    secondaryStyle: TextStyle,
    secondaryDimStyle: TextStyle,
    keybindStyle: TextStyle,
    foregroundStyle: TextStyle,
  ): Widget {
    // (o)wner's manual button
    const ownerManualText = new Text({
      text: new TextSpan({
        text: '',
        style: secondaryStyle,
        children: [
          new TextSpan({ text: '(', style: secondaryDimStyle }),
          new TextSpan({ text: 'o', style: keybindStyle }),
          new TextSpan({ text: ')', style: secondaryDimStyle }),
          new TextSpan({ text: "wner's manual", style: secondaryStyle }),
        ],
      }),
    });
    const ownerManualBtn = this.widget.onDocs
      ? new MouseRegion({
          cursor: 'pointer',
          onClick: () => this.widget.onDocs!(),
          child: ownerManualText,
        })
      : ownerManualText;

    // (a)dd button
    const addText = new Text({
      text: new TextSpan({
        text: '',
        style: secondaryStyle,
        children: [
          new TextSpan({ text: '(', style: secondaryDimStyle }),
          new TextSpan({ text: 'a', style: keybindStyle }),
          new TextSpan({ text: ')', style: secondaryDimStyle }),
          new TextSpan({ text: 'dd', style: secondaryStyle }),
        ],
      }),
    });
    const addBtn = this.widget.onAddSkill
      ? new MouseRegion({
          cursor: 'pointer',
          onClick: () => this.widget.onAddSkill!(),
          child: addText,
        })
      : addText;

    return new Row({
      children: [
        new SizedBox({ width: 2 }),
        new Expanded({
          child: new Text({
            text: new TextSpan({ text: titleText, style: primaryBold }),
          }),
        }),
        ownerManualBtn,
        new Text({
          text: new TextSpan({ text: '  ', style: foregroundStyle }),
        }),
        addBtn,
        new SizedBox({ width: 2 }),
      ],
    });
  }

  // -----------------------------------------------------------------------
  // Empty state builder — matching AMP's empty state block
  // -----------------------------------------------------------------------

  /**
   * Build empty state content matching AMP exactly:
   *   - "Skills give the agent specialized knowledge, teach it how to use tools," (dim)
   *   - "or define MCP servers to load on demand." (dim)
   *   - SizedBox(h:1)
   *   - "Create your own:" (secondary bold)
   *   - Two example prompts (quoted, clickable if onInsertPrompt)
   *   - SizedBox(h:1)
   */
  private _buildEmptyState(
    items: Widget[],
    dimStyle: TextStyle,
    secondaryBold: TextStyle,
    foregroundStyle: TextStyle,
  ): void {
    items.push(new Padding({
      padding: EdgeInsets.symmetric({ horizontal: 2 }),
      child: new Text({
        text: new TextSpan({
          text: 'Skills give the agent specialized knowledge, teach it how to use tools,',
          style: dimStyle,
        }),
      }),
    }));
    items.push(new Padding({
      padding: EdgeInsets.symmetric({ horizontal: 2 }),
      child: new Text({
        text: new TextSpan({
          text: 'or define MCP servers to load on demand.',
          style: dimStyle,
        }),
      }),
    }));
    items.push(new SizedBox({ height: 1 }));
    items.push(new Padding({
      padding: EdgeInsets.symmetric({ horizontal: 2 }),
      child: new Text({
        text: new TextSpan({ text: 'Create your own:', style: secondaryBold }),
      }),
    }));

    const examplePrompts = [
      'Create a skill for searching our production logs',
      'Create a user skill for my preferred commit message style',
    ];
    for (const prompt of examplePrompts) {
      const promptText = new Text({
        text: new TextSpan({ text: `  "${prompt}"`, style: foregroundStyle }),
      });
      items.push(new Padding({
        padding: EdgeInsets.symmetric({ horizontal: 2 }),
        child: this.widget.onInsertPrompt
          ? new MouseRegion({
              cursor: 'pointer',
              onClick: () => this.widget.onInsertPrompt!(prompt),
              child: promptText,
            })
          : promptText,
      }));
    }
    items.push(new SizedBox({ height: 1 }));
  }

  // -----------------------------------------------------------------------
  // Detail panel builder — matching AMP f9T's Q variable
  // -----------------------------------------------------------------------

  /**
   * Build the detail panel shown when a skill is selected.
   *
   * Matches AMP f9T's Q variable exactly:
   *   - ConstrainedBox(minWidth: I, maxWidth: I)
   *   - BoxDecoration: left border only (Border(left: BorderSide(border, 1)))
   *   - Padding(left: 2)
   *   - Column [header, SizedBox(1), Expanded(scrollable detail)]
   *
   * Detail content:
   *   - SKILL.md label (clickable for non-builtin, plain dim for builtin)
   *   - SizedBox(h:1)
   *   - frontmatter+content text
   *   - horizontal rule, "Files:" list (non-builtin only)
   *
   * @param skill - The selected skill definition
   * @param listWidth - Width of the detail panel (I = floor(totalWidth * 2/5))
   */
  private _buildDetailPanel(
    skill: SkillDefinition,
    listWidth: number,
    _primaryBold: TextStyle,
    _secondaryBold: TextStyle,
    secondaryStyle: TextStyle,
    secondaryDimStyle: TextStyle,
    _commandStyle: TextStyle,
    foregroundStyle: TextStyle,
    foregroundDim: TextStyle,
    keybindStyle: TextStyle,
    base: CliBaseTheme | undefined,
    app: CliAppColors | undefined,
  ): Widget {
    const isBuiltin = skill.baseDir.startsWith('builtin://');

    // gR = yq0(RR.baseDir) — extract displayable path from baseDir
    const displayPath = extractDisplayPath(skill.baseDir);

    // --- (i)nvoke button (U) matching AMP exactly ---
    // "(i)" in keybind color, "nvoke" in secondary color
    const invokeButton: Widget | null = this.widget.onInvokeSkill
      ? new MouseRegion({
          cursor: 'pointer',
          onClick: () => this.widget.onInvokeSkill!(skill.name),
          child: new Text({
            text: new TextSpan({
              text: '',
              style: secondaryStyle,
              children: [
                new TextSpan({ text: '(', style: secondaryDimStyle }),
                new TextSpan({ text: 'i', style: keybindStyle }),
                new TextSpan({ text: ')', style: secondaryDimStyle }),
                new TextSpan({ text: 'nvoke', style: secondaryStyle }),
              ],
            }),
          }),
        })
      : null;

    // --- Detail header (K) matching AMP ---
    // Row: [Expanded(path text, dim, maxLines:1, ellipsis), SizedBox(w:1) if button, button]
    const pathText = new Text({
      text: new TextSpan({ text: displayPath, style: foregroundDim }),
      maxLines: 1,
      overflow: 'ellipsis',
    });
    const headerRow = new Row({
      children: [
        new Expanded({ child: pathText }),
        ...(invokeButton ? [new SizedBox({ width: 1 }), invokeButton] : []),
      ],
    });

    // --- Frontmatter lines (P) matching AMP exactly ---
    const frontmatterLines: string[] = [];
    const D = skill.frontmatter;
    if (D.name) frontmatterLines.push(`name: ${D.name}`);
    if (D.description) frontmatterLines.push(`description: ${D.description}`);
    if (D.license) frontmatterLines.push(`license: ${D.license}`);
    if (D.compatibility) frontmatterLines.push(`compatibility: ${D.compatibility}`);
    if (D['argument-hint']) frontmatterLines.push(`argument-hint: ${D['argument-hint']}`);
    if (D.model) frontmatterLines.push(`model: ${D.model}`);
    if (D['allowed-tools']?.length) frontmatterLines.push(`allowed-tools: [${D['allowed-tools'].join(', ')}]`);
    if (D['builtin-tools']?.length) frontmatterLines.push(`builtin-tools: [${D['builtin-tools'].join(', ')}]`);
    if (D['disable-model-invocation']) frontmatterLines.push('disable-model-invocation: true');
    if (D.mode) frontmatterLines.push('mode: true');
    if (D.isolatedContext) frontmatterLines.push('isolatedContext: true');
    if (D.metadata && Object.keys(D.metadata).length > 0) {
      frontmatterLines.push('metadata:');
      for (const [key, value] of Object.entries(D.metadata)) {
        frontmatterLines.push(`  ${key}: ${value}`);
      }
    }

    // z = combined frontmatter + content string, matching AMP
    const contentBody = frontmatterLines.length > 0
      ? `---\n${frontmatterLines.join('\n')}\n---\n\n${skill.content || ''}`
      : skill.content || '';

    // --- File list (J) matching AMP — only for non-builtin skills ---
    const fileListWidgets: Widget[] = [];
    if (!isBuiltin) {
      const basePath = skill.baseDir.startsWith('file://')
        ? skill.baseDir.slice(7) : skill.baseDir;
      const otherFiles = (skill.files || []).filter(
        (f: string) => !f.toLowerCase().endsWith('skill.md'),
      );

      fileListWidgets.push(new SizedBox({ height: 1 }));
      fileListWidgets.push(new Text({
        text: new TextSpan({
          text: '\u2500'.repeat(Math.max(0, listWidth - 4)),
          style: foregroundDim,
        }),
      }));
      fileListWidgets.push(new SizedBox({ height: 1 }));
      fileListWidgets.push(new Text({
        text: new TextSpan({ text: 'Files:', style: foregroundDim }),
      }));

      // "  SKILL.md" entry (clickable, primary color)
      fileListWidgets.push(new MouseRegion({
        cursor: 'pointer',
        onClick: () => { /* je(R, `${skill.baseDir}/SKILL.md`) — open in editor */ },
        child: new Text({
          text: new TextSpan({
            text: '  SKILL.md',
            style: new TextStyle({ foreground: base?.primary }),
          }),
        }),
      }));

      // Each additional file (relative path, clickable, primary color)
      for (const file of otherFiles) {
        const relFile = computeRelativeFilePath(basePath, file);
        fileListWidgets.push(new MouseRegion({
          cursor: 'pointer',
          onClick: () => { /* je(R, fileURI) — open in editor */ },
          child: new Text({
            text: new TextSpan({
              text: `  ${relFile}`,
              style: new TextStyle({ foreground: base?.primary }),
            }),
          }),
        }));
      }
    }

    // --- SKILL.md label (yR) matching AMP ---
    // builtin: plain text dim; non-builtin: clickable primary
    const skillMdLabel: Widget = isBuiltin
      ? new Text({
          text: new TextSpan({ text: 'SKILL.md', style: foregroundDim }),
        })
      : new MouseRegion({
          cursor: 'pointer',
          onClick: () => { /* je(R, `${skill.baseDir}/SKILL.md`) — open in editor */ },
          child: new Text({
            text: new TextSpan({
              text: 'SKILL.md',
              style: new TextStyle({ foreground: base?.primary }),
            }),
          }),
        });

    // --- SkillPreview summary widget (S4-10) ---
    // Renders a bordered preview with name/author/description/content summary
    // at the top of the detail panel when a skill is selected.
    const previewData: SkillPreviewData = {
      name: skill.name,
      description: skill.description ? cleanDescription(skill.description) : '',
      content: skill.content || '',
      author: skill.frontmatter?.metadata?.['author'],
    };
    const skillPreviewWidget = new SkillPreview({ skill: previewData });

    // --- Detail content column (uR) matching AMP ---
    const detailColumnChildren: Widget[] = [
      skillPreviewWidget,
      new SizedBox({ height: 1 }),
      skillMdLabel,
      new SizedBox({ height: 1 }),
    ];
    if (contentBody) {
      detailColumnChildren.push(new Text({
        text: new TextSpan({ text: contentBody, style: foregroundStyle }),
      }));
    }
    detailColumnChildren.push(...fileListWidgets);

    const detailColumn = new Column({
      crossAxisAlignment: 'stretch',
      mainAxisSize: 'min',
      children: detailColumnChildren,
    });

    // --- Detail scroll area matching AMP ---
    // Row [Expanded(SingleChildScrollView(detailScrollController, detailColumn)), Scrollbar]
    const detailScrollArea = new Expanded({
      child: new Row({
        crossAxisAlignment: 'stretch',
        children: [
          new Expanded({
            child: new SingleChildScrollView({
              controller: this.detailScrollController,
              child: detailColumn,
            }),
          }),
          new Scrollbar({
            controller: this.detailScrollController,
            thumbColor: app?.scrollbarThumb,
            trackColor: app?.scrollbarTrack,
            getScrollInfo: () => {
              const maxExtent = this.detailScrollController.maxScrollExtent;
              const offset = this.detailScrollController.offset;
              return {
                totalContentHeight: Math.max(maxExtent + 20, 0),
                viewportHeight: 20,
                scrollOffset: Math.max(offset, 0),
              };
            },
          }),
        ],
      }),
    });

    // --- Detail container (Q) matching AMP ---
    // ConstrainedBox(minWidth: I, maxWidth: I)
    // BoxDecoration: left border only (Border(left: BorderSide(border, 1)))
    // Padding(left: 2)
    // Column [header, SizedBox(1), Expanded(scrollableDetail)]
    return new ConstrainedBox({
      constraints: new BoxConstraints({ minWidth: listWidth, maxWidth: listWidth }),
      child: new Container({
        decoration: new BoxDecoration({
          border: new Border({
            left: new BorderSide({ color: base?.border, width: 1 }),
          }),
        }),
        padding: EdgeInsets.only({ left: 2 }),
        child: new Column({
          crossAxisAlignment: 'stretch',
          children: [
            headerRow,
            new SizedBox({ height: 1 }),
            detailScrollArea,
          ],
        }),
      }),
    });
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Clean a skill description for list display.
 *
 * Matches AMP's Aq0 function: strips leading/trailing whitespace and
 * normalizes internal whitespace to single spaces.
 */
function cleanDescription(desc: string): string {
  return desc.replace(/\s+/g, ' ').trim();
}

/**
 * Extract a displayable path from a skill's baseDir.
 *
 * Matches AMP's yq0 function:
 *   - "builtin://name" -> "builtin://name"
 *   - "file:///path/to/skill" -> strips file:// prefix and returns path
 *   - Other -> returns as-is
 */
function extractDisplayPath(baseDir: string): string {
  if (baseDir.startsWith('file://')) {
    return baseDir.slice(7);
  }
  return baseDir;
}

/**
 * Compute a relative file path from a base directory to a file.
 *
 * Matches AMP's HhR function: if the file is an absolute path,
 * compute relative from base; otherwise return as-is.
 */
function computeRelativeFilePath(basePath: string, filePath: string): string {
  if (filePath.startsWith('/') && basePath) {
    // Use node:path relative, but import is not available here — inline logic
    // Strip common prefix to make relative
    const base = basePath.endsWith('/') ? basePath : basePath + '/';
    if (filePath.startsWith(base)) {
      return filePath.slice(base.length);
    }
  }
  return filePath;
}
