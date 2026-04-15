function S50(T, R) {
  let a = T.split(`
`),
    e = 0,
    t = -1;
  for (let A = 0; A < a.length; A++) if (a[A]?.startsWith("@@")) {
    t = A, e = A + 1;
    break;
  }
  let r = a.slice(0, e),
    h = a.slice(e),
    i = h.length;
  if (i <= R) return T;
  let c = i - R,
    s = h.slice(-R);
  if (t >= 0 && r[t]) {
    let A = c + 1;
    r[t] = `@@ -0,0 +${A},${R} @@`;
  }
  return [...r, ...s].join(`
`);
}