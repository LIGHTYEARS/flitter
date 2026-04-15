function T$() {}
function mC(T, R, a) {
  if (!R || Kj[T] > Kj[a]) return T$;else return R[T].bind(R);
}
function gt(T) {
  var R;
  let a = T.logger,
    e = (R = T.logLevel) !== null && R !== void 0 ? R : "off";
  if (!a) return V6T;
  let t = KK.get(a);
  if (t && t[0] === e) return t[1];
  let r = {
    error: mC("error", a, e),
    warn: mC("warn", a, e),
    info: mC("info", a, e),
    debug: mC("debug", a, e)
  };
  return KK.set(a, [e, r]), r;
}