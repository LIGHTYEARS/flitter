function KM(T, R, a) {
  var e,
    t = [0],
    r,
    h = 0,
    i = T.length;
  for (; h < i;) {
    for (r = t.length; r--;) t[r] *= R;
    t[0] += lQ.indexOf(T.charAt(h++));
    for (e = 0; e < t.length; e++) if (t[e] > a - 1) {
      if (t[e + 1] === void 0) t[e + 1] = 0;
      t[e + 1] += t[e] / a | 0, t[e] %= a;
    }
  }
  return t.reverse();
}