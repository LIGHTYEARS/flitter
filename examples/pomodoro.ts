// pomodoro.ts — Pomodoro timer with work/break sessions and statistics.
//
// Run with: bun run examples/pomodoro.ts
//
// Controls:
// - Space: Start / Pause timer
// - r: Reset current session
// - n: Skip to next session
// - q or Ctrl+C: Quit
//
// This example demonstrates:
// - StatefulWidget with setInterval for countdown
// - Large ASCII-art digit rendering using block characters
// - Session state machine (work, short break, long break)
// - Color changes based on session type

import { StatefulWidget, State, Widget, type BuildContext } from '../src/framework/widget';
import { runApp } from '../src/framework/binding';
import { Text } from '../src/widgets/text';
import { Column, Row } from '../src/widgets/flex';
import { SizedBox } from '../src/widgets/sized-box';
import { Container } from '../src/widgets/container';
import { Expanded } from '../src/widgets/flexible';
import { Divider } from '../src/widgets/divider';
import { Center } from '../src/widgets/center';
import { TextSpan } from '../src/core/text-span';
import { TextStyle } from '../src/core/text-style';
import { Color } from '../src/core/color';
import { EdgeInsets } from '../src/layout/edge-insets';
import { BoxDecoration, Border, BorderSide } from '../src/layout/render-decorated';
import { FocusNode, FocusManager } from '../src/input/focus';
import type { KeyEvent, KeyEventResult } from '../src/input/events';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function txt(text: string, style?: TextStyle): Text {
  return new Text({
    text: new TextSpan({ text, style: style ?? new TextStyle() }),
  });
}

// Big digit font — 5 lines tall, 4 chars wide, block characters (█)
const BIG_DIGITS: Record<string, string[]> = {
  '0': ['████', '█  █', '█  █', '█  █', '████'],
  '1': ['  █ ', ' ██ ', '  █ ', '  █ ', ' ███'],
  '2': ['████', '   █', '████', '█   ', '████'],
  '3': ['████', '   █', '████', '   █', '████'],
  '4': ['█  █', '█  █', '████', '   █', '   █'],
  '5': ['████', '█   ', '████', '   █', '████'],
  '6': ['████', '█   ', '████', '█  █', '████'],
  '7': ['████', '   █', '  █ ', ' █  ', ' █  '],
  '8': ['████', '█  █', '████', '█  █', '████'],
  '9': ['████', '█  █', '████', '   █', '████'],
  ':': ['    ', ' ██ ', '    ', ' ██ ', '    '],
};

// Session types and durations
type SessionType = 'work' | 'short_break' | 'long_break';

const WORK_DURATION = 25 * 60;       // 25 minutes in seconds
const SHORT_BREAK_DURATION = 5 * 60; // 5 minutes in seconds
const LONG_BREAK_DURATION = 15 * 60; // 15 minutes in seconds
const SESSIONS_BEFORE_LONG_BREAK = 4;

function sessionColor(type: SessionType): Color {
  switch (type) {
    case 'work': return Color.red;
    case 'short_break': return Color.green;
    case 'long_break': return Color.blue;
  }
}

function sessionLabel(type: SessionType): string {
  switch (type) {
    case 'work': return 'Work Session';
    case 'short_break': return 'Short Break';
    case 'long_break': return 'Long Break';
  }
}

function sessionDuration(type: SessionType): number {
  switch (type) {
    case 'work': return WORK_DURATION;
    case 'short_break': return SHORT_BREAK_DURATION;
    case 'long_break': return LONG_BREAK_DURATION;
  }
}

// PomodoroTimer Widget
export class PomodoroTimer extends StatefulWidget {
  createState(): State<PomodoroTimer> {
    return new PomodoroTimerState();
  }
}

export class PomodoroTimerState extends State<PomodoroTimer> {
  private _focusNode: FocusNode | null = null;
  private _timer: ReturnType<typeof setInterval> | null = null;

  // Timer state
  private _sessionType: SessionType = 'work';
  private _secondsRemaining: number = WORK_DURATION;
  private _isRunning: boolean = false;
  // Session tracking
  private _completedPomodoros: number = 0;
  private _currentStreak: number = 0;
  private _totalWorkSeconds: number = 0;
  // Task name
  private _taskName: string = 'Focus Session';

  initState(): void {
    this._focusNode = new FocusNode({
      debugLabel: 'PomodoroFocus',
      onKey: (event: KeyEvent): KeyEventResult => {
        return this._handleKey(event);
      },
    });
    FocusManager.instance.registerNode(this._focusNode, null);
    this._focusNode.requestFocus();

    this._timer = setInterval(() => {
      if (this._isRunning) {
        this.setState(() => {
          // Track work time
          if (this._sessionType === 'work') {
            this._totalWorkSeconds++;
          }
          this._secondsRemaining--;
          if (this._secondsRemaining <= 0) {
            this._onSessionComplete();
          }
        });
      }
    }, 1000);
  }

  dispose(): void {
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
    if (this._focusNode) {
      this._focusNode.dispose();
      this._focusNode = null;
    }
    super.dispose();
  }

  // --- Session logic ---

  private _onSessionComplete(): void {
    if (this._sessionType === 'work') {
      this._completedPomodoros++;
      this._currentStreak++;
      // Determine next break type
      if (this._completedPomodoros % SESSIONS_BEFORE_LONG_BREAK === 0) {
        this._sessionType = 'long_break';
        this._secondsRemaining = LONG_BREAK_DURATION;
      } else {
        this._sessionType = 'short_break';
        this._secondsRemaining = SHORT_BREAK_DURATION;
      }
    } else {
      // After any break, go back to work
      this._sessionType = 'work';
      this._secondsRemaining = WORK_DURATION;
    }
    this._isRunning = false;
  }

  private _resetCurrent(): void {
    this._secondsRemaining = sessionDuration(this._sessionType);
    this._isRunning = false;
  }

  private _skipToNext(): void {
    if (this._sessionType === 'work') {
      // Skipping work does not count as completed
      if (this._completedPomodoros % SESSIONS_BEFORE_LONG_BREAK === 0 && this._completedPomodoros > 0) {
        this._sessionType = 'long_break';
        this._secondsRemaining = LONG_BREAK_DURATION;
      } else {
        this._sessionType = 'short_break';
        this._secondsRemaining = SHORT_BREAK_DURATION;
      }
    } else {
      this._sessionType = 'work';
      this._secondsRemaining = WORK_DURATION;
    }
    this._isRunning = false;
  }

  // --- Key handling ---

  private _handleKey(event: KeyEvent): KeyEventResult {
    if (event.key === 'q' || (event.key === 'c' && event.ctrlKey)) {
      process.exit(0);
    }

    if (event.key === ' ' || event.key === 'Space') {
      this.setState(() => {
        this._isRunning = !this._isRunning;
      });
      return 'handled';
    }

    if (event.key === 'r') {
      this.setState(() => {
        this._resetCurrent();
      });
      return 'handled';
    }

    if (event.key === 'n') {
      this.setState(() => {
        this._skipToNext();
      });
      return 'handled';
    }

    return 'ignored';
  }

  // --- Build helpers ---

  private _buildBigTimer(minutes: number, seconds: number, color: Color): Widget {
    const mm = String(minutes).padStart(2, '0');
    const ss = String(seconds).padStart(2, '0');
    const chars = [mm[0], mm[1], ':', ss[0], ss[1]];

    const lines: Widget[] = [];
    for (let row = 0; row < 5; row++) {
      let lineText = '';
      for (let i = 0; i < chars.length; i++) {
        const digit = BIG_DIGITS[chars[i]!];
        if (digit) {
          lineText += digit[row]!;
        }
        if (i < chars.length - 1) {
          lineText += ' ';
        }
      }
      lines.push(
        new Center({
          child: txt(lineText, new TextStyle({ bold: true, foreground: color })),
        })
      );
    }

    return new Column({
      mainAxisSize: 'min',
      children: lines,
    });
  }

  private _buildSessionIndicator(): Widget {
    const total = SESSIONS_BEFORE_LONG_BREAK;
    const filled = this._completedPomodoros % total;
    let indicators = '';
    for (let i = 0; i < total; i++) {
      indicators += i < filled ? '\u25cf ' : '\u25cb ';
    }
    return new Center({
      child: txt(indicators.trimEnd(), new TextStyle({ foreground: Color.yellow, bold: true })),
    });
  }

  private _buildStats(): Widget {
    const totalMinutes = Math.floor(this._totalWorkSeconds / 60);
    const totalHours = Math.floor(totalMinutes / 60);
    const remainMins = totalMinutes % 60;
    const timeStr = totalHours > 0
      ? `${totalHours}h ${remainMins}m`
      : `${remainMins}m`;

    const dimStyle = new TextStyle({ dim: true });
    const valueStyle = new TextStyle({ foreground: Color.defaultColor, bold: true });

    return new Column({
      mainAxisSize: 'min',
      children: [
        new Center({
          child: txt('--- Statistics ---', dimStyle),
        }),
        new SizedBox({ height: 1 }),
        new Row({
          mainAxisAlignment: 'center',
          children: [
            txt('  Total Work: ', dimStyle),
            txt(timeStr, valueStyle),
            txt('    Sessions: ', dimStyle),
            txt(String(this._completedPomodoros), valueStyle),
            txt('    Streak: ', dimStyle),
            txt(String(this._currentStreak), valueStyle),
            txt('  ', dimStyle),
          ],
        }),
      ],
    });
  }

  // --- Build ---

  build(_context: BuildContext): Widget {
    const color = sessionColor(this._sessionType);
    const minutes = Math.floor(this._secondsRemaining / 60);
    const seconds = this._secondsRemaining % 60;
    const statusText = this._isRunning ? 'RUNNING' : 'PAUSED';
    const statusColor = this._isRunning ? Color.green : Color.yellow;

    return new Column({
      mainAxisAlignment: 'start',
      crossAxisAlignment: 'stretch',
      children: [
        // Title bar
        new Center({
          child: txt(' Pomodoro Timer ', new TextStyle({ bold: true, foreground: color })),
        }),
        new Divider({ color: Color.brightBlack }),

        new SizedBox({ height: 1 }),

        // Task name and session type
        new Center({
          child: txt(
            this._taskName,
            new TextStyle({ bold: true, foreground: Color.defaultColor }),
          ),
        }),
        new Center({
          child: txt(
            sessionLabel(this._sessionType),
            new TextStyle({ foreground: color, bold: true }),
          ),
        }),

        new SizedBox({ height: 1 }),

        // Big countdown timer
        new Expanded({
          child: new Center({
            child: new Container({
              width: 30,
              decoration: new BoxDecoration({
                border: Border.all(new BorderSide({ color, style: 'rounded' })),
              }),
              child: new Column({
                mainAxisSize: 'min',
                children: [
                  new SizedBox({ height: 1 }),
                  this._buildBigTimer(minutes, seconds, color),
                  new SizedBox({ height: 1 }),
                  new Center({
                    child: txt(statusText, new TextStyle({ bold: true, foreground: statusColor })),
                  }),
                  new SizedBox({ height: 1 }),
                ],
              }),
            }),
          }),
        }),

        // Session indicator (filled/empty circles)
        this._buildSessionIndicator(),

        new SizedBox({ height: 1 }),

        // Statistics
        new Container({
          decoration: new BoxDecoration({
            border: Border.all(new BorderSide({ color: Color.brightBlack, style: 'solid' })),
          }),
          child: this._buildStats(),
        }),

        // Controls help bar
        new Divider({ color: Color.brightBlack }),
        new Center({
          child: txt(
            ' Space: Start/Pause | r: Reset | n: Next Session | q: Quit ',
            new TextStyle({ dim: true }),
          ),
        }),
      ],
    });
  }
}

// Export for testing
export const createPomodoroApp = (): PomodoroTimer => new PomodoroTimer();

// Only run the app when executed directly
if (import.meta.main) {
  runApp(new PomodoroTimer(), { output: process.stdout });
}
