function aL(T, R, a, e, t, r) {
  if (e <= 0) return;
  let h = {
      fg: LT.index(7),
      dim: !0
    },
    i = r(t).padStart(ra - 2);
  for (let s = 0; s < i.length && R + s < R + ra - 1; s++) T.setCell(R + s, a, a9(i[s], h));
  if (T.setCell(R + ra - 1, a, a9("\u2524", h)), e > 2) {
    let s = a + Math.floor(e / 2),
      A = r(t / 2).padStart(ra - 2);
    for (let l = 0; l < A.length && R + l < R + ra - 1; l++) T.setCell(R + l, s, a9(A[l], h));
    T.setCell(R + ra - 1, s, a9("\u2524", h));
  }
  let c = r(0).padStart(ra - 2);
  for (let s = 0; s < c.length && R + s < R + ra - 1; s++) T.setCell(R + s, a + e - 1, a9(c[s], h));
  T.setCell(R + ra - 1, a + e - 1, a9("\u2524", h));
  for (let s = 0; s < e; s++) {
    let A = T.getCell(R + ra - 1, a + s);
    if (!A || A.char === " ") T.setCell(R + ra - 1, a + s, a9("\u2502", h));
  }
}