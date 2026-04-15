function is(T, R) {
  if (T.autoClose) T.close();
  W0R(T, R);
}
function W0R(T, R) {
  if (T.emittedError) return;
  T.emittedError = !0, T.emit("error", R);
}
function PW() {}
function NH0() {}
function UH0(T, R, a) {
  var e = T & 31,
    t = (T >> 5 & 15) - 1,
    r = (T >> 9 & 127) + 1980,
    h = 0,
    i = (R & 31) * 2,
    c = R >> 5 & 63,
    s = R >> 11 & 31;
  if (a == null || a === "local") return new Date(r, t, e, s, c, i, h);else if (a === "UTC") return new Date(Date.UTC(r, t, e, s, c, i, h));else throw Error("unrecognized options.timezone: " + options.timezone);
}