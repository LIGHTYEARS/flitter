function D5R(T, R) {
  let a = R || T;
  if (a === void 0) return J.debug("Toolbox path not configured (env or setting), using default", {
    defaultPath: kj
  }), [kj];
  let e = Y9T(a);
  if (e.length === 0) return J.info("Toolbox path configuration is empty, processing no directories", {
    pathsStr: a
  }), [];
  return J.info("Parsed toolbox directories", {
    source: R ? "config" : "env",
    original: a,
    directories: e
  }), e;
}