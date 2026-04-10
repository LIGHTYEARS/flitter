// JetBrainsInstaller — Installation guide widget for JetBrains IDEs
//
// StatelessWidget that displays installation status and guidance for
// JetBrains IDEs. Detects installed IDEs by checking the common macOS
// path ~/Library/Application Support/JetBrains/ for known IDE directories.
//
// When installed: lists detected IDE names and inferred versions.
// When not installed: shows step-by-step installation instructions.
//
// Uses Container + Column layout consistent with other overlay widgets.

import {
  StatelessWidget,
  Widget,
  type BuildContext,
} from '../../../flitter-core/src/framework/widget';
import { Column } from '../../../flitter-core/src/widgets/flex';
import { Container } from '../../../flitter-core/src/widgets/container';
import { Text } from '../../../flitter-core/src/widgets/text';
import { TextSpan } from '../../../flitter-core/src/core/text-span';
import { TextStyle } from '../../../flitter-core/src/core/text-style';
import { Color } from '../../../flitter-core/src/core/color';
import { BoxDecoration, Border, BorderSide } from '../../../flitter-core/src/layout/render-decorated';
import { EdgeInsets } from '../../../flitter-core/src/layout/edge-insets';
import { SizedBox } from '../../../flitter-core/src/widgets/sized-box';
import { BoxConstraints } from '../../../flitter-core/src/core/box-constraints';
import { existsSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { log } from '../utils/logger';

// ---------------------------------------------------------------------------
// Known JetBrains IDE directory prefixes
// ---------------------------------------------------------------------------

/**
 * Map of known JetBrains IDE directory prefixes to display names.
 * Directory names under ~/Library/Application Support/JetBrains/ follow
 * the pattern <ProductName><Version>, e.g. "IntelliJIdea2024.1".
 */
const KNOWN_IDES: ReadonlyArray<{ prefix: string; displayName: string }> = [
  { prefix: 'IntelliJIdea', displayName: 'IntelliJ IDEA' },
  { prefix: 'WebStorm', displayName: 'WebStorm' },
  { prefix: 'PyCharm', displayName: 'PyCharm' },
  { prefix: 'GoLand', displayName: 'GoLand' },
  { prefix: 'CLion', displayName: 'CLion' },
  { prefix: 'Rider', displayName: 'Rider' },
  { prefix: 'RubyMine', displayName: 'RubyMine' },
  { prefix: 'PhpStorm', displayName: 'PhpStorm' },
  { prefix: 'DataGrip', displayName: 'DataGrip' },
  { prefix: 'AndroidStudio', displayName: 'Android Studio' },
];

// ---------------------------------------------------------------------------
// Detection helpers
// ---------------------------------------------------------------------------

/** A detected JetBrains IDE installation. */
export interface DetectedIde {
  /** Human-readable name (e.g. "IntelliJ IDEA"). */
  readonly name: string;
  /** Version string extracted from directory name (e.g. "2024.1"). */
  readonly version: string;
}

/**
 * Scan the JetBrains support directory for installed IDEs.
 * Returns an array of detected IDE entries sorted by name.
 */
export function detectJetBrainsIdes(): DetectedIde[] {
  const startMs = performance.now();
  const supportDir = join(homedir(), 'Library', 'Application Support', 'JetBrains');

  if (!existsSync(supportDir)) {
    log.debug('JetBrainsInstaller: support directory not found', { path: supportDir });
    return [];
  }

  const detected: DetectedIde[] = [];

  try {
    const entries = readdirSync(supportDir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      for (const known of KNOWN_IDES) {
        if (entry.name.startsWith(known.prefix)) {
          const version = entry.name.slice(known.prefix.length) || 'unknown';
          detected.push({ name: known.displayName, version });
          break;
        }
      }
    }
  } catch (err) {
    log.warn('JetBrainsInstaller: failed to read support directory', { error: String(err) });
  }

  detected.sort((a, b) => a.name.localeCompare(b.name));

  const elapsedMs = performance.now() - startMs;
  log.debug('JetBrainsInstaller: detection complete', {
    detectedCount: detected.length,
    elapsedMs: elapsedMs.toFixed(2),
  });

  return detected;
}

// ---------------------------------------------------------------------------
// Colors
// ---------------------------------------------------------------------------

const BORDER_COLOR = Color.magenta;
const TITLE_COLOR = Color.magenta;
const IDE_NAME_COLOR = Color.white;
const VERSION_COLOR = Color.brightBlack;
const STEP_COLOR = Color.cyan;
const MUTED_COLOR = Color.brightBlack;
const SUCCESS_COLOR = Color.green;

// ---------------------------------------------------------------------------
// JetBrainsInstaller
// ---------------------------------------------------------------------------

/**
 * StatelessWidget displaying JetBrains IDE installation status and guidance.
 *
 * Layout:
 *   Container (bordered magenta, padded, maxWidth: 60)
 *     Column
 *       "JetBrains IDE Setup" title (bold)
 *       SizedBox spacer
 *       IF installed:
 *         "Detected IDEs:" label
 *         For each IDE: "  name  version" (name bold, version dim)
 *       ELSE:
 *         "No JetBrains IDEs detected" (dim)
 *         Installation steps
 */
export class JetBrainsInstaller extends StatelessWidget {
  /** Pre-detected IDEs. If not provided, detection runs at build time. */
  private readonly detectedIdes: DetectedIde[];

  constructor(opts?: { detectedIdes?: DetectedIde[] }) {
    super({});
    this.detectedIdes = opts?.detectedIdes ?? detectJetBrainsIdes();
    log.debug('JetBrainsInstaller: constructed', { ideCount: this.detectedIdes.length });
  }

  build(_context: BuildContext): Widget {
    const side = new BorderSide({
      color: BORDER_COLOR,
      width: 1,
      style: 'rounded',
    });

    const children: Widget[] = [];

    // Title
    children.push(
      new Text({
        text: new TextSpan({
          text: 'JetBrains IDE Setup',
          style: new TextStyle({ foreground: TITLE_COLOR, bold: true }),
        }),
      }),
    );
    children.push(new SizedBox({ height: 1 }));

    if (this.detectedIdes.length > 0) {
      // Installed state: list detected IDEs
      children.push(
        new Text({
          text: new TextSpan({
            children: [
              new TextSpan({
                text: '\u2713 ',
                style: new TextStyle({ foreground: SUCCESS_COLOR }),
              }),
              new TextSpan({
                text: 'Detected IDEs:',
                style: new TextStyle({ foreground: SUCCESS_COLOR }),
              }),
            ],
          }),
        }),
      );
      children.push(new SizedBox({ height: 1 }));

      for (const ide of this.detectedIdes) {
        children.push(
          new Text({
            text: new TextSpan({
              children: [
                new TextSpan({
                  text: `  ${ide.name}`,
                  style: new TextStyle({ foreground: IDE_NAME_COLOR, bold: true }),
                }),
                new TextSpan({
                  text: `  ${ide.version}`,
                  style: new TextStyle({ foreground: VERSION_COLOR, dim: true }),
                }),
              ],
            }),
          }),
        );
      }
    } else {
      // Not installed state: show installation instructions
      children.push(
        new Text({
          text: new TextSpan({
            text: 'No JetBrains IDEs detected.',
            style: new TextStyle({ foreground: MUTED_COLOR }),
          }),
        }),
      );
      children.push(new SizedBox({ height: 1 }));

      children.push(
        new Text({
          text: new TextSpan({
            text: 'Installation steps:',
            style: new TextStyle({ foreground: IDE_NAME_COLOR, bold: true }),
          }),
        }),
      );
      children.push(new SizedBox({ height: 1 }));

      const steps = [
        '1. Visit https://www.jetbrains.com/toolbox-app/',
        '2. Download and install JetBrains Toolbox',
        '3. Open Toolbox and install your preferred IDE',
        '4. Launch the IDE and complete initial setup',
        '5. Restart flitter to detect the installation',
      ];

      for (const step of steps) {
        children.push(
          new Text({
            text: new TextSpan({
              text: step,
              style: new TextStyle({ foreground: STEP_COLOR }),
            }),
          }),
        );
      }
    }

    return new Container({
      decoration: new BoxDecoration({ border: Border.all(side) }),
      padding: EdgeInsets.symmetric({ horizontal: 2, vertical: 1 }),
      constraints: new BoxConstraints({ maxWidth: 60 }),
      child: new Column({
        mainAxisSize: 'min',
        crossAxisAlignment: 'start',
        children,
      }),
    });
  }
}
