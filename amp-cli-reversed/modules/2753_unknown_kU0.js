function kU0(T, R, a, e) {
  let t = R - T;
  if (t >= a) return null;
  let r = Math.max(1, Math.round(t * yU0)),
    h;
  if (e) h = Math.min(a - t, T + r);else h = Math.max(0, T - r);
  if (h === T) return null;
  return {
    start: h,
    end: h + t
  };
}