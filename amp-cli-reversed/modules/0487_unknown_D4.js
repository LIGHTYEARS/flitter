function D4(T, R, a) {
  if (T.type === "none") return R;
  if (R.type === "none") {
    let s = T.alpha ?? 1;
    if (s >= 1) return T;
    let A = jm0(),
      l = IH(),
      o = A ?? (l === "light" ? {
        r: 255,
        g: 255,
        b: 255
      } : {
        r: 0,
        g: 0,
        b: 0
      }),
      n = bF(T, a);
    if (!n) return T;
    let p = Math.round(n.r * s + o.r * (1 - s)),
      _ = Math.round(n.g * s + o.g * (1 - s)),
      m = Math.round(n.b * s + o.b * (1 - s));
    return {
      type: "rgb",
      value: {
        r: Math.max(0, Math.min(255, p)),
        g: Math.max(0, Math.min(255, _)),
        b: Math.max(0, Math.min(255, m))
      }
    };
  }
  let e = T.alpha ?? 1;
  if (e >= 1) return T;
  if (e <= 0) return R;
  let t = bF(T, a),
    r = bF(R, a);
  if (!t || !r) return e > 0.5 ? T : R;
  let h = Math.round(t.r * e + r.r * (1 - e)),
    i = Math.round(t.g * e + r.g * (1 - e)),
    c = Math.round(t.b * e + r.b * (1 - e));
  return {
    type: "rgb",
    value: {
      r: Math.max(0, Math.min(255, h)),
      g: Math.max(0, Math.min(255, i)),
      b: Math.max(0, Math.min(255, c))
    }
  };
}