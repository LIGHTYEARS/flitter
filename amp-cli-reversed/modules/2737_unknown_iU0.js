function iU0(T, R, a, e, t, r) {
  let h = a[0]?.points ?? [];
  if (h.length === 0 || R.width <= 0 || R.height <= 0) return;
  let i = Math.max(1, Math.floor(R.width / h.length)),
    c = R.height * 8;
  for (let s = 0; s < h.length; s++) {
    let A = R.x + s * i,
      l = e === s,
      o = 0;
    for (let n = 0; n < a.length; n++) {
      let p = a[n]?.points[s];
      if (!p || p.value <= 0) continue;
      let _ = r > 0 ? p.value / r : 0,
        m = Math.round(_ * c);
      if (m <= 0) continue;
      let b = PA(a, n, t, s),
        y = {
          fg: l ? $s(b) : b,
          bold: l
        },
        u = o,
        P = Math.min(o + m, c),
        k = Math.floor(u / 8),
        x = Math.ceil(P / 8);
      for (let f = k; f < x && f < R.height; f++) {
        let v = f * 8,
          g = v + 8,
          I = R.y + R.height - 1 - f,
          S = Math.max(v, u),
          O = Math.min(g, P) - S,
          j;
        if (O >= 8) j = "\u2588";else if (S === v) {
          let d = Math.min(ue.length - 1, ue.length - O);
          j = ue[d] ?? "\u2581";
        } else {
          let d = Math.min(ue.length - 1, ue.length - O);
          j = ue[d] ?? "\u2581";
        }
        for (let d = 0; d < i - 1; d++) T.setCell(A + d, I, a9(j, y));
      }
      o = P;
    }
  }
}