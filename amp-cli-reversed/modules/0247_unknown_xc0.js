function pc0() {
  G1 = process.hrtime.bigint();
}
function _c0() {
  if (G1 === null) return null;
  return Number(process.hrtime.bigint() - G1) / 1e6;
}
function Pc0(T) {
  try {
    if (K1.statSync(T).size > yc0) K1.truncateSync(T, 0);
  } catch {}
}
function kc0(T) {
  return T instanceof Error && T.message.includes("write after end");
}
function og(T, R, a, e) {
  if (NeT) return;
  try {
    T[R](a, ...e);
  } catch (t) {
    if (!kc0(t)) throw t;
  }
}
function xc0(T) {
  NeT = !1, u$ = null;
  let {
    logFile: R,
    logLevel: a
  } = T;
  if (!AkT.includes(a)) console.warn(`Invalid log level: ${a}. Using 'info' instead.`);
  try {
    K1.mkdirSync(BeT.dirname(R), {
      recursive: !0
    });
  } catch (i) {
    console.error(`Failed to create log directory: ${i}`);
  }
  Pc0(R);
  let e = Xh.default.format(i => {
      for (let c of Object.keys(i)) {
        let s = i[c];
        if (s instanceof Error) i[c] = {
          name: s.name,
          message: s.message,
          stack: s.stack
        };
      }
      return i;
    }),
    t = Xh.default.format(i => {
      return i.pid = process.pid, i;
    }),
    r = [new Xh.default.transports.File({
      filename: R
    }), new eKT()];
  if (process.env.AMP_CLI_STDOUT_DEBUG === "true") r.push(new Xh.default.transports.Console({
    level: "debug",
    format: Xh.default.format.combine(Xh.default.format.colorize(), Xh.default.format.simple())
  }));
  gv = Xh.default.createLogger({
    level: AkT.includes(a) ? a : "info",
    format: Xh.default.format.combine(Xh.default.format.timestamp(), t(), e(), Xh.default.format.json(), Xh.default.format.errors({
      stack: !0
    })),
    transports: r
  });
  let h = gv;
  return PnR({
    error: (i, ...c) => {
      og(h, "error", i, c);
    },
    warn: (i, ...c) => {
      og(h, "warn", i, c);
    },
    info: (i, ...c) => {
      og(h, "info", i, c);
    },
    debug: (i, ...c) => {
      og(h, "debug", i, c);
    },
    audit: (i, ...c) => {
      let s = typeof c[0] === "object" && c[0] !== null ? {
        audit: !0,
        ...c[0]
      } : {
        audit: !0
      };
      og(h, "info", i, [s]);
    }
  }), R;
}