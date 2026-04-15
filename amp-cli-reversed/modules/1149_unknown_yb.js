class yb {
  constructor() {
    this.buffer = [], this.trailingCR = !1;
  }
  decode(T) {
    let R = this.decodeText(T);
    if (this.trailingCR) R = "\r" + R, this.trailingCR = !1;
    if (R.endsWith("\r")) this.trailingCR = !0, R = R.slice(0, -1);
    if (!R) return [];
    let a = yb.NEWLINE_CHARS.has(R[R.length - 1] || ""),
      e = R.split(yb.NEWLINE_REGEXP);
    if (a) e.pop();
    if (e.length === 1 && !a) return this.buffer.push(e[0]), [];
    if (this.buffer.length > 0) e = [this.buffer.join("") + e[0], ...e.slice(1)], this.buffer = [];
    if (!a) this.buffer = [e.pop() || ""];
    return e;
  }
  decodeText(T) {
    if (T == null) return "";
    if (typeof T === "string") return T;
    if (typeof Buffer < "u") {
      if (T instanceof Buffer) return T.toString();
      if (T instanceof Uint8Array) return Buffer.from(T).toString();
      throw new yi(`Unexpected: received non-Uint8Array (${T.constructor.name}) stream chunk in an environment with a global "Buffer" defined, which this library assumes to be Node. Please report this error.`);
    }
    if (typeof TextDecoder < "u") {
      if (T instanceof Uint8Array || T instanceof ArrayBuffer) return this.textDecoder ?? (this.textDecoder = new TextDecoder("utf8")), this.textDecoder.decode(T);
      throw new yi(`Unexpected: received non-Uint8Array/ArrayBuffer (${T.constructor.name}) in a web platform. Please report this error.`);
    }
    throw new yi("Unexpected: neither Buffer nor TextDecoder are available as globals. Please report this error.");
  }
  flush() {
    if (!this.buffer.length && !this.trailingCR) return [];
    let T = [this.buffer.join("")];
    return this.buffer = [], this.trailingCR = !1, T;
  }
}