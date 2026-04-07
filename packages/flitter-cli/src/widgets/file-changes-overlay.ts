// FileChangesOverlay — Overlay listing all files modified in current session
//
// Matches AMP's isShowingFileChangesOverlay and ThreadWorker.fileChanges pattern.
// Shows file changes with status icons (created/modified/deleted) and
// relative paths.
//
// Key bindings:
//   Escape → dismiss overlay
//
// Modal overlay at FILE_CHANGES priority (50).

import { StatelessWidget, Widget, type BuildContext } from '../../../flitter-core/src/framework/widget';
import { Column } from '../../../flitter-core/src/widgets/flex';
import { Container } from '../../../flitter-core/src/widgets/container';
import { Text } from '../../../flitter-core/src/widgets/text';
import { TextSpan } from '../../../flitter-core/src/core/text-span';
import { TextStyle } from '../../../flitter-core/src/core/text-style';
import { Color } from '../../../flitter-core/src/core/color';
import { FocusScope } from '../../../flitter-core/src/widgets/focus-scope';
import { BoxDecoration, Border, BorderSide } from '../../../flitter-core/src/layout/render-decorated';
import { EdgeInsets } from '../../../flitter-core/src/layout/edge-insets';
import { SizedBox } from '../../../flitter-core/src/widgets/sized-box';
import { Center } from '../../../flitter-core/src/widgets/center';
import { BoxConstraints } from '../../../flitter-core/src/core/box-constraints';
import type { KeyEvent, KeyEventResult } from '../../../flitter-core/src/input/events';
import type { FileChangeEntry } from '../state/types';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

/** Props for the FileChangesOverlay widget. */
interface FileChangesOverlayProps {
  /** List of file change entries to display. */
  files: readonly FileChangeEntry[];
  /** Callback to dismiss the overlay. */
  onDismiss: () => void;
}

// ---------------------------------------------------------------------------
// Colors
// ---------------------------------------------------------------------------

const BORDER_COLOR = Color.blue;
const MUTED_COLOR = Color.brightBlack;
const KEYBIND_COLOR = Color.blue;

/** Status icon and color per file change status. */
const STATUS_STYLES: Record<FileChangeEntry['status'], { icon: string; color: Color }> = {
  created:  { icon: '+', color: Color.green },
  modified: { icon: '~', color: Color.yellow },
  deleted:  { icon: '-', color: Color.red },
};

// ---------------------------------------------------------------------------
// FileChangesOverlay
// ---------------------------------------------------------------------------

/**
 * File changes overlay showing all files modified in the current session.
 *
 * Matches AMP's isShowingFileChangesOverlay state field.
 * Each file entry shows a status icon (+ created, ~ modified, - deleted)
 * with color coding and the relative file path.
 *
 * Layout:
 *   FocusScope (autofocus, absorbs all keys)
 *     Center
 *       Container (bordered blue, padded, maxWidth: 60)
 *         Column
 *           "File Changes" title + count
 *           File entry rows (or empty state)
 *           Footer hints
 */
export class FileChangesOverlay extends StatelessWidget {
  private readonly files: readonly FileChangeEntry[];
  private readonly onDismiss: () => void;

  constructor(props: FileChangesOverlayProps) {
    super({});
    this.files = props.files;
    this.onDismiss = props.onDismiss;
  }

  build(_context: BuildContext): Widget {
    const side = new BorderSide({
      color: BORDER_COLOR,
      width: 1,
      style: 'rounded',
    });

    const children: Widget[] = [];

    // Title with count
    children.push(
      new Text({
        text: new TextSpan({
          children: [
            new TextSpan({
              text: 'File Changes',
              style: new TextStyle({ foreground: BORDER_COLOR, bold: true }),
            }),
            new TextSpan({
              text: ` (${this.files.length})`,
              style: new TextStyle({ foreground: MUTED_COLOR }),
            }),
          ],
        }),
      }),
    );
    children.push(new SizedBox({ height: 1 }));

    if (this.files.length === 0) {
      // Empty state
      children.push(
        new Text({
          text: new TextSpan({
            text: 'No files changed in this session',
            style: new TextStyle({ foreground: MUTED_COLOR }),
          }),
        }),
      );
    } else {
      // File entries
      for (const file of this.files) {
        const style = STATUS_STYLES[file.status];
        children.push(
          new Text({
            text: new TextSpan({
              children: [
                new TextSpan({
                  text: `${style.icon} `,
                  style: new TextStyle({ foreground: style.color, bold: true }),
                }),
                new TextSpan({
                  text: file.path,
                  style: new TextStyle({ foreground: Color.white }),
                }),
              ],
            }),
          }),
        );
      }
    }

    // Footer
    children.push(new SizedBox({ height: 1 }));
    children.push(
      new Text({
        text: new TextSpan({
          children: [
            new TextSpan({
              text: 'Esc',
              style: new TextStyle({ foreground: KEYBIND_COLOR }),
            }),
            new TextSpan({
              text: ' close',
              style: new TextStyle({ foreground: MUTED_COLOR, dim: true }),
            }),
          ],
        }),
      }),
    );

    return new FocusScope({
      autofocus: true,
      onKey: (event: KeyEvent): KeyEventResult => {
        if (event.key === 'Escape') {
          this.onDismiss();
          return 'handled';
        }
        // Absorb all keys while overlay is shown
        return 'handled';
      },
      child: new Center({
        child: new Container({
          decoration: new BoxDecoration({ border: Border.all(side) }),
          padding: EdgeInsets.symmetric({ horizontal: 2, vertical: 1 }),
          constraints: new BoxConstraints({ maxWidth: 60 }),
          child: new Column({
            mainAxisSize: 'min',
            crossAxisAlignment: 'start',
            children,
          }),
        }),
      }),
    });
  }
}
