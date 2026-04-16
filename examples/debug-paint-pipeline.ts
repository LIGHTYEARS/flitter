/**
 * Focused trace: markNeedsLayout propagation.
 */
import { State } from "../packages/tui/src/tree/stateful-widget.js";
import { BuildOwner } from "../packages/tui/src/tree/build-owner.js";
import { TuiController } from "../packages/tui/src/tui/tui-controller.js";
import { Screen } from "../packages/tui/src/screen/screen.js";
import { AnsiRenderer } from "../packages/tui/src/screen/ansi-renderer.js";
import { RenderParagraph } from "../packages/tui/src/widgets/rich-text.js";
import { PipelineOwner } from "../packages/tui/src/tree/pipeline-owner.js";
import { RenderBox } from "../packages/tui/src/tree/render-box.js";
import { RenderObject } from "../packages/tui/src/tree/render-object.js";

let frameCount = 0;
let tracing = false;

// Trace markNeedsLayout on all RenderObjects
const origMarkNeedsLayout = RenderObject.prototype.markNeedsLayout;
RenderObject.prototype.markNeedsLayout = function () {
  if (tracing) {
    const name = this.constructor.name;
    const alreadyDirty = (this as any)._needsLayout;
    const hasParent = (this as any)._parent != null;
    const attached = (this as any)._attached;
    console.error(`[T] markNeedsLayout ${name}: alreadyDirty=${alreadyDirty} hasParent=${hasParent} attached=${attached}`);
  }
  origMarkNeedsLayout.call(this);
};

// Trace RenderParagraph.textSpan setter
const textSpanDesc = Object.getOwnPropertyDescriptor(RenderParagraph.prototype, "textSpan");
if (textSpanDesc?.set) {
  const origSet = textSpanDesc.set;
  Object.defineProperty(RenderParagraph.prototype, "textSpan", {
    get: textSpanDesc.get,
    set(value: any) {
      if (tracing) {
        const oldText = (this as any)._textSpan?.toPlainText?.() ?? "(null)";
        const newText = value?.toPlainText?.() ?? "(null)";
        const isEqual = (this as any)._textSpan?.equals?.(value) ?? false;
        if (!isEqual) {
          console.error(`[T] textSpan CHANGED: "${oldText}" → "${newText}"`);
        }
      }
      origSet.call(this, value);
    },
    configurable: true,
    enumerable: true,
  });
}

// Trace flushLayout
const origFlushLayout = PipelineOwner.prototype.flushLayout;
PipelineOwner.prototype.flushLayout = function () {
  if (tracing) {
    const root = (this as any)._rootRenderObject;
    console.error(`[T] flushLayout: root=${root?.constructor.name} root._needsLayout=${root?._needsLayout}`);
  }
  const result = origFlushLayout.call(this);
  if (tracing) {
    console.error(`[T] flushLayout DONE result=${result}`);
  }
  return result;
};

// Trace RenderBox.layout for RenderParagraph
const origLayout = RenderBox.prototype.layout;
RenderBox.prototype.layout = function (constraints: any) {
  if (tracing && this.constructor.name === "RenderParagraph") {
    console.error(`[T] RenderParagraph.layout: _needsLayout=${(this as any)._needsLayout}`);
  }
  origLayout.call(this, constraints);
};

// Trace buildScopes
const origBuildScopes = BuildOwner.prototype.buildScopes;
BuildOwner.prototype.buildScopes = function () {
  frameCount++;
  if (frameCount >= 2) tracing = true;
  console.error(`[T] === frame ${frameCount} buildScopes START ===`);
  origBuildScopes.call(this);
  console.error(`[T] === frame ${frameCount} buildScopes END ===`);
};

// Trace render
const origRender = TuiController.prototype.render;
TuiController.prototype.render = function () {
  const screen = (this as any).screen as Screen;
  const renderer = (this as any).renderer as AnsiRenderer;
  const output = renderer.render(screen);
  if (tracing) {
    if (output) {
      const match = output.match(/Last event: ([^\x1b]+)/);
      console.error(`[T] render: text="${match ? match[1].trim() : "?"}"`);
      (this as any).ttyOutput?.stream.write(output);
    } else {
      console.error(`[T] render: output=null (no diff)`);
    }
  } else if (output) {
    (this as any).ttyOutput?.stream.write(output);
  }
  screen.present();
};

// Trace setState
const origSetState = State.prototype.setState;
State.prototype.setState = function (fn?: () => void) {
  if (!(this as any)._mounted) throw new Error("setState called after dispose");
  const self = this as any;
  console.error(`[T] ====== setState ENTER ======`);
  if (fn) fn();
  self._element!.markNeedsRebuild();
  console.error(`[T] ====== setState EXIT ======`);
};

await import("./tui-interactive-demo.js");
