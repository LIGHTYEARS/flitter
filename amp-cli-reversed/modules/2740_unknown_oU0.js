function yRR(T, R, a, e, t) {
  W_(T, R, a, e, t), W_(T, R - 1, a, e, t), W_(T, R + 1, a, e, t), W_(T, R, a - 1, e, t), W_(T, R, a + 1, e, t);
}
function oU0(T, R, a, e, t, r) {
  if (a.length === 0) return;
  if (R.width <= 0 || R.height <= 0) return;
  let h = R.width * 2,
    i = R.height * 4,
    c = [],
    s = [];
  for (let A = 0; A < R.height; A++) {
    c[A] = [], s[A] = [];
    for (let l = 0; l < R.width; l++) c[A][l] = Array(a.length).fill(0), s[A][l] = Array(a.length).fill(0);
  }
  for (let A = 0; A < a.length; A++) {
    let l = a[A];
    if (!l || l.points.length === 0) continue;
    let o = l.points,
      n = o.length <= tU0,
      p = n ? yRR : W_,
      _ = [];
    for (let b = 0; b < R.height; b++) _[b] = Array(R.width).fill(0);
    let m = bU0(o, h, i, r);
    for (let b = 0; b < m.length; b++) {
      let [y, u] = m[b];
      if (b === 0) {
        p(_, y, u, R.width, R.height);
        continue;
      }
      let [P, k] = m[b - 1];
      nU0(_, P, k, y, u, R.width, R.height, n);
    }
    for (let b = 0; b < R.height; b++) for (let y = 0; y < R.width; y++) {
      let u = _[b][y];
      if (u !== 0) {
        c[b][y][A] = u;
        let P = 0,
          k = u;
        while (k) P += k & 1, k >>= 1;
        s[b][y][A] = P;
      }
    }
  }
  for (let A = 0; A < R.height; A++) for (let l = 0; l < R.width; l++) {
    let o = 0,
      n = 0,
      p = 0;
    for (let _ = 0; _ < a.length; _++) {
      let m = c[A][l][_];
      if (m !== 0) {
        o |= m;
        let b = s[A][l][_];
        if (b > p) p = b, n = _;
      }
    }
    if (o !== 0) {
      let _ = R.x + l,
        m = R.y + A,
        b = PA(a, n, t, 0),
        y = String.fromCharCode(mRR + o);
      T.setCell(_, m, a9(y, {
        fg: b
      }));
    }
  }
  if (e !== null && a.length > 0) {
    let A = a[0].points.length;
    if (e >= 0 && e < A) {
      let l = RU0(e, A, R.width, R.height, r, a[0].points[e].value).cellX;
      if (l >= 0 && l < R.width) {
        let o = R.x + l;
        for (let n = 0; n < R.height; n++) {
          let p = R.y + n,
            _ = T.getCell(o, p);
          if (_ && eU0(_.char)) {
            let m = _.style.fg ?? LT.default();
            T.setCell(o, p, a9(_.char, {
              fg: $s(m),
              bold: !0
            }));
          } else if (!_ || _.char === " " || _.char === "") T.setCell(o, p, a9("\u2502", {
            fg: LT.index(7),
            dim: !0
          }));
        }
      }
    }
  }
}