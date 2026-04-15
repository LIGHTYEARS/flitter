function Lk(T, R) {
  let a = [],
    e = `<${R}>`,
    t = `</${R}>`,
    r = 0;
  while (!0) {
    let h = T.indexOf(e, r);
    if (h === -1) break;
    let i = h + e.length,
      c = T.indexOf(t, i);
    if (c === -1) break;
    a.push(gzT(T.slice(i, c))), r = c + t.length;
  }
  return a;
}