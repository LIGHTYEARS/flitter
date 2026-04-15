function qq0(T, R, a) {
  let e = lf(T.canvas);
  if (T.config.useAscii) return e;
  let t = a[0],
    r = am(R[0], R[1]);
  if (M0(r, G3)) e[t.x][t.y + 1] = "\u2534";else if (M0(r, w8)) e[t.x][t.y - 1] = "\u252C";else if (M0(r, K3)) e[t.x + 1][t.y] = "\u2524";else if (M0(r, Z8)) e[t.x - 1][t.y] = "\u251C";
  return e;
}