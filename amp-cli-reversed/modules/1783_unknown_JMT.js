class JMT {
  append(T) {
    this._buffer = this._buffer ? Buffer.concat([this._buffer, T]) : T;
  }
  readMessage() {
    if (!this._buffer) return null;
    let T = this._buffer.indexOf(`
`);
    if (T === -1) return null;
    let R = this._buffer.toString("utf8", 0, T).replace(/\r$/, "");
    return this._buffer = this._buffer.subarray(T + 1), VyR(R);
  }
  clear() {
    this._buffer = void 0;
  }
}