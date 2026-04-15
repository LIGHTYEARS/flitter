function Fq0(T, R) {
  let a = lf(T.canvas);
  for (let e = 1; e < R.length - 1; e++) {
    let t = R[e],
      r = vS(T, t),
      h = am(R[e - 1], t),
      i = am(t, R[e + 1]),
      c;
    if (!T.config.useAscii) {
      if (M0(h, Z8) && M0(i, w8) || M0(h, G3) && M0(i, K3)) c = "\u2510";else if (M0(h, Z8) && M0(i, G3) || M0(h, w8) && M0(i, K3)) c = "\u2518";else if (M0(h, K3) && M0(i, w8) || M0(h, G3) && M0(i, Z8)) c = "\u250C";else if (M0(h, K3) && M0(i, G3) || M0(h, w8) && M0(i, Z8)) c = "\u2514";else c = "+";
    } else c = "+";
    a[r.x][r.y] = c;
  }
  return a;
}