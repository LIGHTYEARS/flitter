function cU0(T, R, a, e, t, r) {
  if (a.length === 0 || R.width <= 0 || R.height <= 0) return;
  let h = a[0]?.points.length ?? 0;
  if (h === 0) return;
  let i = R.height * 8,
    c = [];
  for (let A = 0; A < a.length; A++) {
    let l = (a[A]?.points ?? []).map((o, n) => ({
      label: a[0]?.points[n]?.label ?? "",
      value: o.value
    }));
    c[A] = mU0(l, R.width, r);
  }
  let s = [];
  for (let A = 0; A < a.length; A++) {
    let l = Array(R.width).fill(0);
    for (let o = 0; o < R.width; o++) {
      let n = 0;
      for (let p = 0; p <= A; p++) n += c[p][o];
      l[o] = Math.max(0, Math.min(i, Math.round(n * i)));
    }
    s[A] = l;
  }
  for (let A = 0; A < R.width; A++) {
    let l = e !== null && sU0(A, R.width, h) === e,
      o = [];
    for (let m = 0; m < a.length; m++) {
      let b = m > 0 ? s[m - 1][A] ?? 0 : 0,
        y = s[m][A] ?? 0;
      if (y > b) o.push({
        si: m,
        start: b,
        end: y
      });
    }
    let n = o.length > 0 ? o[o.length - 1].end : 0,
      p = 0,
      _ = Math.min(R.height - 1, Math.ceil(n / 8) - 1);
    for (let m = p; m <= _; m++) {
      let b = m * 8,
        y = b + 8,
        u = R.y + R.height - 1 - m,
        P = -1,
        k = -1,
        x = y,
        f = b;
      for (let I of o) {
        if (I.end <= b || I.start >= y) continue;
        let S = Math.max(b, I.start),
          O = Math.min(y, I.end);
        if (S < x) x = S, P = I.si;
        if (O > f) f = O, k = I.si;
      }
      if (P === -1 && k === -1) continue;
      let v = f - x;
      if (v <= 0) continue;
      let g = f - b;
      if (P === k || v >= 8) {
        let I = v >= 8 ? P : P !== -1 ? P : k,
          S = PA(a, I, t, 0),
          O = {
            fg: l ? $s(S) : S,
            bold: l
          };
        if (g >= 8) T.setCell(R.x + A, u, a9("\u2588", O));else {
          let j = Math.min(ue.length - 1, ue.length - g);
          T.setCell(R.x + A, u, a9(ue[j] ?? "\u2581", O));
        }
      } else {
        let I = f;
        for (let d of o) if (d.si === P) {
          I = Math.min(y, d.end);
          break;
        }
        let S = I - b,
          O = PA(a, P, t, 0),
          j = PA(a, k, t, 0);
        if (S >= 8) {
          let d = {
            fg: l ? $s(O) : O,
            bold: l
          };
          T.setCell(R.x + A, u, a9("\u2588", d));
        } else if (S <= 0) {
          let d = {
              fg: l ? $s(j) : j,
              bold: l
            },
            C = Math.min(ue.length - 1, ue.length - g);
          T.setCell(R.x + A, u, a9(ue[C] ?? "\u2581", d));
        } else {
          let d = {
              fg: l ? $s(O) : O,
              bg: l ? $s(j) : j,
              bold: l
            },
            C = Math.min(ue.length - 1, ue.length - S);
          T.setCell(R.x + A, u, a9(ue[C] ?? "\u2581", d));
        }
      }
    }
  }
}