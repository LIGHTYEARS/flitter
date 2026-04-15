function Gv0(T) {
  while (!VYT(T));
  return T;
}
function Kv0() {
  let T = 1,
    R = "",
    a = !0,
    e;
  return t;
  function t(r, h, i) {
    let c = [],
      s,
      A,
      l,
      o,
      n;
    if (r = R + (typeof r === "string" ? r.toString() : new TextDecoder(h || void 0).decode(r)), l = 0, R = "", a) {
      if (r.charCodeAt(0) === 65279) l++;
      a = void 0;
    }
    while (l < r.length) {
      if (WfT.lastIndex = l, s = WfT.exec(r), o = s && s.index !== void 0 ? s.index : r.length, n = r.charCodeAt(o), !s) {
        R = r.slice(l);
        break;
      }
      if (n === 10 && l === o && e) c.push(-3), e = void 0;else {
        if (e) c.push(-5), e = void 0;
        if (l < o) c.push(r.slice(l, o)), T += o - l;
        switch (n) {
          case 0:
            {
              c.push(65533), T++;
              break;
            }
          case 9:
            {
              A = Math.ceil(T / 4) * 4, c.push(-2);
              while (T++ < A) c.push(-1);
              break;
            }
          case 10:
            {
              c.push(-4), T = 1;
              break;
            }
          default:
            e = !0, T = 1;
        }
      }
      l = o + 1;
    }
    if (i) {
      if (e) c.push(-5);
      if (R) c.push(R);
      c.push(null);
    }
    return c;
  }
}