function quT(T, R) {
  if (T === "/dev/null") return T;
  if (T.startsWith("a/") || T.startsWith("b/")) return T;
  return `${R === "old" ? "a" : "b"}/${T}`;
}
function Jj(T) {
  let R = ab(T);
  if (R.startsWith("./")) R = R.slice(2);
  return R;
}
function c2R(T, R) {
  if (R && R !== "/dev/null") return R;
  if (T && T !== "/dev/null") return T;
  return;
}
function TS(T) {
  let R = T.newLineCount > 0 || T.oldLineCount === 0,
    a = R ? T.newStartLine : T.oldStartLine,
    e = R ? T.newLineCount : T.oldLineCount,
    t = a > 0 ? a : 1,
    r = e > 0 ? e : 1;
  return {
    file: Jj(T.file),
    startLine: t,
    endLine: t + r - 1
  };
}