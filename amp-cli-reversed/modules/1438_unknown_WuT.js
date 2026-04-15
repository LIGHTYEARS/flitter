function gFR(T, R, a) {
  return fFR(T, R, a);
}
function $FR(T) {
  let R = `
Today's date: ${new Date().toDateString()}`;
  if (!T) return HuT + R;
  return `${HuT}
Current working directory (cwd): ${T}${R}`;
}
function WuT(T) {
  if (T === void 0 || T === null) return;
  if (Array.isArray(T)) return T.filter(R => typeof R === "string");
  if (typeof T === "string") try {
    let R = JSON.parse(T);
    if (Array.isArray(R)) return R.filter(a => typeof a === "string");
  } catch {}
  return;
}