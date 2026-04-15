function MiT(T, R) {
  return {
    line: Math.max(0, T - 1),
    character: Math.max(0, R - 1)
  };
}
function DiT(T, R) {
  if (T.line === R.line) return T.character - R.character;
  return T.line - R.line;
}
function kAR(T, R) {
  return T.split(`
`)[R] ?? "";
}
function xAR(T, R, a, e, t) {
  let r = wiT(T, R, a),
    h = wiT(T, e, t);
  if (h <= r) return "";
  return T.slice(r, h);
}
function wiT(T, R, a) {
  let e = 0,
    t = 0;
  for (let r = 0; r < T.length; r += 1) {
    if (e === R && t === a) return r;
    if (T[r] === `
`) e += 1, t = 0;else t += 1;
  }
  return T.length;
}