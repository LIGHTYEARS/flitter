function CfT(T, R, a) {
  let e = [],
    t = -1;
  while (++t < T.length) e[t] = HYT(T[t], R, a);
  return e.join("");
}
function R$0(T) {
  return Boolean(T && typeof T === "object");
}
function arT(T) {
  return a$0.call(LfT, T) ? LfT[T] : !1;
}
function vh(T, R, a, e) {
  let t = T.length,
    r = 0,
    h;
  if (R < 0) R = -R > t ? 0 : t + R;else R = R > t ? t : R;
  if (a = a > 0 ? a : 0, e.length < 1e4) h = Array.from(e), h.unshift(R, a), T.splice(...h);else {
    if (a) T.splice(R, a);
    while (r < e.length) h = e.slice(r, r + 1e4), h.unshift(R, 0), T.splice(...h), r += 1e4, R += 1e4;
  }
}