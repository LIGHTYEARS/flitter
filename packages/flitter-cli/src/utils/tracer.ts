// Tracer infrastructure — TraceStore, Span types, and Tracer factory.
// Aligned with AMP's traceStore pattern (DLR createTracer(parentSpan)).
// Spans are emitted as NDJSON entries (kind: 'span') via writeEntry() on close.

import { writeEntry } from './logger';

/** A timestamped event recorded within a span. */
export interface SpanEvent {
  name: string;
  time: string;        // ISO 8601
  attributes?: Record<string, unknown>;
}

/** A completed or in-flight trace span, emitted as a single NDJSON entry on close. */
export interface Span {
  kind: 'span';
  traceId: string;
  spanId: string;
  parentSpanId: string | null;
  name: string;
  startTime: string;    // ISO 8601
  endTime?: string;     // ISO 8601, set on close
  duration?: number;    // ms, computed on close
  attributes: Record<string, unknown>;
  events: SpanEvent[];
  status: 'ok' | 'error';
}

/** Opaque handle returned by startSpan, used to reference active spans. */
export interface SpanHandle {
  readonly spanId: string;
  readonly traceId: string;
}

/** Core span store with full span lifecycle operations. */
export class TraceStore {
  private _spans: Map<string, Span> = new Map();

  private _generateId(): string {
    return crypto.randomUUID();
  }

  /**
   * Start a new span. If no traceId is provided, one is inherited from the
   * parent span or generated fresh (for root spans).
   */
  startSpan(
    name: string,
    parentSpanId: string | null,
    attributes?: Record<string, unknown>,
    traceId?: string,
  ): SpanHandle {
    const spanId = this._generateId();

    let resolvedTraceId: string;
    if (traceId !== undefined) {
      resolvedTraceId = traceId;
    } else if (parentSpanId !== null) {
      const parent = this._spans.get(parentSpanId);
      resolvedTraceId = parent ? parent.traceId : this._generateId();
    } else {
      resolvedTraceId = this._generateId();
    }

    const span: Span = {
      kind: 'span',
      traceId: resolvedTraceId,
      spanId,
      parentSpanId,
      name,
      startTime: new Date().toISOString(),
      attributes: attributes ?? {},
      events: [],
      status: 'ok',
    };

    this._spans.set(spanId, span);
    return { spanId, traceId: resolvedTraceId };
  }

  /**
   * Record a timestamped event within an active span.
   * No-op if the span is not found.
   */
  addSpanEvent(spanId: string, name: string, attributes?: Record<string, unknown>): void {
    const span = this._spans.get(spanId);
    if (!span) return;
    span.events.push({ name, time: new Date().toISOString(), attributes });
  }

  /**
   * Merge additional attributes into an active span.
   * No-op if the span is not found.
   */
  setSpanAttributes(spanId: string, attributes: Record<string, unknown>): void {
    const span = this._spans.get(spanId);
    if (!span) return;
    Object.assign(span.attributes, attributes);
  }

  /**
   * Close a span, compute its duration, emit it as NDJSON, and remove it from
   * the active map. No-op if the span is not found (idempotent).
   */
  endSpan(spanId: string, status?: 'ok' | 'error', finalAttributes?: Record<string, unknown>): void {
    const span = this._spans.get(spanId);
    if (!span) return;

    if (finalAttributes) {
      Object.assign(span.attributes, finalAttributes);
    }

    span.endTime = new Date().toISOString();
    span.duration = new Date(span.endTime).getTime() - new Date(span.startTime).getTime();

    if (status !== undefined) {
      span.status = status;
    }

    writeEntry(span as unknown as Record<string, unknown>);
    this._spans.delete(spanId);
  }

  /**
   * Check if a span is still active (not yet ended).
   */
  isActive(spanId: string): boolean {
    return this._spans.has(spanId);
  }
}

/**
 * Create a child-span factory bound to a parent span.
 * Aligned with AMP's createTracer(parentSpan) → DLR(traceStore, parentSpan) pattern.
 */
export function createTracer(
  store: TraceStore,
  parentHandle: SpanHandle,
): {
  startActiveSpan: <T>(
    name: string,
    attributes: Record<string, unknown>,
    fn: (handle: SpanHandle) => Promise<T>,
  ) => Promise<T>;
} {
  return {
    async startActiveSpan<T>(
      name: string,
      attributes: Record<string, unknown>,
      fn: (handle: SpanHandle) => Promise<T>,
    ): Promise<T> {
      const child = store.startSpan(name, parentHandle.spanId, attributes, parentHandle.traceId);
      try {
        return await fn(child);
      } catch (err) {
        store.endSpan(child.spanId, 'error');
        throw err;
      } finally {
        // Only end if not already ended by the catch block (idempotent via isActive check)
        if (store.isActive(child.spanId)) {
          store.endSpan(child.spanId, 'ok');
        }
      }
    },
  };
}

/** Module-level TraceStore singleton for the CLI process. */
export const traceStore = new TraceStore();
