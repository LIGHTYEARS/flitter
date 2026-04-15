function Ju0() {
  let T = !1,
    R = null;
  function a() {
    if (R) return;
    try {
      R = Yu0();
    } catch (r) {
      J.warn("Failed to enable Windows VT input for TUI mouse reporting", {
        error: r
      });
    }
  }
  function e() {
    if (!R) return;
    try {
      R.restore();
    } catch (r) {
      J.warn("Failed to restore Windows console modes after TUI mouse reporting", {
        error: r
      });
    } finally {
      R = null;
    }
  }
  let t = {
    stdin: null,
    dataCallback: null,
    earlyInputBuffer: [],
    init() {
      if (this.stdin !== null) return;
      if (this.stdin = process.stdin, a(), this.stdin.isTTY) this.stdin.setRawMode(!0);
      if (P8.buffer.length > 0) this.earlyInputBuffer.push(...P8.buffer), P8.buffer = [];
      if (P8.stream) P8.stream.removeAllListeners("data"), P8.stream = null, P8.takenOver = !0;
      this.stdin.on("data", r => {
        if (!T) this.earlyInputBuffer.push(Buffer.from(r));
        if (this.dataCallback) this.dataCallback(r);
      });
    },
    on(r, h) {
      this.dataCallback = h;
    },
    pause() {
      if (e(), this.stdin && this.stdin.isTTY) this.stdin.setRawMode(!1);
      this.stdin?.pause();
    },
    resume() {
      if (a(), this.stdin && this.stdin.isTTY) this.stdin.setRawMode(!0);
      this.stdin?.resume();
    },
    dispose() {
      if (e(), this.stdin && this.stdin.isTTY) this.stdin.setRawMode(!1);
      if (this.stdin) this.stdin.removeAllListeners("data");
      this.stdin = null, this.dataCallback = null, this.earlyInputBuffer = [];
    },
    getEarlyInputText() {
      if (T = !0, this.earlyInputBuffer.length === 0) return "";
      let r = Buffer.concat(this.earlyInputBuffer).toString("utf8");
      return this.earlyInputBuffer = [], aXT(r);
    }
  };
  return t.init(), t;
}