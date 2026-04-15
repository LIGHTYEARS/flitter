function We(T) {
  var R,
    a,
    e,
    t = T.length - 1,
    r = "",
    h = T[0];
  if (t > 0) {
    r += h;
    for (R = 1; R < t; R++) {
      if (e = T[R] + "", a = s9 - e.length, a) r += dl(a);
      r += e;
    }
    if (h = T[R], e = h + "", a = s9 - e.length, a) r += dl(a);
  } else if (h === 0) return "0";
  for (; h % 10 === 0;) h /= 10;
  return r + h;
}