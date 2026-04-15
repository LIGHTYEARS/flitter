function ZS0() {
  return "~";
}
function JS0(T) {
  return T.length;
}
function TO0(T, R) {
  let a = R || {},
    e = (a.align || []).concat(),
    t = a.stringLength || JS0,
    r = [],
    h = [],
    i = [],
    c = [],
    s = 0,
    A = -1;
  while (++A < T.length) {
    let _ = [],
      m = [],
      b = -1;
    if (T[A].length > s) s = T[A].length;
    while (++b < T[A].length) {
      let y = RO0(T[A][b]);
      if (a.alignDelimiters !== !1) {
        let u = t(y);
        if (m[b] = u, c[b] === void 0 || u > c[b]) c[b] = u;
      }
      _.push(y);
    }
    h[A] = _, i[A] = m;
  }
  let l = -1;
  if (typeof e === "object" && "length" in e) while (++l < s) r[l] = JfT(e[l]);else {
    let _ = JfT(e);
    while (++l < s) r[l] = _;
  }
  l = -1;
  let o = [],
    n = [];
  while (++l < s) {
    let _ = r[l],
      m = "",
      b = "";
    if (_ === 99) m = ":", b = ":";else if (_ === 108) m = ":";else if (_ === 114) b = ":";
    let y = a.alignDelimiters === !1 ? 1 : Math.max(1, c[l] - m.length - b.length),
      u = m + "-".repeat(y) + b;
    if (a.alignDelimiters !== !1) {
      if (y = m.length + y + b.length, y > c[l]) c[l] = y;
      n[l] = y;
    }
    o[l] = u;
  }
  h.splice(1, 0, o), i.splice(1, 0, n), A = -1;
  let p = [];
  while (++A < h.length) {
    let _ = h[A],
      m = i[A];
    l = -1;
    let b = [];
    while (++l < s) {
      let y = _[l] || "",
        u = "",
        P = "";
      if (a.alignDelimiters !== !1) {
        let k = c[l] - (m[l] || 0),
          x = r[l];
        if (x === 114) u = " ".repeat(k);else if (x === 99) {
          if (k % 2) u = " ".repeat(k / 2 + 0.5), P = " ".repeat(k / 2 - 0.5);else u = " ".repeat(k / 2), P = u;
        } else P = " ".repeat(k);
      }
      if (a.delimiterStart !== !1 && !l) b.push("|");
      if (a.padding !== !1 && !(a.alignDelimiters === !1 && y === "") && (a.delimiterStart !== !1 || l)) b.push(" ");
      if (a.alignDelimiters !== !1) b.push(u);
      if (b.push(y), a.alignDelimiters !== !1) b.push(P);
      if (a.padding !== !1) b.push(" ");
      if (a.delimiterEnd !== !1 || l !== s - 1) b.push("|");
    }
    p.push(a.delimiterEnd === !1 ? b.join("").replace(/ +$/, "") : b.join(""));
  }
  return p.join(`
`);
}