/**
 * @flitter/llm — MCP ReadBuffer
 *
 * Accumulates chunks and extracts newline-delimited JSON-RPC messages.
 * Direct translation from reversed JMT class.
 */

import { parseMessage } from "../protocol";
import type { JSONRPCMessage } from "../types";

/**
 * Buffer for reading newline-delimited JSON-RPC messages from a byte stream.
 * Appends incoming chunks and extracts complete messages delimited by '\n'.
 */
export class ReadBuffer {
  private _buffer: Buffer | undefined;

  /** Append a chunk of data to the buffer */
  append(chunk: Buffer | Uint8Array): void {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    this._buffer = this._buffer ? Buffer.concat([this._buffer, buf]) : buf;
  }

  /**
   * Try to read the next complete JSON-RPC message from the buffer.
   * Returns null if no complete message is available yet.
   */
  readMessage(): JSONRPCMessage | null {
    if (!this._buffer) return null;

    const newlineIndex = this._buffer.indexOf("\n");
    if (newlineIndex === -1) return null;

    // Extract line up to newline, strip optional \r
    const line = this._buffer.toString("utf8", 0, newlineIndex).replace(/\r$/, "");
    // Advance buffer past the newline
    this._buffer = this._buffer.subarray(newlineIndex + 1);
    // If buffer is empty, clear it
    if (this._buffer.length === 0) this._buffer = undefined;

    return parseMessage(line);
  }

  /** Clear the buffer */
  clear(): void {
    this._buffer = undefined;
  }
}
