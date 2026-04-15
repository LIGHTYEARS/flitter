function K4(T) {
  return T.toLowerCase().replace(DZT, " ");
}
function FE0(T, R) {
  let a = hB(T, R, K4(T), K4(R), 0, 0, {}),
    e = R.trim().split(/\s+/);
  if (e.length > 1) {
    let t = 0,
      r = 0;
    for (let i of e) {
      let c = hB(T, i, K4(T), K4(i), 0, 0, {});
      if (c === 0) return a;
      t += c, r += i.length;
    }
    let h = t / e.length * 0.95;
    return Math.max(a, h);
  }
  return a;
}