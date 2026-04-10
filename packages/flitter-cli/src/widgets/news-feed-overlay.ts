// NewsFeedOverlay — Scrollable overlay displaying news feed entries
//
// Displays a list of news entries with date, title, and summary.
// Uses Column + SingleChildScrollView + ScrollController for scrolling.
//
// Key bindings:
//   Escape        -> dismiss overlay
//   ArrowUp / k   -> scroll up
//   ArrowDown / j -> scroll down
//
// Modal overlay at NEWS_FEED priority (50).

import {
  StatefulWidget,
  State,
  Widget,
  type BuildContext,
} from '../../../flitter-core/src/framework/widget';
import { Column, Row } from '../../../flitter-core/src/widgets/flex';
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
import { SingleChildScrollView } from '../../../flitter-core/src/widgets/scroll-view';
import { ScrollController } from '../../../flitter-core/src/widgets/scroll-controller';
import { Scrollbar } from '../../../flitter-core/src/widgets/scrollbar';
import { Expanded } from '../../../flitter-core/src/widgets/flexible';
import type { KeyEvent, KeyEventResult } from '../../../flitter-core/src/input/events';
import { log } from '../utils/logger';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

/** A single news feed entry. */
export interface NewsFeedEntry {
  /** Title of the news entry (rendered bold). */
  readonly title: string;
  /** Date string for the entry (rendered dim). */
  readonly date: string;
  /** Short summary of the entry. */
  readonly summary: string;
  /** Optional URL to open in browser. */
  readonly url?: string;
}

/** Props for the NewsFeedOverlay widget. */
export interface NewsFeedOverlayProps {
  /** List of news entries to display. */
  readonly entries: NewsFeedEntry[];
  /** Callback to dismiss the overlay. */
  readonly onDismiss: () => void;
}

// ---------------------------------------------------------------------------
// Feed fetching
// ---------------------------------------------------------------------------

/**
 * Fetch a news feed from the given URL and return parsed entries.
 *
 * Parsing strategy:
 *   1. Attempt JSON parsing first (JSON Feed format — expects an `items` array
 *      with `title`, `url`, `date_published`, and `summary`/`content_text`).
 *   2. Fall back to basic RSS/XML parsing via regex, extracting `<title>`,
 *      `<link>`, `<description>`, and `<pubDate>` from each `<item>` element.
 *
 * No external XML library is used — the RSS path relies on simple regex
 * extraction which covers the vast majority of standard RSS 2.0 feeds.
 */
export async function fetchFeed(url: string): Promise<NewsFeedEntry[]> {
  const response = await fetch(url);
  const body = await response.text();

  // --- 1. Try JSON feed ---------------------------------------------------
  try {
    const json = JSON.parse(body);

    if (Array.isArray(json.items)) {
      return json.items.map((item: Record<string, unknown>) => ({
        title: String(item.title ?? ''),
        date: String(item.date_published ?? ''),
        summary: String(item.summary ?? item.content_text ?? ''),
        url: item.url != null ? String(item.url) : undefined,
      }));
    }
  } catch {
    // Not JSON — fall through to RSS parsing
  }

  // --- 2. Fall back to RSS/XML regex parsing ------------------------------
  const entries: NewsFeedEntry[] = [];
  const itemRegex = /<item[\s>]([\s\S]*?)<\/item>/gi;
  let itemMatch: RegExpExecArray | null;

  while ((itemMatch = itemRegex.exec(body)) !== null) {
    const block = itemMatch[1];

    const titleMatch = /<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i.exec(block);
    const linkMatch = /<link>([\s\S]*?)<\/link>/i.exec(block);
    const descMatch = /<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i.exec(block);
    const dateMatch = /<pubDate>([\s\S]*?)<\/pubDate>/i.exec(block);

    entries.push({
      title: titleMatch?.[1]?.trim() ?? '',
      date: dateMatch?.[1]?.trim() ?? '',
      summary: descMatch?.[1]?.trim() ?? '',
      url: linkMatch?.[1]?.trim() || undefined,
    });
  }

  return entries;
}

// ---------------------------------------------------------------------------
// Colors
// ---------------------------------------------------------------------------

const BORDER_COLOR = Color.cyan;
const TITLE_COLOR = Color.white;
const DATE_COLOR = Color.brightBlack;
const SUMMARY_COLOR = Color.white;
const MUTED_COLOR = Color.brightBlack;
const KEYBIND_COLOR = Color.blue;

/** Scroll step in lines when pressing arrow keys. */
const SCROLL_STEP = 3;

// ---------------------------------------------------------------------------
// NewsFeedOverlay
// ---------------------------------------------------------------------------

/**
 * Scrollable overlay that displays a list of news feed entries.
 *
 * Each entry is rendered as:
 *   [date] title       (date is dim, title is bold)
 *     summary          (indented summary line)
 *
 * Layout:
 *   FocusScope (autofocus, absorbs all keys)
 *     Center
 *       Container (bordered cyan, padded, maxWidth: 70, maxHeight: 25)
 *         Column
 *           "News Feed" title (bold)
 *           SizedBox spacer
 *           Row
 *             Expanded > SingleChildScrollView (with ScrollController)
 *               Column of entry rows
 *             Scrollbar
 *           SizedBox spacer
 *           Footer hints
 */
export class NewsFeedOverlay extends StatefulWidget {
  readonly entries: NewsFeedEntry[];
  readonly onDismiss: () => void;

  constructor(props: NewsFeedOverlayProps) {
    super();
    this.entries = props.entries;
    this.onDismiss = props.onDismiss;
    log.debug('NewsFeedOverlay: created', { entryCount: props.entries.length });
  }

  createState(): State<NewsFeedOverlay> {
    return new NewsFeedOverlayState();
  }
}

// ---------------------------------------------------------------------------
// NewsFeedOverlayState
// ---------------------------------------------------------------------------

/**
 * State for NewsFeedOverlay. Manages the ScrollController for
 * keyboard-driven scrolling through the news entries list.
 */
class NewsFeedOverlayState extends State<NewsFeedOverlay> {
  /** Scroll controller owned by this state for the news list. */
  private scrollController = new ScrollController();

  override dispose(): void {
    this.scrollController.dispose();
    super.dispose();
  }

  /**
   * Handle key events for the news feed overlay.
   * Escape dismisses; arrow keys / j/k scroll the list.
   */
  private _handleKey = (event: KeyEvent): KeyEventResult => {
    if (event.key === 'Escape') {
      log.debug('NewsFeedOverlay: dismissed via Escape');
      this.widget.onDismiss();
      return 'handled';
    }
    if (event.key === 'ArrowDown' || event.key === 'j') {
      this.scrollController.scrollBy(SCROLL_STEP);
      return 'handled';
    }
    if (event.key === 'ArrowUp' || event.key === 'k') {
      this.scrollController.scrollBy(-SCROLL_STEP);
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

    const contentChildren: Widget[] = [];

    // Title
    contentChildren.push(
      new Text({
        text: new TextSpan({
          text: 'News Feed',
          style: new TextStyle({ foreground: BORDER_COLOR, bold: true }),
        }),
      }),
    );
    contentChildren.push(new SizedBox({ height: 1 }));

    // Build entry rows
    if (this.widget.entries.length === 0) {
      contentChildren.push(
        new Text({
          text: new TextSpan({
            text: 'No news entries available',
            style: new TextStyle({ foreground: MUTED_COLOR }),
          }),
        }),
      );
    } else {
      const entryWidgets: Widget[] = [];

      for (let i = 0; i < this.widget.entries.length; i++) {
        const entry = this.widget.entries[i];
        if (i > 0) {
          entryWidgets.push(new SizedBox({ height: 1 }));
        }

        // Line 1: [date] title
        entryWidgets.push(
          new Text({
            text: new TextSpan({
              children: [
                new TextSpan({
                  text: `[${entry.date}]`,
                  style: new TextStyle({ foreground: DATE_COLOR, dim: true }),
                }),
                new TextSpan({
                  text: ` ${entry.title}`,
                  style: new TextStyle({ foreground: TITLE_COLOR, bold: true }),
                }),
              ],
            }),
          }),
        );

        // Line 2: indented summary
        entryWidgets.push(
          new Text({
            text: new TextSpan({
              text: `  ${entry.summary}`,
              style: new TextStyle({ foreground: SUMMARY_COLOR }),
            }),
          }),
        );
      }

      const entryColumn = new Column({
        mainAxisSize: 'min',
        crossAxisAlignment: 'start',
        children: entryWidgets,
      });

      const scrollView = new SingleChildScrollView({
        controller: this.scrollController,
        child: entryColumn,
      });

      const scrollArea = new Row({
        children: [
          new Expanded({ child: scrollView }),
          new Scrollbar({ controller: this.scrollController }),
        ],
      });

      contentChildren.push(scrollArea);
    }

    // Footer
    contentChildren.push(new SizedBox({ height: 1 }));
    contentChildren.push(
      new Text({
        text: new TextSpan({
          children: [
            new TextSpan({
              text: '\u2191\u2193',
              style: new TextStyle({ foreground: KEYBIND_COLOR }),
            }),
            new TextSpan({
              text: ' scroll  ',
              style: new TextStyle({ foreground: MUTED_COLOR, dim: true }),
            }),
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
      onKey: this._handleKey,
      child: new Center({
        child: new Container({
          decoration: new BoxDecoration({ border: Border.all(side) }),
          padding: EdgeInsets.symmetric({ horizontal: 2, vertical: 1 }),
          constraints: new BoxConstraints({ maxWidth: 70, maxHeight: 25 }),
          child: new Column({
            mainAxisSize: 'min',
            crossAxisAlignment: 'start',
            children: contentChildren,
          }),
        }),
      }),
    });
  }
}
