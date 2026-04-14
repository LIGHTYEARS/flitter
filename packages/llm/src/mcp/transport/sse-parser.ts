/**
 * @flitter/llm -- SSE Event Parser TransformStream
 *
 * Converts text/event-stream string chunks into structured SSEEvent objects.
 * Follows the W3C Server-Sent Events specification for parsing.
 * Translated from reversed eDT/NMT pattern. Zero external dependencies.
 */

/**
 * A parsed SSE event.
 */
export interface SSEEvent {
  /** Event type (from `event:` field). Undefined if not specified. */
  event?: string;
  /** Event data (from `data:` field(s)). Multi-line data joined with `\n`. */
  data: string;
  /** Event ID (from `id:` field). Undefined if not specified. */
  id?: string;
}

/**
 * Options for SSEEventParser.
 */
export interface SSEEventParserOptions {
  /** Called when a `retry:` field is parsed with a valid integer value. */
  onRetry?: (ms: number) => void;
  /** Called when a comment line (starting with `:`) is received. */
  onComment?: (comment: string) => void;
}

/**
 * Split a text buffer into complete lines, returning leftover partial line.
 * Handles \n, \r\n, and bare \r line endings per the SSE spec.
 */
function splitLines(text: string): [lines: string[], remainder: string] {
  const lines: string[] = [];
  let pos = 0;

  while (pos < text.length) {
    const crIdx = text.indexOf("\r", pos);
    const lfIdx = text.indexOf("\n", pos);

    let eolIdx = -1;
    if (crIdx !== -1 && lfIdx !== -1) {
      eolIdx = Math.min(crIdx, lfIdx);
    } else if (crIdx !== -1) {
      // Bare \r at end of buffer -- could be followed by \n in next chunk
      if (crIdx === text.length - 1) {
        eolIdx = -1; // treat as incomplete
      } else {
        eolIdx = crIdx;
      }
    } else if (lfIdx !== -1) {
      eolIdx = lfIdx;
    }

    if (eolIdx === -1) {
      // No complete line ending found -- remainder
      return [lines, text.slice(pos)];
    }

    const line = text.slice(pos, eolIdx);
    lines.push(line);

    // Advance past the line ending
    pos = eolIdx + 1;
    // If \r\n, skip the \n too
    if (text[eolIdx] === "\r" && text[pos] === "\n") {
      pos++;
    }
  }

  return [lines, ""];
}

/**
 * Creates an SSE line parser state machine.
 * This is the core parsing logic, separated from the TransformStream wrapper
 * for testability.
 */
export function createSSEParser(options: {
  onEvent: (event: SSEEvent) => void;
  onRetry?: (ms: number) => void;
  onComment?: (comment: string) => void;
}) {
  const { onEvent, onRetry, onComment } = options;

  let buffer = "";
  let isFirstChunk = true;

  // Current event being built
  let eventType = "";
  let dataBuffer = "";
  let lastId: string | undefined;

  function dispatchEvent(): void {
    if (dataBuffer.length > 0) {
      // Remove trailing \n from data buffer (SSE spec: data always gets \n appended)
      const data = dataBuffer.endsWith("\n") ? dataBuffer.slice(0, -1) : dataBuffer;

      onEvent({
        id: lastId,
        event: eventType || undefined,
        data,
      });
    }
    // Reset per-event fields (id persists across events per spec)
    eventType = "";
    dataBuffer = "";
  }

  function processField(name: string, value: string): void {
    switch (name) {
      case "event":
        eventType = value;
        break;
      case "data":
        dataBuffer += value + "\n";
        break;
      case "id":
        // id field must not contain null character
        if (!value.includes("\0")) {
          lastId = value;
        }
        break;
      case "retry": {
        if (/^\d+$/.test(value)) {
          onRetry?.(parseInt(value, 10));
        }
        break;
      }
      default:
        // Unknown fields are ignored per SSE spec
        break;
    }
  }

  function processLine(line: string): void {
    // Empty line = dispatch event
    if (line === "") {
      dispatchEvent();
      return;
    }

    // Comment line (starts with :)
    if (line.startsWith(":")) {
      const comment = line.startsWith(": ") ? line.slice(2) : line.slice(1);
      onComment?.(comment);
      return;
    }

    // Field: value
    const colonIdx = line.indexOf(":");
    if (colonIdx !== -1) {
      const field = line.slice(0, colonIdx);
      // If there's a space after the colon, skip it
      const valueStart = line[colonIdx + 1] === " " ? colonIdx + 2 : colonIdx + 1;
      const value = line.slice(valueStart);
      processField(field, value);
      return;
    }

    // Field with no value (treat value as empty string)
    processField(line, "");
  }

  function feed(chunk: string): void {
    // Strip BOM from first chunk
    let text = chunk;
    if (isFirstChunk) {
      text = text.replace(/^\uFEFF/, "");
      isFirstChunk = false;
    }

    const [lines, remainder] = splitLines(buffer + text);
    for (const line of lines) {
      processLine(line);
    }
    buffer = remainder;
  }

  function reset(): void {
    buffer = "";
    isFirstChunk = true;
    eventType = "";
    dataBuffer = "";
    lastId = undefined;
  }

  return { feed, reset };
}

/**
 * SSEEventParser -- TransformStream that converts text/event-stream string
 * chunks into SSEEvent objects.
 *
 * Usage:
 * ```ts
 * const stream = response.body
 *   .pipeThrough(new TextDecoderStream())
 *   .pipeThrough(new SSEEventParser());
 * ```
 */
export class SSEEventParser extends TransformStream<string, SSEEvent> {
  constructor(options?: SSEEventParserOptions) {
    let parser: ReturnType<typeof createSSEParser>;

    super({
      start(controller) {
        parser = createSSEParser({
          onEvent: (event) => controller.enqueue(event),
          onRetry: options?.onRetry,
          onComment: options?.onComment,
        });
      },
      transform(chunk) {
        parser.feed(chunk);
      },
    });
  }
}
