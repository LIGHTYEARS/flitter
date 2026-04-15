function Dq0(T, R) {
  let [a, e, t, r] = Mq0(R, T.config.graphDirection),
    h = rL(R.from.gridCoord, a),
    i = rL(R.to.gridCoord, e),
    c = UgT(T.grid, h, i);
  if (c === null) {
    R.startDir = t, R.endDir = r, R.path = [];
    return;
  }
  c = HgT(c);
  let s = rL(R.from.gridCoord, t),
    A = rL(R.to.gridCoord, r),
    l = UgT(T.grid, s, A);
  if (l === null) {
    R.startDir = a, R.endDir = e, R.path = c;
    return;
  }
  if (l = HgT(l), c.length <= l.length) R.startDir = a, R.endDir = e, R.path = c;else R.startDir = t, R.endDir = r, R.path = l;
}