function RYR(T) {
  if (T) ZX = T;
  QX = byT.pino({
    level: J1R(T),
    messageKey: "msg",
    base: {},
    formatters: {
      level(R, a) {
        return {
          level: a
        };
      }
    },
    timestamp: YX() ? byT.stdTimeFunctions.epochTime : !1,
    browser: {
      write: {
        fatal: Rs.bind(null, "fatal"),
        error: Rs.bind(null, "error"),
        warn: Rs.bind(null, "warn"),
        info: Rs.bind(null, "info"),
        debug: Rs.bind(null, "debug"),
        trace: Rs.bind(null, "trace")
      }
    },
    hooks: {
      logMethod(R, a, e) {
        var t;
        let r = {
            10: "trace",
            20: "debug",
            30: "info",
            40: "warn",
            50: "error",
            60: "fatal"
          }[e] || "info",
          h = YX() ? Date.now() : void 0,
          i = ((t = this.bindings) == null ? void 0 : t.call(this)) || {};
        if (R.length >= 2) {
          let [c, s] = R;
          if (typeof c === "object" && c !== null) Rs(r, {
            ...i,
            ...c,
            msg: s,
            time: h
          });else Rs(r, {
            ...i,
            msg: String(c),
            time: h
          });
        } else if (R.length === 1) {
          let [c] = R;
          if (typeof c === "object" && c !== null) Rs(r, {
            ...i,
            ...c,
            time: h
          });else Rs(r, {
            ...i,
            msg: String(c),
            time: h
          });
        }
      }
    }
  }), JX.clear();
}