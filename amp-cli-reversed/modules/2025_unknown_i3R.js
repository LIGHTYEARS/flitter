function i3R(T, R, a = {}) {
  let {
    columnFormatters: e = [],
    minimumTruncatedColumnWidth: t = 20,
    truncateColumnIndex: r,
    maxTruncatedColumnWidth: h
  } = a;
  for (let y = 0; y < R.length; y++) if (R[y].length !== T.length) throw Error(`Row ${y} has ${R[y].length} columns, but headers have ${T.length} columns`);
  let i = C9.columns || 120,
    c = "  ",
    s = T.length - 1,
    A = r ?? T.length - 1,
    l = [];
  for (let y = 0; y < T.length; y++) if (y === A) l.push(0);else l.push(Math.max(T[y].length, ...R.map(u => u[y].length)));
  let o = Math.max(T[A].length, ...R.map(y => y[A].length)),
    n = l.reduce((y, u) => y + u, 0) + s * c.length,
    p = Math.max(t, i - n);
  if (h !== void 0) p = Math.min(p, Math.min(h, o));
  l[A] = p;
  let _ = l,
    m = T.map((y, u) => y.padEnd(_[u])).join(c);
  C9.write(m + `
`);
  let b = _.map(y => "\u2500".repeat(y)).join(c);
  C9.write(b + `
`);
  for (let y of R) {
    let u = y.map((P, k) => {
      let x = _[k],
        f = e[k];
      if (f) return f(P, x);
      return (P.length > x ? P.substring(0, x - 3) + "..." : P).padEnd(x);
    });
    C9.write(u.join(c) + `
`);
  }
}