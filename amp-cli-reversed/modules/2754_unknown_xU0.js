function xU0(T, R, a, e, t, r, h) {
  if (r <= 0) return null;
  switch (T) {
    case "horizontal-bar":
      {
        let i = a;
        return i >= 0 && i < r ? i : null;
      }
    case "bar":
    case "stacked-bar":
      {
        let i = h ? ra : 0,
          c = e - i;
        if (c <= 0) return null;
        let s = R - i;
        if (s < 0 || s >= c) return null;
        let A = Math.max(1, Math.floor(c / r)),
          l = Math.floor(s / A);
        return l >= 0 && l < r ? l : null;
      }
    case "line":
    case "sparkline":
    case "stacked-area":
      {
        let i = h ? ra : 0,
          c = e - i;
        if (c <= 0) return null;
        let s = Math.max(0, Math.min(c - 1, R - i));
        if (r === 1) return 0;
        let A = c / (r - 1),
          l = Math.round(s / A);
        return Math.max(0, Math.min(r - 1, l));
      }
    default:
      return null;
  }
}