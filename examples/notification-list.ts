// notification-list.ts — Scrollable notification/message list.
//
// Run with: bun run examples/notification-list.ts
//
// This example demonstrates:
// - Scrollable list of notification items
// - Each notification has: icon, title, description, timestamp
// - Different colors for types (info=blue, warning=yellow, error=red, success=green)
// - Bordered cards for each notification
// - SingleChildScrollView with Expanded for scroll area
// - Complex layout composition with nested Row/Column

import { runApp, WidgetsBinding } from '../src/framework/binding';
import { Column, Row } from '../src/widgets/flex';
import { Expanded } from '../src/widgets/flexible';
import { Text } from '../src/widgets/text';
import { SizedBox } from '../src/widgets/sized-box';
import { Padding } from '../src/widgets/padding';
import { Container } from '../src/widgets/container';
import { Divider } from '../src/widgets/divider';
import { SingleChildScrollView } from '../src/widgets/scroll-view';
import { TextSpan } from '../src/core/text-span';
import { TextStyle } from '../src/core/text-style';
import { Color } from '../src/core/color';
import { EdgeInsets } from '../src/layout/edge-insets';
import { BoxDecoration, Border, BorderSide } from '../src/layout/render-decorated';
import type { Widget } from '../src/framework/widget';

// ---------------------------------------------------------------------------
// Notification data model
// ---------------------------------------------------------------------------

interface Notification {
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  description: string;
  timestamp: string;
}

const NOTIFICATIONS: Notification[] = [
  {
    type: 'success',
    title: 'Deployment Complete',
    description: 'Production deployment v2.4.1 finished successfully.',
    timestamp: '2 min ago',
  },
  {
    type: 'error',
    title: 'Build Failed',
    description: 'CI pipeline failed on branch feature/auth. Check logs for details.',
    timestamp: '15 min ago',
  },
  {
    type: 'warning',
    title: 'High Memory Usage',
    description: 'Server node-03 is using 92% of available memory.',
    timestamp: '32 min ago',
  },
  {
    type: 'info',
    title: 'New Pull Request',
    description: 'PR #247: "Add caching layer for API responses" by alice.',
    timestamp: '1 hour ago',
  },
  {
    type: 'success',
    title: 'Tests Passed',
    description: 'All 847 tests passed in 12.3 seconds. Coverage: 91%.',
    timestamp: '1 hour ago',
  },
  {
    type: 'warning',
    title: 'Certificate Expiring',
    description: 'SSL certificate for api.example.com expires in 14 days.',
    timestamp: '2 hours ago',
  },
  {
    type: 'info',
    title: 'Code Review Requested',
    description: 'Bob requested your review on PR #243: "Refactor auth module".',
    timestamp: '3 hours ago',
  },
  {
    type: 'error',
    title: 'Database Connection Lost',
    description: 'Primary database connection dropped. Failover activated.',
    timestamp: '4 hours ago',
  },
  {
    type: 'success',
    title: 'Backup Complete',
    description: 'Daily backup of production database completed. Size: 2.4 GB.',
    timestamp: '6 hours ago',
  },
  {
    type: 'info',
    title: 'New Team Member',
    description: 'Carol has joined the engineering team. Welcome!',
    timestamp: '8 hours ago',
  },
  {
    type: 'warning',
    title: 'Disk Space Low',
    description: 'Server node-01 has only 8% disk space remaining.',
    timestamp: '12 hours ago',
  },
  {
    type: 'success',
    title: 'Security Scan Clear',
    description: 'No vulnerabilities detected in latest dependency scan.',
    timestamp: '1 day ago',
  },
];

// ---------------------------------------------------------------------------
// Type styling
// ---------------------------------------------------------------------------

function getTypeColor(type: Notification['type']): Color {
  switch (type) {
    case 'info': return Color.blue;
    case 'warning': return Color.yellow;
    case 'error': return Color.red;
    case 'success': return Color.green;
  }
}

function getTypeIcon(type: Notification['type']): string {
  switch (type) {
    case 'info': return 'i';
    case 'warning': return '!';
    case 'error': return 'x';
    case 'success': return '*';
  }
}

function getTypeLabel(type: Notification['type']): string {
  switch (type) {
    case 'info': return 'INFO';
    case 'warning': return 'WARN';
    case 'error': return 'ERR ';
    case 'success': return ' OK ';
  }
}

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function label(content: string, style?: TextStyle): Text {
  return new Text({
    text: new TextSpan({
      text: content,
      style: style ?? new TextStyle(),
    }),
  });
}

// ---------------------------------------------------------------------------
// Build a notification card
// ---------------------------------------------------------------------------

function buildNotificationCard(notification: Notification): Widget {
  const color = getTypeColor(notification.type);
  const icon = getTypeIcon(notification.type);
  const typeLabel = getTypeLabel(notification.type);

  return new Container({
    decoration: new BoxDecoration({
      border: Border.all(new BorderSide({ color, style: 'rounded' })),
    }),
    child: new Padding({
      padding: EdgeInsets.symmetric({ horizontal: 1 }),
      child: new Column({
        mainAxisSize: 'min',
        crossAxisAlignment: 'start',
        children: [
          // Header row: icon + type badge + title + timestamp
          new Row({
            children: [
              // Type badge
              new Container({
                decoration: new BoxDecoration({ color }),
                child: label(` ${icon} ${typeLabel} `, new TextStyle({ bold: true })),
              }),
              new SizedBox({ width: 1 }),
              // Title
              new Expanded({
                child: label(notification.title, new TextStyle({ bold: true, foreground: Color.defaultColor })),
              }),
              // Timestamp
              label(notification.timestamp, new TextStyle({ dim: true })),
            ],
          }),
          // Description
          label(notification.description, new TextStyle({ foreground: Color.defaultColor, dim: true })),
        ],
      }),
    }),
  });
}

// ---------------------------------------------------------------------------
// Build the notification list layout
// ---------------------------------------------------------------------------

export function buildNotificationList() {
  // Build notification cards with spacing
  const notificationWidgets: Widget[] = [];
  NOTIFICATIONS.forEach((n, i) => {
    notificationWidgets.push(buildNotificationCard(n));
    if (i < NOTIFICATIONS.length - 1) {
      notificationWidgets.push(new SizedBox({ height: 1 }));
    }
  });

  // Count by type
  const counts = {
    info: NOTIFICATIONS.filter(n => n.type === 'info').length,
    warning: NOTIFICATIONS.filter(n => n.type === 'warning').length,
    error: NOTIFICATIONS.filter(n => n.type === 'error').length,
    success: NOTIFICATIONS.filter(n => n.type === 'success').length,
  };

  return new Column({
    mainAxisAlignment: 'start',
    crossAxisAlignment: 'stretch',
    children: [
      // Header
      new Container({
        decoration: new BoxDecoration({
          border: Border.all(new BorderSide({ color: Color.brightBlack, style: 'rounded' })),
        }),
        child: new Padding({
          padding: EdgeInsets.symmetric({ horizontal: 1 }),
          child: Row.spaceBetween([
            label(' Notifications ', new TextStyle({ bold: true, foreground: Color.cyan })),
            label(`${NOTIFICATIONS.length} total`, new TextStyle({ dim: true })),
          ]),
        }),
      }),

      // Summary bar
      new Padding({
        padding: EdgeInsets.symmetric({ horizontal: 1 }),
        child: new Text({
          text: new TextSpan({
            children: [
              new TextSpan({ text: `${counts.success} OK`, style: new TextStyle({ foreground: Color.green }) }),
              new TextSpan({ text: '  ', style: new TextStyle() }),
              new TextSpan({ text: `${counts.info} Info`, style: new TextStyle({ foreground: Color.blue }) }),
              new TextSpan({ text: '  ', style: new TextStyle() }),
              new TextSpan({ text: `${counts.warning} Warn`, style: new TextStyle({ foreground: Color.yellow }) }),
              new TextSpan({ text: '  ', style: new TextStyle() }),
              new TextSpan({ text: `${counts.error} Error`, style: new TextStyle({ foreground: Color.red }) }),
            ],
          }),
        }),
      }),
      new Divider(),

      // Scrollable notification list
      new Expanded({
        child: new SingleChildScrollView({
          child: new Padding({
            padding: EdgeInsets.symmetric({ horizontal: 1 }),
            child: new Column({
              mainAxisSize: 'min',
              crossAxisAlignment: 'stretch',
              children: notificationWidgets,
            }),
          }),
        }),
      }),
    ],
  });
}

// Export for testing
export const app = buildNotificationList();
export { NOTIFICATIONS };
export type { Notification };

// Only run the app when executed directly
if (import.meta.main) {
  runApp(app, { output: process.stdout });
}
