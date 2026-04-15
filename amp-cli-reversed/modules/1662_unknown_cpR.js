function cpR(T, R, a) {
  let e = T.workspaceFolders.map(Oj),
    t = R.workspaceFolders.map(Oj),
    r = e.includes(a),
    h = t.includes(a);
  if (r && h) return T.ideName.localeCompare(R.ideName);else if (r) return -1;else if (h) return 1;
  let i = d2(e, a),
    c = d2(t, a),
    s = e[0]?.length ?? 0,
    A = t[0]?.length ?? 0;
  if (i && c) return A - s || T.ideName.localeCompare(R.ideName);else if (i) return -1;else if (c) return 1;
  return T.ideName.localeCompare(R.ideName);
}