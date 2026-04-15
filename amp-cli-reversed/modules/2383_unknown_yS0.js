function uS0(T) {
  if (typeof T !== "string") throw TypeError("Expected a string");
  return T.replace(/[|\\{}()[\]^$+*?.]/g, "\\$&").replace(/-/g, "\\x2d");
}
function yS0(T, R, a) {
  let e = qH((a || {}).ignore || []),
    t = PS0(R),
    r = -1;
  while (++r < t.length) cQT(T, "text", h);
  function h(c, s) {
    let A = -1,
      l;
    while (++A < s.length) {
      let o = s[A],
        n = l ? l.children : void 0;
      if (e(o, n ? n.indexOf(o) : void 0, l)) return;
      l = o;
    }
    if (l) return i(c, s);
  }
  function i(c, s) {
    let A = s[s.length - 1],
      l = t[r][0],
      o = t[r][1],
      n = 0,
      p = A.children.indexOf(c),
      _ = !1,
      m = [];
    l.lastIndex = 0;
    let b = l.exec(c.value);
    while (b) {
      let y = b.index,
        u = {
          index: b.index,
          input: b.input,
          stack: [...s, c]
        },
        P = o(...b, u);
      if (typeof P === "string") P = P.length > 0 ? {
        type: "text",
        value: P
      } : void 0;
      if (P === !1) l.lastIndex = y + 1;else {
        if (n !== y) m.push({
          type: "text",
          value: c.value.slice(n, y)
        });
        if (Array.isArray(P)) m.push(...P);else if (P) m.push(P);
        n = y + b[0].length, _ = !0;
      }
      if (!l.global) break;
      b = l.exec(c.value);
    }
    if (_) {
      if (n < c.value.length) m.push({
        type: "text",
        value: c.value.slice(n)
      });
      A.children.splice(p, 1, ...m);
    } else m = [c];
    return p + m.length;
  }
}