function Ur(T) {
  if (!T) return {
    info: Gy("info"),
    warn: Gy("warn"),
    error: Gy("error"),
    debug: Gy("debug")
  };
  return {
    info: (R, ...a) => T.info(R, ...a),
    warn: (R, ...a) => T.warn(R, ...a),
    error: (R, ...a) => T.error(R, ...a),
    debug: (R, ...a) => (T.debug ?? T.info)(R, ...a)
  };
}