/**
 * BottomStatusLine — 1-row status line below the input box.
 *
 * Shows wave spinner animation + status text + "Esc to cancel" hint
 * during inference. Hidden (empty SizedBox) when idle.
 *
 * 逆向: IZT (jetbrains_wizard.js:681-708)
 *   - Wave spinner: xZT/fZT (misc_utils.js:1886-1930)
 *   - Frames: uIT = [" ", "∼", "≈", "≋", "≈", "∼"] (data_structures.js:76)
 *   - Interval: ME0 = 200ms (2026_tail_anonymous.js:20786)
 *   - Status text: HE0() state → message map (2483_unknown_HE0.js)
 *   - Spinner push: PIT() (2482_unknown_UE0.js:8-12)
 *   - Status text push: wE0() (2482_unknown_UE0.js:13-23)
 *
 * @module
 */

import type { BuildContext, Widget } from "@flitter/tui";
import {
  Color,
  RichText,
  Row,
  SizedBox,
  State,
  StatefulWidget,
  TextSpan,
  TextStyle,
} from "@flitter/tui";

// ── Wave spinner frames (逆向: uIT, data_structures.js:76) ──
export const WAVE_FRAMES = [" ", "\u223C", "\u2248", "\u224B", "\u2248", "\u223C"];
const WAVE_INTERVAL_MS = 200;

// ── Colors ──
// 逆向: PIT() uses T.colors.primary; wE0() uses T.colors.foreground dim:true
// 逆向: UE0() uses a.app.keybind for "Esc"
const PRIMARY_COLOR = Color.rgb(0x7a, 0xa2, 0xf7);
const MUTED_COLOR = Color.rgb(0x56, 0x5f, 0x89);
const KEYBIND_COLOR = Color.rgb(0xe0, 0xaf, 0x68);

/**
 * Map inference state to status text.
 * 逆向: HE0() (2483_unknown_HE0.js) maps agentLoopState to user-visible status.
 *
 * Amp maps named states directly; flitter tracks separate booleans,
 * so we derive the equivalent state from them in priority order:
 *   waitingForApproval → "awaiting_approval"
 *   runningToolCount > 0 → "running_tools"
 *   hasStartedStreaming → "streaming"
 *   inferenceState === "running" → "working"
 *   else → idle → null
 */
export function deriveBottomStatus(
  inferenceState: "idle" | "running",
  hasStartedStreaming: boolean,
  runningToolCount = 0,
  waitingForApproval = false,
): string | null {
  if (inferenceState === "idle") return null;
  if (waitingForApproval) return "Waiting for approval...";
  if (runningToolCount > 0) return "Running tools...";
  if (hasStartedStreaming) return "Streaming response...";
  return "Waiting for response...";
}

export interface BottomStatusLineConfig {
  inferenceState: "idle" | "running";
  hasStartedStreaming: boolean;
  runningToolCount: number;
  waitingForApproval: boolean;
}

/**
 * 1-row status line widget with animated wave spinner.
 *
 * 逆向: IZT (StatelessWidget in amp, but we need a StatefulWidget for timer).
 * Amp delegates the timer to fZT (State of xZT spinner sub-widget);
 * here we fold the timer into this widget's own state to keep the
 * component tree flat — one widget, one timer, same observable behavior.
 */
export class BottomStatusLine extends StatefulWidget {
  readonly config: BottomStatusLineConfig;
  constructor(config: BottomStatusLineConfig) {
    super();
    this.config = config;
  }
  createState() {
    return new _BottomStatusLineState();
  }
}

class _BottomStatusLineState extends State<BottomStatusLine> {
  private _frameIndex = 0;
  private _timer: ReturnType<typeof setInterval> | null = null;

  initState(): void {
    super.initState();
    this._startAnimation();
  }

  dispose(): void {
    this._stopAnimation();
    super.dispose();
  }

  didUpdateWidget(oldWidget: BottomStatusLine): void {
    super.didUpdateWidget(oldWidget);
    const wasActive = deriveBottomStatus(
      oldWidget.config.inferenceState,
      oldWidget.config.hasStartedStreaming,
      oldWidget.config.runningToolCount,
      oldWidget.config.waitingForApproval,
    );
    const isActive = deriveBottomStatus(
      this.widget.config.inferenceState,
      this.widget.config.hasStartedStreaming,
      this.widget.config.runningToolCount,
      this.widget.config.waitingForApproval,
    );
    if (!wasActive && isActive) this._startAnimation();
    if (wasActive && !isActive) this._stopAnimation();
  }

  private _startAnimation(): void {
    if (this._timer) return;
    this._timer = setInterval(() => {
      this.setState(() => {
        this._frameIndex = (this._frameIndex + 1) % WAVE_FRAMES.length;
      });
    }, WAVE_INTERVAL_MS);
  }

  private _stopAnimation(): void {
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
      this._frameIndex = 0;
    }
  }

  build(_context: BuildContext): Widget {
    const { inferenceState, hasStartedStreaming, runningToolCount, waitingForApproval } =
      this.widget.config;
    const statusText = deriveBottomStatus(
      inferenceState,
      hasStartedStreaming,
      runningToolCount,
      waitingForApproval,
    );

    // 逆向: IZT.build() returns XT({width:0, height:0}) when nothing to show
    if (!statusText) {
      return new SizedBox({ height: 1, width: 0 });
    }

    // 逆向: PIT() — push xZT spinner + SizedBox.horizontal(1) spacer
    // 逆向: wE0() — push Text(statusText, foreground dim:true)
    // 逆向: UE0(HtT/WtT) — push "Esc" + " to cancel" hint with keybind color
    const spinnerChar = WAVE_FRAMES[this._frameIndex];
    const children: TextSpan[] = [
      new TextSpan({
        text: `${spinnerChar} `,
        style: new TextStyle({ foreground: PRIMARY_COLOR }),
      }),
      new TextSpan({
        text: statusText,
        style: new TextStyle({ foreground: MUTED_COLOR, dim: true }),
      }),
    ];

    if (!waitingForApproval) {
      children.push(
        new TextSpan({ text: " ", style: new TextStyle({ foreground: MUTED_COLOR }) }),
        new TextSpan({ text: "Esc", style: new TextStyle({ foreground: KEYBIND_COLOR }) }),
        new TextSpan({
          text: " to cancel",
          style: new TextStyle({ foreground: MUTED_COLOR, dim: true }),
        }),
      );
    }

    return new SizedBox({
      height: 1,
      child: new Row({
        children: [new RichText({ text: new TextSpan({ children }) })],
      }),
    });
  }
}
