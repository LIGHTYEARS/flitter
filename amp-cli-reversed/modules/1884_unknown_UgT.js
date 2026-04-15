function jq0(T, R) {
  let a = R;
  while (a !== null) {
    if (a === T) return !0;
    a = a.parent;
  }
  return !1;
}
function Sq0(T, R, a) {
  let e = [];
  function t(r) {
    for (let h of r) e.push(h), t(h.children);
  }
  t(T);
  for (let r = 0; r < e.length && r < R.length; r++) a.set(e[r], R[r]);
}
function dq0(T, R) {
  let a = Math.abs(T.x - R.x),
    e = Math.abs(T.y - R.y);
  if (a === 0 || e === 0) return a + e;
  return a + e + 1;
}
function Cq0(T, R) {
  if (R.x < 0 || R.y < 0) return !1;
  return !T.has(Wl(R));
}
function UgT(T, R, a) {
  let e = new Oq0();
  e.push({
    coord: R,
    priority: 0
  });
  let t = new Map();
  t.set(Wl(R), 0);
  let r = new Map();
  r.set(Wl(R), null);
  while (e.length > 0) {
    let h = e.pop().coord;
    if (BgT(h, a)) {
      let c = [],
        s = h;
      while (s !== null) c.unshift(s), s = r.get(Wl(s)) ?? null;
      return c;
    }
    let i = t.get(Wl(h));
    for (let c of Eq0) {
      let s = {
        x: h.x + c.x,
        y: h.y + c.y
      };
      if (!Cq0(T, s) && !BgT(s, a)) continue;
      let A = i + 1,
        l = Wl(s),
        o = t.get(l);
      if (o === void 0 || A < o) {
        t.set(l, A);
        let n = A + dq0(s, a);
        e.push({
          coord: s,
          priority: n
        }), r.set(l, h);
      }
    }
  }
  return null;
}