// Module: get-logger
// Original: j3
// Type: CJS (RT wrapper)
// Exports: getLogger, isTracerEnabled, log, setLogger, setLoggerVerbosity, trace
// Category: util

// Module: j3 (CJS)
(T) => {
  var R, a, e, t;
  (Object.defineProperty(T, "__esModule", { value: !0 }),
    (T.log = T.setLoggerVerbosity = T.setLogger = T.getLogger = void 0),
    (T.trace = P),
    (T.isTracerEnabled = k));
  var r = c8(),
    h = qT("process"),
    i = nvT().version,
    c = {
      error: (x, ...f) => {
        console.error("E " + x, ...f);
      },
      info: (x, ...f) => {
        console.error("I " + x, ...f);
      },
      debug: (x, ...f) => {
        console.error("D " + x, ...f);
      },
    },
    s = c,
    A = r.LogVerbosity.ERROR,
    l =
      (a =
        (R = process.env.GRPC_NODE_VERBOSITY) !== null && R !== void 0
          ? R
          : process.env.GRPC_VERBOSITY) !== null && a !== void 0
        ? a
        : "";
  switch (l.toUpperCase()) {
    case "DEBUG":
      A = r.LogVerbosity.DEBUG;
      break;
    case "INFO":
      A = r.LogVerbosity.INFO;
      break;
    case "ERROR":
      A = r.LogVerbosity.ERROR;
      break;
    case "NONE":
      A = r.LogVerbosity.NONE;
      break;
    default:
  }
  var o = () => {
    return s;
  };
  T.getLogger = o;
  var n = (x) => {
    s = x;
  };
  T.setLogger = n;
  var p = (x) => {
    A = x;
  };
  T.setLoggerVerbosity = p;
  var _ = (x, ...f) => {
    let v;
    if (x >= A) {
      switch (x) {
        case r.LogVerbosity.DEBUG:
          v = s.debug;
          break;
        case r.LogVerbosity.INFO:
          v = s.info;
          break;
        case r.LogVerbosity.ERROR:
          v = s.error;
          break;
      }
      if (!v) v = s.error;
      if (v) v.bind(s)(...f);
    }
  };
  T.log = _;
  var m =
      (t =
        (e = process.env.GRPC_NODE_TRACE) !== null && e !== void 0
          ? e
          : process.env.GRPC_TRACE) !== null && t !== void 0
        ? t
        : "",
    b = new Set(),
    y = new Set();
  for (let x of m.split(","))
    if (x.startsWith("-")) y.add(x.substring(1));
    else b.add(x);
  var u = b.has("all");
  function P(x, f, v) {
    if (k(f))
      T.log(
        x,
        new Date().toISOString() +
          " | v" +
          i +
          " " +
          h.pid +
          " | " +
          f +
          " | " +
          v,
      );
  }
  function k(x) {
    return !y.has(x) && (u || b.has(x));
  }
};
