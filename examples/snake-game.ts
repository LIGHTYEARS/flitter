// snake-game.ts — Classic Snake game playable in the terminal.
//
// Run with: bun run examples/snake-game.ts
//
// Controls:
// - Arrow keys or WASD: Change direction
// - R: Restart game
// - Q: Quit

import { StatefulWidget, State, Widget, type BuildContext } from '../src/framework/widget';
import { runApp } from '../src/framework/binding';
import { Text } from '../src/widgets/text';
import { Column, Row } from '../src/widgets/flex';
import { SizedBox } from '../src/widgets/sized-box';
import { Container } from '../src/widgets/container';
import { Expanded } from '../src/widgets/flexible';
import { TextSpan } from '../src/core/text-span';
import { TextStyle } from '../src/core/text-style';
import { Color } from '../src/core/color';
import { EdgeInsets } from '../src/layout/edge-insets';
import { BoxDecoration, Border, BorderSide } from '../src/layout/render-decorated';
import { FocusNode, FocusManager } from '../src/input/focus';
import type { KeyEvent, KeyEventResult } from '../src/input/events';

// ---------------------------------------------------------------------------
// Constants & Types
// ---------------------------------------------------------------------------

const GRID_W = 30;
const GRID_H = 15;
const BASE_SPEED = 200;
const SPEED_INCREMENT = 20;
const MIN_SPEED = 60;

interface Point { x: number; y: number }
type Direction = 'up' | 'down' | 'left' | 'right';

// ---------------------------------------------------------------------------
// Helper & Styles
// ---------------------------------------------------------------------------

function txt(content: string, style?: TextStyle): Text {
  return new Text({
    text: new TextSpan({ text: content, style: style ?? new TextStyle() }),
  });
}

const titleStyle = new TextStyle({ bold: true, foreground: Color.green });
const scoreStyle = new TextStyle({ bold: true, foreground: Color.yellow });
const highScoreStyle = new TextStyle({ foreground: Color.cyan });
const dimStyle = new TextStyle({ foreground: Color.brightBlack });
const gameOverStyle = new TextStyle({ bold: true, foreground: Color.red });
const snakeStyle = new TextStyle({ bold: true, foreground: Color.green });
const foodStyle = new TextStyle({ bold: true, foreground: Color.red });
const borderStyle = new TextStyle({ foreground: Color.brightBlack });
const emptyStyle = new TextStyle({ foreground: Color.defaultColor });

// ---------------------------------------------------------------------------
// SnakeGame Widget
// ---------------------------------------------------------------------------

export class SnakeGame extends StatefulWidget {
  createState(): SnakeGameState {
    return new SnakeGameState();
  }
}

export class SnakeGameState extends State<SnakeGame> {
  private _snake: Point[] = [];
  private _direction: Direction = 'right';
  private _nextDirection: Direction = 'right';
  private _food: Point = { x: 0, y: 0 };
  private _score = 0;
  private _highScore = 0;
  private _gameOver = false;
  private _focusNode: FocusNode | null = null;
  private _timer: ReturnType<typeof setInterval> | null = null;
  private _speed = BASE_SPEED;

  initState(): void {
    this._focusNode = new FocusNode({
      debugLabel: 'SnakeGameFocus',
      onKey: (event: KeyEvent): KeyEventResult => this._handleKey(event),
    });
    FocusManager.instance.registerNode(this._focusNode, null);
    this._focusNode.requestFocus();
    this._resetGame();
    this._startLoop();
  }

  dispose(): void {
    this._stopLoop();
    if (this._focusNode) {
      this._focusNode.dispose();
      this._focusNode = null;
    }
    super.dispose();
  }

  private _resetGame(): void {
    const midX = Math.floor(GRID_W / 2);
    const midY = Math.floor(GRID_H / 2);
    this._snake = [
      { x: midX, y: midY },
      { x: midX - 1, y: midY },
      { x: midX - 2, y: midY },
    ];
    this._direction = 'right';
    this._nextDirection = 'right';
    this._score = 0;
    this._gameOver = false;
    this._speed = BASE_SPEED;
    this._placeFood();
  }

  private _placeFood(): void {
    const occupied = new Set<string>();
    for (const seg of this._snake) occupied.add(`${seg.x},${seg.y}`);
    let x: number, y: number;
    do {
      x = Math.floor(Math.random() * GRID_W);
      y = Math.floor(Math.random() * GRID_H);
    } while (occupied.has(`${x},${y}`));
    this._food = { x, y };
  }

  private _startLoop(): void {
    this._stopLoop();
    this._timer = setInterval(() => {
      if (!this._gameOver) this._tick();
    }, this._speed);
  }

  private _stopLoop(): void {
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
  }

  private _endGame(): void {
    this._gameOver = true;
    if (this._score > this._highScore) this._highScore = this._score;
  }

  private _tick(): void {
    this.setState(() => {
      this._direction = this._nextDirection;
      const head = this._snake[0]!;
      let nx = head.x;
      let ny = head.y;

      switch (this._direction) {
        case 'up':    ny--; break;
        case 'down':  ny++; break;
        case 'left':  nx--; break;
        case 'right': nx++; break;
      }

      // Wall collision
      if (nx < 0 || nx >= GRID_W || ny < 0 || ny >= GRID_H) {
        this._endGame();
        return;
      }

      // Self collision
      for (let i = 0; i < this._snake.length; i++) {
        if (this._snake[i]!.x === nx && this._snake[i]!.y === ny) {
          this._endGame();
          return;
        }
      }

      // Move head forward
      this._snake.unshift({ x: nx, y: ny });

      // Check food consumption
      if (nx === this._food.x && ny === this._food.y) {
        this._score++;
        this._placeFood();
        if (this._score % 5 === 0) {
          this._speed = Math.max(MIN_SPEED, this._speed - SPEED_INCREMENT);
          this._startLoop();
        }
      } else {
        this._snake.pop();
      }
    });
  }

  // --- Input handling ---

  private _handleKey(event: KeyEvent): KeyEventResult {
    if (event.key === 'q') process.exit(0);

    if (event.key === 'r') {
      this.setState(() => {
        this._resetGame();
        this._startLoop();
      });
      return 'handled';
    }

    if (this._gameOver) return 'ignored';

    switch (event.key) {
      case 'ArrowUp': case 'w':
        if (this._direction !== 'down') this._nextDirection = 'up';
        return 'handled';
      case 'ArrowDown': case 's':
        if (this._direction !== 'up') this._nextDirection = 'down';
        return 'handled';
      case 'ArrowLeft': case 'a':
        if (this._direction !== 'right') this._nextDirection = 'left';
        return 'handled';
      case 'ArrowRight': case 'd':
        if (this._direction !== 'left') this._nextDirection = 'right';
        return 'handled';
    }
    return 'ignored';
  }

  // --- Rendering ---

  private _buildGrid(): string[] {
    const snakeSet = new Set<string>();
    for (const seg of this._snake) snakeSet.add(`${seg.x},${seg.y}`);
    const foodKey = `${this._food.x},${this._food.y}`;

    const lines: string[] = [];
    lines.push('╭' + '─'.repeat(GRID_W) + '╮');

    for (let y = 0; y < GRID_H; y++) {
      let row = '│';
      for (let x = 0; x < GRID_W; x++) {
        const key = `${x},${y}`;
        if (key === foodKey) row += '★';
        else if (snakeSet.has(key)) row += '█';
        else row += ' ';
      }
      row += '│';
      lines.push(row);
    }

    lines.push('╰' + '─'.repeat(GRID_W) + '╯');
    return lines;
  }

  build(_context: BuildContext): Widget {
    const gridLines = this._buildGrid();

    // Render each grid line as a styled Text widget with per-character spans
    const gridWidgets: Widget[] = gridLines.map((line, idx) => {
      if (idx === 0 || idx === gridLines.length - 1) {
        return txt(line, borderStyle);
      }
      const spans: TextSpan[] = [];
      for (let i = 0; i < line.length; i++) {
        const ch = line[i]!;
        if (ch === '│') spans.push(new TextSpan({ text: ch, style: borderStyle }));
        else if (ch === '★') spans.push(new TextSpan({ text: ch, style: foodStyle }));
        else if (ch === '█') spans.push(new TextSpan({ text: ch, style: snakeStyle }));
        else spans.push(new TextSpan({ text: ch, style: emptyStyle }));
      }
      return new Text({ text: new TextSpan({ children: spans }) });
    });

    const statusText = this._gameOver
      ? `GAME OVER! Score: ${this._score}`
      : `Score: ${this._score}`;
    const level = Math.floor((BASE_SPEED - this._speed) / SPEED_INCREMENT) + 1;
    const helpText = this._gameOver
      ? 'R: restart  Q: quit'
      : 'Arrows/WASD: move  R: restart  Q: quit';

    return new Column({
      mainAxisSize: 'min',
      children: [
        txt('  Snake Game ', titleStyle),
        new SizedBox({ height: 1 }),
        new Row({
          children: [
            txt(` ${statusText} `, this._gameOver ? gameOverStyle : scoreStyle),
            new SizedBox({ width: 2 }),
            txt(`High: ${this._highScore}`, highScoreStyle),
            new SizedBox({ width: 2 }),
            txt(`Speed: ${level}`, dimStyle),
          ],
        }),
        new SizedBox({ height: 1 }),
        ...gridWidgets,
        new SizedBox({ height: 1 }),
        txt(` ${helpText}`, dimStyle),
      ],
    });
  }
}

// Export for testing
export const createSnakeGame = (): SnakeGame => new SnakeGame();

if (import.meta.main) {
  runApp(new SnakeGame(), { output: process.stdout });
}
