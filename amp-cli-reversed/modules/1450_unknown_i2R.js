function h2R(T) {
  let R = /^diff --git (.+) (.+)$/u.exec(T);
  if (!R) return;
  let a = R[1],
    e = R[2];
  if (!a || !e) return;
  return {
    oldFile: ab(a),
    newFile: ab(e)
  };
}
function i2R(T) {
  let R = e2R.exec(T);
  if (!R) return;
  let a = R[1],
    e = R[2],
    t = R[3],
    r = R[4];
  if (!a || !t) return;
  return {
    oldStartLine: Number.parseInt(a, 10),
    oldLineCount: e ? Number.parseInt(e, 10) : 1,
    newStartLine: Number.parseInt(t, 10),
    newLineCount: r ? Number.parseInt(r, 10) : 1
  };
}