function rz(T) {
  return T === 32 || T === 9;
}
function UI(T) {
  return T === 10 || T === 13;
}
function Gu(T) {
  return T >= 48 && T <= 57;
}
function JUR(T, R, a) {
  let e, t, r, h, i;
  if (R) {
    h = R.offset, i = h + R.length, r = h;
    while (r > 0 && !ew(T, r - 1)) r--;
    let k = i;
    while (k < T.length && !ew(T, k)) k++;
    t = T.substring(r, k), e = THR(t, a);
  } else t = T, e = 0, r = 0, h = 0, i = T.length;
  let c = RHR(a, T),
    s = ZUR.includes(c),
    A = 0,
    l = 0,
    o;
  if (a.insertSpaces) o = Zh[a.tabSize || 4] ?? Ku(Zh[1], a.tabSize || 4);else o = "\t";
  let n = o === "\t" ? "\t" : " ",
    p = j5T(t, !1),
    _ = !1;
  function m() {
    if (A > 1) return Ku(c, A) + Ku(o, e + l);
    let k = o.length * (e + l);
    if (!s || k > GmT[n][c].length) return c + Ku(o, e + l);
    if (k <= 0) return c;
    return GmT[n][c][k];
  }
  function b() {
    let k = p.scan();
    A = 0;
    while (k === 15 || k === 14) {
      if (k === 14 && a.keepLines) A += 1;else if (k === 14) A = 1;
      k = p.scan();
    }
    return _ = k === 16 || p.getTokenError() !== 0, k;
  }
  let y = [];
  function u(k, x, f) {
    if (!_ && (!R || x < i && f > h) && T.substring(x, f) !== k) y.push({
      offset: x,
      length: f - x,
      content: k
    });
  }
  let P = b();
  if (a.keepLines && A > 0) u(Ku(c, A), 0, 0);
  if (P !== 17) {
    let k = p.getTokenOffset() + r,
      x = o.length * e < 20 && a.insertSpaces ? Zh[o.length * e] : Ku(o, e);
    u(x, r, k);
  }
  while (P !== 17) {
    let k = p.getTokenOffset() + p.getTokenLength() + r,
      x = b(),
      f = "",
      v = !1;
    while (A === 0 && (x === 12 || x === 13)) {
      let I = p.getTokenOffset() + r;
      u(Zh[1], k, I), k = p.getTokenOffset() + p.getTokenLength() + r, v = x === 12, f = v ? m() : "", x = b();
    }
    if (x === 2) {
      if (P !== 1) l--;
      if (a.keepLines && A > 0 || !a.keepLines && P !== 1) f = m();else if (a.keepLines) f = Zh[1];
    } else if (x === 4) {
      if (P !== 3) l--;
      if (a.keepLines && A > 0 || !a.keepLines && P !== 3) f = m();else if (a.keepLines) f = Zh[1];
    } else {
      switch (P) {
        case 3:
        case 1:
          if (l++, a.keepLines && A > 0 || !a.keepLines) f = m();else f = Zh[1];
          break;
        case 5:
          if (a.keepLines && A > 0 || !a.keepLines) f = m();else f = Zh[1];
          break;
        case 12:
          f = m();
          break;
        case 13:
          if (A > 0) f = m();else if (!v) f = Zh[1];
          break;
        case 6:
          if (a.keepLines && A > 0) f = m();else if (!v) f = Zh[1];
          break;
        case 10:
          if (a.keepLines && A > 0) f = m();else if (x === 6 && !v) f = "";
          break;
        case 7:
        case 8:
        case 9:
        case 11:
        case 2:
        case 4:
          if (a.keepLines && A > 0) f = m();else if ((x === 12 || x === 13) && !v) f = Zh[1];else if (x !== 5 && x !== 17) _ = !0;
          break;
        case 16:
          _ = !0;
          break;
      }
      if (A > 0 && (x === 12 || x === 13)) f = m();
    }
    if (x === 17) if (a.keepLines && A > 0) f = m();else f = a.insertFinalNewline ? c : "";
    let g = p.getTokenOffset() + r;
    u(f, k, g), P = x;
  }
  return y;
}