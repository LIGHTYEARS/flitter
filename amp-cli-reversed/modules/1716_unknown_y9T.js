function JsT(T) {
  return T instanceof Error && T.message === u9T.USER_CANCELLED;
}
class y9T {
  filesystem;
  constructor(T) {
    this.filesystem = T;
  }
  async readFile(T, R) {
    let {
      maxBytes: a,
      signal: e,
      rejectBinary: t = !1,
      encoding: r = "utf8",
      textProcessing: h
    } = R;
    try {
      let i = (await this.filesystem.stat(T, {
          signal: e
        })).size,
        c = i > a;
      if (i <= a) {
        let l = await this.filesystem.readBinaryFile(T, {
            signal: e
          }),
          o = this.decodeText(l, r);
        if (o === void 0 && t) return {
          binary: !0,
          truncated: !1,
          fileSize: i
        };
        if (o && h) o = Mb.processText(o, h);
        return {
          content: o,
          binary: o === void 0,
          truncated: !1,
          fileSize: i
        };
      }
      let s;
      if (T.scheme === "file") try {
        if (s = await this.streamFile(T, a, r, e), s === void 0 && t) return {
          binary: !0,
          truncated: c,
          fileSize: i
        };
      } catch (l) {
        J.debug("File streaming failed for large file", {
          uri: T
        }, l);
      }
      let A = s;
      if (s && h) A = Mb.processText(s, h);
      return {
        content: A,
        binary: !1,
        truncated: c,
        fileSize: i
      };
    } catch (i) {
      return {
        binary: !1,
        truncated: !1,
        fileSize: 0,
        error: i instanceof Error ? i : Error(String(i))
      };
    }
  }
  async streamFile(T, R, a, e) {
    let {
        createReadStream: t
      } = await import("fs"),
      r = t(T.fsPath, {
        highWaterMark: 16384,
        end: R - 1
      }),
      h = xN(e, () => r.destroy());
    try {
      let i = [];
      for await (let s of r) i.push(s);
      let c = Buffer.concat(i);
      return this.decodeText(c, a);
    } finally {
      h();
    }
  }
  decodeText(T, R) {
    try {
      let a;
      if (R !== "utf8" && kLT(T)) a = T.toString(R);else a = new TextDecoder("utf-8", {
        fatal: !0
      }).decode(T);
      if (a.includes("\x00")) return;
      return a;
    } catch {
      return;
    }
  }
}