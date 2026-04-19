/**
 * NotificationBanner — inline notification panel widget.
 *
 * 逆向: TZT/RZT at chunk-006.js — inline notification panels (NOT overlay toasts)
 *       These render as inline banners in the layout tree, unlike ToastOverlay
 *       which positions absolutely in the overlay layer.
 *
 * Renders an inline banner with type-specific icon and color,
 * a message, an optional action button, and an optional dismiss handler.
 *
 * @module
 */

import type { Widget as WidgetInterface } from "../tree/element.js";
import { type BuildContext, StatelessWidget } from "../tree/stateless-widget.js";
import type { Key } from "../tree/widget.js";
import { Container } from "./container.js";
import { Row } from "./row.js";
import { Text } from "./text.js";
import { GestureDetector } from "./gesture-detector.js";
import { SizedBox } from "./sized-box.js";
import { EdgeInsets } from "./edge-insets.js";
import { BoxDecoration } from "./box-decoration.js";
import { Border } from "./border.js";
import { BorderSide } from "./border-side.js";
import { TextStyle } from "../screen/text-style.js";
import { TextSpan } from "./text-span.js";
import { RichText } from "./rich-text.js";
import { Spacer } from "./spacer.js";
import { Color } from "../screen/color.js";

// ════════════════════════════════════════════════════
//  Notification type configuration
// ════════════════════════════════════════════════════

/** Notification type. */
export type NotificationType = "info" | "warning" | "error" | "success";

/**
 * Type-specific visual configuration.
 *
 * 逆向: Amp uses different colors per notification type —
 *       info=blue, warning=yellow, error=red, success=green
 */
const TYPE_CONFIG: Record<NotificationType, { icon: string; color: Color }> = {
  info: { icon: "ℹ", color: Color.rgb(66, 161, 255) },
  warning: { icon: "⚠", color: Color.rgb(255, 183, 27) },
  error: { icon: "✗", color: Color.rgb(243, 139, 168) },
  success: { icon: "✓", color: Color.rgb(166, 227, 161) },
};

// ════════════════════════════════════════════════════
//  NotificationBanner Widget
// ════════════════════════════════════════════════════

/** NotificationBanner action configuration. */
interface NotificationAction {
  /** Button label text */
  label: string;
  /** Called when the action button is pressed */
  onPressed: () => void;
}

/** NotificationBanner constructor arguments. */
interface NotificationBannerArgs {
  /** Optional key */
  key?: Key;
  /** Notification type */
  type: NotificationType;
  /** Message text to display */
  message: string;
  /** Called when the banner is dismissed (renders [x] button) */
  onDismiss?: () => void;
  /** Optional action button */
  action?: NotificationAction;
}

/**
 * NotificationBanner Widget.
 *
 * Renders an inline banner (NOT an overlay toast) with:
 * - Type-specific icon and color (info/warning/error/success)
 * - Message text
 * - Optional action button
 * - Optional dismiss button [x]
 *
 * 逆向: TZT/RZT at chunk-006.js — inline notification panels
 *       Unlike ToastOverlay, this is positioned in the normal layout flow.
 *
 * @example
 * ```ts
 * new NotificationBanner({
 *   type: "warning",
 *   message: "Rate limit approaching",
 *   action: { label: "View", onPressed: () => showDetails() },
 *   onDismiss: () => removeBanner(),
 * });
 * ```
 */
export class NotificationBanner extends StatelessWidget {
  readonly type: NotificationType;
  readonly message: string;
  readonly onDismiss: (() => void) | undefined;
  readonly action: NotificationAction | undefined;

  constructor(args: NotificationBannerArgs) {
    super({ key: args.key });
    this.type = args.type;
    this.message = args.message;
    this.onDismiss = args.onDismiss;
    this.action = args.action;
  }

  /**
   * Build the notification banner.
   *
   * Structure: Container(border+color) > Row > [icon, message, spacer?, action?, dismiss?]
   */
  build(_context: BuildContext): WidgetInterface {
    const config = TYPE_CONFIG[this.type];
    const children: WidgetInterface[] = [];

    // Icon
    children.push(
      new RichText({
        text: new TextSpan({
          text: config.icon + " ",
          style: new TextStyle({ foreground: config.color, bold: true }),
        }),
      }) as unknown as WidgetInterface,
    );

    // Message
    children.push(
      new Text({ data: this.message }) as unknown as WidgetInterface,
    );

    // Spacer pushes action/dismiss to the right
    if (this.action || this.onDismiss) {
      children.push(new Spacer() as unknown as WidgetInterface);
    }

    // Action button
    if (this.action) {
      const action = this.action;
      children.push(
        new GestureDetector({
          onTap: action.onPressed,
          child: new RichText({
            text: new TextSpan({
              text: `[${action.label}]`,
              style: new TextStyle({ foreground: config.color, bold: true }),
            }),
          }) as unknown as WidgetInterface,
        }) as unknown as WidgetInterface,
      );
    }

    // Dismiss button
    if (this.onDismiss) {
      const dismiss = this.onDismiss;
      children.push(
        new GestureDetector({
          onTap: dismiss,
          child: new RichText({
            text: new TextSpan({
              text: " [x]",
              style: new TextStyle({ foreground: Color.rgb(128, 128, 128) }),
            }),
          }) as unknown as WidgetInterface,
        }) as unknown as WidgetInterface,
      );
    }

    return new Container({
      padding: EdgeInsets.symmetric(0, 1),
      decoration: new BoxDecoration({
        border: new Border(
          undefined,
          undefined,
          undefined,
          new BorderSide(config.color, 2, "solid"),
        ),
      }),
      child: new Row({ children }) as unknown as WidgetInterface,
    }) as unknown as WidgetInterface;
  }
}
