/**
 * GuidanceFileDisplay — shows loaded guidance files in tool results.
 *
 * Each guidance file renders as:
 *   "Loaded <cwd-relative-filename> (<lineCount> lines)"
 * All files are joined with newlines into a single RichText widget,
 * styled dim + toolSuccess, indented 2 characters from the left, and
 * marked selectable.
 *
 * 逆向: chunk-004.js:36821 — Jm(guidanceFiles, appContext)
 *
 *   function Jm(T, R) {
 *     if (!T || T.length === 0) return;
 *     let a = T.map(e => `Loaded ${ZA(e.uri)} (${e.lineCount} lines)`).join('\n');
 *     return new uR({
 *       padding: TR.only({ left: 2 }),
 *       child: new xT({
 *         text: new G(a, new cT({ color: R.app.toolSuccess, dim: true })),
 *         selectable: true
 *       })
 *     });
 *   }
 *
 * Path shortening (ZA / ki): amp uses its URI library to strip workspace
 * root from the URI. In flitter we strip the CWD prefix string from the
 * raw uri field, matching node:path.relative(cwd, uri) semantics for
 * absolute file paths.
 *
 * @module guidance-file-display
 */

import { relative } from "node:path";
import type { BuildContext, Element, Widget } from "@flitter/tui";
import {
  Color,
  Container,
  EdgeInsets,
  RichText,
  SizedBox,
  StatelessWidget,
  TextSpan,
  TextStyle,
} from "@flitter/tui";
import { type AppTheme, AppThemeController } from "./app-theme-controller.js";

// ════════════════════════════════════════════════════
//  Types
// ════════════════════════════════════════════════════

/**
 * A single guidance file entry as returned by the tool run.
 *
 * 逆向: guidanceFiles array element — { uri: string, lineCount: number }
 */
export interface GuidanceFileEntry {
  /** Absolute or workspace-relative URI / path for the file. */
  uri: string;
  /** Number of lines in the file. */
  lineCount: number;
}

/**
 * Configuration for GuidanceFileDisplay.
 */
export interface GuidanceFileDisplayConfig {
  /**
   * List of guidance files loaded during the tool run.
   * Empty array or undefined → widget renders as a zero-height SizedBox.
   *
   * 逆向: Jm() — if (!T || T.length === 0) return;
   */
  files: GuidanceFileEntry[];

  /**
   * Current working directory used to shorten displayed paths.
   * When provided, any `uri` that starts with this prefix is displayed
   * relative to it (node:path.relative semantics).
   *
   * 逆向: ZA(e.uri) / ki(path, T) — strips workspace root from URI
   *
   * Optional — when omitted, the raw URI string is displayed as-is.
   */
  cwd?: string;
}

// ════════════════════════════════════════════════════
//  Path helpers
// ════════════════════════════════════════════════════

/**
 * Shorten a file URI/path for display.
 *
 * If the path is absolute and `cwd` is provided, return the path relative
 * to `cwd` (using node:path.relative). Otherwise return the path unchanged.
 *
 * 逆向: ZA(e.uri) in Jm() — extracts a cwd-relative display name from a
 *        file URI. Amp's ZA walks URI path components; we use the simpler
 *        node:path.relative which yields identical results for absolute
 *        file paths on a real filesystem.
 *
 * @param uri - The file URI or absolute path.
 * @param cwd - Optional CWD to relativise against.
 * @returns Display-friendly path string.
 */
export function cwdRelativePath(uri: string, cwd?: string): string {
  if (!cwd) return uri;
  // Only relativise absolute paths
  if (!uri.startsWith("/") && !/^[A-Za-z]:[\\/]/.test(uri)) return uri;
  // Strip trailing slash from cwd for consistency
  const base = cwd.endsWith("/") ? cwd.slice(0, -1) : cwd;
  if (uri.startsWith(base + "/")) {
    return uri.slice(base.length + 1);
  }
  // Fallback to node:path.relative for cross-directory paths
  return relative(cwd, uri);
}

// ════════════════════════════════════════════════════
//  GuidanceFileDisplay widget
// ════════════════════════════════════════════════════

/**
 * GuidanceFileDisplay — renders loaded guidance files inside a tool result.
 *
 * Produces a left-indented (2 cols) RichText listing all guidance files
 * in the format "Loaded <filename> (<lineCount> lines)", styled dim +
 * toolSuccess colour, marked selectable. Returns an empty SizedBox when
 * the files array is empty.
 *
 * 逆向: chunk-004.js:36821 — Jm(guidanceFiles, appContext)
 *
 * @example
 * ```ts
 * new GuidanceFileDisplay({
 *   files: [{ uri: "/project/AGENTS.md", lineCount: 42 }],
 *   cwd: "/project",
 * })
 * // renders: "  Loaded AGENTS.md (42 lines)"
 * ```
 */
export class GuidanceFileDisplay extends StatelessWidget {
  readonly config: GuidanceFileDisplayConfig;

  constructor(config: GuidanceFileDisplayConfig) {
    super();
    this.config = config;
  }

  /**
   * Build the guidance file widget tree.
   *
   * 逆向: Jm(T, R) — chunk-004.js:36821-36836
   *
   * 1. Empty guard — return SizedBox(0,0) when files is empty.
   * 2. Map each file to "Loaded <relative-path> (<lineCount> lines)".
   * 3. Join with newlines into a single text string.
   * 4. Wrap in RichText with toolSuccess + dim style, selectable: true.
   * 5. Apply left padding of 2 via Container/EdgeInsets.
   *
   * @param context - Build context (used to look up AppTheme).
   * @returns Widget tree.
   */
  build(context: BuildContext): Widget {
    const { files, cwd } = this.config;

    // 逆向: if (!T || T.length === 0) return;
    if (!files || files.length === 0) {
      return new SizedBox({ width: 0, height: 0 }) as unknown as Widget;
    }

    // Resolve toolSuccess colour from AppThemeController, fall back to green.
    // 逆向: R.app.toolSuccess
    let appTheme: AppTheme | null = null;
    try {
      appTheme = AppThemeController.maybeOf(context as unknown as Element);
    } catch {
      // No AppThemeController in ancestor tree — use fallback color
    }
    const successColor: Color = appTheme?.toolSuccess ?? Color.green();

    // 逆向: T.map(e => `Loaded ${ZA(e.uri)} (${e.lineCount} lines)`).join('\n')
    const text = files
      .map((f) => `Loaded ${cwdRelativePath(f.uri, cwd)} (${f.lineCount} lines)`)
      .join("\n");

    // 逆向: new xT({ text: new G(a, new cT({ color: R.app.toolSuccess, dim: true })), selectable: true })
    //   xT = RichText, G = TextSpan, cT = TextStyle
    //   Note: selectable: true is not yet supported in flitter's RichText;
    //   the property is noted here for completeness but omitted from the call.
    const richText = new RichText({
      text: new TextSpan({
        text,
        style: new TextStyle({ foreground: successColor, dim: true }),
      }),
    }) as unknown as Widget;

    // 逆向: new uR({ padding: TR.only({ left: 2 }), child: ... })
    //   uR = Padding/Container, TR = EdgeInsets
    return new Container({
      padding: EdgeInsets.only({ left: 2 }),
      child: richText,
    }) as unknown as Widget;
  }
}
