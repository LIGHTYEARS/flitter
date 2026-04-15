function MQ(T) {
  if (T >= 1e6) return `${(T / 1e6).toFixed(1)}M`;
  if (T >= 1000) return `${(T / 1000).toFixed(1)}K`;
  return String(Math.round(T));
}
function rU0(T, R, a, e, t, r) {
  let h = a[0]?.points ?? [];
  if (h.length === 0 || R.width <= 0 || R.height <= 0) return;
  let i = Math.max(1, Math.floor(R.width / h.length));
  for (let c = 0; c < h.length; c++) {
    let s = h[c];
    if (!s) continue;
    let A = (r > 0 ? s.value / r : 0) * R.height,
      l = Math.floor(A),
      o = A - l,
      n = PA(a, 0, t, c),
      p = e === c,
      _ = {
        fg: p ? $s(n) : n,
        bold: p
      },
      m = R.x + c * i;
    for (let b = 0; b < l && b < R.height; b++) {
      let y = R.y + R.height - 1 - b;
      for (let u = 0; u < i - 1; u++) T.setCell(m + u, y, a9("\u2588", _));
    }
    if (o > 0 && l < R.height) {
      let b = Math.min(ue.length - 1, Math.floor(o * ue.length)),
        y = ue[b] ?? "\u2581",
        u = R.y + R.height - 1 - l;
      for (let P = 0; P < i - 1; P++) T.setCell(m + P, u, a9(y, _));
    }
  }
}