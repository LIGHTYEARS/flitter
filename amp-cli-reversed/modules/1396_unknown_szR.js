function czR(T) {
  if (!T.path) return;
  let R = qA(T.path),
    a = T.readRangeLabel ?? bzT(T.readRange);
  return a ? `Read ${R} ${a}` : `Read ${R}`;
}
function pzT(T) {
  let R = T.filter(a => !a.startsWith("-"));
  return R[R.length - 1];
}
function _zT(T, R) {
  if (T === "sed") return szR(R);
  if (T === "awk") return lzR(R);
  if (T === "head") return pzR(R);
  return;
}
function szR(T) {
  if (!T.some(ozR)) return;
  for (let R = 0; R < T.length; R++) {
    let a = T[R];
    if (a === "-e" || a === "--expression") {
      let t = LuT(T[R + 1]);
      if (t) return t;
      R += 1;
      continue;
    }
    if (a === "-f" || a === "--file") {
      R += 1;
      continue;
    }
    if (a.startsWith("-")) continue;
    let e = LuT(a);
    if (e) return e;
  }
  return;
}