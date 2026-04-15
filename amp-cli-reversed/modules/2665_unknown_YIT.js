function YIT(T, R, a, e) {
  let t = R,
    r = a,
    h,
    i = !1,
    c;
  for (let s = 0; s < T.length; s++) {
    if (s) {
      if (t = i ? t[h] : t[h] = {}, r = (c = r[h]).c, e === 0 && (c.t === 1 || c.t === 2)) return null;
      if (c.t === 2) {
        let A = t.length - 1;
        t = t[A], r = r[A].c;
      }
    }
    if (h = T[s], (i = Object.hasOwn(t, h)) && r[h]?.t === 0 && r[h]?.d) return null;
    if (!i) {
      if (h === "__proto__") Object.defineProperty(t, h, {
        enumerable: !0,
        configurable: !0,
        writable: !0
      }), Object.defineProperty(r, h, {
        enumerable: !0,
        configurable: !0,
        writable: !0
      });
      r[h] = {
        t: s < T.length - 1 && e === 2 ? 3 : e,
        d: !1,
        i: 0,
        c: {}
      };
    }
  }
  if (c = r[h], c.t !== e && !(e === 1 && c.t === 3)) return null;
  if (e === 2) {
    if (!c.d) c.d = !0, t[h] = [];
    t[h].push(t = {}), c.c[c.i++] = c = {
      t: 1,
      d: !1,
      i: 0,
      c: {}
    };
  }
  if (c.d) return null;
  if (c.d = !0, e === 1) t = i ? t[h] : t[h] = {};else if (e === 0 && i) return null;
  return [h, t, c.c];
}