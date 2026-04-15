function dn0(T) {
  let R = Number.isFinite(T) ? T : 0,
    a = 0,
    e = R;
  function t(h = R) {
    if (Number.isFinite(h)) R = h;
    return a = 0, e = R, R;
  }
  function r(h) {
    if (!Number.isFinite(h) || h < 1) return R;
    if (h <= a) return R;
    if (a === 0) e = R - (h - 1);
    return R = Math.max(R, e + h), a = h, R;
  }
  return {
    getVersion: () => R,
    reset: t,
    advanceFromSeq: r
  };
}