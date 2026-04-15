function fU0(T, R, a, e, t, r, h, i) {
  if (t <= 0 || R < 0 || R >= t) return null;
  let c = 2;
  switch (T) {
    case "horizontal-bar":
      return {
        x: Math.floor(a / 2),
        y: R
      };
    case "bar":
    case "stacked-bar":
      {
        let s = r ? ra : 0,
          A = a - s,
          l = e - (r ? c : 0);
        if (A <= 0 || l <= 0) return null;
        let o = Math.max(1, Math.floor(A / t)),
          n = s + R * o + Math.floor(o / 2),
          p = i > 0 ? h / i : 0,
          _ = Math.round((1 - p) * (l - 1));
        return {
          x: n,
          y: _
        };
      }
    case "line":
    case "sparkline":
    case "stacked-area":
      {
        let s = r ? ra : 0,
          A = a - s,
          l = e - (r ? c : 0);
        if (A <= 0 || l <= 0) return null;
        let o = t > 1 ? s + Math.round(R / (t - 1) * (A - 1)) : s + Math.floor(A / 2),
          n = i > 0 ? h / i : 0,
          p = Math.round((1 - n) * (l - 1));
        return {
          x: o,
          y: p
        };
      }
    default:
      return null;
  }
}