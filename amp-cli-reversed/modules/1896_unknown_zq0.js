function zq0(T, R, a) {
  let e = lf(T.canvas);
  if (R.length === 0) return e;
  let t = R[0],
    r = R[R.length - 1],
    h = am(t, r);
  if (R.length === 1 || M0(h, x9R)) h = a;
  let i;
  if (!T.config.useAscii) {
    if (M0(h, G3)) i = "\u25B2";else if (M0(h, w8)) i = "\u25BC";else if (M0(h, K3)) i = "\u25C4";else if (M0(h, Z8)) i = "\u25BA";else if (M0(h, wA)) i = "\u25E5";else if (M0(h, sn)) i = "\u25E4";else if (M0(h, Rm)) i = "\u25E2";else if (M0(h, BA)) i = "\u25E3";else if (M0(a, G3)) i = "\u25B2";else if (M0(a, w8)) i = "\u25BC";else if (M0(a, K3)) i = "\u25C4";else if (M0(a, Z8)) i = "\u25BA";else if (M0(a, wA)) i = "\u25E5";else if (M0(a, sn)) i = "\u25E4";else if (M0(a, Rm)) i = "\u25E2";else if (M0(a, BA)) i = "\u25E3";else i = "\u25CF";
  } else if (M0(h, G3)) i = "^";else if (M0(h, w8)) i = "v";else if (M0(h, K3)) i = "<";else if (M0(h, Z8)) i = ">";else if (M0(a, G3)) i = "^";else if (M0(a, w8)) i = "v";else if (M0(a, K3)) i = "<";else if (M0(a, Z8)) i = ">";else i = "*";
  return e[r.x][r.y] = i, e;
}