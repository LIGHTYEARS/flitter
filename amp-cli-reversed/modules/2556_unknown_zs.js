function zs(T, R, a) {
  if (!T.isFinite()) return nJT(T);
  var e,
    t = T.e,
    r = We(T.d),
    h = r.length;
  if (R) {
    if (a && (e = a - h) > 0) r = r.charAt(0) + "." + r.slice(1) + dl(e);else if (h > 1) r = r.charAt(0) + "." + r.slice(1);
    r = r + (T.e < 0 ? "e" : "e+") + T.e;
  } else if (t < 0) {
    if (r = "0." + dl(-t - 1) + r, a && (e = a - h) > 0) r += dl(e);
  } else if (t >= h) {
    if (r += dl(t + 1 - h), a && (e = a - t - 1) > 0) r = r + "." + dl(e);
  } else {
    if ((e = t + 1) < h) r = r.slice(0, e) + "." + r.slice(e);
    if (a && (e = a - h) > 0) {
      if (t + 1 === h) r += ".";
      r += dl(e);
    }
  }
  return r;
}