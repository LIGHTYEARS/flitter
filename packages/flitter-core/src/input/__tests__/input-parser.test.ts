// Tests for InputParser — the core escape sequence state machine
import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { InputParser } from '../input-parser';
import type { InputEvent, KeyEvent, MouseEvent, PasteEvent, FocusEvent } from '../events';

/**
 * Helper: collect all events emitted by feeding data to a parser.
 */
function parseEvents(data: string): InputEvent[] {
  const events: InputEvent[] = [];
  const parser = new InputParser((event) => events.push(event));
  parser.feed(data);
  parser.dispose();
  return events;
}

/**
 * Helper: parse a single event from data.
 */
function parseSingleEvent(data: string): InputEvent {
  const events = parseEvents(data);
  expect(events.length).toBe(1);
  return events[0]!;
}

/**
 * Helper: parse a single key event.
 */
function parseKeyEvent(data: string): KeyEvent {
  const event = parseSingleEvent(data);
  expect(event.type).toBe('key');
  return event as KeyEvent;
}

describe('InputParser', () => {
  describe('single printable characters', () => {
    test('lowercase letter', () => {
      const event = parseKeyEvent('a');
      expect(event.key).toBe('a');
      expect(event.ctrlKey).toBe(false);
      expect(event.altKey).toBe(false);
      expect(event.shiftKey).toBe(false);
    });

    test('uppercase letter has shift flag', () => {
      const event = parseKeyEvent('A');
      expect(event.key).toBe('a');
      expect(event.shiftKey).toBe(true);
    });

    test('digit', () => {
      const event = parseKeyEvent('5');
      expect(event.key).toBe('5');
      expect(event.shiftKey).toBe(false);
    });

    test('punctuation', () => {
      const event = parseKeyEvent('!');
      expect(event.key).toBe('!');
    });

    test('space', () => {
      const event = parseKeyEvent(' ');
      expect(event.key).toBe('Space');
    });

    test('multiple characters produce multiple events', () => {
      const events = parseEvents('abc');
      expect(events.length).toBe(3);
      expect((events[0] as KeyEvent).key).toBe('a');
      expect((events[1] as KeyEvent).key).toBe('b');
      expect((events[2] as KeyEvent).key).toBe('c');
    });
  });

  describe('control characters', () => {
    test('Ctrl+C (0x03)', () => {
      const event = parseKeyEvent('\x03');
      expect(event.key).toBe('c');
      expect(event.ctrlKey).toBe(true);
    });

    test('Ctrl+A (0x01)', () => {
      const event = parseKeyEvent('\x01');
      expect(event.key).toBe('a');
      expect(event.ctrlKey).toBe(true);
    });

    test('Ctrl+Z (0x1A)', () => {
      const event = parseKeyEvent('\x1A');
      expect(event.key).toBe('z');
      expect(event.ctrlKey).toBe(true);
    });

    test('Ctrl+D (0x04)', () => {
      const event = parseKeyEvent('\x04');
      expect(event.key).toBe('d');
      expect(event.ctrlKey).toBe(true);
    });
  });

  describe('special single characters', () => {
    test('Enter (\\r)', () => {
      const event = parseKeyEvent('\r');
      expect(event.key).toBe('Enter');
    });

    test('Enter (\\n)', () => {
      const event = parseKeyEvent('\n');
      expect(event.key).toBe('Enter');
    });

    test('Tab (\\t)', () => {
      const event = parseKeyEvent('\t');
      expect(event.key).toBe('Tab');
    });

    test('Backspace (0x7F)', () => {
      const event = parseKeyEvent('\x7F');
      expect(event.key).toBe('Backspace');
    });

    test('Backspace (0x08)', () => {
      const event = parseKeyEvent('\x08');
      expect(event.key).toBe('Backspace');
    });
  });

  describe('arrow keys (CSI)', () => {
    test('ArrowUp: ESC [ A', () => {
      const event = parseKeyEvent('\x1b[A');
      expect(event.key).toBe('ArrowUp');
    });

    test('ArrowDown: ESC [ B', () => {
      const event = parseKeyEvent('\x1b[B');
      expect(event.key).toBe('ArrowDown');
    });

    test('ArrowRight: ESC [ C', () => {
      const event = parseKeyEvent('\x1b[C');
      expect(event.key).toBe('ArrowRight');
    });

    test('ArrowLeft: ESC [ D', () => {
      const event = parseKeyEvent('\x1b[D');
      expect(event.key).toBe('ArrowLeft');
    });
  });

  describe('arrow keys (SS3)', () => {
    test('ArrowUp: ESC O A', () => {
      const event = parseKeyEvent('\x1bOA');
      expect(event.key).toBe('ArrowUp');
    });

    test('ArrowDown: ESC O B', () => {
      const event = parseKeyEvent('\x1bOB');
      expect(event.key).toBe('ArrowDown');
    });

    test('ArrowRight: ESC O C', () => {
      const event = parseKeyEvent('\x1bOC');
      expect(event.key).toBe('ArrowRight');
    });

    test('ArrowLeft: ESC O D', () => {
      const event = parseKeyEvent('\x1bOD');
      expect(event.key).toBe('ArrowLeft');
    });
  });

  describe('function keys', () => {
    test('f1: ESC [ 11 ~', () => {
      const event = parseKeyEvent('\x1b[11~');
      expect(event.key).toBe('f1');
    });

    test('f2: ESC [ 12 ~', () => {
      const event = parseKeyEvent('\x1b[12~');
      expect(event.key).toBe('f2');
    });

    test('f3: ESC [ 13 ~', () => {
      const event = parseKeyEvent('\x1b[13~');
      expect(event.key).toBe('f3');
    });

    test('f4: ESC [ 14 ~', () => {
      const event = parseKeyEvent('\x1b[14~');
      expect(event.key).toBe('f4');
    });

    test('f5: ESC [ 15 ~', () => {
      const event = parseKeyEvent('\x1b[15~');
      expect(event.key).toBe('f5');
    });

    test('f6: ESC [ 17 ~', () => {
      const event = parseKeyEvent('\x1b[17~');
      expect(event.key).toBe('f6');
    });

    test('f7: ESC [ 18 ~', () => {
      const event = parseKeyEvent('\x1b[18~');
      expect(event.key).toBe('f7');
    });

    test('f8: ESC [ 19 ~', () => {
      const event = parseKeyEvent('\x1b[19~');
      expect(event.key).toBe('f8');
    });

    test('f9: ESC [ 20 ~', () => {
      const event = parseKeyEvent('\x1b[20~');
      expect(event.key).toBe('f9');
    });

    test('f10: ESC [ 21 ~', () => {
      const event = parseKeyEvent('\x1b[21~');
      expect(event.key).toBe('f10');
    });

    test('f11: ESC [ 23 ~', () => {
      const event = parseKeyEvent('\x1b[23~');
      expect(event.key).toBe('f11');
    });

    test('f12: ESC [ 24 ~', () => {
      const event = parseKeyEvent('\x1b[24~');
      expect(event.key).toBe('f12');
    });

    test('f1: ESC O P (SS3 form)', () => {
      const event = parseKeyEvent('\x1bOP');
      expect(event.key).toBe('f1');
    });

    test('f2: ESC O Q (SS3 form)', () => {
      const event = parseKeyEvent('\x1bOQ');
      expect(event.key).toBe('f2');
    });

    test('f3: ESC O R (SS3 form)', () => {
      const event = parseKeyEvent('\x1bOR');
      expect(event.key).toBe('f3');
    });

    test('f4: ESC O S (SS3 form)', () => {
      const event = parseKeyEvent('\x1bOS');
      expect(event.key).toBe('f4');
    });

    test('f1: ESC [ P (CSI letter form)', () => {
      const event = parseKeyEvent('\x1b[P');
      expect(event.key).toBe('f1');
    });

    test('f1: ESC [ [ A (Linux console)', () => {
      const event = parseKeyEvent('\x1b[[A');
      expect(event.key).toBe('f1');
    });

    test('f5: ESC [ [ E (Linux console)', () => {
      const event = parseKeyEvent('\x1b[[E');
      expect(event.key).toBe('f5');
    });
  });

  describe('navigation keys', () => {
    test('Home: ESC [ H', () => {
      const event = parseKeyEvent('\x1b[H');
      expect(event.key).toBe('Home');
    });

    test('End: ESC [ F', () => {
      const event = parseKeyEvent('\x1b[F');
      expect(event.key).toBe('End');
    });

    test('Home: ESC O H (SS3)', () => {
      const event = parseKeyEvent('\x1bOH');
      expect(event.key).toBe('Home');
    });

    test('End: ESC O F (SS3)', () => {
      const event = parseKeyEvent('\x1bOF');
      expect(event.key).toBe('End');
    });

    test('Home: ESC [ 1 ~', () => {
      const event = parseKeyEvent('\x1b[1~');
      expect(event.key).toBe('Home');
    });

    test('End: ESC [ 4 ~', () => {
      const event = parseKeyEvent('\x1b[4~');
      expect(event.key).toBe('End');
    });

    test('Home: ESC [ 7 ~ (rxvt)', () => {
      const event = parseKeyEvent('\x1b[7~');
      expect(event.key).toBe('Home');
    });

    test('End: ESC [ 8 ~ (rxvt)', () => {
      const event = parseKeyEvent('\x1b[8~');
      expect(event.key).toBe('End');
    });

    test('Insert: ESC [ 2 ~', () => {
      const event = parseKeyEvent('\x1b[2~');
      expect(event.key).toBe('Insert');
    });

    test('Delete: ESC [ 3 ~', () => {
      const event = parseKeyEvent('\x1b[3~');
      expect(event.key).toBe('Delete');
    });

    test('PageUp: ESC [ 5 ~', () => {
      const event = parseKeyEvent('\x1b[5~');
      expect(event.key).toBe('PageUp');
    });

    test('PageDown: ESC [ 6 ~', () => {
      const event = parseKeyEvent('\x1b[6~');
      expect(event.key).toBe('PageDown');
    });
  });

  describe('modified keys', () => {
    test('Ctrl+ArrowUp: ESC [ 1;5 A', () => {
      const event = parseKeyEvent('\x1b[1;5A');
      expect(event.key).toBe('ArrowUp');
      expect(event.ctrlKey).toBe(true);
      expect(event.shiftKey).toBe(false);
      expect(event.altKey).toBe(false);
    });

    test('Shift+ArrowRight: ESC [ 1;2 C', () => {
      const event = parseKeyEvent('\x1b[1;2C');
      expect(event.key).toBe('ArrowRight');
      expect(event.shiftKey).toBe(true);
      expect(event.ctrlKey).toBe(false);
    });

    test('Alt+ArrowDown: ESC [ 1;3 B', () => {
      const event = parseKeyEvent('\x1b[1;3B');
      expect(event.key).toBe('ArrowDown');
      expect(event.altKey).toBe(true);
    });

    test('Ctrl+Shift+ArrowLeft: ESC [ 1;6 D', () => {
      const event = parseKeyEvent('\x1b[1;6D');
      expect(event.key).toBe('ArrowLeft');
      expect(event.ctrlKey).toBe(true);
      expect(event.shiftKey).toBe(true);
    });

    test('Meta+ArrowUp: ESC [ 1;9 A', () => {
      const event = parseKeyEvent('\x1b[1;9A');
      expect(event.key).toBe('ArrowUp');
      expect(event.metaKey).toBe(true);
    });

    test('Shift+Tab: ESC [ Z', () => {
      const event = parseKeyEvent('\x1b[Z');
      expect(event.key).toBe('Tab');
      expect(event.shiftKey).toBe(true);
    });

    test('Modified Delete: ESC [ 3;5 ~', () => {
      const event = parseKeyEvent('\x1b[3;5~');
      expect(event.key).toBe('Delete');
      expect(event.ctrlKey).toBe(true);
    });
  });

  describe('rxvt-style shift variants', () => {
    test('Shift+Up: ESC [ a', () => {
      const event = parseKeyEvent('\x1b[a');
      expect(event.key).toBe('ArrowUp');
      expect(event.shiftKey).toBe(true);
    });

    test('Shift+Down: ESC [ b', () => {
      const event = parseKeyEvent('\x1b[b');
      expect(event.key).toBe('ArrowDown');
      expect(event.shiftKey).toBe(true);
    });

    test('Shift+Right: ESC [ c', () => {
      const event = parseKeyEvent('\x1b[c');
      expect(event.key).toBe('ArrowRight');
      expect(event.shiftKey).toBe(true);
    });

    test('Shift+Left: ESC [ d', () => {
      const event = parseKeyEvent('\x1b[d');
      expect(event.key).toBe('ArrowLeft');
      expect(event.shiftKey).toBe(true);
    });
  });

  describe('rxvt-style ctrl variants (SS3)', () => {
    test('Ctrl+Up: ESC O a', () => {
      const event = parseKeyEvent('\x1bOa');
      expect(event.key).toBe('ArrowUp');
      expect(event.ctrlKey).toBe(true);
    });

    test('Ctrl+Down: ESC O b', () => {
      const event = parseKeyEvent('\x1bOb');
      expect(event.key).toBe('ArrowDown');
      expect(event.ctrlKey).toBe(true);
    });

    test('Ctrl+Right: ESC O c', () => {
      const event = parseKeyEvent('\x1bOc');
      expect(event.key).toBe('ArrowRight');
      expect(event.ctrlKey).toBe(true);
    });

    test('Ctrl+Left: ESC O d', () => {
      const event = parseKeyEvent('\x1bOd');
      expect(event.key).toBe('ArrowLeft');
      expect(event.ctrlKey).toBe(true);
    });
  });

  describe('rxvt-style shift $ variants', () => {
    test('Shift+Insert: ESC [ 2 $', () => {
      const event = parseKeyEvent('\x1b[2$');
      expect(event.key).toBe('Insert');
      expect(event.shiftKey).toBe(true);
    });

    test('Shift+Delete: ESC [ 3 $', () => {
      const event = parseKeyEvent('\x1b[3$');
      expect(event.key).toBe('Delete');
      expect(event.shiftKey).toBe(true);
    });

    test('Shift+PageUp: ESC [ 5 $', () => {
      const event = parseKeyEvent('\x1b[5$');
      expect(event.key).toBe('PageUp');
      expect(event.shiftKey).toBe(true);
    });

    test('Shift+Home: ESC [ 7 $', () => {
      const event = parseKeyEvent('\x1b[7$');
      expect(event.key).toBe('Home');
      expect(event.shiftKey).toBe(true);
    });
  });

  describe('rxvt-style ctrl ^ variants', () => {
    test('Ctrl+Insert: ESC [ 2 ^', () => {
      const event = parseKeyEvent('\x1b[2^');
      expect(event.key).toBe('Insert');
      expect(event.ctrlKey).toBe(true);
    });

    test('Ctrl+Delete: ESC [ 3 ^', () => {
      const event = parseKeyEvent('\x1b[3^');
      expect(event.key).toBe('Delete');
      expect(event.ctrlKey).toBe(true);
    });

    test('Ctrl+PageDown: ESC [ 6 ^', () => {
      const event = parseKeyEvent('\x1b[6^');
      expect(event.key).toBe('PageDown');
      expect(event.ctrlKey).toBe(true);
    });

    test('Ctrl+End: ESC [ 8 ^', () => {
      const event = parseKeyEvent('\x1b[8^');
      expect(event.key).toBe('End');
      expect(event.ctrlKey).toBe(true);
    });
  });

  describe('SGR mouse events', () => {
    test('left button press', () => {
      const event = parseSingleEvent('\x1b[<0;10;5M') as MouseEvent;
      expect(event.type).toBe('mouse');
      expect(event.action).toBe('press');
      expect(event.button).toBe(0);
      expect(event.x).toBe(9);   // 10 - 1 = 9 (0-based)
      expect(event.y).toBe(4);   // 5 - 1 = 4 (0-based)
      expect(event.ctrlKey).toBe(false);
      expect(event.altKey).toBe(false);
      expect(event.shiftKey).toBe(false);
    });

    test('left button release', () => {
      const event = parseSingleEvent('\x1b[<0;10;5m') as MouseEvent;
      expect(event.type).toBe('mouse');
      expect(event.action).toBe('release');
      expect(event.button).toBe(0);
      expect(event.x).toBe(9);
      expect(event.y).toBe(4);
    });

    test('middle button press', () => {
      const event = parseSingleEvent('\x1b[<1;20;10M') as MouseEvent;
      expect(event.type).toBe('mouse');
      expect(event.action).toBe('press');
      expect(event.button).toBe(1);
      expect(event.x).toBe(19);
      expect(event.y).toBe(9);
    });

    test('right button press', () => {
      const event = parseSingleEvent('\x1b[<2;1;1M') as MouseEvent;
      expect(event.type).toBe('mouse');
      expect(event.action).toBe('press');
      expect(event.button).toBe(2);
      expect(event.x).toBe(0);
      expect(event.y).toBe(0);
    });

    test('scroll up', () => {
      const event = parseSingleEvent('\x1b[<64;10;5M') as MouseEvent;
      expect(event.type).toBe('mouse');
      expect(event.action).toBe('scroll');
      expect(event.button).toBe(64);
      expect(event.x).toBe(9);
      expect(event.y).toBe(4);
    });

    test('scroll down', () => {
      const event = parseSingleEvent('\x1b[<65;10;5M') as MouseEvent;
      expect(event.type).toBe('mouse');
      expect(event.action).toBe('scroll');
      expect(event.button).toBe(65);
    });

    test('mouse motion with left button', () => {
      const event = parseSingleEvent('\x1b[<32;15;8M') as MouseEvent;
      expect(event.type).toBe('mouse');
      expect(event.action).toBe('move');
      expect(event.button).toBe(0);  // base button 0 (left), motion stripped
      expect(event.x).toBe(14);
      expect(event.y).toBe(7);
    });

    test('ctrl+click', () => {
      const event = parseSingleEvent('\x1b[<16;10;5M') as MouseEvent;
      expect(event.type).toBe('mouse');
      expect(event.action).toBe('press');
      expect(event.button).toBe(0);  // base button with ctrl stripped
      expect(event.ctrlKey).toBe(true);
    });

    test('shift+click', () => {
      const event = parseSingleEvent('\x1b[<4;10;5M') as MouseEvent;
      expect(event.type).toBe('mouse');
      expect(event.action).toBe('press');
      expect(event.button).toBe(0);
      expect(event.shiftKey).toBe(true);
    });

    test('alt+click', () => {
      const event = parseSingleEvent('\x1b[<8;10;5M') as MouseEvent;
      expect(event.type).toBe('mouse');
      expect(event.action).toBe('press');
      expect(event.button).toBe(0);
      expect(event.altKey).toBe(true);
    });

    test('coordinates are 0-based (converted from 1-based SGR)', () => {
      const event = parseSingleEvent('\x1b[<0;1;1M') as MouseEvent;
      expect(event.x).toBe(0);
      expect(event.y).toBe(0);
    });

    test('large coordinates', () => {
      const event = parseSingleEvent('\x1b[<0;200;50M') as MouseEvent;
      expect(event.x).toBe(199);
      expect(event.y).toBe(49);
    });
  });

  describe('bracketed paste', () => {
    test('simple paste', () => {
      const event = parseSingleEvent('\x1b[200~hello world\x1b[201~') as PasteEvent;
      expect(event.type).toBe('paste');
      expect(event.text).toBe('hello world');
    });

    test('empty paste', () => {
      const event = parseSingleEvent('\x1b[200~\x1b[201~') as PasteEvent;
      expect(event.type).toBe('paste');
      expect(event.text).toBe('');
    });

    test('paste with newlines', () => {
      const event = parseSingleEvent('\x1b[200~line1\nline2\nline3\x1b[201~') as PasteEvent;
      expect(event.type).toBe('paste');
      expect(event.text).toBe('line1\nline2\nline3');
    });

    test('paste with special characters', () => {
      const event = parseSingleEvent('\x1b[200~hello\ttab\rreturn\x1b[201~') as PasteEvent;
      expect(event.type).toBe('paste');
      expect(event.text).toBe('hello\ttab\rreturn');
    });
  });

  describe('bare escape (timeout)', () => {
    test('bare ESC with flushEscapeTimeout', () => {
      const events: InputEvent[] = [];
      const parser = new InputParser((event) => events.push(event));

      parser.feed('\x1b');
      expect(events.length).toBe(0); // Not yet emitted, waiting for timeout

      parser.flushEscapeTimeout();
      expect(events.length).toBe(1);
      expect((events[0] as KeyEvent).key).toBe('Escape');

      parser.dispose();
    });

    test('ESC followed by data does NOT emit bare escape', () => {
      const events: InputEvent[] = [];
      const parser = new InputParser((event) => events.push(event));

      parser.feed('\x1b');
      parser.feed('[A'); // Complete CSI sequence

      expect(events.length).toBe(1);
      expect((events[0] as KeyEvent).key).toBe('ArrowUp');

      parser.dispose();
    });

    test('bare ESC with real timeout', async () => {
      const events: InputEvent[] = [];
      const parser = new InputParser((event) => events.push(event));

      parser.feed('\x1b');
      expect(events.length).toBe(0);

      // Wait for timeout (500ms + buffer)
      await new Promise(resolve => setTimeout(resolve, 600));

      expect(events.length).toBe(1);
      expect((events[0] as KeyEvent).key).toBe('Escape');

      parser.dispose();
    });
  });

  describe('meta (alt) key via bare escape prefix', () => {
    test('Alt+a: ESC followed by a', () => {
      const events: InputEvent[] = [];
      const parser = new InputParser((event) => events.push(event));
      parser.feed('\x1ba');
      parser.dispose();

      expect(events.length).toBe(1);
      expect((events[0] as KeyEvent).key).toBe('a');
      expect((events[0] as KeyEvent).altKey).toBe(true);
    });

    test('Alt+Enter: ESC followed by \\r', () => {
      const events: InputEvent[] = [];
      const parser = new InputParser((event) => events.push(event));
      parser.feed('\x1b\r');
      parser.dispose();

      expect(events.length).toBe(1);
      expect((events[0] as KeyEvent).key).toBe('Enter');
      expect((events[0] as KeyEvent).altKey).toBe(true);
    });
  });

  describe('focus events', () => {
    test('focus in: ESC [ I', () => {
      const event = parseSingleEvent('\x1b[I') as FocusEvent;
      expect(event.type).toBe('focus');
      expect(event.focused).toBe(true);
    });

    test('focus out: ESC [ O', () => {
      const event = parseSingleEvent('\x1b[O') as FocusEvent;
      expect(event.type).toBe('focus');
      expect(event.focused).toBe(false);
    });
  });

  describe('partial input (bytes arriving one at a time)', () => {
    test('CSI arrow key fed character by character', () => {
      const events: InputEvent[] = [];
      const parser = new InputParser((event) => events.push(event));

      parser.feed('\x1b');
      expect(events.length).toBe(0);

      parser.feed('[');
      expect(events.length).toBe(0);

      parser.feed('A');
      expect(events.length).toBe(1);
      expect((events[0] as KeyEvent).key).toBe('ArrowUp');

      parser.dispose();
    });

    test('SGR mouse fed character by character', () => {
      const events: InputEvent[] = [];
      const parser = new InputParser((event) => events.push(event));

      // Feed \x1b[<0;10;5M one char at a time
      const sequence = '\x1b[<0;10;5M';
      for (const char of sequence) {
        parser.feed(char);
      }

      expect(events.length).toBe(1);
      const event = events[0] as MouseEvent;
      expect(event.type).toBe('mouse');
      expect(event.action).toBe('press');
      expect(event.button).toBe(0);
      expect(event.x).toBe(9);
      expect(event.y).toBe(4);

      parser.dispose();
    });

    test('function key fed character by character', () => {
      const events: InputEvent[] = [];
      const parser = new InputParser((event) => events.push(event));

      // Feed \x1b[11~ one char at a time
      for (const char of '\x1b[11~') {
        parser.feed(char);
      }

      expect(events.length).toBe(1);
      expect((events[0] as KeyEvent).key).toBe('f1');

      parser.dispose();
    });

    test('modified arrow fed character by character', () => {
      const events: InputEvent[] = [];
      const parser = new InputParser((event) => events.push(event));

      // Feed \x1b[1;5A one char at a time
      for (const char of '\x1b[1;5A') {
        parser.feed(char);
      }

      expect(events.length).toBe(1);
      const event = events[0] as KeyEvent;
      expect(event.key).toBe('ArrowUp');
      expect(event.ctrlKey).toBe(true);

      parser.dispose();
    });

    test('paste fed character by character', () => {
      const events: InputEvent[] = [];
      const parser = new InputParser((event) => events.push(event));

      const sequence = '\x1b[200~hi\x1b[201~';
      for (const char of sequence) {
        parser.feed(char);
      }

      expect(events.length).toBe(1);
      const event = events[0] as PasteEvent;
      expect(event.type).toBe('paste');
      expect(event.text).toBe('hi');

      parser.dispose();
    });
  });

  describe('mixed sequences', () => {
    test('printable text followed by arrow key', () => {
      const events = parseEvents('abc\x1b[A');
      expect(events.length).toBe(4);
      expect((events[0] as KeyEvent).key).toBe('a');
      expect((events[1] as KeyEvent).key).toBe('b');
      expect((events[2] as KeyEvent).key).toBe('c');
      expect((events[3] as KeyEvent).key).toBe('ArrowUp');
    });

    test('multiple escape sequences in one feed', () => {
      const events = parseEvents('\x1b[A\x1b[B\x1b[C');
      expect(events.length).toBe(3);
      expect((events[0] as KeyEvent).key).toBe('ArrowUp');
      expect((events[1] as KeyEvent).key).toBe('ArrowDown');
      expect((events[2] as KeyEvent).key).toBe('ArrowRight');
    });
  });

  describe('dispose', () => {
    test('disposed parser does not emit events', () => {
      const events: InputEvent[] = [];
      const parser = new InputParser((event) => events.push(event));

      parser.dispose();
      parser.feed('a');

      expect(events.length).toBe(0);
    });

    test('dispose clears escape timeout', () => {
      const events: InputEvent[] = [];
      const parser = new InputParser((event) => events.push(event));

      parser.feed('\x1b');
      parser.dispose();

      // Wait for timeout period — should NOT emit
      return new Promise<void>(resolve => {
        setTimeout(() => {
          expect(events.length).toBe(0);
          resolve();
        }, 600);
      });
    });
  });

  describe('double escape', () => {
    test('double ESC emits Escape then starts new escape sequence', () => {
      const events: InputEvent[] = [];
      const parser = new InputParser((event) => events.push(event));

      parser.feed('\x1b\x1b');
      // First ESC is emitted, second is pending
      expect(events.length).toBe(1);
      expect((events[0] as KeyEvent).key).toBe('Escape');

      parser.flushEscapeTimeout();
      expect(events.length).toBe(2);
      expect((events[1] as KeyEvent).key).toBe('Escape');

      parser.dispose();
    });
  });

  describe('Buffer input', () => {
    test('accepts Buffer input', () => {
      const events: InputEvent[] = [];
      const parser = new InputParser((event) => events.push(event));

      parser.feed(Buffer.from('a'));
      expect(events.length).toBe(1);
      expect((events[0] as KeyEvent).key).toBe('a');

      parser.dispose();
    });

    test('accepts Buffer with escape sequence', () => {
      const events: InputEvent[] = [];
      const parser = new InputParser((event) => events.push(event));

      parser.feed(Buffer.from('\x1b[A'));
      expect(events.length).toBe(1);
      expect((events[0] as KeyEvent).key).toBe('ArrowUp');

      parser.dispose();
    });
  });

  // -----------------------------------------------------------------------
  // Pause / Resume (TUI suspend for external editor)
  // -----------------------------------------------------------------------

  describe('pause / resume', () => {
    test('isPaused is false by default', () => {
      const parser = new InputParser(() => {});
      expect(parser.isPaused).toBe(false);
      parser.dispose();
    });

    test('pause() sets isPaused to true', () => {
      const parser = new InputParser(() => {});
      parser.pause();
      expect(parser.isPaused).toBe(true);
      parser.dispose();
    });

    test('resume() sets isPaused back to false', () => {
      const parser = new InputParser(() => {});
      parser.pause();
      parser.resume();
      expect(parser.isPaused).toBe(false);
      parser.dispose();
    });

    test('feed() while paused discards data', () => {
      const events: InputEvent[] = [];
      const parser = new InputParser((event) => events.push(event));

      parser.pause();
      parser.feed('abc');

      expect(events.length).toBe(0);
      parser.dispose();
    });

    test('feed() after resume processes normally', () => {
      const events: InputEvent[] = [];
      const parser = new InputParser((event) => events.push(event));

      parser.pause();
      parser.feed('a'); // should be discarded
      expect(events.length).toBe(0);

      parser.resume();
      parser.feed('b'); // should be processed
      expect(events.length).toBe(1);
      expect((events[0] as KeyEvent).key).toBe('b');

      parser.dispose();
    });

    test('pause does not lose state for in-flight sequences after resume', () => {
      const events: InputEvent[] = [];
      const parser = new InputParser((event) => events.push(event));

      // Feed a character, pause, resume, and feed another
      parser.feed('x');
      expect(events.length).toBe(1);

      parser.pause();
      parser.feed('y'); // discarded
      expect(events.length).toBe(1);

      parser.resume();
      parser.feed('z');
      expect(events.length).toBe(2);
      expect((events[1] as KeyEvent).key).toBe('z');

      parser.dispose();
    });
  });
});
