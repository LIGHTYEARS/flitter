function dqR(T) {
  let R = Math.min(T.length, 8192);
  for (let a = 0; a < R; a++) if (T[a] === 0) return !0;
  return !1;
}
function EqR(T) {
  let R = OqR(T),
    a = SaT(T).map(e => {
      let t = RzT(e.fullPath),
        r = dqR(t);
      return {
        path: e.path,
        size: e.size,
        content: r ? t.toString("base64") : t.toString("utf-8"),
        encoding: r ? "base64" : "utf8"
      };
    });
  return {
    info: R,
    files: a
  };
}