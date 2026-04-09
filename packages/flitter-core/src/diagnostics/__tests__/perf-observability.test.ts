import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { FrameTimeline } from '../frame-timeline';
import { PerfAttribution } from '../perf-attribution';
import { NdjsonPerfSink, createPerfSinkFromEnv } from '../perf-sink';
import type { FramePerfData } from '../perf-sink';
import type { TimelineSpan } from '../frame-timeline';
import { FrameStats } from '../frame-stats';
import { debugFlags, resetDebugFlags } from '../debug-flags';

describe('FrameTimeline', () => {
  beforeEach(() => {
    resetDebugFlags();
  });

  it('is no-op when debugTimeline is false', () => {
    const timeline = new FrameTimeline();
    debugFlags.debugTimeline = false;
    timeline.beginFrame(1);
    expect(timeline.lastFrameSpan).toBeNull();
  });

  it('generates root span with 4 phase children when enabled', () => {
    debugFlags.debugTimeline = true;
    const timeline = new FrameTimeline();
    timeline.beginFrame(42);
    timeline.beginPhase('build');
    timeline.endPhase('build', { dirtyNodes: 5 });
    timeline.beginPhase('layout');
    timeline.endPhase('layout');
    timeline.beginPhase('paint');
    timeline.endPhase('paint');
    timeline.beginPhase('render');
    timeline.endPhase('render');
    timeline.endFrame({ totalMs: 10, budgetPercent: 60 });

    const span = timeline.lastFrameSpan;
    expect(span).not.toBeNull();
    expect(span!.name).toBe('frame:42');
    expect(span!.kind).toBe('span');
    expect(span!.children.length).toBe(4);
    expect(span!.children[0]!.name).toBe('build');
    expect(span!.children[0]!.attributes.dirtyNodes).toBe(5);
    expect(span!.durationMs).toBeGreaterThanOrEqual(0);
    expect(span!.attributes.totalMs).toBe(10);
    expect(span!.attributes.budgetPercent).toBe(60);
  });

  it('sends span to sink when set', () => {
    debugFlags.debugTimeline = true;
    const timeline = new FrameTimeline();
    const captured: TimelineSpan[] = [];
    timeline.setSink({ onSpan: (s) => captured.push(s) });
    timeline.beginFrame(1);
    timeline.endFrame();
    expect(captured.length).toBe(1);
    expect(captured[0]!.name).toBe('frame:1');
  });

  it('each span has startTime and endTime', () => {
    debugFlags.debugTimeline = true;
    const timeline = new FrameTimeline();
    timeline.beginFrame(1);
    timeline.beginPhase('build');
    timeline.endPhase('build');
    timeline.endFrame();
    const span = timeline.lastFrameSpan!;
    expect(typeof span.startTime).toBe('number');
    expect(typeof span.endTime).toBe('number');
    expect(span.durationMs).toBeGreaterThanOrEqual(0);
    expect(span.children[0]!.durationMs).toBeGreaterThanOrEqual(0);
  });
});

describe('PerfAttribution', () => {
  beforeEach(() => {
    PerfAttribution.reset();
  });

  afterEach(() => {
    PerfAttribution.reset();
  });

  it('records build stats and returns top slow widgets', () => {
    const pa = PerfAttribution.instance;
    pa.recordBuild('WidgetA', 5.0);
    pa.recordBuild('WidgetB', 10.0);
    pa.recordBuild('WidgetA', 3.0);

    const top = pa.getTopSlowWidgets(2, 'build');
    expect(top.length).toBe(2);
    expect(top[0]!.name).toBe('WidgetB');
    expect(top[0]!.totalMs).toBe(10.0);
    expect(top[0]!.count).toBe(1);
    expect(top[0]!.avgMs).toBe(10.0);
    expect(top[1]!.name).toBe('WidgetA');
    expect(top[1]!.totalMs).toBe(8.0);
    expect(top[1]!.count).toBe(2);
    expect(top[1]!.avgMs).toBe(4.0);
  });

  it('records layout stats', () => {
    const pa = PerfAttribution.instance;
    pa.recordLayout('RenderFlex', 2.0);
    pa.recordLayout('RenderFlex', 3.0);
    const top = pa.getTopSlowWidgets(1, 'layout');
    expect(top[0]!.name).toBe('RenderFlex');
    expect(top[0]!.totalMs).toBe(5.0);
  });

  it('records paint stats', () => {
    const pa = PerfAttribution.instance;
    pa.recordPaint('RenderBox', 1.5);
    const top = pa.getTopSlowWidgets(1, 'paint');
    expect(top[0]!.name).toBe('RenderBox');
    expect(top[0]!.totalMs).toBe(1.5);
  });

  it('sorts by totalMs descending', () => {
    const pa = PerfAttribution.instance;
    pa.recordBuild('Small', 1.0);
    pa.recordBuild('Large', 100.0);
    pa.recordBuild('Medium', 50.0);
    const top = pa.getTopSlowWidgets(3);
    expect(top[0]!.name).toBe('Large');
    expect(top[1]!.name).toBe('Medium');
    expect(top[2]!.name).toBe('Small');
  });

  it('resetAll clears everything', () => {
    const pa = PerfAttribution.instance;
    pa.recordBuild('Widget', 5.0);
    pa.resetAll();
    expect(pa.getTopSlowWidgets(5)).toEqual([]);
    expect(pa.frameBuildCount).toBe(0);
    expect(pa.frameLayoutCount).toBe(0);
  });

  it('resetFrame only resets per-frame counters', () => {
    const pa = PerfAttribution.instance;
    pa.recordBuild('Widget', 5.0);
    pa.recordLayout('RO', 2.0);
    expect(pa.frameBuildCount).toBe(1);
    expect(pa.frameLayoutCount).toBe(1);
    pa.resetFrame();
    expect(pa.frameBuildCount).toBe(0);
    expect(pa.frameLayoutCount).toBe(0);
    expect(pa.getTopSlowWidgets(1, 'build').length).toBe(1);
  });
});

describe('NdjsonPerfSink', () => {
  it('onFrame outputs valid JSON with kind:frame', () => {
    const lines: string[] = [];
    const sink = new NdjsonPerfSink((line) => lines.push(line));
    const data: FramePerfData = {
      kind: 'frame',
      frameNumber: 1,
      totalMs: 12.5,
      phases: { build: 3, layout: 2, paint: 4, render: 3.5 },
      dirtyNodes: { build: 10, layout: 5 },
      repaintPercent: 15.2,
      bytesWritten: 4096,
    };
    sink.onFrame(data);
    expect(lines.length).toBe(1);
    const parsed = JSON.parse(lines[0]!);
    expect(parsed.kind).toBe('frame');
    expect(parsed.frameNumber).toBe(1);
    expect(parsed.totalMs).toBe(12.5);
  });

  it('onSpan outputs valid JSON with kind:span', () => {
    const lines: string[] = [];
    const sink = new NdjsonPerfSink((line) => lines.push(line));
    const span: TimelineSpan = {
      kind: 'span',
      name: 'frame:1',
      startTime: 100,
      endTime: 112,
      durationMs: 12,
      attributes: { totalMs: 12 },
      children: [],
    };
    sink.onSpan(span);
    expect(lines.length).toBe(1);
    const parsed = JSON.parse(lines[0]!);
    expect(parsed.kind).toBe('span');
    expect(parsed.name).toBe('frame:1');
  });
});

describe('createPerfSinkFromEnv', () => {
  const origEnv = process.env.FLITTER_PERF;

  afterEach(() => {
    if (origEnv !== undefined) {
      process.env.FLITTER_PERF = origEnv;
    } else {
      delete process.env.FLITTER_PERF;
    }
  });

  it('returns NdjsonPerfSink when FLITTER_PERF=ndjson', () => {
    process.env.FLITTER_PERF = 'ndjson';
    const sink = createPerfSinkFromEnv();
    expect(sink).not.toBeNull();
    expect(sink).toBeInstanceOf(NdjsonPerfSink);
  });

  it('returns null when FLITTER_PERF is not set', () => {
    delete process.env.FLITTER_PERF;
    const sink = createPerfSinkFromEnv();
    expect(sink).toBeNull();
  });
});

describe('FrameStats.getRecentFrameTimes', () => {
  it('returns recent frame times in order', () => {
    const stats = new FrameStats(10);
    stats.recordFrame(1.0);
    stats.recordFrame(2.0);
    stats.recordFrame(3.0);
    const recent = stats.getRecentFrameTimes(3);
    expect(recent).toEqual([1.0, 2.0, 3.0]);
  });

  it('returns fewer items when less data available', () => {
    const stats = new FrameStats(10);
    stats.recordFrame(5.0);
    const recent = stats.getRecentFrameTimes(10);
    expect(recent).toEqual([5.0]);
  });

  it('handles ring buffer wrap-around', () => {
    const stats = new FrameStats(4);
    stats.recordFrame(1.0);
    stats.recordFrame(2.0);
    stats.recordFrame(3.0);
    stats.recordFrame(4.0);
    stats.recordFrame(5.0);
    const recent = stats.getRecentFrameTimes(3);
    expect(recent).toEqual([3.0, 4.0, 5.0]);
  });
});

describe('FrameStats.phaseP50', () => {
  it('returns median phase time', () => {
    const stats = new FrameStats(10);
    stats.recordPhase('build', 1.0);
    stats.recordPhase('build', 2.0);
    stats.recordPhase('build', 3.0);
    const p50 = stats.phaseP50('build');
    expect(p50).toBeGreaterThan(0);
  });
});

describe('debugFlags extensions', () => {
  beforeEach(() => {
    resetDebugFlags();
  });

  it('has new timeline and profile flags defaulting to false', () => {
    expect(debugFlags.debugTimeline).toBe(false);
    expect(debugFlags.debugProfileBuilds).toBe(false);
    expect(debugFlags.debugProfileLayouts).toBe(false);
    expect(debugFlags.debugProfilePaints).toBe(false);
  });

  it('can be set individually', () => {
    debugFlags.debugTimeline = true;
    expect(debugFlags.debugTimeline).toBe(true);
    debugFlags.debugProfileBuilds = true;
    expect(debugFlags.debugProfileBuilds).toBe(true);
  });
});
