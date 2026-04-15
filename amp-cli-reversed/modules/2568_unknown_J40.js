function Y40(T) {
  return new this(T).cbrt();
}
function Q40(T) {
  return Q0(T = new this(T), T.e + 1, 2);
}
function Z40(T, R, a) {
  return new this(T).clamp(R, a);
}
function J40(T) {
  if (!T || typeof T !== "object") throw Error(XH + "Object expected");
  var R,
    a,
    e,
    t = T.defaults === !0,
    r = ["precision", 1, up, "rounding", 0, 8, "toExpNeg", -lP, 0, "toExpPos", 0, lP, "maxE", 0, lP, "minE", -lP, 0, "modulo", 0, 9];
  for (R = 0; R < r.length; R += 3) {
    if (a = r[R], t) this[a] = AQ[a];
    if ((e = T[a]) !== void 0) if (nt(e) === e && e >= r[R + 1] && e <= r[R + 2]) this[a] = e;else throw Error(DA + a + ": " + e);
  }
  if (a = "crypto", t) this[a] = AQ[a];
  if ((e = T[a]) !== void 0) if (e === !0 || e === !1 || e === 0 || e === 1) {
    if (e) {
      if (typeof crypto < "u" && crypto && (crypto.getRandomValues || crypto.randomBytes)) this[a] = !0;else throw Error(rJT);
    } else this[a] = !1;
  } else throw Error(DA + a + ": " + e);
  return this;
}