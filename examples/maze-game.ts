// maze-game.ts — Maze navigation game with fog of war and collectibles.
//
// Run with: bun run examples/maze-game.ts
//
// Controls:
// - Arrow keys or WASD: Move player
// - R: Restart with new maze
// - q or Ctrl+C: Quit
//
// This example demonstrates:
// - Procedurally generated maze via recursive backtracking
// - Fog of war with Manhattan distance visibility
// - StatefulWidget with keyboard input and timer
// - Complex grid rendering with styled characters
// - Game state management (moves, coins, timer, win detection)

import { StatefulWidget, State, Widget, type BuildContext } from '../src/framework/widget';
import { runApp } from '../src/framework/binding';
import { Text } from '../src/widgets/text';
import { Column, Row } from '../src/widgets/flex';
import { SizedBox } from '../src/widgets/sized-box';
import { Container } from '../src/widgets/container';
import { Expanded } from '../src/widgets/flexible';
import { Divider } from '../src/widgets/divider';
import { TextSpan } from '../src/core/text-span';
import { TextStyle } from '../src/core/text-style';
import { Color } from '../src/core/color';
import { EdgeInsets } from '../src/layout/edge-insets';
import { BoxDecoration, Border, BorderSide } from '../src/layout/render-decorated';
import { FocusNode, FocusManager } from '../src/input/focus';
import type { KeyEvent, KeyEventResult } from '../src/input/events';

// ---------------------------------------------------------------------------
// Constants & cell types
// ---------------------------------------------------------------------------

const MAZE_W = 21;
const MAZE_H = 21;
const VIS_RADIUS = 3;
const MIN_COINS = 5;
const MAX_COINS = 8;

const WALL = 0;
const FLOOR = 1;
const PLAYER = 2;
const EXIT = 3;
const COIN = 4;
type Cell = typeof WALL | typeof FLOOR | typeof PLAYER | typeof EXIT | typeof COIN;

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const dimStyle = new TextStyle({ dim: true });
const boldWhite = new TextStyle({ bold: true, foreground: Color.defaultColor });
const greenStyle = new TextStyle({ bold: true, foreground: Color.green });
const yellowStyle = new TextStyle({ bold: true, foreground: Color.yellow });
const cyanStyle = new TextStyle({ bold: true, foreground: Color.cyan });
const wallStyle = new TextStyle({ dim: true, foreground: Color.brightBlack });
const floorStyle = new TextStyle({ dim: true, foreground: Color.brightBlack });
const fogStyle = new TextStyle({ dim: true, foreground: Color.brightBlack });
const dimYellow = new TextStyle({ dim: true, foreground: Color.yellow });
const dimCyan = new TextStyle({ dim: true, foreground: Color.cyan });
const winStyle = new TextStyle({ bold: true, foreground: Color.green });

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function txt(content: string, style?: TextStyle): Text {
  return new Text({
    text: new TextSpan({ text: content, style: style ?? new TextStyle() }),
  });
}

function isVisible(px: number, py: number, cx: number, cy: number): boolean {
  return Math.abs(px - cx) + Math.abs(py - cy) <= VIS_RADIUS;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  return arr;
}

// ---------------------------------------------------------------------------
// Maze generation: recursive backtracking with 2-step carving
// ---------------------------------------------------------------------------

function generateMaze(w: number, h: number): Cell[][] {
  const grid: Cell[][] = [];
  for (let y = 0; y < h; y++) {
    grid[y] = [];
    for (let x = 0; x < w; x++) grid[y]![x] = WALL;
  }

  const dirs: [number, number][] = [[0, -2], [0, 2], [2, 0], [-2, 0]];

  // Iterative backtracking (avoids stack overflow on large grids)
  const stack: [number, number][] = [[1, 1]];
  grid[1]![1] = FLOOR;

  while (stack.length > 0) {
    const [cx, cy] = stack[stack.length - 1]!;
    const shuffled = shuffle([...dirs]);
    let carved = false;

    for (const [dx, dy] of shuffled) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (nx > 0 && nx < w - 1 && ny > 0 && ny < h - 1 && grid[ny]![nx] === WALL) {
        grid[cy + dy / 2]![cx + dx / 2] = FLOOR;
        grid[ny]![nx] = FLOOR;
        stack.push([nx, ny]);
        carved = true;
        break;
      }
    }
    if (!carved) stack.pop();
  }
  return grid;
}

// ---------------------------------------------------------------------------
// Coin placement
// ---------------------------------------------------------------------------

function placeCoins(grid: Cell[][], px: number, py: number, ex: number, ey: number): void {
  const floors: [number, number][] = [];
  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid[y]!.length; x++) {
      if (grid[y]![x] === FLOOR && !(x === px && y === py) && !(x === ex && y === ey)) {
        floors.push([x, y]);
      }
    }
  }
  shuffle(floors);
  const count = Math.min(
    MIN_COINS + Math.floor(Math.random() * (MAX_COINS - MIN_COINS + 1)),
    floors.length,
  );
  for (let i = 0; i < count; i++) {
    const [cx, cy] = floors[i]!;
    grid[cy]![cx] = COIN;
  }
}

// ---------------------------------------------------------------------------
// MazeGame Widget
// ---------------------------------------------------------------------------

export class MazeGame extends StatefulWidget {
  createState(): MazeGameState {
    return new MazeGameState();
  }
}

export class MazeGameState extends State<MazeGame> {
  private _grid: Cell[][] = [];
  private _playerX = 1;
  private _playerY = 1;
  private _exitX = MAZE_W - 2;
  private _exitY = MAZE_H - 2;
  private _moves = 0;
  private _coinsCollected = 0;
  private _totalCoins = 0;
  private _elapsed = 0;
  private _won = false;
  private _focusNode: FocusNode | null = null;
  private _timer: ReturnType<typeof setInterval> | null = null;
  private _visited: boolean[][] = [];

  initState(): void {
    this._focusNode = new FocusNode({
      debugLabel: 'MazeGameFocus',
      onKey: (event: KeyEvent): KeyEventResult => this._handleKey(event),
    });
    FocusManager.instance.registerNode(this._focusNode, null);
    this._focusNode.requestFocus();
    this._initMaze();

    this._timer = setInterval(() => {
      if (!this._won) {
        this.setState(() => { this._elapsed++; });
      }
    }, 1000);
  }

  dispose(): void {
    if (this._timer) { clearInterval(this._timer); this._timer = null; }
    if (this._focusNode) { this._focusNode.dispose(); this._focusNode = null; }
    super.dispose();
  }

  private _initMaze(): void {
    this._grid = generateMaze(MAZE_W, MAZE_H);
    this._playerX = 1;
    this._playerY = 1;
    this._exitX = MAZE_W - 2;
    this._exitY = MAZE_H - 2;
    this._moves = 0;
    this._coinsCollected = 0;
    this._elapsed = 0;
    this._won = false;

    // Ensure exit is reachable then place coins
    this._grid[this._exitY]![this._exitX] = FLOOR;
    placeCoins(this._grid, this._playerX, this._playerY, this._exitX, this._exitY);

    // Count coins then mark exit
    this._totalCoins = 0;
    for (let y = 0; y < MAZE_H; y++)
      for (let x = 0; x < MAZE_W; x++)
        if (this._grid[y]![x] === COIN) this._totalCoins++;
    this._grid[this._exitY]![this._exitX] = EXIT;

    // Reset visited map and mark initial visibility
    this._visited = [];
    for (let y = 0; y < MAZE_H; y++) {
      this._visited[y] = [];
      for (let x = 0; x < MAZE_W; x++) this._visited[y]![x] = false;
    }
    this._markVisible();
  }

  private _markVisible(): void {
    for (let y = 0; y < MAZE_H; y++)
      for (let x = 0; x < MAZE_W; x++)
        if (isVisible(this._playerX, this._playerY, x, y))
          this._visited[y]![x] = true;
  }

  private _handleKey(event: KeyEvent): KeyEventResult {
    if (event.key === 'q' || (event.key === 'c' && event.ctrlKey)) process.exit(0);

    if (event.key === 'r' || event.key === 'R') {
      this.setState(() => { this._initMaze(); });
      return 'handled';
    }

    if (this._won) return 'ignored';

    let dx = 0;
    let dy = 0;
    switch (event.key) {
      case 'ArrowUp': case 'w': case 'W': dy = -1; break;
      case 'ArrowDown': case 's': case 'S': dy = 1; break;
      case 'ArrowLeft': case 'a': case 'A': dx = -1; break;
      case 'ArrowRight': case 'd': case 'D': dx = 1; break;
      default: return 'ignored';
    }

    const nx = this._playerX + dx;
    const ny = this._playerY + dy;
    if (nx < 0 || nx >= MAZE_W || ny < 0 || ny >= MAZE_H) return 'handled';

    const target = this._grid[ny]![nx];
    if (target === WALL) return 'handled';

    this.setState(() => {
      if (target === COIN) this._coinsCollected++;
      this._grid[this._playerY]![this._playerX] = FLOOR;
      this._playerX = nx;
      this._playerY = ny;
      this._moves++;

      if (nx === this._exitX && ny === this._exitY) {
        this._won = true;
      } else {
        this._grid[ny]![nx] = PLAYER;
      }
      this._markVisible();
    });
    return 'handled';
  }

  private _cellDisplay(x: number, y: number): { ch: string; st: TextStyle } {
    if (x === this._playerX && y === this._playerY) return { ch: '@', st: greenStyle };

    const vis = isVisible(this._playerX, this._playerY, x, y);
    const seen = this._visited[y]![x];
    if (!vis && !seen) return { ch: ' ', st: fogStyle };

    const cell = this._grid[y]![x];
    if (vis) {
      switch (cell) {
        case WALL:  return { ch: '\u2588', st: wallStyle };
        case FLOOR: return { ch: '\u00B7', st: floorStyle };
        case EXIT:  return { ch: '\u25C6', st: yellowStyle };
        case COIN:  return { ch: '\u25CF', st: cyanStyle };
        default:    return { ch: '\u00B7', st: floorStyle };
      }
    }
    // Previously seen but now in fog: dimmed
    switch (cell) {
      case WALL:  return { ch: '\u2588', st: fogStyle };
      case FLOOR: return { ch: '\u00B7', st: fogStyle };
      case EXIT:  return { ch: '\u25C6', st: dimYellow };
      case COIN:  return { ch: '\u25CF', st: dimCyan };
      default:    return { ch: ' ', st: fogStyle };
    }
  }

  build(_context: BuildContext): Widget {
    // Render maze rows as rich text
    const mazeRows: Widget[] = [];
    for (let y = 0; y < MAZE_H; y++) {
      const spans: TextSpan[] = [];
      for (let x = 0; x < MAZE_W; x++) {
        const { ch, st } = this._cellDisplay(x, y);
        spans.push(new TextSpan({ text: ch, style: st }));
      }
      mazeRows.push(new Text({ text: new TextSpan({ children: spans }) }));
    }

    // Stats bar with rich spans
    const statsWidget = new Text({
      text: new TextSpan({
        children: [
          new TextSpan({ text: ' Moves: ', style: dimStyle }),
          new TextSpan({ text: String(this._moves), style: boldWhite }),
          new TextSpan({ text: '  Coins: ', style: dimStyle }),
          new TextSpan({ text: `${this._coinsCollected}/${this._totalCoins}`, style: cyanStyle }),
          new TextSpan({ text: '  Time: ', style: dimStyle }),
          new TextSpan({ text: formatTime(this._elapsed), style: boldWhite }),
        ],
      }),
    });

    const statusWidget = this._won
      ? txt(` You escaped! ${this._moves} moves, ${this._coinsCollected}/${this._totalCoins} coins, ${formatTime(this._elapsed)}`, winStyle)
      : txt(' Navigate to the exit. Collect coins along the way!', dimStyle);

    const helpWidget = this._won
      ? txt(' R: new maze  q: quit', dimStyle)
      : txt(' Arrows/WASD: move  R: restart  q: quit', dimStyle);

    const borderColor = this._won ? Color.green : Color.magenta;

    return new Column({
      children: [
        new Container({
          decoration: new BoxDecoration({
            border: Border.all(new BorderSide({ color: borderColor, style: 'rounded' })),
          }),
          child: new Container({
            decoration: new BoxDecoration({ color: borderColor }),
            child: txt(this._won ? ' Maze Escaped! ' : ' Maze Explorer ', new TextStyle({ bold: true })),
          }),
        }),
        new SizedBox({ height: 1 }),
        ...mazeRows,
        new SizedBox({ height: 1 }),
        statsWidget,
        statusWidget,
        new Divider(),
        helpWidget,
      ],
    });
  }
}

// Export for testing
export const createMazeGame = (): MazeGame => new MazeGame();

// Only run the app when executed directly
if (import.meta.main) {
  runApp(new MazeGame(), { output: process.stdout });
}
