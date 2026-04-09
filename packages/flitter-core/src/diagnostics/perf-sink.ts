import type { TimelineSpan } from './frame-timeline';

export interface FramePerfData {
  kind: 'frame';
  frameNumber: number;
  totalMs: number;
  phases: { build: number; layout: number; paint: number; render: number };
  dirtyNodes: { build: number; layout: number };
  repaintPercent: number;
  bytesWritten: number;
}

export interface PerfSink {
  onFrame(data: FramePerfData): void;
  onSpan(span: TimelineSpan): void;
}

export class NdjsonPerfSink implements PerfSink {
  private _write: (line: string) => void;

  constructor(write?: (line: string) => void) {
    this._write = write ?? ((line) => process.stderr.write(line + '\n'));
  }

  onFrame(data: FramePerfData): void {
    this._write(JSON.stringify(data));
  }

  onSpan(span: TimelineSpan): void {
    this._write(JSON.stringify({ kind: 'span', ...span }));
  }
}

export function createPerfSinkFromEnv(): PerfSink | null {
  if (process.env.FLITTER_PERF === 'ndjson') {
    return new NdjsonPerfSink();
  }
  return null;
}
