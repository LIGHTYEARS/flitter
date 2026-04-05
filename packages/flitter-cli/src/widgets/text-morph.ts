// TextMorph — animated text morphing widget with three-phase transitions.
//
// StatefulWidget port of flitter-amp/src/widgets/text-morph.ts.
// Uses AnimationController to drive a three-phase character morph:
//   Phase 1: Dim/fade the previous characters
//   Phase 2: Show random scramble characters
//   Phase 3: Reveal the target characters
//
// When the `text` prop changes, the animation resets and plays forward.
// The utility class in utils/text-animations.ts provides raw ANSI render logic;
// this widget uses the flitter-core AnimationController and TextSpan output,
// matching AMP's architecture.

import {
  StatefulWidget, State, Widget, type BuildContext,
} from '../../../flitter-core/src/framework/widget';
import { Text } from '../../../flitter-core/src/widgets/text';
import { TextStyle } from '../../../flitter-core/src/core/text-style';
import { TextSpan } from '../../../flitter-core/src/core/text-span';
import { Color } from '../../../flitter-core/src/core/color';
import { AnimationController } from '../../../flitter-core/src/animation/animation-controller';
import { Curves } from '../../../flitter-core/src/animation/curves';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface TextMorphProps {
  text: string;
  style?: TextStyle;
  duration?: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MORPH_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';

// ---------------------------------------------------------------------------
// TextMorph widget
// ---------------------------------------------------------------------------

/**
 * Animated text morphing widget.
 *
 * When the `text` prop changes, the widget animates a three-phase character
 * morph from the previous text to the new text using AnimationController.
 * Each character position transitions independently based on its index,
 * creating a wave-like morph from left to right.
 */
export class TextMorph extends StatefulWidget {
  readonly text: string;
  readonly style: TextStyle | undefined;
  readonly duration: number;

  constructor(props: TextMorphProps) {
    super();
    this.text = props.text;
    this.style = props.style;
    this.duration = props.duration ?? 1500;
  }

  createState(): TextMorphState {
    return new TextMorphState();
  }
}

// ---------------------------------------------------------------------------
// TextMorphState
// ---------------------------------------------------------------------------

class TextMorphState extends State<TextMorph> {
  private _controller!: AnimationController;
  private _previousText: string = '';
  private _currentText: string = '';
  private _seed: number = 0;

  override initState(): void {
    super.initState();
    this._currentText = this.widget.text;
    this._previousText = this.widget.text;
    this._seed = Math.floor(Math.random() * 1000);
    this._controller = new AnimationController({
      duration: this.widget.duration,
      curve: Curves.easeInOut,
    });
    this._controller.addListener(() => this.setState(() => {}));
  }

  override didUpdateWidget(oldWidget: TextMorph): void {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.text !== this.widget.text) {
      this._previousText = this._currentText;
      this._currentText = this.widget.text;
      this._seed = Math.floor(Math.random() * 1000);
      this._controller.reset();
      this._controller.forward();
    }
  }

  override dispose(): void {
    this._controller.dispose();
    super.dispose();
  }

  build(_context: BuildContext): Widget {
    const progress = this._controller.value;
    const prev = this._previousText;
    const next = this._currentText;
    const maxLen = Math.max(prev.length, next.length);
    const baseStyle = this.widget.style;
    const baseColor = baseStyle?.foreground ?? Color.defaultColor;

    if (progress >= 1 || prev === next) {
      return new Text({
        text: new TextSpan({
          text: next,
          style: baseStyle,
        }),
      });
    }

    // Convert base color to RGB for dimming computation
    const baseRgb = baseColor.toRgb();
    const hasRgb = baseRgb.mode === 'rgb';
    const baseR = hasRgb ? baseRgb.r : 200;
    const baseG = hasRgb ? baseRgb.g : 200;
    const baseB = hasRgb ? baseRgb.b : 200;

    const spans: TextSpan[] = [];
    for (let i = 0; i < maxLen; i++) {
      const threshold = (i + 1) / (maxLen + 1);

      if (progress >= threshold) {
        const ch = i < next.length ? next[i] : '';
        if (ch) {
          spans.push(new TextSpan({
            text: ch,
            style: baseStyle,
          }));
        }
      } else if (progress < threshold * 0.3) {
        const ch = i < prev.length ? prev[i] : ' ';
        const dimAmount = progress / (threshold * 0.3);
        const r = Math.round(baseR * (1 - dimAmount * 0.5));
        const g = Math.round(baseG * (1 - dimAmount * 0.5));
        const b = Math.round(baseB * (1 - dimAmount * 0.5));
        spans.push(new TextSpan({
          text: ch,
          style: new TextStyle({
            foreground: Color.rgb(Math.max(0, r), Math.max(0, g), Math.max(0, b)),
          }),
        }));
      } else {
        const morphIdx = Math.floor((this._seed + i + progress * 47) * 13.37) % MORPH_CHARS.length;
        const ch = MORPH_CHARS[Math.abs(morphIdx) % MORPH_CHARS.length];
        spans.push(new TextSpan({
          text: ch,
          style: new TextStyle({
            foreground: Color.brightBlack,
            dim: true,
          }),
        }));
      }
    }

    return new Text({
      text: new TextSpan({ children: spans }),
    });
  }
}
