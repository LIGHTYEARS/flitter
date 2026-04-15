function Wq0(T, R) {
  let a = lf(T.canvas),
    e = R[0],
    t = [],
    r = [];
  for (let h = 1; h < R.length; h++) {
    let i = R[h],
      c = vS(T, e),
      s = vS(T, i);
    if (mq0(c, s)) {
      e = i;
      continue;
    }
    let A = am(e, i),
      l = Uq0(a, c, s, 1, -1, T.config.useAscii);
    if (l.length === 0) l.push(c);
    t.push(l), r.push(A), e = i;
  }
  return [a, t, r];
}