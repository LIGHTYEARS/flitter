function _q0(T, R, a) {
  let e = T.trim(),
    t = MgT(e, R, a);
  if (!t || t.ids.length === 0) return;
  e = t.remaining.trim();
  let r = t.ids;
  while (e.length > 0) {
    let h = e.match(nq0);
    if (!h) break;
    let i = Boolean(h[1]),
      c = h[2],
      s = h[3]?.trim() || void 0;
    e = e.slice(h[0].length).trim();
    let A = bq0(c),
      l = c.endsWith(">"),
      o = MgT(e, R, a);
    if (!o || o.ids.length === 0) break;
    e = o.remaining.trim();
    for (let n of r) for (let p of o.ids) R.edges.push({
      source: n,
      target: p,
      label: s,
      style: A,
      hasArrowStart: i,
      hasArrowEnd: l
    });
    r = o.ids;
  }
}