function RQT(T) {
  return T.replace(Vv0, Xv0);
}
function Xv0(T, R, a) {
  if (R) return R;
  if (a.charCodeAt(0) === 35) {
    let e = a.charCodeAt(1),
      t = e === 120 || e === 88;
    return qYT(a.slice(t ? 2 : 1), t ? 16 : 10);
  }
  return arT(a) || T;
}