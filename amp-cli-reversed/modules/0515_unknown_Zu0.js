function Zu0() {
  let T = !1,
    R = {
      stdin: null,
      dataCallback: null,
      earlyInputBuffer: [],
      init() {
        if (this.stdin !== null) return;
        if (P8.stream) {
          if (J.info("[tty] taking over early stdin stream"), this.stdin = P8.stream, this.stdin.removeAllListeners("data"), P8.takenOver = !0, P8.buffer.length > 0) this.earlyInputBuffer.push(...P8.buffer), P8.buffer = [];
          this.stdin.on("data", t => {
            if (!T) this.earlyInputBuffer.push(Buffer.from(t));
            if (this.dataCallback) this.dataCallback(t);
          }), P8.stream = null;
          return;
        }
        let a = Mu0("/dev/tty", "r");
        if (!OxT.isatty(a)) throw Error("/dev/tty is not a TTY device");
        let e = new OxT.ReadStream(a);
        this.stdin = e, e.setRawMode(!0), e.on("data", t => {
          if (!T) this.earlyInputBuffer.push(Buffer.from(t));
          if (this.dataCallback) this.dataCallback(t);
        });
      },
      on(a, e) {
        this.dataCallback = e;
      },
      pause() {
        if (this.stdin) this.stdin.setRawMode(!1), this.stdin.removeAllListeners("data"), this.stdin.destroy();
        this.stdin = null;
      },
      resume() {
        this.init();
      },
      dispose() {
        if (this.stdin) this.stdin.setRawMode(!1), this.stdin.removeAllListeners("data"), this.stdin.destroy();
        this.stdin = null, this.dataCallback = null, this.earlyInputBuffer = [];
      },
      getEarlyInputText() {
        if (T = !0, this.earlyInputBuffer.length === 0) return "";
        let a = Buffer.concat(this.earlyInputBuffer).toString("utf8");
        return this.earlyInputBuffer = [], aXT(a);
      }
    };
  return R.init(), R;
}