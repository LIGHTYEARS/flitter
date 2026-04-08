// Unit tests for TraceStore — span lifecycle, nesting, events, and attributes.
// Uses mock.module() to intercept writeEntry calls from the tracer.

import { describe, test, expect, beforeEach, mock } from 'bun:test';

// ---------------------------------------------------------------------------
// Capture writeEntry calls by intercepting the module
// ---------------------------------------------------------------------------

const capturedEntries: Record<string, unknown>[] = [];

mock.module('../utils/logger', () => ({
  writeEntry: (entry: Record<string, unknown>) => {
    capturedEntries.push(entry);
  },
  log: {
    debug: () => {},
    info: () => {},
    warn: () => {},
    error: () => {},
    fatal: () => {},
  },
}));

// Import after mocking
import { TraceStore } from '../utils/tracer';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function freshStore(): TraceStore {
  return new TraceStore();
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('TraceStore', () => {
  beforeEach(() => {
    capturedEntries.length = 0;
  });

  test('startSpan returns a unique spanId', () => {
    const store = freshStore();
    const h1 = store.startSpan('agent', null);
    const h2 = store.startSpan('agent', null);

    expect(typeof h1.spanId).toBe('string');
    expect(h1.spanId.length).toBeGreaterThan(0);
    expect(typeof h2.spanId).toBe('string');
    expect(h2.spanId.length).toBeGreaterThan(0);
    expect(h1.spanId).not.toBe(h2.spanId);
  });

  test('startSpan with parent creates child span', () => {
    const store = freshStore();
    const parent = store.startSpan('agent', null);
    const child = store.startSpan('inference', parent.spanId);

    expect(parent.spanId.length).toBeGreaterThan(0);
    expect(child.spanId.length).toBeGreaterThan(0);
    expect(parent.spanId).not.toBe(child.spanId);
  });

  test('endSpan writes a span record to logger', () => {
    const store = freshStore();
    const handle = store.startSpan('agent', null);
    store.endSpan(handle.spanId, 'ok');

    expect(capturedEntries.length).toBe(1);
    const entry = capturedEntries[0];

    expect(entry.kind).toBe('span');
    expect(entry.name).toBe('agent');
    expect(entry.spanId).toBe(handle.spanId);
    expect(entry.status).toBe('ok');
    expect(typeof entry.startTime).toBe('string');
    // Verify ISO 8601 format
    expect(() => new Date(entry.startTime as string)).not.toThrow();
    expect(new Date(entry.startTime as string).toISOString()).toBe(entry.startTime);
    expect(typeof entry.endTime).toBe('string');
    expect(() => new Date(entry.endTime as string)).not.toThrow();
    expect(typeof entry.duration).toBe('number');
    expect(entry.duration as number).toBeGreaterThanOrEqual(0);
  });

  test('endSpan with attributes merges into span record', () => {
    const store = freshStore();
    const handle = store.startSpan('inference', null);
    store.endSpan(handle.spanId, 'ok', { model: 'gpt-4' });

    expect(capturedEntries.length).toBe(1);
    const entry = capturedEntries[0] as Record<string, unknown>;
    const attributes = entry.attributes as Record<string, unknown>;
    expect(attributes.model).toBe('gpt-4');
  });

  test('addSpanEvent records events on the span', () => {
    const store = freshStore();
    const handle = store.startSpan('inference', null);
    store.addSpanEvent(handle.spanId, 'first-token', { ttftMs: 150 });
    store.endSpan(handle.spanId, 'ok');

    expect(capturedEntries.length).toBe(1);
    const entry = capturedEntries[0] as Record<string, unknown>;
    const events = entry.events as Array<Record<string, unknown>>;
    expect(Array.isArray(events)).toBe(true);
    expect(events.length).toBe(1);
    expect(events[0].name).toBe('first-token');
    const eventAttrs = events[0].attributes as Record<string, unknown>;
    expect(eventAttrs.ttftMs).toBe(150);
  });

  test('setSpanAttributes merges attributes', () => {
    const store = freshStore();
    const handle = store.startSpan('agent', null);
    store.setSpanAttributes(handle.spanId, { a: 1 });
    store.setSpanAttributes(handle.spanId, { b: 2 });
    store.endSpan(handle.spanId, 'ok');

    expect(capturedEntries.length).toBe(1);
    const entry = capturedEntries[0] as Record<string, unknown>;
    const attributes = entry.attributes as Record<string, unknown>;
    expect(attributes.a).toBe(1);
    expect(attributes.b).toBe(2);
  });

  test('endSpan on already-ended span is a no-op', () => {
    const store = freshStore();
    const handle = store.startSpan('agent', null);
    store.endSpan(handle.spanId, 'ok');
    store.endSpan(handle.spanId, 'ok'); // Second call — no-op

    expect(capturedEntries.length).toBe(1);
  });

  test('startSpan returns SpanHandle with spanId and traceId', () => {
    const store = freshStore();
    const handle = store.startSpan('agent', null);

    expect(typeof handle.spanId).toBe('string');
    expect(handle.spanId.length).toBeGreaterThan(0);
    expect(typeof handle.traceId).toBe('string');
    expect(handle.traceId.length).toBeGreaterThan(0);
  });

  test('nested spans share the same traceId', () => {
    const store = freshStore();
    const parent = store.startSpan('agent', null);
    const child = store.startSpan('inference', parent.spanId);

    expect(child.traceId).toBe(parent.traceId);
  });
});
