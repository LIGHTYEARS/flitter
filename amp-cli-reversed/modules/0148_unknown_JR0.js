function JR0(T) {
  ZR0 = !0, f2T = R(1), XR0 = R(2), YR0 = R(3), QR0 = R(5);
  function R(a) {
    return function (e) {
      let t = eb[tS++];
      if (t == null) {
        if (Oa) return Fb(e);
        let h = T(CR, _A, e, L0);
        if (typeof h == "string") t = h, eb = teT;else if (eb = h, tS = 1, zb = 1, t = eb[0], t === void 0) throw Error("Unexpected end of buffer");
      }
      let r = t.length;
      if (r <= e) return CR += e, t;
      return rS = t, hS = CR, zb = CR + r, CR += e, t.slice(0, e);
    };
  }
}