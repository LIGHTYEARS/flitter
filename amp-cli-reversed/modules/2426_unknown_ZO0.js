function eIT(T, R) {
  return {
    child: T,
    alignment: R
  };
}
function tIT(T, R = !1) {
  return {
    cells: T.map(a => "child" in a ? a : {
      child: a
    }),
    isHeader: R
  };
}
function rIT(T, R = "intrinsic", a) {
  return {
    alignment: T,
    widthType: R,
    fixedWidth: a
  };
}
function ZO0(T, R) {
  if (R < 4) return null;
  let a = Math.min(R, 512),
    e = 0,
    t = 0;
  for (let h = 0; h < a; h++) if (T[h] === 0) if (h % 2 === 0) e++;else t++;
  let r = e + t;
  if (r > a * 0.3 && r < a * 0.7) {
    if (t > e * 3) return "utf-16le";
    if (e > t * 3) return "utf-16be";
  }
  return null;
}