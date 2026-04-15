function a$() {}
function kC(T, R, a) {
  if (!R || Xj[T] > Xj[a]) return a$;else return R[T].bind(R);
}
function De(T) {
  let R = T.logger,
    a = T.logLevel ?? "off";
  if (!R) return uNT;
  let e = cV.get(R);
  if (e && e[0] === a) return e[1];
  let t = {
    error: kC("error", R, a),
    warn: kC("warn", R, a),
    info: kC("info", R, a),
    debug: kC("debug", R, a)
  };
  return cV.set(R, [a, t]), t;
}