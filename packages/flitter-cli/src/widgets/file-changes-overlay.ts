// FileChangesOverlay — Overlay listing all files modified in current session
//
// Matches AMP's isShowingFileChangesOverlay and ThreadWorker.fileChanges pattern.
// Shows file changes with status icons (created/modified/deleted) and
// relative paths. Color coding: created=green, modified=yellow, deleted=red.
//
// Supports scrolling for long file lists via SingleChildScrollView +
// keyboard ArrowUp/ArrowDown navigation.
//
// Key bindings:
//   Escape     → dismiss overlay
//   ArrowUp    → scroll up
//   ArrowDown  → scroll down
//
// Modal overlay at FILE_CHANGES priority (50).

import {
  StatefulWidget,
  State,
  Widget,
  type BuildContext,
} from '../../../flitter-core/src/framework/widget';
import { Column, Row } from '../../../flitter-core/src/widgets/flex';
import { Container } from '../../../flitter-core/src/widgets/container';
import { Expanded } from '../../../flitter-core/src/widgets/flexible';
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
import { SingleChildScrollView } from '../../../flitter-core/src/widgets/scroll-view';
import { ScrollController } from '../../../flitter-core/src/widgets/scroll-controller';
import { Scrollbar } from '../../../flitter-core/src/widgets/scrollbar';
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

/** Number of lines to scroll per ArrowUp/ArrowDown key press. */
const SCROLL_STEP = 3;

/** Maximum visible height for the overlay (in terminal rows). */
const MAX_VISIBLE_HEIGHT = 30;

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
 * Supports keyboard scroll (ArrowUp/ArrowDown) for long lists.
 *
 * Layout:
 *   FocusScope (autofocus, key handler)
 *     Center
 *       Container (bordered blue, padded, maxWidth: 70, maxHeight: MAX_VISIBLE_HEIGHT)
 *         Column
 *           "File Changes" title + count + summary
 *           Expanded (scroll area with file entries)
 *           Footer hints
 */
export class FileChangesOverlay extends StatefulWidget {
  readonly files: readonly FileChangeEntry[];
  readonly onDismiss: () => void;

  constructor(props: FileChangesOverlayProps) {
    super();
    this.files = props.files;
    this.onDismiss = props.onDismiss;
  }

  createState(): FileChangesOverlayState {
    return new FileChangesOverlayState();
  }
}

/**
 * State for FileChangesOverlay. Owns a ScrollController for keyboard-
 * driven scrolling of long file change lists.
 */
class FileChangesOverlayState extends State<FileChangesOverlay> {
  /** ScrollController for the file list scroll area. */
  private scrollController = new ScrollController();

  /** Dispose scroll controller on teardown. */
  dispose(): void {
    this.scrollController.dispose();
    super.dispose();
  }

  /**
   * Handle keyboard events: Escape to dismiss, ArrowUp/ArrowDown to scroll.
   */
  private _handleKey = (event: KeyEvent): KeyEventResult => {
    if (event.key === 'Escape') {
      this.widget.onDismiss();
      return 'handled';
    }
    if (event.key === 'ArrowUp') {
      const newOffset = Math.max(0, this.scrollController.offset - SCROLL_STEP);
      this.scrollController.jumpTo(newOffset);
      return 'handled';
    }
    if (event.key === 'ArrowDown') {
      const maxScroll = this.scrollController.maxScrollExtent;
      const newOffset = Math.min(maxScroll, this.scrollController.offset + SCROLL_STEP);
      this.scrollController.jumpTo(newOffset);
      return 'handled';
    }
    // Absorb all keys while overlay is shown
    return 'handled';
  };

  build(_context: BuildContext): Widget {
    const side = new BorderSide({
      color: BORDER_COLOR,
      width: 1,
      style: 'rounded',
    });

    const files = this.widget.files;

    // Compute summary counts per status
    let createdCount = 0;
    let modifiedCount = 0;
    let deletedCount = 0;
    for (const f of files) {
      if (f.status === 'created') createdCount++;
      else if (f.status === 'modified') modifiedCount++;
      else if (f.status === 'deleted') deletedCount++;
    }

    const headerChildren: Widget[] = [];

    // Title with count
    headerChildren.push(
      new Text({
        text: new TextSpan({
          children: [
            new TextSpan({
              text: 'File Changes',
              style: new TextStyle({ foreground: BORDER_COLOR, bold: true }),
            }),
            new TextSpan({
              text: ` (${files.length})`,
              style: new TextStyle({ foreground: MUTED_COLOR }),
            }),
          ],
        }),
      }),
    );

    // Summary line showing count per status type
    if (files.length > 0) {
      const summaryParts: TextSpan[] = [];
      if (createdCount > 0) {
        summaryParts.push(new TextSpan({
          text: `+${createdCount} created`,
          style: new TextStyle({ foreground: Color.green }),
        }));
      }
      if (modifiedCount > 0) {
        if (summaryParts.length > 0) {
          summaryParts.push(new TextSpan({ text: '  ', style: new TextStyle({ foreground: MUTED_COLOR }) }));
        }
        summaryParts.push(new TextSpan({
          text: `~${modifiedCount} modified`,
          style: new TextStyle({ foreground: Color.yellow }),
        }));
      }
      if (deletedCount > 0) {
        if (summaryParts.length > 0) {
          summaryParts.push(new TextSpan({ text: '  ', style: new TextStyle({ foreground: MUTED_COLOR }) }));
        }
        summaryParts.push(new TextSpan({
          text: `-${deletedCount} deleted`,
          style: new TextStyle({ foreground: Color.red }),
        }));
      }
      headerChildren.push(
        new Text({
          text: new TextSpan({ children: summaryParts }),
        }),
      );
    }

    headerChildren.push(new SizedBox({ height: 1 }));

    // File entry widgets
    const fileEntryWidgets: Widget[] = [];

    if (files.length === 0) {
      // Empty state
      fileEntryWidgets.push(
        new Text({
          text: new TextSpan({
            text: 'No files changed in this session',
            style: new TextStyle({ foreground: MUTED_COLOR }),
          }),
        }),
      );
    } else {
      // File entries with status icon and colored path
      for (const file of files) {
        const style = STATUS_STYLES[file.status];
        fileEntryWidgets.push(
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
    const footerChildren: Widget[] = [
      new SizedBox({ height: 1 }),
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
            ...(files.length > MAX_VISIBLE_HEIGHT - 6 ? [
              new TextSpan({
                text: '  ',
              }),
              new TextSpan({
                text: '↑↓',
                style: new TextStyle({ foreground: KEYBIND_COLOR }),
              }),
              new TextSpan({
                text: ' scroll',
                style: new TextStyle({ foreground: MUTED_COLOR, dim: true }),
              }),
            ] : []),
          ],
        }),
      }),
    ];

    // Scroll area for file entries
    const scrollArea = new Expanded({
      child: new Row({
        crossAxisAlignment: 'stretch',
        children: [
          new Expanded({
            child: new SingleChildScrollView({
              controller: this.scrollController,
              child: new Column({
                mainAxisSize: 'min',
                crossAxisAlignment: 'start',
                children: fileEntryWidgets,
              }),
            }),
          }),
          new Scrollbar({
            controller: this.scrollController,
            thumbColor: Color.brightBlack,
            trackColor: Color.defaultColor,
          }),
        ],
      }),
    });

    return new FocusScope({
      autofocus: true,
      onKey: this._handleKey,
      child: new Center({
        child: new Container({
          decoration: new BoxDecoration({ border: Border.all(side) }),
          padding: EdgeInsets.symmetric({ horizontal: 2, vertical: 1 }),
          constraints: new BoxConstraints({ maxWidth: 70, maxHeight: MAX_VISIBLE_HEIGHT }),
          child: new Column({
            mainAxisSize: 'min',
            crossAxisAlignment: 'start',
            children: [
              ...headerChildren,
              scrollArea,
              ...footerChildren,
            ],
          }),
        }),
      }),
    });
  }
}
