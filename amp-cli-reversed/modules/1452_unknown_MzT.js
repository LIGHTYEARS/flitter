function UX(T, R, a, e) {
  return T <= e && a <= R;
}
function s2R(T, R) {
  let a = TS(T),
    e = TS(R);
  if (a.file !== e.file) return !1;
  return UX(a.startLine, a.endLine, e.startLine, e.endLine);
}
function MzT(T, R, a) {
  if (a.length > 0) return a.some(s => s2R(T, s));
  let e = r2R(R);
  if (e.length > 0) {
    let s = TS(T);
    return e.some(A => A.file === s.file && UX(A.startLine, A.endLine, s.startLine, s.endLine));
  }
  if (!R.file) return !1;
  let t = Jj(R.file),
    r = TS(T),
    h = Jj(r.file);
  if (t !== h) return !1;
  let i = ow(R.startLine);
  if (!i) return !0;
  let c = ow(R.endLine) ?? i;
  if (c < i) return !1;
  return UX(i, c, r.startLine, r.endLine);
}