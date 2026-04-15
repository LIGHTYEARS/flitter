function sU0(T, R, a) {
  if (a <= 1) return 0;
  let e = R / (a - 1);
  return Math.max(0, Math.min(a - 1, Math.round(T / e)));
}
function W_(T, R, a, e, t) {
  let r = Math.floor(R / 2),
    h = Math.floor(a / 4);
  if (r < 0 || r >= e || h < 0 || h >= t) return;
  let i = aU0[a % 4]?.[R % 2];
  if (i !== void 0) T[h][r] |= i;
}