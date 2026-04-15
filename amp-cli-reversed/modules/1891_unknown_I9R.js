function I9R(T, R, a = 1) {
  let e = 0;
  for (let y of T) for (let u of y) e = Math.max(e, u.length);
  let t = e + 2 * a + 2,
    r = 0;
  for (let y of T) r += Math.max(y.length, 1);
  let h = T.length - 1,
    i = r + h + 2,
    c = R ? "-" : "\u2500",
    s = R ? "|" : "\u2502",
    A = R ? "+" : "\u250C",
    l = R ? "+" : "\u2510",
    o = R ? "+" : "\u2514",
    n = R ? "+" : "\u2518",
    p = R ? "+" : "\u251C",
    _ = R ? "+" : "\u2524",
    m = Oh(t - 1, i - 1);
  m[0][0] = A;
  for (let y = 1; y < t - 1; y++) m[y][0] = c;
  m[t - 1][0] = l, m[0][i - 1] = o;
  for (let y = 1; y < t - 1; y++) m[y][i - 1] = c;
  m[t - 1][i - 1] = n;
  for (let y = 1; y < i - 1; y++) m[0][y] = s, m[t - 1][y] = s;
  let b = 1;
  for (let y = 0; y < T.length; y++) {
    let u = T[y],
      P = u.length > 0 ? u : [""];
    for (let k of P) {
      let x = 1 + a;
      for (let f = 0; f < k.length; f++) m[x + f][b] = k[f];
      b++;
    }
    if (y < T.length - 1) {
      m[0][b] = p;
      for (let k = 1; k < t - 1; k++) m[k][b] = c;
      m[t - 1][b] = _, b++;
    }
  }
  return m;
}