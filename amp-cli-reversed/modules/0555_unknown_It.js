function Qg() {}
function YE(T, R, a) {
  if (!R || qj[T] > qj[a]) return Qg;else return R[T].bind(R);
}
function It(T) {
  let R = T.logger,
    a = T.logLevel ?? "off";
  if (!R) return H7T;
  let e = JG.get(R);
  if (e && e[0] === a) return e[1];
  let t = {
    error: YE("error", R, a),
    warn: YE("warn", R, a),
    info: YE("info", R, a),
    debug: YE("debug", R, a)
  };
  return JG.set(R, [a, t]), t;
}