// music-player.ts — Mock music player UI with playlist, progress bar, and controls.
//
// Run with: bun run examples/music-player.ts
//
// Controls: space=play/pause, n=next, p=prev, s=shuffle, r=repeat,
//           j/k or arrows=browse, enter=select, +/-=volume, q=quit

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

// --- Data model ---

interface Song { title: string; artist: string; album: string; duration: number }
type RepeatMode = 'off' | 'all' | 'one';

const PLAYLIST: Song[] = [
  { title: 'Bohemian Rhapsody',    artist: 'Queen',                  album: 'A Night at the Opera',     duration: 354 },
  { title: 'Hotel California',     artist: 'Eagles',                 album: 'Hotel California',         duration: 391 },
  { title: 'Stairway to Heaven',   artist: 'Led Zeppelin',           album: 'Led Zeppelin IV',          duration: 482 },
  { title: 'Comfortably Numb',     artist: 'Pink Floyd',             album: 'The Wall',                 duration: 382 },
  { title: 'Wish You Were Here',   artist: 'Pink Floyd',             album: 'Wish You Were Here',       duration: 334 },
  { title: 'Sweet Child O Mine',   artist: "Guns N' Roses",          album: 'Appetite for Destruction', duration: 356 },
  { title: 'November Rain',        artist: "Guns N' Roses",          album: 'Use Your Illusion I',      duration: 537 },
  { title: 'Nothing Else Matters', artist: 'Metallica',              album: 'Metallica',                duration: 388 },
  { title: 'Under the Bridge',     artist: 'Red Hot Chili Peppers',  album: 'Blood Sugar Sex Magik',    duration: 264 },
  { title: 'Wonderwall',           artist: 'Oasis',                  album: 'Morning Glory',            duration: 258 },
];

// --- Styles ---

const titleStyle    = new TextStyle({ bold: true, foreground: Color.cyan });
const headerStyle   = new TextStyle({ bold: true, foreground: Color.defaultColor });
const normalStyle   = new TextStyle();
const dimStyle      = new TextStyle({ dim: true });
const accentStyle   = new TextStyle({ foreground: Color.magenta });
const greenStyle    = new TextStyle({ foreground: Color.green });
const yellowStyle   = new TextStyle({ foreground: Color.yellow });
const selectedStyle = new TextStyle({ bold: true, foreground: Color.defaultColor });
const playingStyle  = new TextStyle({ bold: true, foreground: Color.green });
const selectedBg    = Color.brightBlack;

// --- Helpers ---

function txt(content: string, style?: TextStyle): Text {
  return new Text({ text: new TextSpan({ text: content, style: style ?? normalStyle }) });
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// --- Constants ---

const PROGRESS_WIDTH = 30;
const VOLUME_WIDTH   = 10;
const TICK_MS        = 1000;
const MAX_VOL        = 100;
const VOL_STEP       = 5;

// --- MusicPlayer Widget ---

export class MusicPlayer extends StatefulWidget {
  createState(): State<MusicPlayer> { return new MusicPlayerState(); }
}

export class MusicPlayerState extends State<MusicPlayer> {
  private _curIdx = 0;
  private _selIdx = 0;
  private _playing = false;
  private _elapsed = 0;
  private _volume = 70;
  private _shuffle = false;
  private _repeat: RepeatMode = 'off';
  private _focusNode: FocusNode | null = null;
  private _timer: ReturnType<typeof setInterval> | null = null;

  initState(): void {
    super.initState();
    this._focusNode = new FocusNode({
      debugLabel: 'MusicPlayerFocus',
      onKey: (event: KeyEvent): KeyEventResult => {
        const result = this._handleKey(event.key);
        if (result === 'handled') this.setState(() => {});
        return result;
      },
    });
    FocusManager.instance.registerNode(this._focusNode, null);
    this._focusNode.requestFocus();
    this._timer = setInterval(() => {
      if (!this._playing) return;
      const song = PLAYLIST[this._curIdx];
      if (this._elapsed < song.duration) {
        this.setState(() => { this._elapsed++; });
      } else {
        this._onTrackEnd();
      }
    }, TICK_MS);
  }

  dispose(): void {
    if (this._timer) { clearInterval(this._timer); this._timer = null; }
    if (this._focusNode) { this._focusNode.dispose(); this._focusNode = null; }
    super.dispose();
  }

  // --- Playback logic ---

  private _onTrackEnd(): void {
    if (this._repeat === 'one') {
      this.setState(() => { this._elapsed = 0; });
    } else if (this._repeat === 'all' || this._curIdx < PLAYLIST.length - 1) {
      this.setState(() => { this._nextTrack(); });
    } else {
      this.setState(() => { this._playing = false; this._elapsed = PLAYLIST[this._curIdx].duration; });
    }
  }

  private _nextTrack(): void {
    if (this._shuffle) {
      let next = Math.floor(Math.random() * PLAYLIST.length);
      while (next === this._curIdx && PLAYLIST.length > 1) next = Math.floor(Math.random() * PLAYLIST.length);
      this._curIdx = next;
    } else {
      this._curIdx = (this._curIdx + 1) % PLAYLIST.length;
    }
    this._selIdx = this._curIdx;
    this._elapsed = 0;
  }

  private _prevTrack(): void {
    if (this._elapsed > 3) {
      this._elapsed = 0;
    } else {
      this._curIdx = (this._curIdx - 1 + PLAYLIST.length) % PLAYLIST.length;
      this._selIdx = this._curIdx;
      this._elapsed = 0;
    }
  }

  // --- Key handling ---

  private _handleKey(key: string): 'handled' | 'ignored' {
    switch (key) {
      case 'j': case 'ArrowDown':
        this._selIdx = Math.min(this._selIdx + 1, PLAYLIST.length - 1);
        return 'handled';
      case 'k': case 'ArrowUp':
        this._selIdx = Math.max(this._selIdx - 1, 0);
        return 'handled';
      case ' ': case 'Space':
        this._playing = !this._playing;
        return 'handled';
      case 'Enter':
        this._curIdx = this._selIdx; this._elapsed = 0; this._playing = true;
        return 'handled';
      case 'n':
        this._nextTrack(); this._playing = true;
        return 'handled';
      case 'p':
        this._prevTrack();
        return 'handled';
      case 's':
        this._shuffle = !this._shuffle;
        return 'handled';
      case 'r':
        this._repeat = this._repeat === 'off' ? 'all' : this._repeat === 'all' ? 'one' : 'off';
        return 'handled';
      case 'ArrowRight': case '+':
        this._volume = Math.min(MAX_VOL, this._volume + VOL_STEP);
        return 'handled';
      case 'ArrowLeft': case '-':
        this._volume = Math.max(0, this._volume - VOL_STEP);
        return 'handled';
      case 'q':
        process.exit(0);
        return 'handled';
      default:
        return 'ignored';
    }
  }

  // --- Build ---

  build(_context: BuildContext): Widget {
    const song = PLAYLIST[this._curIdx];
    return new Column({
      children: [
        // Title bar
        txt('  Music Player  ', new TextStyle({ bold: true, foreground: Color.magenta })),
        new Divider({ color: Color.brightBlack }),
        // Playlist panel
        new Expanded({
          child: new Container({
            decoration: new BoxDecoration({
              border: Border.all(new BorderSide({ color: Color.magenta, style: 'rounded' })),
            }),
            child: new Column({
              mainAxisSize: 'min',
              children: [
                txt(' Playlist ', titleStyle),
                new Divider({ color: Color.magenta }),
                ...this._buildPlaylist(),
              ],
            }),
          }),
        }),
        // Now playing section
        new Container({
          decoration: new BoxDecoration({
            border: Border.all(new BorderSide({ color: Color.cyan, style: 'rounded' })),
          }),
          child: new Column({
            mainAxisSize: 'min',
            children: [
              txt(' Now Playing ', titleStyle),
              new Divider({ color: Color.cyan }),
              this._buildNowPlaying(song),
              new SizedBox({ height: 1 }),
              this._buildProgressBar(song),
              new SizedBox({ height: 1 }),
              this._buildControls(),
              new SizedBox({ height: 1 }),
              this._buildVolumeBar(),
            ],
          }),
        }),
        // Status bar with keybindings help
        new Divider({ color: Color.brightBlack }),
        txt(
          ' space:play/pause  n:next  p:prev  s:shuffle  r:repeat  +/-:vol  j/k:browse  enter:select  q:quit ',
          dimStyle,
        ),
      ],
    });
  }

  // --- Sub-builders ---

  private _buildPlaylist(): Widget[] {
    return PLAYLIST.map((song, i) => {
      const isCurrent = i === this._curIdx;
      const isSelected = i === this._selIdx;
      const marker = isCurrent && this._playing ? '>' : isCurrent ? '|' : ' ';
      const num = `${(i + 1).toString().padStart(2)}. `;
      const line = `${marker} ${num}${song.title.padEnd(24)} ${song.artist.padEnd(22)} ${formatTime(song.duration)}`;

      let style: TextStyle;
      if (isCurrent && this._playing) style = playingStyle;
      else if (isSelected) style = selectedStyle;
      else style = normalStyle;

      return new Container({
        decoration: isSelected ? new BoxDecoration({ color: selectedBg }) : new BoxDecoration(),
        child: txt(line, style),
      });
    });
  }

  private _buildNowPlaying(song: Song): Widget {
    return new Column({
      mainAxisSize: 'min',
      crossAxisAlignment: 'start',
      children: [
        new Row({ children: [
          txt('  Title:  ', dimStyle),
          txt(song.title, new TextStyle({ bold: true, foreground: Color.defaultColor })),
        ]}),
        new Row({ children: [
          txt('  Artist: ', dimStyle),
          txt(song.artist, accentStyle),
        ]}),
        new Row({ children: [
          txt('  Album:  ', dimStyle),
          txt(song.album, yellowStyle),
        ]}),
      ],
    });
  }

  private _buildProgressBar(song: Song): Widget {
    const elapsed = Math.min(this._elapsed, song.duration);
    const frac = song.duration > 0 ? elapsed / song.duration : 0;
    const filled = Math.round(frac * PROGRESS_WIDTH);
    const empty = PROGRESS_WIDTH - filled;
    const indicator = this._playing ? '>' : '||';

    return new Row({
      children: [
        txt(`  ${indicator} `, greenStyle),
        txt(formatTime(elapsed), new TextStyle({ foreground: Color.defaultColor })),
        txt(' '),
        txt('\u2588'.repeat(filled), new TextStyle({ foreground: Color.green })),
        txt('\u2591'.repeat(empty), new TextStyle({ foreground: Color.brightBlack })),
        txt(' '),
        txt(formatTime(song.duration), new TextStyle({ foreground: Color.defaultColor })),
      ],
    });
  }

  private _buildControls(): Widget {
    const shuffleTxt = this._shuffle
      ? txt(' [SHUFFLE] ', new TextStyle({ bold: true, foreground: Color.green }))
      : txt(' [SHUFFLE] ', dimStyle);

    let repeatLabel: string;
    let repeatSt: TextStyle;
    if (this._repeat === 'off') { repeatLabel = ' [REPEAT OFF] '; repeatSt = dimStyle; }
    else if (this._repeat === 'all') { repeatLabel = ' [REPEAT ALL] '; repeatSt = new TextStyle({ bold: true, foreground: Color.cyan }); }
    else { repeatLabel = ' [REPEAT ONE] '; repeatSt = new TextStyle({ bold: true, foreground: Color.yellow }); }

    const playTxt = this._playing
      ? txt(' PLAYING ', new TextStyle({ bold: true, foreground: Color.green }))
      : txt(' PAUSED  ', new TextStyle({ bold: true, foreground: Color.yellow }));

    return new Row({ children: [txt('  '), playTxt, shuffleTxt, txt(repeatLabel, repeatSt)] });
  }

  private _buildVolumeBar(): Widget {
    const frac = this._volume / MAX_VOL;
    const filled = Math.round(frac * VOLUME_WIDTH);
    const empty = VOLUME_WIDTH - filled;
    const volColor = this._volume >= 80 ? Color.red : this._volume >= 50 ? Color.yellow : Color.green;

    return new Row({
      children: [
        txt('  Vol: ', dimStyle),
        txt('\u2588'.repeat(filled), new TextStyle({ foreground: volColor })),
        txt('\u2591'.repeat(empty), new TextStyle({ foreground: Color.brightBlack })),
        txt(` ${this._volume}%`, new TextStyle({ foreground: volColor })),
      ],
    });
  }
}

// --- Exports ---

export { txt, formatTime, PLAYLIST };
export type { Song, RepeatMode };

if (import.meta.main) {
  runApp(new MusicPlayer(), { output: process.stdout });
}
