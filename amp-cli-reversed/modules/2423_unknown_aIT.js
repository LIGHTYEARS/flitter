function aIT(T, R, a, e, t) {
  let r = [],
    h = Wy(R.events, a);
  if (t) t.end = Object.assign({}, h), r.push(["exit", t, R]);
  e.end = Object.assign({}, h), r.push(["exit", e, R]), T.add(a + 1, 0, r);
}