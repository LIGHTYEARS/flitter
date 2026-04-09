import { debugFlags } from './debug-flags';

export interface TimelineSpan {
  kind: 'span';
  name: string;
  startTime: number;
  endTime?: number;
  durationMs?: number;
  attributes: Record<string, unknown>;
  children: TimelineSpan[];
}

export interface PerfSinkLike {
  onSpan(span: TimelineSpan): void;
}

export class FrameTimeline {
  private _enabled: boolean = debugFlags.debugTimeline;
  private _frameNumber: number = 0;
  private _rootSpan: TimelineSpan | null = null;
  private _activePhaseSpan: TimelineSpan | null = null;
  private _sink: PerfSinkLike | null = null;
  private _lastFrameSpan: TimelineSpan | null = null;

  setSink(sink: PerfSinkLike | null): void {
    this._sink = sink;
  }

  beginFrame(frameNumber: number): void {
    if (!debugFlags.debugTimeline) return;
    this._frameNumber = frameNumber;
    this._rootSpan = {
      kind: 'span',
      name: `frame:${frameNumber}`,
      startTime: performance.now(),
      attributes: {},
      children: [],
    };
  }

  beginPhase(phase: string): void {
    if (!this._rootSpan) return;
    const span: TimelineSpan = {
      kind: 'span',
      name: phase,
      startTime: performance.now(),
      attributes: {},
      children: [],
    };
    this._rootSpan.children.push(span);
    this._activePhaseSpan = span;
  }

  endPhase(phase: string, attrs?: Record<string, unknown>): void {
    if (!this._activePhaseSpan) return;
    this._activePhaseSpan.endTime = performance.now();
    this._activePhaseSpan.durationMs =
      this._activePhaseSpan.endTime - this._activePhaseSpan.startTime;
    if (attrs) {
      Object.assign(this._activePhaseSpan.attributes, attrs);
    }
    this._activePhaseSpan = null;
  }

  endFrame(attrs?: Record<string, unknown>): void {
    if (!this._rootSpan) return;
    const rootSpan = this._rootSpan;
    rootSpan.endTime = performance.now();
    rootSpan.durationMs = rootSpan.endTime - rootSpan.startTime;
    if (attrs) {
      Object.assign(rootSpan.attributes, attrs);
    }
    this._lastFrameSpan = rootSpan;
    if (this._sink) {
      this._sink.onSpan(rootSpan);
    }
    this._rootSpan = null;
  }

  get lastFrameSpan(): TimelineSpan | null {
    return this._lastFrameSpan;
  }
}
