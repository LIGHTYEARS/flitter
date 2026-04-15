function pU0(T, R, a, e, t, r, h) {
  let i = {
    fg: LT.index(7),
    dim: !0
  };
  if (h) {
    let c = ra - 1,
      s = h.length > c ? h.slice(0, c - 1) + "\u2026" : h;
    for (let A = 0; A < s.length; A++) T.setCell(R + A, a + e.y, a9(s[A], i));
  }
  if (r) {
    let c = a + e.y + e.height + t,
      s = R + e.x + Math.floor(e.width / 2),
      A = Math.max(R + e.x, s - Math.floor(r.length / 2));
    for (let l = 0; l < r.length; l++) T.setCell(A + l, c, a9(r[l], i));
  }
}