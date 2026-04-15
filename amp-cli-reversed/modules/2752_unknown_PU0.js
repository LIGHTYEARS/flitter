function PU0(T, R, a, e, t) {
  let r = R - T,
    h = Math.max(1, Math.round(r * uU0));
  if (e && r <= DQ) return null;
  if (!e && r >= a) return null;
  let i;
  if (e) i = Math.max(DQ, r - h);else i = Math.min(a, r + h);
  let c = r - i,
    s = Math.round(c * t),
    A = c - s,
    l = T + s,
    o = R - A;
  if (l < 0) o -= l, l = 0;
  if (o > a) l -= o - a, o = a;
  if (l = Math.max(0, l), o = Math.min(a, o), l === T && o === R) return null;
  return {
    start: l,
    end: o
  };
}