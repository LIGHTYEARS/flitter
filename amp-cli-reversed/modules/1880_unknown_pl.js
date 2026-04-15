function pl(T, R, a, ...e) {
  let [t, r] = $S(T);
  for (let i of e) {
    let [c, s] = $S(i);
    t = Math.max(t, c + R.x), r = Math.max(r, s + R.y);
  }
  let h = Oh(t, r);
  for (let i = 0; i <= t; i++) for (let c = 0; c <= r; c++) if (i < T.length && c < T[0].length) h[i][c] = T[i][c];
  for (let i of e) for (let c = 0; c < i.length; c++) for (let s = 0; s < i[0].length; s++) {
    let A = i[c][s];
    if (A !== " ") {
      let l = c + R.x,
        o = s + R.y,
        n = h[l][o];
      if (!a && NgT(A) && NgT(n)) h[l][o] = kq0(n, A);else h[l][o] = A;
    }
  }
  return h;
}