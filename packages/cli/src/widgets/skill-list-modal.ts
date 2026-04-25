/**
 * SkillListModal — two-pane scrollable modal for browsing and invoking skills.
 *
 * Left pane lists skills grouped by scope (local → global → builtin),
 * right pane shows details of the selected skill (frontmatter + content).
 *
 * 逆向: H8R (StatefulWidget) in misc_utils.js:9889
 * 逆向: W8R (State)          in actions_intents.js:5270
 * 逆向: Az0 (groupSkillsByScope) in chunk-005.js:3591
 * 逆向: lz0 (scope resolver) in chunk-005.js:3552
 * 逆向: pz0 (collapse whitespace) in chunk-005.js:3620
 * 逆向: _z0 (format baseDir for display) in chunk-005.js:3623
 * 逆向: JgT (relative path display) in chunk-005.js:3543
 *
 * @module
 */

import type { BuildContext, Element, KeyEventResult, Widget } from "@flitter/tui";
import {
  Border,
  BorderSide,
  BoxConstraints,
  BoxDecoration,
  Center,
  Color,
  Column,
  Container,
  EdgeInsets,
  Expanded,
  Focus,
  GestureDetector,
  MediaQuery,
  Padding,
  RichText,
  Row,
  SizedBox,
  State,
  StatefulWidget,
  TextSpan,
  TextStyle,
} from "@flitter/tui";

import { AppThemeController } from "./app-theme-controller.js";

// ════════════════════════════════════════════════════
//  Interfaces
// ════════════════════════════════════════════════════

/** Data for a single loaded skill. */
export interface SkillData {
  name: string;
  description: string;
  content: string;
  baseDir: string;
  scope: "local" | "global" | "builtin";
  frontmatter?: Record<string, unknown>;
  files?: string[];
}

/** A skill that failed to parse. */
export interface SkillError {
  name: string;
  error: string;
  path: string;
}

/** A skill with a non-fatal warning. */
export interface SkillWarning {
  name: string;
  warning: string;
  path: string;
}

/** Props for the skill list modal. */
export interface SkillListModalConfig {
  /** All available skills */
  skills: SkillData[];
  /** Skills that had parse errors */
  skillErrors?: SkillError[];
  /** Skills with warnings */
  skillWarnings?: SkillWarning[];
  /** Current working directory (for relative path display) */
  cwd?: string;
  /** Called when a skill is invoked */
  onInvokeSkill: (skillName: string) => void;
  /** Called when dismissed */
  onDismiss: () => void;
}

/** A group of skills sharing the same scope and path context. */
export interface SkillGroup {
  scope: "local" | "global" | "builtin";
  label: string;
  pathHint?: string;
  skills: SkillData[];
}

// ════════════════════════════════════════════════════
//  Helper: collapse whitespace
// ════════════════════════════════════════════════════

/**
 * Collapse all whitespace runs into single spaces.
 * 逆向: pz0 in chunk-005.js:3620
 */
function collapseWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

// ════════════════════════════════════════════════════
//  Helper: format baseDir for display
// ════════════════════════════════════════════════════

/**
 * Format a baseDir for the detail pane header.
 * 逆向: _z0 in chunk-005.js:3623
 *   - "builtin://" → "(built-in skill)"
 *   - "file://..." → relative path
 *   - else → raw string
 */
function formatBaseDir(baseDir: string, cwd?: string): string {
  if (baseDir.startsWith("builtin://")) return "(built-in skill)";
  if (!baseDir.startsWith("file://")) return baseDir;
  try {
    const absPath = baseDir.replace(/^file:\/\//, "");
    return makeRelative(absPath, cwd);
  } catch {
    return baseDir;
  }
}

/**
 * Make an absolute path relative to cwd, or return as-is.
 * 逆向: bhT (relative path utility) used by JgT and _z0
 */
function makeRelative(absPath: string, cwd?: string): string {
  if (!cwd) return absPath;
  const normalized = absPath.endsWith("/") ? absPath : absPath + "/";
  const cwdNorm = cwd.endsWith("/") ? cwd : cwd + "/";
  if (normalized.startsWith(cwdNorm)) {
    return absPath.slice(cwdNorm.length) || ".";
  }
  return absPath;
}

/**
 * Format path for error/warning display.
 * 逆向: JgT in chunk-005.js:3543
 */
function formatPathForDisplay(path: string, cwd?: string): string {
  if (path.startsWith("builtin://")) return path.replace("builtin://", "(builtin) ");
  if (!path.startsWith("file://")) return path;
  try {
    const absPath = path.replace(/^file:\/\//, "");
    return makeRelative(absPath, cwd);
  } catch {
    return path;
  }
}

// ════════════════════════════════════════════════════
//  groupSkillsByScope
// ════════════════════════════════════════════════════

/**
 * Group skills by scope and create display sections.
 * Sorts: local → global → builtin, then alphabetically by pathHint.
 *
 * 逆向: Az0 in chunk-005.js:3591
 */
export function groupSkillsByScope(skills: SkillData[], cwd?: string): SkillGroup[] {
  const groups = new Map<string, SkillGroup>();

  for (const skill of skills) {
    const label =
      skill.scope === "local" ? "Local" : skill.scope === "global" ? "Global" : "Built-in";
    // 逆向: Az0 uses `${scope}:${pathHint ?? ""}` as the grouping key
    const pathHint = formatBaseDir(skill.baseDir, cwd);
    const key = `${skill.scope}:${pathHint}`;

    const existing = groups.get(key);
    if (existing) {
      existing.skills.push(skill);
      continue;
    }
    groups.set(key, {
      scope: skill.scope,
      label,
      pathHint: skill.scope !== "builtin" ? pathHint : undefined,
      skills: [skill],
    });
  }

  // 逆向: Az0 sort order — local:0, global:1, builtin:2; then pathHint alphabetically
  const SCOPE_ORDER: Record<string, number> = { local: 0, global: 1, builtin: 2 };
  return [...groups.values()].sort((a, b) => {
    const diff = (SCOPE_ORDER[a.scope] ?? 2) - (SCOPE_ORDER[b.scope] ?? 2);
    if (diff !== 0) return diff;
    return (a.pathHint ?? "").localeCompare(b.pathHint ?? "");
  });
}

// ════════════════════════════════════════════════════
//  Constants
// ════════════════════════════════════════════════════

/** Default viewport dimensions when MediaQuery is unavailable. */
const DEFAULT_WIDTH = 80;
const DEFAULT_HEIGHT = 24;

/** Lines to scroll per j/k press in the detail pane. */
const DETAIL_SCROLL_STEP = 3;

// ════════════════════════════════════════════════════
//  SkillListModalWidget (StatefulWidget)
// ════════════════════════════════════════════════════

/**
 * Skill list modal widget.
 *
 * Two-pane scrollable modal: left pane lists skills grouped by scope,
 * right pane shows details of the selected skill.
 *
 * 逆向: H8R extends NR (StatefulWidget) in misc_utils.js:9889
 */
export class SkillListModalWidget extends StatefulWidget {
  readonly config: SkillListModalConfig;

  constructor(config: SkillListModalConfig) {
    super();
    this.config = config;
  }

  createState(): SkillListModalState {
    return new SkillListModalState();
  }
}

// ════════════════════════════════════════════════════
//  SkillListModalState
// ════════════════════════════════════════════════════

/**
 * State for SkillListModalWidget.
 *
 * 逆向: W8R extends wR (State) in actions_intents.js:5270
 *   - selectedSkill: null | SkillData
 *   - listScrollController / detailScrollController
 *   - handleKeyEvent: Escape, i, a, o
 *   - selectSkill(T): sets selectedSkill and resets detail scroll
 *   - build: header + two-pane body + footer
 */
export class SkillListModalState extends State<SkillListModalWidget> {
  /** Currently selected skill for detail view. 逆向: W8R.selectedSkill */
  private _selectedSkill: SkillData | null = null;

  /** Scroll offset for the detail pane (manual). */
  private _detailScrollOffset = 0;

  /** Cached viewport height for scroll math. 逆向: W8R._viewportHeight */
  private _viewportHeight = 20;

  // ── Accessors (for testing) ─────────────────────────

  get selectedSkill(): SkillData | null {
    return this._selectedSkill;
  }

  get detailScrollOffset(): number {
    return this._detailScrollOffset;
  }

  // ── Key handler ─────────────────────────────────────

  /**
   * Key event handler.
   *
   * 逆向: W8R.handleKeyEvent (actions_intents.js:5291-5309)
   *   Escape (detail open) → deselect
   *   Escape (no detail)   → dismiss
   *   i (skill selected)   → invoke skill + dismiss
   *   j/Down               → scroll detail down (when detail open)
   *   k/Up                 → scroll detail up (when detail open)
   */
  private _handleKey = (event: { key: string }): KeyEventResult => {
    switch (event.key) {
      case "Escape":
        if (this._selectedSkill) {
          this.setState(() => {
            this._selectedSkill = null;
          });
          return "handled";
        }
        this.widget.config.onDismiss();
        return "handled";

      case "i":
      case "Enter":
        if (this._selectedSkill) {
          this.widget.config.onInvokeSkill(this._selectedSkill.name);
          this.widget.config.onDismiss();
          return "handled";
        }
        return "ignored";

      case "j":
      case "ArrowDown":
        if (this._selectedSkill) {
          this._scrollDetail(DETAIL_SCROLL_STEP);
          return "handled";
        }
        return "ignored";

      case "k":
      case "ArrowUp":
        if (this._selectedSkill) {
          this._scrollDetail(-DETAIL_SCROLL_STEP);
          return "handled";
        }
        return "ignored";

      case "o":
        // 逆向: W8R — o opens docs URL when no skill selected
        // In flitter we just dismiss since we can't open URLs from a widget
        if (!this._selectedSkill) {
          this.widget.config.onDismiss();
          return "handled";
        }
        return "ignored";

      default:
        return "ignored";
    }
  };

  /**
   * Select a skill and open the detail pane.
   * 逆向: W8R.selectSkill (actions_intents.js:5311-5315)
   */
  private _selectSkill(skill: SkillData): void {
    this.setState(() => {
      this._selectedSkill = skill;
      this._detailScrollOffset = 0;
    });
  }

  /**
   * Scroll the detail pane by delta lines.
   */
  private _scrollDetail(delta: number): void {
    // Estimate content height from the selected skill's content
    const contentLines = this._selectedSkill
      ? (this._selectedSkill.content || "").split("\n").length + 10
      : 0;
    const maxScroll = Math.max(0, contentLines - this._viewportHeight);
    const next = Math.max(0, Math.min(maxScroll, this._detailScrollOffset + delta));
    if (next !== this._detailScrollOffset) {
      this.setState(() => {
        this._detailScrollOffset = next;
      });
    }
  }

  // ── Build ───────────────────────────────────────────

  /**
   * Build the skill list modal widget tree.
   *
   * 逆向: W8R.build (actions_intents.js:5316-5836)
   *
   * Structure:
   *   Center > Container(border, constraints) > Focus(onKey) >
   *     Padding(1) > Row [
   *       Expanded(left pane: header + skill list + footer),
   *       Container(right pane: detail, if selected)
   *     ]
   */
  build(context: BuildContext): Widget {
    const { skills, skillErrors = [], skillWarnings = [], cwd } = this.widget.config;

    // ── Resolve terminal dimensions via MediaQuery ──
    // 逆向: W8R.build — e = I9.of(T); m = e.size.width; b = e.size.height
    let termWidth = DEFAULT_WIDTH;
    let termHeight = DEFAULT_HEIGHT;
    try {
      const size = MediaQuery.sizeOf(context as unknown as Element);
      termWidth = size.width;
      termHeight = size.height;
    } catch {
      // MediaQuery not in tree (unit tests) — use defaults
    }

    // ── Resolve theme colors ──
    // 逆向: W8R.build — R = Z0.of(T).colorScheme; a = $R.of(T).app
    const primaryColor = Color.blue();
    const secondaryColor = Color.cyan();
    const foregroundColor = Color.default();
    let commandColor = Color.cyan();
    let keybindColor = Color.magenta();
    const warningColor = Color.yellow();
    const destructiveColor = Color.red();
    const _borderColor = Color.blue();
    try {
      const appTheme = AppThemeController.maybeOf(context as unknown as Element);
      if (appTheme) {
        commandColor = appTheme.command;
        keybindColor = appTheme.keybind;
      }
    } catch {
      // No AppThemeController — use defaults
    }

    // ── Sizing ──
    // 逆向: W8R.build — y = m - 4; u = b - 4
    //   k = P ? max(100, min(150, y)) : max(60, min(90, y))
    //   x = P ? floor(k * 2/5) : 0
    const maxW = termWidth - 4;
    const maxH = termHeight - 4;
    const hasDetail = this._selectedSkill !== null;
    const modalWidth = hasDetail
      ? Math.max(100, Math.min(150, maxW))
      : Math.max(60, Math.min(90, maxW));
    const detailWidth = hasDetail ? Math.floor((modalWidth * 2) / 5) : 0;

    // Cache viewport height for scroll calculations
    this._viewportHeight = Math.max(1, maxH - 6);

    // ── Styles ──
    // 逆向: W8R.build styles — t = primary bold, r = secondary bold,
    //   h = command, i = command bold, c = foreground, s = foreground dim,
    //   A = destructive bold, l = destructive, o = warning bold,
    //   n = keybind, p = foreground, _ = foreground dim
    const titleStyle = new TextStyle({ foreground: primaryColor, bold: true });
    const sectionLabelStyle = new TextStyle({ foreground: secondaryColor, bold: true });
    const cmdStyle = new TextStyle({ foreground: commandColor });
    const cmdBoldStyle = new TextStyle({ foreground: commandColor, bold: true });
    const fgStyle = new TextStyle({ foreground: foregroundColor });
    const dimStyle = new TextStyle({ foreground: foregroundColor, dim: true });
    const destructiveBoldStyle = new TextStyle({ foreground: destructiveColor, bold: true });
    const destructiveStyle = new TextStyle({ foreground: destructiveColor });
    const warningBoldStyle = new TextStyle({ foreground: warningColor, bold: true });
    const keybindStyle = new TextStyle({ foreground: keybindColor });
    const secondaryStyle = new TextStyle({ foreground: secondaryColor });
    const secondaryDimStyle = new TextStyle({ foreground: secondaryColor, dim: true });

    // ── Partition skills: builtin vs user ──
    // 逆向: W8R.build — f = builtin; v = non-builtin
    const builtinSkills = skills.filter((s) => s.scope === "builtin");
    const userSkills = skills.filter((s) => s.scope !== "builtin");

    // ── Total count for header ──
    // 逆向: W8R.build — S = v.length + f.length; O = v.length > 0 ? `Skills (${S})` : "Skills"
    const totalCount = userSkills.length + builtinSkills.length;
    const headerTitle = userSkills.length > 0 ? `Skills (${totalCount})` : "Skills";

    // ── Build list items ──
    // 逆向: W8R.build — I = []; M = (skills, label, pathHint) => {...}
    const listItems: Widget[] = [];

    /**
     * Render a section of skills (group label + skill rows).
     * 逆向: W8R.build — M lambda (actions_intents.js:5450-5503)
     */
    const renderSection = (sectionSkills: SkillData[], label: string, pathHint?: string): void => {
      if (sectionSkills.length === 0) return;

      // Section header: "Label pathHint"
      const headerSpans: TextSpan[] = [
        new TextSpan({ text: `${label} `, style: sectionLabelStyle }),
      ];
      if (pathHint) {
        headerSpans.push(new TextSpan({ text: `${pathHint}\n`, style: dimStyle }));
      }
      listItems.push(
        new Padding({
          padding: EdgeInsets.symmetric({ horizontal: 2 }),
          child: new RichText({
            text: new TextSpan({ children: headerSpans }),
          }),
        }),
      );

      // Skill rows
      for (const skill of sectionSkills) {
        const isSelected = this._selectedSkill?.name === skill.name;
        const nameStyle = isSelected ? cmdBoldStyle : cmdStyle;
        const descText = skill.description ? collapseWhitespace(skill.description) : "";

        // Name: clickable to invoke
        const nameWidget = new GestureDetector({
          onTap: () => this.widget.config.onInvokeSkill(skill.name),
          child: new RichText({
            text: new TextSpan({ text: skill.name, style: nameStyle }),
            maxLines: 1,
            overflow: "ellipsis",
          }),
        });

        // Description: clickable to select (open detail pane)
        const descWidget = new GestureDetector({
          onTap: () => this._selectSkill(skill),
          child: new RichText({
            text: new TextSpan({ text: descText, style: fgStyle }),
            maxLines: 1,
            overflow: "ellipsis",
          }),
        });

        // 逆向: W8R — Row with flex:1 name + spacer(2) + flex:2 description
        listItems.push(
          new Padding({
            padding: EdgeInsets.only({ left: 6, right: 6 }),
            child: new Row({
              crossAxisAlignment: "start",
              children: [
                new Expanded({ flex: 1, child: nameWidget }),
                new SizedBox({ width: 2 }),
                new Expanded({ flex: 2, child: descWidget }),
              ],
            }),
          }),
        );
      }

      listItems.push(new SizedBox({ height: 1 }));
    };

    // Render grouped user skills (local → global), then builtin
    // 逆向: W8R.build line 5504 — for (let TT of Az0(v, cwd)) M(TT.skills, TT.label, TT.pathHint)
    if (userSkills.length > 0) {
      const groups = groupSkillsByScope(userSkills, cwd);
      for (const group of groups) {
        renderSection(group.skills, group.label, group.pathHint);
      }
    }
    // 逆向: W8R.build line 5505 — if (f.length > 0) M(f, "Built-in")
    if (builtinSkills.length > 0) {
      renderSection(builtinSkills, "Built-in");
    }

    // ── Errors section ──
    // 逆向: W8R.build lines 5506-5555
    if (skillErrors.length > 0) {
      if (skills.length > 0) {
        listItems.push(new SizedBox({ height: 1 }));
      }
      listItems.push(
        new Padding({
          padding: EdgeInsets.symmetric({ horizontal: 2 }),
          child: new RichText({
            text: new TextSpan({
              text: `Skipped skills with errors (${skillErrors.length}):`,
              style: destructiveBoldStyle,
            }),
          }),
        }),
      );
      listItems.push(new SizedBox({ height: 1 }));

      for (const err of skillErrors) {
        // Extract folder name from path
        const parts = err.path.split("/");
        const folderName = parts[parts.length - 2] || "unknown";

        listItems.push(
          new Padding({
            padding: EdgeInsets.symmetric({ horizontal: 2 }),
            child: new RichText({
              text: new TextSpan({ text: `\u26A0 ${folderName}`, style: warningBoldStyle }),
            }),
          }),
        );
        listItems.push(
          new Padding({
            padding: EdgeInsets.only({ left: 4 }),
            child: new RichText({
              text: new TextSpan({ text: err.error, style: destructiveStyle }),
            }),
          }),
        );
        const displayPath = formatPathForDisplay(err.path, cwd);
        listItems.push(
          new Padding({
            padding: EdgeInsets.only({ left: 4 }),
            child: new RichText({
              text: new TextSpan({ text: displayPath, style: dimStyle }),
            }),
          }),
        );
      }
      listItems.push(new SizedBox({ height: 1 }));
    }

    // ── Warnings section ──
    // 逆向: W8R.build lines 5556-5583
    if (skillWarnings.length > 0) {
      listItems.push(
        new Padding({
          padding: EdgeInsets.symmetric({ horizontal: 2 }),
          child: new RichText({
            text: new TextSpan({
              text: `Skill warnings (${skillWarnings.length}):`,
              style: warningBoldStyle,
            }),
          }),
        }),
      );
      listItems.push(new SizedBox({ height: 1 }));

      for (const warn of skillWarnings) {
        const displayPath = formatPathForDisplay(warn.path, cwd);
        listItems.push(
          new Padding({
            padding: EdgeInsets.symmetric({ horizontal: 2 }),
            child: new RichText({
              text: new TextSpan({ text: `\u26A0 ${displayPath}`, style: cmdStyle }),
            }),
          }),
        );
        listItems.push(
          new Padding({
            padding: EdgeInsets.only({ left: 4 }),
            child: new RichText({
              text: new TextSpan({ text: warn.warning, style: fgStyle }),
            }),
          }),
        );
      }
      listItems.push(new SizedBox({ height: 1 }));
    }

    // ── Empty state ──
    // 逆向: W8R.build lines 5412-5449 — empty skill list message
    const hasNoSkills = skills.length === 0 && skillErrors.length === 0;
    const onlyBuiltin = skills.length > 0 && userSkills.length === 0 && skillErrors.length === 0;
    if (hasNoSkills || onlyBuiltin) {
      listItems.unshift(
        new Padding({
          padding: EdgeInsets.symmetric({ horizontal: 2 }),
          child: new RichText({
            text: new TextSpan({
              text: "Skills give the agent specialized knowledge, teach it how to use tools,",
              style: dimStyle,
            }),
          }),
        }),
        new Padding({
          padding: EdgeInsets.symmetric({ horizontal: 2 }),
          child: new RichText({
            text: new TextSpan({
              text: "or define MCP servers to load on demand.",
              style: dimStyle,
            }),
          }),
        }),
        new SizedBox({ height: 1 }),
      );
    }

    // ── Left pane: skill list column ──
    // 逆向: W8R.build — V = Column(stretch, min, I)
    const listColumn = new Column({
      crossAxisAlignment: "stretch",
      mainAxisSize: "min",
      children: listItems,
    });

    // ── Right pane: detail (if selected) ──
    // 逆向: W8R.build lines 5614-5759
    let detailPane: Widget | null = null;
    if (this._selectedSkill) {
      detailPane = this._buildDetailPane(this._selectedSkill, detailWidth, {
        dimStyle,
        fgStyle,
        cmdStyle,
        keybindStyle,
        secondaryStyle,
        secondaryDimStyle,
        primaryColor,
      });
    }

    // ── Header row ──
    // 逆向: W8R.build — B = Row([SizedBox(2), Expanded(title), docs link, spacer, add link, SizedBox(2)])
    const headerRow = new Row({
      children: [
        new SizedBox({ width: 2 }),
        new Expanded({
          child: new RichText({
            text: new TextSpan({ text: headerTitle, style: titleStyle }),
          }),
        }),
        new SizedBox({ width: 2 }),
      ],
    });

    // ── Footer ──
    // 逆向: W8R.build — eT = Align.right("Escape to close")
    const footer = new Padding({
      padding: EdgeInsets.symmetric({ horizontal: 2 }),
      child: new RichText({
        text: new TextSpan({
          children: [
            new TextSpan({ text: "Escape", style: keybindStyle }),
            new TextSpan({ text: " to close", style: dimStyle }),
          ],
        }),
      }),
    });

    // ── Assemble left pane with header and footer ──
    const leftPane = new Expanded({
      child: new Column({
        crossAxisAlignment: "stretch",
        children: [
          headerRow,
          new SizedBox({ height: 1 }),
          new Expanded({
            child: new Padding({
              padding: hasDetail ? EdgeInsets.only({ right: 1 }) : EdgeInsets.all(0),
              child: listColumn,
            }),
          }),
          new SizedBox({ height: 1 }),
          footer,
        ],
      }),
    });

    // ── Assemble the main content row ──
    const contentChildren: Widget[] = [leftPane];
    if (detailPane) {
      contentChildren.push(detailPane);
    }

    const contentRow = new Row({
      crossAxisAlignment: "stretch",
      children: contentChildren,
    });

    // ── Focus wrapper ──
    // 逆向: W8R.build — C8({ autofocus, focusNode, onKey, child: ... })
    const focusedContent = new Focus({
      autofocus: true,
      onKey: this._handleKey,
      child: new Padding({
        padding: EdgeInsets.all(1),
        child: contentRow,
      }),
    });

    // ── Bordered container ──
    // 逆向: W8R.build — SR({ constraints, decoration: p8(bg, h9.all(e9(primary, 1, "rounded"))), child })
    const borderedContainer = new Container({
      constraints: new BoxConstraints({
        minWidth: modalWidth,
        maxWidth: modalWidth,
        minHeight: 0,
        maxHeight: maxH,
      }),
      decoration: new BoxDecoration({
        border: Border.all(new BorderSide(primaryColor, 1, "rounded")),
      }),
      child: focusedContent,
    });

    // ── Center in the viewport ──
    // 逆向: W8R.build — new N0({ child: ... }) — N0 is Center
    return new Center({
      child: borderedContainer,
    });
  }

  // ── Detail pane builder ─────────────────────────────

  /**
   * Build the right-side detail pane for the selected skill.
   *
   * 逆向: W8R.build lines 5614-5759
   *   Shows: path header + invoke link, separator, SKILL.md label,
   *   frontmatter block, content text, file list (non-builtin).
   */
  private _buildDetailPane(
    skill: SkillData,
    width: number,
    styles: {
      dimStyle: TextStyle;
      fgStyle: TextStyle;
      cmdStyle: TextStyle;
      keybindStyle: TextStyle;
      secondaryStyle: TextStyle;
      secondaryDimStyle: TextStyle;
      primaryColor: Color;
    },
  ): Widget {
    const { dimStyle, fgStyle, keybindStyle, secondaryStyle, secondaryDimStyle, primaryColor } =
      styles;
    const isBuiltin = skill.scope === "builtin";

    // ── Path header + invoke hint ──
    // 逆向: W8R — F = Row([Expanded(pathText), invokeLink])
    const pathText = formatBaseDir(skill.baseDir, this.widget.config.cwd);
    const headerRow = new Row({
      children: [
        new Expanded({
          child: new RichText({
            text: new TextSpan({ text: pathText, style: dimStyle }),
            maxLines: 1,
            overflow: "ellipsis",
          }),
        }),
        new SizedBox({ width: 1 }),
        new RichText({
          text: new TextSpan({
            children: [
              new TextSpan({ text: "(", style: secondaryDimStyle }),
              new TextSpan({ text: "i", style: keybindStyle }),
              new TextSpan({ text: ")", style: secondaryDimStyle }),
              new TextSpan({ text: "nvoke", style: secondaryStyle }),
            ],
          }),
        }),
      ],
    });

    // ── Frontmatter + content text ──
    // 逆向: W8R.build — E = []; format frontmatter fields; Z = frontmatter block + content
    const frontmatterLines: string[] = [];
    const fm = skill.frontmatter || {};
    if (fm.name) frontmatterLines.push(`name: ${fm.name}`);
    if (fm.description) frontmatterLines.push(`description: ${fm.description}`);
    if (fm.license) frontmatterLines.push(`license: ${fm.license}`);
    if (fm.compatibility) frontmatterLines.push(`compatibility: ${fm.compatibility}`);
    if (fm["argument-hint"]) frontmatterLines.push(`argument-hint: ${fm["argument-hint"]}`);
    if (fm.model) frontmatterLines.push(`model: ${fm.model}`);
    if (Array.isArray(fm["allowed-tools"]) && fm["allowed-tools"].length) {
      frontmatterLines.push(`allowed-tools: [${(fm["allowed-tools"] as string[]).join(", ")}]`);
    }
    if (Array.isArray(fm["builtin-tools"]) && fm["builtin-tools"].length) {
      frontmatterLines.push(`builtin-tools: [${(fm["builtin-tools"] as string[]).join(", ")}]`);
    }
    if (fm["disable-model-invocation"]) frontmatterLines.push("disable-model-invocation: true");
    if (fm.mode) frontmatterLines.push("mode: true");
    if (fm.isolatedContext) frontmatterLines.push("isolatedContext: true");
    if (fm.metadata && typeof fm.metadata === "object") {
      frontmatterLines.push("metadata:");
      for (const [k, v] of Object.entries(fm.metadata as Record<string, unknown>)) {
        frontmatterLines.push(`  ${k}: ${v}`);
      }
    }

    // 逆向: Z = frontmatter block wrapped in --- + content
    const fullText =
      frontmatterLines.length > 0
        ? `---\n${frontmatterLines.join("\n")}\n---\n\n${skill.content || ""}`
        : skill.content || "";

    // Apply scroll offset to content
    const contentLines = fullText.split("\n");
    const visibleLines = contentLines.slice(
      this._detailScrollOffset,
      this._detailScrollOffset + this._viewportHeight,
    );
    const visibleText = visibleLines.join("\n");

    // ── Detail body widgets ──
    const detailChildren: Widget[] = [];

    // SKILL.md label (clickable for non-builtin)
    // 逆向: W8R — pT = builtin ? text : clickable link
    detailChildren.push(
      new RichText({
        text: new TextSpan({
          text: "SKILL.md",
          style: isBuiltin ? dimStyle : new TextStyle({ foreground: primaryColor }),
        }),
      }),
    );
    detailChildren.push(new SizedBox({ height: 1 }));

    // Content preview
    if (visibleText) {
      detailChildren.push(
        new RichText({
          text: new TextSpan({ text: visibleText, style: fgStyle }),
        }),
      );
    }

    // ── File list (non-builtin only) ──
    // 逆向: W8R.build lines 5663-5698
    if (!isBuiltin && skill.files && skill.files.length > 0) {
      const otherFiles = skill.files.filter((f) => !f.toLowerCase().endsWith("skill.md"));
      if (otherFiles.length > 0) {
        detailChildren.push(new SizedBox({ height: 1 }));
        detailChildren.push(
          new RichText({
            text: new TextSpan({
              text: "\u2500".repeat(Math.max(0, width - 4)),
              style: dimStyle,
            }),
          }),
        );
        detailChildren.push(new SizedBox({ height: 1 }));
        detailChildren.push(
          new RichText({
            text: new TextSpan({ text: "Files:", style: dimStyle }),
          }),
        );
        detailChildren.push(
          new RichText({
            text: new TextSpan({
              text: "  SKILL.md",
              style: new TextStyle({ foreground: primaryColor }),
            }),
          }),
        );
        for (const file of otherFiles) {
          detailChildren.push(
            new RichText({
              text: new TextSpan({
                text: `  ${file}`,
                style: new TextStyle({ foreground: primaryColor }),
              }),
            }),
          );
        }
      }
    }

    // ── Detail body column ──
    const detailBody = new Column({
      crossAxisAlignment: "stretch",
      mainAxisSize: "min",
      children: detailChildren,
    });

    // ── Detail pane container ──
    // 逆向: W8R.build — Q = Container({ constraints(x, x), decoration: left-border, padding(left:2), child: Column(...) })
    return new Container({
      constraints: new BoxConstraints({
        minWidth: width,
        maxWidth: width,
      }),
      decoration: new BoxDecoration({
        border: new Border(undefined, undefined, undefined, new BorderSide(Color.default(), 1)),
      }),
      child: new Padding({
        padding: EdgeInsets.only({ left: 2 }),
        child: new Column({
          crossAxisAlignment: "stretch",
          children: [
            headerRow,
            new SizedBox({ height: 1 }),
            new Expanded({
              child: detailBody,
            }),
          ],
        }),
      }),
    });
  }
}
